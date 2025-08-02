import { Router } from "express";
import {
  createAbsence,
  getUserAbsences,
  updateAbsence,
  deleteAbsence,
  getActiveAbsences,
} from "../controllers/absenceController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.post("/createAbsence", authenticateToken, createAbsence);
router.get("/getUserAbsence/:userId", authenticateToken, getUserAbsences);
router.put("/updateAbsence/:id", authenticateToken, updateAbsence);
router.delete("/deleteAbsence/:id", authenticateToken, deleteAbsence);
router.get("/getActiveAbsences", authenticateToken, getActiveAbsences);

export default router;
