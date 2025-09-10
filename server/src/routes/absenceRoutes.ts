import { Router } from "express";
import {
  createAbsence,
  getUserAbsences,
  updateAbsence,
  deleteAbsence,
  getActiveAbsences,
  getCoachInbox,
  toggleProcessed,
  createAbsenceRequest,
  listCoachAbsenceRequests,
  decideAbsenceRequest,
  listMyAbsenceRequests,
} from "../controllers/absenceController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.post("/createAbsence", authenticateToken, createAbsence);
router.get("/getUserAbsence/:userId", authenticateToken, getUserAbsences);
router.put("/updateAbsence/:id", authenticateToken, updateAbsence);
router.delete("/deleteAbsence/:id", authenticateToken, deleteAbsence);
router.get("/getActiveAbsences", authenticateToken, getActiveAbsences);
// Coach Postfach
router.get("/inbox/coach", authenticateToken, getCoachInbox);
router.patch("/inbox/toggleProcessed/:id", authenticateToken, toggleProcessed);
// Requests
router.post("/request", authenticateToken, createAbsenceRequest);
router.get("/request/coach", authenticateToken, listCoachAbsenceRequests);
router.post("/request/decide/:id", authenticateToken, decideAbsenceRequest);
router.get("/request/me", authenticateToken, listMyAbsenceRequests);

export default router;
