import { Router } from "express";
import { getCoachStats } from "../controllers/admin/coachStatsController";
import { getCustomerGrowth, getFlagsPerCoach, getTopRequirementFlags, getRequirementFailures, getRequirementDetail, getCoachDetail, getCoachCustomerGrowth, getCoachRequirementFailures } from "../controllers/admin/globalStatsController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// Route für Coach-Statistiken, erfordert Authentifizierung und Admin-Rolle
router.get("/stats", authenticateToken, getCoachStats);
router.get("/stats/customerGrowth", authenticateToken, getCustomerGrowth);
router.get("/stats/flagsPerCoach", authenticateToken, getFlagsPerCoach);
router.get("/stats/topRequirements", authenticateToken, getTopRequirementFlags);
router.get("/stats/requirementFailures", authenticateToken, getRequirementFailures);
router.get("/stats/requirement/:id", authenticateToken, getRequirementDetail);
router.get("/stats/coach/:id", authenticateToken, getCoachDetail);
router.get("/stats/coachCustomerGrowth/:id", authenticateToken, getCoachCustomerGrowth);
router.get("/stats/coachRequirementFailures/:id", authenticateToken, getCoachRequirementFailures);

export default router;
