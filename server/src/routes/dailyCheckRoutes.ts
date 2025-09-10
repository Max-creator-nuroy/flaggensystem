import { Router } from "express";
import { createDailyCheck, getDailyChecksByUser, listDailyChecksWithViolations, getDailyCheckViolations, requestVideoDownload, downloadDailyCheckVideo } from "../controllers/dailyCheckController";
import { authenticateToken } from "../middleware/authMiddleware";
import multer from "multer";

const router = Router();

// Speicherort für Videos
const storage = multer.diskStorage({
  destination: "server/Videos", // Ordner muss existieren
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });


router.post(
  "/createDailyCheck/:userId",
  upload.single("video"),
  authenticateToken,
  createDailyCheck
);

router.get("/getDailyChecksByUser/:userId", authenticateToken,getDailyChecksByUser)
router.get("/listWithViolations/:userId", authenticateToken, listDailyChecksWithViolations)
router.get("/violations/:dailyCheckId", authenticateToken, getDailyCheckViolations)
router.post("/video/request/:dailyCheckId", authenticateToken, requestVideoDownload)
router.get("/video/download/:dailyCheckId", authenticateToken, downloadDailyCheckVideo)

export default router;
