import { renderLayout } from "../components/Layout";
import { saveSale, getAllStock, processSale } from "../services/db";
import { navigate } from "../app";
import { showToast } from "../utils/toast";
import { searchStock } from "../utils/helpers";

// ===============================
// STATE
// ===============================
let cartItems = [];
let saleMode = "amount"; // "amount" | "items"

// ===============================
// UI CLEANUP
// ===============================
function cleanupAddSaleUI() {
  const resultsDiv = document.getElementById("search-results");
  const searchInput = document.getElementById("stock-search");
  const amountInput = document.getElementById("amount");

  if (resultsDiv) resultsDiv.innerHTML = "";
  if (searchInput) searchInput.blur();
  if (amountInput) amountInput.blur();

  document.activeElement?.blur();
}

// ===============================
// CART HELPERS
// ===============================
function addToCart(stockItem, qty = 1) {
  if (typeof stockItem.price !== "number") {
    showToast("Item price not set", "error");
    return;
  }

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

function removeFromCart(itemId) {
  cartItems = cartItems.filter(i => i.itemId !== itemId);
}

function calculateTotal() {
  return cartItems.reduce((sum, i) => sum + i.qty * i.price, 0);
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
          <button type="button" id="mode-amount" class="btn-option active">
            Quick Sale
          </button>
          <button type="button" id="mode-items" class="btn-option">
            Item Sale
          </button>
        </div>

        <form id="sale-form">

          <label>Amount (₹)</label>
          <input id="amount" type="number" placeholder="Enter amount" />

          <div id="item-sale-section" style="display:none">
            <input id="stock-search" placeholder="Search item..." />
            <div id="search-results"></div>

            <h4>Cart</h4>
            <div id="cart-list"></div>

            <p>
              <strong>Total:</strong> ₹<span id="cart-total">0</span>
            </p>
          </div>

          <div class="settlement-row">
            <input type="checkbox" id="is-settlement" />
            <span>This is a credit settlement</span>
          </div>

          <label>Profit Margin (%)</label>
          <input id="margin" type="number" value="10" />

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

          <button type="submit" class="btn-primary full-width">
            Save
          </button>
        </form>
      </div>
    </section>
  `;

  container.innerHTML = renderLayout(content);

  // Prevent Enter key form submit
  document.getElementById("sale-form").addEventListener("keydown", e => {
    if (e.key === "Enter" && e.target.tagName === "INPUT") {
      e.preventDefault();
    }
  });

  // ===============================
  // MODE TOGGLE
  // ===============================
  const modeAmountBtn = document.getElementById("mode-amount");
  const modeItemsBtn = document.getElementById("mode-items");
  const itemSection = document.getElementById("item-sale-section");
  const amountInput = document.getElementById("amount");

  modeAmountBtn.onclick = () => {
    saleMode = "amount";
    modeAmountBtn.classList.add("active");
    modeItemsBtn.classList.remove("active");
    itemSection.style.display = "none";
    amountInput.style.display = "block";
    amountInput.readOnly = false;
    amountInput.value = "";
  };

  modeItemsBtn.onclick = () => {
    saleMode = "items";
    modeItemsBtn.classList.add("active");
    modeAmountBtn.classList.remove("active");
    itemSection.style.display = "block";
    amountInput.style.display = "none";
    cartItems = [];
    renderCart();
  };

  // ===============================
  // PAYMENT LOGIC
  // ===============================
  const paymentInput = document.getElementById("payment");
  const customerInput = document.getElementById("customer");
  const customerLabel = document.getElementById("customer-label");
  const settlementCheckbox = document.getElementById("is-settlement");

  function updateCustomerField() {
    const needsCustomer =
      paymentInput.value === "credit" || settlementCheckbox.checked;

    customerInput.style.display = needsCustomer ? "block" : "none";
    customerLabel.style.display = needsCustomer ? "block" : "none";
  }

  document.querySelectorAll("[data-method]").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll("[data-method]").forEach(b =>
        b.classList.remove("active")
      );
      btn.classList.add("active");
      paymentInput.value = btn.dataset.method;
      updateCustomerField();
    };
  });

  settlementCheckbox.onchange = () => {
    if (settlementCheckbox.checked) {
      document.querySelectorAll("[data-method]").forEach(b =>
        b.classList.remove("active")
      );
      paymentInput.value = "";
    }
    updateCustomerField();
  };

  // ===============================
  // CART RENDER
  // ===============================
  const searchInput = document.getElementById("stock-search");
  const resultsDiv = document.getElementById("search-results");
  const cartDiv = document.getElementById("cart-list");
  const cartTotal = document.getElementById("cart-total");

  function renderCart() {
    if (cartItems.length === 0) {
      cartDiv.innerHTML = `<p style="opacity:0.6">No items added</p>`;
      cartTotal.textContent = "0";
      return;
    }

    cartDiv.innerHTML = cartItems.map(item => {
      const maxQty = stock.find(s => s.id === item.itemId).quantity;
      return `
        <div class="cart-row">
          <span>${item.name}</span>
          <div class="cart-controls">
            <button data-dec="${item.itemId}">−</button>
            <span>${item.qty}</span>
            <button data-inc="${item.itemId}" ${item.qty >= maxQty ? "disabled" : ""}>+</button>
            <button data-remove="${item.itemId}" class="danger">✕</button>
          </div>
        </div>
      `;
    }).join("");

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
        if (!item) return;
        item.qty -= 1;
        if (item.qty <= 0) removeFromCart(item.itemId);
        renderCart();
      };
    });

    cartDiv.querySelectorAll("[data-remove]").forEach(btn => {
      btn.onclick = () => {
        removeFromCart(btn.dataset.remove);
        renderCart();
      };
    });
  }

  // ===============================
  // SEARCH (Amazon-style)
  // ===============================
  searchInput.oninput = () => {
    const query = searchInput.value.trim();
    if (!query) {
      resultsDiv.innerHTML = "";
      return;
    }

    const results = searchStock(stock, query);

    resultsDiv.innerHTML = `
      <div class="search-dropdown">
        ${results.map(item => `
          <div class="search-item ${item.quantity === 0 ? "disabled" : ""}">
            <div>
              <strong>${item.name}</strong>
              <small>₹${item.price} · Stock: ${item.quantity}</small>
            </div>
            <button data-id="${item.id}" ${item.quantity === 0 ? "disabled" : ""}>
              Add
            </button>
          </div>
        `).join("")}
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
        : Number(amountInput.value);

    const paymentMethod = paymentInput.value;
    const isSettlement = settlementCheckbox.checked;
    const customerName = customerInput.value.trim();

    if (!amount || amount <= 0) {
      showToast("Enter valid amount", "error");
      return;
    }

    if (!paymentMethod && !isSettlement) {
      showToast("Select payment method", "error");
      return;
    }

    if ((paymentMethod === "credit" || isSettlement) && !customerName) {
      showToast("Customer name required", "error");
      return;
    }

    const profitMargin = Number(document.getElementById("margin").value) || 10;
    const estimatedProfit = Math.round((amount * profitMargin) / 100);

    const sale = {
      id: crypto.randomUUID(),
      amount,
      items: saleMode === "items" ? cartItems : [],
      paymentMethod: paymentMethod || "settlement",
      customerName: customerName || null,
      transactionType: isSettlement ? "settlement" : "sale",
      profitMargin,
      estimatedProfit,
      date: new Date().toLocaleDateString(),
      timestamp: Date.now(),
      status: isSettlement ? "settled" : "pending",
      deviceId: "device-001"
    };

    if (saleMode === "items") {
      await processSale(sale);
    } else {
      await saveSale(sale);
    }

    showToast("Transaction saved", "success");

    cleanupAddSaleUI();
    cartItems = [];
    saleMode = "amount";

    setTimeout(() => navigate("dashboard"), 300);
  };
}