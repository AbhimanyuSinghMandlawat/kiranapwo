export function renderDailySummary(summary) {
  return `
    <div class="daily-summary-overlay">
      <div class="daily-summary-card">
        <h2>📅 Daily Summary</h2>

        <p><strong>Total Sales:</strong> ₹${summary.totalSales}</p>
        <p><strong>Transactions:</strong> ${summary.transactions}</p>
        <p><strong>Credit Given:</strong> ₹${summary.creditGiven}</p>
        <p><strong>Estimated Profit:</strong> ₹${summary.profit}</p>

        <div class="summary-insight">
          💡 ${summary.insight}
        </div>

        <button id="close-summary" class="btn-primary">
          OK
        </button>
      </div>
    </div>
  `;
}