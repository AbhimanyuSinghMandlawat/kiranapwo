import { renderLayout } from "../components/Layout";
import { createCoupon, getAllCoupons } from "../services/couponService";
import { getShopSettings } from "../services/db";
import { showToast } from "../utils/toast";
import { getCurrentUser } from "../auth/authService";

export async function renderCouponManager(container) {

  const user     = await getCurrentUser();
  const settings = await getShopSettings();
  const shopId   = settings?.shopId || "local";
  const coupons  = await getAllCoupons();

  const content = `
    <section class="dashboard">

      <h1>🎟️ Coupon Manager</h1>

      <div class="glass-card">
        <h2>Create New Coupon</h2>

        <div class="form-group">
          <label>Coupon Title</label>
          <input id="coupon-title" placeholder="e.g. Diwali Special" />
        </div>

        <div class="form-group">
          <label>Coupon Code</label>
          <input id="coupon-code" placeholder="e.g. SAVE20" style="text-transform:uppercase" />
        </div>

        <div class="form-group">
          <label>Discount % <small style="color:#e57373">(max 50% — to protect shop profit)</small></label>
          <input id="coupon-value" type="number" min="1" max="50" placeholder="e.g. 15" />
        </div>

        <div class="form-group">
          <label>Minimum Purchase ₹</label>
          <input id="coupon-min" type="number" min="1" placeholder="e.g. 200" />
        </div>

        <div class="form-group">
          <label>Eligible Loyalty Level</label>
          <select id="coupon-loyalty">
            <option value="bronze">Bronze+</option>
            <option value="silver">Silver+</option>
            <option value="gold">Gold+</option>
            <option value="platinum">Platinum Only</option>
          </select>
        </div>

        <div class="form-group">
          <label>Expiry Date</label>
          <input id="coupon-expiry" type="date" />
        </div>

        <button id="create-coupon" class="btn-primary full-width">
          ✅ Create Coupon
        </button>
      </div>


      <h2 style="margin-top:24px">Active Coupons (${coupons.filter(c => c.active !== false).length})</h2>

      <div class="coupon-grid">
        ${
          coupons.length === 0
            ? `<p style="color:#888">No coupons created yet.</p>`
            : coupons.map(c => `
                <div class="glass-card coupon-card ${c.active === false ? 'coupon-inactive' : ''}">

                  <div class="coupon-header">
                    <strong>${c.title || c.code || "Coupon"}</strong>
                    <span class="coupon-code">${c.code || "—"}</span>
                  </div>

                  <div class="coupon-body">
                    <div class="coupon-discount">${c.value}% OFF</div>
                    <div class="coupon-condition">Min ₹${c.minPurchase || 0}</div>
                    <div class="coupon-loyalty">${(c.loyaltyRequired || "bronze").toUpperCase()}+</div>
                    <div class="coupon-expiry">Expires: ${c.expiryDate || c.expiresAt || "—"}</div>
                    <div class="coupon-status">${c.active === false ? "❌ Inactive" : "✅ Active"}</div>
                  </div>

                </div>
              `).join("")
        }
      </div>

    </section>
  `;

  container.innerHTML = await renderLayout(content);

  document.getElementById("create-coupon").onclick = async () => {

    const title          = document.getElementById("coupon-title").value.trim();
    const code           = document.getElementById("coupon-code").value.trim().toUpperCase();
    const rawValue       = parseFloat(document.getElementById("coupon-value").value) || 0;
    const minPurchase    = parseFloat(document.getElementById("coupon-min").value) || 0;
    const loyaltyRequired = document.getElementById("coupon-loyalty").value;
    const expiryDate     = document.getElementById("coupon-expiry").value;

    // ── Validation ──
    if (!title)         { showToast("Enter a coupon title", "error");          return; }
    if (!code)          { showToast("Enter a coupon code",  "error");          return; }
    if (rawValue <= 0)  { showToast("Discount must be > 0%", "error");         return; }
    if (rawValue > 50)  { showToast("Max discount is 50% (to protect profit)", "error"); return; }
    if (minPurchase <= 0){ showToast("Minimum purchase must be > ₹0", "error"); return; }
    if (!expiryDate)    { showToast("Select an expiry date", "error");         return; }

    const value = Math.min(rawValue, 50); // Hard cap

    const coupon = {
      id:              crypto.randomUUID(),
      shopId,
      title,
      code,
      value,
      minPurchase,
      loyaltyRequired,
      expiryDate,
      type:      "discount",
      active:    true,
      used:      false,
      issuedAt:  Date.now(),
      expiresAt: new Date(expiryDate).getTime(),
      createdAt: Date.now()
    };

    await createCoupon(coupon);
    showToast(`Coupon "${code}" created (${value}% off)!`, "success");
    await renderCouponManager(container);
  };
}