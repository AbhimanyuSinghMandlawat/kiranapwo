import { openDB } from "./core";

export async function saveSupplier(supplier) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("suppliers", "readwrite");
    const store = tx.objectStore("suppliers");
    if (!supplier.id) supplier.id = crypto.randomUUID();
    supplier.createdAt = supplier.createdAt || Date.now();
    store.put(supplier);
    tx.oncomplete = () => resolve(supplier.id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllSuppliers() {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction("suppliers", "readonly");
    const req = tx.objectStore("suppliers").getAll();
    req.onsuccess = () => resolve(req.result || []);
  });
}

export async function getSupplierByName(name) {
  const all = await getAllSuppliers();
  return all.find(s => s.name && s.name.toLowerCase() === name.toLowerCase()) || null;
}
