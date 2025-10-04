"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToGCS = void 0;
const storage_1 = require("@google-cloud/storage");
const storage = new storage_1.Storage({
    keyFilename: "PATH_ZUR_DEINER_SERVICE_ACCOUNT_JSON",
});
const bucketName = "test";
const uploadToGCS = async (filePath, filename) => {
    const destination = `videos/${Date.now()}-${filename}`;
    await storage.bucket(bucketName).upload(filePath, { destination });
    return `gs://${bucketName}/${destination}`;
};
exports.uploadToGCS = uploadToGCS;
