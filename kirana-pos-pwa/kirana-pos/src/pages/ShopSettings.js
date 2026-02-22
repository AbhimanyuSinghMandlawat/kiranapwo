import { renderLayout } from "../components/Layout";
import { getShopSettings, saveShopSettings } from "../services/db";
import { showToast } from "../utils/toast";
import { t } from "../i18n/i18n";
import QRCode from "qrcode";

export async function renderShopSettings(container){

  const settings = await getShopSettings();

  container.innerHTML = await renderLayout(`
    <section class="shop-settings">
      <div class="glass-card">
        <h1>${t("sidebar.shopSettings")}</h1>

        <form id="settings-form">

          <label>Shop Name</label>
          <input id="shop-name" type="text" value="${settings?.shopName || ""}" />

          <label>UPI ID</label>
          <input id="upi-id" type="text" placeholder="example@upi"
            value="${settings?.upiId || ""}" />

          <label>Contact Email</label>
          <input id="shop-email" type="email"
            value="${settings?.email || ""}" />

          <button class="btn-primary full-width" type="submit">
            Save Settings
          </button>
        </form>
      </div>
    </section>
  `);

  document.getElementById("settings-form").onsubmit = async e => {
    e.preventDefault();

    const shopName = document.getElementById("shop-name").value.trim();
    const upiId = document.getElementById("upi-id").value.trim();
    const email = document.getElementById("shop-email").value.trim();

    const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(shopName)}&cu=INR`;

    const qrImage = await QRCode.toDataURL(upiString);

    await saveShopSettings({
      shopName,
      upiId,
      email,
      qrImage,
    });

    showToast(t("shopSettings.saved"), "success");
  };
}