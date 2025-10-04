"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const coachStatsController_1 = require("../controllers/admin/coachStatsController");
const globalStatsController_1 = require("../controllers/admin/globalStatsController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Route für Coach-Statistiken, erfordert Authentifizierung und Admin-Rolle
router.get("/stats", authMiddleware_1.authenticateToken, coachStatsController_1.getCoachStats);
router.get("/stats/customerGrowth", authMiddleware_1.authenticateToken, globalStatsController_1.getCustomerGrowth);
router.get("/stats/flagsPerCoach", authMiddleware_1.authenticateToken, globalStatsController_1.getFlagsPerCoach);
router.get("/stats/topRequirements", authMiddleware_1.authenticateToken, globalStatsController_1.getTopRequirementFlags);
router.get("/stats/requirementFailures", authMiddleware_1.authenticateToken, globalStatsController_1.getRequirementFailures);
router.get("/stats/requirement/:id", authMiddleware_1.authenticateToken, globalStatsController_1.getRequirementDetail);
router.get("/stats/coach/:id", authMiddleware_1.authenticateToken, globalStatsController_1.getCoachDetail);
router.get("/stats/coachCustomerGrowth/:id", authMiddleware_1.authenticateToken, globalStatsController_1.getCoachCustomerGrowth);
router.get("/stats/coachRequirementFailures/:id", authMiddleware_1.authenticateToken, globalStatsController_1.getCoachRequirementFailures);
exports.default = router;
