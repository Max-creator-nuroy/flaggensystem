import { FlagColor, PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { uploadToGCS } from "../middleware/uploadToGCS";
import { analyzeVideoWithGemini } from "./VideoController";
import { startOfDay, subDays } from "date-fns";
import fs from "fs";
import path from "path";
import { Storage } from "@google-cloud/storage";
const prisma = new PrismaClient();

// POST /createDailyCheck/:userId
export const createDailyCheck = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    // User aus DB holen
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: "User nicht gefunden" });
    }
    if (!user.isCustomer) {
      return res
        .status(403)
        .json({ message: "Nur Kunden dürfen DailyChecks erstellen" });
    }

    const videoFile: any = req.file;

    // Dateiname zu "Name_Nachname_YYYY-MM-DD.ext" umbenennen
    let finalFilename = videoFile?.filename as string;
    let finalPath = videoFile?.path || path.join("server", "Videos", finalFilename);
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const base = `${(user.name || "User").replace(/[^a-zA-Z0-9-_]/g, "_")}_${(user.last_name || "").replace(/[^a-zA-Z0-9-_]/g, "_")}_${dateStr}`.replace(/_+/g, "_").replace(/^_+|_+$/g, "");
      const ext = path.extname(videoFile?.originalname || videoFile?.filename || ".mp4") || ".mp4";
      finalFilename = `${base}${ext}`;
      const targetDir = path.join("server", "Videos");
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
      const newPath = path.join(targetDir, finalFilename);
      if (finalPath && fs.existsSync(finalPath)) {
        fs.renameSync(finalPath, newPath);
        finalPath = newPath;
      } else {
        // Wenn Multer keinen Pfad liefert, kopieren wir nicht, setzen aber URL entsprechend
        finalPath = newPath;
      }
    } catch (e) {
      // Fallback auf alten Namen
      finalFilename = videoFile?.filename;
      finalPath = videoFile?.path || path.join("server", "Videos", finalFilename);
    }

    //zuerst das Video erstellen
    const video = await prisma.video.create({
      data: {
        url: "server/Videos/" + finalFilename,
        title: `${user.name || "User"} ${user.last_name || ""} ${new Date().toISOString().slice(0,10)}`.trim(),
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
        note: item.why,
      })),
    };

    for (const result of analysisResults.results) {
      // 1. DailyCheckEntry anlegen
      const entry = await prisma.dailyCheckEntry.create({
        data: {
          requirementId: result.requirementId,
          dailyCheckId: dailyCheck.id,
          fulfilled: result.fulfilled,
          note: result.note,
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
        // Nach dem Erstellen: Eskalation prüfen
        await checkAndEscalateFlags(userId);
      }
    }
    res.json({ message: "DailyCheck erstellt" });
  } catch (error) {
    console.error("Fehler beim Erstellen:", error);
    res.status(500).json({ message: "Fehler beim Erstellen des Dailychecks" });
  }
};

// GET /dailyCheck/listWithViolations/:userId
export const listDailyChecksWithViolations = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const auth: any = (req as any).user;
    // Nur reine Affiliates ohne Kunde sperren
    if (auth?.isAffiliate && !auth?.isCustomer) {
      return res.status(403).json({ message: "Keine Berechtigung" });
    }

    const checks = await prisma.dailyCheck.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      include: { video: true, entries: { select: { fulfilled: true } } as any },
    } as any);

    const list = checks.map((c: any) => ({
      id: c.id,
      date: c.date,
      violationsCount: c.entries.filter((e: any) => !e.fulfilled).length,
      video: {
        id: c.video?.id,
        title: c.video?.title,
        archivedAt: c.video?.archivedAt,
        restoreStatus: c.video?.restoreStatus,
      },
    }));
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Fehler beim Laden der DailyChecks" });
  }
};

// GET /dailyCheck/violations/:dailyCheckId
export const getDailyCheckViolations = async (req: Request, res: Response) => {
  try {
    const { dailyCheckId } = req.params;
    const dc = await prisma.dailyCheck.findUnique({
      where: { id: dailyCheckId },
      include: { entries: { include: { requirement: true } }, video: true },
    });
    if (!dc) return res.status(404).json({ message: "DailyCheck nicht gefunden" });
    const violations = dc.entries.filter((e) => !e.fulfilled).map((e) => ({
      id: e.id,
      requirementId: e.requirementId,
      title: e.requirement.title,
      note: e.note,
    }));
    res.json({ date: dc.date, video: dc.video, violations });
  } catch (e) {
    res.status(500).json({ message: "Fehler beim Laden der Verstöße" });
  }
};

// POST /video/request/:dailyCheckId  → fordert ggf. Restore an
export const requestVideoDownload = async (req: Request, res: Response) => {
  try {
    const { dailyCheckId } = req.params;
    const dc = await prisma.dailyCheck.findUnique({ where: { id: dailyCheckId }, include: { video: true } });
    if (!dc || !dc.video) return res.status(404).json({ message: "Video nicht gefunden" });

    // Wenn bereits lokal/Hot ⇒ sofort ok
    if (!dc.video.archivedAt) {
      return res.json({ status: "HOT", url: dc.video.url });
    }

    // Falls bereits vorbereitet
    if ((dc.video as any).restoreUrl) {
      return res.json({ status: "READY", url: (dc.video as any).restoreUrl });
    }

    // Dummy: Stelle Restore an (nur DB-Flags setzen)
    await prisma.video.update({
      where: { id: dc.video.id },
      data: { restoreStatus: "REQUESTED", restoreRequestedAt: new Date() } as any,
    });

    return res.status(202).json({ status: "REQUESTED", message: "Video liegt im Cold Storage. Wiederherstellung angefragt – das kann etwas dauern." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Fehler bei der Video-Anfrage" });
  }
};

// GET /video/download/:dailyCheckId → liefert Datei oder meldet Status
export const downloadDailyCheckVideo = async (req: Request, res: Response) => {
  try {
    const { dailyCheckId } = req.params;
    const dc = await prisma.dailyCheck.findUnique({ where: { id: dailyCheckId }, include: { video: true } });
    if (!dc || !dc.video) return res.status(404).json({ message: "Video nicht gefunden" });

    // Hot/local verfügbar
    if (!dc.video.archivedAt) {
      const absolute = path.isAbsolute(dc.video.url) ? dc.video.url : path.resolve(process.cwd(), dc.video.url);
      if (!fs.existsSync(absolute)) return res.status(404).json({ message: "Datei nicht vorhanden" });
      return res.download(absolute);
    }

    // Falls bereits Restore-URL vorhanden (Dummy)
    if ((dc.video as any).restoreUrl) {
      return res.redirect((dc.video as any).restoreUrl);
    }

    return res.status(202).json({ status: "REQUESTED", message: "Video wird aus dem Cold Storage wiederhergestellt. Bitte später erneut versuchen." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Fehler beim Download" });
  }
};

export const getDailyChecksByUser = async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const auth: any = (req as any).user;
    if (!auth?.isCustomer && auth?.id !== userId) {
      return res.status(403).json({ message: "Keine Berechtigung für DailyChecks" });
    }
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

const checkAndEscalateFlags = async (userId: string) => {
  // Nur noch Flags, die noch nicht eskaliert wurden
  const userFlags = await prisma.flag.findMany({
    where: {
      userId,
      escalatedFrom: { none: {} }, // Noch nicht verwendet
    },
    orderBy: { createdAt: "asc" }, // Älteste zuerst eskalieren
  });

  const escalate = async (
    fromFlags: typeof userFlags,
    newColor: "YELLOW" | "RED"
  ) => {
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

const getAvailableFlags = async (userId: string, color: FlagColor) => {
  return prisma.flag.findMany({
    where: {
      userId,
      color,
      escalatedTo: { none: {} }, // Noch nie als Ausgangspunkt benutzt
    },
    orderBy: { createdAt: "asc" },
  });
};

export const checkMissedDailyChecks = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({ where: { isCustomer: true } });

    for (const user of users) {
      // Hole alle vorhandenen DailyChecks (z.B. der letzten 30 Tage)
      const checks = await prisma.dailyCheck.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: subDays(new Date(), 30) },
        },
        select: { createdAt: true },
      });

      const existingDates = checks.map((c) =>
        startOfDay(new Date(c.createdAt)).getTime()
      );

      // Checke die letzten 30 Tage
      for (let i = 0; i < 30; i++) {
        const date = startOfDay(subDays(new Date(), i));

        // Wenn an dem Tag kein DailyCheck gemacht wurde
        if (!existingDates.includes(date.getTime())) {
          // Ist der MissedCheck schon eingetragen?
          const alreadyLogged = await prisma.missedCheck.findFirst({
            where: { userId: user.id, date: date },
          });

          if (!alreadyLogged) {
            await prisma.missedCheck.create({
              data: {
                userId: user.id,
                date: date,
              },
            });
          }
        }
      }

      // Prüfe, ob es mindestens zwei nicht verarbeitete MissedChecks gibt
      const unflaggedMissed = await prisma.missedCheck.findMany({
        where: { userId: user.id, flagged: false },
        orderBy: { date: "asc" },
      });

      if (unflaggedMissed.length >= 2) {
        const missedDates = unflaggedMissed.slice(0, 2);

        // Rote Flagge erzeugen
        await prisma.flag.create({
          data: {
            userId: user.id,
            color: "RED",
            comment: `Kein Video hochgeladen am ${missedDates
              .map((d) => d.date.toLocaleDateString("de-DE"))
              .join(" & ")}`,
          },
        });

        // Markiere die MissedChecks als verarbeitet
        for (const missed of missedDates) {
          await prisma.missedCheck.update({
            where: { id: missed.id },
            data: { flagged: true },
          });
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Fehler beim Checken der DailyChecks" });
  }
};