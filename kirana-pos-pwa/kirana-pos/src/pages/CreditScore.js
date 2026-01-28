// src/pages/CreditScore.js

import { renderLayout } from "../components/Layout";
import { getCustomerProfiles } from "../services/customerProfile";
import { getCreditTrustScores } from "../services/creditScore";

/* ===============================
   UI HELPERS
=============================== */
function getCreditText(credit) {
  if (!credit || credit.creditScore === null) {
    return "⚪ No Credit History";
  }

  if (credit.creditScore >= 80) {
    return `🔵 Score ${credit.creditScore} (Trusted Borrower)`;
  }

  if (credit.creditScore >= 50) {
    return `🟡 Score ${credit.creditScore} (Average Credit)`;
  }

  return `🔴 Score ${credit.creditScore} (Risky Credit)`;
}

/* ===============================
   RENDER PAGE
=============================== */
export async function renderCreditScore(container) {
  const profiles = await getCustomerProfiles();
  const creditData = await getCreditTrustScores();

  container.innerHTML = renderLayout(`
    <section class="credit-score-page">
      <h1>Customer Loyalty & Credit</h1>

      <div class="credit-score-list">
        ${
          profiles.length === 0
            ? `<p class="muted">No customer data available</p>`
            : profiles
                .map(profile => {
                  const credit = creditData.find(
                    c =>
                      c.customerName.toLowerCase() ===
                      profile.customerName.toLowerCase()
                  );

                  return `
                    <div class="credit-card">
                      <h3>${profile.customerName}</h3>

                      <p>
                        🟢 <strong>Loyalty:</strong>
                        ${profile.loyaltyLevel}
                      </p>

                      <p>
                        <strong>Credit:</strong>
                        ${getCreditText(credit)}
                      </p>
                    </div>
                  `;
                })
                .join("")
        }
      </div>
    </section>
  `);
}