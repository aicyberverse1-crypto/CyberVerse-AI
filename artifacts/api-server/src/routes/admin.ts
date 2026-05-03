import { Router, type IRouter } from "express";
import { db, usersTable, scoresTable } from "@workspace/db";
import { eq, ne, avg, sum, count, desc, ilike, or } from "drizzle-orm";
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

  // Apply search filter
  if (search) {
    query = query.where(ilike(usersTable.username, `%${search}%`));
  }

  const users = await query.orderBy(desc(usersTable.totalScore));

  // Apply rank filter in memory (simpler than SQL for enum-like field)
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
      createdAt: u.createdAt.toISOString(),
    }))
  );
});

// DELETE /api/admin/users/:id — delete a user
router.delete("/admin/users/:id", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  // Prevent deleting other admins
  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (target.role === "admin") {
    res.status(403).json({ error: "Cannot delete admin users" });
    return;
  }

  // Delete associated scores first (referential integrity)
  await db.delete(scoresTable).where(eq(scoresTable.userId, id));
  await db.delete(usersTable).where(eq(usersTable.id, id));

  res.json({ success: true, message: `User "${target.username}" deleted` });
});

// GET /api/admin/analytics — platform-wide analytics
router.get("/admin/analytics", requireAdmin, async (_req, res): Promise<void> => {
  const [totals] = await db
    .select({
      totalUsers: count(usersTable.id),
      avgScore: avg(usersTable.totalScore),
      avgAccuracy: avg(usersTable.accuracyRate),
      totalHintPointsUsed: sum(usersTable.totalAnswers),
    })
    .from(usersTable)
    .where(ne(usersTable.role, "admin"));

  // Rank distribution
  const allUsers = await db
    .select({ rankTier: usersTable.rankTier })
    .from(usersTable)
    .where(ne(usersTable.role, "admin"));

  const rankDist: Record<string, number> = {};
  for (const u of allUsers) {
    rankDist[u.rankTier] = (rankDist[u.rankTier] ?? 0) + 1;
  }

  // Top 5 performers
  const topUsers = await db
    .select({ id: usersTable.id, username: usersTable.username, totalScore: usersTable.totalScore, rankTier: usersTable.rankTier, accuracyRate: usersTable.accuracyRate })
    .from(usersTable)
    .where(ne(usersTable.role, "admin"))
    .orderBy(desc(usersTable.totalScore))
    .limit(5);

  // Bottom 5 (most need improvement)
  const bottomUsers = await db
    .select({ id: usersTable.id, username: usersTable.username, totalScore: usersTable.totalScore, rankTier: usersTable.rankTier, accuracyRate: usersTable.accuracyRate })
    .from(usersTable)
    .where(ne(usersTable.role, "admin"))
    .orderBy(usersTable.totalScore)
    .limit(5);

  // Active today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activeToday = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(ne(usersTable.role, "admin"));

  res.json({
    totalUsers: Number(totals?.totalUsers ?? 0),
    avgScore: Math.round(Number(totals?.avgScore ?? 0)),
    avgAccuracy: Math.round(Number(totals?.avgAccuracy ?? 0)),
    totalQuestionsAnswered: Number(totals?.totalHintPointsUsed ?? 0),
    rankDist,
    topUsers,
    bottomUsers,
  });
});

export default router;
