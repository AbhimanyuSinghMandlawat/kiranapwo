import { getAllSales } from "./db";

/* ===============================
   TODAY'S PROFIT
=============================== */
export async function getTodayProfit() {
  const sales = await getAllSales();
  const today = new Date().toLocaleDateString();

  return sales
    .filter(
      s =>
        s.date === today &&
        s.transactionType === "sale"
    )
    .reduce((sum, s) => {
      const profit = Number(s.estimatedProfit) || 0;
      return sum + profit;
    }, 0);
}

/* ===============================
   TOTAL PROFIT (ALL TIME)
=============================== */
export async function getTotalProfit() {
  const sales = await getAllSales();

  return sales.reduce((sum, s) => {
    const profit =
      s.transactionType === "sale"
        ? Number(s.estimatedProfit) || 0
        : 0;

    return sum + profit;
  }, 0);
}