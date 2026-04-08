/**
 * EcoSentinel API Client
 */
import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({ baseURL: BASE, timeout: 15_000 });

// ── Data ──────────────────────────────────────────────────────────────────────
export const fetchReadings  = (city = "delhi", limit = 100) =>
  api.get("/data/",       { params: { city, limit } }).then(r => r.data);

export const fetchLatest    = (city = "delhi") =>
  api.get("/data/latest", { params: { city } }).then(r => r.data);

export const fetchStats     = (city = "delhi") =>
  api.get("/data/stats",  { params: { city } }).then(r => r.data);

// ── CSV Upload ─────────────────────────────────────────────────────────────────
export const uploadCSV = (file) => {
  const form = new FormData();
  form.append("file", file);
  return api.post("/upload-csv", form, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then(r => r.data);
};

// ── Alerts ─────────────────────────────────────────────────────────────────────
export const fetchAlerts       = (params = {}) => api.get("/alerts/",       { params }).then(r => r.data);
export const fetchAlertSummary = ()             => api.get("/alerts/summary"          ).then(r => r.data);
export const clearAlerts       = (city)         => api.delete("/alerts/clear", { params: city ? { city } : {} }).then(r => r.data);

// ── Predictions ────────────────────────────────────────────────────────────────
export const fetchPrediction    = (city = "delhi", hours_ahead = 48) =>
  api.get("/predict/",    { params: { city, hours_ahead } }).then(r => r.data);

export const fetchAQIPrediction = (city = "delhi", hours_ahead = 24) =>
  api.get("/predict/aqi", { params: { city, hours_ahead } }).then(r => r.data);

// ── Health ─────────────────────────────────────────────────────────────────────
export const fetchHealth = () => api.get("/health").then(r => r.data);

export default api;
