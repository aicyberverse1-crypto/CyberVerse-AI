import { Router, type IRouter } from "express";
import { db, usersTable, scoresTable } from "@workspace/db";
import { eq, sum, count, desc, and } from "drizzle-orm";
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

  // Track accuracy
  const newTotalAnswers = user.totalAnswers + 1;
  const newCorrectAnswers = user.correctAnswers + (isCorrect ? 1 : 0);
  const newAccuracyRate = (newCorrectAnswers / newTotalAnswers) * 100;

  // Track average response time
  let newAvgResponseTime = user.averageResponseTime;
  if (responseTimeMs != null) {
    const prevTotal = user.averageResponseTime * user.totalAnswers;
    newAvgResponseTime = (prevTotal + responseTimeMs) / newTotalAnswers;
  }

  // Win streak
  const newWinStreak = isCorrect ? (user.winStreak ?? 0) + 1 : 0;

  // Hint points reward for correct answers (+5 per correct)
  const hintPointsEarned = isCorrect ? 5 : 0;
  const newHintPoints = user.hintPoints + hintPointsEarned;

  // Skill points: 1 per level up
  const newSkillPoints = leveledUp ? user.skillPoints + 1 : user.skillPoints;

  // Rank tier update
  const newRankTier = getRankTier(newTotalScore);

  // Reset daily score if new day
  const now = new Date();
  const lastReset = user.lastDailyReset;
  const isNewDay = !lastReset || now.toDateString() !== lastReset.toDateString();
  const newDailyScore = isNewDay ? score : user.dailyScore + score;
  const newLastDailyReset = isNewDay ? now : (lastReset ?? now);

  // Compute phishing correct answers for badge eligibility
  const phishingStats = await db
    .select({ total: count() })
    .from(scoresTable)
    .where(and(eq(scoresTable.userId, userId), eq(scoresTable.mode, "phishing")));
  const phishingCorrect = Number(phishingStats[0]?.total ?? 0);

  // Compute updated user snapshot for badge calculation (before update)
  const updatedSnapshot = {
    ...user,
    totalAnswers: newTotalAnswers,
    correctAnswers: newCorrectAnswers,
    averageResponseTime: newAvgResponseTime,
    isTopHacker: user.isTopHacker,
  };

  // Compute badges
  const newBadges = computeBadges(updatedSnapshot, phishingCorrect);

  // Auto-add defender_pro badge based on defense score
  const defenseScoreRow = await db
    .select({ total: sum(scoresTable.score) })
    .from(scoresTable)
    .where(and(eq(scoresTable.userId, userId), eq(scoresTable.mode, "defense")));
  const defenseTotal = Number(defenseScoreRow[0]?.total ?? 0);
  if (defenseTotal >= 300 && !newBadges.includes("defender_pro")) {
    newBadges.push("defender_pro");
  }

  await db
    .update(usersTable)
    .set({
      xp: newXp,
      level: newLevel,
      totalScore: newTotalScore,
      dailyScore: newDailyScore,
      lastDailyReset: newLastDailyReset,
      hintPoints: newHintPoints,
      skillPoints: newSkillPoints,
      rankTier: newRankTier,
      accuracyRate: newAccuracyRate,
      totalAnswers: newTotalAnswers,
      correctAnswers: newCorrectAnswers,
      averageResponseTime: newAvgResponseTime,
      winStreak: newWinStreak,
      badges: newBadges,
    })
    .where(eq(usersTable.id, userId));

  // Update top hacker flag
  await updateTopHacker();

  // Refresh the user to check if top_hacker badge should be added
  const [refreshed] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (refreshed.isTopHacker && !newBadges.includes("top_hacker")) {
    newBadges.push("top_hacker");
    await db.update(usersTable).set({ badges: newBadges }).where(eq(usersTable.id, userId));
  }

  res.json({
    totalScore: newTotalScore,
    xp: newXp,
    level: newLevel,
    leveledUp,
    hintPoints: newHintPoints,
    hintPointsEarned,
    rankTier: newRankTier,
    skillPoints: newSkillPoints,
    newSkillPoint: leveledUp,
    badges: newBadges,
    winStreak: newWinStreak,
    streakTitle: getStreakTitle(user.streakDays),
  });
});

async function updateTopHacker() {
  const users = await db
    .select({ id: usersTable.id, dailyScore: usersTable.dailyScore, lastDailyReset: usersTable.lastDailyReset })
    .from(usersTable)
    .orderBy(desc(usersTable.dailyScore));

  let topId: number | null = null;
  let topScore = -1;
  const todayStr = new Date().toDateString();
  for (const u of users) {
    if (u.lastDailyReset && u.lastDailyReset.toDateString() === todayStr) {
      if (u.dailyScore > topScore) {
        topScore = u.dailyScore;
        topId = u.id;
      }
    }
  }

  await db.update(usersTable).set({ isTopHacker: false });
  if (topId !== null && topScore > 0) {
    await db.update(usersTable).set({ isTopHacker: true }).where(eq(usersTable.id, topId));
  }
}

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
