"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const flagController_1 = require("../controllers/flagController");
const router = (0, express_1.Router)();
router.post("/createManuelFlag/:userId", authMiddleware_1.authenticateToken, flagController_1.createManuelFlag);
router.delete("/deleteCascade/:id", authMiddleware_1.authenticateToken, flagController_1.deleteFlagCascade);
exports.default = router;
