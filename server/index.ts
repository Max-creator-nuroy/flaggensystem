// index.ts
import app from "./src/app";
import dotenv from "dotenv";
import { startSurveyCoachCronJob, startSurveyCustomerCronJob } from "./src/cronJobs/surveyScheduler";

dotenv.config();

// ⏰ CronJob starten
startSurveyCustomerCronJob();
startSurveyCoachCronJob();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
