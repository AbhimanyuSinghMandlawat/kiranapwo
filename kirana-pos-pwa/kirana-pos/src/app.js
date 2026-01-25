import { renderDashboard } from "./pages/Dashboard";
import { renderAddSale } from "./pages/AddSale";
import { renderReports } from "./pages/Reports";
import { renderCreditScore } from "./pages/CreditScore";
import { renderCreditLedger } from "./pages/CreditLedger";
import { renderStock } from "./pages/Stock";

export async function navigate(page) {
  const app = document.getElementById("app");

  const map = {
    dashboard: renderDashboard,
    "add-sale": renderAddSale,
    reports: renderReports,
    credit: renderCreditScore,
    ledger: renderCreditLedger,
    stock: renderStock
  };

  await (map[page] || renderDashboard)(app);
  attachNavEvents();
}

export function attachNavEvents() {
  document.querySelectorAll("[data-page]").forEach(btn => {
    btn.onclick = () => {
      document
        .querySelectorAll("[data-page]")
        .forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      navigate(btn.dataset.page);
    };
  });
}