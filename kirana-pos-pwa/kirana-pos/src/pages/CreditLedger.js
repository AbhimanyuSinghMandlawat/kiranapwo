import { renderLayout } from "../components/Layout";
import { getCreditLedger } from "../services/ledger";

export async function renderCreditLedger(container) {
  const ledger = await getCreditLedger();

  const content = `
    <section class="dashboard">
      <h1>Credit Ledger</h1>

      ${
        ledger.length === 0
          ? "<p>No pending credit.</p>"
          : ledger.map(c => `
              <div class="card ledger-row">
                <strong>${c.customerName}</strong>
                <p>₹${c.balance} pending</p>
              </div>
            `).join("")
      }
    </section>
  `;

  document.querySelector(".main-content").innerHTML = content;
}