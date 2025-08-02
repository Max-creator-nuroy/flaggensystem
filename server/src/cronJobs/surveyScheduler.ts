import { PrismaClient } from "@prisma/client";
import cron from "node-cron";

const prisma = new PrismaClient();

export const startSurveyCoachCronJob = () => {
  // Jeden Sonntag um 8:00 Uhr für die Coaches
  cron.schedule("10 14 * * 3", async () => {
    const allCoaches = await prisma.user.findMany({ where: { role: "COACH" } });

    const questions = await prisma.question.findMany({
      where: { createdByCoachId: null }, // nur Admin-Fragen
    });

    for (const coach of allCoaches) {
      const survey = await prisma.survey.create({
        data: {
          userId: coach.id,
          questions: {
            create: questions.map((q) => ({
              questionId: q.id,
              answer: "", // leer, bis Coach ausfüllt
            })),
          },
        },
      });

      console.log(`Survey für Coach ${coach.email} erstellt`);
    }
  });
};

export const startSurveyCustomerCronJob = () => {
  // Jeden Sonntag um 8:00 Uhr für die CUSTOMER
  cron.schedule("35 20 * * 4", async () => {
    console.log("⏰ Cron gestartet: Weekly Surveys");

    const customers = await prisma.user.findMany({
      where: { role: "CUSTOMER" },
      include: {
        coachLinks: {
          include: {
            coach: {
              include: {
                questions: true,
              },
            },
          },
        },
      },
    });

    for (const customer of customers) {
      for (const coachLink of customer.coachLinks) {
        const coach = coachLink.coach;
        if (!coach || coach.questions.length === 0) continue;

        // Optional: Prüfen, ob bereits ein Survey in letzter Zeit existiert
        const recentSurvey = await prisma.survey.findFirst({
          where: {
            userId: customer.id,
            createdAt: {
              gte: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // letzte 6 Tage
            },
            questions: {
              some: {
                question: {
                  createdByCoachId: coach.id,
                },
              },
            },
          },
        });

        if (recentSurvey) {
          console.log(
            `⏭️  Survey für ${customer.email} von Coach ${coach.name} existiert bereits.`
          );
          continue;
        }

        await prisma.survey.create({
          data: {
            userId: customer.id,
            questions: {
              create: coach.questions.map((q) => ({
                questionId: q.id,
                answer: "",
              })),
            },
          },
        });

        console.log(
          `✅ Survey erstellt für ${customer.email} → Coach: ${coach.name}`
        );
      }
    }

    console.log("🏁 Cron abgeschlossen.");
  });
};
