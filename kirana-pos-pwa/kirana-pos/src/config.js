/**
 * Centralized frontend configuration.
 *
 * API_BASE controls where all backend HTTP calls go.
 *   - In LOCAL DEV: Vite proxies /api/* → localhost:5000 (see vite.config.js),
 *     so an empty string ("") works — all fetches use relative URLs.
 *   - In PRODUCTION (Vercel): vercel.json rewrites non-api routes to index.html;
 *     the VITE_API_URL env var points to the Render backend.
 *
 * A single source of truth prevents scattered hardcoded URLs.
 */
export const API_BASE = import.meta.env.VITE_API_URL || "";

/**
 * App-level constants
 */
export const APP_NAME = "Kirana POS";
export const APP_VERSION = "3.0.0";
