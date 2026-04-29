import { t } from "../i18n/i18n";

export function renderDailySummary(summary) {
  return `
    <div class="daily-summary-overlay">
      <div class="daily-summary-card">
        <h2>📅 ${t("daily.title")}</h2>

        <p><strong>${t("daily.totalSales")}:</strong> ₹${summary.totalSales}</p>
        <p><strong>${t("daily.transactions")}:</strong> ${summary.transactions}</p>
        <p><strong>${t("daily.creditGiven")}:</strong> ₹${summary.creditGiven}</p>
        <p><strong>${t("daily.estimatedProfit")}:</strong> ₹${summary.profit}</p>

        <div class="summary-insight">
          💡 ${summary.insight}
        </div>

        <button id="close-summary" class="btn-primary">

          ${t("daily.ok")}
        </button>
      </div>
    </div>
  `;
}