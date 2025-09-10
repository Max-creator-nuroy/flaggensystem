import { PrismaClient } from "@prisma/client";
import { subDays, addDays } from "date-fns";
import cron from "node-cron";

const prisma = new PrismaClient();

// Helper: UTC 00:00 for a given date
function toUTCStartOfDay(d: Date) {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
}
function formatDateUTC(d: Date) {
  return new Intl.DateTimeFormat("de-DE", { timeZone: "UTC" }).format(d);
}

export const checkMissedDailyChecks = async () => {
  // täglich um 19:41
  cron.schedule("19 20 * * *", async () => {
    const runId = Math.random().toString(36).slice(2, 7);
    console.log(`[${runId}] ⏰ Cron gestartet: DailyCheck-Überprüfung`);

    // Nur CUSTOMER prüfen, die älter als 3 Tage sind
    const todayUTC = toUTCStartOfDay(new Date());
    const threeDaysAgoUTC = subDays(todayUTC, 3);

    // Nur aktive Kunden (älter als 3 Tage)
    const users = await prisma.user.findMany({
      where: {
        isCustomer: true,
        isDeleted: false,
        createdAt: { lt: threeDaysAgoUTC },
      },
      select: {
        id: true,
        name: true,
        last_name: true,
        createdAt: true,
      },
    });

    const tomorrowUTC = addDays(todayUTC, 1);

    for (const user of users) {
      try {
        const accountStartUTC = toUTCStartOfDay(new Date(user.createdAt));
        if (todayUTC < accountStartUTC) {
          console.log(
            `[${runId}] ➖ Skip (vor Account-Start): ${user.name} ${user.last_name}`
          );
          continue;
        }

        // 1) Wurde heute ein DailyCheck erstellt? Wenn ja => nichts tun
        const todayDailyCheck = await prisma.dailyCheck.findFirst({
          where: {
            userId: user.id,
            createdAt: { gte: todayUTC, lt: tomorrowUTC },
          },
          select: { id: true },
        });
        if (todayDailyCheck) {
          console.log(
            `[${runId}] ✅ DailyCheck vorhanden: ${user.name} ${user.last_name} am ${formatDateUTC(todayUTC)}`
          );
          continue;
        }

        // 2) Kein DailyCheck heute => MissedCheck für heute (idempotent)
        let missedToday = await prisma.missedCheck.findFirst({
          where: {
            userId: user.id,
            date: { gte: todayUTC, lt: tomorrowUTC },
          },
        });
        if (!missedToday) {
          missedToday = await prisma.missedCheck.create({
            data: { userId: user.id, date: todayUTC, flagged: false },
          });
          console.log(
            `[${runId}] 📝 MissedCheck erstellt: ${user.name} ${user.last_name} am ${formatDateUTC(
              todayUTC
            )}`
          );
        } else {
          console.log(
            `[${runId}] ℹ️ MissedCheck existiert bereits: ${user.name} ${user.last_name} am ${formatDateUTC(
              todayUTC
            )}`
          );
        }

        // 3) Gibt es einen anderen unflagged MissedCheck? Wenn ja => beide flaggen + rote Flagge erzeugen
        const olderUnflagged = await prisma.missedCheck.findFirst({
          where: {
            userId: user.id,
            flagged: false,
            id: { not: missedToday.id },
            date: { lt: todayUTC },
          },
          orderBy: { date: "asc" },
        });

        if (olderUnflagged && !missedToday.flagged) {
          const d1 = toUTCStartOfDay(new Date(olderUnflagged.date));
          const d2 = todayUTC;
          const comment = `Kein DailyCheck am ${formatDateUTC(d1)} und ${formatDateUTC(d2)}`;

          await prisma.$transaction([
            prisma.flag.create({
              data: { userId: user.id, color: "RED", comment },
            }),
            prisma.missedCheck.update({
              where: { id: olderUnflagged.id },
              data: { flagged: true },
            }),
            prisma.missedCheck.update({
              where: { id: missedToday.id },
              data: { flagged: true },
            }),
          ]);

          console.log(
            `[${runId}] 🚩 Rote Flagge erstellt & MissedChecks geflaggt: ${user.name} ${user.last_name} (${comment})`
          );
        } else if (!olderUnflagged) {
          console.log(
            `[${runId}] ⏳ Kein älterer unflagged MissedCheck gefunden für: ${user.name} ${user.last_name}`
          );
        } else if (missedToday.flagged) {
          console.log(
            `[${runId}] 🔒 Heutiger MissedCheck bereits geflaggt: ${user.name} ${user.last_name}`
          );
        }
      } catch (err) {
        console.error(`[${runId}] ❌ Fehler bei User`, user.id, err);
      }
    }
  });
};
