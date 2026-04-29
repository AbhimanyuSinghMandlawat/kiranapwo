import { getAllSales } from "./db";
import { LIABILITY_EFFECT } from "./transactionTypes";

/*
  Computes customer running accounts from transactions
*/

export async function computeCustomerAccounts() {
  const sales = await getAllSales();

  sales.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)); // old to new
  const accounts = {};

  for (const tx of sales) {

    // Ignore non-customer transactions
    if (!tx.customerName) continue;

    // 🔴 Ignore broken financial rows (VERY IMPORTANT)
    if (!tx.liabilityEffect) continue;
    if (typeof tx.amount !== "number") continue;
    if (tx.amount <= 0) continue;

    const name = tx.customerName.toLowerCase();

    if (!accounts[name]) {
      accounts[name] = {
        goodsDue: 0,
        advance: 0,
        loan: 0
      };
    }

    const acc = accounts[name];

    switch (tx.liabilityEffect) {

      case LIABILITY_EFFECT.INCREASE_GOODS_DUE:
        acc.goodsDue += tx.amount;
        break;

      case LIABILITY_EFFECT.DECREASE_GOODS_DUE:
        acc.goodsDue -= tx.amount;
        break;

      case LIABILITY_EFFECT.INCREASE_ADVANCE:
        acc.advance += tx.amount;
        break;

      case LIABILITY_EFFECT.DECREASE_ADVANCE:
        acc.advance -= tx.amount;
        break;

      case LIABILITY_EFFECT.INCREASE_LOAN:
        acc.loan += tx.amount;
        break;

      case LIABILITY_EFFECT.DECREASE_LOAN:
        acc.loan -= tx.amount;
        break;
    }

    // 🧠 Financial clamps (prevents negative corruption)
    if (acc.goodsDue < 0) acc.goodsDue = 0;
    if (acc.advance < 0) acc.advance = 0;
    if (acc.loan < 0) acc.loan = 0;
  }

  return accounts;
}
