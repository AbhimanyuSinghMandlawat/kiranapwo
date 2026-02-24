import { renderDashboard } from "./pages/Dashboard";
import { renderAddSale } from "./pages/AddSale";
import { renderReports } from "./pages/Reports";
import { renderCreditScore } from "./pages/CreditScore";
import { renderCreditLedger } from "./pages/CreditLedger";
import { renderStock } from "./pages/Stock";
import { renderOpeningStock } from "./pages/OpeningStock";
import { renderOpeningStockEntry } from "./pages/OpeningStockEntry";

import Welcome from "./pages/Welcome";
import { renderOwnerSetup, renderLogin } from "./auth/authUI";
import { getCurrentUser, logout } from "./auth/authService";
import { getAllUsers, isOnboardingCompleted } from "./services/db";

import { renderManageStaff } from "./pages/ManageStaff";
import { renderStaffHistory } from "./pages/StaffHistory";
import { renderShopSettings } from "./pages/ShopSettings";

/* =========================================================
   INTERNAL STATE
========================================================= */

let APP_BOOTED = false; // prevents onboarding redirect loop


/* =========================================================
   PAGE MAP
========================================================= */

const PAGE_MAP = {
  dashboard: renderDashboard,
  "add-sale": renderAddSale,
  reports: renderReports,
  credit: renderCreditScore,
  ledger: renderCreditLedger,
  stock: renderStock,
  "manage-staff": renderManageStaff,
  "staff-history": renderStaffHistory,
  "opening-stock": renderOpeningStock,
  "opening-stock-entry": renderOpeningStockEntry,
  "shop-settings": renderShopSettings,
};


/* =========================================================
   ROLE ACCESS CONTROL
========================================================= */

const PAGE_ACCESS = {
  owner: ["dashboard","add-sale","reports","credit","ledger","stock","manage-staff","staff-history","shop-settings"],
  manager: ["dashboard","add-sale","reports","credit","ledger","stock","staff-history"],
  cashier: ["dashboard","add-sale"]
};


/* =========================================================
   MAIN NAVIGATION
========================================================= */

export async function navigate(rawPage,skipHashUpdate = false) {

  let page = rawPage.split("?")[0] || "dashboard";
  if(!skipHashUpdate) {
    if (location.hash.replace("#","") !== page) {
      location.hash = page;
      return;
    }
  }
  const app = document.getElementById("app");

  const user = await getCurrentUser();

  /* ------------------ NOT LOGGED IN ------------------ */

  if (!user) {
    const users = await getAllUsers();
    const ownerExists = users.some(u => u.role === "owner");

    if (page === "owner-setup") {
      ownerExists ? renderLogin(app) : renderOwnerSetup(app);
      return;
    }

    if (page === "login") {
      renderLogin(app);
      return;
    }

    app.innerHTML = Welcome();
    attachNavEvents();
    return;
  }

  /* ------------------ LOGOUT ------------------ */

  if (page === "logout") {
    await logout();
    location.hash = "login";
    return;
  }

  /* =========================================================
     ONBOARDING GUARD
     Only active AFTER first render to prevent loop
  ========================================================= */

  const onboardingDone = await isOnboardingCompleted();

  if (
    APP_BOOTED &&
    !onboardingDone &&
    !["opening-stock","opening-stock-entry"].includes(page)
  ) {
    page = "opening-stock";
  }

  /* ------------------ ROLE GUARD ------------------ */

  if (onboardingDone) {
    if (!PAGE_ACCESS[user.role]?.includes(page)) {
      page = "dashboard";
    }
  }

  /* ------------------ RENDER ------------------ */

  const renderer = PAGE_MAP[page] || renderDashboard;
  /* trigger exit animation */
  const content = document.querySelector(".main-content");
  if (content) {
    content.classList.add("page-exit");
    await new Promise(resolve => setTimeout(resolve, 140));
    content.classList.remove("page-exit");
  }

  await renderer();
  /* re-trigger enter animation */
  const newContent = document.querySelector(".main-content");
  if (newContent) {
    newContent.classList.remove("page-enter");
    void newContent.offsetWidth;
    newContent.classList.add("page-enter");
  }
  attachNavEvents();

  const { attachLayoutEvents } = await import("./components/Layout.js");
  attachLayoutEvents();

  markActivePage(page);

  /* IMPORTANT: mark app stable AFTER first render */
  APP_BOOTED = true;

  

}




/* =========================================================
   NAV CLICK HANDLERS
========================================================= */
let NAV_BOUND = false;

export function attachNavEvents() {

  if (NAV_BOUND) return;
  NAV_BOUND = true;

  document.addEventListener("click", (e) => {

    const menuBtn = e.target.closest("#menu-toggle");
    if (menuBtn) {
      document.body.classList.toggle("drawer-open");
      return;
    }

    if (document.body.classList.contains("drawer-open")) {
      const insideDrawer = e.target.closest(".drawer-panel");
      const clickedMenu = e.target.closest("#menu-toggle");

      if (!insideDrawer && !clickedMenu) {
        document.body.classList.remove("drawer-open");
      }
    }

    const btn = e.target.closest("[data-page]");
    if (!btn) return;

    e.preventDefault();

    const page = btn.dataset.page;
    if (!page) return;

    document.body.classList.remove("drawer-open");

    if (location.hash.replace("#","") !== page) {
      location.hash = page;
    }
  });
}
function markActivePage(page){

  document.querySelectorAll("[data-page]").forEach(el=>{
    el.classList.remove("active");
  });

  document.querySelectorAll(`[data-page="${page}"]`).forEach(el=>{
    el.classList.add("active");
  });

}



/* =========================================================
   HASH CHANGE
========================================================= */

window.onhashchange = () => {
  const page = location.hash.replace("#", "") || "dashboard";
  navigate(page, true); // skip hash update
};

/* =========================================
   GLOBAL LANGUAGE RERENDER
 ========================================= */

 window.addEventListener("languageChanged", () => {
   const currentHash = location.hash.slice(1) || "dashboard";
   navigate(currentHash);
  });
