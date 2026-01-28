// src/services/customerProfile.js

import { getAllSales } from "./db";

/* ===============================
   CUSTOMER PROFILE BUILDER
=============================== */
export async function getCustomerProfiles() {
  const sales = await getAllSales();
  const map = {};

  sales.forEach(sale => {
    if (!sale.customerName) return;

    const name = sale.customerName.trim();
    const date = sale.timestamp || Date.now();

    if (!map[name]) {
      map[name] = {
        customerName: name,
        totalVisits: 0,
        totalSpent: 0,
        firstVisit: date,
        lastVisit: date
      };
    }

    map[name].totalVisits += 1;
    map[name].totalSpent += sale.amount;
    map[name].firstVisit = Math.min(map[name].firstVisit, date);
    map[name].lastVisit = Math.max(map[name].lastVisit, date);
  });

  return Object.values(map).map(profile => ({
    ...profile,
    loyaltyLevel: classifyLoyalty(profile)
  }));
}

/* ===============================
   LOYALTY CLASSIFICATION
   (REAL-WORLD, MULTI-VARIABLE)
=============================== */
export function classifyLoyalty(profile) {
  const now = Date.now();
  const daysSinceLastVisit = Math.floor(
    (now - profile.lastVisit) / (1000 * 60 * 60 * 24)
  );

  const avgSpend = profile.totalSpent / profile.totalVisits;

  // 🟡 New customer
  if (profile.totalVisits === 1) {
    return "New";
  }

  // 🟠 Occasional (visited but not consistent)
  if (profile.totalVisits >= 2 && daysSinceLastVisit > 30) {
    return "Occasional";
  }

  // 🟢 Regular
  if (profile.totalVisits >= 5 && avgSpend >= 100) {
    return "Regular";
  }

  // 🔵 Loyal
  if (profile.totalVisits >= 10 && daysSinceLastVisit <= 30) {
    return "Loyal";
  }

  // 🟣 VIP
  if (profile.totalVisits >= 20 && profile.totalSpent >= 5000) {
    return "VIP";
  }

  return "Occasional";
}