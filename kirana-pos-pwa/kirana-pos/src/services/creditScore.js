// src/services/creditScore.js

import { getCustomerProfiles } from "./customerProfile";

/* =====================================================
   INTERNAL — BEHAVIOR + FINANCIAL CREDIT SCORE
===================================================== */
async function calculateCreditScore(profile) {

  const { computeCustomerAccounts } = await import("./accountingEngine.js");
  const accounts = await computeCustomerAccounts();

  const acc = accounts[profile.customer.toLowerCase()] || {
    goodsDue: 0,
    advance: 0,
    loan: 0
  };

  const m = profile.metrics;
  const b = profile.behaviour;

  let score = 50;

  /* -----------------------------
     1. REPAYMENT DISCIPLINE
  ----------------------------- */
  if (m.avgRepaymentDays === 0) score += 10;
  else if (m.avgRepaymentDays <= 3) score += 20;
  else if (m.avgRepaymentDays <= 7) score += 10;
  else if (m.avgRepaymentDays > 14) score -= 15;

  /* -----------------------------
     2. CURRENT LIABILITY RISK
  ----------------------------- */
  if (acc.goodsDue === 0) score += 15;
  else if (acc.goodsDue > 2000) score -= 20;

  /* -----------------------------
     3. ADVANCE = TRUST BUFFER
  ----------------------------- */
  if (acc.advance > 0) score += 10;
  if (acc.advance > 500) score += 10;

  /* -----------------------------
     4. LOAN GIVEN (cash lent)
  ----------------------------- */
  if (acc.loan > 0) score -= 10;
  if (acc.loan > 1000) score -= 20;

  /* -----------------------------
     5. RELATIONSHIP STRENGTH
  ----------------------------- */
  if (b.loyalty === "regular") score += 15;
  else if (b.loyalty === "occasional") score += 5;

  /* -----------------------------
     6. CREDIT DEPENDENCY
  ----------------------------- */
  if (b.dependency === "credit-heavy") score -= 10;
  if (b.dependency === "cash") score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
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

    const acc = accounts[profile.customer.toLowerCase()] || {
      goodsDue: 0,
      advance: 0,
      loan: 0
    };

    const creditScore = await calculateCreditScore(profile);

    results.push({
      customerName: profile.customer,
      creditScore,

      pendingAmount: acc.goodsDue,
      advanceAmount: acc.advance,
      loanAmount: acc.loan,

      riskLevel:
        creditScore >= 80
          ? "Trusted"
          : creditScore >= 60
          ? "Good"
          : creditScore >= 40
          ? "Watch"
          : "Risky"
    });
  }

  return results;
}
