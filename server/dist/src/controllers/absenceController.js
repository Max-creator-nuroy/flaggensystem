"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMyAbsenceRequests = exports.decideAbsenceRequest = exports.listCoachAbsenceRequests = exports.createAbsenceRequest = exports.toggleProcessed = exports.getCoachInbox = exports.getActiveAbsences = exports.deleteAbsence = exports.updateAbsence = exports.getUserAbsences = exports.createAbsence = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Neue Abwesenheit erstellen
const createAbsence = async (req, res) => {
    const { userId, type, from, to, note } = req.body;
    if (!userId || !type || !from || !to) {
        return res.status(400).json({ message: "Pflichtfelder fehlen." });
    }
    try {
        // Coach ermitteln (erste Coach-Zuordnung)
        let coachId;
        try {
            const link = await prisma.coachCustomer.findFirst({
                where: { customerId: userId },
                select: { coachId: true },
            });
            coachId = link?.coachId || undefined;
        }
        catch (_) { }
        // Neue Felder (coachId, processed) sind evtl. noch nicht im generierten Client -> any Cast
        const absence = await prisma.absence.create({
            data: {
                userId,
                type,
                from: new Date(from),
                to: new Date(to),
                note,
                coachId: coachId || null,
                processed: false,
            },
        });
        res.status(201).json({ message: "Abwesenheit erstellt", absence });
    }
    catch (error) {
        res.status(500).json({ message: "Fehler beim Erstellen", error });
    }
};
exports.createAbsence = createAbsence;
// Abwesenheiten eines Users abrufen
const getUserAbsences = async (req, res) => {
    const { userId } = req.params;
    try {
        const absences = await prisma.absence.findMany({
            where: { userId },
            orderBy: { from: "desc" },
        });
        res.json(absences);
    }
    catch (error) {
        res.status(500).json({ message: "Fehler beim Abrufen", error });
    }
};
exports.getUserAbsences = getUserAbsences;
// Abwesenheit aktualisieren
const updateAbsence = async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ message: "Fehler beim Aktualisieren", error });
    }
};
exports.updateAbsence = updateAbsence;
// Abwesenheit löschen
const deleteAbsence = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.absence.delete({ where: { id } });
        res.json({ message: "Abwesenheit gelöscht" });
    }
    catch (error) {
        res.status(500).json({ message: "Fehler beim Löschen", error });
    }
};
exports.deleteAbsence = deleteAbsence;
// Aktuell aktive Abwesenheiten (optional)
const getActiveAbsences = async (_req, res) => {
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
    }
    catch (error) {
        res
            .status(500)
            .json({ message: "Fehler beim Abrufen aktiver Abwesenheiten", error });
    }
};
exports.getActiveAbsences = getActiveAbsences;
// Coach Postfach: Alle Abwesenheits-Nachrichten (Urlaub/Krank) eines Coaches, gruppiert/ sortiert
const getCoachInbox = async (req, res) => {
    // @ts-ignore injected by auth
    const authUser = req.user;
    if (!authUser)
        return res.status(401).json({ message: "Unauthenticated" });
    const coachId = authUser.role === "COACH" ? authUser.id : req.query.coachId; // Admin kann ?coachId= nutzen
    if (!coachId)
        return res.status(400).json({ message: "coachId fehlt" });
    try {
        const absences = await prisma.absence.findMany({
            where: { coachId: coachId },
            orderBy: [{ processed: "asc" }, { createdAt: "desc" }],
            include: { user: true },
        });
        // Struktur nach Vorgabe: Urlaub -> unbearbeitet, bearbeitet, Krank -> unbearbeitet, bearbeitet
        const build = (type, processed) => absences.filter((a) => a.type === type && a.processed === processed);
        res.json({
            URLAUB: {
                unbearbeitet: build("URLAUB", false),
                bearbeitet: build("URLAUB", true),
            },
            KRANKHEIT: {
                unbearbeitet: build("KRANKHEIT", false),
                bearbeitet: build("KRANKHEIT", true),
            },
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Fehler beim Laden des Postfachs" });
    }
};
exports.getCoachInbox = getCoachInbox;
// Toggle processed Status
const toggleProcessed = async (req, res) => {
    const { id } = req.params;
    // @ts-ignore
    const authUser = req.user;
    if (!authUser)
        return res.status(401).json({ message: "Unauthenticated" });
    try {
        const absence = await prisma.absence.findUnique({ where: { id } });
        if (!absence)
            return res.status(404).json({ message: "Nicht gefunden" });
        // Sicherheits-Check: Nur zugehöriger Coach oder Admin
        if (authUser.role === "COACH" && absence.coachId !== authUser.id) {
            return res.status(403).json({ message: "Keine Berechtigung" });
        }
        const updated = await prisma.absence.update({
            where: { id },
            data: { processed: !absence.processed },
        });
        res.json({ message: "Status aktualisiert", absence: updated });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Fehler beim Aktualisieren" });
    }
};
exports.toggleProcessed = toggleProcessed;
// --- Neue Request-Logik ---
const createAbsenceRequest = async (req, res) => {
    const { type, from, to, note } = req.body;
    // @ts-ignore
    const authUser = req.user;
    if (!authUser)
        return res.status(401).json({ message: "Unauthenticated" });
    try {
        // Coach ermitteln
        const link = await prisma.coachCustomer.findFirst({
            where: { customerId: authUser.id },
            select: { coachId: true },
        });
        if (!link?.coachId)
            return res.status(400).json({ message: "Kein Coach zugeordnet" });
        const request = await prisma.absenceRequest.create({
            data: {
                customerId: authUser.id,
                coachId: link.coachId,
                type,
                from: new Date(from),
                to: new Date(to),
                note,
            },
        });
        res.status(201).json({ message: "Anfrage erstellt", request });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: "Fehler beim Erstellen der Anfrage" });
    }
};
exports.createAbsenceRequest = createAbsenceRequest;
const listCoachAbsenceRequests = async (req, res) => {
    // @ts-ignore
    const authUser = req.user;
    if (!authUser)
        return res.status(401).json({ message: "Unauthenticated" });
    const coachId = authUser.role === 'COACH' ? authUser.id : req.query.coachId;
    if (!coachId)
        return res.status(400).json({ message: 'coachId fehlt' });
    try {
        const requests = await prisma.absenceRequest.findMany({
            where: { coachId },
            orderBy: [{ processed: 'asc' }, { createdAt: 'desc' }],
            include: { customer: true, absence: true },
        });
        res.json(requests);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Fehler beim Laden' });
    }
};
exports.listCoachAbsenceRequests = listCoachAbsenceRequests;
const decideAbsenceRequest = async (req, res) => {
    const { id } = req.params;
    const { accept } = req.body;
    // @ts-ignore
    const authUser = req.user;
    if (!authUser)
        return res.status(401).json({ message: 'Unauthenticated' });
    try {
        const request = await prisma.absenceRequest.findUnique({ where: { id } });
        if (!request)
            return res.status(404).json({ message: 'Nicht gefunden' });
        if (authUser.role === 'COACH' && request.coachId !== authUser.id)
            return res.status(403).json({ message: 'Keine Berechtigung' });
        if (request.processed)
            return res.status(400).json({ message: 'Bereits bearbeitet' });
        let createdAbsence = null;
        if (accept) {
            // Absence erzeugen
            createdAbsence = await prisma.absence.create({
                data: {
                    userId: request.customerId,
                    coachId: request.coachId,
                    type: request.type,
                    from: request.from,
                    to: request.to,
                    note: request.note,
                    processed: true,
                },
            });
        }
        const updated = await prisma.absenceRequest.update({
            where: { id },
            data: { processed: true, accepted: accept, absenceId: createdAbsence?.id || null },
            include: { absence: true },
        });
        res.json({ message: 'Entscheidung gespeichert', request: updated });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Fehler bei Entscheidung' });
    }
};
exports.decideAbsenceRequest = decideAbsenceRequest;
// Kunde: eigene Anfragen ansehen
const listMyAbsenceRequests = async (req, res) => {
    // @ts-ignore
    const authUser = req.user;
    if (!authUser)
        return res.status(401).json({ message: 'Unauthenticated' });
    try {
        const requests = await prisma.absenceRequest.findMany({
            where: { customerId: authUser.id },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                type: true,
                from: true,
                to: true,
                note: true,
                processed: true,
                accepted: true,
                createdAt: true,
            },
        });
        res.json(requests);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Fehler beim Laden der Anfragen' });
    }
};
exports.listMyAbsenceRequests = listMyAbsenceRequests;
