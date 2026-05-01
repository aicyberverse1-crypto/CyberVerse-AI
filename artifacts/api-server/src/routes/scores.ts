import { Router, type IRouter } from "express";
import { db, usersTable, scoresTable } from "@workspace/db";
import { eq, sum, count, desc } from "drizzle-orm";
import { SubmitScoreBody } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

router.post("/score", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = SubmitScoreBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.user!.userId;
  const { mode, score, xpEarned } = parsed.data;

  await db.insert(scoresTable).values({ userId, mode, score, xpEarned });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const newXp = user.xp + xpEarned;
  const newLevel = Math.floor(newXp / 100) + 1;
  const newTotalScore = user.totalScore + score;
  const leveledUp = newLevel > user.level;

  await db
    .update(usersTable)
    .set({ xp: newXp, level: newLevel, totalScore: newTotalScore })
    .where(eq(usersTable.id, userId));

  res.json({ totalScore: newTotalScore, xp: newXp, level: newLevel, leveledUp });
});

router.get("/stats/dashboard", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.user!.userId;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const xpToNextLevel = 100 - (user.xp % 100);

  const modeScores = await db
    .select({ mode: scoresTable.mode, total: sum(scoresTable.score), games: count() })
    .from(scoresTable)
    .where(eq(scoresTable.userId, userId))
    .groupBy(scoresTable.mode);

  const modeMap: Record<string, number> = {};
  let gamesPlayed = 0;
  for (const row of modeScores) {
    modeMap[row.mode] = Number(row.total ?? 0);
    gamesPlayed += Number(row.games ?? 0);
  }

  const allUsers = await db
    .select({ id: usersTable.id, totalScore: usersTable.totalScore })
    .from(usersTable)
    .orderBy(desc(usersTable.totalScore));

  const rank = allUsers.findIndex((u) => u.id === userId) + 1;

  const recentActivity = await db
    .select()
    .from(scoresTable)
    .where(eq(scoresTable.userId, userId))
    .orderBy(desc(scoresTable.createdAt))
    .limit(5);

  res.json({
    totalScore: user.totalScore,
    xp: user.xp,
    level: user.level,
    xpToNextLevel,
    gamesPlayed,
    phishingScore: modeMap["phishing"] ?? 0,
    defenseScore: modeMap["defense"] ?? 0,
    builderScore: modeMap["builder"] ?? 0,
    escapeScore: modeMap["escape"] ?? 0,
    rank: rank > 0 ? rank : null,
    recentActivity: recentActivity.map((a) => ({
      mode: a.mode,
      score: a.score,
      xpEarned: a.xpEarned,
      createdAt: a.createdAt.toISOString(),
    })),
  });
});

export default router;
