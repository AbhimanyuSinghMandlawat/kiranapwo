import { renderLayout } from "../components/Layout";
import { saveSale, getAllStock, processSale } from "../services/db";
import { navigate } from "../app";
import { showToast } from "../utils/toast";
import { searchStock } from "../utils/helpers";
import { getCreditLedger } from "../services/ledger";
import { getCustomerProfiles } from "../services/customerProfile";
import { getCreditTrustScores } from "../services/creditScore";

/* ===============================
   STATE
=============================== */
let cartItems = [];
let saleMode = "amount"; // amount | items
let selectedPayment = null;

/* ===============================
   CREDIT LIMIT LOGIC
=============================== */
function getCreditLimit(score) {
  if (score >= 80) return 5000;
  if (score >= 60) return 2000;
  if (score >= 40) return 500;
  return 0;
}

/* ===============================
   CART HELPERS
=============================== */
function addToCart(stockItem, qty = 1) {
  const existing = cartItems.find(i => i.itemId === stockItem.id);

  if (existing) {
    if (existing.qty + qty > stockItem.quantity) {
      showToast("Not enough stock", "error");
      return;
    }
    existing.qty += qty;
  } else {
    if (qty > stockItem.quantity) {
      showToast("Not enough stock", "error");
      return;
    }
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

/* ===============================
   RENDER PAGE
=============================== */
export async function renderAddSale(container) {
  const stock = await getAllStock();

  container.innerHTML = renderLayout(`
    <section class="add-sale">
      <div class="glass-card">
        <h1>Add Transaction</h1>

        <div class="mode-switch">
          <button id="mode-amount" class="btn-option active">Quick Sale</button>
          <button id="mode-items" class="btn-option">Item Sale</button>
        </div>

        <form id="sale-form">

          <div id="amount-section">
            <label>Amount (₹)</label>
            <input id="amount" type="number" placeholder="Enter amount" />
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
            <button type="button" class="btn-option" data-method="cash">Cash</button>
            <button type="button" class="btn-option" data-method="upi">UPI</button>
            <button type="button" class="btn-option" data-method="card">Card</button>
            <button type="button" class="btn-option" data-method="credit">Credit</button>
          </div>

          <label id="customer-label" style="display:none">Customer Name</label>
          <input id="customer" type="text" style="display:none" />

          <button class="btn-primary full-width" type="submit">Save</button>
        </form>
      </div>
    </section>
  `);

  /* ===============================
     MODE SWITCH
  =============================== */
  const amountSection = document.getElementById("amount-section");
  const itemSection = document.getElementById("item-sale-section");
  const settlementSection = document.getElementById("settlement-section");

  document.getElementById("mode-amount").onclick = () => {
    saleMode = "amount";
    amountSection.style.display = "block";
    itemSection.style.display = "none";
    settlementSection.style.display = "flex";
  };

  document.getElementById("mode-items").onclick = () => {
    saleMode = "items";
    amountSection.style.display = "none";
    itemSection.style.display = "block";
    settlementSection.style.display = "none";
    cartItems = [];
    renderCart();
  };

  /* ===============================
     PAYMENT METHOD
  =============================== */
  const customerInput = document.getElementById("customer");
  const customerLabel = document.getElementById("customer-label");
  const settlementCheckbox = document.getElementById("is-settlement");

  document.querySelectorAll(".payment-options .btn-option").forEach(btn => {
    btn.onclick = () => {
      document
        .querySelectorAll(".payment-options .btn-option")
        .forEach(b => b.classList.remove("active"));

      btn.classList.add("active");
      selectedPayment = btn.dataset.method;

      if (selectedPayment === "credit" || settlementCheckbox.checked) {
        customerInput.style.display = "block";
        customerLabel.style.display = "block";
      } else {
        customerInput.style.display = "none";
        customerLabel.style.display = "none";
      }
    };
  });

  settlementCheckbox.onchange = () => {
    if (settlementCheckbox.checked) {
      customerInput.style.display = "block";
      customerLabel.style.display = "block";
    } else if (selectedPayment !== "credit") {
      customerInput.style.display = "none";
      customerLabel.style.display = "none";
    }
  };

  /* ===============================
     CART RENDER
  =============================== */
  const cartDiv = document.getElementById("cart-list");
  const cartTotal = document.getElementById("cart-total");

  function renderCart() {
    cartDiv.innerHTML =
      cartItems.length === 0
        ? "<p>No items added</p>"
        : cartItems
            .map(
              i => `
              <div class="cart-row">
                <span>${i.name}</span>
                <div class="cart-controls">
                  <button data-dec="${i.itemId}">−</button>
                  <span>${i.qty}</span>
                  <button data-inc="${i.itemId}">+</button>
                </div>
              </div>
            `
            )
            .join("");

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
        item.qty -= 1;
        if (item.qty <= 0) removeFromCart(item.itemId);
        renderCart();
      };
    });
  }

  /* ===============================
     SEARCH
  =============================== */
  const searchInput = document.getElementById("stock-search");
  const resultsDiv = document.getElementById("search-results");

  searchInput.oninput = () => {
    const q = searchInput.value.trim();
    if (!q) {
      resultsDiv.innerHTML = "";
      return;
    }

    const results = searchStock(stock, q);

    resultsDiv.innerHTML = `
      <div class="search-dropdown">
        ${results
          .map(
            i => `
          <div class="search-item ${i.quantity === 0 ? "disabled" : ""}">
            <div>
              <strong>${i.name}</strong>
              <small>₹${i.price} · Stock: ${i.quantity}</small>
            </div>
            <button data-id="${i.id}" ${i.quantity === 0 ? "disabled" : ""}>Add</button>
          </div>
        `
          )
          .join("")}
      </div>
    `;

    resultsDiv.querySelectorAll("button").forEach(btn => {
      btn.onclick = () => {
        const item = stock.find(s => s.id === btn.dataset.id);
        addToCart(item, 1);
        renderCart();
        searchInput.value = "";
        resultsDiv.innerHTML = "";
      };
    });
  };

  /* ===============================
     SUBMIT
  =============================== */
  document.getElementById("sale-form").onsubmit = async e => {
    e.preventDefault();

    if (!selectedPayment) {
      showToast("Select payment method", "error");
      return;
    }

    let amount;
    if (saleMode === "items") {
      amount = calculateTotal();
    } else {
      amount = Number(document.getElementById("amount").value);
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      showToast("Invalid amount", "error");
      return;
    }

    const customerName = customerInput.value.trim() || null;
    const isSettlement = settlementCheckbox.checked;

    if ((selectedPayment === "credit" || isSettlement) && !customerName) {
      showToast("Customer name required", "error");
      return;
    }

    /* ===== CREDIT ELIGIBILITY ===== */
    if (selectedPayment === "credit") {
      const profiles = await getCustomerProfiles();
      const scores = await getCreditTrustScores();
      const ledger = await getCreditLedger();

      const scoreObj = scores.find(
        s => s.customerName.toLowerCase() === customerName.toLowerCase()
      );

      const pending =
        ledger.find(
          l => l.customerName.toLowerCase() === customerName.toLowerCase()
        )?.balance || 0;

      const limit = getCreditLimit(scoreObj?.creditScore || 0);

      if (pending + amount > limit) {
        showToast("Credit limit exceeded for this customer", "error");
        return;
      }
    }

    const sale = {
      id: crypto.randomUUID(),
      amount,
      items: saleMode === "items" ? cartItems : [],
      paymentMethod: selectedPayment,
      customerName,
      transactionType: isSettlement ? "settlement" : "sale",
      date: new Date().toLocaleDateString(),
      timestamp: Date.now()
    };

    saleMode === "items"
      ? await processSale(sale)
      : await saveSale(sale);

    showToast("Transaction saved", "success");
    navigate("dashboard");
  };
}