import { Router } from "express";
import { getCoachStats } from "../controllers/admin/coachStatsController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// Route für Coach-Statistiken, erfordert Authentifizierung und Admin-Rolle
router.get("/stats", authenticateToken, getCoachStats);

export default router;
