import { renderLayout } from "../components/Layout";
import { getAllSales } from "../services/db";
import { calculateMerchantHealthIndex } from "../services/healthIndex";
import { animateNumber } from "../utils/animateNumber";
import { getTodayProfit } from "../services/profit";
import { generateSmartInsights } from "../services/insights";
import { getDailySummary } from "../services/dailySummary";
import { renderDailySummary } from "../components/DailySummaryModal";

export async function renderDashboard(container) {
  const sales = (await getAllSales()) || [];

  const totalSales = sales.reduce((sum, s) => sum + (s.amount || 0), 0);

  const creditTotal = sales
    .filter(s => s.paymentMethod === "credit")
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  const todayProfit = await getTodayProfit();
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

        <div class="card">
          <p>Estimated Profit (Today)</p>
          <h2>₹${todayProfit}</h2>
        </div>

        <div class="card">
          <p>Merchant Health</p>
          <h2>${mhi.score}</h2>
          <small>${mhi.label}</small>
        </div>
        <div class="card">
          <p>Smart Insights</p>
          <ul>
           ${insights.map(i => `<li>• ${i}</li>`).join("")}
          </ul>
        </div>

      </div>
    </section>
  `;

  // 1️⃣ Render HTML
  container.innerHTML = renderLayout(content);

  // 2️⃣ Animate numeric values
  container.querySelectorAll(".card h2").forEach(el => {
    const value = parseInt(el.textContent.replace(/\D/g, ""), 10);
    if (!isNaN(value)) {
      animateNumber(el, value);
    }
  });
}
// ===== DAILY SUMMARY POPUP =====
const today = new Date().toLocaleDateString();
const lastShown = localStorage.getItem("lastSummaryDate");

if (lastShown !== today) {
  const summary = await getDailySummary();
  document.body.insertAdjacentHTML(
    "beforeend",
    renderDailySummary(summary)
  );

  document.getElementById("close-summary").onclick = () => {
    document.querySelector(".daily-summary-overlay").remove();
    localStorage.setItem("lastSummaryDate", today);
  };
}
