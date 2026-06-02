import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db, usersTable, scoresTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { GetAiHintBody, SendAiChatMessageBody } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { HINT_COSTS } from "../lib/userProfile";

const router: IRouter = Router();

router.post("/ai/hint", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = GetAiHintBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { scenario, question, mode, difficulty } = parsed.data;
  const cost = HINT_COSTS[difficulty ?? "medium"] ?? 15;

  // Deduct hint points
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  if (user.hintPoints < cost) {
    res.status(402).json({ error: `Not enough hint points. Need ${cost}, have ${user.hintPoints}. Earn more by answering correctly or claiming your daily bonus!` });
    return;
  }

  const newHintPoints = user.hintPoints - cost;
  await db.update(usersTable).set({ hintPoints: newHintPoints }).where(eq(usersTable.id, user.id));

  const modeDescriptions: Record<string, string> = {
    phishing: "phishing email detection",
    defense: "cyber attack defense",
    builder: "secure system building",
    escape: "cybersecurity escape room puzzle",
  };

  const modeDesc = modeDescriptions[mode] ?? mode;

  // AI Memory: fetch user's recent performance to tailor hints
  const recentScores = await db
    .select()
    .from(scoresTable)
    .where(eq(scoresTable.userId, user.id))
    .orderBy(desc(scoresTable.createdAt))
    .limit(20);

  const modeAccuracy: Record<string, { correct: number; total: number }> = {};
  for (const s of recentScores) {
    if (!modeAccuracy[s.mode]) modeAccuracy[s.mode] = { correct: 0, total: 0 };
    modeAccuracy[s.mode].total += 1;
    if (s.score > 0) modeAccuracy[s.mode].correct += 1;
  }
  const weakAreas = Object.entries(modeAccuracy)
    .filter(([, v]) => v.total > 0 && v.correct / v.total < 0.65)
    .map(([m]) => m);

  const memoryContext = weakAreas.length > 0
    ? `\n\nStudent performance note: This student historically struggles with ${weakAreas.join(", ")} scenarios (below 65% accuracy). Tailor your hint to build foundational understanding.`
    : recentScores.length > 5
    ? `\n\nStudent performance note: This student has a solid track record (${recentScores.filter(s => s.score > 0).length}/${recentScores.length} recent correct). Give a more nuanced hint that challenges deeper thinking.`
    : "";

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 400,
    messages: [
      {
        role: "system",
        content: `You are CyberGuard, an expert cybersecurity mentor helping a student learn through interactive simulation games. Your role is to give educational HINTS, not direct answers. The student is playing a ${modeDesc} game at ${difficulty ?? "medium"} difficulty.${memoryContext}

Rules:
- Give a hint that guides thinking, NOT the answer
- Be educational and explain WHY something matters
- Keep it concise (2-4 sentences max)
- Use simple language with a real-world analogy when helpful
- Be encouraging and supportive
- Never reveal the correct answer directly`,
      },
      {
        role: "user",
        content: `Scenario: ${scenario}\n\nStudent's question: ${question}\n\nGive me a helpful hint without revealing the answer.`,
      },
    ],
  });

  const hint = completion.choices[0]?.message?.content ?? "Think carefully about what makes this scenario suspicious or legitimate.";
  res.json({ hint, hintPointsCost: cost, hintPointsRemaining: newHintPoints });
});

router.post("/ai/chat", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = SendAiChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { message, gameMode } = parsed.data;

  const gameModeContext = gameMode
    ? `The user is currently playing the ${gameMode} game mode.`
    : "The user is on the main dashboard.";

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 500,
    messages: [
      {
        role: "system",
        content: `You are CyberGuard, a friendly and expert cybersecurity mentor AI assistant. ${gameModeContext}

Your personality:
- Knowledgeable but approachable — explain things simply
- Focused on education and practical understanding
- Encouraging — help users learn from mistakes
- Context-aware — tailor advice to the current game mode

Topics you help with:
- Identifying phishing emails and social engineering attacks
- Password security and authentication best practices
- Network defense and attack patterns
- Cybersecurity careers and learning resources
- Tips for the current game challenges

Keep responses concise (3-5 sentences), educational, and practical. Use concrete examples when helpful.`,
      },
      {
        role: "user",
        content: message,
      },
    ],
  });

  const response = completion.choices[0]?.message?.content ?? "I'm here to help with your cybersecurity questions!";
  res.json({ response });
});

// Cached news to avoid hammering the AI on every page load
let newsCache: { items: unknown[]; generatedAt: number } | null = null;
const NEWS_TTL_MS = 15 * 60 * 1000; // 15 minutes

router.get("/ai/news", requireAuth, async (_req, res): Promise<void> => {
  const now = Date.now();
  if (newsCache && now - newsCache.generatedAt < NEWS_TTL_MS) {
    res.json({ items: newsCache.items, cached: true, generatedAt: newsCache.generatedAt });
    return;
  }

  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 1800,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a cybersecurity threat intelligence analyst. Generate a JSON object with a field "items" containing an array of exactly 6 realistic, educational cybersecurity news items for ${today}. Each item must have these exact fields:
{
  "id": number (1-6),
  "title": string (realistic threat headline),
  "source": string (realistic source like "CISA Advisory", "Krebs on Security", "ThreatPost", "Google Project Zero", etc.),
  "category": string (one of: "Breach", "Malware", "Vulnerability", "Phishing", "Supply Chain", "Critical Infrastructure"),
  "severity": string (one of: "CRITICAL", "HIGH", "MEDIUM"),
  "summary": string (2-3 sentences describing the incident),
  "impact": string (brief impact stat or scope),
  "lesson": string (1-2 sentences of what defenders should learn),
  "tips": array of 3 strings (actionable defensive tips),
  "color": string (one of: "text-red-400", "text-orange-400", "text-yellow-400", "text-primary", "text-blue-400", "text-purple-400")
}
Make each story feel current, realistic, and educational. Vary severity levels and categories.`,
      },
      { role: "user", content: "Generate today's cyber threat intelligence feed." },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? '{"items":[]}';
  let parsed: { items: unknown[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { items: [] };
  }

  newsCache = { items: parsed.items ?? [], generatedAt: now };
  res.json({ items: newsCache.items, cached: false, generatedAt: now });
});

router.post("/ai/news/refresh", requireAuth, async (_req, res): Promise<void> => {
  newsCache = null;
  res.json({ ok: true });
});

export default router;
