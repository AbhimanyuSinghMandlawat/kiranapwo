import { computeCustomerAccounts } from "./accountingEngine";
import { getAllSales } from "./db";

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


export function calculateLoyaltyLevel(profile) {

  if (profile.totalSpent >= 50000 && profile.visitCount >= 200)
    return "platinum";

  if (profile.totalSpent >= 20000 && profile.visitCount >= 80)
    return "gold";

  if (profile.totalSpent >= 5000 && profile.visitCount >= 20)
    return "silver";

  return "bronze";
}