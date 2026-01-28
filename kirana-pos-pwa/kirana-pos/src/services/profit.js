import { getAllSales } from "./db";

export async function getTodayProfit() {
  const sales = await getAllSales();
  const today = new Date().toLocaleDateString();

  return sales
    .filter(s => s.date === today && s.estimatedProfit)
    .reduce((sum, s) => sum + s.estimatedProfit, 0);
}

export async function getTotalProfit() {
  const sales = await getAllSales();
  return sales.reduce(
    (sum, s) => sum + (s.estimatedProfit || 0),
    0
  );
}
