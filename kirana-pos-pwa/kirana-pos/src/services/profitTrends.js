import { getAllSales } from "./db";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export async function getLast7DaysProfit() {
  const sales = await getAllSales();

  const profitMap = {};

  sales.forEach(s => {
    const date   = s.date;
    const profit = s.estimatedProfit || 0;
    if (!profitMap[date]) profitMap[date] = 0;
    profitMap[date] += profit;
  });

  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d       = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString();
    const label   = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
    const isToday = i === 0;

    result.push({
      date: dateStr,
      label,
      isToday,
      profit: profitMap[dateStr] || 0
    });
  }

  return result;
}