import { Router, type IRouter } from "express";
import { db, usersTable, scoresTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

const AI_NAMES = ["ShadowNet_7", "ByteBreaker", "PhantomProxy", "ZeroDay_X", "CipherGhost", "RootKit_AI", "NullPtr", "HexWorm"];

// AI opponent accuracy per difficulty (probability of correct answer)
const AI_ACCURACY: Record<string, number> = {
  easy: 0.45,
  medium: 0.65,
  hard: 0.80,
  expert: 0.92,
};

// Per-question max score (same formula as frontend): correctBase + speedBonus
const Q_MAX = 30; // 20 correct + 10 speed max

router.post("/multiplayer/challenge", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { mode, opponentDifficulty, playerScore, totalQuestions } = req.body as {
    mode?: string;
    opponentDifficulty?: string;
    playerScore?: number;       // actual score from the quiz game
    totalQuestions?: number;    // how many questions were played
  };

  if (!mode || !opponentDifficulty) {
    res.status(400).json({ error: "mode and opponentDifficulty are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const numQs = Math.max(1, Math.min(10, totalQuestions ?? 5));
  const maxPossible = numQs * Q_MAX;

  // --- AI score: simulate based on difficulty accuracy ---
  const acc = AI_ACCURACY[opponentDifficulty] ?? 0.65;
  let aiScore = 0;
  for (let i = 0; i < numQs; i++) {
    if (Math.random() < acc) {
      // Correct — AI also gets a speed bonus proportional to difficulty
      const speedFraction = 0.3 + acc * 0.7; // harder AI is faster
      aiScore += 20 + Math.round(10 * speedFraction * (0.7 + Math.random() * 0.3));
    }
  }

  // --- Player score: use actual submitted score if provided, else fall back ---
  const finalPlayerScore =
    typeof playerScore === "number" && playerScore >= 0 && playerScore <= maxPossible
      ? playerScore
      : Math.floor(maxPossible * ((user.accuracyRate / 100) * 0.8 + 0.2 * Math.random()));

  const opponentName = AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)];

  let winner: "player" | "opponent" | "draw";
  let xpEarned: number;
  let hintPointsEarned: number;
  let message: string;

  const margin = finalPlayerScore - aiScore;
  if (margin > 0) {
    winner = "player";
    xpEarned = Math.min(100, 50 + Math.floor(margin / 5));
    hintPointsEarned = 30;
    message = `You defeated ${opponentName}! Superior cyber skills!`;
  } else if (margin < 0) {
    winner = "opponent";
    xpEarned = 10;
    hintPointsEarned = 5;
    message = `${opponentName} outmaneuvered you. Train harder and try again!`;
  } else {
    winner = "draw";
    xpEarned = 25;
    hintPointsEarned = 15;
    message = "A perfect tie! Equally matched operators.";
  }

  const newXp = user.xp + xpEarned;
  const newLevel = Math.floor(newXp / 100) + 1;
  const newHintPoints = user.hintPoints + hintPointsEarned;

  await db
    .update(usersTable)
    .set({ xp: newXp, level: newLevel, hintPoints: newHintPoints })
    .where(eq(usersTable.id, user.id));

  await db.insert(scoresTable).values({
    userId: user.id,
    mode: `multiplayer_${mode}`,
    score: finalPlayerScore,
    xpEarned,
  });

  res.json({
    playerScore: finalPlayerScore,
    opponentScore: aiScore,
    opponentName,
    winner,
    xpEarned,
    hintPointsEarned,
    message,
  });
});

export default router;
