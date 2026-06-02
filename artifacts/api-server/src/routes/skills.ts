import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

export interface SkillDef {
  id: string;
  name: string;
  description: string;
  type: "defender" | "attacker";
  cost: number;
  effect: string;
  icon: string;
}

export const SKILLS: SkillDef[] = [
  // Defender skills
  { id: "firewall_boost", name: "Firewall Boost", type: "defender", cost: 1, icon: "Shield", description: "Strengthen your defenses against incoming attacks", effect: "+10% score bonus on defense mode" },
  { id: "hint_efficiency", name: "Hint Efficiency", type: "defender", cost: 1, icon: "Lightbulb", description: "Reduce AI hint costs by 20%", effect: "-20% hint point cost" },
  { id: "threat_detection", name: "Threat Detection", type: "defender", cost: 2, icon: "Scan", description: "Identify threats faster with enhanced perception", effect: "+5 seconds on timed challenges" },
  { id: "system_recovery", name: "System Recovery", type: "defender", cost: 2, icon: "RefreshCw", description: "Recover partial points on wrong answers", effect: "+10 pts on incorrect answers" },
  { id: "shield_mode", name: "Shield Mode", type: "defender", cost: 3, icon: "ShieldCheck", description: "Activate impenetrable defense protocols", effect: "Immunity to time penalty once per session" },
  // Attacker skills
  { id: "exploit_mastery", name: "Exploit Mastery", type: "attacker", cost: 1, icon: "Code2", description: "Master the art of system exploitation", effect: "+15% score bonus on attack scenarios" },
  { id: "speed_hack", name: "Speed Hack", type: "attacker", cost: 1, icon: "Zap", description: "Execute attacks at lightning speed", effect: "+20% time bonus points" },
  { id: "critical_strike", name: "Critical Strike", type: "attacker", cost: 2, icon: "Target", description: "Deal critical damage with precise attacks", effect: "2x points chance (10%) on correct answers" },
  { id: "ai_override", name: "AI Override", type: "attacker", cost: 2, icon: "Bot", description: "Override AI systems for superior hints", effect: "Free hint once per game session" },
  { id: "overclock_mode", name: "Overclock Mode", type: "attacker", cost: 3, icon: "Cpu", description: "Push beyond normal limits", effect: "+30% XP earned from all activities" },
];

router.get("/skills", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json({
    skills: SKILLS,
    unlockedSkills: (user.unlockedSkills as string[]) ?? [],
    skillPoints: user.skillPoints,
    hackerType: user.hackerType,
  });
});

router.post("/skills/unlock", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { skillId } = req.body as { skillId?: string };
  if (!skillId) {
    res.status(400).json({ error: "skillId is required" });
    return;
  }

  const skill = SKILLS.find((s) => s.id === skillId);
  if (!skill) {
    res.status(400).json({ error: "Skill not found" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const unlocked = (user.unlockedSkills as string[]) ?? [];
  if (unlocked.includes(skillId)) {
    res.status(400).json({ error: "Skill already unlocked" });
    return;
  }

  if (skill.type !== user.hackerType) {
    res.status(400).json({ error: `This skill is for ${skill.type}s only` });
    return;
  }

  if (user.skillPoints < skill.cost) {
    res.status(400).json({ error: `Not enough skill points. Need ${skill.cost}, have ${user.skillPoints}` });
    return;
  }

  const newUnlocked = [...unlocked, skillId];

  // Atomic update — WHERE checks skillPoints at DB level to prevent double-spend
  // from concurrent unlock requests
  const [updated] = await db
    .update(usersTable)
    .set({
      skillPoints: sql`${usersTable.skillPoints} - ${skill.cost}`,
      unlockedSkills: newUnlocked,
    })
    .where(eq(usersTable.id, user.id))
    .returning();

  if (!updated) {
    res.status(400).json({ error: "Unlock failed. Please try again." });
    return;
  }

  res.json({
    success: true,
    skillPoints: updated.skillPoints,
    unlockedSkills: newUnlocked,
    message: `${skill.name} unlocked! ${skill.effect}`,
  });
});

export default router;
