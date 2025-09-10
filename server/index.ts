// index.ts
import app from "./src/app";
import dotenv from "dotenv";
import { startSurveyCoachCronJob, startSurveyCustomerCronJob, startDynamicSurveyCronJobs } from "./src/cronJobs/surveyScheduler";
import { checkMissedDailyChecks } from "./src/cronJobs/dailyCheckScheduler";
import { startVideoArchiveCron } from "./src/cronJobs/videoArchiveScheduler";

dotenv.config();

// ⏰ CronJob starten
startSurveyCustomerCronJob();
startSurveyCoachCronJob();
startVideoArchiveCron();

//Jeden Nacht um 0
checkMissedDailyChecks();

// 🆕 Dynamische Schedules aus DB
startDynamicSurveyCronJobs();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
