import { Router, type IRouter } from "express";
import { db, usersTable, scoresTable } from "@workspace/db";
import { desc, gte, and, sql } from "drizzle-orm";
import { GetLeaderboardQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/leaderboard", async (req, res): Promise<void> => {
  const parsed = GetLeaderboardQueryParams.safeParse(req.query);
  const limit = parsed.success && parsed.data.limit ? parsed.data.limit : 20;
  const filter = (req.query.filter as string) ?? "all-time";

  let users;

  if (filter === "daily") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    users = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        dailyScore: usersTable.dailyScore,
        xp: usersTable.xp,
        level: usersTable.level,
        rankTier: usersTable.rankTier,
        hackerType: usersTable.hackerType,
        isTopHacker: usersTable.isTopHacker,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.dailyScore))
      .limit(limit);

    res.json(
      users.map((u, index) => ({
        rank: index + 1,
        username: u.username,
        totalScore: u.dailyScore,
        dailyScore: u.dailyScore,
        xp: u.xp,
        level: u.level,
        rankTier: u.rankTier,
        hackerType: u.hackerType,
        isTopHacker: u.isTopHacker,
      }))
    );
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
      .select({
        id: usersTable.id,
        username: usersTable.username,
        xp: usersTable.xp,
        level: usersTable.level,
        rankTier: usersTable.rankTier,
        hackerType: usersTable.hackerType,
        isTopHacker: usersTable.isTopHacker,
        dailyScore: usersTable.dailyScore,
      })
      .from(usersTable);

    const userMap = new Map(userDetails.map((u) => [u.id, u]));

    res.json(
      weeklyScores.map((ws, index) => {
        const u = userMap.get(ws.userId);
        return {
          rank: index + 1,
          username: u?.username ?? "Unknown",
          totalScore: Number(ws.weeklyTotal),
          dailyScore: u?.dailyScore ?? 0,
          xp: u?.xp ?? 0,
          level: u?.level ?? 1,
          rankTier: u?.rankTier ?? "Bronze",
          hackerType: u?.hackerType ?? "defender",
          isTopHacker: u?.isTopHacker ?? false,
        };
      })
    );
    return;
  }

  // All-time (default)
  users = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      totalScore: usersTable.totalScore,
      dailyScore: usersTable.dailyScore,
      xp: usersTable.xp,
      level: usersTable.level,
      rankTier: usersTable.rankTier,
      hackerType: usersTable.hackerType,
      isTopHacker: usersTable.isTopHacker,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.totalScore))
    .limit(limit);

  res.json(
    users.map((u, index) => ({
      rank: index + 1,
      username: u.username,
      totalScore: u.totalScore,
      dailyScore: u.dailyScore,
      xp: u.xp,
      level: u.level,
      rankTier: u.rankTier,
      hackerType: u.hackerType,
      isTopHacker: u.isTopHacker,
    }))
  );
});

export default router;
