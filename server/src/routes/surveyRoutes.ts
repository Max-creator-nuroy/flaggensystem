import { Router } from "express";
import {
  getSurveysByUser,
  createSurvey,
  getSurveyById,
  deleteSurvey,
  createSurveyForUser,
  submitSurveyAnswers,
  getSurveyByAdmin,
  getCustomerSurveyByCoach,
  getSurveyCompletionRateForCustomers,
  getSurveyCompletionRateForCustomersByCoach,
  getCurrentSurvey,
  getSurveyCompletionRateForCoaches,
  broadcastCustomSurvey,
  getSurveySchedules,
  createSurveySchedule,
  updateSurveySchedule,
  deleteSurveySchedule,
  rescanSurveySchedules,
  getUnreadSurveysForUser,
  getUnreadSurveysForCoach,
} from "../controllers/surveyController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.post("/createSurvey", authenticateToken, createSurvey);
router.post("/createSurveyForUser/:userId", authenticateToken, createSurveyForUser);

router.patch("/submitSurveyAnswers/:surveyId", authenticateToken, submitSurveyAnswers);

router.get("/getSurveysByUser/:userId", authenticateToken, getSurveysByUser);

router.get("/getCurrentSurvey/:userId", authenticateToken, getCurrentSurvey);
router.get("/getSurveyById/:surveyId", authenticateToken, getSurveyById);
router.get("/getSurveyByAdmin/", authenticateToken, getSurveyByAdmin);
router.get("/getCustomerSurveyByCoach/:coachId", authenticateToken, getCustomerSurveyByCoach);
router.get("/getSurveyCompletionRateForCustomers", authenticateToken, getSurveyCompletionRateForCustomers);
router.get("/getSurveyCompletionRateForCoaches", authenticateToken, getSurveyCompletionRateForCoaches);
router.get("/getSurveyCompletionRateForCustomersByCoach/:coachId", authenticateToken, getSurveyCompletionRateForCustomersByCoach)

router.delete("/deleteSurvey/:surveyId", authenticateToken, deleteSurvey);
router.post("/broadcastCustomSurvey", authenticateToken, broadcastCustomSurvey);

// 🆕 Schedule routes
router.get("/schedules", authenticateToken, getSurveySchedules);
router.post("/schedules", authenticateToken, createSurveySchedule);
router.patch("/schedules/:id", authenticateToken, updateSurveySchedule);
router.delete("/schedules/:id", authenticateToken, deleteSurveySchedule);
router.post("/schedules/rescan", authenticateToken, rescanSurveySchedules);

// 🆕 Notification routes for unread surveys
router.get("/user/unread", authenticateToken, getUnreadSurveysForUser);
router.get("/coach/unread", authenticateToken, getUnreadSurveysForCoach);

export default router;
