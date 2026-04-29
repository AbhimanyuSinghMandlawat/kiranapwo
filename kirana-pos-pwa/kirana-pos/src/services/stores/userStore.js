import { openDB, USER_STORE } from "./core";

export async function saveUser(user) {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(USER_STORE, "readwrite");
    tx.objectStore(USER_STORE).put(user);
    tx.oncomplete = resolve;
  });
}

export async function getAllUsers() {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(USER_STORE, "readonly");
    const req = tx.objectStore(USER_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
  });
}

export async function getUserByUsername(username) {
  const users = await getAllUsers();
  return users.find(u => u.username === username);
}

export async function updateUser(user) {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction("users", "readwrite");
    tx.objectStore("users").put(user);
    tx.oncomplete = resolve;
  });
}
