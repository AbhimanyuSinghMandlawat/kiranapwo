import { createCoupon, getAllCoupons } from "../services/couponService";

export async function renderCouponManager() {

  const coupons = await getAllCoupons();

  const content = `
  <section class="dashboard">

    <div class="glass-card">

      <h2>Create Coupon</h2>

      <input id="coupon-title" placeholder="Coupon Title" />

      <input id="coupon-code" placeholder="Coupon Code (SAVE50)" />

      <input id="coupon-value" type="number" placeholder="Discount %" />

      <input id="coupon-min" type="number" placeholder="Minimum Purchase ₹" />

      <select id="coupon-loyalty">
        <option value="bronze">Bronze+</option>
        <option value="silver">Silver+</option>
        <option value="gold">Gold+</option>
        <option value="platinum">Platinum Only</option>
      </select>

      <input id="coupon-expiry" type="date" />

      <button id="create-coupon" class="btn-primary">
        Create Coupon
      </button>

    </div>


    <h2 style="margin-top:20px">Active Coupons</h2>

    <div class="coupon-grid">

      ${
        coupons.map(c => `
          <div class="glass-card coupon-card">

            <div class="coupon-header">
              <strong>${c.title}</strong>
              <span class="coupon-code">${c.code}</span>
            </div>

            <div class="coupon-body">

              <div class="coupon-discount">
                ${c.value}% OFF
              </div>

              <div class="coupon-condition">
                Min ₹${c.minPurchase}
              </div>

              <div class="coupon-loyalty">
                ${c.loyaltyRequired.toUpperCase()}
              </div>

              <div class="coupon-expiry">
                Expires: ${c.expiryDate}
              </div>

            </div>

          </div>
        `).join("")
      }

    </div>

  </section>
  `;

  document.querySelector(".main-content").innerHTML = content;


  document.getElementById("create-coupon").onclick = async () => {

    const coupon = {

      id: crypto.randomUUID(),

      title: document.getElementById("coupon-title").value,

      code: document.getElementById("coupon-code").value,

      value: Number(document.getElementById("coupon-value").value),

      minPurchase: Number(document.getElementById("coupon-min").value),

      loyaltyRequired: document.getElementById("coupon-loyalty").value,

      expiryDate: document.getElementById("coupon-expiry").value,

      active: true,

      createdAt: Date.now()

    };

    await createCoupon(coupon);

    renderCouponManager();
  };
}