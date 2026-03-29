import { saveSale } from "../services/db";
import { showToast } from "../utils/toast";
import { navigate } from "../app";
import { logAudit } from "../services/auditLog";
import { t } from "../i18n/i18n";

import {
  ACCOUNT_TYPE,
  MONEY_DIRECTION,
  STOCK_EFFECT,
  LIABILITY_EFFECT
} from "../services/transactionTypes";

import { buildFinancialEvent } from "../services/financialEvent";

export async function renderCreditLoan(container) {
  const mc = document.querySelector(".main-content") || container;

  mc.innerHTML = `
    <section class="add-sale">
      <div class="glass-card">
        <h1>💸 ${t("creditLoan.title")}</h1>
        <p style="color:var(--text-secondary,#94a3b8);margin-bottom:20px;font-size:.9rem">
          ${t("creditLoan.subtitle")}
        </p>

        <!-- Mode switch -->
        <div class="mode-switch" style="margin-bottom:20px">
          <button id="mode-give" class="btn-option active">${t("creditLoan.giveLoan")}</button>
          <button id="mode-repay" class="btn-option">${t("creditLoan.repayment")}</button>
        </div>

        <form id="loan-form">
          <label>${t("creditLoan.customerName")}</label>
          <input id="loan-customer" type="text" placeholder="${t("creditLoan.enterName")}" required />

          <label>${t("creditLoan.phone")}</label>
          <input id="loan-phone" type="tel" placeholder="${t("creditLoan.enterPhone")}" />

          <label id="loan-amount-label">${t("creditLoan.amountGiven")}</label>
          <input id="loan-amount" type="number" placeholder="₹ 0" required min="1" />

          <label>${t("creditLoan.notes")}</label>
          <input id="loan-notes" type="text" placeholder="${t("creditLoan.optional")}" />

          <!-- Date display (auto filled) -->
          <div style="display:flex;align-items:center;gap:8px;margin:12px 0;color:var(--text-secondary,#94a3b8);font-size:.85rem">
            📅 ${t("creditLoan.date")}: <strong id="loan-date"></strong>
          </div>

          <button class="btn-primary full-width" type="submit" id="loan-submit">
            ${t("creditLoan.recordGive")}
          </button>
        </form>
      </div>

      <!-- Outstanding summary card -->
      <div class="glass-card" id="loan-history-card" style="margin-top:20px">
        <h3>📋 ${t("creditLoan.outstandingTitle")}</h3>
        <div id="loan-history-list">
          <p style="color:var(--text-secondary,#94a3b8);font-size:.85rem">${t("creditLoan.loadingHistory")}</p>
        </div>
      </div>
    </section>
  `;

  /* ── Setup ── */
  let mode = "give"; // "give" | "repay"

  const dateEl = document.getElementById("loan-date");
  dateEl.textContent = new Date().toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  });

  const modeGiveBtn  = document.getElementById("mode-give");
  const modeRepayBtn = document.getElementById("mode-repay");
  const amountLabel  = document.getElementById("loan-amount-label");
  const submitBtn    = document.getElementById("loan-submit");

  modeGiveBtn.onclick = () => {
    mode = "give";
    modeGiveBtn.classList.add("active");
    modeRepayBtn.classList.remove("active");
    amountLabel.textContent = t("creditLoan.amountGiven");
    submitBtn.textContent   = t("creditLoan.recordGive");
  };

  modeRepayBtn.onclick = () => {
    mode = "repay";
    modeRepayBtn.classList.add("active");
    modeGiveBtn.classList.remove("active");
    amountLabel.textContent = t("creditLoan.amountRepaid");
    submitBtn.textContent   = t("creditLoan.recordRepay");
  };

  /* ── Load outstanding summary ── */
  loadLoanHistory();

  async function loadLoanHistory() {
    const histEl = document.getElementById("loan-history-list");
    if (!histEl) return;
    try {
      const { computeCustomerAccounts } = await import("../services/accountingEngine.js");
      const accounts = await computeCustomerAccounts();
      const loans = Object.entries(accounts)
        .filter(([, acc]) => acc.loan > 0)
        .sort((a, b) => b[1].loan - a[1].loan);

      if (loans.length === 0) {
        histEl.innerHTML = `<p style="color:var(--text-secondary,#94a3b8);font-size:.85rem">${t("creditLoan.noOutstanding")}</p>`;
        return;
      }

      histEl.innerHTML = loans.map(([name, acc]) => `
        <div style="display:flex;justify-content:space-between;align-items:center;
          padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
          <div>
            <strong>${name}</strong>
            <div style="font-size:.78rem;color:var(--text-secondary,#94a3b8)">${t("creditLoan.outstanding")}</div>
          </div>
          <span style="color:#f87171;font-weight:700;font-size:1.05rem">₹${acc.loan}</span>
        </div>
      `).join("");
    } catch (e) {
      histEl.innerHTML = `<p style="color:var(--text-secondary,#94a3b8);font-size:.85rem">—</p>`;
    }
  }

  /* ── Submit ── */
  document.getElementById("loan-form").onsubmit = async (e) => {
    e.preventDefault();

    const customerName = document.getElementById("loan-customer").value.trim();
    const phone        = document.getElementById("loan-phone").value.trim() || null;
    const amount       = Number(document.getElementById("loan-amount").value);
    const notes        = document.getElementById("loan-notes").value.trim() || null;

    if (!customerName) { showToast(t("creditLoan.nameRequired"), "error"); return; }
    if (!amount || amount <= 0) { showToast(t("creditLoan.amountRequired"), "error"); return; }

    submitBtn.disabled    = true;
    submitBtn.textContent = t("creditLoan.saving");

    /* Resolve customer identity */
    let customer = null;
    try {
      const { resolveCustomerIdentity } = await import("../services/customerIdentityService.js");
      customer = await resolveCustomerIdentity({ name: customerName, phone });
    } catch (_) {}

    const isGive = mode === "give";

    const sale = {
      id:              crypto.randomUUID(),
      amount,
      customerName:    customer?.displayName || customerName,
      customerId:      customer?.id || null,
      paymentMethod:   "cash",
      referenceSource: isGive ? "loan" : "loan_repayment",
      accountType:     isGive ? ACCOUNT_TYPE.LOAN_GIVEN   : ACCOUNT_TYPE.LOAN_REPAID,
      moneyDirection:  isGive ? MONEY_DIRECTION.OUT        : MONEY_DIRECTION.IN,
      stockEffect:     STOCK_EFFECT.NONE,
      liabilityEffect: isGive ? LIABILITY_EFFECT.INCREASE_LOAN : LIABILITY_EFFECT.DECREASE_LOAN,
      transactionType: isGive ? "loan_given" : "loan_repayment",
      financialEvent:  buildFinancialEvent({
        accountType:     isGive ? ACCOUNT_TYPE.LOAN_GIVEN  : ACCOUNT_TYPE.LOAN_REPAID,
        moneyDirection:  isGive ? MONEY_DIRECTION.OUT       : MONEY_DIRECTION.IN,
        stockEffect:     STOCK_EFFECT.NONE,
        customerName
      }),
      notes,
      date:      new Date().toLocaleDateString(),
      timestamp: Date.now(),
      estimatedProfit: 0
    };

    await saveSale(sale);

    await logAudit({
      action:   isGive ? "LOAN_GIVEN" : "LOAN_REPAID",
      module:   "credit-loan",
      targetId: sale.id,
      metadata: { amount, customerName, phone, notes }
    });

    showToast(
      isGive
        ? `✅ ${t("creditLoan.loanRecorded")} ₹${amount} → ${customerName}`
        : `✅ ${t("creditLoan.repaymentRecorded")} ₹${amount} ← ${customerName}`,
      "success"
    );

    /* Reset form + reload history */
    document.getElementById("loan-form").reset();
    dateEl.textContent = new Date().toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric"
    });
    submitBtn.disabled    = false;
    submitBtn.textContent = mode === "give" ? t("creditLoan.recordGive") : t("creditLoan.recordRepay");

    loadLoanHistory();
    window.dispatchEvent(new Event("saleUpdated"));
  };
}
