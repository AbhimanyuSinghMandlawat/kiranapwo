import { renderLayout } from "../components/Layout";
import { saveSale, getAllStock, processSale } from "../services/db";
import { navigate } from "../app";
import { showToast } from "../utils/toast";
import { searchStock } from "../utils/helpers";
import { getCreditLedger } from "../services/ledger";

/* ===============================
   STATE
=============================== */
let cartItems = [];
let saleMode = "amount";
let selectedPayment = null;

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

  container.innerHTML = await renderLayout(`
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
            <div id="cart-list">
             <div id="cart-list"></div>
            </div>
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

          <!-- ✅ CUSTOMER NAME ALWAYS AVAILABLE -->
          <label>Customer Name</label>
          <input
            id="customer"
            type="text"
            placeholder="Enter customer name (optional but recommended)"
          />

          <button class="btn-primary full-width" type="submit">Save</button>
        </form>
      </div>
    </section>
  `);

  /* ===============================
     MODE SWITCH (FIXED ACTIVE STATE)
  =============================== */
  const amountSection = document.getElementById("amount-section");
  const itemSection = document.getElementById("item-sale-section");
  const settlementSection = document.getElementById("settlement-section");
  const modeAmountBtn = document.getElementById("mode-amount");
  const modeItemsBtn = document.getElementById("mode-items");

  modeAmountBtn.onclick = () => {
    saleMode = "amount";
    amountSection.style.display = "block";
    itemSection.style.display = "none";
    settlementSection.style.display = "flex";

    modeAmountBtn.classList.add("active");
    modeItemsBtn.classList.remove("active");
  };

  modeItemsBtn.onclick = () => {
    saleMode = "items";
    amountSection.style.display = "none";
    itemSection.style.display = "block";
    settlementSection.style.display = "none";
    cartItems = [];
    renderCart();

    modeItemsBtn.classList.add("active");
    modeAmountBtn.classList.remove("active");
  };

  /* ===============================
     PAYMENT METHOD SELECTION
  =============================== */
  document.querySelectorAll(".payment-options .btn-option").forEach(btn => {
    btn.onclick = () => {
      document
        .querySelectorAll(".payment-options .btn-option")
        .forEach(b => b.classList.remove("active"));

      btn.classList.add("active");
      selectedPayment = btn.dataset.method;
    };
  });

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
        item.qty--;
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
    if (!q) return (resultsDiv.innerHTML = "");

    const results = searchStock(stock, q);

    resultsDiv.innerHTML = `
      <div class="search-dropdown">
        ${results
          .map(
            i => `
            <div class="search-item">
              <div>
                <strong>${i.name}</strong>
                <small>₹${i.price}</small>
              </div>
              <button data-id="${i.id}">Add</button>
            </div>
          `
          )
          .join("")}
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

  /* ===============================
     SUBMIT
  =============================== */
  document.getElementById("sale-form").onsubmit = async e => {
    e.preventDefault();

    if (!selectedPayment) {
      showToast("Select payment method", "error");
      return;
    }

    const isSettlement = document.getElementById("is-settlement").checked;
    const amount =
      saleMode === "items"
        ? calculateTotal()
        : Number(document.getElementById("amount").value);

    if (!amount || amount <= 0) {
      showToast("Invalid amount", "error");
      return;
    }

    const customerName =
      document.getElementById("customer").value.trim() || null;

    /* CREDIT SETTLEMENT CHECK */
    if (isSettlement) {
      const ledger = await getCreditLedger();
      const entry = ledger.find(
        l => l.customerName.toLowerCase() === customerName?.toLowerCase()
      );

      if (!entry) {
        showToast("No pending credit for this customer", "error");
        return;
      }

      if (amount > entry.balance) {
        showToast(`Settlement exceeds pending ₹${entry.balance}`, "error");
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
      timestamp: Date.now(),
      estimatedProfit: 0
    };

    saleMode === "items"
      ? await processSale(sale)
      : await saveSale({
          ...sale,
          estimatedProfit: Math.round(amount * 0.2)
       }); // assume 20% profit for quick sales

    showToast("Transaction saved", "success");
    navigate("dashboard");
  };
}