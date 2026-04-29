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

  // Load full profile for loyalty level
  const { getCurrentCustomer } = await import("../services/customerAuthService.js");
  const fullCustomer = await getCurrentCustomer();
  const loyaltyLevel  = fullCustomer?.loyaltyLevel  || "bronze";
  const displayName   = fullCustomer?.displayName   || session.displayName || "Customer";
  const loyaltyColour = loyaltyLevel === "gold"   ? "#f59e0b"
                      : loyaltyLevel === "silver" ? "#6b7280"
                      : "#92400e";

  container.innerHTML = `

    <div class="page-header">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px">
        <div>
          <h1 class="page-title" style="margin:0">👋 Hello, ${displayName}</h1>
          <p style="margin:6px 0 0">
            <span style="background:${loyaltyColour};color:#fff;padding:3px 12px;border-radius:999px;font-size:13px;font-weight:600;text-transform:capitalize">
              ${loyaltyLevel} Member
            </span>
          </p>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button id="view-coupons-btn"
            style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;
                   padding:10px 18px;border-radius:12px;cursor:pointer;font-size:14px;font-weight:600">
            🎟️ My Coupons${totalCoupons > 0 ? ` (${totalCoupons})` : ""}
          </button>
          <button id="customer-logout-btn"
            style="background:#ef4444;color:#fff;border:none;
                   padding:10px 16px;border-radius:12px;cursor:pointer;font-size:14px;font-weight:600">
            🚪 Logout
          </button>
        </div>
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
          <div class="stat-label">Lifetime Spend</div>
          <div class="stat-value">₹${(fullCustomer?.lifetimeSpend || 0).toLocaleString("en-IN")}</div>
        </div>
      </div>

    </div>

    <div class="card" style="margin-top:24px;">
      <div class="card-header" style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.08)">
        <h3 style="margin:0">🏪 Your Shop Memberships</h3>
      </div>
      <div class="card-body" style="padding:16px 20px">
        ${membershipContent}
      </div>
    </div>

  `;

  // Wire buttons
  document.getElementById("view-coupons-btn")?.addEventListener("click", () => {
    location.hash = "customer-coupons";
  });
  document.getElementById("customer-logout-btn")?.addEventListener("click", async () => {
    const { logoutCustomer } = await import("../services/customerAuthService.js");
    logoutCustomer();
    location.hash = "customer-login";
  });
}