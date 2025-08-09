import { Request, Response } from 'express';
import { PrismaClient, Role, FlagColor } from '@prisma/client';

const prisma = new PrismaClient();

// GET /admin/stats/customerGrowth?days=30
export async function getCustomerGrowth(req: Request, res: Response) {
  try {
    const days = parseInt(String(req.query.days || '30')); // default 30
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - (isNaN(days) ? 30 : days));

    const customers = await prisma.user.findMany({
      where: {
        role: Role.CUSTOMER,
        createdAt: { gte: fromDate },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Bucket by day
    const map: Record<string, number> = {};
    customers.forEach(c => {
      const key = c.createdAt.toISOString().slice(0,10);
      map[key] = (map[key] || 0) + 1;
    });

    // Build continuous range of dates
    const data: { date: string; newCustomers: number; cumulative: number }[] = [];
    let cursor = new Date(fromDate);
    let cumulative = 0;
    const today = new Date();
    while (cursor <= today) {
      const key = cursor.toISOString().slice(0,10);
      const newCount = map[key] || 0;
      cumulative += newCount;
      data.push({ date: key, newCustomers: newCount, cumulative });
      cursor.setDate(cursor.getDate() + 1);
    }
    return res.json({ success: true, rangeDays: days, data });
  } catch (e) {
    console.error('getCustomerGrowth error', e);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
}

// GET /admin/stats/flagsPerCoach
export async function getFlagsPerCoach(req: Request, res: Response) {
  try {
    const coaches = await prisma.user.findMany({
      where: { role: Role.COACH },
      select: {
        id: true,
        name: true,
        last_name: true,
        coachLinks: {
          select: { customer: { select: { id: true, flags: { select: { color: true } } } } }
        }
      }
    });

    const result = coaches.map(c => {
      let red=0, yellow=0, green=0;
      c.coachLinks.forEach(link => {
        if (!link.customer) return;
        link.customer.flags.forEach(f => {
          if (f.color === FlagColor.RED) red++; else if (f.color === FlagColor.YELLOW) yellow++; else if (f.color === FlagColor.GREEN) green++;
        });
      });
      return { coachId: c.id, name: c.name, last_name: c.last_name, red, yellow, green, total: red+yellow+green };
    });

    return res.json({ success: true, data: result });
  } catch (e) {
    console.error('getFlagsPerCoach error', e);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
}

// GET /admin/stats/topRequirements?limit=10
export async function getTopRequirementFlags(req: Request, res: Response) {
  try {
    const limit = parseInt(String(req.query.limit || '10'));
    // Group flags by requirementId (excluding null)
    const groupedAll = await prisma.flag.groupBy({
      by: ['requirementId'],
      where: { requirementId: { not: null } },
      _count: { requirementId: true },
    });
    const grouped = (groupedAll as any[]).sort((a,b)=> (b._count.requirementId||0) - (a._count.requirementId||0));
    const sliced = grouped.slice(0, isNaN(limit)?10:limit);

    // For each requirement gather detail & color breakdown
    const data = await Promise.all(sliced.map(async g => {
      const reqId = g.requirementId as string;
      const requirement = await prisma.requirement.findUnique({ where: { id: reqId }, select: { title: true } });
      const colors = await prisma.flag.groupBy({
        by: ['color'],
        where: { requirementId: reqId },
        _count: { _all: true }
      });
      const red = colors.find(c => c.color === FlagColor.RED)?._count._all || 0;
      const yellow = colors.find(c => c.color === FlagColor.YELLOW)?._count._all || 0;
      const green = colors.find(c => c.color === FlagColor.GREEN)?._count._all || 0;
      const totalFlags = (red + yellow + green) || 0;
      return { requirementId: reqId, title: requirement?.title || '—', totalFlags, red, yellow, green };
    }));

    return res.json({ success: true, data });
  } catch (e) {
    console.error('getTopRequirementFlags error', e);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
}

// GET /admin/stats/requirementFailures?days=30&limit=10
export async function getRequirementFailures(req: Request, res: Response) {
  try {
    const days = parseInt(String(req.query.days || '30'));
    const limit = parseInt(String(req.query.limit || '10'));
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - (isNaN(days) ? 30 : days));

    const groupedAll = await prisma.dailyCheckEntry.groupBy({
      by: ['requirementId'],
      where: { fulfilled: false, createdAt: { gte: fromDate } },
      _count: { requirementId: true },
    });
    const grouped = (groupedAll as any[]).sort((a,b)=> (b._count.requirementId||0) - (a._count.requirementId||0));
    const sliced = grouped.slice(0, isNaN(limit)?10:limit);

    const data = await Promise.all(sliced.map(async g => {
      const requirement = await prisma.requirement.findUnique({ where: { id: g.requirementId }, select: { title: true, coach: { select: { id:true, name:true, last_name:true } } } });
      const failures = g._count.requirementId || 0;
      return {
        requirementId: g.requirementId,
        title: requirement?.title || '—',
        failures,
        coachId: requirement?.coach?.id || null,
        coachName: requirement?.coach ? `${requirement.coach.name} ${requirement.coach.last_name}`.trim() : null
      };
    }));

    return res.json({ success: true, rangeDays: days, data });
  } catch (e) {
    console.error('getRequirementFailures error', e);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
}

// GET /admin/stats/requirement/:id?days=30
export async function getRequirementDetail(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const days = parseInt(String(req.query.days || '30'));
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - (isNaN(days) ? 30 : days));

    const requirement = await prisma.requirement.findUnique({
      where: { id },
      include: {
        coach: { select: { id: true, name: true, last_name: true } },
        Flag: { select: { id: true, color: true, createdAt: true, userId: true }, orderBy: { createdAt: 'desc' } },
        entries: { where: { createdAt: { gte: fromDate } }, select: { id: true, fulfilled: true, createdAt: true, dailyCheck: { select: { userId: true } } } }
      }
    });
    if (!requirement) return res.status(404).json({ success:false, error:'NOT_FOUND' });

    const flagCounts = requirement.Flag.reduce((acc:any,f)=>{ acc[f.color] = (acc[f.color]||0)+1; return acc; }, {});
    const failures = requirement.entries.filter(e=> !e.fulfilled).length;
    const totalEntries = requirement.entries.length;
    const failureRate = totalEntries ? (failures/totalEntries)*100 : 0;
    const recentFlags = requirement.Flag.slice(0,20);

    return res.json({
      success:true,
      data: {
        id: requirement.id,
        title: requirement.title,
        description: requirement.description,
        coach: requirement.coach,
        flagCounts,
        totalFlags: requirement.Flag.length,
        recentFlags,
        periodDays: days,
        failures,
        totalEntries,
        failureRate
      }
    });
  } catch(e){
    console.error('getRequirementDetail error', e);
    return res.status(500).json({ success:false, error:'INTERNAL_ERROR' });
  }
}

// GET /admin/stats/coach/:id?days=30
export async function getCoachDetail(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const days = parseInt(String(req.query.days || '30'));
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - (isNaN(days) ? 30 : days));

    // Coach basic & linked customers
    const coach = await prisma.user.findUnique({
      where: { id, role: Role.COACH },
      select: {
        id: true, name: true, last_name: true, email: true, mobileNumber: true,
        coachLinks: { select: { customer: { select: { id: true, name: true, last_name: true } } } },
        requiremnt: { select: { id: true, title: true } },
      }
    });
    if (!coach) return res.status(404).json({ success:false, error:'NOT_FOUND' });
    const customerIds = coach.coachLinks.map(l => l.customer?.id).filter(Boolean) as string[];

    // Flags for customers in period
    const flags = await prisma.flag.findMany({
      where: { userId: { in: customerIds }, createdAt: { gte: fromDate } },
      select: { id:true, color:true, createdAt:true, userId:true, requirementId:true }
    });

    // Aggregate per customer
    const customerFlagAgg: Record<string,{ red:number; yellow:number; green:number; }>= {};
    flags.forEach(f=> {
      if(!customerFlagAgg[f.userId]) customerFlagAgg[f.userId] = { red:0,yellow:0,green:0 };
      if (f.color===FlagColor.RED) customerFlagAgg[f.userId].red++; else if (f.color===FlagColor.YELLOW) customerFlagAgg[f.userId].yellow++; else if (f.color===FlagColor.GREEN) customerFlagAgg[f.userId].green++; 
    });

    const customers = coach.coachLinks.map(l => {
      const c = l.customer; if (!c) return null;
      const agg = customerFlagAgg[c.id] || { red:0,yellow:0,green:0 };
      return { id:c.id, name:c.name, last_name:c.last_name, ...agg, total: agg.red+agg.yellow+agg.green };
    }).filter(Boolean);

    // Flag timeline (daily new counts per color)
    const dayMap: Record<string,{ red:number; yellow:number; green:number; }>= {};
    flags.forEach(f=> {
      const key = f.createdAt.toISOString().slice(0,10);
      if(!dayMap[key]) dayMap[key] = { red:0,yellow:0,green:0 };
      if (f.color===FlagColor.RED) dayMap[key].red++; else if (f.color===FlagColor.YELLOW) dayMap[key].yellow++; else if (f.color===FlagColor.GREEN) dayMap[key].green++; 
    });
    const timeline: { date:string; red:number; yellow:number; green:number; total:number }[] = [];
    const cursor = new Date(fromDate);
    const today = new Date();
    while (cursor <= today) {
      const key = cursor.toISOString().slice(0,10);
      const d = dayMap[key] || { red:0,yellow:0,green:0 };
      timeline.push({ date:key, ...d, total: d.red+d.yellow+d.green });
      cursor.setDate(cursor.getDate()+1);
    }

    // Requirement flag counts limited to coach requirements
    const requirementIds = coach.requiremnt.map(r=> r.id);
    let requirementFlags: { requirementId:string; title:string; red:number; yellow:number; green:number; total:number }[] = [];
    if (requirementIds.length) {
      const reqFlags = flags.filter(f=> f.requirementId && requirementIds.includes(f.requirementId));
      const reqMap: Record<string,{ red:number; yellow:number; green:number; title:string }> = {};
      reqFlags.forEach(f=> {
        if(!f.requirementId) return;
        if(!reqMap[f.requirementId]) {
          const title = coach.requiremnt.find(r=> r.id===f.requirementId)?.title || '—';
          reqMap[f.requirementId] = { red:0,yellow:0,green:0,title };
        }
        if (f.color===FlagColor.RED) reqMap[f.requirementId].red++; else if (f.color===FlagColor.YELLOW) reqMap[f.requirementId].yellow++; else if (f.color===FlagColor.GREEN) reqMap[f.requirementId].green++; 
      });
      requirementFlags = Object.entries(reqMap).map(([rid,v])=> ({ requirementId: rid, title: v.title, red:v.red,yellow:v.yellow,green:v.green,total: v.red+v.yellow+v.green }))
        .sort((a,b)=> b.total - a.total);
    }

    // Overall counts
    const totals = flags.reduce((acc:any,f)=>{ acc[f.color]=(acc[f.color]||0)+1; return acc; }, {});

    return res.json({ success:true, data: {
      coach: { id: coach.id, name: coach.name, last_name: coach.last_name, email: coach.email, mobileNumber: coach.mobileNumber },
      days: days,
      customersCount: customers.length,
      flagTotals: { red: totals.RED||0, yellow: totals.YELLOW||0, green: totals.GREEN||0 },
      customers,
      timeline,
      requirementFlags
    }});
  } catch(e){
    console.error('getCoachDetail error', e);
    return res.status(500).json({ success:false, error:'INTERNAL_ERROR' });
  }
}

// GET /admin/stats/coachCustomerGrowth/:id?days=30
export async function getCoachCustomerGrowth(req: Request, res: Response) {
  try {
    const { id } = req.params; // coachId
    const days = parseInt(String(req.query.days || '30'));
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - (isNaN(days)?30:days));

    // Kunden (Customer Links) holen
    const links = await prisma.coachCustomer.findMany({
      where: { coachId: id },
      select: { customer: { select: { id:true, createdAt:true, role:true } } }
    });
    const customers = links.map(l => l.customer).filter(c => !!c) as any[];
    const filtered = customers.filter(c => c.createdAt >= fromDate);

    const map: Record<string, number> = {};
    filtered.forEach(c => { const key = c.createdAt.toISOString().slice(0,10); map[key] = (map[key]||0)+1; });
    const data: { date:string; newCustomers:number; cumulative:number }[] = [];
    let cursor = new Date(fromDate);
    let cumulative = 0; const today = new Date();
    while (cursor <= today) {
      const key = cursor.toISOString().slice(0,10);
      const newCount = map[key] || 0; cumulative += newCount;
      data.push({ date:key, newCustomers:newCount, cumulative });
      cursor.setDate(cursor.getDate()+1);
    }
    return res.json({ success:true, coachId:id, rangeDays:days, data });
  } catch(e){
    console.error('getCoachCustomerGrowth error', e);
    return res.status(500).json({ success:false, error:'INTERNAL_ERROR' });
  }
}

// GET /admin/stats/coachRequirementFailures/:id?days=30&limit=10
export async function getCoachRequirementFailures(req: Request, res: Response) {
  try {
    const { id } = req.params; // coachId
    const days = parseInt(String(req.query.days || '30'));
    const limit = parseInt(String(req.query.limit || '10'));
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - (isNaN(days)?30:days));

    // Requirements dieses Coach
    const requirements = await prisma.requirement.findMany({ where: { coachId: id }, select: { id:true, title:true } });
    const reqIds = requirements.map(r=> r.id);
    if(!reqIds.length) return res.json({ success:true, data: [], rangeDays: days });

    const groupedAll = await prisma.dailyCheckEntry.groupBy({
      by: ['requirementId'],
      where: { requirementId: { in: reqIds }, fulfilled: false, createdAt: { gte: fromDate } },
      _count: { requirementId: true }
    });
    const grouped = (groupedAll as any[]).sort((a,b)=> (b._count.requirementId||0) - (a._count.requirementId||0));
    const sliced = grouped.slice(0, isNaN(limit)?10:limit);
    const mapTitles: Record<string,string> = Object.fromEntries(requirements.map(r=> [r.id, r.title]));
    const data = sliced.map(g => ({ requirementId: g.requirementId, title: mapTitles[g.requirementId] || '—', failures: g._count.requirementId || 0 }));
    return res.json({ success:true, rangeDays: days, data });
  } catch(e){
    console.error('getCoachRequirementFailures error', e);
    return res.status(500).json({ success:false, error:'INTERNAL_ERROR' });
  }
}
