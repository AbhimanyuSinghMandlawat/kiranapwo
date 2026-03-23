import { renderLayout } from "../components/Layout";
import { getAllSales, getAllStock } from "../services/db";
import { getCurrentUser } from "../auth/authService";

export async function renderAnalytics(container) {

  const user = await getCurrentUser();
  if (!user || user.role !== "owner") {
    container.innerHTML = await renderLayout(`
      <section class="dashboard">
        <div class="glass-card" style="text-align:center;padding:40px">
          <h2>🔒 Access Denied</h2>
          <p>Only the <strong>Owner</strong> can view Business Analytics.</p>
        </div>
      </section>
    `);
    return;
  }

  const [sales, stock] = await Promise.all([getAllSales(), getAllStock()]);

  const analytics = buildAnalytics(sales, stock);

  const content = `
    <section class="dashboard">
      <h1>📈 AI Business Analytics</h1>
      <p style="color:#888;margin-bottom:20px">Smart insights powered by your real business data</p>

      <!-- KPI Row -->
      <div class="analytics-kpi-row">
        <div class="kpi-card kpi-green">
          <div class="kpi-icon">💰</div>
          <div class="kpi-value">₹${analytics.totalRevenue.toFixed(0)}</div>
          <div class="kpi-label">Total Revenue</div>
        </div>
        <div class="kpi-card kpi-blue">
          <div class="kpi-icon">📈</div>
          <div class="kpi-value">₹${analytics.totalProfit.toFixed(0)}</div>
          <div class="kpi-label">Total Profit</div>
        </div>
        <div class="kpi-card kpi-orange">
          <div class="kpi-icon">🛒</div>
          <div class="kpi-value">${analytics.totalTransactions}</div>
          <div class="kpi-label">Transactions</div>
        </div>
        <div class="kpi-card kpi-purple">
          <div class="kpi-icon">📊</div>
          <div class="kpi-value">${analytics.avgOrderValue.toFixed(0)}₹</div>
          <div class="kpi-label">Avg Order Value</div>
        </div>
      </div>

      <!-- 7-day trend -->
      <div class="glass-card" style="margin-top:20px">
        <h3>📅 Last 7 Days Revenue</h3>
        <div class="bar-chart">
          ${analytics.last7Days.map(d => `
            <div class="bar-wrap">
              <div class="bar" style="height:${d.height}%;background:${d.isToday ? '#4caf50' : '#2196f3'}">
                <span class="bar-label">₹${d.total.toFixed(0)}</span>
              </div>
              <small>${d.label}</small>
            </div>
          `).join("")}
        </div>
      </div>

      <div class="analytics-two-col">

        <!-- Top Sellers -->
        <div class="glass-card">
          <h3>🏆 Top Selling Items</h3>
          ${analytics.topSellers.length === 0 ? "<p style='color:#888'>No item sales yet.</p>" : `
            <div class="analytics-list">
              ${analytics.topSellers.map((item, i) => `
                <div class="analytics-list-row">
                  <span class="rank">#${i+1}</span>
                  <span class="item-name">${item.name}</span>
                  <span class="item-stat">${item.qtySold} sold</span>
                  <span class="item-rev">₹${item.revenue.toFixed(0)}</span>
                </div>
              `).join("")}
            </div>
          `}
        </div>

        <!-- Slow Movers -->
        <div class="glass-card">
          <h3>🐌 Slow Moving Stock</h3>
          <p style="color:#888;font-size:13px">Items with stock but 0 sales in 7 days</p>
          ${analytics.slowMovers.length === 0 ? "<p style='color:#4caf50'>✅ No slow movers!</p>" : `
            <div class="analytics-list">
              ${analytics.slowMovers.map(item => `
                <div class="analytics-list-row warn">
                  <span class="item-name">${item.name}</span>
                  <span class="item-stat">${item.quantity} in stock</span>
                </div>
              `).join("")}
            </div>
          `}
        </div>

      </div>

      <div class="analytics-two-col">

        <!-- Payment Breakdown -->
        <div class="glass-card">
          <h3>💳 Payment Methods</h3>
          <div class="payment-breakdown">
            ${[
              { label: "Cash",   val: analytics.paymentBreakdown.cash,   color: "#4caf50", icon: "💵" },
              { label: "UPI",    val: analytics.paymentBreakdown.upi,    color: "#2196f3", icon: "📱" },
              { label: "Card",   val: analytics.paymentBreakdown.card,   color: "#9c27b0", icon: "💳" },
              { label: "Credit", val: analytics.paymentBreakdown.credit, color: "#ff9800", icon: "📝" }
            ].map(p => {
              const pct = analytics.totalRevenue > 0 ? (p.val / analytics.totalRevenue * 100).toFixed(1) : 0;
              return `
                <div class="payment-row">
                  <span>${p.icon} ${p.label}</span>
                  <div class="payment-bar-wrap">
                    <div class="payment-bar-fill" style="width:${pct}%;background:${p.color}"></div>
                  </div>
                  <span style="min-width:80px;text-align:right">₹${p.val.toFixed(0)} (${pct}%)</span>
                </div>
              `;
            }).join("")}
          </div>
        </div>

        <!-- Credit Risk -->
        <div class="glass-card">
          <h3>⚠️ Credit Risk Customers</h3>
          ${analytics.creditRisk.length === 0 ? "<p style='color:#4caf50'>✅ No high-risk credit customers.</p>" : `
            <div class="analytics-list">
              ${analytics.creditRisk.map(c => `
                <div class="analytics-list-row warn">
                  <span class="item-name">${c.name}</span>
                  <span class="item-stat" style="color:#e57373">₹${c.outstanding.toFixed(0)} outstanding</span>
                </div>
              `).join("")}
            </div>
          `}
        </div>

      </div>

      <!-- AI Suggestions -->
      <div class="glass-card ai-suggestions">
        <h3>🤖 Smart Business Suggestions</h3>
        <div class="suggestions-list">
          ${analytics.suggestions.map(s => `
            <div class="suggestion-item">
              <span class="suggestion-icon">${s.icon}</span>
              <p>${s.text}</p>
            </div>
          `).join("")}
        </div>
      </div>

    </section>
  `;

  container.innerHTML = await renderLayout(content);
}

/* -------------------------------------------------------
   Rule-based analytics engine (works 100% offline)
------------------------------------------------------- */
function buildAnalytics(sales, stock) {
  const itemSales = sales.filter(s => s.accountType === "ITEM_SALE");
  const totalRevenue     = itemSales.reduce((s, x) => s + (x.amount || 0), 0);
  const totalProfit      = sales.reduce((s, x) => s + (x.estimatedProfit || 0), 0);
  const totalTransactions = itemSales.length;
  const avgOrderValue    = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // ── Last 7 days ──
  const last7Days = [];
  const maxDay    = { total: 1 };
  for (let i = 6; i >= 0; i--) {
    const d   = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString();
    const total   = itemSales
      .filter(s => s.date === dateStr)
      .reduce((sum, s) => sum + (s.amount || 0), 0);
    if (total > maxDay.total) maxDay.total = total;
    last7Days.push({
      label:   i === 0 ? "Today" : d.toLocaleDateString("en", { weekday: "short" }),
      total,
      isToday: i === 0,
      height:  0
    });
  }
  for (const d of last7Days) d.height = (d.total / maxDay.total) * 100;

  // ── Top sellers ──
  const itemMap = {};
  for (const sale of itemSales) {
    for (const item of (sale.items || [])) {
      if (!itemMap[item.name]) itemMap[item.name] = { name: item.name, qtySold: 0, revenue: 0 };
      itemMap[item.name].qtySold  += item.qty   || 1;
      itemMap[item.name].revenue  += (item.price || 0) * (item.qty || 1);
    }
  }
  const topSellers = Object.values(itemMap)
    .sort((a, b) => b.qtySold - a.qtySold)
    .slice(0, 7);

  // ── Slow movers (in stock but no recent sales in 7 days) ──
  const recentSoldNames = new Set();
  const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
  for (const sale of itemSales) {
    if ((sale.timestamp || 0) >= cutoff) {
      for (const item of (sale.items || [])) recentSoldNames.add(item.name);
    }
  }
  const slowMovers = stock
    .filter(s => s.quantity > 0 && !recentSoldNames.has(s.name))
    .slice(0, 8);

  // ── Payment breakdown ──
  const paymentBreakdown = {
    cash:   itemSales.filter(s => s.paymentMethod === "cash").reduce((sum, s)  => sum + s.amount, 0),
    upi:    itemSales.filter(s => s.paymentMethod === "upi").reduce((sum, s)   => sum + s.amount, 0),
    card:   itemSales.filter(s => s.paymentMethod === "card").reduce((sum, s)  => sum + s.amount, 0),
    credit: itemSales.filter(s => s.paymentMethod === "credit").reduce((sum,s) => sum + s.amount, 0)
  };

  // ── Credit risk ──
  const customerCredit = {};
  for (const sale of sales) {
    if (!sale.customerName) continue;
    const key = sale.customerName.toLowerCase();
    if (!customerCredit[key]) customerCredit[key] = { name: sale.customerName, outstanding: 0 };
    if (sale.accountType === "ITEM_SALE" && sale.paymentMethod === "credit")
      customerCredit[key].outstanding += sale.amount || 0;
    if (sale.transactionType === "settlement_goods")
      customerCredit[key].outstanding -= sale.amount || 0;
  }
  const creditRisk = Object.values(customerCredit)
    .filter(c => c.outstanding > avgOrderValue * 2)
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 5);

  // ── Smart suggestions ──
  const suggestions = [];
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  if (profitMargin < 10) suggestions.push({ icon: "📉", text: `Your profit margin is ${profitMargin.toFixed(1)}% — consider reviewing your cost prices or increasing selling prices on high-volume items.` });
  else suggestions.push({ icon: "📈", text: `Great work! Your profit margin is ${profitMargin.toFixed(1)}%. Keep monitoring cost prices to maintain this.` });

  if (slowMovers.length > 3) suggestions.push({ icon: "📦", text: `${slowMovers.length} items have not sold in 7 days. Consider running a discount campaign on: ${slowMovers.slice(0,3).map(s=>s.name).join(", ")}.` });

  if (creditRisk.length > 0) suggestions.push({ icon: "⚠️", text: `${creditRisk.length} customer(s) have high outstanding credit. Follow up with ${creditRisk[0].name} (₹${creditRisk[0].outstanding.toFixed(0)} due).` });

  if (paymentBreakdown.upi > paymentBreakdown.cash && paymentBreakdown.upi > paymentBreakdown.card)
    suggestions.push({ icon: "📱", text: "UPI is your most popular payment method. Ensure your QR code is always visible at the counter for faster checkout." });

  if (topSellers.length > 0)
    suggestions.push({ icon: "🏆", text: `"${topSellers[0].name}" is your best seller. Make sure it's always well-stocked to avoid missed sales.` });

  if (totalTransactions < 5)
    suggestions.push({ icon: "📢", text: "Sales volume is low. Consider promoting your shop on WhatsApp groups for nearby customers." });

  return {
    totalRevenue, totalProfit, totalTransactions, avgOrderValue,
    last7Days, topSellers, slowMovers, paymentBreakdown, creditRisk, suggestions
  };
}
