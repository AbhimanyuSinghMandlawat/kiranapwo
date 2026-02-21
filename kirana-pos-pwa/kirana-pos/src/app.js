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
};


/* =========================================================
   ROLE ACCESS CONTROL
========================================================= */

const PAGE_ACCESS = {
  owner: ["dashboard","add-sale","reports","credit","ledger","stock","manage-staff","staff-history"],
  manager: ["dashboard","add-sale","reports","credit","ledger","stock","staff-history"],
  cashier: ["dashboard","add-sale"]
};


/* =========================================================
   MAIN NAVIGATION
========================================================= */

export async function navigate(rawPage) {

  let page = rawPage.split("?")[0] || "dashboard";
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
  await renderer(app);

  attachNavEvents();

  const { attachLayoutEvents } = await import("./components/Layout.js");
  attachLayoutEvents();

  /* IMPORTANT: mark app stable AFTER first render */
  APP_BOOTED = true;

  

}


/* =========================================================
   NAV CLICK HANDLERS
========================================================= */
let NAV_BOUND = false;

export function attachNavEvents() {

  // prevent multiple bindings after rerenders
  if (NAV_BOUND) return;
  NAV_BOUND = true;

  document.addEventListener("click", (e) => {
    const menuBtn = e.target.closest("[data-menu]");
    if (menuBtn) {
      document.body.classList.toggle("drawer-open");
      return;
    }

    const btn = e.target.closest("[data-page]");
    if (!btn) return;

    e.preventDefault();

    const page = btn.dataset.page;
    if (!page) return;

    // change hash → your router handles everything
    if (location.hash.replace("#","") !== page) {
      document.body.classList.remove("drawer-open");
      location.hash = page;
    }
  });
}



/* =========================================================
   HASH CHANGE
========================================================= */

window.onhashchange = () => {
  const page = location.hash.replace("#", "") || "dashboard";
  navigate(page);
};


/* =========================================================
   INITIAL LOAD
========================================================= */

window.onload = async () => {
  const user = await getCurrentUser();

  if (!user) {
    location.hash = "login";
    return;
  }

  const done = await isOnboardingCompleted();

  // first route selection only
  location.hash = done ? "dashboard" : "opening-stock";
};

/* =========================================
   GLOBAL LANGUAGE RERENDER
 ========================================= */

 window.addEventListener("languageChanged", () => {
   const currentHash = location.hash.slice(1) || "dashboard";
   navigate(currentHash);
  });
