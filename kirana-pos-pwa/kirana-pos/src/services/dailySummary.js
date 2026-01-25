import { getAllSales } from "./db";
import { generateSmartInsights } from "./insights";

export async function getDailySummary() {
  const sales = await getAllSales();
  const today = new Date().toLocaleDateString();

  const todaySales = sales.filter(s => s.date === today);

  const totalSales = todaySales.reduce((sum, s) => sum + s.amount, 0);
  const transactions = todaySales.length;

  const creditGiven = todaySales
    .filter(s => s.paymentMethod === "credit")
    .reduce((sum, s) => sum + s.amount, 0);

  const profit = todaySales.reduce(
    (sum, s) => sum + (s.estimatedProfit || 0),
    0
  );

  const insights = await generateSmartInsights();

  return {
    totalSales,
    transactions,
    creditGiven,
    profit,
    insight: insights[0] || "Have a great day!"
  };
}