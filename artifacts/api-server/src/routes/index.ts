import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import questionsRouter from "./questions";
import scoresRouter from "./scores";
import leaderboardRouter from "./leaderboard";
import aiRouter from "./ai";
import skillsRouter from "./skills";
import missionsRouter from "./missions";
import multiplayerRouter from "./multiplayer";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(questionsRouter);
router.use(scoresRouter);
router.use(leaderboardRouter);
router.use(aiRouter);
router.use(skillsRouter);
router.use(missionsRouter);
router.use(multiplayerRouter);

export default router;
