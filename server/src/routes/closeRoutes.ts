// src/routes/closeRoutes.ts

import express from "express";
import { handleLeadCreated, handleLeadUpdated } from "../controllers/closeController";

const router = express.Router();

router.post("/webhook/leadCreated", handleLeadCreated);
router.post("/webhook/leadUpdated", handleLeadUpdated);

export default router;
