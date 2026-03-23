import { getCurrentUser } from "../auth/authService";
import { openDB } from "./db";
import { queueSync } from "./syncService";

export async function logAudit({
  action,
  module,
  targetId = null,
  metadata = {}
}) {
  try {
    const db   = await openDB();
    const user = await getCurrentUser();

    const entry = {
      id:        crypto.randomUUID(),
      actorId:   user?.id   || "system",
      actorName: user?.username || user?.name || "System",
      actorRole: user?.role || "system",
      action,
      module,
      targetId,
      metadata,
      timestamp: Date.now(),
      date:      new Date().toLocaleDateString()
    };

    // ✅ FIXED: Use oncomplete pattern (not tx.done which is idb-only)
    await new Promise((resolve, reject) => {
      const tx    = db.transaction("audit_logs", "readwrite");
      const store = tx.objectStore("audit_logs");
      store.add(entry);
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });

    // Queue for MySQL sync in the background (non-blocking)
    queueSync("audit_log", entry).catch(() => {});

  } catch (err) {
    console.warn("Audit log failed:", err);
  }
}