import { getAllSales } from "./db";
import { LIABILITY_EFFECT } from "./transactionTypes";

/*
Customer Intelligence Engine
Transforms raw financial history → shopkeeper decisions
*/

/* =========================================================
STEP 1 — BUILD ALL PROFILES (CORE ENGINE)
========================================================= */

export async function buildCustomerProfiles() {

  const sales = await getAllSales();
  const customers = {};

  // GROUP TRANSACTIONS
  for (const tx of sales) {
    if (!tx.customerName) continue;

    const name = tx.customerName.toLowerCase();

    if (!customers[name]) {
      customers[name] = [];
    }

    customers[name].push(tx);
  }

  // ANALYZE EACH CUSTOMER
  const profiles = {};

  for (const name in customers) {
    profiles[name] = analyzeCustomer(customers[name]);
  }

  return profiles;
}

/* =========================================================
STEP 2 — UI ADAPTER (CreditScore page uses this)
========================================================= */

export async function getCustomerProfiles() {
  const map = await buildCustomerProfiles();

  return Object.entries(map).map(([customer, data]) => ({
    customer,
    ...data
  }));
}

/* =========================================================
STEP 3 — ANALYZE SINGLE CUSTOMER
========================================================= */

function analyzeCustomer(transactions) {

  transactions.sort((a,b)=>a.timestamp-b.timestamp);

  let goodsDue = 0;
  let lifetimeValue = 0;
  let creditPurchases = 0;
  let totalPurchases = 0;

  let visitDays = new Set();

  let cycleStart = null;
  let cycles = [];
  let lateCycles = 0;

  for (const tx of transactions) {

    visitDays.add(new Date(tx.timestamp).toDateString());

    /* COUNT ALL ITEM SALES AS LIFETIME VALUE */

    if (tx.accountType === "ITEM_SALE") {

      lifetimeValue += tx.amount;

      totalPurchases++;

    }

    /* HANDLE CREDIT LIABILITY SEPARATELY */

    switch(tx.liabilityEffect) {

      case LIABILITY_EFFECT.INCREASE_GOODS_DUE:

        goodsDue += tx.amount;

        creditPurchases++;

        if (cycleStart === null)
          cycleStart = tx.timestamp;

        break;

      case LIABILITY_EFFECT.DECREASE_GOODS_DUE:

        goodsDue -= tx.amount;

        if (goodsDue <= 0 && cycleStart !== null) {

          const days =
            (tx.timestamp - cycleStart)/(1000*60*60*24);

          cycles.push(days);

          if (days > 7) lateCycles++;

          cycleStart = null;

          goodsDue = 0;

        }

        break;

    }
  }

  const avgRepaymentDays =
    cycles.length === 0 ? 0 :
    cycles.reduce((a,b)=>a+b,0)/cycles.length;

  const visitFrequency = visitDays.size;

  const creditUsageRatio =
    totalPurchases === 0 ? 0 : creditPurchases/totalPurchases;

  const outstandingRatio =
    lifetimeValue === 0 ? 0 : goodsDue/lifetimeValue;

  let paymentHabit =
    avgRepaymentDays <= 2 ? "fast" :
    avgRepaymentDays <= 7 ? "normal" :
    avgRepaymentDays <= 21 ? "slow" :
    "never";

  let loyalty =
    visitFrequency >= 20 ? "regular" :
    visitFrequency >= 7 ? "occasional" :
    "rare";

  let dependency =
    creditUsageRatio > 0.7 ? "credit-heavy" :
    creditUsageRatio > 0.3 ? "mixed" :
    "cash";

  let riskLevel = "safe";
  let maxAllowedCredit = 500;
  let advice = "Normal credit allowed";

  if (lateCycles >= 4 || paymentHabit === "never") {
    riskLevel = "blocked";
    maxAllowedCredit = 0;
    advice = "Do NOT give credit — high default risk";
  }
  else if (lateCycles >= 2) {
    riskLevel = "dangerous";
    maxAllowedCredit = 100;
    advice = "Avoid giving credit";
  }
  else if (paymentHabit === "slow") {
    riskLevel = "risky";
    maxAllowedCredit = 200;
    advice = "Give only small credit";
  }
  else if (paymentHabit === "normal") {
    riskLevel = "caution";
    maxAllowedCredit = 300;
    advice = "Credit ok but monitor";
  }
  else if (paymentHabit === "fast" && loyalty === "regular") {
    riskLevel = "very_safe";
    maxAllowedCredit = 1500;
    advice = "Very reliable customer";
  }

  return {
    metrics:{
      lifetimeValue,
      visitFrequency,
      avgRepaymentDays,
      outstandingRatio,
      creditUsageRatio,
      lateCycles
    },
    behaviour:{
      loyalty,
      paymentHabit,
      dependency
    },
    decision:{
      riskLevel,
      maxAllowedCredit,
      advice
    }
  };
}
