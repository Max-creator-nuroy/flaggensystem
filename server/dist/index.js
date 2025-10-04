"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// index.ts
const app_1 = __importDefault(require("./src/app"));
const dotenv_1 = __importDefault(require("dotenv"));
const surveyScheduler_1 = require("./src/cronJobs/surveyScheduler");
const dailyCheckScheduler_1 = require("./src/cronJobs/dailyCheckScheduler");
const videoArchiveScheduler_1 = require("./src/cronJobs/videoArchiveScheduler");
dotenv_1.default.config();
// ⏰ CronJob starten
(0, surveyScheduler_1.startSurveyCustomerCronJob)();
(0, surveyScheduler_1.startSurveyCoachCronJob)();
(0, videoArchiveScheduler_1.startVideoArchiveCron)();
//Jeden Nacht um 0
(0, dailyCheckScheduler_1.checkMissedDailyChecks)();
// 🆕 Dynamische Schedules aus DB
(0, surveyScheduler_1.startDynamicSurveyCronJobs)();
const PORT = process.env.PORT || 3000;
app_1.default.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});
