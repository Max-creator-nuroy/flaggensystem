import { Router } from "express";
import {
  getUser,
  updateUser,
  getCustomersByCoach,
  createCoach,
  createUser,
  countUserFlags,
  getCoachByUser,
  getAllCoaches,
  getAllCustomers,
  updateEmail,
  changePassword,
  disableCoach,
  enableCoach,
  disableCustomer,
  enableCustomer,
} from "../controllers/userController";
import { authenticateToken } from "../middleware/authMiddleware";
import { createJournalEntry, listJournalEntries, updateJournalEntry, deleteJournalEntry } from "../controllers/journalController";

const router = Router();

router.get("/ping", (req, res) => res.send("pong"));

router.get(
  "/getCustomersByCoach/:coachId",
  authenticateToken,
  getCustomersByCoach
);
router.post("/createCoach", authenticateToken, createCoach);
router.post("/createUser/:coachId", authenticateToken, createUser);
router.patch("/updateEmail/:id", authenticateToken, updateEmail);
router.patch("/changePassword/:id", authenticateToken, changePassword);
router.post("/getCountUserFlags/:id", authenticateToken, countUserFlags);
router.get("/getCoachByUser/:userId", authenticateToken, getCoachByUser);
router.get("/getUser/:userId", authenticateToken, getUser);
router.get("/getAllCoaches", authenticateToken, getAllCoaches);
router.get("/getAllCustomer", authenticateToken, getAllCustomers);

// Admin: Coach deaktivieren/aktivieren
router.patch("/disableCoach/:id", authenticateToken, disableCoach);
router.patch("/enableCoach/:id", authenticateToken, enableCoach);

// Admin: Customer deaktivieren/aktivieren
router.patch("/disableCustomer/:id", authenticateToken, disableCustomer);
router.patch("/enableCustomer/:id", authenticateToken, enableCustomer);

router.get("/:id", authenticateToken, getUser);
router.patch("/updateUser/:id", authenticateToken, updateUser);

// Journal (Coach only)
router.post("/journal/:customerId", authenticateToken, createJournalEntry);
router.get("/journal/:customerId", authenticateToken, listJournalEntries);
router.patch("/journal/entry/:id", authenticateToken, updateJournalEntry);
router.delete("/journal/entry/:id", authenticateToken, deleteJournalEntry);

export default router;
