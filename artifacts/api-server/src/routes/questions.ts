import { Router, type IRouter } from "express";
import { db, questionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { GetQuestionsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/questions", async (req, res): Promise<void> => {
  const parsed = GetQuestionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { mode, difficulty, limit } = parsed.data as { mode?: string; difficulty?: string; limit?: number };

  let query = db.select().from(questionsTable).$dynamic();

  const conditions = [];
  if (mode) conditions.push(eq(questionsTable.mode, mode));
  if (difficulty) conditions.push(eq(questionsTable.difficulty, difficulty));

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }
  if (limit) {
    query = query.limit(limit);
  }

  const questions = await query;
  res.json(
    questions.map((q) => ({
      id: q.id,
      mode: q.mode,
      scenario: q.scenario,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      difficulty: q.difficulty,
    }))
  );
});

export default router;
