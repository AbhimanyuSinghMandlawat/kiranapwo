// src/pages/CreditScore.js

import { renderLayout } from "../components/Layout";
import { getCustomerProfiles } from "../services/customerProfile";
import { getCreditTrustScores } from "../services/creditScore";

/* ===============================
   UI HELPERS
=============================== */
function getScoreColor(score) {
  if (score >= 80) return "score-high";
  if (score >= 50) return "score-medium";
  return "score-low";
}

function getScoreLabel(score) {
  if (score >= 80) return "Trusted Customer";
  if (score >= 50) return "Regular Customer";
  return "High Risk";
}

/* ===============================
   RENDER CREDIT SCORE PAGE
=============================== */
export async function renderCreditScore(container) {
  const profiles = await getCustomerProfiles();
  const scores = await getCreditTrustScores();

  container.innerHTML = renderLayout(`
    <section class="credit-score-page">
      <h1>Customer Credit Health</h1>

      <div class="credit-score-list">
        ${
          scores.length === 0
            ? `<p class="muted">No credit data available</p>`
            : scores
                .map(score => {
                  const profile = profiles.find(
                    p =>
                      p.customerName.toLowerCase() ===
                      score.customerName.toLowerCase()
                  );

                  return `
                    <div class="credit-card">
                      <div class="credit-header">
                        <div class="credit-info">
                          <h3>${score.customerName}</h3>
                          <span class="credit-tag">
                            ${profile?.category || "Unclassified"}
                          </span>
                        </div>

                        <div class="credit-score-badge ${getScoreColor(
                          score.creditScore
                        )}">
                          ${score.creditScore}
                        </div>
                      </div>

                      <div class="credit-bar">
                        <div
                          class="credit-bar-fill ${getScoreColor(
                            score.creditScore
                          )}"
                          style="width: ${score.creditScore}%;"
                        ></div>
                      </div>

                      <div class="credit-footer">
                        ${getScoreLabel(score.creditScore)}
                      </div>
                    </div>
                  `;
                })
                .join("")
        }
      </div>
    </section>
  `);
}