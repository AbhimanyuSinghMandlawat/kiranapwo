import { getCustomerShops } from "../services/customerShopService";
import { getEligibleCoupons } from "../services/couponService";
import { openDB } from "../services/db";

export async function renderCustomerPortal(container){

  const session = JSON.parse(
    sessionStorage.getItem("customer_session")
  );

  if (!session) {
    location.hash = "customer-login";
    return;
  }

  // 1️⃣ Get linked shops
  const links = await getCustomerShops(session.id);
  const linkedShopCount = links.length;

  // 2️⃣ Count eligible coupons
  let totalCoupons = 0;

  for (const link of links) {
    const coupons = await getEligibleCoupons(
      session.id,
      link.shopId
    );
    totalCoupons += coupons.length;
  }

  // 3️⃣ Savings (future feature)
  const totalSavings = 0;

  // 4️⃣ Membership content
  let membershipContent = "";

  if (links.length === 0) {
    membershipContent = `
      <div class="empty-state">
        <div class="empty-icon">🏪</div>
        <div class="empty-title">No shops linked yet</div>
        <div class="empty-description">
          Visit partner shops and scan coupons to build loyalty and earn rewards.
        </div>
      </div>
    `;
  } else {
    const db = await openDB();

    const shops = await new Promise(resolve => {

      const tx = db.transaction("shops","readonly");
      const store = tx.objectStore("shops");

      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);

    });

    membershipContent = `
      <div class="membership-list">
        ${links.map(link => {

          const shop = shops.find(s => s.id === link.shopId);

          return `
            <div class="membership-item">
              ${shop?.name || "Unknown Shop"}
            </div>
          `;

        }).join("")}
      </div>
    `;
  }

  container.innerHTML = `

    <div class="page-header">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <div>
          <h1 class="page-title">Your Shops</h1>
          <p class="page-subtitle">
            Manage your loyalty, coupons and shop relationships
          </p>
        </div>
        <div class="status-badge online">● Active</div>
      </div>
    </div>

    <div class="card-grid">

      <div class="card stat-card">
        <div class="card-body">
          <div class="stat-label">Linked Shops</div>
          <div class="stat-value">${linkedShopCount}</div>
        </div>
      </div>

      <div class="card stat-card">
        <div class="card-body">
          <div class="stat-label">Available Coupons</div>
          <div class="stat-value">${totalCoupons}</div>
        </div>
      </div>

      <div class="card stat-card">
        <div class="card-body">
          <div class="stat-label">Total Savings</div>
          <div class="stat-value">₹${totalSavings}</div>
        </div>
      </div>

    </div>

    <div class="card" style="margin-top:24px;">
      <div class="card-header">
        <h3>Your Shop Memberships</h3>
      </div>
      <div class="card-body">
        ${membershipContent}
      </div>
    </div>

  `;
}