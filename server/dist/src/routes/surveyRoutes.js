"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const surveyController_1 = require("../controllers/surveyController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.post("/createSurvey", authMiddleware_1.authenticateToken, surveyController_1.createSurvey);
router.post("/createSurveyForUser/:userId", authMiddleware_1.authenticateToken, surveyController_1.createSurveyForUser);
router.patch("/submitSurveyAnswers/:surveyId", authMiddleware_1.authenticateToken, surveyController_1.submitSurveyAnswers);
router.get("/getSurveysByUser/:userId", authMiddleware_1.authenticateToken, surveyController_1.getSurveysByUser);
router.get("/getCurrentSurvey/:userId", authMiddleware_1.authenticateToken, surveyController_1.getCurrentSurvey);
router.get("/getSurveyById/:surveyId", authMiddleware_1.authenticateToken, surveyController_1.getSurveyById);
router.get("/getSurveyByAdmin/", authMiddleware_1.authenticateToken, surveyController_1.getSurveyByAdmin);
router.get("/getCustomerSurveyByCoach/:coachId", authMiddleware_1.authenticateToken, surveyController_1.getCustomerSurveyByCoach);
router.get("/getSurveyCompletionRateForCustomers", authMiddleware_1.authenticateToken, surveyController_1.getSurveyCompletionRateForCustomers);
router.get("/getSurveyCompletionRateForCoaches", authMiddleware_1.authenticateToken, surveyController_1.getSurveyCompletionRateForCoaches);
router.get("/getSurveyCompletionRateForCustomersByCoach/:coachId", authMiddleware_1.authenticateToken, surveyController_1.getSurveyCompletionRateForCustomersByCoach);
router.delete("/deleteSurvey/:surveyId", authMiddleware_1.authenticateToken, surveyController_1.deleteSurvey);
router.post("/broadcastCustomSurvey", authMiddleware_1.authenticateToken, surveyController_1.broadcastCustomSurvey);
// 🆕 Schedule routes
router.get("/schedules", authMiddleware_1.authenticateToken, surveyController_1.getSurveySchedules);
router.post("/schedules", authMiddleware_1.authenticateToken, surveyController_1.createSurveySchedule);
router.patch("/schedules/:id", authMiddleware_1.authenticateToken, surveyController_1.updateSurveySchedule);
router.delete("/schedules/:id", authMiddleware_1.authenticateToken, surveyController_1.deleteSurveySchedule);
router.post("/schedules/rescan", authMiddleware_1.authenticateToken, surveyController_1.rescanSurveySchedules);
// 🆕 Notification routes for unread surveys
router.get("/user/unread", authMiddleware_1.authenticateToken, surveyController_1.getUnreadSurveysForUser);
router.get("/coach/unread", authMiddleware_1.authenticateToken, surveyController_1.getUnreadSurveysForCoach);
exports.default = router;
