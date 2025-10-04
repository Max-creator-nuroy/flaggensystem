"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.post("/register", authController_1.register);
router.post("/login", authController_1.login);
router.post("/forgot-password", authController_1.forgotPassword);
router.post("/reset-password", authController_1.resetPassword);
router.get("/protected", authMiddleware_1.authenticateToken, (req, res) => {
    res.json({ message: "Nur für eingeloggte User", user: req.user });
});
exports.default = router;
