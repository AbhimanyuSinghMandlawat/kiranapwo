import { renderLayout } from "../components/Layout";
import { getCustomerProfiles } from "../services/customerProfile";
import { getCreditTrustScores } from "../services/creditScore";

/* ===============================
   RENDER CREDIT SCORE PAGE
=============================== */
export async function renderCreditScore(container) {
  const profiles = await getCustomerProfiles();
  const creditScores = await getCreditTrustScores();

  container.innerHTML = renderLayout(`
    <section class="credit-score">
      <div class="glass-card">
        <h1>Credit Score</h1>

        ${
          creditScores.length === 0
            ? `<p>No credit data available</p>`
            : creditScores
                .map(score => {
                  const profile = profiles.find(
                    p =>
                      p.customerName.toLowerCase() ===
                      score.customerName.toLowerCase()
                  );

                  return `
                    <div class="credit-row">
                      <div>
                        <strong>${score.customerName}</strong>
                        <small>
                          ${
                            profile?.category ||
                            "Unclassified"
                          }
                        </small>
                      </div>
                      <div class="credit-score-value">
                        ${score.creditScore}
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