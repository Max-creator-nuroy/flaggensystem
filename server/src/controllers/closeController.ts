// src/controllers/closeController.ts

import { Request, Response } from "express";
import { getLeadById } from "../services/closeService";
import { createLeadByMobile } from "./leadController";
import { PrismaClient, Role, PipelineStatus } from "@prisma/client";
const prisma = new PrismaClient();

function mapStatus(input?: string): PipelineStatus | undefined {
  if (!input) return undefined;
  const normalized = input.trim().toLowerCase();
  switch (normalized) {
    case "neu":
      return PipelineStatus.NEU;
    case "angeschrieben":
      return PipelineStatus.ANGESCHRIEBEN;
    case "antwort erhalten":
      return PipelineStatus.ANTWORT_ERHALTEN;
    case "setting terminiert":
      return PipelineStatus.SETTING_TERMINIERT;
    case "closing terminiert":
      return PipelineStatus.CLOSING_TERMINIERT;
    case "deal closed":
      return PipelineStatus.DEAL_CLOSED;
    case "lost/disqualifiziert":
    case "lost":
    case "disqualifiziert":
      return PipelineStatus.LOST_DISQUALIFIZIERT;
    case "follow up":
      return PipelineStatus.FOLLOW_UP;
    case "no-show":
    case "noshow":
      return PipelineStatus.NO_SHOW;
    case "termin abgesagt":
      return PipelineStatus.TERMIN_ABGESAGT;
    case "termin verschoben":
      return PipelineStatus.TERMIN_VERSCHOBEN;
    default:
      return undefined;
  }
}

export const handleLeadUpsert = async (req: Request, res: Response) => {
  console.log(req);
  const reqId = `CLOSE-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  try {
    const { Name, Telefonnummer, Status, affiliate_Email } = req.body;

    console.log(`[${reqId}] ▶ handleLeadUpsert start`);
    console.log(`[${reqId}] Incoming body:`, req.body);

    if (!Telefonnummer ) {
      console.warn(`[${reqId}] ❌ Missing Telefonnummer 1`);
      return res
        .status(400)
        .json({ error: "Telefonnummer oder E-Mail erforderlich." });
    }

    const cleanTelefonnummer = Telefonnummer?.trim() ?? undefined;
    const fullName = Name?.trim() ?? "Unbenannt";
    const statusEnum = mapStatus(Status);
    const isNowCustomer = statusEnum === PipelineStatus.DEAL_CLOSED;

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
    ].filter(Boolean) as any;
    console.log(`[${reqId}] Searching existing lead with`, leadWhereOr);

    const existingLead = await prisma.lead.findFirst({
      where: { OR: leadWhereOr },
    });

    let prismaLead;

    if (existingLead) {
      console.log(
        `[${reqId}] Found existing lead`,
        { id: existingLead.id, prevStatus: existingLead.status },
      );
      // Update bestehender Lead
      const updateData = {
        name: fullName,
        mobileNumber: cleanTelefonnummer,
        userId: internalUser.id,
        status: (statusEnum ?? existingLead.status) as PipelineStatus,
        closed: isNowCustomer,
      };
      console.log(`[${reqId}] Updating lead`, updateData);
      prismaLead = await prisma.lead.update({
        where: { id: existingLead.id },
        data: updateData,
      });
      console.log(
        `[${reqId}] ✅ Lead updated`,
        { id: prismaLead.id, status: prismaLead.status, closed: prismaLead.closed },
      );
    } else {
      // Neuer Lead
      const createData = {
        name: fullName,
        mobileNumber: cleanTelefonnummer,
        userId: internalUser.id,
        status: statusEnum as PipelineStatus | undefined,
        closed: isNowCustomer,
      };
      console.log(`[${reqId}] Creating new lead`, createData);
      prismaLead = await prisma.lead.create({ data: createData });
      console.log(
        `[${reqId}] ✅ Lead created`,
        { id: prismaLead.id, status: prismaLead.status, closed: prismaLead.closed },
      );
    }

    if (isNowCustomer) {
      console.log(`[${reqId}] Status is DEAL_CLOSED → ensure customer user & linkage.`);
      const [firstName, ...rest] = fullName.split(" ");
      const lastName = rest.join(" ") || "-";
      console.log(`[${reqId}] Split Name`, { firstName, lastName });

      // Suche nach vorhandenem Kunden-User
      const userWhereOr = [
        cleanTelefonnummer ? { mobileNumber: cleanTelefonnummer } : undefined,
      ].filter(Boolean) as any;
      console.log(`[${reqId}] Searching for existing customer user with`, userWhereOr);

      let customerUser = await prisma.user.findFirst({
        where: {
          OR: userWhereOr,
          role: Role.CUSTOMER,
        },
      });

      let coach = internalUser.role === Role.COACH ? internalUser : null as any;
      if (!coach) {
        const coachRelation = await prisma.coachCustomer.findFirst({
          where: { customerId: internalUser.id },
          include: { coach: true },
        });
        coach = coachRelation?.coach as any;
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
          ? `${cleanTelefonnummer.replace(/[^0-9]/g, '')}@flaggensystem.local`
          : `${Date.now()}@flaggensystem.local`;
        
        customerUser = await prisma.user.create({
          data: { 
            name: firstName,
            last_name: lastName,
            email: uniqueEmail,
            mobileNumber: cleanTelefonnummer,
            // password absichtlich nicht geloggt
            password: firstName + lastName, 
            role: Role.CUSTOMER,
            isCustomer: true,
          },
        });
        console.log(`[${reqId}] ✅ Customer user created`, { id: customerUser.id, email: uniqueEmail });
      } else {
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
  } catch (error) {
    console.error(`[${reqId}] ❌ Fehler beim Lead-Upsert:`, error);
    return res.status(500).json({ error: "Serverfehler", detail: error instanceof Error ? error.message : error });
  }
};

export async function getPipelineFromClose(req: Request, res: Response) {
  const reqId = `CLOSE-PIPE-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  try {
    console.log(`[${reqId}] getPipelineFromClose called`);
    // Alte PipelineStage-Logik entfällt, da wir feste Enum-Werte haben.
    console.log(`[${reqId}] Responding with enum-based status info`);
    return res.json({ success: true, message: "Enum-basierte Status aktiv. Keine Synchronisation nötig." });
  } catch (error) {
    console.error(`[${reqId}] Fehler beim Pipeline-Status Handler:`, error);
    return res.status(500).json({ success: false, error: "Serverfehler" });
  }
}
