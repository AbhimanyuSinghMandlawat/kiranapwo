// src/pages/CreditScore.js

import { renderLayout } from "../components/Layout";
import { getCustomerProfiles } from "../services/customerProfile";

/* ===============================
   RENDER PAGE
=============================== */
export async function renderCreditScore(container) {

  // IMPORTANT: returns ARRAY (fixed)
  const profiles = await getCustomerProfiles();

  container.innerHTML = await renderLayout(`
    <section class="credit-page">
      <header class="credit-header">
        <h1>Customer Intelligence</h1>
        <p>Know who is safe to give credit</p>
      </header>

      <div class="customer-grid">
        ${
          profiles.length === 0
            ? `<p class="muted">No customer data available</p>`
            : profiles.map(profile => {

              const m = profile.metrics;
              const b = profile.behaviour;
              const d = profile.decision;

              return `
                <article class="customer-card risk-${d.riskLevel}">
                  
                  <div class="customer-top">
                    <h3>${profile.customer}</h3>
                    <div class="risk-badge">
                      ${d.riskLevel.replace("_"," ")}
                    </div>
                  </div>

                  <div class="advice">
                    ${d.advice}
                  </div>

                  <div class="customer-stats">
                    <div>
                      <small>Visits</small>
                      <strong>${m.visitFrequency}</strong>
                    </div>
                    <div>
                      <small>Lifetime Value</small>
                      <strong>₹${Math.round(m.lifetimeValue)}</strong>
                    </div>
                    <div>
                      <small>Repayment Speed</small>
                      <strong>${Math.round(m.avgRepaymentDays)} days</strong>
                    </div>
                    <div>
                      <small>Credit Usage</small>
                      <strong>${Math.round(m.creditUsageRatio*100)}%</strong>
                    </div>
                  </div>

                  <div class="behaviour">
                    <span class="tag">${b.loyalty}</span>
                    <span class="tag">${b.paymentHabit}</span>
                    <span class="tag">${b.dependency}</span>
                  </div>

                  <div class="limit">
                    Max Safe Credit: ₹${d.maxAllowedCredit}
                  </div>

                </article>
              `;
            }).join("")
        }
      </div>
    </section>
  `);
}
