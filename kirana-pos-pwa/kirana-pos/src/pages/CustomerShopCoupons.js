import { renderLayout } from "../components/Layout";
import { getAllShops } from "../services/shopService";
import { getEligibleCoupons } from "../services/couponService";

export async function renderCustomerShopCoupons(container) {

  const session =
    JSON.parse(sessionStorage.getItem("customer_session"));

  if (!session) {
    location.hash = "customer-login";
    return;
  }

  const params =
    new URLSearchParams(location.hash.split("?")[1]);

  const shopId = params.get("shop");

  const { getCustomerShops } =
    await import("../services/customerShopService.js");

  const links = await getCustomerShops(session.id);

  const shopIds = links.map(l => l.shopId);

  const allShops = await getAllShops();

  const shops = allShops.filter(s => shopIds.includes(s.id));

  /* SHOW SHOP LIST FIRST */
  if (!shopId) {

    container.innerHTML = `
      <section>

        <h2>Your Shops</h2>

        <div class="coupon-grid">

          ${shops.map(shop => `
            <div class="glass-card coupon-card"
                 data-shop="${shop.id}">

              <div class="coupon-header">
                ${shop.name}
              </div>

              <div class="coupon-body">
                View available coupons
              </div>

            </div>
          `).join("")}

        </div>

      </section>
    `;

    container.querySelectorAll("[data-shop]")
      .forEach(card => {

        card.onclick = () => {

          location.hash =
            "customer-coupons?shop=" +
            card.dataset.shop;

        };

      });

    return;
  }

  /* SHOW COUPONS FOR SELECTED SHOP */

  const shop =
    shops.find(s => s.id === shopId);
  if (!shop) {
    container.innerHTML = "<p>Shop not found</p>";
    return;
  }

  const coupons =
    await getEligibleCoupons(
      session.id,
      shopId
    );

  container.innerHTML = `
    <section>

      <h2>${shop.name}</h2>

      <div class="coupon-grid">

        ${coupons.map(c => `
          <div class="coupon-card premium ${c.loyaltyRequired || 'bronze'}">

            <div class="coupon-top">
              <span class="coupon-badge">
                ${(c.loyaltyRequired || "bronze").toUpperCase()}
              </span>
              <span class="coupon-expiry">
                Expires ${new Date(c.expiryDate).toLocaleDateString()}
              </span>
            </div>

            <div class="coupon-main">
              <h2>${c.value}% OFF</h2>
              <p>Min Purchase ₹${c.minPurchase}</p>
            </div>

            <div class="coupon-code">
              ${c.code}
            </div>

          </div>
        `).join("")}

      </div>

    </section>
  `;
}

