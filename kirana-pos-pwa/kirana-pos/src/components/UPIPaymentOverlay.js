import { getShopSettings } from "../services/db";
import { showToast } from "../utils/toast";
import QRCode from "qrcode";

export async function openUPIPayment(amount){

  const settings = await getShopSettings();

  if (!settings?.upiId) {
    showToast("UPI not configured in Shop Settings", "error");
    return false;
  }

  const upiUrl =
    `upi://pay?pa=${settings.upiId}` +
    `&pn=${encodeURIComponent(settings.shopName || "Shop")}` +
    `&am=${amount}&cu=INR`;

  const overlay = document.createElement("div");
  overlay.className = "upi-overlay";

  overlay.innerHTML = `
    <div class="upi-modal glass-premium">
        <div class="upi-header">
          <span class="upi-badge">Secure UPI Payment</span>
          <h2>₹ ${amount.toFixed(2)}</h2>
          <p class="upi-merchant">${settings.shopName || ""}</p>
        </div>
        <div class="upi-qr-wrapper">
          <canvas id="upi-qr"></canvas>
        </div>
        <div class="upi-actions">
            <a href="${upiUrl}" class="btn-primary full-width">
              Open in UPI App
            </a>

            <button id="upi-confirm" class="btn-success full-width">
                ✓ Payment Received
            </button>

            <button id="upi-cancel" class="btn-cancel full-width">
                Cancel
            </button>
        </div>
    </div>
        
  `;

  document.body.appendChild(overlay);

  await loadQR("upi-qr", upiUrl);

  return new Promise(resolve => {
    document.getElementById("upi-confirm").onclick = () => {
      overlay.remove();
      resolve(true);
    };
    document.getElementById("upi-cancel").onclick = () => {
      overlay.remove();
      resolve(false);
    };
  });
}

async function loadQR(id, text){
  const canvas = document.getElementById(id);
  await QRCode.toCanvas(canvas, text, { width: 220 });
}