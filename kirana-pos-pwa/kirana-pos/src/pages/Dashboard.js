import { renderLayout } from "../components/Layout";
import { getAllSales } from "../services/db";
import { calculateMerchantHealthIndex } from "../services/healthIndex";
import { animateNumber } from "../utils/animateNumber";
import { getTodayProfit } from "../services/profit";
import { generateSmartInsights } from "../services/insights";
import { getDailySummary } from "../services/dailySummary";
import { renderDailySummary } from "../components/DailySummaryModal";

export async function renderDashboard(container) {
  const sales = await getAllSales();

  const totalSales = sales.reduce((s, x) => s + (x.amount || 0), 0);

  const creditTotal = sales
    .filter(s => s.paymentMethod === "credit")
    .reduce((s, x) => s + x.amount, 0);

  // ✅ TODAY'S PROFIT (shop profit only)
  const todayProfit = await getTodayProfit();

  // ✅ BUSINESS / MERCHANT CREDIT HEALTH
  const mhi = await calculateMerchantHealthIndex();

  const insights = await generateSmartInsights();

  const content = `
    <section class="dashboard">
      <h1>Dashboard</h1>

      <div class="cards">
        <div class="card">
          <p>Total Sales</p>
          <h2>₹${totalSales}</h2>
        </div>

        <div class="card">
          <p>Transactions</p>
          <h2>${sales.length}</h2>
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

  container.innerHTML = renderLayout(content);

  // ✅ NUMBER ANIMATION (unchanged logic)
  container.querySelectorAll(".card h2").forEach(el => {
    const v = parseInt(el.textContent.replace(/\D/g, ""));
    if (!isNaN(v)) animateNumber(el, v);
  });

  // ✅ DAILY SUMMARY MODAL (unchanged)
  const today = new Date().toLocaleDateString();
  if (localStorage.getItem("lastSummaryDate") !== today) {
    const summary = await getDailySummary();
    document.body.insertAdjacentHTML("beforeend", renderDailySummary(summary));

    document.getElementById("close-summary").onclick = () => {
      document.querySelector(".daily-summary-overlay").remove();
      localStorage.setItem("lastSummaryDate", today);
    };
  }
}