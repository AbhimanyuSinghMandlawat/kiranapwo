import { renderDashboard } from "./pages/Dashboard";
import { renderAddSale } from "./pages/AddSale";
import { renderReports } from "./pages/Reports";
import { renderCreditScore } from "./pages/CreditScore";
import { renderCreditLedger } from "./pages/CreditLedger";
import { renderStock } from "./pages/Stock";

import Welcome from "./pages/Welcome";
import { renderOwnerSetup, renderLogin } from "./auth/authUI";
import { getCurrentUser, logout } from "./auth/authService";
import { getAllUsers } from "./services/db";     // <-- ADD THIS

export async function navigate(page) {
  const app = document.getElementById("app");

  const user = await getCurrentUser();

  // ----- AUTH PROTECTION LOGIC -----

  // If user NOT logged in
  if (!user) {
    const users = await getAllUsers();
    const ownerExists = users.some(u => u.role === "owner");
    if (page === "owner-setup") {
      if (ownerExists) {
        renderLogin(app);
      } else {
      renderOwnerSetup(app);
      }
      
      return;
    }

    if (page === "login") {
      renderLogin(app);
      
      return;
    }

    // Default for non-logged users
    app.innerHTML = Welcome();
    attachNavEvents();
    return;
  }

  // ----- USER IS LOGGED IN -----

  if (page === "logout") {
    await logout();
    navigate("login");
    return;
  }

  const map = {
    dashboard: renderDashboard,
    "add-sale": renderAddSale,
    reports: renderReports,
    credit: renderCreditScore,
    ledger: renderCreditLedger,
    stock: renderStock
  };

  // ✅ Render selected page
  await (map[page] || renderDashboard)(app);

  // ✅ Reattach nav after DOM replace
  attachNavEvents();
}

export function attachNavEvents() {
  document.querySelectorAll("[data-page]").forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault(); 
      document
        .querySelectorAll("[data-page]")
        .forEach(b => b.classList.remove("active"));

      btn.classList.add("active");

      location.hash = btn.dataset.page;
    };
  });
}

window.onhashchange = () => {
  const page = location.hash.replace("#", "") || "dashboard";
  navigate(page);
};

// ----- INITIAL LOAD -----

window.onload = () => {
  navigate(location.hash.replace("#", "") || "dashboard");
};

