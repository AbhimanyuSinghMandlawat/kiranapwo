export function calculateCreditScore(sales) {
  if (sales.length === 0) return 300;

  const daysSet = new Set(sales.map(s => s.date));
  const activeDays = daysSet.size;

  const totalAmount = sales.reduce((sum, s) => sum + s.amount, 0);
  const avgDailySales = totalAmount / activeDays;

  const creditSales = sales
    .filter(s => s.paymentMethod === "credit")
    .reduce((sum, s) => sum + s.amount, 0);

  const creditRatio = creditSales / totalAmount;

  // Normalize scores
  const salesScore = Math.min((avgDailySales / 5000) * 360, 360);
  const consistencyScore = Math.min(activeDays * 5, 270);
  const creditScore = creditRatio < 0.3 ? 180 : creditRatio < 0.5 ? 120 : 60;
  const longevityScore = Math.min(activeDays * 2, 90);

  const finalScore =
    300 +
    salesScore +
    consistencyScore +
    creditScore +
    longevityScore;

  return Math.min(Math.round(finalScore), 900);
}
