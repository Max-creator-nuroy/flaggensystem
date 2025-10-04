"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEmail = exports.changePassword = exports.getAllCustomers = exports.getAllCoaches = exports.getCoachByUser = exports.countUserFlags = exports.getCustomersByCoach = exports.listUsers = exports.deleteUser = exports.updateUser = exports.getUser = exports.createUser = exports.createCoach = exports.enableCustomer = exports.disableCustomer = exports.enableCoach = exports.disableCoach = void 0;
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
// Admin: Coach deaktivieren (soft delete)
const disableCoach = async (req, res) => {
    try {
        // @ts-ignore auth user injected by middleware
        if (!req.user || req.user.role !== "ADMIN") {
            return res
                .status(403)
                .json({ error: "Nur Admins dürfen Coaches deaktivieren" });
        }
        const { id } = req.params;
        const coach = await prisma.user.findUnique({ where: { id } });
        if (!coach || coach.role !== "COACH") {
            return res.status(404).json({ error: "Coach nicht gefunden" });
        }
        const updated = await prisma.user.update({
            where: { id },
            data: { isDeleted: true },
        });
        return res.json({
            message: "Coach deaktiviert",
            user: { id: updated.id, isDeleted: updated.isDeleted },
        });
    }
    catch (error) {
        console.error("Fehler beim Deaktivieren des Coach:", error);
        return res.status(500).json({ error: "Fehler beim Deaktivieren des Coach" });
    }
};
exports.disableCoach = disableCoach;
// Admin: Coach wieder aktivieren
const enableCoach = async (req, res) => {
    try {
        // @ts-ignore auth user injected by middleware
        if (!req.user || req.user.role !== "ADMIN") {
            return res
                .status(403)
                .json({ error: "Nur Admins dürfen Coaches aktivieren" });
        }
        const { id } = req.params;
        const coach = await prisma.user.findUnique({ where: { id } });
        if (!coach || coach.role !== "COACH") {
            return res.status(404).json({ error: "Coach nicht gefunden" });
        }
        const updated = await prisma.user.update({
            where: { id },
            data: { isDeleted: false },
        });
        return res.json({
            message: "Coach aktiviert",
            user: { id: updated.id, isDeleted: updated.isDeleted },
        });
    }
    catch (error) {
        console.error("Fehler beim Aktivieren des Coach:", error);
        return res.status(500).json({ error: "Fehler beim Aktivieren des Coach" });
    }
};
exports.enableCoach = enableCoach;
// Admin: Customer deaktivieren (soft delete)
const disableCustomer = async (req, res) => {
    try {
        // @ts-ignore injected by auth middleware
        if (!req.user || req.user.role !== "ADMIN") {
            return res
                .status(403)
                .json({ error: "Nur Admins dürfen Kunden deaktivieren" });
        }
        const { id } = req.params;
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user || user.role !== "CUSTOMER") {
            return res.status(404).json({ error: "Kunde nicht gefunden" });
        }
        const updated = await prisma.user.update({
            where: { id },
            data: { isDeleted: true },
        });
        return res.json({
            message: "Kunde deaktiviert",
            user: { id: updated.id, isDeleted: updated.isDeleted },
        });
    }
    catch (error) {
        console.error("Fehler beim Deaktivieren des Kunden:", error);
        return res.status(500).json({ error: "Fehler beim Deaktivieren des Kunden" });
    }
};
exports.disableCustomer = disableCustomer;
// Admin: Customer wieder aktivieren
const enableCustomer = async (req, res) => {
    try {
        // @ts-ignore injected by auth middleware
        if (!req.user || req.user.role !== "ADMIN") {
            return res
                .status(403)
                .json({ error: "Nur Admins dürfen Kunden aktivieren" });
        }
        const { id } = req.params;
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user || user.role !== "CUSTOMER") {
            return res.status(404).json({ error: "Kunde nicht gefunden" });
        }
        const updated = await prisma.user.update({
            where: { id },
            data: { isDeleted: false },
        });
        return res.json({
            message: "Kunde aktiviert",
            user: { id: updated.id, isDeleted: updated.isDeleted },
        });
    }
    catch (error) {
        console.error("Fehler beim Aktivieren des Kunden:", error);
        return res.status(500).json({ error: "Fehler beim Aktivieren des Kunden" });
    }
};
exports.enableCustomer = enableCustomer;
// GET /users/createCoach
const createCoach = async (req, res) => {
    const { email, name, last_name, role, mobileNumber } = req.body;
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
        const hashed = await bcrypt_1.default.hash(name + last_name, 10);
        const user = await prisma.user.create({
            data: { email, password: hashed, name, last_name, role, mobileNumber },
        });
        res.status(201).json({ message: "User erstellt", userId: user.id });
    }
    catch (error) {
        res.status(500).json({ message: "Fehler beim Erstellen des Users" });
    }
};
exports.createCoach = createCoach;
const createUser = async (req, res) => {
    try {
        const coachId = req.params.coachId;
        const { email, password, name, last_name, mobileNumber, isAffiliate, phaseId, isCustomer } = req.body;
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: "Benutzer existiert bereits" });
        }
        const hashed = await bcrypt_1.default.hash(name + last_name, 10);
        const newUser = await prisma.user.create({
            data: {
                email,
                mobileNumber,
                password: hashed,
                name,
                last_name,
                role: "CUSTOMER",
                isAffiliate: isAffiliate != null ? isAffiliate : false,
                isCustomer: isCustomer != null ? isCustomer : false,
                isActive: false, // Neue Kunden sind standardmäßig deaktiviert
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
    }
    catch (error) {
        console.error("Fehler beim Erstellen:", error);
        res.status(500).json({ message: "Fehler beim Erstellen des Users" });
    }
};
exports.createUser = createUser;
// GET /users/:id
const getUser = async (req, res) => {
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
                    leads: true,
                }),
            },
        });
        if (!user)
            return res.status(404).json({ error: "User not found" });
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ error: "Fehler beim Abrufen des Users" });
    }
};
exports.getUser = getUser;
// PATCH /updateUser/:id
const updateUser = async (req, res) => {
    const userId = req.params.id;
    // Nur erlaubte Felder extrahieren
    const { email, password, name, last_name, isAffiliate, isActive, mobileNumber, role, coachRules, phaseId, absence, } = req.body;
    try {
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(email && { email }),
                ...(password && { password }),
                ...(name && { name }),
                ...(last_name && { last_name }),
                ...(typeof isAffiliate !== "undefined" && { isAffiliate }),
                ...(typeof isActive !== "undefined" && { isActive }),
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
    }
    catch (error) {
        console.error("Fehler beim Aktualisieren des Users:", error);
        res.status(500).json({ error: "Fehler beim Aktualisieren des Users" });
    }
};
exports.updateUser = updateUser;
// DELETE /users/:id
const deleteUser = async (req, res) => {
    const userId = req.params.id;
    try {
        await prisma.user.delete({
            where: { id: userId },
        });
        res.json({ message: "User gelöscht" });
    }
    catch (error) {
        res.status(500).json({ error: "Fehler beim Löschen des Users" });
    }
};
exports.deleteUser = deleteUser;
// GET /users
const listUsers = async (_req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ error: "Fehler beim Laden der User" });
    }
};
exports.listUsers = listUsers;
// GET /users/getCustomersByCoach/:coachId
const getCustomersByCoach = async (req, res) => {
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
                        role: true,
                        isAffiliate: true,
                        isCustomer: true,
                        isActive: true,
                        isDeleted: true,
                        flags: {
                            include: {
                                requirement: true,
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
            .filter((c) => c && !c.isDeleted);
        res.json(customers);
    }
    catch (error) {
        res.status(500).json({ error: "Fehler beim Laden der Kunden" });
    }
};
exports.getCustomersByCoach = getCustomersByCoach;
// GET /users/getCountUserFlags/:id
const countUserFlags = async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ error: "Fehler beim Laden der Kunden" });
    }
};
exports.countUserFlags = countUserFlags;
// GET /users/getCoachByUser/:id
const getCoachByUser = async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ error: "Fehler beim Abrufen des Coachs." });
    }
};
exports.getCoachByUser = getCoachByUser;
// GET /users/getAllCoaches
const getAllCoaches = async (req, res) => {
    try {
        const coaches = await prisma.user.findMany({
            where: { role: "COACH", isDeleted: false },
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Fehler beim Laden der Coaches" });
    }
};
exports.getAllCoaches = getAllCoaches;
// GET /users/getAllCustomer
const getAllCustomers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: { role: "CUSTOMER", isDeleted: false },
            include: {
                absences: {
                    orderBy: { from: "desc" },
                },
                phase: true,
                flags: true,
            },
        });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: "Fehler beim Laden der User" });
    }
};
exports.getAllCustomers = getAllCustomers;
const changePassword = async (req, res) => {
    const userId = req.params.id;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res
            .status(400)
            .json({ message: "Aktuelles und neues Passwort sind erforderlich." });
    }
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: "User nicht gefunden." });
        }
        // Aktuelles Passwort prüfen
        const validPassword = await bcrypt_1.default.compare(currentPassword, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: "Aktuelles Passwort ist falsch." });
        }
        // Neues Passwort hashen
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });
        res.json({ message: "Passwort erfolgreich geändert." });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Fehler beim Ändern des Passworts." });
    }
};
exports.changePassword = changePassword;
const updateEmail = async (req, res) => {
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Fehler beim Ändern der E-Mail." });
    }
};
exports.updateEmail = updateEmail;
