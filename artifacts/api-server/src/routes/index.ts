import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import questionsRouter from "./questions";
import scoresRouter from "./scores";
import leaderboardRouter from "./leaderboard";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(questionsRouter);
router.use(scoresRouter);
router.use(leaderboardRouter);
router.use(aiRouter);

export default router;
