// src/pages/CreditScore.js

import { renderLayout } from "../components/Layout";
import { getCustomerProfiles } from "../services/customerProfile";
import { getCreditTrustScores } from "../services/creditScore";

/* ===============================
   UI HELPERS
=============================== */
function loyaltyClass(level) {
  return level.toLowerCase();
}

function creditInfo(credit) {
  if (!credit || credit.creditScore === null) {
    return {
      score: "--",
      label: "No Credit History",
      className: "none"
    };
  }

  if (credit.creditScore >= 80) {
    return {
      score: credit.creditScore,
      label: "Trusted Borrower",
      className: "good"
    };
  }

  if (credit.creditScore >= 50) {
    return {
      score: credit.creditScore,
      label: "Average Credit",
      className: "avg"
    };
  }

  return {
    score: credit.creditScore,
    label: "Risky Credit",
    className: "bad"
  };
}

/* ===============================
   RENDER PAGE
=============================== */
export async function renderCreditScore(container) {
  const profiles = await getCustomerProfiles();
  const creditData = await getCreditTrustScores();

  container.innerHTML = await renderLayout(`
    <section class="credit-page">
      <header class="credit-header">
        <h1>Customer Loyalty & Credit</h1>
        <p>Make better decisions using real customer behavior</p>
      </header>

      <div class="customer-grid">
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

                  const c = creditInfo(credit);
                  const avgSpend = Math.round(
                    profile.totalSpent / profile.totalVisits
                  );

                  return `
                    <article class="customer-card">
                      <div class="customer-top">
                        <h3>${profile.customerName}</h3>
                        <div class="credit-score ${c.className}">
                          ${c.score}
                        </div>
                      </div>

                      <div class="customer-tags">
                        <span class="loyalty-badge ${loyaltyClass(
                          profile.loyaltyLevel
                        )}">
                          ${profile.loyaltyLevel}
                        </span>
                        <span class="credit-label">
                          ${c.label}
                        </span>
                      </div>

                      <div class="customer-stats">
                        <div>
                          <small>Visits</small>
                          <strong>${profile.totalVisits}</strong>
                        </div>
                        <div>
                          <small>Avg Spend</small>
                          <strong>₹${avgSpend}</strong>
                        </div>
                        <div>
                          <small>Total Spent</small>
                          <strong>₹${profile.totalSpent}</strong>
                        </div>
                      </div>
                    </article>
                  `;
                })
                .join("")
        }
      </div>
    </section>
  `);
}