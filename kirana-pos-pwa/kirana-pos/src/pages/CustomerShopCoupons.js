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

  const shops = await getAllShops();

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

  const coupons =
    await getEligibleCoupons(
      session.name,
      shopId
    );

  container.innerHTML = `
    <section>

      <h2>${shop.name}</h2>

      <div class="coupon-grid">

        ${coupons.map(c => `
          <div class="glass-card coupon-card">

            <div class="coupon-header">
              ${c.code}
            </div>

            <div class="coupon-body">

              ${c.value}% OFF<br>

              Min ₹${c.minPurchase}<br>

              Expires:
              ${new Date(c.expiryDate)
                .toLocaleDateString()}

            </div>

          </div>
        `).join("")}

      </div>

    </section>
  `;
}

