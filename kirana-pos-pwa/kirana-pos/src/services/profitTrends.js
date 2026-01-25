import { getAllSales } from "./db";

export async function getLast7DaysProfit() {
  const sales = await getAllSales();

  const profitMap = {};

  sales.forEach(s => {
    const date = s.date;
    const profit = s.estimatedProfit || 0;

    if (!profitMap[date]) {
      profitMap[date] = 0;
    }
    profitMap[date] += profit;
  });

  // Get last 7 dates (including today)
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString();

    result.push({
      date: dateStr,
      profit: profitMap[dateStr] || 0
    });
  }

  return result;
}