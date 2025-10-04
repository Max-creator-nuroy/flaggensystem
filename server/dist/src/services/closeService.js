"use strict";
// src/services/closeService.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeadById = getLeadById;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const CLOSE_API_KEY = process.env.CLOSE_API_KEY;
const CLOSE_BASE_URL = "https://api.close.com/api/v1";
async function getLeadById(leadId) {
    console.log("Jetzt API eingeben");
    const authHeader = Buffer.from(`${CLOSE_API_KEY}:`).toString("base64");
    const response = await axios_1.default.get(`${CLOSE_BASE_URL}/lead/${leadId}/`, {
        headers: {
            Accept: `application/json`,
            Authorization: `Basic ${authHeader}`,
        },
    });
    return response.data;
}
