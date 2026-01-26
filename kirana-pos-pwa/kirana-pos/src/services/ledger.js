import { getAllSales } from "./db";

export async function getCreditLedger() {
  const sales = await getAllSales();
  const ledger = {};

  sales.forEach(s => {
    if (!s.customerName) return;

    if (!ledger[s.customerName]) {
      ledger[s.customerName] = { customerName: s.customerName, balance: 0 };
    }

    if (s.transactionType === "sale" && s.paymentMethod === "credit") {
      ledger[s.customerName].balance += s.amount;
    }

    if (s.transactionType === "settlement") {
      ledger[s.customerName].balance -= s.amount;
    }
  });

  return Object.values(ledger).filter(c => c.balance > 0);
}