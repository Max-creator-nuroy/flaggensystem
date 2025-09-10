import { PrismaClient, PipelineStatus } from "@prisma/client";
import { Request, Response } from "express";
const prisma = new PrismaClient();

interface UpdateLeadInput {
  mobileNumber: string;
  name?: string;
  status?: PipelineStatus; // new enum
  closed?: boolean;
  userId?: string;
}

interface CreateLeadInput {
  name: string;
  mobileNumber: string;
  email: string;
  userId: string;
  status?: PipelineStatus; // new enum optional
  closed?: boolean;
}

export const getLead = async (req: Request, res: Response) => {
  const leadId = req.params.id;

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        user: true,
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
      status: input.status ?? undefined,
      closed: input.closed ?? false,
    },
  });

  return newLead;
}

export const updateLead = async (req: Request, res: Response) => {
  const leadId = req.params.id;
  const { name, status, closed } = req.body as {
    name?: string;
    status?: PipelineStatus;
    closed?: boolean;
  };

  try {
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        name,
        status,
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
      orderBy: { createdAt: "desc" },
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

// GET /leads/leadGrowth?days=30  (auth: coach/admin)
export const getLeadGrowthForCoach = async (req: Request & { user?: any }, res: Response) => {
  try {
    const days = parseInt(String(req.query.days || '30'));
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - (isNaN(days)?30:days));

    // Determine coach id: if admin can pass coachId query, else use token user id
    const coachId = (req.query.coachId as string) || req.user?.id;
    if(!coachId) return res.status(400).json({ success:false, error:'MISSING_COACH_ID' });

    const leads = await prisma.lead.findMany({
      where: { userId: coachId, createdAt: { gte: fromDate } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' }
    });

    const map: Record<string, number> = {};
    leads.forEach(l => { const key = l.createdAt.toISOString().slice(0,10); map[key] = (map[key]||0)+1; });

    const data: { date:string; newLeads:number; cumulative:number }[] = [];
    let cursor = new Date(fromDate);
    const today = new Date();
    let cumulative = 0;
    while (cursor <= today) {
      const key = cursor.toISOString().slice(0,10);
      const newCount = map[key] || 0;
      cumulative += newCount;
      data.push({ date:key, newLeads: newCount, cumulative });
      cursor.setDate(cursor.getDate()+1);
    }

    return res.json({ success:true, rangeDays: days, coachId, data });
  } catch(e){
    console.error('getLeadGrowthForCoach error', e);
    return res.status(500).json({ success:false, error:'INTERNAL_ERROR' });
  }
};
