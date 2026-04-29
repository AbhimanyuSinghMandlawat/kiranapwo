import { getShopSettings, saveShopSettings } from "../services/db";
import { showToast } from "../utils/toast";
import { getSyncStats } from "../services/syncService";
import { t } from "../i18n/i18n";
import QRCode from "qrcode";

const API_BASE = (import.meta.env.VITE_API_URL || "https://kiranapwoo-backend.onrender.com").replace(/\/$/, "");

export async function renderShopSettings(container) {
  const mc = document.querySelector(".main-content") || container;
  const settings = await getShopSettings();
  const hasToken = !!settings?.backendToken;

  mc.innerHTML = `
    <section class="shop-settings">
      <div class="glass-card" style="margin-bottom:20px">
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

      <div class="glass-card" id="cloud-sync-card">
        <h2 style="margin-bottom:4px">☁️ Cloud Sync</h2>
        <p style="color:var(--text-secondary,#94a3b8);font-size:.85rem;margin-bottom:16px">
          Connect to the backend server to sync your data to MySQL automatically.
        </p>

        <div id="sync-status-badge" style="
          display:inline-flex;align-items:center;gap:8px;
          padding:6px 14px;border-radius:99px;margin-bottom:18px;font-size:.85rem;font-weight:600;
          background:${hasToken ? "rgba(34,197,94,0.12)" : "rgba(248,113,113,0.12)"};
          color:${hasToken ? "#4ade80" : "#f87171"};
          border:1px solid ${hasToken ? "rgba(34,197,94,0.3)" : "rgba(248,113,113,0.3)"};
        ">
          <span>${hasToken ? "🟢" : "🔴"}</span>
          ${hasToken ? "Connected — Sync Active" : "Not Connected"}
        </div>

        <div id="sync-stats-wrap" style="display:${hasToken ? "block" : "none"};margin-bottom:16px"></div>

        <div style="display:flex;gap:8px;margin-bottom:16px">
          <button id="tab-login" class="btn-primary" style="flex:1" onclick="window.__syncTab('login')">Login</button>
          <button id="tab-register" class="btn-secondary" style="flex:1" onclick="window.__syncTab('register')">Register Shop</button>
        </div>

        <div id="login-form-wrap">
          <label>Owner Phone</label>
          <input id="backend-phone" type="tel" placeholder="e.g. 9999999999"
            value="${settings?.backendPhone || ""}" />

          <label>Password</label>
          <input id="backend-password" type="password" placeholder="••••••••" />

          <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">
            <button id="btn-connect" class="btn-primary" style="flex:1">🔗 Connect to Cloud</button>
            <button id="btn-disconnect" class="btn-secondary" style="flex:1;${hasToken ? "" : "display:none"}">🔌 Disconnect</button>
          </div>
        </div>

        <div id="register-form-wrap" style="display:none">
          <label>Shop Name</label>
          <input id="reg-shop-name" type="text" placeholder="My Kirana Store" />

          <label>Owner Name</label>
          <input id="reg-owner-name" type="text" placeholder="Ramesh Kumar" />

          <label>Owner Phone</label>
          <input id="reg-phone" type="tel" placeholder="9999999999" />

          <label>Password</label>
          <input id="reg-password" type="password" placeholder="Create a strong password" />

          <button id="btn-register" class="btn-primary full-width" style="margin-top:12px">
            📝 Register Shop & Connect
          </button>
        </div>

        <div id="cloud-sync-error" style="
          display:none;margin-top:12px;padding:10px 14px;border-radius:10px;
          background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);
          color:#f87171;font-size:.85rem;
        "></div>
      </div>
    </section>
  `;

  document.getElementById("settings-form").onsubmit = async (e) => {
    e.preventDefault();

    const shopName = document.getElementById("shop-name").value.trim();
    const upiId = document.getElementById("upi-id").value.trim();
    const email = document.getElementById("shop-email").value.trim();

    const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(shopName)}&cu=INR`;
    const qrImage = upiId ? await QRCode.toDataURL(upiString) : null;

    const current = (await getShopSettings()) || {};
    await saveShopSettings({
      ...current,
      shopName,
      upiId,
      email,
      ...(qrImage ? { qrImage } : {})
    });

    showToast(t("shopSettings.saved") || "Settings saved!", "success");
  };

  window.__syncTab = (tab) => {
    document.getElementById("login-form-wrap").style.display = tab === "login" ? "block" : "none";
    document.getElementById("register-form-wrap").style.display = tab === "register" ? "block" : "none";
    document.getElementById("tab-login").className = tab === "login" ? "btn-primary" : "btn-secondary";
    document.getElementById("tab-register").className = tab === "register" ? "btn-primary" : "btn-secondary";
  };

  if (hasToken) {
    loadSyncStats();
    setTimeout(() => loadSyncStats(), 3000);
    setTimeout(() => loadSyncStats(), 6000);
  }

  async function loadSyncStats() {
    const stats = await getSyncStats();
    const wrap = document.getElementById("sync-stats-wrap");
    if (!wrap) return;

    wrap.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin-bottom:4px">
        ${stat("📦 Total", stats.total, "#94a3b8")}
        ${stat("✅ Synced", stats.synced, "#4ade80")}
        ${stat("⏳ Pending", stats.pending, "#facc15")}
        ${stat("❌ Failed", stats.failed, "#f87171")}
      </div>
    `;
  }

  function stat(label, value, color) {
    return `
      <div style="
        background:rgba(255,255,255,0.04);border-radius:10px;padding:10px 12px;
        border:1px solid rgba(255,255,255,0.07);text-align:center;
      ">
        <div style="font-size:1.3rem;font-weight:700;color:${color}">${value}</div>
        <div style="font-size:.73rem;color:#64748b;margin-top:2px">${label}</div>
      </div>
    `;
  }

  function showError(msg) {
    const el = document.getElementById("cloud-sync-error");
    el.textContent = msg;
    el.style.display = "block";
  }

  function clearError() {
    const el = document.getElementById("cloud-sync-error");
    if (el) el.style.display = "none";
  }

  document.getElementById("btn-connect").onclick = async () => {
    clearError();

    const phone = document.getElementById("backend-phone").value.trim();
    const password = document.getElementById("backend-password").value;

    if (!phone || !password) {
      showError("Please enter your registered phone and password.");
      return;
    }

    const btn = document.getElementById("btn-connect");
    btn.textContent = "⏳ Connecting...";
    btn.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerphone: phone, password })
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.message || "Login failed. Check your credentials.");
        return;
      }

      const shopId = data.shop?.id || null;
      if (shopId) localStorage.setItem("kirana_db_name", `kirana_pos_${shopId}`);
      const current = (await getShopSettings()) || {};
      await saveShopSettings({
        ...current,
        backendToken: data.token,
        backendPhone: phone,
        backendShopId: shopId
      });

      showToast("✅ Cloud sync connected! Data will now sync to MySQL.", "success");
      setTimeout(() => renderShopSettings(container), 500);
    } catch (err) {
      showError(`Cannot reach backend server at ${API_BASE || "configured URL"}.`);
    } finally {
      btn.textContent = "🔗 Connect to Cloud";
      btn.disabled = false;
    }
  };

  document.getElementById("btn-disconnect").onclick = async () => {
    const current = (await getShopSettings()) || {};
    await saveShopSettings({ ...current, backendToken: null, backendPhone: null, backendShopId: null });
    localStorage.removeItem("kirana_db_name");
    showToast("Disconnected from cloud sync.", "info");
    setTimeout(() => renderShopSettings(container), 300);
  };

  document.getElementById("btn-register").onclick = async () => {
    clearError();

    const shopName = document.getElementById("reg-shop-name").value.trim();
    const ownerName = document.getElementById("reg-owner-name").value.trim();
    const phone = document.getElementById("reg-phone").value.trim();
    const password = document.getElementById("reg-password").value;

    if (!shopName || !ownerName || !phone || !password) {
      showError("All fields are required to register.");
      return;
    }

    if (password.length < 6) {
      showError("Password must be at least 6 characters.");
      return;
    }

    const btn = document.getElementById("btn-register");
    btn.textContent = "⏳ Registering...";
    btn.disabled = true;

    try {
      const regRes = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopname: shopName,
          ownername: ownerName,
          ownerphone: phone,
          password
        })
      });

      const regData = await regRes.json();

      if (!regRes.ok) {
        showError(regData.message || "Registration failed.");
        return;
      }

      const loginRes = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerphone: phone, password })
      });

      const loginData = await loginRes.json();

      if (!loginRes.ok) {
        showError("Registered! But auto-login failed. Please login manually.");
        window.__syncTab("login");
        return;
      }

      const shopId = loginData.shop?.id || null;
      if (shopId) localStorage.setItem("kirana_db_name", `kirana_pos_${shopId}`);
      const current = (await getShopSettings()) || {};
      await saveShopSettings({
        ...current,
        backendToken: loginData.token,
        backendPhone: phone,
        backendShopId: shopId,
        shopName
      });

      showToast(`✅ Shop registered & connected! Shop ID: ${regData.shopid}`, "success");
      setTimeout(() => renderShopSettings(container), 500);
    } catch (err) {
      showError(`Cannot reach backend server at ${API_BASE || "configured URL"}.`);
    } finally {
      btn.textContent = "📝 Register Shop & Connect";
      btn.disabled = false;
    }
  };
}