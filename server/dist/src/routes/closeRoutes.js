"use strict";
// src/routes/closeRoutes.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const closeController_1 = require("../controllers/closeController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.post("/webhook/leadUpdated", closeController_1.handleLeadUpsert);
router.post("/getPipelinesFromClose", authMiddleware_1.authenticateToken, closeController_1.getPipelineFromClose);
exports.default = router;
