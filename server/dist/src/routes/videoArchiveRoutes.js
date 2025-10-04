"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const coldStorageService_1 = require("../services/coldStorageService");
const router = (0, express_1.Router)();
// POST /video-archive/run  → manuelles Anstoßen
router.post("/run", async (req, res) => {
    const days = Number(req.query.days || 5);
    try {
        const result = await (0, coldStorageService_1.archiveOldVideos)(days);
        res.json(result);
    }
    catch (e) {
        res.status(500).json({ error: e?.message || String(e) });
    }
});
exports.default = router;
