// src/api.ts
import axios from "axios";
import { logout, isTokenExpired } from "./getTokenFromLokal";

const api = axios.create({
  baseURL: "http://localhost:3000", // deine Backend-URL
});

// Automatisch JWT mitschicken und Token-Validierung
api.interceptors.request.use((config: any) => {
  const token = localStorage.getItem("token");
  if (token) {
    // Check if token is expired before making the request
    if (isTokenExpired(token)) {
      logout();
      return Promise.reject(new Error('Token expired'));
    }
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor für automatisches Logout bei 401 Fehlern
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token ist abgelaufen oder ungültig
      logout();
      return Promise.reject(new Error('Session expired. Please log in again.'));
    }
    return Promise.reject(error);
  }
);

export default api;
