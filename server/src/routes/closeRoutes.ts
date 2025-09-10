// src/routes/closeRoutes.ts

import express from "express";
import { getPipelineFromClose, handleLeadUpsert } from "../controllers/closeController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/webhook/leadUpdated", handleLeadUpsert);

router.post("/getPipelinesFromClose", authenticateToken, getPipelineFromClose);

export default router;
