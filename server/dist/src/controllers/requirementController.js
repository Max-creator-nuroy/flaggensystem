"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRequirement = exports.createRequirement = exports.getRequirementByCoach = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// GET /getRequirementByCoach/:CoachId
const getRequirementByCoach = async (req, res) => {
    const coachId = req.params.coachId;
    try {
        const requirements = await prisma.requirement.findMany({
            where: { coachId: coachId, isDeleted: false },
        });
        res.json({ requirement: requirements });
    }
    catch (error) {
        res.status(500).json({ error: "Fehler beim laden der Kriterien" });
    }
};
exports.getRequirementByCoach = getRequirementByCoach;
// POST /createReqiurement/:coachId
const createRequirement = async (req, res) => {
    try {
        const coachId = req.params.coachId;
        const { title, description } = req.body;
        const newRequirement = await prisma.requirement.create({
            data: {
                coachId,
                title,
                description,
            },
        });
        return res.status(201).json({
            message: "Kriterium wurde erfolgreich erstellt",
            requirement: newRequirement,
        });
    }
    catch (error) {
        console.error("Fehler beim Erstellen:", error);
        res.status(500).json({ message: "Fehler beim Erstellen des Kriteriums" });
    }
};
exports.createRequirement = createRequirement;
// DELETE
const deleteRequirement = async (req, res) => {
    const { id } = req.params;
    try {
        // Prüfen, ob das Requirement existiert
        const requirement = await prisma.requirement.findUnique({
            where: { id },
        });
        if (!requirement) {
            return res.status(404).json({ message: "Requirement not found" });
        }
        let isDeleted = true;
        if (requirement.isDeleted)
            isDeleted = false;
        // Soft Delete durchführen
        const updated = await prisma.requirement.update({
            where: { id },
            data: {
                isDeleted: isDeleted,
            },
        });
        return res
            .status(200)
            .json({ message: "Requirement soft-deleted", requirement: updated });
    }
    catch (error) {
        console.error("Fehler beim Soft-Delete des Requirements:", error);
        return res
            .status(500)
            .json({ message: "Serverfehler beim Löschen des Requirements" });
    }
};
exports.deleteRequirement = deleteRequirement;
