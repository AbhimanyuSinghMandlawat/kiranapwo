import { openDB } from "./core";

export async function saveBillRecord(record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("bill_records", "readwrite");
    if (!record.id) record.id = crypto.randomUUID();
    record.createdAt = record.createdAt || Date.now();
    tx.objectStore("bill_records").put(record);
    tx.oncomplete = () => resolve(record.id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllBillRecords() {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction("bill_records", "readonly");
    const req = tx.objectStore("bill_records").getAll();
    req.onsuccess = () => resolve((req.result || []).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
  });
}
