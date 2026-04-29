import { buildCustomerLoyaltyProfiles }
from "../services/loyaltyEngine";

export async function renderLoyaltyDashboard() {

  const profiles =
    await buildCustomerLoyaltyProfiles();

  const list = Object.values(profiles);

  const content = `
  <section class="dashboard">

    <h2>Customer Loyalty Profiles</h2>

    <div class="coupon-grid">

    ${
      list.map(p => `
        <div class="glass-card">

          <h3>${p.customerName}</h3>

          <div>Loyalty: ${p.loyaltyLevel}</div>

          <div>Total Spent: ₹${p.totalSpent}</div>

          <div>Visits: ${p.visitCount}</div>

        </div>
      `).join("")
    }

    </div>

  </section>
  `;

  document.querySelector(".main-content").innerHTML = content;
}