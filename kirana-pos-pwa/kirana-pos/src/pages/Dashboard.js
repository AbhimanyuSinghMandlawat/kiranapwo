import { renderLayout } from "../components/Layout";
import { getAllSales } from "../services/db";
import { calculateMerchantHealthIndex } from "../services/healthIndex";
import { animateNumber } from "../utils/animateNumber";
import { getTodayProfit } from "../services/profit";
import { generateSmartInsights } from "../services/insights";
import { getDailySummary } from "../services/dailySummary";
import { renderDailySummary } from "../components/DailySummaryModal";
import { t } from "../i18n/i18n";


export async function renderDashboard() {
  const sales          = await getAllSales();
  const itemSales      = sales.filter(s => s.accountType === "ITEM_SALE");
  const totalSales     = itemSales.reduce((s, x) => s + (x.amount || 0), 0);
  const creditTotal    = itemSales.filter(s => s.paymentMethod === "credit").reduce((s, x) => s + (x.amount || 0), 0);
  const transactionCount = itemSales.length;
  const todayProfit    = await getTodayProfit();
  const mhi            = await calculateMerchantHealthIndex();
  const insights       = await generateSmartInsights();

  const mhiColor = mhi.score >= 70 ? "#22c55e" : mhi.score >= 40 ? "#f59e0b" : "#ef4444";

  const content = `
    <section class="dashboard">
      <div class="page-header">
        <div>
          <h1>${t("dashboard.title")}</h1>
          <p class="page-subtitle">Here's what's happening at your store today</p>
        </div>
        <button id="view-summary" class="btn-secondary">
          📊 ${t("dashboard.viewSummary")}
        </button>
      </div>

      <div class="kpi-grid">

        <div class="kpi-card">
          <div class="kpi-icon" style="background:rgba(34,197,94,0.12);color:#22c55e">💰</div>
          <div class="kpi-body">
            <p class="kpi-label">${t("dashboard.totalSales")}</p>
            <h2 class="kpi-value" data-val="${totalSales}">₹${totalSales}</h2>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon" style="background:rgba(99,102,241,0.12);color:#818cf8">🛍️</div>
          <div class="kpi-body">
            <p class="kpi-label">${t("dashboard.transactions")}</p>
            <h2 class="kpi-value" data-val="${transactionCount}">${transactionCount}</h2>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon" style="background:rgba(245,158,11,0.12);color:#f59e0b">💳</div>
          <div class="kpi-body">
            <p class="kpi-label">${t("dashboard.creditSales")}</p>
            <h2 class="kpi-value" data-val="${creditTotal}">₹${creditTotal}</h2>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon" style="background:rgba(20,184,166,0.12);color:#14b8a6">📈</div>
          <div class="kpi-body">
            <p class="kpi-label">${t("dashboard.todayProfit")}</p>
            <h2 class="kpi-value" data-val="${todayProfit}">₹${todayProfit}</h2>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon" style="background:rgba(239,68,68,0.12);color:${mhiColor}">⭐</div>
          <div class="kpi-body">
            <p class="kpi-label">${t("dashboard.creditHealth")}</p>
            <h2 class="kpi-value" style="color:${mhiColor}" data-val="${mhi.score}">${mhi.score}</h2>
            <span class="kpi-badge">${mhi.label}</span>
          </div>
        </div>

        <div class="kpi-card kpi-card--insights">
          <div class="kpi-icon" style="background:rgba(99,102,241,0.12);color:#818cf8">🤖</div>
          <div class="kpi-body">
            <p class="kpi-label">${t("dashboard.insights")}</p>
            <ul class="insights-list">
              ${insights.map(i => `<li>${i}</li>`).join("")}
            </ul>
          </div>
        </div>

      </div>
    </section>
  `;

  document.querySelector(".main-content").innerHTML = content;
  if (!document.querySelector(".dashboard")) return;

  document.getElementById("view-summary").onclick = async () => {
    const summary = await getDailySummary();
    document.body.insertAdjacentHTML("beforeend", renderDailySummary(summary));
    document.getElementById("close-summary").onclick = () => {
      document.querySelector(".daily-summary-overlay").remove();
    };
  };

  // Number animation on KPI values
  document.querySelectorAll(".kpi-value[data-val]").forEach(el => {
    const v = parseInt(el.dataset.val.replace(/\D/g, ""));
    if (!isNaN(v) && v > 0) animateNumber(el, v);
  });
}