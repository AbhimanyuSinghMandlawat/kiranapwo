import { renderLayout } from "../components/Layout";
import { getAllSales } from "../services/db";
import { calculateMerchantHealthIndex } from "../services/healthIndex";
import { animateNumber } from "../utils/animateNumber";
import { getTodayProfit } from "../services/profit";
import { generateSmartInsights } from "../services/insights";
import { getDailySummary } from "../services/dailySummary";
import { renderDailySummary } from "../components/DailySummaryModal";
import { t } from "../i18n/i18n";


export async function renderDashboard(container) {
  const sales = await getAllSales();
  console.group("=== DASHBOARD ACCOUNTING AUDIT ===");

  console.table(sales.map(s => ({
   customer: s.customerName || "_",
   type: s.accountType || "_",
   payment: s.paymentMethod || "_",
   amount: s.amount ?? 0,
   date: s.date || "_"
  })));

  const itemSalesDebug = sales.filter(s => s.accountType === "ITEM_SALE");

  console.log("ITEM SALES ONLY:", itemSalesDebug);
  console.log("TOTAL REVENUE (GOODS SOLD):",
   itemSalesDebug.reduce((t, x) => t + x.amount, 0)
  );

  console.log("CREDIT SALES:",
    itemSalesDebug
      .filter(s => s.paymentMethod === "credit")
      .reduce((t, x) => t + x.amount, 0)
  );

  console.log("TRANSACTION COUNT:", itemSalesDebug.length);

  console.groupEnd();

  /*==============================
      True Business Metrics
  ==============================*/
  //only goods sold count as sales, not returns or exchanges
  const itemSales = sales.filter(s => s.accountType === "ITEM_SALE");

  //Total revenue genrated from the selling prodicts
  const totalSales = itemSales.reduce((s, x) => s + (x.amount || 0), 0);

  //only unpaid goods

  const creditTotal = itemSales
    .filter(s => s.paymentMethod === "credit")
    .reduce((s, x) => s + (x.amount || 0), 0);
    //Actual Purchase event (not loan / advance / settlement)
    const transactionCount = itemSales.length;

  // ✅ TODAY'S PROFIT (shop profit only)
  const todayProfit = await getTodayProfit();

  // ✅ BUSINESS / MERCHANT CREDIT HEALTH
  const mhi = await calculateMerchantHealthIndex();

  const insights = await generateSmartInsights();

  const content = `
    <section class="dashboard">
      <h1>${t("Dashboard")}</h1>
      

      <div class="dashboard-actions">
        <button id="view-summary" class="btn-secondary">
          📊 View Today's Summary
        </button>
      </div>

      <div class="cards">
        <div class="card">
          <p>Total Sales</p>
          <h2>₹${totalSales}</h2>
        </div>

        <div class="card">
          <p>Transactions</p>
          <h2>${transactionCount}</h2>
        </div>

        <div class="card">
          <p>Credit Sales</p>
          <h2>₹${creditTotal}</h2>
        </div>

        <!-- ✅ CLARIFIED LABEL -->
        <div class="card">
          <p>Today's Profit</p>
          <h2>₹${todayProfit}</h2>
        </div>

        <!-- ✅ BUSINESS CREDIT SCORE -->
        <div class="card">
          <p>Business Credit Health</p>
          <h2>${mhi.score}</h2>
          <small>${mhi.label}</small>
        </div>

        <div class="card">
          <p>Insights</p>
          <ul>
            ${insights.map(i => `<li>${i}</li>`).join("")}
          </ul>
        </div>
      </div>
    </section>
  `;

  container.innerHTML = await renderLayout(content);
  if (!document.querySelector(".dashboard")) return;

  document.getElementById("view-summary").onclick = async () => {
   const summary = await getDailySummary();

   document.body.insertAdjacentHTML(
     "beforeend",
     renderDailySummary(summary)
    );

   document.getElementById("close-summary").onclick = () => {
     document.querySelector(".daily-summary-overlay").remove();
    };
  };


  // ✅ NUMBER ANIMATION (unchanged logic)
  container.querySelectorAll(".card h2").forEach(el => {
    const v = parseInt(el.textContent.replace(/\D/g, ""));
    if (!isNaN(v)) animateNumber(el, v);
  });
}