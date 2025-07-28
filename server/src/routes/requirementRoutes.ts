import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { createRequirement, deleteRequirement, getRequirementByCoach } from "../controllers/requirementController";

const router = Router();

router.get("/getRequirementByCoach/:coachId", authenticateToken, getRequirementByCoach);
router.post("/createRequirement/:coachId", authenticateToken, createRequirement);
router.delete("/deleteRequirement/:id", authenticateToken, deleteRequirement);

export default router;