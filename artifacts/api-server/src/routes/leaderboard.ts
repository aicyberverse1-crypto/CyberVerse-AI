import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { GetLeaderboardQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/leaderboard", async (req, res): Promise<void> => {
  const parsed = GetLeaderboardQueryParams.safeParse(req.query);
  const limit = parsed.success && parsed.data.limit ? parsed.data.limit : 10;

  const users = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      totalScore: usersTable.totalScore,
      xp: usersTable.xp,
      level: usersTable.level,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.totalScore))
    .limit(limit);

  res.json(
    users.map((u, index) => ({
      rank: index + 1,
      username: u.username,
      totalScore: u.totalScore,
      xp: u.xp,
      level: u.level,
    }))
  );
});

export default router;
