"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const VideoController_1 = require("../controllers/VideoController");
const router = express_1.default.Router();
router.post("/create", VideoController_1.createVideo);
router.get("/:id", VideoController_1.getVideoById);
router.get("/user/:userId", VideoController_1.getVideosByUser);
router.put("/:id", VideoController_1.updateVideo);
router.delete("/:id", VideoController_1.deleteVideo);
exports.default = router;
