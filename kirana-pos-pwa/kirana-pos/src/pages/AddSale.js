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
// UI CLEANUP (CRITICAL FOR NAV)
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
function handleOutsideSearchClick(e) {
  const dropdown = document.getElementById("search-results");
  const searchInput = document.getElementById("stock-search");

  if (!searchInput || !dropdown) return;

  if (!e.target.closest("#stock-search")) {
    dropdown.innerHTML = "";
  }
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

        <div style="margin-bottom:12px;">
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

            <h4 style="margin-top:12px;">Cart</h4>
            <div id="cart-list"></div>

            <p style="margin-top:8px;">
              <strong>Total:</strong> ₹<span id="cart-total">0</span>
            </p>
          </div>

          <label>
            <input type="checkbox" id="is-settlement" />
            This is a credit settlement
          </label>

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

  // Prevent ENTER breaking SPA
  const saleForm = document.getElementById("sale-form");

  saleForm.addEventListener("keydown", e => {
    const tag = e.target.tagName.toLowerCase();

  // Block Enter ONLY inside inputs (not links / buttons / sidebar)
    if (e.key === "Enter" && tag === "input") {
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
    amountInput.readOnly = false;
    amountInput.value = "";
  };

  modeItemsBtn.onclick = () => {
    saleMode = "items";
    modeItemsBtn.classList.add("active");
    modeAmountBtn.classList.remove("active");
    itemSection.style.display = "block";
    amountInput.readOnly = true;
    amountInput.value = calculateTotal();
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

  document.querySelectorAll("[data-method]").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll("[data-method]").forEach(b =>
        b.classList.remove("active")
      );
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

  settlementCheckbox.onchange = () => {
    if (settlementCheckbox.checked) {
      document.querySelectorAll("[data-method]").forEach(b =>
        b.classList.remove("active")
      );
      paymentInput.value = "";
    }
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
      amountInput.value = "0";
      return;
    }

    cartDiv.innerHTML = cartItems.map(item => `
      <div class="cart-row">
        <span>${item.name}</span>
        <div class="cart-controls">
          <button data-dec="${item.itemId}">−</button>
          <span>${item.qty}</span>
          <button data-inc="${item.itemId}">+</button>
          <button data-remove="${item.itemId}" class="danger">✕</button>
        </div>
      </div>
    `).join("");

    const total = calculateTotal();
    cartTotal.textContent = total;
    amountInput.value = total;

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
  // SEARCH DROPDOWN
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

    if (!paymentMethod) {
      showToast("Select payment method", "error");
      return;
    }

    if ((paymentMethod === "credit" || isSettlement) && !customerName) {
      showToast("Customer name required", "error");
      return;
    }

    if (isSettlement && paymentMethod === "credit") {
      showToast("For settlement select Cash / UPI / Card", "error");
      return;
    }

    const profitMargin = Number(document.getElementById("margin").value) || 10;
    const estimatedProfit = Math.round((amount * profitMargin) / 100);

    const sale = {
      id: crypto.randomUUID(),
      amount,
      items: saleMode === "items" ? cartItems : [],
      paymentMethod,
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
    container.addEventListener("click", handleOutsideSearchClick);

    setTimeout(() => navigate("dashboard"), 300);
  };
  
}