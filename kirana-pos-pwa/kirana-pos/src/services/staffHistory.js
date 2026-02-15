import { addStaffHistory, getStaffHistory as dbGetStaffHistory } from "./db";

/* =========================================================
   UNIVERSAL STAFF AUDIT LOGGER
   Safe against bad callers
========================================================= */
export async function logStaffAction(actor, payload = {}) {

  // If actor missing → do nothing (system action)
  if (!actor) return;

  // If someone called incorrectly: logStaffAction(actor)
  if (typeof payload !== "object") return;

  const {
    module = "general",
    action = "unknown",
    summary = "Activity recorded",
    details = {},
    targetStaffId = null
  } = payload;

  try {
    const record = {
      id: crypto.randomUUID(),

      // who performed action
      staffId: targetStaffId || actor.id,
      staffName: actor.name || "Unknown",
      role: actor.role || "unknown",

      module,
      action,
      summary,
      details,

      timestamp: Date.now()
    };

    await addStaffHistory(record);

  } catch (err) {
    // NEVER crash the app because of logging
    console.warn("Audit log failed:", err);
  }
}

/* =========================================================
   HISTORY READER
========================================================= */
export async function getStaffHistory(staffId) {
  const records = await dbGetStaffHistory(staffId);

  // newest first
  records.sort((a, b) => b.timestamp - a.timestamp);

  return records.map(r => ({
    ...r,
    formattedTime: new Date(r.timestamp).toLocaleString(),
    summary: r.summary || "Activity recorded",
    module: r.module || "general",
    action: r.action || "unknown",
    details: r.details || {}
  }));
}

/* =========================================================
   GROUP BY DATE (future use)
========================================================= */
export function groupHistoryByDate(history) {
  const map = {};

  history.forEach(h => {
    const date = new Date(h.timestamp).toDateString();
    if (!map[date]) map[date] = [];
    map[date].push(h);
  });

  return map;
}
