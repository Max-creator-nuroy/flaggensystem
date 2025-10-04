"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.archiveVideoToColdStorage = archiveVideoToColdStorage;
exports.archiveOldVideos = archiveOldVideos;
const client_1 = require("@prisma/client");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const storage_1 = require("@google-cloud/storage");
const prisma = new client_1.PrismaClient();
// Environment config (set real values in .env)
const COLD_PROVIDER = (process.env.COLD_STORAGE_PROVIDER || "GCS").toUpperCase(); // GCS, S3, ...
const GCS_KEYFILE = process.env.GCS_KEYFILE || "PATH_ZUR_DEINER_SERVICE_ACCOUNT_JSON"; // TODO: set real path
const GCS_COLD_BUCKET = process.env.GCS_COLD_BUCKET || "dummy-cold-bucket"; // TODO: set real bucket
const GCS_REGION = process.env.GCS_COLD_REGION || "europe-west3"; // TODO: set region
const COLD_DELETE_LOCAL = (process.env.COLD_DELETE_LOCAL || "false").toLowerCase() === "true"; // optional
const DEFAULT_GCS_STORAGE_CLASS = process.env.GCS_COLD_STORAGE_CLASS || "COLDLINE"; // or ARCHIVE
let gcs;
function getGCS() {
    if (!gcs) {
        gcs = new storage_1.Storage({ keyFilename: GCS_KEYFILE });
    }
    return gcs;
}
function toLocalAbsolutePath(possibleRelative) {
    if (path_1.default.isAbsolute(possibleRelative))
        return possibleRelative;
    // Try resolve from server root
    const absFromCwd = path_1.default.resolve(process.cwd(), possibleRelative);
    if (fs_1.default.existsSync(absFromCwd))
        return absFromCwd;
    // Try common folder for uploads "server/Videos"
    const base = path_1.default.resolve(process.cwd(), "server", "Videos");
    const tail = path_1.default.basename(possibleRelative);
    const try2 = path_1.default.join(base, tail);
    return try2;
}
function makeColdKey(video) {
    const d = new Date(video.createdAt);
    const yyyy = d.getFullYear();
    const mm = `${d.getMonth() + 1}`.padStart(2, "0");
    const ext = path_1.default.extname(video.url) || ".mp4";
    return `videos/${video.userId}/${yyyy}-${mm}/${video.id}-${d.getTime()}${ext}`;
}
async function archiveVideoToColdStorage(videoId) {
    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (!video)
        throw new Error("Video not found");
    if (video.archivedAt)
        return { skipped: true, reason: "already archived" };
    // Use hotUrl if present (cast to any to avoid TS errors until migration applied)
    const hotUrl = video.hotUrl;
    const localPath = toLocalAbsolutePath(hotUrl || video.url);
    const exists = fs_1.default.existsSync(localPath);
    if (COLD_PROVIDER === "GCS") {
        const storage = getGCS();
        const bucket = storage.bucket(GCS_COLD_BUCKET);
        const destination = makeColdKey({
            id: video.id,
            userId: video.userId,
            createdAt: video.createdAt,
            url: video.url,
        });
        if (!exists) {
            // Mark as archived with placeholder key to avoid blocking
            const updateData = {
                archivedAt: new Date(),
                coldBucket: GCS_COLD_BUCKET,
                coldKey: destination,
                coldRegion: GCS_REGION,
                hotUrl: video.url,
            };
            await prisma.video.update({ where: { id: video.id }, data: updateData });
            return { uploaded: false, reason: "local file not found" };
        }
        await bucket.upload(localPath, {
            destination,
            metadata: { storageClass: DEFAULT_GCS_STORAGE_CLASS },
        });
        const updateData = {
            archivedAt: new Date(),
            coldBucket: GCS_COLD_BUCKET,
            coldKey: destination,
            coldRegion: GCS_REGION,
            hotUrl: video.url,
        };
        await prisma.video.update({ where: { id: video.id }, data: updateData });
        if (COLD_DELETE_LOCAL && exists) {
            try {
                fs_1.default.unlinkSync(localPath);
            }
            catch { /* ignore */ }
        }
        return { uploaded: true, bucket: GCS_COLD_BUCKET, key: destination };
    }
    return { skipped: true, reason: "Unsupported provider" };
}
async function archiveOldVideos(days = 5) {
    const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const candidates = await prisma.video.findMany({
        where: {
            createdAt: { lte: threshold },
            archivedAt: null,
        },
        take: 500,
        orderBy: { createdAt: "asc" },
    });
    const results = [];
    for (const v of candidates) {
        try {
            const r = await archiveVideoToColdStorage(v.id);
            results.push({ id: v.id, ...r });
        }
        catch (e) {
            results.push({ id: v.id, error: e?.message || String(e) });
        }
    }
    return { count: candidates.length, results };
}
