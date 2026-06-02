import { Router, type IRouter } from "express";
import { db, usersTable, scoresTable } from "@workspace/db";
import { eq, sum, count, desc, and, sql } from "drizzle-orm";
import { SubmitScoreBody } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { getRankTier, computeBadges, getStreakTitle } from "../lib/userProfile";

const router: IRouter = Router();

router.post("/score", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = SubmitScoreBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.user!.userId;
  const { mode, score, xpEarned, isCorrect, responseTimeMs } = parsed.data;

  // Insert score first
  await db.insert(scoresTable).values({ userId, mode, score, xpEarned });

  // Read current user state
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  // Compute derived values
  const newXp = user.xp + xpEarned;
  const newLevel = Math.floor(newXp / 100) + 1;
  const newTotalScore = user.totalScore + score;
  const leveledUp = newLevel > user.level;
  const newTotalAnswers = user.totalAnswers + 1;
  const newCorrectAnswers = user.correctAnswers + (isCorrect ? 1 : 0);
  const newAccuracyRate = (newCorrectAnswers / newTotalAnswers) * 100;
  const newWinStreak = isCorrect ? (user.winStreak ?? 0) + 1 : 0;
  const hintPointsEarned = isCorrect ? 5 : 0;
  const newSkillPoints = leveledUp ? user.skillPoints + 1 : user.skillPoints;
  const newRankTier = getRankTier(newTotalScore);

  let newAvgResponseTime = user.averageResponseTime;
  if (responseTimeMs != null && newTotalAnswers > 0) {
    newAvgResponseTime = (user.averageResponseTime * user.totalAnswers + responseTimeMs) / newTotalAnswers;
  }

  // Daily score reset
  const now = new Date();
  const isNewDay = !user.lastDailyReset || now.toDateString() !== user.lastDailyReset.toDateString();
  const newDailyScore = isNewDay ? score : user.dailyScore + score;
  const newLastDailyReset = isNewDay ? now : (user.lastDailyReset ?? now);

  // Badge calculations (parallel queries)
  const [[phishingStats], [defenseScoreRow]] = await Promise.all([
    db.select({ total: count() }).from(scoresTable)
      .where(and(eq(scoresTable.userId, userId), eq(scoresTable.mode, "phishing"))),
    db.select({ total: sum(scoresTable.score) }).from(scoresTable)
      .where(and(eq(scoresTable.userId, userId), eq(scoresTable.mode, "defense"))),
  ]);
  const phishingCorrect = Number(phishingStats?.total ?? 0);
  const defenseTotal = Number(defenseScoreRow?.total ?? 0);

  const newBadges = computeBadges(
    { ...user, xp: newXp, level: newLevel, totalScore: newTotalScore, totalAnswers: newTotalAnswers, correctAnswers: newCorrectAnswers, winStreak: newWinStreak },
    phishingCorrect
  );
  if (defenseTotal >= 300 && !newBadges.includes("defender_pro")) {
    newBadges.push("defender_pro");
  }

  // Atomic update — additive fields use SQL expressions to prevent lost updates from concurrent writes
  await db
    .update(usersTable)
    .set({
      xp: sql`${usersTable.xp} + ${xpEarned}`,
      level: newLevel,
      totalScore: sql`${usersTable.totalScore} + ${score}`,
      dailyScore: newDailyScore,
      lastDailyReset: newLastDailyReset,
      hintPoints: sql`${usersTable.hintPoints} + ${hintPointsEarned}`,
      skillPoints: newSkillPoints,
      rankTier: newRankTier,
      accuracyRate: newAccuracyRate,
      totalAnswers: sql`${usersTable.totalAnswers} + 1`,
      correctAnswers: sql`${usersTable.correctAnswers} + ${isCorrect ? 1 : 0}`,
      averageResponseTime: newAvgResponseTime,
      winStreak: newWinStreak,
      badges: newBadges,
    })
    .where(eq(usersTable.id, userId));

  // Fire-and-forget top hacker update (non-critical, doesn't block response)
  void updateTopHacker().then(async (topId) => {
    if (topId === userId) {
      const [cur] = await db.select({ badges: usersTable.badges }).from(usersTable).where(eq(usersTable.id, userId));
      const curBadges = (cur?.badges as string[]) ?? [];
      if (!curBadges.includes("top_hacker")) {
        await db.update(usersTable).set({ badges: [...curBadges, "top_hacker"] }).where(eq(usersTable.id, userId));
      }
    }
  });

  res.json({
    totalScore: newTotalScore,
    xp: newXp,
    level: newLevel,
    leveledUp,
    hintPoints: user.hintPoints + hintPointsEarned,
    hintPointsEarned,
    rankTier: newRankTier,
    skillPoints: newSkillPoints,
    newSkillPoint: leveledUp,
    badges: newBadges,
    winStreak: newWinStreak,
    streakTitle: getStreakTitle(user.streakDays),
  });
});

async function updateTopHacker(): Promise<number | null> {
  try {
    const today = new Date().toDateString();
    const users = await db
      .select({ id: usersTable.id, dailyScore: usersTable.dailyScore, lastDailyReset: usersTable.lastDailyReset })
      .from(usersTable)
      .orderBy(desc(usersTable.dailyScore));

    let topId: number | null = null;
    let topScore = 0;
    for (const u of users) {
      if (u.lastDailyReset?.toDateString() === today && u.dailyScore > topScore) {
        topScore = u.dailyScore;
        topId = u.id;
      }
    }

    await db.update(usersTable).set({ isTopHacker: false });
    if (topId !== null && topScore > 0) {
      await db.update(usersTable).set({ isTopHacker: true }).where(eq(usersTable.id, topId));
    }
    return topId;
  } catch {
    return null;
  }
}

router.get("/stats/dashboard", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.user!.userId;

  const [[user], modeScores, recentActivity] = await Promise.all([
    db.select().from(usersTable).where(eq(usersTable.id, userId)),
    db.select({ mode: scoresTable.mode, total: sum(scoresTable.score), games: count() })
      .from(scoresTable).where(eq(scoresTable.userId, userId)).groupBy(scoresTable.mode),
    db.select().from(scoresTable).where(eq(scoresTable.userId, userId))
      .orderBy(desc(scoresTable.createdAt)).limit(10),
  ]);

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const modeMap: Record<string, number> = {};
  let gamesPlayed = 0;
  for (const row of modeScores) {
    modeMap[row.mode] = Number(row.total ?? 0);
    gamesPlayed += Number(row.games ?? 0);
  }

  // Rank among all users — only fetch id + totalScore to stay lightweight
  const allRanks = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .orderBy(desc(usersTable.totalScore));
  const rank = allRanks.findIndex((u) => u.id === userId) + 1;

  res.json({
    totalScore: user.totalScore,
    xp: user.xp,
    level: user.level,
    xpToNextLevel: 100 - (user.xp % 100),
    gamesPlayed,
    phishingScore: modeMap["phishing"] ?? 0,
    defenseScore: modeMap["defense"] ?? 0,
    builderScore: modeMap["builder"] ?? 0,
    escapeScore: modeMap["escape"] ?? 0,
    rank: rank > 0 ? rank : null,
    hintPoints: user.hintPoints,
    rankTier: user.rankTier,
    accuracyRate: user.accuracyRate,
    streakDays: user.streakDays,
    winStreak: user.winStreak ?? 0,
    dailyScore: user.dailyScore,
    badges: (user.badges as string[]) ?? [],
    streakTitle: user.streakDays >= 3 ? (user.streakDays >= 10 ? "Unstoppable 🔥🔥" : user.streakDays >= 5 ? "On Fire 🔥" : "Rising ⚡") : null,
    recentActivity: recentActivity.map((a) => ({
      mode: a.mode,
      score: a.score,
      xpEarned: a.xpEarned,
      createdAt: a.createdAt.toISOString(),
    })),
  });
});

export default router;
