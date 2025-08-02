import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient();

// Neue Abwesenheit erstellen
export const createAbsence = async (req: Request, res: Response) => {
  const { userId, type, from, to, note } = req.body;

  if (!userId || !type || !from || !to) {
    return res.status(400).json({ message: "Pflichtfelder fehlen." });
  }

  try {
    const absence = await prisma.absence.create({
      data: {
        userId,
        type,
        from: new Date(from),
        to: new Date(to),
        note,
      },
    });
    res.status(201).json({ message: "Abwesenheit erstellt", absence });
  } catch (error) {
    res.status(500).json({ message: "Fehler beim Erstellen", error });
  }
};

// Abwesenheiten eines Users abrufen
export const getUserAbsences = async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const absences = await prisma.absence.findMany({
      where: { userId },
      orderBy: { from: "desc" },
    });
    res.json(absences);
  } catch (error) {
    res.status(500).json({ message: "Fehler beim Abrufen", error });
  }
};

// Abwesenheit aktualisieren
export const updateAbsence = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { type, from, to, note } = req.body;

  try {
    const updatedAbsence = await prisma.absence.update({
      where: { id },
      data: {
        ...(type && { type }),
        ...(from && { from: new Date(from) }),
        ...(to && { to: new Date(to) }),
        ...(note !== undefined && { note }),
      },
    });
    res.json({ message: "Abwesenheit aktualisiert", absence: updatedAbsence });
  } catch (error) {
    res.status(500).json({ message: "Fehler beim Aktualisieren", error });
  }
};

// Abwesenheit löschen
export const deleteAbsence = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.absence.delete({ where: { id } });
    res.json({ message: "Abwesenheit gelöscht" });
  } catch (error) {
    res.status(500).json({ message: "Fehler beim Löschen", error });
  }
};

// Aktuell aktive Abwesenheiten (optional)
export const getActiveAbsences = async (_req: Request, res: Response) => {
  const today = new Date();

  try {
    const absences = await prisma.absence.findMany({
      where: {
        from: { lte: today },
        to: { gte: today },
      },
      include: { user: true },
    });
    res.json(absences);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Fehler beim Abrufen aktiver Abwesenheiten", error });
  }
};
