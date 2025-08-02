import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient();

// GET /phases
export const getAllPhases = async (req: Request, res: Response) => {
  try {
    const phases = await prisma.phase.findMany({
      where: { isDeleted: false },
      orderBy: { order: "asc" },
      include: {
        coach: true,
        customers: true,
      },
    });

    res.json({ phases });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Fehler beim Abrufen der Phasen" });
  }
};

// GET /phases/:id
export const getPhaseById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const phase = await prisma.phase.findUnique({
      where: { id },
      include: {
        coach: true,
        customers: true,
      },
    });

    if (!phase) {
      return res.status(404).json({ error: "Phase nicht gefunden" });
    }

    res.json({ phase });
  } catch (error) {
    res.status(500).json({ error: "Fehler beim Abrufen der Phase" });
  }
};

// GET /phases/byCoach/:coachId
export const getPhaseByCoach = async (req: Request, res: Response) => {
  const { coachId } = req.params;

  try {
    const phases = await prisma.phase.findMany({
      where: {
        coachId,
        isDeleted: false,
      },
      orderBy: { order: "asc" },
      include: {
        customers: true,
      },
    });

    res.json({ phases });
  } catch (error) {
    console.error("Fehler beim Abrufen der Coach-Phasen:", error);
    res.status(500).json({ error: "Phasen konnten nicht geladen werden." });
  }
};

// POST /phases
export const createPhase = async (req: Request, res: Response) => {
    const { coachId } = req.params;
  const { name, } = req.body;

  if (!name || !coachId) {
    return res.status(400).json({ error: "Name, CoachId sind erforderlich." });
  }

  try {
    const newPhase = await prisma.phase.create({
      data: {
        name,
        coachId,
        isDeleted: false,
      },
    });

    res.status(201).json({ message: "Phase erstellt", phase: newPhase });
  } catch (error) {
    console.error("Fehler beim Erstellen der Phase:", error);
    res.status(500).json({ error: "Phase konnte nicht erstellt werden." });
  }
};

// PATCH /phases/:id
export const updatePhase = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    const updatedPhase = await prisma.phase.update({
      where: { id },
      data: {
        name,
      },
    });

    res.json({ message: "Phase aktualisiert", phase: updatedPhase });
  } catch (error) {
    console.error("Fehler beim Aktualisieren:", error);
    res.status(500).json({ error: "Fehler beim Aktualisieren der Phase" });
  }
};

// PATCH /phases/delete/:id
export const deletePhase = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const deletedPhase = await prisma.phase.update({
      where: { id },
      data: { isDeleted: true },
    });

    res.json({ message: "Phase gelöscht (soft delete)", phase: deletedPhase });
  } catch (error) {
    console.error("Fehler beim Löschen:", error);
    res.status(500).json({ error: "Phase konnte nicht gelöscht werden." });
  }
};
