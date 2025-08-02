import express from "express";
import {
  createPhase,
  deletePhase,
  getAllPhases,
  getPhaseById,
  updatePhase,
  getPhaseByCoach
} from "../controllers/phaseController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = express.Router();

// Alle Phasen (Admin oder allgemein)
router.get("/getAllPhases", authenticateToken, getAllPhases);

// Alle Phasen eines Coaches
router.get("/getPhaseByCoach/:coachId", authenticateToken, getPhaseByCoach);

// Einzelne Phase
router.get("/getPhaseById/:id", authenticateToken, getPhaseById);

// Neue Phase anlegen für Coach
router.post("/createPhase/:coachId", authenticateToken, createPhase);

// Phase aktualisieren
router.put("/updatePhase/:id", authenticateToken, updatePhase);

// Phase soft löschen (isDeleted = true setzen)
router.patch("/deletePhase/:id", authenticateToken, deletePhase);

// Phase hard löschen (komplett aus DB)
router.delete("/:id", authenticateToken, deletePhase);

export default router;
