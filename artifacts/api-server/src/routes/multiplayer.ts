import { Router, type IRouter } from "express";
import { db, usersTable, scoresTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

const AI_NAMES = ["ShadowNet_7", "ByteBreaker", "PhantomProxy", "ZeroDay_X", "CipherGhost", "RootKit_AI", "NullPtr", "HexWorm"];

const DIFFICULTY_SCORE_RANGE: Record<string, [number, number]> = {
  easy: [40, 80],
  medium: [70, 120],
  hard: [100, 160],
  expert: [140, 200],
};

router.post("/multiplayer/challenge", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { mode, opponentDifficulty } = req.body as { mode?: string; opponentDifficulty?: string };

  if (!mode || !opponentDifficulty) {
    res.status(400).json({ error: "mode and opponentDifficulty are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  // Simulate AI opponent score based on difficulty
  const [min, max] = DIFFICULTY_SCORE_RANGE[opponentDifficulty] ?? [70, 120];
  const opponentScore = Math.floor(Math.random() * (max - min + 1)) + min;

  // Player's score: based on their accuracy rate
  const accuracyFactor = user.accuracyRate / 100;
  const playerBase = 100;
  const playerScore = Math.floor(playerBase * (0.5 + accuracyFactor * 0.8) + Math.random() * 40);

  const opponentName = AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)];

  let winner: "player" | "opponent" | "draw";
  let xpEarned: number;
  let hintPointsEarned: number;
  let message: string;

  if (playerScore > opponentScore) {
    winner = "player";
    xpEarned = 50;
    hintPointsEarned = 30;
    message = `You defeated ${opponentName}! Superior cyber skills!`;
  } else if (opponentScore > playerScore) {
    winner = "opponent";
    xpEarned = 10;
    hintPointsEarned = 5;
    message = `${opponentName} outmaneuvered you. Train harder!`;
  } else {
    winner = "draw";
    xpEarned = 25;
    hintPointsEarned = 15;
    message = "A perfect tie! Equally matched operators.";
  }

  // Apply rewards
  const newXp = user.xp + xpEarned;
  const newLevel = Math.floor(newXp / 100) + 1;
  const newHintPoints = user.hintPoints + hintPointsEarned;

  await db
    .update(usersTable)
    .set({ xp: newXp, level: newLevel, hintPoints: newHintPoints })
    .where(eq(usersTable.id, user.id));

  // Log score
  if (winner === "player") {
    await db.insert(scoresTable).values({
      userId: user.id,
      mode: `multiplayer_${mode}`,
      score: playerScore,
      xpEarned,
    });
  }

  res.json({
    playerScore,
    opponentScore,
    opponentName,
    winner,
    xpEarned,
    hintPointsEarned,
    message,
  });
});

export default router;
