// src/controllers/closeController.ts

import { Request, Response } from "express";
import { getLeadById } from "../services/closeService";
import { createLeadByMobile } from "./leadController";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const handleLeadCreated = async (req: Request, res: Response) => {
  try {
    const { object_id } = req.body;

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

export const handleLeadUpdated = async (req: Request, res: Response) => {
  try {
    const { object_id } = req.body;

    if (!object_id) {
      return res.status(400).json({ error: "Missing object_id" });
    }

    const closeLead = await getLeadById(object_id);

    const mobile = closeLead.contacts?.[0]?.phones?.[0]?.phone;

    if (!mobile) {
      throw new Error("Keine Telefonnummer im Lead vorhanden.");
    }

    const internalUser = await prisma.user.findUnique({
      where: { email: closeLead.custom?.Affiliate },
    });

    if (!internalUser) {
      throw new Error(
        `Kein interner User mit Email ${closeLead.custom?.Affiliate} gefunden.`
      );
    }

    const updatedLead = await prisma.lead.update({
      where: {
        mobileNumber: mobile,
      },
      data: {
        name: closeLead.name ?? "Unbenannt",
        userId: internalUser.id,
        closed: false, // ggf. dynamisch aus Close-Status ableiten
        // Optional: weitere Felder wie stageId
      },
    });

    res.status(200).json({ success: true, updatedLead });
  } catch (error) {
    console.error("❌ Fehler beim Update-Webhook:", error);
    res.status(500).json({ error: "Serverfehler" });
  }
};
