import { openDB } from "./db";

const STORE = "customer_shops";

/**
 * Link customer to shop
 */
export async function linkCustomerToShop(customerId, shopId) {

  if (!customerId || !shopId) return;

  const db = await openDB();

  return new Promise((resolve, reject) => {

    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);

    const id = customerId + "_" + shopId;

    const req = store.get(id);

    req.onsuccess = () => {

      if (req.result) {
        resolve(false);
        return;
      }

      store.put({
        id,
        customerId,
        shopId,
        totalSpent: 0,
        visitCount: 0,
        joinedAt: Date.now()
      });
    };

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get all shops linked to a customer
 */
export async function getCustomerShops(customerId) {

  const db = await openDB();

  return new Promise((resolve) => {

    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const index = store.index("customerId");

    const req = index.getAll(customerId);

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}

/**
 * Update shop stats safely
 */
export async function updateCustomerShopStats({ customerId, shopId, amount }) {

  if (!customerId || !shopId || !amount) return;

  const db = await openDB();

  return new Promise((resolve, reject) => {

    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);

    const id = customerId + "_" + shopId;

    const req = store.get(id);

    req.onsuccess = () => {

      const relation = req.result;

      if (!relation) {
        resolve(false);
        return;
      }

      relation.totalSpent = (relation.totalSpent || 0) + amount;
      relation.visitCount = (relation.visitCount || 0) + 1;

      store.put(relation);
    };

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}