import cron from "node-cron";
import { archiveOldVideos } from "../services/coldStorageService";

export function startVideoArchiveCron() {
  // Jeden Tag um 02:15
  cron.schedule("15 2 * * *", async () => {
    console.log("⏰ Cron gestartet: Video-Archivierung (älter als 5 Tage)");
    try {
      const res = await archiveOldVideos(5);
      console.log("✅ Archivierung fertig:", res);
    } catch (e) {
      console.error("❌ Archivierung fehlgeschlagen:", e);
    }
  });
}
