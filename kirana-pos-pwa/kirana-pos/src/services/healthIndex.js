import { getAllSales } from "./db";

export async function calculateMerchantHealthIndex() {
  const sales = await getAllSales();
  if (sales.length === 0) {
    return { score: 0, label: "No Data" };
  }

  const today = new Date().toLocaleDateString();
  const todaySales = sales.filter(s => s.date === today);

  /* =====================
     1️⃣ SALES STRENGTH (30)
  ===================== */
  const totalSales = todaySales.reduce((sum, s) => sum + s.amount, 0);
  let salesScore = 0;
  if (totalSales >= 2000) salesScore = 30;
  else if (totalSales >= 1000) salesScore = 20;
  else if (totalSales >= 500) salesScore = 10;

  /* =====================
     2️⃣ CREDIT RISK (25)
  ===================== */
  const creditSales = todaySales.filter(s => s.paymentMethod === "credit");
  const creditAmount = creditSales.reduce((sum, s) => sum + s.amount, 0);
  const creditPercent = totalSales ? (creditAmount / totalSales) * 100 : 0;

  let creditScore = 25;
  if (creditPercent > 50) creditScore = 5;
  else if (creditPercent > 30) creditScore = 10;
  else if (creditPercent > 10) creditScore = 18;

  /* =====================
     3️⃣ PROFIT QUALITY (20)
  ===================== */
  const profitToday = todaySales.reduce(
    (sum, s) => sum + (s.estimatedProfit || 0),
    0
  );

  let profitScore = 0;
  if (profitToday >= 500) profitScore = 20;
  else if (profitToday >= 200) profitScore = 15;
  else if (profitToday >= 50) profitScore = 8;

  /* =====================
     4️⃣ CONSISTENCY (15)
  ===================== */
  const uniqueDays = new Set(sales.map(s => s.date)).size;
  let consistencyScore = uniqueDays >= 7 ? 15 : uniqueDays >= 4 ? 10 : 5;

  /* =====================
     5️⃣ CASH FLOW MIX (10)
  ===================== */
  const instantPayments = todaySales.filter(
    s => s.paymentMethod !== "credit"
  ).length;

  let cashFlowScore =
    instantPayments >= creditSales.length ? 10 : 5;

  /* =====================
     FINAL SCORE
  ===================== */
  const score =
    salesScore +
    creditScore +
    profitScore +
    consistencyScore +
    cashFlowScore;

  let label = "Critical";
  if (score >= 80) label = "Healthy";
  else if (score >= 60) label = "Stable";
  else if (score >= 40) label = "At Risk";

  return { score, label };
}