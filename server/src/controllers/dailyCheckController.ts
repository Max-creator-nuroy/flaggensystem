import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { uploadToGCS } from "../middleware/uploadToGCS";
import { analyzeVideoWithGemini } from "./VideoController";
const prisma = new PrismaClient();

// POST /createDailyCheck/:userId
export const createDailyCheck = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const videoFile: any = req.file;

    //zuerst das Video erstellen
    const video = await prisma.video.create({
      data: {
        url: "server/Videos/" + videoFile?.filename,
        userId: userId,
      },
    });

    //danach den Check
    const dailyCheck = await prisma.dailyCheck.upsert({
      where: {
        userId_date: {
          userId: userId,
          date: new Date(), // Datum ohne Uhrzeit
        },
      },
      update: {},
      create: {
        userId: userId,
        date: new Date(), // vollständiges Date-Objekt
        videoId: video.id,
      },
    });

    //hole den Coach
    const coach = await prisma.coachCustomer.findFirst({
      where: {
        customerId: userId,
      },
      include: {
        coach: true, // lädt den Coach mit
      },
    });

    //hole die Kriterien
    const requirements = await prisma.requirement.findMany({
      where: { coachId: coach?.coach?.id, isDeleted: false },
    });

    // 📤 Schritt 1: Hochladen in GCS
    // const gcsUri = await uploadToGCS(videoFile?.path, videoFile?.fieldname);

    // 🧠 Schritt 2: Analyse mit Gemini
    const rawGeminiResponse: any = await analyzeVideoWithGemini(
      videoFile,
      requirements
    );

    const analysisResults = {
      results: rawGeminiResponse.map((item: any) => ({
        requirementId: item.id,
        fulfilled: Boolean(item.answer),
      })),
    };

    for (const result of analysisResults.results) {
      // 1. DailyCheckEntry anlegen
      const entry = await prisma.dailyCheckEntry.create({
        data: {
          requirementId: result.requirementId,
          dailyCheckId: dailyCheck.id,
          fulfilled: result.fulfilled,
        },
      });

      console.log(entry);

      // 2. Wenn nicht erfüllt → Flagge erzeugen
      if (!result.fulfilled) {
        await prisma.flag.create({
          data: {
            userId,
            requirementId: result.requirementId,
            dailyCheckEntryId: entry.id, // ← ID des erstellten Eintrags
            color: "GREEN", // oder GREEN/RED je nach Logik
          },
        });
      }
    }
  } catch (error) {
    console.error("Fehler beim Erstellen:", error);
    res.status(500).json({ message: "Fehler beim Erstellen des Dailychecks" });
  }
};


export const getDailyChecksByUser = async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const dailyChecks = await prisma.dailyCheck.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      include: {
        user: true,
        entries: {
          include: {
            requirement: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

     res.json(dailyChecks);
  } catch (error) {
    res.status(500).json({ error: "Fehler beim Abrufen des DailyChecks" });
  }
};
