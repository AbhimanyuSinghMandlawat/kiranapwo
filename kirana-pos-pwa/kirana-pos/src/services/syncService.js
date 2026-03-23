import { openDB } from "./db";
import { getShopSettings } from "./db";

const API_BASE = "http://localhost:5000";

/* -------------------------------------------------------
   Queue a record to be synced to MySQL later
------------------------------------------------------- */
export async function queueSync(type, payload) {
  const db = await openDB();

  return new Promise(resolve => {
    const tx    = db.transaction("sync_queue", "readwrite");
    const store = tx.objectStore("sync_queue");

    store.add({
      id:        crypto.randomUUID(),
      type,
      payload,
      synced:    false,
      failed:    false,
      createdAt: Date.now()
    });

    tx.oncomplete = resolve;
    tx.onerror    = () => resolve(); // Don't crash if queue writing fails
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
    const tx    = db.transaction("sync_queue", "readonly");
    const store = tx.objectStore("sync_queue");
    const req   = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
  });

  const pending = items.filter(i => !i.synced && !i.failed);

  if (pending.length === 0) {
    console.log("[sync] Nothing pending to sync");
    return;
  }

  console.log(`[sync] Syncing ${pending.length} pending item(s)...`);

  for (const item of pending) {
    try {
      await sendToServer(item, token);

      // Mark as synced
      await new Promise(resolve => {
        const tx    = db.transaction("sync_queue", "readwrite");
        const store = tx.objectStore("sync_queue");
        item.synced = true;
        store.put(item);
        tx.oncomplete = resolve;
      });

      console.log(`[sync] ✅ Synced ${item.type} (${item.id})`);

    } catch (err) {
      console.warn(`[sync] ❌ Failed to sync ${item.type} (${item.id}):`, err.message);

      // Mark as failed so we don't hammer the server on every boot
      await new Promise(resolve => {
        const tx    = db.transaction("sync_queue", "readwrite");
        const store = tx.objectStore("sync_queue");
        item.failed = true;
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
    const tx    = db.transaction("sync_queue", "readwrite");
    const store = tx.objectStore("sync_queue");
    const req   = store.getAll();

    req.onsuccess = () => {
      const failed = (req.result || []).filter(i => i.failed && !i.synced);
      for (const item of failed) {
        item.failed = false;
        store.put(item);
      }
      resolve();
    };
  });

  await syncPending();
}

/* -------------------------------------------------------
   ✅ FIX 5 + 6: Auto-trigger sync when browser comes online.
   Call initSyncListener() once at app startup from main.js.
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
    sale:          "/api/sales",
    customer:      "/api/customers",
    stock:         "/api/stocks",
    coupon:        "/api/coupons",
    audit_log:     "/api/audit-logs",
    daily_summary: "/api/daily-summary"
  };

  const endpoint = endpointMap[item.type];
  if (!endpoint) {
    console.warn(`[sync] Unknown type: ${item.type} – skipping`);
    return;
  }

  const res = await fetch(API_BASE + endpoint, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(item.payload)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
}