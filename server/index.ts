// index.ts
import app from "./src/app";
import dotenv from "dotenv";
import { startSurveyCoachCronJob, startSurveyCustomerCronJob } from "./src/cronJobs/surveyScheduler";
import { checkMissedDailyChecks } from "./src/cronJobs/dailyCheckScheduler";

dotenv.config();

// ⏰ CronJob starten
startSurveyCustomerCronJob();
startSurveyCoachCronJob();

//Jeden Nacht um 0
checkMissedDailyChecks();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
