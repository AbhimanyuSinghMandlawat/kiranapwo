import { getAllSales } from "./db";

export async function getCreditLedger() {
  const sales = await getAllSales();

  const ledgerMap = {};

  sales.forEach(s => {
    if (!s.customerName) return;

    if (!ledgerMap[s.customerName]) {
      ledgerMap[s.customerName] = {
        customerName: s.customerName,
        balance: 0
      };
    }

    if (s.transactionType === "sale" && s.paymentMethod === "credit") {
      ledgerMap[s.customerName].balance += s.amount;
    }

    if (s.transactionType === "settlement") {
      ledgerMap[s.customerName].balance -= s.amount;
    }
  });

  // Return only customers who still owe money
  return Object.values(ledgerMap).filter(c => c.balance > 0);
}