import { openDB } from "./db";

const STORE = "customer_shops";


/**
 * Link customer to shop (create relation)
 */
export async function linkCustomerToShop({
  customerId,
  shopId
}) {

  const db = await openDB();

  const tx = db.transaction(STORE, "readwrite");

  const store = tx.objectStore(STORE);

  const relation = {
    id: crypto.randomUUID(),
    customerId,
    shopId,
    totalSpent: 0,
    visitCount: 0,
    loyaltyLevel: "bronze",
    createdAt: Date.now()
  };

  store.put(relation);

  return tx.complete;
}


/**
 * Get all shops linked to a customer
 */
export async function getCustomerShops(customerId) {

  const db = await openDB();

  return new Promise((resolve, reject) => {

    try {

      const tx = db.transaction(STORE, "readonly");

      const store = tx.objectStore(STORE);

      const index = store.index("customerId");

      const req = index.getAll(customerId);

      req.onsuccess = () => {

        resolve(req.result || []);

      };

      req.onerror = () => {

        console.error("Failed to fetch customer shops");

        resolve([]);

      };

    } catch (err) {

      console.error("Transaction failed:", err);

      resolve([]);

    }

  });

}


/**
 * Update loyalty stats (future safe)
 */
export async function updateCustomerShopStats({
  customerId,
  shopId,
  amount
}) {

  const db = await openDB();

  const tx = db.transaction(STORE, "readwrite");

  const store = tx.objectStore(STORE);

  const index = store.index("customerId");

  const relations = await new Promise(resolve => {

    const req = index.getAll(customerId);

    req.onsuccess = () => resolve(req.result || []);

    req.onerror = () => resolve([]);

  });

  const relation = relations.find(r => r.shopId === shopId);

  if (!relation) return;

  relation.totalSpent += amount;

  relation.visitCount += 1;

  store.put(relation);

  return tx.complete;
}