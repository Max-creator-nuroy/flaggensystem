"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startVideoArchiveCron = startVideoArchiveCron;
const node_cron_1 = __importDefault(require("node-cron"));
const coldStorageService_1 = require("../services/coldStorageService");
function startVideoArchiveCron() {
    // Jeden Tag um 02:15
    node_cron_1.default.schedule("15 2 * * *", async () => {
        console.log("⏰ Cron gestartet: Video-Archivierung (älter als 5 Tage)");
        try {
            const res = await (0, coldStorageService_1.archiveOldVideos)(5);
            console.log("✅ Archivierung fertig:", res);
        }
        catch (e) {
            console.error("❌ Archivierung fehlgeschlagen:", e);
        }
    });
}
