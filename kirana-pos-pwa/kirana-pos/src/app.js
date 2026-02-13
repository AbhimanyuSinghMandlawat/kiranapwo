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

  /* IMPORTANT: mark app stable AFTER first render */
  APP_BOOTED = true;
}


/* =========================================================
   NAV CLICK HANDLERS
========================================================= */

export function attachNavEvents() {
  document.querySelectorAll("[data-page]").forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      location.hash = btn.dataset.page;
    };
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
