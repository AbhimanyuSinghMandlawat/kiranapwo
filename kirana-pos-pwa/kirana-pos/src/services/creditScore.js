// src/services/creditScore.js

import { getAllSales } from "./db";
import { getCustomerProfiles } from "./customerProfile";
import { getCreditLedger } from "./ledger";

/* =====================================================
   INTERNAL: CREDIT SCORE CALCULATION
   (kept in same file — OPTION A)
===================================================== */
function calculateCreditScore(profile, ledgerEntries) {
  let score = 50;

  // Visit-based trust
  if (profile.totalVisits >= 5) score += 5;
  if (profile.totalVisits >= 10) score += 10;
  if (profile.totalVisits >= 25) score += 10;

  // Credit discipline
  const hasPending = ledgerEntries.some(e => e.balance > 0);
  if (!hasPending) score += 20;

  // High-risk behavior
  const maxPending = ledgerEntries.length
    ? Math.max(...ledgerEntries.map(e => e.balance))
    : 0;

  if (maxPending > 2000) score -= 20;
  if (maxPending > 5000) score -= 30;

  return Math.max(0, Math.min(100, score));
}

/* =====================================================
   PUBLIC API
===================================================== */
export async function getCreditTrustScores() {
  const profiles = await getCustomerProfiles();
  const ledger = await getCreditLedger();
  const sales = await getAllSales();

  return profiles.map(profile => {
    const customerLedger = ledger.filter(
      l =>
        l.customerName.toLowerCase() ===
        profile.customerName.toLowerCase()
    );

    const customerSales = sales.filter(
      s =>
        s.customerName &&
        s.customerName.toLowerCase() ===
          profile.customerName.toLowerCase()
    );

    const creditScore = calculateCreditScore(
      profile,
      customerLedger
    );

    return {
      customerName: profile.customerName,
      creditScore,
      totalVisits: profile.totalVisits,
      totalSpent: profile.totalSpent,
      pendingAmount: customerLedger.reduce(
        (sum, l) => sum + l.balance,
        0
      ),
      classification:
        creditScore >= 80
          ? "Trusted"
          : creditScore >= 50
          ? "Regular"
          : "Risky"
    };
  });
}