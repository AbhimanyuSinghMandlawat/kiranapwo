import { openDB } from "./db";

export async function createShop(shop) {

  const db = await openDB();

  const tx = db.transaction("shops", "readwrite");

  tx.objectStore("shops").put(shop);

  return tx.complete;
}

export async function getAllShops() {

  const db = await openDB();

  return new Promise(resolve => {

    const req =
      db.transaction("shops")
        .objectStore("shops")
        .getAll();

    req.onsuccess = () =>
      resolve(req.result || []);

  });
}