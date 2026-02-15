import { getAllSales } from "./db";
import { LIABILITY_EFFECT } from "./transactionTypes";

/*
  Computes customer running accounts from transactions
*/

export async function computeCustomerAccounts() {
  const sales = await getAllSales();
  const accounts = {};

  for (const tx of sales) {
    if (!tx.customerName) continue;

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
        if (acc.goodsDue < 0) acc.goodsDue = 0;
        break;

      case LIABILITY_EFFECT.INCREASE_ADVANCE:
        acc.advance += tx.amount;
        break;

      case LIABILITY_EFFECT.DECREASE_ADVANCE:
        acc.advance -= tx.amount;
        if (acc.advance < 0) acc.advance = 0;
        break;

      case LIABILITY_EFFECT.INCREASE_LOAN:
        acc.loan += tx.amount;
        break;

      case LIABILITY_EFFECT.DECREASE_LOAN:
        acc.loan -= tx.amount;
        break;
    }
  }

  return accounts;
}
