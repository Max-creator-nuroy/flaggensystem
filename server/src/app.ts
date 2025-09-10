import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import requirementRoutes from "./routes/requirementRoutes";
import questionRoutes from "./routes/questionRoutes";
import surveyRoutes from "./routes/surveyRoutes";
import dailyCheckRoutes from "./routes/dailyCheckRoutes";
import closeRoutes from "./routes/closeRoutes";
import phaseRoutes from "./routes/phaseRoutes";
import absenceRoutes from "./routes/absenceRoutes";
import flagRoutes from "./routes/flagRoutes";
import adminRoutes from "./routes/adminRoutes";
import videoArchiveRoutes from "./routes/videoArchiveRoutes";
import leadRoutes from "./routes/leadRoutes";

const app = express();
app.listen(3000, () => console.log("Server läuft auf 3000"));
app.use(express.json({ limit: '300mb' }));
app.use(express.urlencoded({ limit: '300mb', extended: true }));

app.use(cors());
app.use(express.json());

app.use("/dailyCheck", dailyCheckRoutes);
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/users", userRoutes);
app.use("/requirement", requirementRoutes);
app.use("/question", questionRoutes);
app.use("/surveys", surveyRoutes);
app.use("/phase", phaseRoutes);
app.use("/absence", absenceRoutes);
app.use("/close", closeRoutes);
app.use("/flags", flagRoutes);
app.use("/video-archive", videoArchiveRoutes);
app.use("/leads", leadRoutes);

app.get("/", (req, res) => {
  res.send("Server läuft!");
});
export default app;