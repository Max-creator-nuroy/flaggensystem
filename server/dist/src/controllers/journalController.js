"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteJournalEntry = exports.updateJournalEntry = exports.listJournalEntries = exports.createJournalEntry = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Helper to check coach owns customer
async function assertCoachOwnsCustomer(coachId, customerId) {
    const link = await prisma.coachCustomer.findFirst({ where: { coachId, customerId } });
    return !!link;
}
const createJournalEntry = async (req, res) => {
    // @ts-ignore
    const auth = req.user;
    if (!auth)
        return res.status(401).json({ message: 'Unauthenticated' });
    if (auth.role !== 'COACH' && auth.role !== 'ADMIN')
        return res.status(403).json({ message: 'Nur Coach/Admin' });
    const { customerId } = req.params;
    const { callNotes, planNotes } = req.body;
    if (!callNotes || !planNotes)
        return res.status(400).json({ message: 'callNotes & planNotes erforderlich' });
    try {
        if (auth.role === 'COACH') {
            const owns = await assertCoachOwnsCustomer(auth.id, customerId);
            if (!owns)
                return res.status(403).json({ message: 'Kein Zugriff auf diesen Kunden' });
        }
        const entry = await prisma.journalEntry.create({
            data: { customerId, coachId: auth.role === 'ADMIN' ? auth.id : auth.id, callNotes, planNotes },
        });
        res.status(201).json(entry);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Fehler beim Erstellen' });
    }
};
exports.createJournalEntry = createJournalEntry;
const listJournalEntries = async (req, res) => {
    // @ts-ignore
    const auth = req.user;
    if (!auth)
        return res.status(401).json({ message: 'Unauthenticated' });
    const { customerId } = req.params;
    try {
        if (auth.role === 'COACH') {
            const owns = await assertCoachOwnsCustomer(auth.id, customerId);
            if (!owns)
                return res.status(403).json({ message: 'Kein Zugriff' });
        }
        const entries = await prisma.journalEntry.findMany({
            where: { customerId },
            orderBy: { createdAt: 'desc' },
        });
        res.json(entries);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Fehler beim Laden' });
    }
};
exports.listJournalEntries = listJournalEntries;
const updateJournalEntry = async (req, res) => {
    // @ts-ignore
    const auth = req.user;
    if (!auth)
        return res.status(401).json({ message: 'Unauthenticated' });
    const { id } = req.params;
    const { callNotes, planNotes } = req.body;
    try {
        const existing = await prisma.journalEntry.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ message: 'Nicht gefunden' });
        if (auth.role === 'COACH') {
            const owns = await assertCoachOwnsCustomer(auth.id, existing.customerId);
            if (!owns)
                return res.status(403).json({ message: 'Kein Zugriff' });
        }
        const updated = await prisma.journalEntry.update({
            where: { id },
            data: {
                ...(callNotes != null && { callNotes }),
                ...(planNotes != null && { planNotes }),
            },
        });
        res.json(updated);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Fehler beim Aktualisieren' });
    }
};
exports.updateJournalEntry = updateJournalEntry;
const deleteJournalEntry = async (req, res) => {
    // @ts-ignore
    const auth = req.user;
    if (!auth)
        return res.status(401).json({ message: 'Unauthenticated' });
    const { id } = req.params;
    try {
        const existing = await prisma.journalEntry.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ message: 'Nicht gefunden' });
        if (auth.role === 'COACH') {
            const owns = await assertCoachOwnsCustomer(auth.id, existing.customerId);
            if (!owns)
                return res.status(403).json({ message: 'Kein Zugriff' });
        }
        await prisma.journalEntry.delete({ where: { id } });
        res.json({ message: 'Gelöscht' });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Fehler beim Löschen' });
    }
};
exports.deleteJournalEntry = deleteJournalEntry;
