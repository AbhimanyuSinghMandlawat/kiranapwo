import { openDB } from "./db";

const STORE = "staff_history";

export async function logStaffAction(
  staffId,
  action,
  oldValue,
  newValue,
  changedBy
) {
  const db = await openDB();

  return new Promise(resolve => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({
      id: crypto.randomUUID(),
      staffId,
      action,
      oldValue,
      newValue,
      changedBy,
      timestamp: Date.now()
    });

    tx.oncomplete = resolve;
  });
}

export async function getStaffHistory(staffId) {
  const db = await openDB();

  return new Promise(resolve => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);

    const req = store.getAll();

    req.onsuccess = () => {
      const all = req.result || [];

      const filtered = all.filter(h => h.staffId === staffId);

      filtered.sort((a, b) => b.timestamp - a.timestamp);

      resolve(filtered);
    };
  });
}
