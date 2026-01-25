import { renderLayout } from "../components/Layout";
import { getAllSales } from "../services/db";
import { getLast7DaysProfit } from "../services/profitTrends";
import { getStockAlerts } from "../services/stockAlerts";

export async function renderReports(container) {
  const sales = await getAllSales();

  const today = new Date().toLocaleDateString();
  const now = new Date();

  /* =====================
     TODAY SALES
  ===================== */
  const todaySales = sales.filter(s => s.date === today);
  const todayTotal = todaySales.reduce((sum, s) => sum + s.amount, 0);

  /* =====================
     LAST 7 DAYS SALES
  ===================== */
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);

  const weeklySales = sales.filter(
    s => new Date(s.timestamp) >= weekAgo
  );
  const weeklyTotal = weeklySales.reduce((sum, s) => sum + s.amount, 0);

  /* =====================
     MONTHLY SALES
  ===================== */
  const month = now.getMonth();
  const year = now.getFullYear();

  const monthlySales = sales.filter(s => {
    const d = new Date(s.timestamp);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const monthlyTotal = monthlySales.reduce((sum, s) => sum + s.amount, 0);

  /* =====================
     STOCK ALERTS
  ===================== */
  const alerts = await getStockAlerts();

  const stockAlertHtml =
    alerts.length === 0
      ? "<p>All stocks are sufficient 👍</p>"
      : alerts
          .map(
            a => `<p>⚠ ${a.name} — Only ${a.quantity} left</p>`
          )
          .join("");

  /* =====================
     PROFIT TREND
  ===================== */
  const profitData = await getLast7DaysProfit();
  const maxProfit = Math.max(...profitData.map(p => p.profit), 1);

  const chartBars = profitData
    .map(p => {
      const height = (p.profit / maxProfit) * 100;
      return `
        <div class="profit-bar">
          <div class="bar" style="height:${height}%"></div>
          <span>₹${p.profit}</span>
          <small>${p.date.split("/")[0]}</small>
        </div>
      `;
    })
    .join("");

  /* =====================
     FINAL HTML
  ===================== */
  const content = `
    <section class="dashboard">
      <h1>Reports</h1>

      <div class="cards">
        <div class="card">
          <p>Today</p>
          <h2>₹${todayTotal}</h2>
        </div>

        <div class="card">
          <p>Last 7 Days</p>
          <h2>₹${weeklyTotal}</h2>
        </div>

        <div class="card">
          <p>This Month</p>
          <h2>₹${monthlyTotal}</h2>
        </div>
      </div>

      <div class="cards" style="margin-top: 24px;">
        <div class="card">
          <p>Stock Alerts</p>
          ${stockAlertHtml}
        </div>
      </div>

      <div class="cards" style="margin-top: 24px;">
        <div class="card">
          <p>Profit Trend (Last 7 Days)</p>
          <div class="profit-chart">
            ${chartBars}
          </div>
        </div>
      </div>
    </section>
  `;

  container.innerHTML = renderLayout(content);
}