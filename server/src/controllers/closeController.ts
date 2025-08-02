// src/controllers/closeController.ts

import { Request, Response } from "express";
import { getLeadById } from "../services/closeService";
import { createLeadByMobile } from "./leadController";
import { PrismaClient, Role } from "@prisma/client";
const prisma = new PrismaClient();

export const handleLeadCreated = async (req: Request, res: Response) => {
  try {
    const { object_id } = req.body;
    console.log(req.body);

    if (!object_id) {
      return res.status(400).json({ error: "Missing object_id" });
    }

    // 1. Lead-Daten von Close laden
    const closeLead = await getLeadById(object_id);

    const internalUser = await prisma.user.findUnique({
      where: { email: closeLead.custom.Affiliate },
    });

    if (internalUser) {
      // 2. Mapping vorbereiten
      const newLeadData = {
        name: closeLead.name ?? "Unbenannt",
        mobileNumber: closeLead.contacts[0].phones[0].phone,
        email: closeLead.contacts?.[0]?.emails?.[0]?.email,
        userId: internalUser.id, // TODO: Ersetzen durch Zuweisungslogik
        stageId: "default-stage-id", // TODO: Ersetzen durch echte PipelineStage
        closed: false,
      };

      // 3. Lead in der DB anlegen
      const createdLead = await createLeadByMobile(newLeadData);

      console.log("✅ Lead gespeichert:", createdLead);
      return res.status(201).json({ success: true, lead: createdLead });
    } else {
      return res
        .status(400)
        .json({ error: "Kein gültiger Kontakt mit Telefonnummer im Lead" });
    }
  } catch (error: any) {
    console.error("❌ Fehler beim Lead-Create:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

export const handleLeadUpsert = async (req: Request, res: Response) => {
  try {
    const { name, phone, email, status, custom_field } = req.body;

    console.log(req.body);
    if (!phone && (!email || email === "[]")) {
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

    const isNowCustomer = status?.toLowerCase() === "kunde";
    console.log(cleanEmail, cleanPhone, status);

    // Interner Nutzer (Affiliate) anhand der E-Mail aus custom_field finden
    const internalUser = await prisma.user.findUnique({
      where: { email: custom_field },
    });

    if (!internalUser) {
      return res.status(404).json({
        error: `Kein interner Nutzer mit Email ${custom_field} gefunden.`,
      });
    }

    // Bestehenden Lead anhand Telefonnummer oder E-Mail suchen
    const existingLead = await prisma.lead.findFirst({
      where: {
        OR: [
          cleanPhone ? { mobileNumber: cleanPhone } : undefined,
          cleanEmail ? { email: cleanEmail } : undefined,
        ].filter(Boolean) as any,
      },
    });

    let prismaLead;

    if (existingLead) {
      // Update bestehender Lead
      prismaLead = await prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          name: fullName,
          email: cleanEmail,
          mobileNumber: cleanPhone,
          userId: internalUser.id,
          closed: isNowCustomer,
          stageId: isNowCustomer ? null : existingLead.stageId,
        },
      });
    } else {
      // Neuer Lead
      prismaLead = await prisma.lead.create({
        data: {
          name: fullName,
          email: cleanEmail,
          mobileNumber: cleanPhone,
          userId: internalUser.id,
          closed: isNowCustomer,
        },
      });
    }

    if (isNowCustomer) {
      const [firstName, ...rest] = fullName.split(" ");
      const lastName = rest.join(" ") || "-";

      // Suche nach vorhandenem Kunden-User
      let customerUser = await prisma.user.findFirst({
        where: {
          OR: [
            cleanEmail ? { email: cleanEmail } : undefined,
            cleanPhone ? { mobileNumber: cleanPhone } : undefined,
          ].filter(Boolean) as any,
          role: Role.CUSTOMER,
        },
      });

      // Coach vom internen Nutzer holen (über coachCustomer Relation)
      const coachLink = await prisma.coachCustomer.findFirst({
        where: { customerId: internalUser.id },
        include: { coach: true },
      });

      if (!coachLink?.coach) {
        throw new Error(
          `Kein Coach für internen User ${internalUser.email} gefunden.`
        );
      }

      const coach = coachLink.coach;

      if (!customerUser) {
        // Neuen Kunden anlegen
        customerUser = await prisma.user.create({
          data: {
            name: firstName,
            last_name: lastName,
            email: cleanEmail,
            mobileNumber: cleanPhone,
            password: firstName + lastName,
            role: Role.CUSTOMER,
          },
        });
      }

      // Coach-Zuordnung erstellen (falls noch nicht vorhanden)
      await prisma.coachCustomer.upsert({
        where: {
          coachId_customerId: {
            coachId: coach.id,
            customerId: customerUser.id,
          },
        },
        update: {},
        create: {
          coachId: coach.id,
          customerId: customerUser.id,
        },
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Fehler beim Lead-Upsert:", error);
    return res.status(500).json({
      error: "Serverfehler",
      detail: error instanceof Error ? error.message : error,
    });
  }
};

export async function getPipelineFromClose(req: Request, res: Response) {
  try {
    // 1. Pipelines von Close holen
    const response = await fetch("https://api.close.com/api/v1/status/lead/", {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization:
          "Basic " +
          Buffer.from(`${process.env.CLOSE_API_KEY}:`).toString("base64"),
      },
    });
    if (!response.ok) {
      return res.status(response.status).json({
        error: `Close API Fehler: ${response.status} ${response.statusText}`,
      });
    }

    const data = await response.json();
    console.log(data);

    // 2. Alle Status aus allen Pipelines extrahieren
    // Annahme: jede Pipeline hat ein 'statuses' Array mit { id, name }
    const allStatuses = data.data.flatMap((pipeline: any) => pipeline.statuses);

    // 3. Status in DB speichern (ohne Duplikate nach Name)
    for (const status of allStatuses) {
      const existingStage = await prisma.pipelineStage.findUnique({
        where: { name: status.label },
      });

      if (!existingStage) {
        await prisma.pipelineStage.create({
          data: {
            id: status.id,
            name: status.label,
          },
        });
      }
      // Wenn schon vorhanden, ignorieren (oder update je nach Bedarf)
    }

    return res.json({ success: true, message: "Pipeline-Stages aktualisiert" });
  } catch (error) {
    console.error("Fehler beim Abrufen oder Speichern der Pipelines:", error);
    return res.status(500).json({ success: false, error: "Serverfehler" });
  }
}
