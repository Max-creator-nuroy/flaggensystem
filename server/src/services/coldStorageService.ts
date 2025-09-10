import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";
import { Storage } from "@google-cloud/storage";

const prisma = new PrismaClient();

// Environment config (set real values in .env)
const COLD_PROVIDER = (process.env.COLD_STORAGE_PROVIDER || "GCS").toUpperCase(); // GCS, S3, ...
const GCS_KEYFILE = process.env.GCS_KEYFILE || "PATH_ZUR_DEINER_SERVICE_ACCOUNT_JSON"; // TODO: set real path
const GCS_COLD_BUCKET = process.env.GCS_COLD_BUCKET || "dummy-cold-bucket"; // TODO: set real bucket
const GCS_REGION = process.env.GCS_COLD_REGION || "europe-west3"; // TODO: set region
const COLD_DELETE_LOCAL = (process.env.COLD_DELETE_LOCAL || "false").toLowerCase() === "true"; // optional
const DEFAULT_GCS_STORAGE_CLASS = process.env.GCS_COLD_STORAGE_CLASS || "COLDLINE"; // or ARCHIVE

let gcs: Storage | undefined;
function getGCS() {
  if (!gcs) {
    gcs = new Storage({ keyFilename: GCS_KEYFILE });
  }
  return gcs;
}

function toLocalAbsolutePath(possibleRelative: string): string {
  if (path.isAbsolute(possibleRelative)) return possibleRelative;
  // Try resolve from server root
  const absFromCwd = path.resolve(process.cwd(), possibleRelative);
  if (fs.existsSync(absFromCwd)) return absFromCwd;
  // Try common folder for uploads "server/Videos"
  const base = path.resolve(process.cwd(), "server", "Videos");
  const tail = path.basename(possibleRelative);
  const try2 = path.join(base, tail);
  return try2;
}

function makeColdKey(video: { id: string; userId: string; createdAt: Date; url: string }): string {
  const d = new Date(video.createdAt);
  const yyyy = d.getFullYear();
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const ext = path.extname(video.url) || ".mp4";
  return `videos/${video.userId}/${yyyy}-${mm}/${video.id}-${d.getTime()}${ext}`;
}

export async function archiveVideoToColdStorage(videoId: string) {
  const video = await prisma.video.findUnique({ where: { id: videoId } });
  if (!video) throw new Error("Video not found");
  if (video.archivedAt) return { skipped: true, reason: "already archived" };

  // Use hotUrl if present (cast to any to avoid TS errors until migration applied)
  const hotUrl = (video as any).hotUrl as string | undefined;
  const localPath = toLocalAbsolutePath(hotUrl || video.url);
  const exists = fs.existsSync(localPath);

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
      const updateData: any = {
        archivedAt: new Date(),
        coldBucket: GCS_COLD_BUCKET,
        coldKey: destination,
        coldRegion: GCS_REGION,
        hotUrl: video.url,
      };
      await prisma.video.update({ where: { id: video.id }, data: updateData as any });
      return { uploaded: false, reason: "local file not found" };
    }

    await bucket.upload(localPath, {
      destination,
      metadata: { storageClass: DEFAULT_GCS_STORAGE_CLASS },
    });

    const updateData: any = {
      archivedAt: new Date(),
      coldBucket: GCS_COLD_BUCKET,
      coldKey: destination,
      coldRegion: GCS_REGION,
      hotUrl: video.url,
    };
    await prisma.video.update({ where: { id: video.id }, data: updateData as any });

    if (COLD_DELETE_LOCAL && exists) {
      try { fs.unlinkSync(localPath); } catch { /* ignore */ }
    }

    return { uploaded: true, bucket: GCS_COLD_BUCKET, key: destination };
  }

  return { skipped: true, reason: "Unsupported provider" };
}

export async function archiveOldVideos(days = 5) {
  const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const candidates = await prisma.video.findMany({
    where: {
      createdAt: { lte: threshold },
      archivedAt: null,
    },
    take: 500,
    orderBy: { createdAt: "asc" },
  });

  const results: any[] = [];
  for (const v of candidates) {
    try {
      const r = await archiveVideoToColdStorage(v.id);
      results.push({ id: v.id, ...r });
    } catch (e: any) {
      results.push({ id: v.id, error: e?.message || String(e) });
    }
  }
  return { count: candidates.length, results };
}
