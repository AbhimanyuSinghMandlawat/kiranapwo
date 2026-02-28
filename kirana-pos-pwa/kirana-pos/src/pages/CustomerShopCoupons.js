import { renderLayout } from "../components/Layout";
import { getAllShops } from "../services/shopService";
import { getEligibleCoupons } from "../services/couponService";

export async function renderCustomerShopCoupons(container) {

  const session =
    JSON.parse(sessionStorage.getItem("customerSession"));

  if (!session) {

    location.hash = "customer-login";

    return;
  }

  const params =
    new URLSearchParams(location.hash.split("?")[1]);

  const shopId = params.get("shop");

  const shops = await getAllShops();

  const shop =
    shops.find(s => s.id === shopId);

  const coupons =
    await getEligibleCoupons(
      session.name,
      shopId
    );

  const couponCards = coupons.length === 0
    ? `<div class="glass-card">
         No coupons available.
       </div>`
    : coupons.map(c => `
      <div class="glass-card coupon-card">

        <div class="coupon-header">

          <div class="coupon-code">
            ${c.code}
          </div>

          <div class="coupon-discount">
            ${c.value}% OFF
          </div>

        </div>

        <div class="coupon-body">

          <div>
            Min Purchase: ₹${c.minPurchase}
          </div>

          <div>
            Loyalty Required:
            ${c.loyaltyRequired}
          </div>

          <div class="coupon-expiry">
            Expires:
            ${new Date(c.expiryDate)
              .toLocaleDateString()}
          </div>

        </div>

      </div>
    `).join("");



  const content = `
    <section class="dashboard">

      <h2>${shop.name}</h2>

      <div class="coupon-grid">

        ${couponCards}

      </div>

    </section>
  `;


  container.innerHTML =
    await renderLayout(content);

}