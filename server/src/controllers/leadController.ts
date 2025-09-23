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

// GET /leads/coachLeadGrowth?days=30&coachId=xyz (auth: coach/admin)
export const getLeadGrowthForCoachAffiliates = async (req: Request & { user?: any }, res: Response) => {
  try {
    const days = parseInt(String(req.query.days || '30'));
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - (isNaN(days)?30:days));

    // Determine coach id: if admin can pass coachId query, else use token user id
    const coachId = (req.query.coachId as string) || req.user?.id;
    if(!coachId) return res.status(400).json({ success:false, error:'MISSING_COACH_ID' });

    console.log(`[getLeadGrowthForCoachAffiliates] CoachId: ${coachId}, Days: ${days}`);

    // Get all customers/affiliates of this coach
    const coachCustomerLinks = await prisma.coachCustomer.findMany({
      where: {
        coachId: coachId
      },
      select: { customerId: true }
    });

    console.log(`[getLeadGrowthForCoachAffiliates] Found ${coachCustomerLinks.length} coach-customer links`);
    
    const customerIds = coachCustomerLinks
      .map(link => link.customerId)
      .filter((id): id is string => id !== null);
    console.log(`[getLeadGrowthForCoachAffiliates] Customer IDs:`, customerIds);

    // If no customers found, return empty data
    if (customerIds.length === 0) {
      return res.json({ 
        success: true, 
        rangeDays: days, 
        coachId, 
        data: [], 
        affiliateCount: 0,
        message: 'No affiliates found for this coach'
      });
    }

    // Get leads from all these customers within the date range
    const leads = await prisma.lead.findMany({
      where: { 
        userId: { in: customerIds }, 
        createdAt: { gte: fromDate } 
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`[getLeadGrowthForCoachAffiliates] Found ${leads.length} leads from ${fromDate}`);

    const map: Record<string, number> = {};
    leads.forEach(l => { 
      const key = l.createdAt.toISOString().slice(0,10); 
      map[key] = (map[key]||0)+1; 
    });

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

    return res.json({ success:true, rangeDays: days, coachId, data, affiliateCount: customerIds.length });
  } catch(e){
    console.error('getLeadGrowthForCoachAffiliates error', e);
    return res.status(500).json({ success:false, error:'INTERNAL_ERROR' });
  }
};

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

// GET /leads/dailyActivity/:userId
export const getDailyLeadActivity = async (req: Request, res: Response) => {
  const { userId } = req.params;
  
  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    
    const yesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const endOfYesterday = startOfToday;

    // Get all leads for this user to analyze current status
    const allLeads = await prisma.lead.findMany({
      where: { userId },
      select: {
        id: true,
        status: true,
        createdAt: true
      }
    });

    // Get today's newly created leads
    const todaysNewLeads = allLeads.filter(l => 
      l.createdAt >= startOfToday && l.createdAt < endOfToday
    );

    // Get yesterday's newly created leads for comparison
    const yesterdaysNewLeads = allLeads.filter(l => 
      l.createdAt >= yesterday && l.createdAt < endOfYesterday
    );

    // Count current status distribution (snapshot of current pipeline state)
    const todayActivity = {
      neue: todaysNewLeads.length,
      angeschrieben: allLeads.filter(l => l.status === 'ANGESCHRIEBEN').length,
      antwortErhalten: allLeads.filter(l => l.status === 'ANTWORT_ERHALTEN').length,
      settingCall: allLeads.filter(l => l.status === 'SETTING_TERMINIERT').length,
      closingCall: allLeads.filter(l => l.status === 'CLOSING_TERMINIERT').length,
      dealsClosed: allLeads.filter(l => l.status === 'DEAL_CLOSED').length,
      disqualifiziert: allLeads.filter(l => l.status === 'LOST_DISQUALIFIZIERT').length
    };

    // Count yesterday's new leads for comparison
    const yesterdayActivity = {
      neue: yesterdaysNewLeads.length,
      angeschrieben: 0, // Can't track historical status changes without updatedAt
      antwortErhalten: 0,
      settingCall: 0,
      closingCall: 0,
      dealsClosed: 0,
      disqualifiziert: 0
    };

    res.json({
      success: true,
      today: todayActivity,
      yesterday: yesterdayActivity,
      date: startOfToday.toISOString().slice(0, 10)
    });

  } catch (error) {
    console.error("Error fetching daily lead activity:", error);
    res.status(500).json({ error: "Fehler beim Abrufen der täglichen Lead-Aktivitäten" });
  }
};
