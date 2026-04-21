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
  const role      = user?.role  || "owner";
  const name      = user?.name  || user?.username || "User";
  const isOwner   = role === "owner";
  const isManager = role === "manager";
  const isCashier = role === "cashier";
  const online    = navigator.onLine;

  // Initials for avatar
  const initials = name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase() || "U";

  return `
    <div class="app-layout">

      <!-- ── MOBILE HEADER ── -->
      <div class="mobile-header">
        <button id="menu-toggle" class="menu-btn" aria-label="Open menu">☰</button>
        <div class="app-title">🛒 Kirana POS</div>
        <div class="sync-mini" id="sync-mini-dot">${online ? "🟢" : "🟠"}</div>
      </div>

      <div id="mobile-drawer" class="mobile-drawer">
        <div class="drawer-panel">
          <div id="drawer-links"></div>
        </div>
      </div>

      <!-- ── DESKTOP SIDEBAR ── -->
      <aside class="sidebar">

        <!-- Brand Header -->
        <div class="sidebar-brand">
          <div class="sidebar-brand-icon">🛒</div>
          <div class="sidebar-brand-text">
            <span class="sidebar-brand-name">Kirana POS</span>
            <span class="sidebar-brand-sub">Management System</span>
          </div>
        </div>

        <nav>
          <!-- Language Switcher -->
          <div class="lang-switch">
            <button data-lang="en">EN</button>
            <button data-lang="hi">हिं</button>
            <button data-lang="hing">HING</button>
          </div>

          <!-- MAIN NAV -->
          <div class="nav-section-label">Main</div>
          <a href="#" data-page="dashboard">
            <span class="nav-icon">📊</span>${t("sidebar.dashboard")}
          </a>
          <a href="#" data-page="add-sale">
            <span class="nav-icon">🛍️</span>${t("sidebar.addSale")}
          </a>

          <!-- INVENTORY -->
          ${!isCashier ? `
          <div class="sidebar-divider"></div>
          <div class="nav-section-label">Inventory</div>
          <a href="#" data-page="stock">
            <span class="nav-icon">📦</span>${t("sidebar.stock")}
          </a>
          <a href="#" data-page="bill-scanner">
            <span class="nav-icon">📷</span>AI Bill Scanner
          </a>
          ` : ""}

          <!-- FINANCE -->
          ${!isCashier ? `
          <div class="sidebar-divider"></div>
          <div class="nav-section-label">Finance</div>
          <a href="#" data-page="reports">
            <span class="nav-icon">📈</span>${t("sidebar.reports")}
          </a>
          <a href="#" data-page="credit">
            <span class="nav-icon">⭐</span>${t("sidebar.creditScore")}
          </a>
          <a href="#" data-page="ledger">
            <span class="nav-icon">📒</span>${t("sidebar.creditLedger")}
          </a>
          ${(isOwner || isManager) ? `
          <a href="#" data-page="credit-loan">
            <span class="nav-icon">💸</span>${t("sidebar.creditLoan")}
          </a>` : ""}
          ` : ""}

          <!-- ADMIN -->
          ${isOwner ? `
          <div class="sidebar-divider"></div>
          <div class="nav-section-label">Admin</div>
          <a href="#" data-page="manage-staff">
            <span class="nav-icon">👥</span>${t("sidebar.manageStaff")}
          </a>
          <a href="#" data-page="coupon-manager">
            <span class="nav-icon">🎟️</span>${t("sidebar.coupons")}
          </a>
          <a href="#" data-page="audit-log">
            <span class="nav-icon">🔍</span>${t("sidebar.auditLog")}
          </a>
          <a href="#" data-page="shop-settings">
            <span class="nav-icon">⚙️</span>${t("sidebar.shopSettings")}
          </a>
          ` : ""}

          <!-- LOGOUT -->
          <div class="sidebar-divider"></div>
          <a href="#" data-page="logout" class="logout-link">
            <span class="nav-icon">🚪</span>${t("sidebar.logout")}
          </a>
        </nav>

        <!-- User Footer -->
        <div class="sidebar-user-footer">
          <div class="sidebar-user-avatar">${initials}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">${name}</div>
            <div class="sidebar-user-role">${role}</div>
          </div>
        </div>

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
