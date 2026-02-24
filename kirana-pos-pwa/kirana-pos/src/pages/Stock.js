import { renderLayout } from "../components/Layout";
import {
  addStockItem,
  getAllStock,
  updateStockQuantity,
  removeStockItem
} from "../services/db";
import { showToast } from "../utils/toast";
import { showConfirmModal } from "../components/ConfirmModal";
import { showStockEditModal } from "../components/StockEditModal";
import { attachNavEvents } from "../app";

export async function renderStock() {

  const stockItems = await getAllStock();

  const rows =
    stockItems.length === 0
      ? "<p>No stock items added yet.</p>"
      : stockItems.map(item => `
        <div class="card ledger-row">
          <div>
            <strong>${item.name}</strong>
            <p>
              Sell Price: ₹${item.price ?? "—"}<br/>
              Cost Price: ₹${item.costPrice ?? "—"}<br/>
              Quantity: ${item.quantity}<br/>
              Alert below: ${item.threshold}
            </p>
          </div>

          <div class="stock-actions">
            <button class="btn-primary add-btn" data-id="${item.id}">+ Add</button>
            <button class="btn-secondary edit-btn" data-id="${item.id}">Edit Alert</button>
            <button class="btn-danger remove-btn" data-id="${item.id}">Remove</button>
          </div>
        </div>
      `).join("");

  const content = `
    <section class="dashboard">
      <h1>Manage Stock</h1>

      <div class="card">
        <h3>Add New Item</h3>

        <input id="item-name" placeholder="Item name (e.g. Rice 1kg)" />
        <input id="item-cost" type="number" placeholder="Cost Price (₹)" />
        <input id="item-price" type="number" placeholder="Selling Price (₹)" />
        <input id="item-qty" type="number" placeholder="Quantity" />
        <input id="item-threshold" type="number" placeholder="Alert level" />

        <button id="add-item" class="btn-primary">Add Item</button>
      </div>

      <div style="margin-top:20px">
        <h3>Current Stock</h3>
        ${rows}
      </div>
    </section>
  `;

  document.querySelector(".main-content").innerHTML = content;
  

  /* ADD ITEM */
  document.getElementById("add-item").onclick = async () => {

    const name = document.getElementById("item-name").value.trim();
    const costPrice = Number(document.getElementById("item-cost").value);
    const price = Number(document.getElementById("item-price").value);
    const quantity = Number(document.getElementById("item-qty").value);
    const threshold = Number(document.getElementById("item-threshold").value);

    if (!name || price <= 0 || quantity <= 0) {
      showToast("Enter valid details", "error");
      return;
    }

    await addStockItem({
      id: crypto.randomUUID(),
      name,
      costPrice,
      price,
      quantity,
      threshold
    });

    showToast("Item added", "success");
    await renderStock();
    
  };

  /* ADD QUANTITY */
  document.querySelectorAll(".add-btn").forEach(btn => {
    btn.onclick = async () => {

      const items = await getAllStock();
      const item = items.find(i => i.id === btn.dataset.id);

      showStockEditModal({
        title: `Add Stock – ${item.name}`,
        confirmText: "Add",
        onConfirm: async qty => {
          await updateStockQuantity(item.id, item.quantity + qty);
          //record purchase entry (inventory investment)
          const { saveSale } = await import("../services/db");
          const { ACCOUNT_TYPE, MONEY_DIRECTION } = await import("../services/transactionTypes");

          await saveSale({
            id: crypto.randomUUID(),
            amount: qty * (item.costPrice || 0),
            items: [],
            paymentMethod: "stock",
            referenceSource: "inventory-purchase",
            accountType: ACCOUNT_TYPE.STOCK_PURCHASE,
            moneyDirection: MONEY_DIRECTION.OUT,
            stockEffect: "IN",
            liabilityEffect: "NONE",
            customerName: null,
            transactionType: "purchase",
            date: new Date().toLocaleDateString(),
            timestamp: Date.now(),
            estimatedProfit: 0
          });


          await renderStock(container);
          showToast("Stock updated", "success");
        }
      });
    };
  });

  /* EDIT ALERT */
  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.onclick = async () => {

      const items = await getAllStock();
      const item = items.find(i => i.id === btn.dataset.id);

      showStockEditModal({
        title: `Edit Alert – ${item.name}`,
        confirmText: "Save",
        onConfirm: async value => {
          await addStockItem({ ...item, threshold: value });
          showToast("Alert updated", "success");
          await renderStock();
        }
      });
    };
  });

  /* REMOVE ITEM */
  document.querySelectorAll(".remove-btn").forEach(btn => {
    btn.onclick = async () => {

      const items = await getAllStock();
      const item = items.find(i => i.id === btn.dataset.id);

      showConfirmModal({
        title: "Remove Item?",
        message: `Delete "${item.name}"?`,
        onConfirm: async () => {
          await removeStockItem(item.id);
          await renderStock(container);
          showToast("Item removed", "warning");
        }
      });
    };
  });
}
