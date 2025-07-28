import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { deleteLead, getAllLeads, getLead, getLeadsByUser, updateLead } from "../controllers/leadController";

const router = Router();

router.get("/getLead/:id", authenticateToken, getLead);
router.get("/getLeadsByUser/:userId", authenticateToken, getLeadsByUser);
router.get("/getAllLeads", authenticateToken, getAllLeads);
router.put("/updateLead/:id", authenticateToken, updateLead);
router.delete("/deleteLead/:id", authenticateToken, deleteLead);

export default router;
