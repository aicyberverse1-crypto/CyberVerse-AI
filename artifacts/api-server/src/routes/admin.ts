import { Router, type IRouter } from "express";
import { db, usersTable, scoresTable } from "@workspace/db";
import { eq, ne, avg, sum, count, desc, ilike, gte, and, sql } from "drizzle-orm";
import { requireAdmin, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

// GET /api/admin/users — list all non-admin users with full stats
router.get("/admin/users", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const search = (req.query.search as string) ?? "";
  const rankFilter = (req.query.rank as string) ?? "";

  let query = db
    .select()
    .from(usersTable)
    .where(ne(usersTable.role, "admin"))
    .$dynamic();

  if (search) {
    query = query.where(ilike(usersTable.username, `%${search}%`));
  }

  const users = await query.orderBy(desc(usersTable.totalScore));

  const filtered = rankFilter
    ? users.filter((u) => u.rankTier === rankFilter)
    : users;

  res.json(
    filtered.map((u) => ({
      id: u.id,
      username: u.username,
      rankTier: u.rankTier,
      totalScore: u.totalScore,
      accuracyRate: u.accuracyRate,
      streakDays: u.streakDays,
      hintPoints: u.hintPoints,
      level: u.level,
      xp: u.xp,
      gamesPlayed: u.totalAnswers,
      hackerType: u.hackerType,
      isTopHacker: u.isTopHacker,
      badges: (u.badges as string[]) ?? [],
      winStreak: u.winStreak ?? 0,
      createdAt: u.createdAt.toISOString(),
    }))
  );
});

// DELETE /api/admin/users/:id — delete user + their scores in a transaction
router.delete("/admin/users/:id", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (target.role === "admin") {
    res.status(403).json({ error: "Cannot delete admin users" });
    return;
  }

  // Wrap in a transaction so scores + user are deleted atomically
  await db.transaction(async (tx) => {
    await tx.delete(scoresTable).where(eq(scoresTable.userId, id));
    await tx.delete(usersTable).where(eq(usersTable.id, id));
  });

  res.json({ success: true, message: `User "${target.username}" deleted` });
});

// GET /api/admin/analytics — platform analytics
router.get("/admin/analytics", requireAdmin, async (_req, res): Promise<void> => {
  const [totals] = await db
    .select({
      totalUsers: count(usersTable.id),
      avgScore: avg(usersTable.totalScore),
      avgAccuracy: avg(usersTable.accuracyRate),
      totalQuestionsAnswered: sum(usersTable.totalAnswers),
    })
    .from(usersTable)
    .where(ne(usersTable.role, "admin"));

  const [topScorer] = await db
    .select({ totalScore: usersTable.totalScore })
    .from(usersTable)
    .where(ne(usersTable.role, "admin"))
    .orderBy(desc(usersTable.totalScore))
    .limit(1);

  const todayStr = new Date().toDateString();
  const allUsers = await db
    .select({ rankTier: usersTable.rankTier, lastDailyReset: usersTable.lastDailyReset })
    .from(usersTable)
    .where(ne(usersTable.role, "admin"));

  const activeToday = allUsers.filter(
    (u) => u.lastDailyReset && u.lastDailyReset.toDateString() === todayStr
  ).length;

  const rankDist: Record<string, number> = {};
  for (const u of allUsers) {
    rankDist[u.rankTier] = (rankDist[u.rankTier] ?? 0) + 1;
  }

  const topUsers = await db
    .select({ id: usersTable.id, username: usersTable.username, totalScore: usersTable.totalScore, rankTier: usersTable.rankTier, accuracyRate: usersTable.accuracyRate, hackerType: usersTable.hackerType })
    .from(usersTable)
    .where(ne(usersTable.role, "admin"))
    .orderBy(desc(usersTable.totalScore))
    .limit(5);

  const bottomUsers = await db
    .select({ id: usersTable.id, username: usersTable.username, totalScore: usersTable.totalScore, rankTier: usersTable.rankTier, accuracyRate: usersTable.accuracyRate, hackerType: usersTable.hackerType })
    .from(usersTable)
    .where(ne(usersTable.role, "admin"))
    .orderBy(usersTable.totalScore)
    .limit(5);

  res.json({
    totalUsers: Number(totals?.totalUsers ?? 0),
    avgScore: Math.round(Number(totals?.avgScore ?? 0)),
    avgAccuracy: Math.round(Number(totals?.avgAccuracy ?? 0)),
    totalQuestionsAnswered: Number(totals?.totalQuestionsAnswered ?? 0),
    highestScore: topScorer?.totalScore ?? 0,
    activeToday,
    rankDist,
    topUsers,
    bottomUsers,
  });
});

// GET /api/admin/user-growth — user registrations per day (last 30 days)
router.get("/admin/user-growth", requireAdmin, async (_req, res): Promise<void> => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const users = await db
    .select({ createdAt: usersTable.createdAt })
    .from(usersTable)
    .where(and(ne(usersTable.role, "admin"), gte(usersTable.createdAt, thirtyDaysAgo)));

  const grouped: Record<string, number> = {};
  for (const u of users) {
    const key = u.createdAt.toISOString().split("T")[0];
    grouped[key!] = (grouped[key!] ?? 0) + 1;
  }

  const result: { date: string; users: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0]!;
    result.push({ date: key, users: grouped[key] ?? 0 });
  }

  res.json(result);
});

// GET /api/admin/top-players — top 5 for bar chart
router.get("/admin/top-players", requireAdmin, async (_req, res): Promise<void> => {
  const players = await db
    .select({
      username: usersTable.username,
      totalScore: usersTable.totalScore,
      rankTier: usersTable.rankTier,
      hackerType: usersTable.hackerType,
    })
    .from(usersTable)
    .where(ne(usersTable.role, "admin"))
    .orderBy(desc(usersTable.totalScore))
    .limit(5);

  res.json(players);
});

// GET /api/admin/monthly-performance — total score per month (last 6 months)
router.get("/admin/monthly-performance", requireAdmin, async (_req, res): Promise<void> => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const scores = await db
    .select({ score: scoresTable.score, createdAt: scoresTable.createdAt })
    .from(scoresTable)
    .where(gte(scoresTable.createdAt, sixMonthsAgo));

  const grouped: Record<string, number> = {};
  for (const s of scores) {
    const key = s.createdAt.toISOString().slice(0, 7);
    grouped[key] = (grouped[key] ?? 0) + s.score;
  }

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const result: { month: string; points: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    result.push({ month: MONTHS[d.getMonth()]!, points: grouped[key] ?? 0 });
  }

  res.json(result);
});

// GET /api/admin/report-data?month=0..11|all
router.get("/admin/report-data", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const monthParam = req.query.month as string;

  const users = await db
    .select()
    .from(usersTable)
    .where(ne(usersTable.role, "admin"))
    .orderBy(desc(usersTable.totalScore));

  let filteredUsers = users;

  if (monthParam !== "all" && monthParam !== undefined) {
    const monthIdx = parseInt(monthParam, 10);
    if (!isNaN(monthIdx)) {
      filteredUsers = users.filter((u) => u.lastDailyReset?.getMonth() === monthIdx);
      if (filteredUsers.length === 0) filteredUsers = users;
    }
  }

  const [totals] = await db
    .select({ totalUsers: count(usersTable.id), avgScore: avg(usersTable.totalScore) })
    .from(usersTable)
    .where(ne(usersTable.role, "admin"));

  res.json({
    totalUsers: Number(totals?.totalUsers ?? 0),
    avgScore: Math.round(Number(totals?.avgScore ?? 0)),
    generatedAt: new Date().toISOString(),
    users: filteredUsers.map((u, i) => ({
      rank: i + 1,
      username: u.username,
      totalScore: u.totalScore,
      rankTier: u.rankTier,
      streakDays: u.streakDays,
      hackerType: u.hackerType,
      badges: ((u.badges as string[]) ?? []).join(", ") || "None",
      accuracyRate: u.accuracyRate.toFixed(1),
    })),
  });
});

export default router;
