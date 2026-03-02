import { openDB } from "./db";

const LOYALTY_LEVELS = [
  { level: "platinum", min: 50000 },
  { level: "gold", min: 15000 },
  { level: "silver", min: 5000 },
  { level: "bronze", min: 0 }
];

export async function updateCustomerLoyalty(customerId, amount) {

  if (!customerId || amount <= 0) return;

  const db = await openDB();

  return new Promise((resolve, reject) => {

    const tx = db.transaction("customers", "readwrite");
    const store = tx.objectStore("customers");

    const getReq = store.get(customerId);

    getReq.onsuccess = () => {
      const customer = getReq.result;

      if (!customer) {
        console.error("Customer not found:", customerId);
        resolve();
        return;
      }

      customer.lifetimeSpend = (customer.lifetimeSpend || 0) + amount;
      customer.visitCount = (customer.visitCount || 0) + 1;
      customer.loyaltyLevel = calculateLoyaltyLevel(customer.lifetimeSpend);
      customer.updatedAt = Date.now();

      store.put(customer);
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCustomerLoyalty(customerId) {

  const db = await openDB();
  const tx = db.transaction("customers", "readonly");
  const store = tx.objectStore("customers");

  const customer = await store.get(customerId);
  return customer?.loyaltyLevel || "bronze";
}

function calculateLoyaltyLevel(spend) {
  for (const tier of LOYALTY_LEVELS) {
    if (spend >= tier.min) return tier.level;
  }
  return "bronze";
}