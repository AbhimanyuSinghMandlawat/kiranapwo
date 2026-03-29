import { getCurrentUser } from "../auth/authService";
import { t } from "../i18n/i18n";

/* ── Status bar text ── */
export function buildSyncText(online) {
  return online
    ? `<span class="dot online"></span> Online &mdash; Cloud sync active`
    : `<span class="dot offline"></span> Offline &mdash; Working locally`;
}

export async function renderLayout(contentHtml) {
  const user      = await getCurrentUser();
  const role      = user?.role;
  const isOwner   = role === "owner";
  const isManager = role === "manager";
  const isCashier = role === "cashier";
  const online    = navigator.onLine;

  return `
    <div class="app-layout">

      <!-- ── MOBILE HEADER ── -->
      <div class="mobile-header">
        <button id="menu-toggle" class="menu-btn" aria-label="Open menu">☰</button>
        <div class="app-title">Kirana POS</div>
        <div class="sync-mini" id="sync-mini-dot">${online ? "🟢" : "🟠"}</div>
      </div>

      <div id="mobile-drawer" class="mobile-drawer">
        <div class="drawer-panel">
          <div id="drawer-links"></div>
        </div>
      </div>

      <!-- ── DESKTOP SIDEBAR ── -->
      <aside class="sidebar">
        <h2 class="logo">Kirana POS</h2>
        <nav>
          <div class="lang-switch">
            <button data-lang="en">EN</button>
            <button data-lang="hi">हिं</button>
            <button data-lang="hing">HING</button>
          </div>

          <a href="#" data-page="dashboard">${t("sidebar.dashboard")}</a>
          <a href="#" data-page="add-sale">${t("sidebar.addSale")}</a>

          ${!isCashier ? `<a href="#" data-page="stock">${t("sidebar.stock")}</a>` : ""}
          ${!isCashier ? `<a href="#" data-page="reports">${t("sidebar.reports")}</a>` : ""}
          ${!isCashier ? `<a href="#" data-page="credit">${t("sidebar.creditScore")}</a>` : ""}
          ${!isCashier ? `<a href="#" data-page="ledger">${t("sidebar.creditLedger")}</a>` : ""}
          ${(isOwner || isManager) ? `<a href="#" data-page="credit-loan">💸 ${t("sidebar.creditLoan")}</a>` : ""}

          ${isOwner ? `<a href="#" data-page="manage-staff">${t("sidebar.manageStaff")}</a>` : ""}
          ${isOwner ? `<a href="#" data-page="audit-log">${t("sidebar.auditLog")}</a>` : ""}
          ${isOwner ? `<a href="#" data-page="shop-settings">${t("sidebar.shopSettings")}</a>` : ""}
          ${isOwner ? `<a href="#" data-page="coupon-manager">🎟️ ${t("sidebar.coupons")}</a>` : ""}

          <a href="#" data-page="logout" class="logout-link">${t("sidebar.logout")}</a>
        </nav>
      </aside>

      <!-- ── RIGHT PANEL: status bar + content ── -->
      <div class="app-right-panel">

        <!-- Status bar lives OUTSIDE .main-content so page renders never wipe it -->
        <div class="sync-status" id="sync-status">${buildSyncText(online)}</div>

        <main class="main-content page-enter">
          <div id="toast-container"></div>
          ${contentHtml}
        </main>

      </div>

    </div>
  `;
}

/* ── Live network badge update ── */
export function updateNetworkBadge(online) {
  const bar  = document.getElementById("sync-status");
  const mini = document.getElementById("sync-mini-dot");
  if (bar)  bar.innerHTML    = buildSyncText(online);
  if (mini) mini.textContent = online ? "🟢" : "🟠";
}

/* ── Layout events ── */
export function attachLayoutEvents() {

  /* language switch */
  import("../i18n/i18n.js").then(({ setLanguage }) => {
    document.querySelectorAll(".lang-switch button").forEach(btn => {
      btn.onclick = () => setLanguage(btn.dataset.lang);
    });
  });

  /* responsive nav placement */
  function placeNavigation() {
    const sidebar    = document.querySelector(".sidebar");
    const sidebarNav = document.querySelector(".sidebar nav, #drawer-links nav");
    const drawerLinks = document.getElementById("drawer-links");

    if (!sidebar || !sidebarNav || !drawerLinks) return;

    if (window.innerWidth <= 768) {
      if (!drawerLinks.contains(sidebarNav)) drawerLinks.appendChild(sidebarNav);
    } else {
      if (!sidebar.contains(sidebarNav)) sidebar.appendChild(sidebarNav);
      document.body.classList.remove("drawer-open");
    }
  }

  requestAnimationFrame(placeNavigation);
  window.addEventListener("resize", () => requestAnimationFrame(placeNavigation));
}
