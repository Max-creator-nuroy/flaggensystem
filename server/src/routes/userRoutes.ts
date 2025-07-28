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
} from "../controllers/userController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.get("/ping", (req, res) => res.send("pong"));

router.get(
  "/getCustomersByCoach/:coachId",
  authenticateToken,
  getCustomersByCoach
);
router.post("/createCoach", authenticateToken, createCoach);
router.post("/createUser/:coachId", authenticateToken, createUser);
router.post("/getCountUserFlags/:id", authenticateToken, countUserFlags);
router.get("/getCoachByUser/:userId", authenticateToken, getCoachByUser);
router.get("/getUser/:userId", authenticateToken, getUser);
router.get("/getAllCoaches", authenticateToken, getAllCoaches);
router.get("/getAllCustomer", authenticateToken, getAllCustomers);

router.get("/:id", authenticateToken, getUser);
router.put("/:id", authenticateToken, updateUser);

export default router;
