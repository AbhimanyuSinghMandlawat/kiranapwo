import { getCurrentUser } from "../auth/authService";
import { t } from "../i18n/i18n";

export async function renderLayout(contentHtml) {
  const user = await getCurrentUser();
  const role = user?.role;

  const isOwner = role === "owner";
  const isManager = role === "manager";
  const isCashier = role === "cashier";

  const online = navigator.onLine;

  const syncText = online
    ? `<span class="dot online"></span> Online · All data synced`
    : `<span class="dot offline"></span> Offline · Working locally`;

  return `
    <div class="app-layout">

      <!-- ================= MOBILE HEADER ================= -->
      <div class="mobile-header">
        <button id="menu-toggle" class="menu-btn">☰</button>
        <div class="app-title">Kirana POS</div>
        <div class="sync-mini">${online ? "🟢" : "🟠"}</div>
      </div>

      <div id="mobile-drawer" class="mobile-drawer">
        <div class="drawer-panel">
          <div id="drawer-links"></div>
        </div>
      </div>
      <!-- ================================================= -->

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

          ${isOwner ? `<a href="#" data-page="manage-staff">${t("sidebar.manageStaff")}</a>` : ""}
          ${isOwner ? `<a href="#" data-page="audit-log">${t("sidebar.auditLog")}</a>` : ""}
          ${isOwner ? `<a href="#" data-page="shop-settings">${t("sidebar.shopSettings")}</a>` : ""}
          

          <a href="#" data-page="logout">${t("sidebar.logout")}</a>
        </nav>
      </aside>

      <main class="main-content page-enter">
        <div class="network-status" id="network-status"></div>
        <div class="sync-status" id="sync-status">${syncText}</div>
        <div id="toast-container"></div>
        ${contentHtml}
      </main>

      <!-- Bottom nav remains for desktop/tablet -->
      <nav class="bottom-nav">
        <button data-page="dashboard">${t("sidebar.dashboard")}</button>
        <button data-page="add-sale">${t("sidebar.addSale")}</button>

        ${!isCashier ? `<a href="#" data-page="stock">${t("sidebar.stock")}</a>` : ""}
        ${!isCashier ? `<a href="#" data-page="reports">${t("sidebar.reports")}</a>` : ""}
        ${!isCashier ? `<a href="#" data-page="credit">${t("sidebar.creditScore")}</a>` : ""}
        ${!isCashier ? `<a href="#" data-page="ledger">${t("sidebar.creditLedger")}</a>` : ""}

        ${isOwner ? `<a href="#" data-page="manage-staff">${t("sidebar.manageStaff")}</a>` : ""}
        ${isOwner ? `<a href="#" data-page="audit-log">${t("sidebar.auditLog")}</a>` : ""}
        ${isOwner ? `<a href="#" data-page="shop-settings">${t("sidebar.shopSettings")}</a>` : ""}
        

        <a href="#" data-page="logout">${t("sidebar.logout")}</a>
      </nav>

    </div>
  `;
}

/* ================= EVENTS ================= */

export function attachLayoutEvents() {

  /* language switch */
  import("../i18n/i18n.js").then(({ setLanguage }) => {
    document.querySelectorAll(".lang-switch button").forEach(btn => {
      btn.onclick = () => setLanguage(btn.dataset.lang);
    });
  });

  /* move single navigation instead of cloning */
  function placeNavigation() {

    const sidebar = document.querySelector(".sidebar");
    const sidebarNav = document.querySelector(".sidebar nav, #drawer-links nav");
    const drawerLinks = document.getElementById("drawer-links");


    if (!sidebar || !sidebarNav || !drawerLinks) return;

    if (window.innerWidth <= 900) {
      if (!drawerLinks.contains(sidebarNav)) {
        drawerLinks.appendChild(sidebarNav);
      }
    } else {
      const sidebar = document.querySelector(".sidebar");
      if (sidebar && !sidebar.contains(sidebarNav)) {
        sidebar.appendChild(sidebarNav);
      }
      document.body.classList.remove("drawer-open");
    }
  }
  requestAnimationFrame(placeNavigation);

  window.addEventListener("resize", () => {
    requestAnimationFrame(placeNavigation);
  });
}


