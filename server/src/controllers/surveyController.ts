import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { createTemporaryQuestions } from "./questionController";

const prisma = new PrismaClient();

// ✅ 1. Survey erstellen
export const createSurvey = async (req: Request, res: Response) => {
  const { userId, comment, rating, questions } = req.body;

  try {
    const survey = await prisma.survey.create({
      data: {
        userId,
        comment,
        rating,
        questions: {
          create: questions.map(
            (q: { questionId: string; rating?: number; answer: string }) => ({
              questionId: q.questionId,
              rating: q.rating,
              answer: q.answer,
            })
          ),
        },
      },
      include: { questions: true },
    });

    res.status(201).json(survey);
  } catch (error) {
    console.error("Survey erstellen fehlgeschlagen:", error);
    res.status(500).json({ error: "Fehler beim Erstellen der Umfrage" });
  }
};

// ✅ 2. Alle Surveys eines Users holen
export const getSurveysByUser = async (req: Request, res: Response) => {
  const userId = req.params.userId;

  try {
    const surveys = await prisma.survey.findMany({
      where: { userId },
      include: { questions: { include: { question: true } } },
    });

    res.status(200).json(surveys);
  } catch (error) {
    console.error("Fehler beim Abrufen:", error);
    res.status(500).json({ error: "Fehler beim Abrufen der Umfragen" });
  }
};

export const getCurrentSurvey = async (req: Request, res: Response) => {
  const userId = req.params.userId;

  try {
    // Hole die allerneueste Umfrage des Users, egal ob beantwortet oder nicht
    const latestSurvey = await prisma.survey.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        questions: {
          include: {
            question: true,
          },
        },
      },
    });

    if (!latestSurvey) {
      return res.status(404).json({ error: "Keine Umfrage gefunden." });
    }

    // Wenn die letzte Umfrage schon beantwortet wurde, gib nichts zurück
    if (latestSurvey.submittedAt !== null) {
      return res.status(404).json({ error: "Keine offene Umfrage gefunden." });
    }

    // Sonst gib die offene Umfrage zurück
    res.json(latestSurvey);
  } catch (error) {
    console.error("Fehler beim Laden der aktuellen Umfrage:", error);
    res.status(500).json({ error: "Interner Serverfehler" });
  }
};

// ✅ 3. Einzelne Survey mit Fragen holen
export const getSurveyById = async (req: Request, res: Response) => {
  const { surveyId } = req.params;

  try {
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        questions: {
          include: { question: true },
        },
      },
    });

    if (!survey)
      return res.status(404).json({ error: "Survey nicht gefunden" });

    res.status(200).json(survey);
  } catch (error) {
    console.error("Fehler beim Abrufen:", error);
    res.status(500).json({ error: "Fehler beim Abrufen der Umfrage" });
  }
};

// ✅ 4. Survey löschen
export const deleteSurvey = async (req: Request, res: Response) => {
  const { surveyId } = req.params;

  try {
    await prisma.survey.delete({
      where: { id: surveyId },
    });

    res.status(200).json({ message: "Survey gelöscht" });
  } catch (error) {
    console.error("Fehler beim Löschen:", error);
    res.status(500).json({ error: "Fehler beim Löschen der Umfrage" });
  }
};

// POST /createSurveyForUser/:userId
export const createSurveyForUser = async (req: Request, res: Response) => {
  // 1. Fragen des Coaches holen
  const { userId } = req.params;

  const coach = await prisma.coachCustomer.findFirst({
    where: {
      customerId: userId,
    },
    include: {
      coach: true, // lädt den Coach mit
    },
  });

  const coachId = coach?.id;
  if (!coachId) throw new Error("User hat keinen Coach");

  const questions = await prisma.question.findMany({
    where: { createdByCoachId: coachId },
  });

  // 2. Survey + SurveyQuestion anlegen
  const survey = await prisma.survey.create({
    data: {
      userId,
      questions: {
        create: questions.map((q) => ({
          questionId: q.id,
          answer: "", // Noch leer
          rating: null,
        })),
      },
    },
    include: { questions: { include: { question: true } } },
  });

  return survey;
};

// PATCH
export const submitSurveyAnswers = async (req: Request, res: Response) => {
  const surveyId = req.params.surveyId;
  const questions = req.body.answers;

  try {
    // Optional: check ob der Survey zur User gehört → Sicherheit
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: { questions: true },
    });

    if (!survey) {
      return res.status(404).json({ message: "Survey nicht gefunden" });
    }

    // Update jede einzelne SurveyQuestion
    const updates = await Promise.all(
      questions.map((q: any) =>
        prisma.surveyQuestion.update({
          where: { id: q.id },
          data: {
            answer: q.answer,
            rating: q.rating,
          },
        })
      )
    );

    // Jetzt das Survey selbst updaten → submittedAt setzen
    await prisma.survey.update({
      where: { id: surveyId },
      data: {
        submittedAt: new Date(), // Zeitstempel auf jetzt
      },
    });

    return res.json({ message: "Antworten gespeichert", updates });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Fehler beim Speichern" });
  }
};

// GET /survey/getSurveyByAdmin
export const getSurveyByAdmin = async (req: Request, res: Response) => {
  try {
    const surveys = await prisma.survey.findMany({
      where: {
        user: {
          role: "COACH",
        },
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // letzte 7 Tage
        },
      },
      include: {
        user: {
          select: {
            name: true,
            last_name: true,
            email: true,
          },
        },
        questions: {
          include: {
            question: {
              select: {
                id: true,
                text: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(surveys);
  } catch (error) {
    console.error("Fehler beim Laden der Coach-Surveys:", error);
    res.status(500).json({ error: "Fehler beim Laden der Coach-Surveys" });
  }
};

// GET /survey/byCoach
export const getCustomerSurveyByCoach = async (req: Request, res: Response) => {
  try {
    const coachId = req.params.coachId;

    // 1. Finde alle Customer-IDs, die zu diesem Coach gehören
    const linkedCustomers = await prisma.coachCustomer.findMany({
      where: { coachId },
      select: { customerId: true },
    });

    const customerIds = linkedCustomers
      .map((link) => link.customerId)
      .filter((id): id is string => id !== null);

    if (customerIds.length === 0) {
      return res.status(200).json([]); // keine Kunden → leere Liste
    }

    // 2. Hole alle Surveys dieser Kunden inkl. Fragen & Antworten
    const surveys = await prisma.survey.findMany({
      where: {
        userId: { in: customerIds },
      },
      include: {
        user: true, // optional: Name des Users
        questions: {
          include: {
            question: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json(surveys);
  } catch (error) {
    console.error("Fehler bei getSurveyByCoach:", error);
    res.status(500).json({ error: "Interner Serverfehler" });
  }
};

//GET /surveys/getSurveyCompletionRateForCustomers
export const getSurveyCompletionRateForCustomers = async (
  req: Request,
  res: Response
) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Alle Kunden mit ihren Surveys der letzten 7 Tage holen
    const customersWithSurveys = await prisma.user.findMany({
      where: {
        role: "CUSTOMER",
      },
      select: {
        id: true,
        surveys: {
          where: {
            createdAt: {
              gte: sevenDaysAgo,
            },
          },
        },
      },
    });

    // Für jeden Kunden die Completion Rate berechnen
    let totalSurveys = 0;
    let totalSubmitted = 0;

    for (const customer of customersWithSurveys) {
      const surveys = customer.surveys;
      totalSurveys += surveys.length;
      totalSubmitted += surveys.filter((s) => s.submittedAt).length;
    }

    if (totalSurveys === 0) return 0;

    const completionRate = (totalSubmitted / totalSurveys) * 100;
    res.status(200).json(completionRate);
  } catch (error) {
    console.error("Fehler bei getSurveyByCoach:", error);
    res.status(500).json({ error: "Interner Serverfehler" });
  }
};

export const getSurveyCompletionRateForCoaches = async (
  req: Request,
  res: Response
) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Alle Coaches mit ihren Surveys der letzten 7 Tage holen
    const coachesWithSurveys = await prisma.user.findMany({
      where: {
        role: "COACH",
      },
      select: {
        id: true,
        surveys: {
          where: {
            createdAt: {
              gte: sevenDaysAgo,
            },
          },
          select: {
            submittedAt: true,
          },
        },
      },
    });

    let totalSurveys = 0;
    let totalSubmitted = 0;

    for (const coach of coachesWithSurveys) {
      const surveys = coach.surveys;
      totalSurveys += surveys.length;
      totalSubmitted += surveys.filter((s) => s.submittedAt).length;
    }

    if (totalSurveys === 0) return res.status(200).json(0);

    const completionRate = (totalSubmitted / totalSurveys) * 100;
    res.status(200).json(completionRate);
  } catch (error) {
    console.error("Fehler bei getSurveyCompletionRateForCoaches:", error);
    res.status(500).json({ error: "Interner Serverfehler" });
  }
};

//GET /surveys/getSurveyCompletionRateForCustomers
export const getSurveyCompletionRateForCustomersByCoach = async (
  req: Request,
  res: Response
) => {
  try {
    const coachId = req.params.id;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Alle Kunden mit ihren Surveys der letzten 7 Tage holen
    const customersWithSurveys = await prisma.user.findMany({
      where: {
        role: "CUSTOMER",
        coachLinks: {
          some: {
            coachId: coachId, // ← Nur Kunden dieses Coaches
          },
        },
      },
      select: {
        id: true,
        surveys: {
          where: {
            createdAt: {
              gte: sevenDaysAgo,
            },
          },
        },
      },
    });

    // Für jeden Kunden die Completion Rate berechnen
    let totalSurveys = 0;
    let totalSubmitted = 0;

    for (const customer of customersWithSurveys) {
      const surveys = customer.surveys;
      totalSurveys += surveys.length;
      totalSubmitted += surveys.filter((s) => s.submittedAt).length;
    }

    if (totalSurveys === 0) return 0;

    const completionRate = (totalSubmitted / totalSurveys) * 100;
    res.status(200).json(completionRate);
  } catch (error) {
    console.error("Fehler bei getSurveyByCoach:", error);
    res.status(500).json({ error: "Interner Serverfehler" });
  }
};

// POST /surveys/broadcastCustomSurvey
// Body: { targetRole: 'COACH' | 'CUSTOMER', questions: [{text,isRating}], comment?: string }
export const broadcastCustomSurvey = async (req: Request, res: Response) => {
  const { targetRole, questions, comment } = req.body;
  if (!targetRole || !Array.isArray(questions) || questions.length === 0) {
    return res
      .status(400)
      .json({ error: "targetRole und mindestens eine Frage erforderlich" });
  }
  if (!["COACH", "CUSTOMER"].includes(targetRole)) {
    return res.status(400).json({ error: "Ungültige targetRole" });
  }

  try {
    // 1. Temporäre Fragen erstellen (optional: könnte auch vorhandene nehmen)
    const createdQuestions = await createTemporaryQuestions(
      questions.map((q: any) => ({ text: q.text, isRating: !!q.isRating }))
    );

    // 2. Ziel-User laden
    const users = await prisma.user.findMany({ where: { role: targetRole } });
    if (!users.length) {
      return res.status(200).json({ message: "Keine Ziel-User gefunden", count: 0 });
    }

    // 3. Surveys batch anlegen
    await prisma.$transaction(
      users.map((u) =>
        prisma.survey.create({
          data: {
            userId: u.id,
            comment: comment ?? null,
            questions: {
              create: createdQuestions.map((q) => ({
                questionId: q.id,
                answer: "",
                rating: null,
              })),
            },
          },
        })
      )
    );

    res.status(201).json({
      message: "Broadcast Survey erstellt",
      questionCount: createdQuestions.length,
      userCount: users.length,
    });
  } catch (error) {
    console.error("Fehler beim Broadcast Survey:", error);
    res.status(500).json({ error: "Fehler beim Broadcast" });
  }
};
