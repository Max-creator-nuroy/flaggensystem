"use strict";
// src/controllers/closeController.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleLeadUpsert = void 0;
exports.getPipelineFromClose = getPipelineFromClose;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function mapStatus(input) {
    if (!input)
        return undefined;
    const normalized = input.trim().toLowerCase();
    switch (normalized) {
        case "neu":
            return client_1.PipelineStatus.NEU;
        case "angeschrieben":
            return client_1.PipelineStatus.ANGESCHRIEBEN;
        case "antwort erhalten":
            return client_1.PipelineStatus.ANTWORT_ERHALTEN;
        case "setting terminiert":
            return client_1.PipelineStatus.SETTING_TERMINIERT;
        case "closing terminiert":
            return client_1.PipelineStatus.CLOSING_TERMINIERT;
        case "deal closed":
            return client_1.PipelineStatus.DEAL_CLOSED;
        case "lost/disqualifiziert":
        case "lost":
        case "disqualifiziert":
            return client_1.PipelineStatus.LOST_DISQUALIFIZIERT;
        case "follow up":
            return client_1.PipelineStatus.FOLLOW_UP;
        case "no-show":
        case "noshow":
            return client_1.PipelineStatus.NO_SHOW;
        case "termin abgesagt":
            return client_1.PipelineStatus.TERMIN_ABGESAGT;
        case "termin verschoben":
            return client_1.PipelineStatus.TERMIN_VERSCHOBEN;
        default:
            return undefined;
    }
}
const handleLeadUpsert = async (req, res) => {
    console.log(req);
    const reqId = `CLOSE-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    try {
        const { Name, Telefonnummer, Status, affiliate_Email } = req.body;
        console.log(`[${reqId}] ▶ handleLeadUpsert start`);
        console.log(`[${reqId}] Incoming body:`, req.body);
        if (!Telefonnummer) {
            console.warn(`[${reqId}] ❌ Missing Telefonnummer 1`);
            return res
                .status(400)
                .json({ error: "Telefonnummer oder E-Mail erforderlich." });
        }
        const cleanTelefonnummer = Telefonnummer?.trim() ?? undefined;
        const fullName = Name?.trim() ?? "Unbenannt";
        const statusEnum = mapStatus(Status);
        const isNowCustomer = statusEnum === client_1.PipelineStatus.DEAL_CLOSED;
        console.log(`[${reqId}] Parsed fields`, {
            cleanTelefonnummer,
            fullName,
            Status,
            statusEnum,
            isNowCustomer,
            affiliate_Email,
        });
        // Interner Nutzer (Affiliate/Coach) anhand der E-Mail aus affiliate_Email finden
        console.log(`[${reqId}] Looking up internal user by email`, affiliate_Email);
        const internalUser = await prisma.user.findUnique({
            where: { email: affiliate_Email },
        });
        if (!internalUser) {
            console.warn(`[${reqId}] ❌ Internal user not found for`, affiliate_Email);
            return res.status(404).json({
                error: `Kein interner Nutzer mit Email ${affiliate_Email} gefunden.`,
            });
        }
        console.log(`[${reqId}] ✅ Internal user`, {
            id: internalUser.id,
            role: internalUser.role,
        });
        // Bestehenden Lead anhand Telefonnummer oder E-Mail suchen
        const leadWhereOr = [
            cleanTelefonnummer ? { mobileNumber: cleanTelefonnummer } : undefined,
        ].filter(Boolean);
        console.log(`[${reqId}] Searching existing lead with`, leadWhereOr);
        const existingLead = await prisma.lead.findFirst({
            where: { OR: leadWhereOr },
        });
        let prismaLead;
        if (existingLead) {
            console.log(`[${reqId}] Found existing lead`, { id: existingLead.id, prevStatus: existingLead.status });
            // Update bestehender Lead
            const updateData = {
                name: fullName,
                mobileNumber: cleanTelefonnummer,
                userId: internalUser.id,
                status: (statusEnum ?? existingLead.status),
                closed: isNowCustomer,
            };
            console.log(`[${reqId}] Updating lead`, updateData);
            prismaLead = await prisma.lead.update({
                where: { id: existingLead.id },
                data: updateData,
            });
            console.log(`[${reqId}] ✅ Lead updated`, { id: prismaLead.id, status: prismaLead.status, closed: prismaLead.closed });
        }
        else {
            // Neuer Lead
            const createData = {
                name: fullName,
                mobileNumber: cleanTelefonnummer,
                userId: internalUser.id,
                status: statusEnum,
                closed: isNowCustomer,
            };
            console.log(`[${reqId}] Creating new lead`, createData);
            prismaLead = await prisma.lead.create({ data: createData });
            console.log(`[${reqId}] ✅ Lead created`, { id: prismaLead.id, status: prismaLead.status, closed: prismaLead.closed });
        }
        if (isNowCustomer) {
            console.log(`[${reqId}] Status is DEAL_CLOSED → ensure customer user & linkage.`);
            const [firstName, ...rest] = fullName.split(" ");
            const lastName = rest.join(" ") || "-";
            console.log(`[${reqId}] Split Name`, { firstName, lastName });
            // Suche nach vorhandenem Kunden-User
            const userWhereOr = [
                cleanTelefonnummer ? { mobileNumber: cleanTelefonnummer } : undefined,
            ].filter(Boolean);
            console.log(`[${reqId}] Searching for existing customer user with`, userWhereOr);
            let customerUser = await prisma.user.findFirst({
                where: {
                    OR: userWhereOr,
                    role: client_1.Role.CUSTOMER,
                },
            });
            let coach = internalUser.role === client_1.Role.COACH ? internalUser : null;
            if (!coach) {
                const coachRelation = await prisma.coachCustomer.findFirst({
                    where: { customerId: internalUser.id },
                    include: { coach: true },
                });
                coach = coachRelation?.coach;
            }
            if (!coach) {
                console.warn(`[${reqId}] ❌ Kein Coach für internen Nutzer gefunden`, { internalUserId: internalUser.id });
                return res.status(400).json({ error: "Kein Coach für internen Nutzer gefunden." });
            }
            console.log(`[${reqId}] ✅ Coach resolved`, { coachId: coach.id });
            if (!customerUser) {
                console.log(`[${reqId}] No existing customer user → creating new customer user`);
                // Generate unique email for login since leads don't have email
                const uniqueEmail = cleanTelefonnummer
                    ? `customer+${cleanTelefonnummer.replace(/[^0-9]/g, '')}@flaggensystem.local`
                    : `customer+${Date.now()}@flaggensystem.local`;
                customerUser = await prisma.user.create({
                    data: {
                        name: firstName,
                        last_name: lastName,
                        email: uniqueEmail,
                        mobileNumber: cleanTelefonnummer,
                        // password absichtlich nicht geloggt
                        password: firstName + lastName,
                        role: client_1.Role.CUSTOMER,
                        isCustomer: true,
                    },
                });
                console.log(`[${reqId}] ✅ Customer user created`, { id: customerUser.id, email: uniqueEmail });
            }
            else {
                console.log(`[${reqId}] ✅ Found existing customer user`, { id: customerUser.id });
            }
            console.log(`[${reqId}] Upserting coach-customer link`, { coachId: coach.id, customerId: customerUser.id });
            await prisma.coachCustomer.upsert({
                where: { coachId_customerId: { coachId: coach.id, customerId: customerUser.id } },
                update: {},
                create: { coachId: coach.id, customerId: customerUser.id },
            });
            console.log(`[${reqId}] ✅ Coach-customer link ensured`);
        }
        console.log(`[${reqId}] ▶ handleLeadUpsert success`, { leadId: prismaLead.id });
        return res.status(200).json({ success: true, lead: prismaLead });
    }
    catch (error) {
        console.error(`[${reqId}] ❌ Fehler beim Lead-Upsert:`, error);
        return res.status(500).json({ error: "Serverfehler", detail: error instanceof Error ? error.message : error });
    }
};
exports.handleLeadUpsert = handleLeadUpsert;
async function getPipelineFromClose(req, res) {
    const reqId = `CLOSE-PIPE-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    try {
        console.log(`[${reqId}] getPipelineFromClose called`);
        // Alte PipelineStage-Logik entfällt, da wir feste Enum-Werte haben.
        console.log(`[${reqId}] Responding with enum-based status info`);
        return res.json({ success: true, message: "Enum-basierte Status aktiv. Keine Synchronisation nötig." });
    }
    catch (error) {
        console.error(`[${reqId}] Fehler beim Pipeline-Status Handler:`, error);
        return res.status(500).json({ success: false, error: "Serverfehler" });
    }
}
