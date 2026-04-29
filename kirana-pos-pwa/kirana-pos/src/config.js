// src/config.js

const raw = import.meta.env.VITE_API_BASE_URL || "";

// Strips ANY trailing slash(es) so paths like /api/login never become //api/login
export const API_BASE = raw.replace(/\/+$/, "");