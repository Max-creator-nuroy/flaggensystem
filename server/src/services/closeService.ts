// src/services/closeService.ts

import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const CLOSE_API_KEY = process.env.CLOSE_API_KEY;
const CLOSE_BASE_URL = "https://api.close.com/api/v1";

export async function getLeadById(leadId: string) {
  const authHeader = Buffer.from(`${CLOSE_API_KEY}:`).toString("base64");

  const response = await axios.get(`${CLOSE_BASE_URL}/lead/${leadId}/`, {
    headers: {
      Authorization: `Basic ${authHeader}`,
    },
  });

  return response.data;
}
