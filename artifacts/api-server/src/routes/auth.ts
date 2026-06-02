import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, and, or, isNull, lt, sql } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { signToken, requireAuth, type AuthRequest } from "../lib/auth";
import { serializeUser } from "../lib/userProfile";

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
    .values({ username, passwordHash, hackerType: hackerType ?? "defender", lastLoginAt: new Date() })
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

  const now = new Date();
  let streakDays = user.streakDays;
  if (user.lastLoginAt) {
    const diffHours = (now.getTime() - user.lastLoginAt.getTime()) / (1000 * 60 * 60);
    if (diffHours >= 24 && diffHours < 48) {
      streakDays = user.streakDays + 1;
    } else if (diffHours >= 48) {
      streakDays = 1;
    }
    // < 24h: same-day re-login, streak unchanged
  } else {
    streakDays = 1;
  }

  const isNewDay = !user.lastDailyReset || now.toDateString() !== user.lastDailyReset.toDateString();

  const [updatedUser] = await db
    .update(usersTable)
    .set({
      lastLoginAt: now,
      streakDays,
      dailyScore: isNewDay ? 0 : user.dailyScore,
      lastDailyReset: isNewDay ? now : (user.lastDailyReset ?? now),
    })
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
  const userId = req.user!.userId;
  const now = new Date();
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Read current streak to compute reward — do this before the atomic update
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  // Fast-path reject (avoids unnecessary UPDATE round-trip)
  if (user.lastClaimedAt && user.lastClaimedAt.getTime() > cutoff.getTime()) {
    res.status(400).json({ error: "Daily bonus already claimed. Come back tomorrow!" });
    return;
  }

  const STREAK_REWARDS: Record<number, number> = { 1: 20, 2: 25, 3: 30, 5: 50, 7: 100 };
  const streakBonus = STREAK_REWARDS[user.streakDays] ?? 20;

  // Atomic update — the WHERE condition on lastClaimedAt prevents a second concurrent
  // request from double-claiming (it will update 0 rows and get no result back)
  const [updated] = await db
    .update(usersTable)
    .set({
      hintPoints: sql`${usersTable.hintPoints} + ${streakBonus}`,
      lastClaimedAt: now,
    })
    .where(
      and(
        eq(usersTable.id, userId),
        or(isNull(usersTable.lastClaimedAt), lt(usersTable.lastClaimedAt, cutoff))
      )
    )
    .returning();

  if (!updated) {
    res.status(400).json({ error: "Daily bonus already claimed. Come back tomorrow!" });
    return;
  }

  res.json({
    hintPointsEarned: streakBonus,
    streakDays: updated.streakDays,
    totalHintPoints: updated.hintPoints,
    message: user.streakDays >= 7
      ? "🔥 7-Day Streak! Legendary bonus claimed!"
      : `Day ${user.streakDays} streak bonus claimed!`,
  });
});

export default router;
