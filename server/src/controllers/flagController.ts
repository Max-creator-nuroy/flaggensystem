import { FlagColor, PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
const prisma = new PrismaClient();

export const getFlag = async (req: Request, res: Response) => {
  const flagId = req.params.id;

  try {
    const flag = await prisma.flag.findUnique({
      where: { id: flagId },
      include: {
        user: true,
        requirement: true,
        escalatedFrom: {
          include: {
            fromFlag: { include: { requirement: true } },
          },
        },
        escalatedTo: {
          include: {
            toFlag: { include: { requirement: true } },
          },
        },
      },
    });

    if (!flag) return res.status(404).json({ error: "Flag not found" });
    res.json(flag);
  } catch (error) {
    console.error("Fehler beim Abrufen der Flagge:", error);
    res.status(500).json({ error: "Fehler beim Abrufen der Flagge" });
  }
};

export const getAllFlagsForUser = async (req: Request, res: Response) => {
  const userId = req.params.userId;

  try {
    const flags = await prisma.flag.findMany({
      where: { userId },
      include: {
        requirement: true,
        escalatedFrom: {
          include: {
            fromFlag: { include: { requirement: true } },
          },
        },
        escalatedTo: {
          include: {
            toFlag: { include: { requirement: true } },
          },
        },
      },
    });

    res.json(flags);
  } catch (error) {
    console.error("Fehler beim Abrufen der Flags:", error);
    res.status(500).json({ error: "Fehler beim Abrufen der Flags" });
  }
};

// POST /flags/createFlag/:userId
export const createManuelFlag = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { color, comment } = req.body;

  try {
    const flag = await prisma.flag.create({
      data: {
        userId,
        color,
        comment,
      },
    });
    // nach dem Erstellen prüfen, ob eskaliert werden muss
    await checkAndEscalateFlags(userId);
    res.status(201).json(flag);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Fehler beim Erstellen der Flagge" });
  }
};

export const createFlag = async (req: Request, res: Response) => {
  const { userId, color, requirementId, comment } = req.body;

  try {
    const newFlag = await prisma.flag.create({
      data: {
        userId,
        color,
        comment,
        requirementId,
      },
    });

    // nach dem Erstellen prüfen, ob eskaliert werden muss
    await checkAndEscalateFlags(userId);

    res.status(201).json(newFlag);
  } catch (error) {
    console.error("Fehler beim Erstellen der Flagge:", error);
    res.status(500).json({ error: "Fehler beim Erstellen der Flagge" });
  }
};

export const deleteFlag = async (req: Request, res: Response) => {
  const flagId = req.params.id;

  try {
    await prisma.flag.delete({ where: { id: flagId } });
    res.json({ message: "Flagge gelöscht" });
  } catch (error) {
    console.error("Fehler beim Löschen der Flagge:", error);
    res.status(500).json({ error: "Fehler beim Löschen der Flagge" });
  }
};

const checkAndEscalateFlags = async (userId: string) => {
  // Nur noch Flags, die noch nicht eskaliert wurden
  const userFlags = await prisma.flag.findMany({
    where: {
      userId,
      escalatedFrom: { none: {} }, // Noch nicht verwendet
    },
    orderBy: { createdAt: "asc" }, // Älteste zuerst eskalieren
  });

  const escalate = async (
    fromFlags: typeof userFlags,
    newColor: "YELLOW" | "RED"
  ) => {
    const newFlag = await prisma.flag.create({
      data: {
        userId,
        color: newColor,
        comment: `Automatisch eskaliert aus ${fromFlags.length} ${fromFlags[0].color}-Flaggen`,
      },
    });

    for (const from of fromFlags) {
      await prisma.flagEscalationLink.create({
        data: {
          fromFlagId: from.id,
          toFlagId: newFlag.id,
        },
      });
    }

    // Rekursiv prüfen: z.B. 6 grün → 2 gelb → 1 rot
    await checkAndEscalateFlags(userId);
  };

  // Eskalationslogik
  const green = await getAvailableFlags(userId, "GREEN");
  if (green.length >= 3) {
    await escalate(green.slice(0, 3), "YELLOW");
    return;
  }

  const yellow = await getAvailableFlags(userId, "YELLOW");
  if (yellow.length >= 3) {
    await escalate(yellow.slice(0, 3), "RED");
    return;
  }
};

const getAvailableFlags = async (userId: string, color: FlagColor) => {
  return prisma.flag.findMany({
    where: {
      userId,
      color,
      escalatedTo: { none: {} }, // Noch nie als Ausgangspunkt benutzt
    },
    orderBy: { createdAt: "asc" },
  });
};
