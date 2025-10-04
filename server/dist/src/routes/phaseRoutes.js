"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const phaseController_1 = require("../controllers/phaseController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Alle Phasen (Admin oder allgemein)
router.get("/getAllPhases", authMiddleware_1.authenticateToken, phaseController_1.getAllPhases);
// Alle Phasen eines Coaches
router.get("/getPhaseByCoach/:coachId", authMiddleware_1.authenticateToken, phaseController_1.getPhaseByCoach);
// Einzelne Phase
router.get("/getPhaseById/:id", authMiddleware_1.authenticateToken, phaseController_1.getPhaseById);
// Neue Phase anlegen für Coach
router.post("/createPhase/:coachId", authMiddleware_1.authenticateToken, phaseController_1.createPhase);
// Phase aktualisieren
router.put("/updatePhase/:id", authMiddleware_1.authenticateToken, phaseController_1.updatePhase);
// Phase soft löschen (isDeleted = true setzen)
router.patch("/deletePhase/:id", authMiddleware_1.authenticateToken, phaseController_1.deletePhase);
// Phase hard löschen (komplett aus DB)
router.delete("/:id", authMiddleware_1.authenticateToken, phaseController_1.deletePhase);
exports.default = router;
