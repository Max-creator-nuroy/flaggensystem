import { Storage } from "@google-cloud/storage";
import path from "path";

const storage = new Storage({
  keyFilename: "PATH_ZUR_DEINER_SERVICE_ACCOUNT_JSON",
});
const bucketName = "test";

export const uploadToGCS = async (filePath: string, filename: string) => {
  const destination = `videos/${Date.now()}-${filename}`;
  await storage.bucket(bucketName).upload(filePath, { destination });
  return `gs://${bucketName}/${destination}`;
};
