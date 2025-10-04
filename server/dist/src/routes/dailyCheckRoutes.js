"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dailyCheckController_1 = require("../controllers/dailyCheckController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
// Speicherort für Videos
const storage = multer_1.default.diskStorage({
    destination: "server/Videos", // Ordner muss existieren
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    },
});
const upload = (0, multer_1.default)({ storage });
router.post("/createDailyCheck/:userId", upload.single("video"), authMiddleware_1.authenticateToken, dailyCheckController_1.createDailyCheck);
router.get("/getDailyChecksByUser/:userId", authMiddleware_1.authenticateToken, dailyCheckController_1.getDailyChecksByUser);
router.get("/listWithViolations/:userId", authMiddleware_1.authenticateToken, dailyCheckController_1.listDailyChecksWithViolations);
router.get("/violations/:dailyCheckId", authMiddleware_1.authenticateToken, dailyCheckController_1.getDailyCheckViolations);
router.post("/video/request/:dailyCheckId", authMiddleware_1.authenticateToken, dailyCheckController_1.requestVideoDownload);
router.get("/video/download/:dailyCheckId", authMiddleware_1.authenticateToken, dailyCheckController_1.downloadDailyCheckVideo);
exports.default = router;
