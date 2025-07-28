import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import requirementRoutes from "./routes/requirementRoutes";
import questionRoutes from "./routes/questionRoutes";
import surveyRoutes from "./routes/surveyRoutes";
import dailyCheckRoutes from "./routes/dailyCheckRoutes";
import closeRoutes from "./routes/closeRoutes";

const app = express();
app.listen(3000, () => console.log("Server läuft auf 3000"));
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

app.use(cors());
app.use(express.json());

app.use("/dailyCheck", dailyCheckRoutes);
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/requirement", requirementRoutes);
app.use("/question", questionRoutes);
app.use("/surveys", surveyRoutes);
app.use("/close", closeRoutes);

app.get("/", (req, res) => {
  res.send("Server läuft!");
});
export default app;