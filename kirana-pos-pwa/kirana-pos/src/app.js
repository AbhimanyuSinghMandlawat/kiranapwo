import { renderDashboard } from "./pages/Dashboard";
import { renderAddSale } from "./pages/AddSale";
import { renderReports } from "./pages/Reports";
import { renderCreditScore } from "./pages/CreditScore";
import { renderCreditLedger } from "./pages/CreditLedger";
import { renderStock } from "./pages/Stock";

export async function navigate(page) {
  const app = document.getElementById("app");

  switch (page) {
    case "dashboard":
      await renderDashboard(app);
      break;

    case "add-sale":
      await renderAddSale(app);
      break;

    case "reports":
      await renderReports(app);
      break;

    case "credit":
      await renderCreditScore(app);
      break;

    case "ledger":
      await renderCreditLedger(app);
      break;
    case "stock":
      await renderStock(app);
      break;

    default:
      await renderDashboard(app);
  }

  attachNavEvents();
}

export function attachNavEvents() {
  document.querySelectorAll("[data-page]").forEach(btn => {
    btn.onclick = () => navigate(btn.dataset.page);
  });
}