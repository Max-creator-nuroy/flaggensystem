"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const journalController_1 = require("../controllers/journalController");
const router = (0, express_1.Router)();
router.get("/ping", (req, res) => res.send("pong"));
router.get("/getCustomersByCoach/:coachId", authMiddleware_1.authenticateToken, userController_1.getCustomersByCoach);
router.post("/createCoach", authMiddleware_1.authenticateToken, userController_1.createCoach);
router.post("/createUser/:coachId", authMiddleware_1.authenticateToken, userController_1.createUser);
router.patch("/updateEmail/:id", authMiddleware_1.authenticateToken, userController_1.updateEmail);
router.patch("/changePassword/:id", authMiddleware_1.authenticateToken, userController_1.changePassword);
router.post("/getCountUserFlags/:id", authMiddleware_1.authenticateToken, userController_1.countUserFlags);
router.get("/getCoachByUser/:userId", authMiddleware_1.authenticateToken, userController_1.getCoachByUser);
router.get("/getUser/:userId", authMiddleware_1.authenticateToken, userController_1.getUser);
router.get("/getAllCoaches", authMiddleware_1.authenticateToken, userController_1.getAllCoaches);
router.get("/getAllCustomer", authMiddleware_1.authenticateToken, userController_1.getAllCustomers);
// Admin: Coach deaktivieren/aktivieren
router.patch("/disableCoach/:id", authMiddleware_1.authenticateToken, userController_1.disableCoach);
router.patch("/enableCoach/:id", authMiddleware_1.authenticateToken, userController_1.enableCoach);
// Admin: Customer deaktivieren/aktivieren
router.patch("/disableCustomer/:id", authMiddleware_1.authenticateToken, userController_1.disableCustomer);
router.patch("/enableCustomer/:id", authMiddleware_1.authenticateToken, userController_1.enableCustomer);
router.get("/:id", authMiddleware_1.authenticateToken, userController_1.getUser);
router.patch("/updateUser/:id", authMiddleware_1.authenticateToken, userController_1.updateUser);
// Journal (Coach only)
router.post("/journal/:customerId", authMiddleware_1.authenticateToken, journalController_1.createJournalEntry);
router.get("/journal/:customerId", authMiddleware_1.authenticateToken, journalController_1.listJournalEntries);
router.patch("/journal/entry/:id", authMiddleware_1.authenticateToken, journalController_1.updateJournalEntry);
router.delete("/journal/entry/:id", authMiddleware_1.authenticateToken, journalController_1.deleteJournalEntry);
exports.default = router;
