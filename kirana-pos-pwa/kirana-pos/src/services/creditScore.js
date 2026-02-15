// src/services/creditScore.js

import { getCustomerProfiles } from "./customerProfile";

/* =====================================================
   INTERNAL — BEHAVIOR BASED CREDIT SCORE
===================================================== */
async function calculateCreditScore(profile, customerName) {

  const { computeCustomerAccounts } = await import("./accountingEngine.js");
  const accounts = await computeCustomerAccounts();

  const acc = accounts[customerName.toLowerCase()] || {
    goodsDue: 0,
    advance: 0,
    loan: 0
  };

  let score = 50;

  /* -----------------------------
     1. REPAYMENT DISCIPLINE
     ----------------------------- */
  if (acc.goodsDue === 0) score += 20;
  else if (acc.goodsDue < 500) score += 5;
  else if (acc.goodsDue > 2000) score -= 20;

  /* -----------------------------
     2. TRUST BUFFER (ADVANCE)
     ----------------------------- */
  if (acc.advance > 0) score += 15;
  if (acc.advance > 500) score += 10;

  /* -----------------------------
     3. SHOP RISK (LOAN GIVEN)
     ----------------------------- */
  if (acc.loan > 0) score -= 15;
  if (acc.loan > 1000) score -= 25;

  /* -----------------------------
     4. RELATIONSHIP HISTORY
     ----------------------------- */
  if (profile.totalVisits >= 5) score += 5;
  if (profile.totalVisits >= 15) score += 5;
  if (profile.totalVisits >= 25) score += 10;

  return Math.max(0, Math.min(100, score));
}

/* =====================================================
   PUBLIC API
===================================================== */
export async function getCreditTrustScores() {

  const profiles = await getCustomerProfiles();

  const { computeCustomerAccounts } = await import("./accountingEngine.js");
  const accounts = await computeCustomerAccounts();

  const results = [];

  for (const profile of profiles) {

    const acc = accounts[profile.customerName.toLowerCase()] || {
      goodsDue: 0,
      advance: 0,
      loan: 0
    };

    const creditScore = await calculateCreditScore(
      profile,
      profile.customerName
    );

    results.push({
      customerName: profile.customerName,
      creditScore,
      totalVisits: profile.totalVisits,
      totalSpent: profile.totalSpent,

      // pending = actual liability only
      pendingAmount: acc.goodsDue,

      classification:
        creditScore >= 80
          ? "Trusted"
          : creditScore >= 50
          ? "Regular"
          : "Risky"
    });
  }

  return results;
}
