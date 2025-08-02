import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
const prisma = new PrismaClient();

interface UpdateLeadInput {
  mobileNumber: string;
  name?: string;
  stageId?: string;
  closed?: boolean;
  userId?: string;
}

interface CreateLeadInput {
  name: string;
  mobileNumber: string;
  email: string;
  userId: string;
  stageId: string;
  closed?: boolean;
}

export const getLead = async (req: Request, res: Response) => {
  const leadId = req.params.id;

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        user: true,
        stage: true,
      },
    });

    if (!lead) return res.status(404).json({ error: "Lead not found" });

    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: "Fehler beim Abrufen des Leads" });
  }
};

export const getAllLeads = async (req: Request, res: Response) => {
  try {
    const leads = await prisma.lead.findMany({
      include: {
        user: true,
        stage: true,
      },
    });
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: "Fehler beim Abrufen der Leads" });
  }
};

export async function createLeadByMobile(input: CreateLeadInput) {
  const existingLead = await prisma.lead.findUnique({
    where: {
      mobileNumber: input.mobileNumber,
    },
  });

  if (existingLead) {
    throw new Error(`Lead mit Mobile ${input.mobileNumber} existiert bereits.`);
  }

  const newLead = await prisma.lead.create({
    data: {
      name: input.name,
      mobileNumber: input.mobileNumber,
      email: input.email,
      userId: input.userId,
      stageId: input.stageId,
      closed: input.closed ?? false,
    },
  });

  return newLead;
}

export const updateLead = async (req: Request, res: Response) => {
  const leadId = req.params.id;
  const { name, stageId, closed } = req.body;

  try {
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        name,
        stageId,
        closed,
      },
    });

    res.json(updatedLead);
  } catch (error) {
    res.status(500).json({ error: "Fehler beim Aktualisieren des Leads" });
  }
};

export const deleteLead = async (req: Request, res: Response) => {
  const leadId = req.params.id;

  try {
    await prisma.lead.delete({
      where: { id: leadId },
    });

    res.json({ message: "Lead erfolgreich gelöscht" });
  } catch (error) {
    res.status(500).json({ error: "Fehler beim Löschen des Leads" });
  }
};

// GET /getLeadsByUser/:userId
export const getLeadsByUser = async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const leads = await prisma.lead.findMany({
      where: { userId },
      include: {
        stage: true, // Optional: PipelineStage mit einbeziehen
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(leads);
  } catch (error) {
    console.error("Fehler beim Abrufen der Leads:", error);
    res.status(500).json({ error: "Fehler beim Abrufen der Leads" });
  }
};

export async function updateLeadByMobile(input: UpdateLeadInput) {
  const { mobileNumber, ...updates } = input;

  const existingLead = await prisma.lead.findUnique({
    where: { mobileNumber },
  });

  if (!existingLead) {
    throw new Error(`Lead mit Mobile ${mobileNumber} nicht gefunden`);
  }

  const updatedLead = await prisma.lead.update({
    where: { mobileNumber },
    data: {
      ...updates,
    },
  });

  return updatedLead;
}
