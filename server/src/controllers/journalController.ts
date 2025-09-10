import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to check coach owns customer
async function assertCoachOwnsCustomer(coachId: string, customerId: string) {
  const link = await prisma.coachCustomer.findFirst({ where: { coachId, customerId } });
  return !!link;
}

export const createJournalEntry = async (req: Request, res: Response) => {
  // @ts-ignore
  const auth = req.user;
  if (!auth) return res.status(401).json({ message: 'Unauthenticated' });
  if (auth.role !== 'COACH' && auth.role !== 'ADMIN') return res.status(403).json({ message: 'Nur Coach/Admin' });

  const { customerId } = req.params;
  const { callNotes, planNotes } = req.body;
  if (!callNotes || !planNotes) return res.status(400).json({ message: 'callNotes & planNotes erforderlich' });
  try {
    if (auth.role === 'COACH') {
      const owns = await assertCoachOwnsCustomer(auth.id, customerId);
      if (!owns) return res.status(403).json({ message: 'Kein Zugriff auf diesen Kunden' });
    }
  const entry = await (prisma as any).journalEntry.create({
      data: { customerId, coachId: auth.role === 'ADMIN' ? auth.id : auth.id, callNotes, planNotes },
    });
    res.status(201).json(entry);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Fehler beim Erstellen' });
  }
};

export const listJournalEntries = async (req: Request, res: Response) => {
  // @ts-ignore
  const auth = req.user;
  if (!auth) return res.status(401).json({ message: 'Unauthenticated' });
  const { customerId } = req.params;
  try {
    if (auth.role === 'COACH') {
      const owns = await assertCoachOwnsCustomer(auth.id, customerId);
      if (!owns) return res.status(403).json({ message: 'Kein Zugriff' });
    }
  const entries = await (prisma as any).journalEntry.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(entries);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Fehler beim Laden' });
  }
};

export const updateJournalEntry = async (req: Request, res: Response) => {
  // @ts-ignore
  const auth = req.user;
  if (!auth) return res.status(401).json({ message: 'Unauthenticated' });
  const { id } = req.params;
  const { callNotes, planNotes } = req.body;
  try {
  const existing = await (prisma as any).journalEntry.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Nicht gefunden' });
    if (auth.role === 'COACH') {
      const owns = await assertCoachOwnsCustomer(auth.id, existing.customerId);
      if (!owns) return res.status(403).json({ message: 'Kein Zugriff' });
    }
  const updated = await (prisma as any).journalEntry.update({
      where: { id },
      data: {
        ...(callNotes != null && { callNotes }),
        ...(planNotes != null && { planNotes }),
      },
    });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Fehler beim Aktualisieren' });
  }
};

export const deleteJournalEntry = async (req: Request, res: Response) => {
  // @ts-ignore
  const auth = req.user;
  if (!auth) return res.status(401).json({ message: 'Unauthenticated' });
  const { id } = req.params;
  try {
  const existing = await (prisma as any).journalEntry.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Nicht gefunden' });
    if (auth.role === 'COACH') {
      const owns = await assertCoachOwnsCustomer(auth.id, existing.customerId);
      if (!owns) return res.status(403).json({ message: 'Kein Zugriff' });
    }
  await (prisma as any).journalEntry.delete({ where: { id } });
    res.json({ message: 'Gelöscht' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Fehler beim Löschen' });
  }
};
