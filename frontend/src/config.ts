// In dev, Vite proxies nothing special — we just point straight at the local
// backend. In production, set VITE_SERVER_URL to your deployed backend URL
// (see README.md for Render deployment instructions).
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";
export const API_URL = `${SERVER_URL}/api`;
