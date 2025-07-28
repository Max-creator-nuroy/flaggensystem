import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import {
    createAdminQuestion,
  createQuestion,
  deleteQuestion,
  getQuestions,
  getQuestionsByAdmin,
  getQuestionsByCoach,
} from "../controllers/questionController";

const router = Router();

router.post("/createQuestion/:coachId", authenticateToken, createQuestion);
router.post("/createAdminQuestion", authenticateToken, createAdminQuestion)
router.get("/getAllQuestion",authenticateToken, getQuestions);
router.get("/getQuestionsByAdmin", authenticateToken, getQuestionsByAdmin);
router.get("/getQuestionByCoach/:coachId", authenticateToken, getQuestionsByCoach);
router.delete("/deleteQuestion/:id", authenticateToken, deleteQuestion);

export default router;
