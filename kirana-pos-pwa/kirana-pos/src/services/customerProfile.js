// src/services/customerProfile.js
import { getAllSales } from "./db";

function normalizeName(name) {
  return name.trim().toLowerCase();
}

export async function getCustomerProfiles() {
  const sales = await getAllSales();
  const map = {};

  sales.forEach(sale => {
    if (!sale.customerName) return;

    const key = normalizeName(sale.customerName);

    if (!map[key]) {
      map[key] = {
        customerName: sale.customerName,
        visits: 0,
        totalSpent: 0,
        creditTaken: 0,
        creditSettled: 0,
        creditSalesCount: 0,
        settlementCount: 0,
        lastVisit: 0
      };
    }

    const profile = map[key];

    profile.visits += 1;
    profile.totalSpent += sale.amount;
    profile.lastVisit = Math.max(profile.lastVisit, sale.timestamp);

    if (sale.paymentMethod === "credit" && sale.transactionType === "sale") {
      profile.creditTaken += sale.amount;
      profile.creditSalesCount += 1;
    }

    if (sale.transactionType === "settlement") {
      profile.creditSettled += sale.amount;
      profile.settlementCount += 1;
    }
  });

  return Object.values(map);
}