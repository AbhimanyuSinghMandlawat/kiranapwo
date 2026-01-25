import { getAllSales } from "./db";

export async function generateSmartInsights() {
  const sales = await getAllSales();
  const insights = [];

  const today = new Date().toLocaleDateString();
  const todaySales = sales.filter(s => s.date === today);

  if (todaySales.length === 0) {
    insights.push("No sales recorded today. Try attracting customers with offers.");
    return insights;
  }

  const total = todaySales.reduce((sum, s) => sum + s.amount, 0);

  const creditSales = todaySales.filter(s => s.paymentMethod === "credit");
  const creditTotal = creditSales.reduce((sum, s) => sum + s.amount, 0);

  const creditPercent = (creditTotal / total) * 100;

  if (creditPercent > 40) {
    insights.push("High credit sales today. Try encouraging cash or UPI payments.");
  }

  if (creditPercent === 0) {
    insights.push("Great! No credit sales today.");
  }

  if (total < 500) {
    insights.push("Sales are low today. Consider promotions or discounts.");
  }

  if (total >= 2000) {
    insights.push("Good sales today. Keep it up!");
  }

  const profitToday = todaySales.reduce(
    (sum, s) => sum + (s.estimatedProfit || 0),
    0
  );

  if (profitToday < 100) {
    insights.push("Profit is low today. Review pricing or margins.");
  } else {
    insights.push("Profit looks healthy today.");
  }

  return insights;
}