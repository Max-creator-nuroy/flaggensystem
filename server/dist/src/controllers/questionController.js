"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteQuestion = exports.getQuestionsByAdmin = exports.getQuestionsByCoach = exports.getQuestions = exports.createTemporaryQuestions = exports.createAdminQuestion = exports.createQuestion = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// ✅ Create Question
const createQuestion = async (req, res) => {
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
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Fehler beim Erstellen der Frage" });
    }
};
exports.createQuestion = createQuestion;
const createAdminQuestion = async (req, res) => {
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
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Fehler beim Erstellen der Frage" });
    }
};
exports.createAdminQuestion = createAdminQuestion;
// ⚙️ Helper (nicht als Route direkt) zum Erstellen temporärer Fragen für einen einmaligen Survey Broadcast
const createTemporaryQuestions = async (questions, createdByCoachId) => {
    if (!questions.length)
        return [];
    const created = await prisma.$transaction(questions.map((q) => prisma.question.create({
        data: {
            text: q.text,
            isRating: q.isRating,
            createdByCoachId: createdByCoachId ?? q.createdByCoachId ?? null,
            // isTemporary: true, // ← Feld nach Migration aktivieren
        },
    })));
    return created;
};
exports.createTemporaryQuestions = createTemporaryQuestions;
// ✅ Get All Questions
const getQuestions = async (_req, res) => {
    try {
        const questions = await prisma.question.findMany();
        res.status(200).json(questions);
    }
    catch (err) {
        res.status(500).json({ error: "Fehler beim Abrufen der Fragen" });
    }
};
exports.getQuestions = getQuestions;
// ✅ Get Questions by Coach
const getQuestionsByCoach = async (req, res) => {
    const coachId = req.params.coachId;
    try {
        const questions = await prisma.question.findMany({
            where: { createdByCoachId: coachId },
        });
        res.status(200).json(questions);
    }
    catch (err) {
        res.status(500).json({ error: "Fehler beim Abrufen der Coach-Fragen" });
    }
};
exports.getQuestionsByCoach = getQuestionsByCoach;
// ✅ Get Questions by Coach
const getQuestionsByAdmin = async (req, res) => {
    try {
        const questions = await prisma.question.findMany({
            where: { createdByCoachId: null },
        });
        res.status(200).json(questions);
    }
    catch (err) {
        res.status(500).json({ error: "Fehler beim Abrufen der Coach-Fragen" });
    }
};
exports.getQuestionsByAdmin = getQuestionsByAdmin;
const deleteQuestion = async (req, res) => {
    const { id } = req.params;
    try {
        const question = await prisma.question.findUnique({
            where: { id },
        });
        if (!question) {
            return res.status(404).json({ message: "Question not found" });
        }
        let isDeleted = true;
        if (question.isDeleted)
            isDeleted = false;
        const updated = await prisma.question.update({
            where: { id },
            data: {
                isDeleted: isDeleted,
            },
        });
        return res
            .status(200)
            .json({ message: "Question soft-deleted", question: updated });
    }
    catch (error) {
        console.error("Fehler beim Soft-Delete der Question:", error);
        return res
            .status(500)
            .json({ message: "Serverfehler beim Löschen der Frage" });
    }
};
exports.deleteQuestion = deleteQuestion;
