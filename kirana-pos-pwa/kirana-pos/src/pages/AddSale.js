import { renderLayout } from "../components/Layout";
import { saveSale, getAllStock, processSale,getShopSettings } from "../services/db";
import { navigate } from "../app";
import { showToast } from "../utils/toast";
import { searchStock } from "../utils/helpers";
import { buildFinancialEvent } from "../services/financialEvent";
import { evaluateCreditDecision } from "../services/creditAdvisor";
import { t } from "../i18n/i18n";
import { logAudit } from "../services/auditLog";

import {
  ACCOUNT_TYPE,
  MONEY_DIRECTION,
  STOCK_EFFECT,
  LIABILITY_EFFECT
} from "../services/transactionTypes";

let cartItems = [];
let saleMode = "amount";
let selectedPayment = null;



function addToCart(stockItem, qty = 1) {
  const existing = cartItems.find(i => i.itemId === stockItem.id);
  if (existing) {
    if (existing.qty + qty > stockItem.quantity) {
      showToast(t("addSale.notEnoughStock"), "error");
      return;
    }
    existing.qty += qty;
  } else {
    cartItems.push({
      itemId: stockItem.id,
      name: stockItem.name,
      price: stockItem.price,
      qty
    });
  }
}

function removeFromCart(id) {
  cartItems = cartItems.filter(i => i.itemId !== id);
}

function calculateTotal() {
  return cartItems.reduce((sum, i) => sum + i.price * i.qty, 0);
}

export async function renderAddSale(container) {

  cartItems = [];
  saleMode = "amount";
  selectedPayment = null;

  const stock = await getAllStock();

  container.innerHTML = await renderLayout(`
    <section class="add-sale">
      <div class="glass-card">
        <h1>${t("addSale.title")}</h1>

        <div class="mode-switch">
          <button id="mode-amount" class="btn-option active">${t("addSale.quickSale")}</button>
          <button id="mode-items" class="btn-option">${t("addSale.itemSale")}</button>
        </div>

        <form id="sale-form">
          <div id="amount-section">
            <label>${t("addSale.amount")} (₹)</label>
            <input id="amount" type="number" placeholder="${t("addSale.enterAmount")}" />
          </div>

          <div id="item-sale-section" style="display:none">
            <input id="stock-search" placeholder="Search item..." />
            <div id="search-results"></div>
            <h4>Cart</h4>
            <div id="cart-list"></div>
            <p><strong>Total:</strong> ₹<span id="cart-total">0</span></p>
          </div>

          <div id="settlement-section" class="settlement-row">
            <input type="checkbox" id="is-settlement" />
            <span>This is a credit settlement</span>
          </div>

          <label>Payment Method</label>
          <div class="payment-options">
            <button type="button" class="btn-option" data-method="cash">${t("addSale.cash")}</button>
            <button type="button" class="btn-option" data-method="upi">${t("addSale.upi")}</button>
            <button type="button" class="btn-option" data-method="card">${t("addSale.card")}</button>
            <button type="button" class="btn-option" data-method="credit">${t("addSale.credit")}</button>
          </div>

          <label>Customer Name</label>
          <input id="customer" type="text" placeholder="${t("addSale.enterCustomer")}" />
          <label>Customer Mobile Number</label>
          <input id = "customer-phone" type="tel" placeholder="${t("addSale.enterMobileNumber")}" />
          <div id="credit-advice" class="credit-advice hidden"></div>



          <button class="btn-primary full-width" type="submit">${t("addSale.save")}</button>
        </form>
      </div>
    </section>
  `);

  const amountSection = document.getElementById("amount-section");
  const itemSection = document.getElementById("item-sale-section");
  const settlementSection = document.getElementById("settlement-section");
  const modeAmountBtn = document.getElementById("mode-amount");
  const modeItemsBtn = document.getElementById("mode-items");

  modeAmountBtn.onclick = () => {
    saleMode = "amount";
    cartItems = [];
    renderCart();
    amountSection.style.display = "block";
    itemSection.style.display = "none";
    settlementSection.style.display = "flex";
    modeAmountBtn.classList.add("active");
    modeItemsBtn.classList.remove("active");
  };

  modeItemsBtn.onclick = () => {
    saleMode = "items";
    cartItems = [];
    renderCart();
    amountSection.style.display = "none";
    itemSection.style.display = "block";
    settlementSection.style.display = "none";
    modeItemsBtn.classList.add("active");
    modeAmountBtn.classList.remove("active");
  };

  document.querySelectorAll(".payment-options .btn-option").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".payment-options .btn-option")
        .forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedPayment = btn.dataset.method;
      runCreditAdvisor();
    };
  });

  const cartDiv = document.getElementById("cart-list");
  const cartTotal = document.getElementById("cart-total");
  const adviceBox = document.getElementById("credit-advice");
  const customerInput = document.getElementById("customer");
  const amountInput = document.getElementById("amount");

  amountInput?.addEventListener("input", runCreditAdvisor);
  customerInput.addEventListener("input", runCreditAdvisor);




  function renderCart() {
    cartDiv.innerHTML =
      cartItems.length === 0
        ? "<p>No items added</p>"
        : cartItems.map(i => `
          <div class="cart-row">
            <span>${i.name}</span>
            <div class="cart-controls">
              <button data-dec="${i.itemId}">−</button>
              <span>${i.qty}</span>
              <button data-inc="${i.itemId}">+</button>
            </div>
          </div>
        `).join("");

    cartTotal.textContent = calculateTotal();

    cartDiv.querySelectorAll("[data-inc]").forEach(btn => {
      btn.onclick = () => {
        const item = stock.find(s => s.id === btn.dataset.inc);
        addToCart(item, 1);
        renderCart();
      };
    });

    cartDiv.querySelectorAll("[data-dec]").forEach(btn => {
      btn.onclick = () => {
        const item = cartItems.find(i => i.itemId === btn.dataset.dec);
        item.qty--;
        if (item.qty <= 0) removeFromCart(item.itemId);
        renderCart();
      };
    });
    runCreditAdvisor();
  }
  async function runCreditAdvisor() {

    if (selectedPayment !== "credit") {
      adviceBox.className = "credit-advice hidden";
      adviceBox.innerHTML = "";
      return;
    }

    const customerName = customerInput.value.trim();
    if (!customerName) {
      adviceBox.className = "credit-advice hidden";
      return;
    }

    const amount =
      saleMode === "items"
        ? calculateTotal()
        : Number(amountInput.value || 0);

    if (!amount || amount <= 0) {
      adviceBox.className = "credit-advice hidden";
      return;
    }

    const result = await evaluateCreditDecision(customerName, amount);

    if (!result) return;

    adviceBox.className = `credit-advice ${result.level}`;

    adviceBox.innerHTML = `
      <strong>${result.message}</strong><br>
      ${t("creditAdvisor.outstanding")}: ₹${result.currentOutstanding} → ₹${result.afterTransaction}<br>
      ${t("creditAdvisor.limit")}: ₹${result.safeLimit}<br>
      <small>${result.behaviourNote}</small>
    `;
  }


  const searchInput = document.getElementById("stock-search");
  const resultsDiv = document.getElementById("search-results");

  searchInput.oninput = () => {
    const q = searchInput.value.trim();
    if (!q) return (resultsDiv.innerHTML = "");

    const results = searchStock(stock, q);

    resultsDiv.innerHTML = `
      <div class="search-dropdown">
        ${results.map(i => `
          <div class="search-item">
            <div>
              <strong>${i.name}</strong>
              <small>₹${i.price}</small>
            </div>
            <button data-id="${i.id}">Add</button>
          </div>
        `).join("")}
      </div>
    `;

    resultsDiv.querySelectorAll("button").forEach(btn => {
      btn.onclick = () => {
        addToCart(stock.find(s => s.id === btn.dataset.id));
        renderCart();
        searchInput.value = "";
        resultsDiv.innerHTML = "";
      };
    });
  };

  document.getElementById("sale-form").onsubmit = async e => {
    e.preventDefault();

    if (!selectedPayment) {
      showToast(t("addSale.selectPayment"), "error");
      return;
    }

    const isSettlement =
      saleMode === "amount" &&
      document.getElementById("is-settlement").checked;

    let amount =
      saleMode === "items"
        ? calculateTotal()
        : Number(document.getElementById("amount").value || 0);

    if (!amount || amount <= 0) {
      showToast(t("addSale.invalidAmount"), "error");
      return;
    }

    const customerName =
      document.getElementById("customer").value.trim() || null;

    const customerPhone =
      document.getElementById("customer-phone")?.value.trim() || null;

    /*==================================
      Custmore identity
    ====================================*/
    let customer = null;

    if ( customerName ) {
      const { resolveCustomerIdentity } =
        await import("../services/customerIdentityService.js");
      customer = await resolveCustomerIdentity({
        name: customerName,
        phone: customerPhone
      });
    }

    if (isSettlement && !customerName) {
      showToast(t("addSale.customerRequired"), "error");
      return;
    }

    if (isSettlement) {

      const accounts = await import("../services/accountingEngine.js")
        .then(m => m.computeCustomerAccounts());

      const acc = accounts[customerName.toLowerCase()] || {
        goodsDue: 0,
        loan: 0,
        advance: 0
      };

      let remaining = amount;

      if (acc.goodsDue > 0 && remaining > 0) {
        const goodsPayment = Math.min(remaining, acc.goodsDue);
        remaining -= goodsPayment;

        await saveSale({
          id: crypto.randomUUID(),
          amount: goodsPayment,
          customerName,
          accountType: ACCOUNT_TYPE.PAYMENT_IN,
          moneyDirection: MONEY_DIRECTION.IN,
          stockEffect: STOCK_EFFECT.NONE,
          liabilityEffect: LIABILITY_EFFECT.DECREASE_GOODS_DUE,
          referenceSource: selectedPayment,
          transactionType: "settlement_goods",
          items: [],
          financialEvent: buildFinancialEvent({
            accountType: ACCOUNT_TYPE.PAYMENT_IN,
            moneyDirection: MONEY_DIRECTION.IN,
            stockEffect: STOCK_EFFECT.NONE,
            customerName
          }),
          date: new Date().toLocaleDateString(),
          timestamp: Date.now(),
          estimatedProfit: 0
        });
      }

      if (acc.loan > 0 && remaining > 0) {
        const loanPayment = Math.min(remaining, acc.loan);
        remaining -= loanPayment;

        await saveSale({
          id: crypto.randomUUID(),
          amount: loanPayment,
          customerName,
          accountType: ACCOUNT_TYPE.LOAN_REPAID,
          moneyDirection: MONEY_DIRECTION.IN,
          stockEffect: STOCK_EFFECT.NONE,
          liabilityEffect: LIABILITY_EFFECT.DECREASE_LOAN,
          referenceSource: selectedPayment,
          transactionType: "loan_repayment",
          items: [],
          financialEvent: buildFinancialEvent({
            accountType: ACCOUNT_TYPE.LOAN_REPAID,
            moneyDirection: MONEY_DIRECTION.IN,
            stockEffect: STOCK_EFFECT.NONE,
            customerName
          }),
          date: new Date().toLocaleDateString(),
          timestamp: Date.now(),
          estimatedProfit: 0
        });
      }

      if (remaining > 0) {
        await saveSale({
          id: crypto.randomUUID(),
          amount: remaining,
          customerName,
          accountType: ACCOUNT_TYPE.ADVANCE_DEPOSIT,
          moneyDirection: MONEY_DIRECTION.IN,
          stockEffect: STOCK_EFFECT.NONE,
          liabilityEffect: LIABILITY_EFFECT.INCREASE_ADVANCE,
          referenceSource: selectedPayment,
          transactionType: "advance",
          items: [],
          financialEvent: buildFinancialEvent({
            accountType: ACCOUNT_TYPE.ADVANCE_DEPOSIT,
            moneyDirection: MONEY_DIRECTION.IN,
            stockEffect: STOCK_EFFECT.NONE,
            customerName
          }),
          date: new Date().toLocaleDateString(),
          timestamp: Date.now(),
          estimatedProfit: 0
        });
      }

      showToast("Settlement recorded", "success");
      navigate("dashboard");
      setTimeout(() => {
       window.dispatchEvent(new Event("saleUpdated"));
      },50);
      return;
    }

    let accountType = ACCOUNT_TYPE.ITEM_SALE;
    let moneyDirection = MONEY_DIRECTION.NONE;
    let stockEffect = STOCK_EFFECT.NONE;
    let liabilityEffect = LIABILITY_EFFECT.NONE;
    let referenceSource = selectedPayment;

    if (saleMode === "items") {
      accountType = ACCOUNT_TYPE.ITEM_SALE;
      stockEffect = STOCK_EFFECT.OUT;
      if (selectedPayment === "credit")
        liabilityEffect = LIABILITY_EFFECT.INCREASE_GOODS_DUE;
      else
        moneyDirection = MONEY_DIRECTION.IN;
    } else {
      if (selectedPayment === "credit") {
        accountType = ACCOUNT_TYPE.LOAN_GIVEN;
        moneyDirection = MONEY_DIRECTION.OUT;
        liabilityEffect = LIABILITY_EFFECT.INCREASE_LOAN;
        referenceSource = "loan";
      } else {
        accountType = ACCOUNT_TYPE.ADVANCE_DEPOSIT;
        moneyDirection = MONEY_DIRECTION.IN;
        liabilityEffect = LIABILITY_EFFECT.INCREASE_ADVANCE;
        referenceSource = "advance";
      }
    }

    let sale = null;

    if(!isSettlement) {
      sale = {
       id: crypto.randomUUID(),
       amount:amount,
       items: saleMode === "items" ? structuredClone(cartItems) : [],
       paymentMethod: selectedPayment,
       referenceSource,
       accountType,
       moneyDirection,
       stockEffect,
       liabilityEffect,
       customerId: customer?.id || null,
       customerName: customer?.displayName || customerName,
       transactionType: "sale",
       financialEvent: buildFinancialEvent({
         accountType,
         moneyDirection,
         stockEffect,
         customerName,
         amount,
        }),
       date: new Date().toLocaleDateString(),
       timestamp: Date.now(),
       estimatedProfit: 0
      };
      if (selectedPayment === "upi") {
        const { openUPIPayment } = await import("../components/UPIPaymentOverlay.js");
        const confirmed = await openUPIPayment(amount);
        if (!confirmed) {
          showToast("UPI payment cancelled", "error");
          return;
        }
      }
    }

    if (sale) {
      if(accountType === ACCOUNT_TYPE.ITEM_SALE)
        await processSale(sale);
      else
        await saveSale(sale);

      const { updateCustomerLoyalty } = 
        await import("../services/loyaltyEngine.js");
      if(customer?.id) {
        await updateCustomerLoyalty(
          customer.id,
          sale.amount
        );
      }
      const { evaluateAutoCoupon } = 
       await import("../services/autoCouponEngine.js")
      if(customer?.id) {
        await evaluateAutoCoupon (
          customer.id,
          sale.amount
        );
      }

      const { linkCustomerToShop, updateCustomerShopStats } =
        await import("../services/customerShopService.js");

      const { getCustomerLoyalty } =
        await import("../services/loyaltyEngine.js");

      const shopSettings = await getShopSettings();
      const shopId = shopSettings?.shopId;

      if (customer?.id && shopId) {

        await linkCustomerToShop(customer.id, shopId);

        await updateCustomerShopStats({
          customerId: customer.id,
          shopId,
          amount: sale.amount
        });

      }
    }
    await logAudit({
      action: "SALE_CREATED",
      module: "sales",
      targetId: sale.id,
      metadata: {
        amount: sale.amount,
        paymentMethod: sale.paymentMethod,
        customer: sale.customerName || null
      }
    });

    showToast("Transaction saved", "success");
    navigate("dashboard"); 
    setTimeout(() => {
      window.dispatchEvent(new Event("saleUpdated"));
    },50);
  };
}
