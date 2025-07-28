import { Router } from "express";
import { login, register } from "../controllers/authController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);

router.get("/protected", authenticateToken, (req, res) => {
  res.json({ message: "Nur für eingeloggte User", user: (req as any).user });
});

export default router;
