import { Router } from "express";
import { archiveOldVideos } from "../services/coldStorageService";

const router = Router();

// POST /video-archive/run  → manuelles Anstoßen
router.post("/run", async (req, res) => {
  const days = Number(req.query.days || 5);
  try {
    const result = await archiveOldVideos(days);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

export default router;
