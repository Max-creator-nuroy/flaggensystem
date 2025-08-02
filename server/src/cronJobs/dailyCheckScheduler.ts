import { PrismaClient } from "@prisma/client";
import { startOfDay, subDays, isWithinInterval } from "date-fns";
import cron from "node-cron";

const prisma = new PrismaClient();

export const checkMissedDailyChecks = async () => {
  cron.schedule("0 0 * * *", async () => {
    console.log("⏰ Cron gestartet: DailyCheck-Überprüfung");

    const users = await prisma.user.findMany({
      include: {
        absences: true, // Absences werden direkt mitgeladen
      },
    });

    for (const user of users) {
      const checks = await prisma.dailyCheck.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: subDays(new Date(), 30) },
        },
        select: { createdAt: true },
      });

      const existingDates = checks.map((c) =>
        startOfDay(new Date(c.createdAt)).getTime()
      );

      for (let i = 0; i < 30; i++) {
        const date = startOfDay(subDays(new Date(), i));

        // Skip wenn User an dem Tag abwesend war
        const isAbsent = user.absences.some((absence) =>
          isWithinInterval(date, { start: absence.from, end: absence.to })
        );
        if (isAbsent) continue;

        // Prüfe ob dieser Tag schon als missedCheck geloggt ist
        if (!existingDates.includes(date.getTime())) {
          const alreadyLogged = await prisma.missedCheck.findFirst({
            where: { userId: user.id, date },
          });

          if (!alreadyLogged) {
            await prisma.missedCheck.create({
              data: { userId: user.id, date },
            });
          }
        }
      }

      // Jetzt: MissedChecks zählen, die noch nicht für Flags genutzt wurden
      const unflaggedMissed = await prisma.missedCheck.findMany({
        where: { userId: user.id, flagged: false },
        orderBy: { date: "asc" },
      });

      if (unflaggedMissed.length >= 2) {
        const missedDates = unflaggedMissed.slice(0, 2);

        await prisma.flag.create({
          data: {
            userId: user.id,
            color: "RED",
            comment: `Kein DailyCheck am ${missedDates
              .map((d) => d.date.toLocaleDateString("de-DE"))
              .join(", ")}`,
          },
        });

        // Markiere die verwendeten MissedChecks als "verwendet"
        for (const missed of missedDates) {
          await prisma.missedCheck.update({
            where: { id: missed.id },
            data: { flagged: true },
          });
        }
      }
    }
  });
};
