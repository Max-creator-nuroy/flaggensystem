import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { createManuelFlag, deleteFlagCascade } from "../controllers/flagController";

const router = Router();

router.post("/createManuelFlag/:userId", authenticateToken, createManuelFlag);
router.delete("/deleteCascade/:id", authenticateToken, deleteFlagCascade);

export default router;
