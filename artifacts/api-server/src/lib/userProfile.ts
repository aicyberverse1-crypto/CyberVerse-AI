import type { User } from "@workspace/db";

export function serializeUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    xp: user.xp,
    level: user.level,
    totalScore: user.totalScore,
    hintPoints: user.hintPoints,
    hackerType: user.hackerType,
    skillPoints: user.skillPoints,
    unlockedSkills: (user.unlockedSkills as string[]) ?? [],
    rankTier: user.rankTier,
    accuracyRate: user.accuracyRate,
    streakDays: user.streakDays,
    dailyScore: user.dailyScore,
    isTopHacker: user.isTopHacker,
    lastClaimedAt: user.lastClaimedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

export function getRankTier(totalScore: number): string {
  if (totalScore >= 10000) return "Elite Hacker";
  if (totalScore >= 6000) return "Diamond";
  if (totalScore >= 3000) return "Platinum";
  if (totalScore >= 1500) return "Gold";
  if (totalScore >= 500) return "Silver";
  return "Bronze";
}

export const HINT_COSTS: Record<string, number> = {
  easy: 10,
  medium: 15,
  hard: 25,
  expert: 40,
};
