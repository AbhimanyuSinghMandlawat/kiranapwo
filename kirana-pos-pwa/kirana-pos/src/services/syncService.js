import { openDB } from "./db";
import { getShopSettings } from "./db";

// In production (Vercel) /api/* is proxied to Render via vercel.json.
// In local dev /api/* is proxied to localhost:5000 via vite.config.js.
// Empty string = relative URL → works in both environments.
const rawApiUrl = import.meta.env.VITE_API_URL || "https://kiranapwoo-backend.onrender.com";
const API_BASE = rawApiUrl.endsWith("/") ? rawApiUrl.slice(0, -1) : rawApiUrl;

const MAX_RETRIES = 5;  // abandon item after 5 consecutive failures

/* -------------------------------------------------------
   Queue a record to be synced to MySQL later
------------------------------------------------------- */
export async function queueSync(type, payload) {
  const db = await openDB();

  return new Promise(resolve => {
    const tx = db.transaction("sync_queue", "readwrite");
    const store = tx.objectStore("sync_queue");

    store.add({
      id: crypto.randomUUID(),
      type,
      payload,
      synced: false,
      failed: false,
      retryCount: 0,          // ✅ FIX: track retry attempts
      lastError: null,
      createdAt: Date.now()
    });

    tx.oncomplete = resolve;
    tx.onerror = () => resolve(); // Don't crash if queue writing fails
  });
}

/* -------------------------------------------------------
   Read the backend JWT token stored in settings after login
------------------------------------------------------- */
async function getAuthToken() {
  try {
    const settings = await getShopSettings();
    return settings?.backendToken || null;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------
   Save backend JWT token after successful login
   Called from ShopSettings.js
------------------------------------------------------- */
export async function saveBackendToken(token) {
  const { saveShopSettings, getShopSettings } = await import("./db");
  const existing = await getShopSettings() || {};
  await saveShopSettings({ ...existing, backendToken: token });
}

/* -------------------------------------------------------
   Push all unsynced queue items to MySQL backend
------------------------------------------------------- */
export async function syncPending() {
  if (!navigator.onLine) {
    console.log("[sync] Offline – skipping sync");
    return;
  }

  const token = await getAuthToken();
  if (!token) {
    console.warn("[sync] No backend token – register/login to enable cloud sync");
    return;
  }

  const db = await openDB();

  const items = await new Promise(resolve => {
    const tx = db.transaction("sync_queue", "readonly");
    const store = tx.objectStore("sync_queue");
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
  });

  // ✅ FIX: filter out items that hit the retry cap (retryCount >= MAX_RETRIES)
  const pending = items.filter(i => !i.synced && !i.failed && (i.retryCount || 0) < MAX_RETRIES);

  if (pending.length === 0) {
    const abandoned = items.filter(i => !i.synced && (i.retryCount || 0) >= MAX_RETRIES);
    if (abandoned.length > 0) {
      console.warn(`[sync] ${abandoned.length} item(s) abandoned after ${MAX_RETRIES} retries`);
    } else {
      console.log("[sync] Nothing pending to sync");
    }
    return;
  }

  console.log(`[sync] Syncing ${pending.length} pending item(s)...`);

  // ✅ Queue-based: process one at a time in FIFO order
  const sorted = [...pending].sort((a, b) => a.createdAt - b.createdAt);

  for (const item of sorted) {
    try {
      await sendToServer(item, token);

      // Mark as synced in a fresh transaction
      await new Promise(resolve => {
        const tx = db.transaction("sync_queue", "readwrite");
        const store = tx.objectStore("sync_queue");
        item.synced = true;
        item.syncedAt = Date.now();
        store.put(item);
        tx.oncomplete = resolve;
      });

      console.log(`[sync] ✅ Synced ${item.type} (${item.id})`);

    } catch (err) {
      const retryCount = (item.retryCount || 0) + 1;
      const abandoned = retryCount >= MAX_RETRIES;

      console.warn(
        `[sync] ❌ Failed ${item.type} (${item.id}) [attempt ${retryCount}/${MAX_RETRIES}]: ${err.message}`
      );
      if (abandoned) {
        console.error(`[sync] 🚫 Abandoning ${item.type} (${item.id}) – max retries reached`);
      }

      // ✅ FIX: track retryCount, mark abandoned after MAX_RETRIES
      await new Promise(resolve => {
        const tx = db.transaction("sync_queue", "readwrite");
        const store = tx.objectStore("sync_queue");
        item.retryCount = retryCount;
        item.failed = abandoned;   // only permanently failed when capped
        item.lastError = err.message;
        store.put(item);
        tx.oncomplete = resolve;
      });
    }
  }

  console.log("[sync] Sync cycle complete");
}

/* -------------------------------------------------------
   Retry items previously marked as failed
   Called automatically when internet comes back online
------------------------------------------------------- */
export async function retrySyncFailed() {
  const db = await openDB();

  await new Promise(resolve => {
    const tx = db.transaction("sync_queue", "readwrite");
    const store = tx.objectStore("sync_queue");
    const req = store.getAll();

    req.onsuccess = () => {
      // ✅ FIX: only reset items that haven't hit the cap
      const retryable = (req.result || []).filter(
        i => i.failed && !i.synced && (i.retryCount || 0) < MAX_RETRIES
      );
      for (const item of retryable) {
        item.failed = false;  // allow syncPending() to pick it up
        store.put(item);
      }
      if (retryable.length > 0) {
        console.log(`[sync] 🔄 Reset ${retryable.length} failed item(s) for retry`);
      }
      resolve();
    };
  });

  await syncPending();
}

/* -------------------------------------------------------
   Auto-trigger sync when browser comes online.
   Called once at app startup from main.js.
------------------------------------------------------- */
export function initSyncListener() {
  // Sync immediately on startup (catches anything queued while offline)
  setTimeout(() => syncPending(), 2000);

  // Sync whenever we come back online
  window.addEventListener("online", () => {
    console.log("[sync] 🌐 Back online – triggering sync...");
    retrySyncFailed();
  });

  // Also sync every 60 seconds while the app is open
  setInterval(() => {
    if (navigator.onLine) syncPending();
  }, 60_000);

  console.log("[sync] Sync listener registered ✅");
}

/* -------------------------------------------------------
   Send one queue item to the correct API endpoint
------------------------------------------------------- */
async function sendToServer(item, token) {
  const endpointMap = {
    sale: "/api/sales",
    customer: "/api/customers",
    stock: "/api/stocks",
    coupon: "/api/coupons",
    audit_log: "/api/audit-logs",
    daily_summary: "/api/daily-summary"
  };

  const endpoint = endpointMap[item.type];
  if (!endpoint) {
    console.warn(`[sync] Unknown type: ${item.type} – skipping`);
    return;   // treat as success so it doesn't block the queue
  }

  const res = await fetch(API_BASE + endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(item.payload)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text.substring(0, 200)}`);
  }
}

/* -------------------------------------------------------
   Get sync queue stats — used by ShopSettings status panel
------------------------------------------------------- */
export async function getSyncStats() {
  try {
    const db = await openDB();
    const items = await new Promise(resolve => {
      const tx = db.transaction("sync_queue", "readonly");
      const req = tx.objectStore("sync_queue").getAll();
      req.onsuccess = () => resolve(req.result || []);
    });

    return {
      total: items.length,
      synced: items.filter(i => i.synced).length,
      pending: items.filter(i => !i.synced && !i.failed && (i.retryCount || 0) < MAX_RETRIES).length,
      failed: items.filter(i => i.failed || (i.retryCount || 0) >= MAX_RETRIES).length,
      abandoned: items.filter(i => !i.synced && (i.retryCount || 0) >= MAX_RETRIES).length,
    };
  } catch {
    return { total: 0, synced: 0, pending: 0, failed: 0, abandoned: 0 };
  }
}