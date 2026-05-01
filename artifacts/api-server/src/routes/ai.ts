import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { GetAiHintBody, SendAiChatMessageBody } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

router.post("/ai/hint", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = GetAiHintBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { scenario, question, mode } = parsed.data;

  const modeDescriptions: Record<string, string> = {
    phishing: "phishing email detection",
    defense: "cyber attack defense",
    builder: "secure system building",
    escape: "cybersecurity escape room puzzle",
  };

  const modeDesc = modeDescriptions[mode] ?? mode;

  const completion = await openai.chat.completions.create({
    model: "gpt-5-mini",
    max_completion_tokens: 300,
    messages: [
      {
        role: "system",
        content: `You are CyberGuard, an expert cybersecurity mentor helping a student learn through interactive simulation games. Your role is to give educational HINTS, not direct answers. The student is playing a ${modeDesc} game.

Rules:
- Give a hint that guides thinking, NOT the answer
- Be educational and explain WHY something matters
- Keep it concise (2-3 sentences max)
- Use simple language, no jargon overload
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
  res.json({ hint });
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
    model: "gpt-5-mini",
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

export default router;
