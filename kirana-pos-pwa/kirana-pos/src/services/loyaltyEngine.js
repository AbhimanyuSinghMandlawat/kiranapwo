import { computeCustomerAccounts } from "./accountingEngine";
import { getAllSales,openDB } from "./db";

export async function buildCustomerLoyaltyProfiles() {

  const sales = await getAllSales();
  const accounts = await computeCustomerAccounts();

  const profiles = {};

  for (const sale of sales) {

    if (!sale.customerName) continue;

    const key = sale.customerName.toLowerCase();

    if (!profiles[key]) {

      profiles[key] = {

        customerName: sale.customerName,
        totalSpent: 0,
        visitCount: 0,
        lastVisit: sale.timestamp || 0,
        loyaltyLevel: "bronze"

      };

    }

    profiles[key].visitCount++;

    if (sale.moneyDirection === "in") {
      profiles[key].totalSpent += sale.amount;
    }

    if (sale.timestamp > profiles[key].lastVisit) {
      profiles[key].lastVisit = sale.timestamp;
    }
  }

  for (const key in profiles) {

    profiles[key].loyaltyLevel = calculateLoyaltyLevel(
      profiles[key]
    );
  }

  return profiles;
}


const LOYALTY_LEVELS = [
  { level: "platinum", min: 50000 },
  { level: "gold", min: 15000 },
  { level: "silver", min: 5000 },
  { level: "bronze", min: 0 }
];


/* ================================
   MAIN ENTRY POINT
================================ */

export async function updateCustomerLoyalty(customerName, amount) {

  if (!customerName || amount <= 0) return;

  const db = await openDB();

  const tx =
    db.transaction("customer_profiles", "readwrite");

  const store =
    tx.objectStore("customer_profiles");

  let profile =
    await store.get(customerName);

  if (!profile) {

    profile = {
      customer: customerName,
      lifetimeSpend: 0,
      visitCount: 0,
      loyaltyLevel: "bronze",
      lastUpdated: Date.now()
    };

  }

  profile.lifetimeSpend += amount;

  profile.visitCount += 1;

  profile.loyaltyLevel =
    calculateLoyaltyLevel(profile.lifetimeSpend);

  profile.lastUpdated = Date.now();

  await store.put(profile);

}


/* ================================
   LOYALTY CALCULATION
================================ */

function calculateLoyaltyLevel(spend) {

  for (const tier of LOYALTY_LEVELS) {

    if (spend >= tier.min)
      return tier.level;

  }

  return "bronze";

}


/* ================================
   GET CUSTOMER LOYALTY
================================ */

export async function getCustomerLoyalty(customerName) {

  const db = await openDB();

  const tx =
    db.transaction("customer_profiles", "readonly");

  const store =
    tx.objectStore("customer_profiles");

  const profile =
    await store.get(customerName);

  return profile?.loyaltyLevel || "bronze";

}