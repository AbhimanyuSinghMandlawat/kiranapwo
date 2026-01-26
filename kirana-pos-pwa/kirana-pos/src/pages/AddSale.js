import { renderLayout } from "../components/Layout";
import { saveSale, getAllStock, processSale } from "../services/db";
import { navigate } from "../app";
import { showToast } from "../utils/toast";
import { searchStock } from "../utils/helpers";

// ===============================
// STATE
// ===============================
let cartItems = [];
let saleMode = "amount";

// ===============================
// CART HELPERS
// ===============================
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

// ===============================
// RENDER PAGE
// ===============================
export async function renderAddSale(container) {
  const stock = await getAllStock();

  const content = `
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

          <!-- Settlement only for Quick Sale -->
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

          <input type="hidden" id="payment" />

          <button class="btn-primary full-width">Save</button>
        </form>
      </div>
    </section>
  `;

  container.innerHTML = renderLayout(content);

  // ===============================
  // MODE SWITCH
  // ===============================
  const modeAmount = document.getElementById("mode-amount");
  const modeItems = document.getElementById("mode-items");
  const amountSection = document.getElementById("amount-section");
  const itemSection = document.getElementById("item-sale-section");
  const settlementSection = document.getElementById("settlement-section");

  modeAmount.onclick = () => {
    saleMode = "amount";
    modeAmount.classList.add("active");
    modeItems.classList.remove("active");
    amountSection.style.display = "block";
    itemSection.style.display = "none";
    settlementSection.style.display = "flex";
  };

  modeItems.onclick = () => {
    saleMode = "items";
    modeItems.classList.add("active");
    modeAmount.classList.remove("active");
    amountSection.style.display = "none";
    itemSection.style.display = "block";
    settlementSection.style.display = "none";
    cartItems = [];
    renderCart();
  };

  // ===============================
  // PAYMENT LOGIC (FIXED)
  // ===============================
  const paymentInput = document.getElementById("payment");
  const customerInput = document.getElementById("customer");
  const customerLabel = document.getElementById("customer-label");

  document.querySelectorAll(".payment-options .btn-option").forEach(btn => {
    btn.onclick = () => {
      document
        .querySelectorAll(".payment-options .btn-option")
        .forEach(b => b.classList.remove("active"));

      btn.classList.add("active");
      paymentInput.value = btn.dataset.method;

      if (btn.dataset.method === "credit") {
        customerInput.style.display = "block";
        customerLabel.style.display = "block";
      } else {
        customerInput.style.display = "none";
        customerLabel.style.display = "none";
      }
    };
  });

  // ===============================
  // CART RENDER
  // ===============================
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
                </div>`
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

  // ===============================
  // SEARCH (FIXED & WORKING)
  // ===============================
  const searchInput = document.getElementById("stock-search");
  const resultsDiv = document.getElementById("search-results");

  searchInput.oninput = () => {
    const query = searchInput.value.trim();
    if (!query) {
      resultsDiv.innerHTML = "";
      return;
    }

    const results = searchStock(stock, query);

    resultsDiv.innerHTML = `
      <div class="search-dropdown">
        ${results
          .map(
            item => `
            <div class="search-item">
              <div>
                <strong>${item.name}</strong>
                <small>₹${item.price}</small>
              </div>
              <button data-id="${item.id}">Add</button>
            </div>`
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

  // ===============================
  // SUBMIT
  // ===============================
  document.getElementById("sale-form").onsubmit = async e => {
    e.preventDefault();

    const amount =
      saleMode === "items"
        ? calculateTotal()
        : Number(document.getElementById("amount").value);

    if (!amount || amount <= 0) {
      showToast("Enter valid amount", "error");
      return;
    }

    const sale = {
      id: crypto.randomUUID(),
      amount,
      items: saleMode === "items" ? cartItems : [],
      paymentMethod: paymentInput.value,
      customerName: customerInput.value || null,
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