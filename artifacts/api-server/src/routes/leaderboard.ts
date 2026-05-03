import { Router, type IRouter } from "express";
import { db, usersTable, scoresTable } from "@workspace/db";
import { desc, gte, sql } from "drizzle-orm";
import { GetLeaderboardQueryParams } from "@workspace/api-zod";
import { getStreakTitle } from "../lib/userProfile";

const router: IRouter = Router();

function buildLeaderboardEntry(u: {
  id: number;
  username: string;
  totalScore?: number;
  dailyScore: number;
  xp: number;
  level: number;
  rankTier: string;
  hackerType: string;
  isTopHacker: boolean;
  badges?: unknown;
  streakDays: number;
  winStreak?: number | null;
}, rank: number, scoreOverride?: number) {
  return {
    rank,
    username: u.username,
    totalScore: scoreOverride ?? u.totalScore ?? 0,
    dailyScore: u.dailyScore,
    xp: u.xp,
    level: u.level,
    rankTier: u.rankTier,
    hackerType: u.hackerType,
    isTopHacker: u.isTopHacker,
    badges: (u.badges as string[]) ?? [],
    streakDays: u.streakDays,
    winStreak: u.winStreak ?? 0,
    streakTitle: getStreakTitle(u.streakDays),
  };
}

router.get("/leaderboard", async (req, res): Promise<void> => {
  const parsed = GetLeaderboardQueryParams.safeParse(req.query);
  const limit = parsed.success && parsed.data.limit ? parsed.data.limit : 20;
  const filter = (req.query.filter as string) ?? "all-time";

  const userFields = {
    id: usersTable.id,
    username: usersTable.username,
    dailyScore: usersTable.dailyScore,
    xp: usersTable.xp,
    level: usersTable.level,
    rankTier: usersTable.rankTier,
    hackerType: usersTable.hackerType,
    isTopHacker: usersTable.isTopHacker,
    badges: usersTable.badges,
    streakDays: usersTable.streakDays,
    winStreak: usersTable.winStreak,
  };

  if (filter === "daily") {
    const users = await db
      .select({ ...userFields })
      .from(usersTable)
      .orderBy(desc(usersTable.dailyScore))
      .limit(limit);

    res.json(users.map((u, i) => buildLeaderboardEntry(u, i + 1, u.dailyScore)));
    return;
  }

  if (filter === "weekly") {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weeklyScores = await db
      .select({
        userId: scoresTable.userId,
        weeklyTotal: sql<number>`SUM(${scoresTable.score})`.as("weekly_total"),
      })
      .from(scoresTable)
      .where(gte(scoresTable.createdAt, oneWeekAgo))
      .groupBy(scoresTable.userId)
      .orderBy(desc(sql`weekly_total`))
      .limit(limit);

    const userIds = weeklyScores.map((s) => s.userId);
    if (userIds.length === 0) {
      res.json([]);
      return;
    }

    const userDetails = await db
      .select({ ...userFields })
      .from(usersTable);

    const userMap = new Map(userDetails.map((u) => [u.id, u]));

    res.json(
      weeklyScores.map((ws, index) => {
        const u = userMap.get(ws.userId);
        if (!u) return null;
        return buildLeaderboardEntry(u, index + 1, Number(ws.weeklyTotal));
      }).filter(Boolean)
    );
    return;
  }

  // All-time (default)
  const users = await db
    .select({ ...userFields, totalScore: usersTable.totalScore })
    .from(usersTable)
    .orderBy(desc(usersTable.totalScore))
    .limit(limit);

  res.json(users.map((u, i) => buildLeaderboardEntry(u, i + 1)));
});

export default router;
