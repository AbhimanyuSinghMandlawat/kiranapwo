// src/services/ledger.js
import { getAllSales } from "./db";
import { LIABILITY_EFFECT } from "./transactionTypes";

export async function getCreditLedger() {
  const sales = await getAllSales();
  const ledger = {};

  for (const tx of sales) {
    if (!tx.customerName) continue;

    const key = tx.customerName.trim().toLowerCase();

    if (!ledger[key]) {
      ledger[key] = {
        customerName: tx.customerName,
        balance: 0
      };
    }

    switch (tx.liabilityEffect) {

      case LIABILITY_EFFECT.INCREASE_GOODS_DUE:
        ledger[key].balance += tx.amount;
        break;

      case LIABILITY_EFFECT.DECREASE_GOODS_DUE:
        ledger[key].balance -= tx.amount;
        break;

      case LIABILITY_EFFECT.INCREASE_LOAN:
        ledger[key].balance += tx.amount;
        break;

      case LIABILITY_EFFECT.DECREASE_LOAN:
        ledger[key].balance -= tx.amount;
        break;

      case LIABILITY_EFFECT.INCREASE_ADVANCE:
        ledger[key].balance -= tx.amount; // advance reduces payable
        break;
    }
  }

  return Object.values(ledger).filter(l => l.balance > 0);
}
