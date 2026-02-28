import { getCurrentUser } from "../auth/authService";
import { openDB } from "./db";

export async function logAudit({
  action,
  module,
  targetId = null,
  metadata = {}
}) {
  try {
    const db = await openDB();
    const user = await getCurrentUser();

    const tx = db.transaction("audit_logs", "readwrite");
    const store = tx.objectStore("audit_logs");

    const entry = {
      id: crypto.randomUUID(),
      actorId: user?.id || "system",
      actorName: user?.name || "System",
      actorRole: user?.role || "system",
      action,
      module,
      targetId,
      metadata,
      timestamp: Date.now(),
      date: new Date().toLocaleDateString()
    };

    store.add(entry);
    await tx.done;

  } catch (err) {
    console.warn("Audit log failed:", err);
  }
}