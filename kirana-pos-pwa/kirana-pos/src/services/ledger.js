// src/services/ledger.js
import { getAllSales } from "./db";

export async function getCreditLedger() {
  const sales = await getAllSales();
  const ledger = {};

  sales.forEach(sale => {
    if (!sale.customerName) return;

    const key = sale.customerName.trim().toLowerCase();

    if (!ledger[key]) {
      ledger[key] = {
        customerName: sale.customerName,
        balance: 0
      };
    }

    if (sale.transactionType === "sale" && sale.paymentMethod === "credit") {
      ledger[key].balance += sale.amount;
    }

    if (sale.transactionType === "settlement") {
      ledger[key].balance -= sale.amount;
    }
  });

  return Object.values(ledger).filter(l => l.balance > 0);
}