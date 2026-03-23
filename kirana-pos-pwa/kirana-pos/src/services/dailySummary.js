import { getAllSales, getAllStock } from "./db";
import { generateSmartInsights } from "./insights";
import { queueSync } from "./syncService";

/* -------------------------------------------------------
   Build the daily summary object with all metrics
------------------------------------------------------- */
export async function getDailySummary() {
  const sales = await getAllSales();
  const stock = await getAllStock();
  const today = new Date().toLocaleDateString();

  const todaySales = sales.filter(s => s.date === today);

  // ── Core metrics ──
  const itemSales    = todaySales.filter(s => s.accountType === "ITEM_SALE");
  const totalSales   = itemSales.reduce((sum, s) => sum + (s.amount || 0), 0);
  const transactions = itemSales.length;

  const creditGiven = todaySales
    .filter(s => s.paymentMethod === "credit")
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  const profit = todaySales.reduce(
    (sum, s) => sum + (s.estimatedProfit || 0), 0
  );

  // ── Payment breakdown ──
  const cashTotal  = itemSales.filter(s => s.paymentMethod === "cash").reduce((sum, s) => sum + s.amount, 0);
  const upiTotal   = itemSales.filter(s => s.paymentMethod === "upi").reduce((sum, s) => sum + s.amount, 0);
  const cardTotal  = itemSales.filter(s => s.paymentMethod === "card").reduce((sum, s) => sum + s.amount, 0);

  // ── Top selling items (from today's item sales) ──
  const itemQtyMap = {};
  for (const sale of itemSales) {
    for (const item of (sale.items || [])) {
      if (!itemQtyMap[item.name]) itemQtyMap[item.name] = 0;
      itemQtyMap[item.name] += item.qty || 1;
    }
  }
  const topItems = Object.entries(itemQtyMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, qtySold]) => ({ name, qtySold }));

  // ── Low stock alerts ──
  const lowStock = stock.filter(s => s.quantity <= 3 && s.quantity > 0).map(s => s.name);
  const outOfStock = stock.filter(s => s.quantity <= 0).length;

  const insights = await generateSmartInsights();

  return {
    id:           crypto.randomUUID(),
    summaryDate:  today,
    totalSales,
    profit,
    transactions,
    creditGiven,
    cashTotal,
    upiTotal,
    cardTotal,
    topItems,
    lowStock,
    outOfStock,
    breakdown: { cash: cashTotal, upi: upiTotal, card: cardTotal, credit: creditGiven },
    insight: insights[0] || "Have a great day! 🙏"
  };
}

/* -------------------------------------------------------
   Save summary to IndexedDB + queue for MySQL sync
------------------------------------------------------- */
async function persistDailySummary(summary) {
  try {
    const { openDB } = await import("./db");
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx    = db.transaction("settings", "readwrite");
      const store = tx.objectStore("settings");
      store.put({ id: `daily_summary_${summary.summaryDate}`, ...summary });
      tx.oncomplete = resolve;
      tx.onerror    = () => reject(tx.error);
    });
    // Push to MySQL if online
    await queueSync("daily_summary", summary);
    console.log("[Daily Summary] Saved and queued for sync:", summary.summaryDate);
  } catch (err) {
    console.warn("[Daily Summary] Persist failed:", err);
  }
}

/* -------------------------------------------------------
   Schedule automatic closing-time trigger (11:00 PM)
   Call this once from main.js
------------------------------------------------------- */
export function scheduleDailySummary() {
  checkAndTriggerSummary();

  // Check every minute
  setInterval(checkAndTriggerSummary, 60 * 1000);
}

async function checkAndTriggerSummary() {
  const now  = new Date();
  const hour = now.getHours();
  const min  = now.getMinutes();

  // Trigger at 23:00 (11:00 PM)
  if (hour === 23 && min === 0) {
    const today = now.toLocaleDateString();
    const lastKey = `daily_summary_triggered_${today}`;

    // Don't send twice the same day
    if (sessionStorage.getItem(lastKey)) return;
    sessionStorage.setItem(lastKey, "1");

    console.log("[Daily Summary] 11:00 PM — generating closing summary...");
    const summary = await getDailySummary();
    await persistDailySummary(summary);

    // Show modal to owner
    window.dispatchEvent(new CustomEvent("dailySummaryReady", { detail: summary }));
  }
}