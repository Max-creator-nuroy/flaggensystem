import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// GET /users/createCoach
export const createCoach = async (req: Request, res: Response) => {
  const { email,  name, last_name, role, mobileNumber } = req.body;

  if (!email || !name || !last_name || !role || !mobileNumber) {
    return res
      .status(400)
      .json({ message: "Alle Felder müssen ausgefüllt sein" });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User existiert bereits" });
    }

    const hashed = await bcrypt.hash(name+last_name, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed, name, last_name, role, mobileNumber },
    });

    res.status(201).json({ message: "User erstellt", userId: user.id });
  } catch (error) {
    res.status(500).json({ message: "Fehler beim Erstellen des Users" });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const coachId = req.params.coachId;
    const { email, password, name, last_name, isAffiliate, phaseId } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Benutzer existiert bereits" });
    }

    const hashed = await bcrypt.hash(name+last_name, 10);
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashed,
        name,
        last_name,
        role: "CUSTOMER",
        isAffiliate: isAffiliate != null ? isAffiliate : false,
        phaseId
      },
    });

    await prisma.coachCustomer.create({
      data: {
        coachId,
        customerId: newUser.id,
      },
    });
    return res.status(201).json({
      message: "User erfolgreich erstellt",
      id: newUser.id, // oder userId
    });
  } catch (error) {
    console.error("Fehler beim Erstellen:", error);
    res.status(500).json({ message: "Fehler beim Erstellen des Users" });
  }
};

// GET /users/:id
export const getUser = async (req: Request, res: Response) => {
  const userId = req.params.userId;

  try {
    const { isAffiliate } = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { isAffiliate: true },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        surveys: true,
        absences: {
          orderBy: { from: "desc" },
        },
        phase: true,
        coachLinks: {
          where: { customerId: userId },
          include: { coach: true },
        },
        flags: {
          include: {
            requirement: true,
            escalatedFrom: {
              include: {
                fromFlag: {
                  include: {
                    requirement: true,
                    escalatedFrom: {
                      include: {
                        fromFlag: {
                          include: { requirement: true },
                        },
                      },
                    },
                  },
                },
              },
            },
            escalatedTo: true,
          },
        },
        dailyChecks: {
          orderBy: { date: "desc" },
          include: {
            entries: {
              include: {
                requirement: true,
              },
            },
          },
        },
        ...(isAffiliate && {
          leads: { include: { stage: true } },
        }),
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Fehler beim Abrufen des Users" });
  }
};

// PATCH /updateUser/:id
export const updateUser = async (req: Request, res: Response) => {
  const userId = req.params.id;

  // Nur erlaubte Felder extrahieren
  const {
    email,
    password,
    name,
    last_name,
    isAffiliate,
    mobileNumber,
    role,
    coachRules,
    phaseId,
    absence,
  } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(email && { email }),
        ...(password && { password }),
        ...(name && { name }),
        ...(last_name && { last_name }),
        ...(typeof isAffiliate !== "undefined" && { isAffiliate }),
        ...(mobileNumber && { mobileNumber }),
        ...(role && { role }),
        ...(coachRules && { coachRules }),
        ...(phaseId && { phaseId }),
        ...(absence && {
          absences: {
            create: {
              reason: absence.reason,
              startDate: new Date(absence.startDate),
              endDate: new Date(absence.endDate),
            },
          },
        }),
      },
    });

    res.json({ message: "User aktualisiert", user: updatedUser });
  } catch (error) {
    console.error("Fehler beim Aktualisieren des Users:", error);
    res.status(500).json({ error: "Fehler beim Aktualisieren des Users" });
  }
};

// DELETE /users/:id
export const deleteUser = async (req: Request, res: Response) => {
  const userId = req.params.id;

  try {
    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({ message: "User gelöscht" });
  } catch (error) {
    res.status(500).json({ error: "Fehler beim Löschen des Users" });
  }
};

// GET /users
export const listUsers = async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        mobileNumber: true,
        createdAt: true,
      },
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Fehler beim Laden der User" });
  }
};

// GET /users/getCustomersByCoach/:coachId
export const getCustomersByCoach = async (req: Request, res: Response) => {
  const coachId = req.params.coachId;

  try {
    const coachCustomers = await prisma.coachCustomer.findMany({
      where: { coachId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            last_name: true,
            email: true,
            mobileNumber: true,
            isAffiliate: true,
            flags: {
              include: {
                requirement: true, // das lädt zu jeder Flag das zugehörige Requirement
                escalatedFrom: true,
                escalatedTo: true,
              },
            },
          },
        },
      },
    });

    const customers = coachCustomers
      .map((entry) => entry.customer)
      .filter(Boolean); // falls mal null drin ist

    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: "Fehler beim Laden der Kunden" });
  }
};

// GET /users/getCountUserFlags/:id
export const countUserFlags = async (req: Request, res: Response) => {
  const userId = req.params.id;
  try {
    const counts = await prisma.flag.groupBy({
      by: ["color"],
      where: {
        userId: userId,
      },
      _count: {
        color: true,
      },
    });

    const result = { YELLOW: 0, RED: 0, GREEN: 0 };

    counts.forEach((entry) => {
      result[entry.color] = entry._count.color;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Fehler beim Laden der Kunden" });
  }
};

// GET /users/getCoachByUser/:id
export const getCoachByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const coachRelation = await prisma.coachCustomer.findFirst({
      where: {
        customerId: userId,
      },
      include: {
        coach: true, // lädt den Coach mit
      },
    });

    if (!coachRelation || !coachRelation.coach) {
      return res.status(404).json({ message: "Coach nicht gefunden." });
    }

    res.json(coachRelation.coach);
  } catch (error) {
    res.status(500).json({ error: "Fehler beim Abrufen des Coachs." });
  }
};

// GET /users/getAllCoaches
export const getAllCoaches = async (req: Request, res: Response) => {
  try {
    const coaches = await prisma.user.findMany({
      where: { role: "COACH" },
      include: {
        customerLinks: {
          select: {
            customerId: true,
          },
        },
      },
    });

    // Kundenanzahl pro Coach berechnen
    const coachesWithCustomerCount = coaches.map((coach) => ({
      ...coach,
      customerCount: coach.customerLinks.length,
    }));

    res.json(coachesWithCustomerCount);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Fehler beim Laden der Coaches" });
  }
};

// GET /users/getAllCustomer
export const getAllCustomers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: "CUSTOMER" },
      include: {
        absences: {
          orderBy: { from: "desc" },
        },
        phase: true,
        flags: {
          include: {
            requirement: true, // das lädt zu jeder Flag das zugehörige Requirement
            escalatedFrom: true,
            escalatedTo: true,
          },
        },
      },
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Fehler beim Laden der User" });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  const userId = req.params.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Aktuelles und neues Passwort sind erforderlich." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: "User nicht gefunden." });
    }

    // Aktuelles Passwort prüfen
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: "Aktuelles Passwort ist falsch." });
    }

    // Neues Passwort hashen
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({ message: "Passwort erfolgreich geändert." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Fehler beim Ändern des Passworts." });
  }
};

export const updateEmail = async (req: Request, res: Response) => {
  const userId = req.params.id;
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Neue E-Mail ist erforderlich." });
  }

  try {
    // Prüfe, ob die neue Email schon existiert
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser && existingUser.id !== userId) {
      return res.status(400).json({ message: "Diese E-Mail ist bereits vergeben." });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { email },
    });

    res.json({ message: "E-Mail erfolgreich geändert.", user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Fehler beim Ändern der E-Mail." });
  }
};
