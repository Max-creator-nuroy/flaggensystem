import { Request, response, Response } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// ✅ Create Question
export const createQuestion = async (req: Request, res: Response) => {
  const { text, isRating } = req.body;
  const coachId = req.params.coachId;

  if (!text || !coachId) {
    return res.status(400).json({ error: "Text und Coach ID erforderlich" });
  }

  try {
    const question = await prisma.question.create({
      data: {
        text,
        isRating,
        createdByCoachId: coachId,
      },
    });

    res.status(201).json(question);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fehler beim Erstellen der Frage" });
  }
};

export const createAdminQuestion = async (req: Request, res: Response) => {
  const { text, isRating } = req.body;
  try {
    const question = await prisma.question.create({
      data: {
        text,
        isRating,
        createdByCoachId: null, // ← signalisiert: Admin-Frage
      },
    });

    res.status(201).json(question);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fehler beim Erstellen der Frage" });
  }
};

// ⚙️ Helper (nicht als Route direkt) zum Erstellen temporärer Fragen für einen einmaligen Survey Broadcast
export const createTemporaryQuestions = async (
  questions: { text: string; isRating: boolean; createdByCoachId?: string | null }[],
  createdByCoachId?: string | null
) => {
  if (!questions.length) return [];
  const created = await prisma.$transaction(
    questions.map((q) =>
      prisma.question.create({
        data: {
          text: q.text,
          isRating: q.isRating,
          createdByCoachId: createdByCoachId ?? q.createdByCoachId ?? null,
          // isTemporary: true, // ← Feld nach Migration aktivieren
        },
      })
    )
  );
  return created;
};

// ✅ Get All Questions
export const getQuestions = async (_req: Request, res: Response) => {
  try {
    const questions = await prisma.question.findMany();
    res.status(200).json(questions);
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Abrufen der Fragen" });
  }
};

// ✅ Get Questions by Coach
export const getQuestionsByCoach = async (req: Request, res: Response) => {
  const coachId = req.params.coachId;

  try {
    const questions = await prisma.question.findMany({
      where: { createdByCoachId: coachId },
    });
    res.status(200).json(questions);
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Abrufen der Coach-Fragen" });
  }
};

// ✅ Get Questions by Coach
export const getQuestionsByAdmin = async (req: Request, res: Response) => {
  try {
    const questions = await prisma.question.findMany({
      where: { createdByCoachId: null },
    });
    res.status(200).json(questions);
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Abrufen der Coach-Fragen" });
  }
};

export const deleteQuestion = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const question = await prisma.question.findUnique({
      where: { id },
    });

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    let isDeleted = true;
    if (question.isDeleted) isDeleted = false;

    const updated = await prisma.question.update({
      where: { id },
      data: {
        isDeleted: isDeleted,
      },
    });

    return res
      .status(200)
      .json({ message: "Question soft-deleted", question: updated });
  } catch (error) {
    console.error("Fehler beim Soft-Delete der Question:", error);
    return res
      .status(500)
      .json({ message: "Serverfehler beim Löschen der Frage" });
  }
};
