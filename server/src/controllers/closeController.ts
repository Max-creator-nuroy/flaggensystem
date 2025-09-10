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
    case "interessent":
      return PipelineStatus.INTERESSENT;
    case "setting terminiert":
      return PipelineStatus.SETTING_TERMINIERT;
    case "setting noshow":
      return PipelineStatus.SETTING_NOSHOW;
    case "downsell":
      return PipelineStatus.DOWNSELL;
    case "closing terminiert":
      return PipelineStatus.CLOSING_TERMINIERT;
    case "closing noshow":
      return PipelineStatus.CLOSING_NOSHOW;
    case "kunde":
      return PipelineStatus.KUNDE;
    case "lost":
      return PipelineStatus.LOST;
    default:
      return undefined;
  }
}

export const handleLeadUpsert = async (req: Request, res: Response) => {
  const reqId = `CLOSE-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  try {
    const { name, phone, email, status, custom_field } = req.body;

    console.log(`[${reqId}] ▶ handleLeadUpsert start`);
    console.log(`[${reqId}] Incoming body:`, req.body);

    if (!phone && (!email || email === "[]")) {
      console.warn(`[${reqId}] ❌ Missing phone and email`);
      return res
        .status(400)
        .json({ error: "Telefonnummer oder E-Mail erforderlich." });
    }

    const cleanEmail =
      email && email !== "[]"
        ? email.replace(/[\[\]"]/g, "").trim()
        : undefined;
    const cleanPhone = phone?.trim() ?? undefined;
    const fullName = name?.trim() ?? "Unbenannt";
    const statusEnum = mapStatus(status);
    const isNowCustomer = statusEnum === PipelineStatus.KUNDE;

    console.log(`[${reqId}] Parsed fields`, {
      cleanEmail,
      cleanPhone,
      fullName,
      status,
      statusEnum,
      isNowCustomer,
      custom_field,
    });

    // Interner Nutzer (Affiliate/Coach) anhand der E-Mail aus custom_field finden
    console.log(`[${reqId}] Looking up internal user by email`, custom_field);
    const internalUser = await prisma.user.findUnique({
      where: { email: custom_field },
    });

    if (!internalUser) {
      console.warn(`[${reqId}] ❌ Internal user not found for`, custom_field);
      return res.status(404).json({
        error: `Kein interner Nutzer mit Email ${custom_field} gefunden.`,
      });
    }
    console.log(`[${reqId}] ✅ Internal user`, {
      id: internalUser.id,
      role: internalUser.role,
    });

    // Bestehenden Lead anhand Telefonnummer oder E-Mail suchen
    const leadWhereOr = [
      cleanPhone ? { mobileNumber: cleanPhone } : undefined,
      cleanEmail ? { email: cleanEmail } : undefined,
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
        email: cleanEmail,
        mobileNumber: cleanPhone,
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
        email: cleanEmail,
        mobileNumber: cleanPhone,
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
      console.log(`[${reqId}] Status is KUNDE → ensure customer user & linkage.`);
      const [firstName, ...rest] = fullName.split(" ");
      const lastName = rest.join(" ") || "-";
      console.log(`[${reqId}] Split name`, { firstName, lastName });

      // Suche nach vorhandenem Kunden-User
      const userWhereOr = [
        cleanEmail ? { email: cleanEmail } : undefined,
        cleanPhone ? { mobileNumber: cleanPhone } : undefined,
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
        customerUser = await prisma.user.create({
          data: {
            name: firstName,
            last_name: lastName,
            email: cleanEmail,
            mobileNumber: cleanPhone,
            // password absichtlich nicht geloggt
            password: firstName + lastName,
            role: Role.CUSTOMER,
            isCustomer: true,
          },
        });
        console.log(`[${reqId}] ✅ Customer user created`, { id: customerUser.id });
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
