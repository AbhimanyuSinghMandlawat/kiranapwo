// src/services/healthIndex.js

import { getAllSales } from "./db";
import { computeCustomerAccounts } from "./accountingEngine";

/*
  BUSINESS HEALTH INDEX — ADVANCED RETAIL MODEL

  Measures:
  - how much money is stuck outside
  - how dependent shop is on credit
  - real liquidity danger
*/

export async function calculateMerchantHealthIndex() {
  const sales = await getAllSales();
  const accounts = await computeCustomerAccounts();

  /* ============================
     1. REAL REVENUE (GOODS SOLD)
  ============================ */
  const totalGoodsSold = sales
    .filter(s => s.accountType === "ITEM_SALE")
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  if (totalGoodsSold === 0) {
    return {
      score: 100,
      label: "No Activity",
      ratio: 0,
      exposure: 0,
      advice: "Start recording sales"
    };
  }

  /* ============================
     2. TOTAL EXPOSURE
  ============================ */
  let totalExposure = 0;
  let totalAdvance = 0;
  let totalLoan = 0;
  let totalCredit = 0;

  for (const name in accounts) {
    const acc = accounts[name];

    totalCredit += acc.goodsDue;
    totalAdvance += acc.advance;
    totalLoan += acc.loan;

    const exposure = acc.goodsDue + acc.loan - acc.advance;

    if (exposure > 0) totalExposure += exposure;
  }

  /* ============================
     3. RISK RATIO
  ============================ */
  const riskRatio = totalExposure / totalGoodsSold;
  const score = Math.max(0, Math.min(100, Math.round(100 - riskRatio * 100)));

  /* ============================
     4. BUSINESS STATE
  ============================ */
  let label, advice;

  if (riskRatio === 0) {
    label = "Cash Positive";
    advice = "All payments recovered. Business very healthy.";
  }
  else if (riskRatio < 0.10) {
    label = "Healthy Flow";
    advice = "Credit under control.";
  }
  else if (riskRatio < 0.25) {
    label = "Controlled Credit";
    advice = "Monitor customers regularly.";
  }
  else if (riskRatio < 0.40) {
    label = "Credit Heavy";
    advice = "Reduce udhar sales.";
  }
  else if (riskRatio < 0.60) {
    label = "Liquidity Risk";
    advice = "Cash shortage possible soon.";
  }
  else if (riskRatio < 0.80) {
    label = "High Risk";
    advice = "Stop giving credit immediately.";
  }
  else {
    label = "Critical Exposure";
    advice = "Business in danger — recover dues urgently.";
  }

  /* ============================
     FINAL OUTPUT
  ============================ */
  return {
    score,
    label,
    advice,

    metrics: {
      totalGoodsSold,
      totalExposure,
      totalCredit,
      totalAdvance,
      totalLoan,
      riskRatio: Number((riskRatio * 100).toFixed(2))
    }
  };
}
