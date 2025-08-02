import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { createManuelFlag } from "../controllers/flagController";

const router = Router();

router.post("/createManuelFlag/:userId", authenticateToken, createManuelFlag);

export default router;
