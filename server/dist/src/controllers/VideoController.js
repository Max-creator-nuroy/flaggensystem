"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeVideoWithGemini = exports.deleteVideo = exports.updateVideo = exports.getVideosByUser = exports.getVideoById = exports.createVideo = void 0;
const client_1 = require("@prisma/client");
const child_process_1 = require("child_process");
const fs = require("fs");
const prisma = new client_1.PrismaClient();
const createVideo = async (req, res) => {
    try {
        const { title, url, userId } = req.body;
        const newVideo = await prisma.video.create({
            data: {
                title,
                url,
                userId,
            },
        });
        res.status(201).json(newVideo);
    }
    catch (err) {
        res.status(500).json({ error: "Fehler beim Erstellen des Videos." });
    }
};
exports.createVideo = createVideo;
const getVideoById = async (req, res) => {
    try {
        const { id } = req.params;
        const video = await prisma.video.findUnique({
            where: { id },
        });
        if (!video) {
            return res.status(404).json({ error: "Video nicht gefunden." });
        }
        res.status(200).json(video);
    }
    catch (err) {
        res.status(500).json({ error: "Fehler beim Abrufen des Videos." });
    }
};
exports.getVideoById = getVideoById;
const getVideosByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const videos = await prisma.video.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
        res.status(200).json(videos);
    }
    catch (err) {
        res.status(500).json({ error: "Fehler beim Abrufen der Videos." });
    }
};
exports.getVideosByUser = getVideosByUser;
const updateVideo = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, url, archivedAt } = req.body;
        const updated = await prisma.video.update({
            where: { id },
            data: {
                title,
                url,
                archivedAt,
            },
        });
        res.status(200).json(updated);
    }
    catch (err) {
        res.status(500).json({ error: "Fehler beim Aktualisieren des Videos." });
    }
};
exports.updateVideo = updateVideo;
const deleteVideo = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.video.delete({
            where: { id },
        });
        res.status(200).json({ message: "Video gelöscht." });
    }
    catch (err) {
        res.status(500).json({ error: "Fehler beim Löschen des Videos." });
    }
};
exports.deleteVideo = deleteVideo;
const analyzeVideoWithGemini = (video, criteriaList) => {
    return new Promise((resolve, reject) => {
        console.log("🔍 VideoController: video.path received:", video.path);
        const fileName = "criteria_temp_" + Date.now() + ".json";
        fs.writeFileSync(fileName, JSON.stringify(criteriaList), "utf8");
        const command = `python3 src/python/analyze_video.py "${video.path}" "${fileName}"`;
        console.log("🔍 VideoController: executing command:", command);
        (0, child_process_1.exec)(command, (err, stdout, stderr) => {
            fs.unlinkSync(fileName); // Datei auf jeden Fall löschen (auch bei Fehlern)
            if (err) {
                console.error("❌ Fehler beim Ausführen:", stderr);
                console.error("Fehler beim Erstellen:", err);
                // Reject the promise when Python analysis fails
                // This will prevent the DailyCheck from being created
                reject(new Error(`Video-Analyse fehlgeschlagen: ${err.message}`));
                return;
            }
            try {
                const result = JSON.parse(stdout);
                const rawText = result.text;
                const match = rawText.match(/```json\s*([\s\S]*?)\s*```/);
                if (!match) {
                    reject(new Error("⚠️ Kein gültiger JSON-Block in Gemini-Antwort"));
                    return;
                }
                const parsed = JSON.parse(match[1]);
                console.log(parsed);
                resolve(parsed); // ← Promise korrekt auflösen
            }
            catch (jsonErr) {
                console.error("❌ Fehler beim Parsen der Gemini-Antwort:", jsonErr);
                reject(jsonErr);
            }
        });
    });
};
exports.analyzeVideoWithGemini = analyzeVideoWithGemini;
const buildPromptFromCriteria = (criteriaList) => {
    let prompt = `Please analyze the following sequence of video frames and respond to the following questions with either true or false:

  Here are the Questions: 1.Hat der User 2 Nachrichten geschickt ? 2.Hat der Benutzer 2 Storys gepostet?`;
    // criteriaList.forEach((item: any) => {
    //   prompt += `{ "id": "${item.id}" "criteria":"${item.description}"} `;
    // });
    console.log(prompt);
    return prompt;
};
