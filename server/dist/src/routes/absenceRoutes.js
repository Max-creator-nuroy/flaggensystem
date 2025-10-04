"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const absenceController_1 = require("../controllers/absenceController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.post("/createAbsence", authMiddleware_1.authenticateToken, absenceController_1.createAbsence);
router.get("/getUserAbsence/:userId", authMiddleware_1.authenticateToken, absenceController_1.getUserAbsences);
router.put("/updateAbsence/:id", authMiddleware_1.authenticateToken, absenceController_1.updateAbsence);
router.delete("/deleteAbsence/:id", authMiddleware_1.authenticateToken, absenceController_1.deleteAbsence);
router.get("/getActiveAbsences", authMiddleware_1.authenticateToken, absenceController_1.getActiveAbsences);
// Coach Postfach
router.get("/inbox/coach", authMiddleware_1.authenticateToken, absenceController_1.getCoachInbox);
router.patch("/inbox/toggleProcessed/:id", authMiddleware_1.authenticateToken, absenceController_1.toggleProcessed);
// Requests
router.post("/request", authMiddleware_1.authenticateToken, absenceController_1.createAbsenceRequest);
router.get("/request/coach", authMiddleware_1.authenticateToken, absenceController_1.listCoachAbsenceRequests);
router.post("/request/decide/:id", authMiddleware_1.authenticateToken, absenceController_1.decideAbsenceRequest);
router.get("/request/me", authMiddleware_1.authenticateToken, absenceController_1.listMyAbsenceRequests);
exports.default = router;
