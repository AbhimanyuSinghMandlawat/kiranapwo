import { getAllSales } from "./db";

/*
  ==========================================
  PROFIT TREND SERVICE (LAST 7 CALENDAR DAYS)
  ------------------------------------------
  - Offline-first (IndexedDB)
  - Calendar-based (not manual shifting)
  - Always returns exactly 7 days
  - Includes today
  - Missing days default to ₹0 profit
  ==========================================
*/

export async function getLast7DaysProfit() {
  const sales = await getAllSales();

  /*
    STEP 1: Aggregate profit by date
    --------------------------------
    Using a map for fast lookup.
    Key   -> locale date string
    Value -> total profit for that date
  */
  const profitMap = {};

  sales.forEach(sale => {
    // Defensive checks (future-safe)
    if (!sale || !sale.date) return;

    const dateKey = sale.date;
    const profit = Number(sale.estimatedProfit) || 0;

    if (!profitMap[dateKey]) {
      profitMap[dateKey] = 0;
    }

    profitMap[dateKey] += profit;
  });

  /*
    STEP 2: Generate last 7 calendar dates
    -------------------------------------
    - Includes today
    - Automatically rolls forward each day
    - No manual shifting logic
  */
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

  /*
    STEP 3: Return ordered data
    ---------------------------
    Oldest -> Newest (left to right on graph)
  */
  return result;
}