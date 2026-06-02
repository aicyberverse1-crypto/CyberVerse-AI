import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { SKILLS } from "./skills";

const router: IRouter = Router();

router.post("/missions/generate", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const unlocked = (user.unlockedSkills as string[]) ?? [];
  const unlockedSkillNames = unlocked.map((id) => SKILLS.find((s) => s.id === id)?.name).filter(Boolean);

  const difficultyLevel =
    user.accuracyRate >= 80 ? "Expert" :
    user.accuracyRate >= 60 ? "Hard" :
    user.accuracyRate >= 40 ? "Medium" : "Easy";

  const fallbackMission = {
    title: "System Breach Response",
    scenario: "A critical server has been compromised. Analyze the attack vectors and secure the system before sensitive data is exfiltrated.",
    difficulty: difficultyLevel,
    objectives: [
      { text: "Identify the intrusion vector", xpReward: 20 },
      { text: "Isolate affected systems", xpReward: 30 },
      { text: "Deploy countermeasures", xpReward: 50 },
    ],
    hints: ["Check recent login attempts", "Review firewall logs"],
    rewards: { xp: 100, score: 200, hintPoints: 25 },
    hackerType: user.hackerType,
  };

  const prompt = `You are generating a custom cybersecurity training mission for a ${user.hackerType} (${user.hackerType === "defender" ? "Blue Team" : "Red Team"}).

Player Profile:
- Type: ${user.hackerType === "defender" ? "Defender (Blue Team)" : "Attacker (Red Team)"}
- Level: ${user.level}
- Accuracy Rate: ${user.accuracyRate.toFixed(1)}%
- Unlocked Skills: ${unlockedSkillNames.length > 0 ? unlockedSkillNames.join(", ") : "None"}
- Appropriate Difficulty: ${difficultyLevel}

Generate a realistic and immersive cybersecurity mission. Respond ONLY with valid JSON in this exact format:
{
  "title": "Mission title (short, dramatic)",
  "scenario": "Detailed scenario description (2-3 sentences, realistic)",
  "difficulty": "${difficultyLevel}",
  "objectives": [
    {"text": "Objective 1", "xpReward": 20},
    {"text": "Objective 2", "xpReward": 30},
    {"text": "Objective 3", "xpReward": 50}
  ],
  "hints": ["Hint 1", "Hint 2"],
  "rewards": {"xp": 100, "score": 200, "hintPoints": 25},
  "hackerType": "${user.hackerType}"
}

For ${user.hackerType === "defender" ? "Defender missions focus on: securing systems, detecting threats, fixing vulnerabilities, incident response" : "Attacker missions focus on: exploiting systems, cracking security, penetration testing, simulating attacks"}.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 600,
      messages: [
        { role: "system", content: "You are a cybersecurity training system that generates realistic missions. Always respond with valid JSON only, no extra text." },
        { role: "user", content: prompt },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    let mission;
    try {
      mission = JSON.parse(content);
    } catch {
      mission = fallbackMission;
    }

    res.json(mission);
  } catch {
    // AI unavailable — return a sensible fallback so the UI doesn't break
    res.json(fallbackMission);
  }
});

export default router;
