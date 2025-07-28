// src/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api", // deine Backend-URL
});

// Automatisch JWT mitschicken
api.interceptors.request.use((config: any) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
