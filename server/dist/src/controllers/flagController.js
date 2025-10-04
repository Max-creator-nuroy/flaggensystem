"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFlagCascade = exports.deleteFlag = exports.createFlag = exports.createManuelFlag = exports.getAllFlagsForUser = exports.getFlag = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getFlag = async (req, res) => {
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
        if (!flag)
            return res.status(404).json({ error: "Flag not found" });
        res.json(flag);
    }
    catch (error) {
        console.error("Fehler beim Abrufen der Flagge:", error);
        res.status(500).json({ error: "Fehler beim Abrufen der Flagge" });
    }
};
exports.getFlag = getFlag;
const getAllFlagsForUser = async (req, res) => {
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
    }
    catch (error) {
        console.error("Fehler beim Abrufen der Flags:", error);
        res.status(500).json({ error: "Fehler beim Abrufen der Flags" });
    }
};
exports.getAllFlagsForUser = getAllFlagsForUser;
// POST /flags/createFlag/:userId
const createManuelFlag = async (req, res) => {
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Fehler beim Erstellen der Flagge" });
    }
};
exports.createManuelFlag = createManuelFlag;
const createFlag = async (req, res) => {
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
    }
    catch (error) {
        console.error("Fehler beim Erstellen der Flagge:", error);
        res.status(500).json({ error: "Fehler beim Erstellen der Flagge" });
    }
};
exports.createFlag = createFlag;
const deleteFlag = async (req, res) => {
    const flagId = req.params.id;
    try {
        await prisma.flag.delete({ where: { id: flagId } });
        res.json({ message: "Flagge gelöscht" });
    }
    catch (error) {
        console.error("Fehler beim Löschen der Flagge:", error);
        res.status(500).json({ error: "Fehler beim Löschen der Flagge" });
    }
};
exports.deleteFlag = deleteFlag;
// DELETE /flags/deleteCascade/:id
// Deletes the specified flag and recursively all source flags it was escalated from, including all links.
const deleteFlagCascade = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "ADMIN") {
            return res.status(403).json({ error: "Nur Admins dürfen Flaggen löschen" });
        }
        const flagId = req.params.id;
        // Verify flag exists
        const base = await prisma.flag.findUnique({ where: { id: flagId } });
        if (!base) {
            return res.status(404).json({ error: "Flagge nicht gefunden" });
        }
        // Collect all source flags recursively via escalatedFrom links
        const toDelete = new Set([flagId]);
        const collectSources = async (id) => {
            const links = await prisma.flagEscalationLink.findMany({
                where: { toFlagId: id },
                select: { fromFlagId: true },
            });
            for (const l of links) {
                if (!toDelete.has(l.fromFlagId)) {
                    toDelete.add(l.fromFlagId);
                    await collectSources(l.fromFlagId);
                }
            }
        };
        await collectSources(flagId);
        const ids = Array.from(toDelete);
        await prisma.$transaction([
            prisma.flagEscalationLink.deleteMany({
                where: { OR: [{ toFlagId: { in: ids } }, { fromFlagId: { in: ids } }] },
            }),
            prisma.flag.deleteMany({ where: { id: { in: ids } } }),
        ]);
        res.json({ deletedIds: ids });
    }
    catch (error) {
        console.error("Fehler beim rekursiven Löschen der Flaggen:", error);
        res.status(500).json({ error: "Fehler beim Löschen der Flaggen" });
    }
};
exports.deleteFlagCascade = deleteFlagCascade;
const checkAndEscalateFlags = async (userId) => {
    // Nur noch Flags, die noch nicht eskaliert wurden
    const userFlags = await prisma.flag.findMany({
        where: {
            userId,
            escalatedFrom: { none: {} }, // Noch nicht verwendet
        },
        orderBy: { createdAt: "asc" }, // Älteste zuerst eskalieren
    });
    const escalate = async (fromFlags, newColor) => {
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
const getAvailableFlags = async (userId, color) => {
    return prisma.flag.findMany({
        where: {
            userId,
            color,
            escalatedTo: { none: {} }, // Noch nie als Ausgangspunkt benutzt
        },
        orderBy: { createdAt: "asc" },
    });
};
