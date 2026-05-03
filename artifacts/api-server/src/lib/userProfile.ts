import type { User } from "@workspace/db";

export function getStreakTitle(streakDays: number): string | null {
  if (streakDays >= 10) return "Unstoppable 🔥🔥";
  if (streakDays >= 5) return "On Fire 🔥";
  if (streakDays >= 3) return "Rising ⚡";
  return null;
}

export const BADGE_DEFS: Record<string, { label: string; icon: string; desc: string }> = {
  top_hacker:      { label: "Top Hacker",      icon: "👑", desc: "Highest daily score" },
  phishing_master: { label: "Phishing Master",  icon: "🎣", desc: "10 correct phishing answers" },
  speed_runner:    { label: "Speed Runner",     icon: "⚡", desc: "Average response under 8s" },
  defender_pro:    { label: "Defender Pro",     icon: "🛡️", desc: "Defense score over 300" },
};

export function computeBadges(user: User, phishingCorrect: number): string[] {
  const existing = (user.badges as string[]) ?? [];
  const earned = new Set(existing);

  if (user.isTopHacker) earned.add("top_hacker");
  if (phishingCorrect >= 10) earned.add("phishing_master");
  if (user.totalAnswers >= 5 && user.averageResponseTime > 0 && user.averageResponseTime < 8000) earned.add("speed_runner");

  return Array.from(earned);
}

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
    winStreak: user.winStreak ?? 0,
    dailyScore: user.dailyScore,
    isTopHacker: user.isTopHacker,
    badges: (user.badges as string[]) ?? [],
    streakTitle: getStreakTitle(user.streakDays),
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
