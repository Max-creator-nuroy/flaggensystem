import express from "express";
import { createVideo, deleteVideo, getVideoById, getVideosByUser, updateVideo } from "../controllers/VideoController";


const router = express.Router();

router.post("/create", createVideo);
router.get("/:id", getVideoById);
router.get("/user/:userId", getVideosByUser);
router.put("/:id", updateVideo);
router.delete("/:id", deleteVideo);

export default router;
