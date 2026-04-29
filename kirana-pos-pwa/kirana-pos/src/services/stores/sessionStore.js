import { openDB, SESSION_STORE } from "./core";

export async function saveSession(session) {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(SESSION_STORE, "readwrite");
    tx.objectStore(SESSION_STORE).put(session);
    tx.oncomplete = resolve;
  });
}

export async function getSession() {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(SESSION_STORE, "readonly");
    const req = tx.objectStore(SESSION_STORE).getAll();
    req.onsuccess = () => resolve(req.result[0] || null);
  });
}

export async function clearSession() {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(SESSION_STORE, "readwrite");
    tx.objectStore(SESSION_STORE).clear();
    tx.oncomplete = resolve;
  });
}
