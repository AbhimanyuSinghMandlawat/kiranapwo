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
import { renderAuditLog } from "./pages/AuditLog";
import { renderCustomerLogin } from "./pages/CustomerLogin";
import { renderCustomerRegister } from "./pages/CustomerRegister";
import { renderCustomerPortal } from "./pages/CustomerPortal";
import { renderCustomerShopCoupons } from "./pages/CustomerShopCoupons";
import { renderCouponManager } from "./pages/CouponManager";

import {
  isCustomerLoggedIn,
  logoutCustomer,
  getCurrentCustomer   // ✅ FIX: added missing import
} from "./services/customerAuthService";


/* =========================================================
   INTERNAL STATE
========================================================= */

let APP_BOOTED = false;


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
  "audit-log": renderAuditLog,
  "shop-settings": renderShopSettings,
  "customer-login": renderCustomerLogin,
  "customer-register": renderCustomerRegister,
  "customer-portal": renderCustomerPortal,
  "customer-shop": renderCustomerShopCoupons,
  "coupon-manager": renderCouponManager,
};


/* =========================================================
   ROLE ACCESS CONTROL
========================================================= */

const PAGE_ACCESS = {
  owner: ["dashboard","add-sale","reports","credit","ledger","stock","manage-staff","staff-history","audit-log","shop-settings"],
  manager: ["dashboard","add-sale","reports","credit","ledger","stock","staff-history"],
  cashier: ["dashboard","add-sale"]
};


/* =========================================================
   MAIN NAVIGATION
========================================================= */

export async function navigate(rawPage, skipHashUpdate = false) {

  let page = rawPage.split("?")[0] || "dashboard";
  const app = document.getElementById("app");

  if (!skipHashUpdate) {
    if (location.hash.replace("#", "") !== page) {
      location.hash = page;
      return;
    }
  }

  const user = await getCurrentUser();
  const customerLoggedIn = isCustomerLoggedIn();

  /* =====================================================
     NOT LOGGED IN
  ===================================================== */

  if (!user && !customerLoggedIn) {

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

    if (page === "customer-login") {
      await renderCustomerLogin(app);
      attachNavEvents();
      return;
    }

    if (page === "customer-register") {
      await renderCustomerRegister(app);
      attachNavEvents();
      return;
    }

    app.innerHTML = Welcome();
    attachNavEvents();
    return;
  }


  /* =====================================================
     CUSTOMER LOGGED IN
  ===================================================== */

  if (customerLoggedIn && !user) {

    const { getCurrentCustomer } = 
      await import("./services/customerAuthService.js")

    const customer = await getCurrentCustomer();

    const { renderCustomerLayout } =
      await import("./components/CustomerLayout.js");

    app.innerHTML =
      renderCustomerLayout(customer.name);

    const container =
      document.getElementById("customer-content");


    if (page === "customer-coupons") {

      await renderCustomerShopCoupons(container);
      attachNavEvents();

      return;
    }


    if (page === "customer-logout") {

      await logoutCustomer();

      location.hash = "customer-login";

      return;
    }


    await renderCustomerPortal(container);
    attachNavEvents();

    return;
  }


  /* =====================================================
     OWNER / STAFF LOGGED IN
  ===================================================== */

  if (!user) return;


  if (!document.querySelector(".main-content")) {

    const { renderLayout } =
      await import("./components/Layout.js");

    app.innerHTML =
      await renderLayout("");
  }


  const onboardingDone =
    await isOnboardingCompleted();

  if (page === "logout") {
    await logout ();
    location.hash = "";
    return;
  }


  if (
    APP_BOOTED &&
    !onboardingDone &&
    !["opening-stock", "opening-stock-entry"].includes(page)
  ) {
    page = "opening-stock";
  }


  if (user && onboardingDone) {

    if (!PAGE_ACCESS[user.role]?.includes(page)) {
      page = "dashboard";
    }
  }

  


  const renderer =
    PAGE_MAP[page] || renderDashboard;


  const content =
    document.querySelector(".main-content");


  if (content) {

    content.classList.add("page-exit");

    await new Promise(resolve =>
      setTimeout(resolve, 140)
    );

    content.classList.remove("page-exit");
  }


  await renderer(app);


  const newContent =
    document.querySelector(".main-content");


  if (newContent) {

    newContent.classList.remove("page-enter");

    void newContent.offsetWidth;

    newContent.classList.add("page-enter");
  }


  attachNavEvents();


  const { attachLayoutEvents } =
    await import("./components/Layout.js");

  attachLayoutEvents();


  markActivePage(page);


  APP_BOOTED = true;
}


/* =========================================================
   NAV EVENTS
========================================================= */

let NAV_BOUND = false;

export function attachNavEvents() {

  if (NAV_BOUND) return;

  NAV_BOUND = true;

  document.addEventListener("click", (e) => {

    const menuBtn =
      e.target.closest("#menu-toggle");

    if (menuBtn) {
      document.body.classList.toggle("drawer-open");
      return;
    }


    if (document.body.classList.contains("drawer-open")) {

      const insideDrawer =
        e.target.closest(".drawer-panel");

      const clickedMenu =
        e.target.closest("#menu-toggle");

      if (!insideDrawer && !clickedMenu) {
        document.body.classList.remove("drawer-open");
      }
    }


    const btn =
      e.target.closest("[data-page]");

    if (!btn) return;

    e.preventDefault();

    const page =
      btn.dataset.page;

    if (!page) return;

    document.body.classList.remove("drawer-open");

    if (location.hash.replace("#","") !== page) {
      location.hash = page;
    }
  });
}


function markActivePage(page){

  document.querySelectorAll("[data-page]")
    .forEach(el => el.classList.remove("active"));

  document.querySelectorAll(`[data-page="${page}"]`)
    .forEach(el => el.classList.add("active"));
}


/* =========================================================
   HASH CHANGE
========================================================= */

window.onhashchange = () => {

  const page =
    location.hash.replace("#", "") || "dashboard";

  navigate(page, true);
};


/* =========================================================
   LANGUAGE CHANGE
========================================================= */

window.addEventListener("languageChanged", () => {

  const currentHash =
    location.hash.slice(1) || "dashboard";

  navigate(currentHash);
});