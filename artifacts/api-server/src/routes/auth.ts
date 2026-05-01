import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { signToken, requireAuth, type AuthRequest } from "../lib/auth";
import { serializeUser, getRankTier } from "../lib/userProfile";

const router: IRouter = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { username, password, hackerType } = parsed.data;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (existing) {
    res.status(409).json({ error: "Username already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(usersTable)
    .values({
      username,
      passwordHash,
      hackerType: hackerType ?? "defender",
      lastLoginAt: new Date(),
    })
    .returning();

  const token = signToken({ userId: user.id, username: user.username });
  res.status(201).json({ token, user: serializeUser(user) });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { username, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  // Handle streak logic on login
  const now = new Date();
  let streakDays = user.streakDays;
  const lastLogin = user.lastLoginAt;
  if (lastLogin) {
    const diffHours = (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60);
    if (diffHours >= 24 && diffHours < 48) {
      streakDays = user.streakDays + 1;
    } else if (diffHours >= 48) {
      streakDays = 1;
    }
  } else {
    streakDays = 1;
  }

  // Reset daily score if new day
  const lastReset = user.lastDailyReset;
  let dailyScore = user.dailyScore;
  if (!lastReset || now.toDateString() !== lastReset.toDateString()) {
    dailyScore = 0;
  }

  const [updatedUser] = await db
    .update(usersTable)
    .set({ lastLoginAt: now, streakDays, dailyScore, lastDailyReset: lastReset ?? now })
    .where(eq(usersTable.id, user.id))
    .returning();

  const token = signToken({ userId: updatedUser.id, username: updatedUser.username });
  res.json({ token, user: serializeUser(updatedUser) });
});

router.get("/user", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  res.json(serializeUser(user));
});

router.post("/user/hacker-type", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { hackerType } = req.body as { hackerType?: string };
  if (!hackerType || !["defender", "attacker"].includes(hackerType)) {
    res.status(400).json({ error: "Invalid hackerType. Must be 'defender' or 'attacker'" });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ hackerType })
    .where(eq(usersTable.id, req.user!.userId))
    .returning();

  res.json(serializeUser(user));
});

router.post("/user/daily-claim", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const now = new Date();
  if (user.lastClaimedAt) {
    const diffHours = (now.getTime() - user.lastClaimedAt.getTime()) / (1000 * 60 * 60);
    if (diffHours < 24) {
      res.status(400).json({ error: "Daily bonus already claimed. Come back tomorrow!" });
      return;
    }
  }

  const STREAK_REWARDS: Record<number, number> = { 1: 20, 2: 25, 3: 30, 5: 50, 7: 100 };
  const streakBonus = STREAK_REWARDS[user.streakDays] ?? 20;
  const newHintPoints = user.hintPoints + streakBonus;

  const [updated] = await db
    .update(usersTable)
    .set({ hintPoints: newHintPoints, lastClaimedAt: now })
    .where(eq(usersTable.id, user.id))
    .returning();

  res.json({
    hintPointsEarned: streakBonus,
    streakDays: updated.streakDays,
    totalHintPoints: newHintPoints,
    message: user.streakDays >= 7
      ? "🔥 7-Day Streak! Legendary bonus claimed!"
      : `Day ${user.streakDays} streak bonus claimed!`,
  });
});

export default router;
