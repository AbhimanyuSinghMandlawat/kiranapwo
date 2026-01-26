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
import { attachNavEvents } from "../app"; // ✅ REQUIRED

export async function renderStock(container) {
  const stockItems = await getAllStock();

  const rows =
    stockItems.length === 0
      ? "<p>No stock items added yet.</p>"
      : stockItems
          .map(
            item => `
        <div class="card ledger-row">
          <div>
            <strong>${item.name}</strong>
            <p>
              Price: ₹${item.price ?? "—"}<br/>
              Quantity: ${item.quantity}<br/>
              Alert below: ${item.threshold}
            </p>
          </div>

          <div class="stock-actions">
            <button class="btn-primary add-btn" data-id="${item.id}">
              + Add
            </button>

            <button class="btn-secondary edit-btn" data-id="${item.id}">
              Edit Alert
            </button>

            <button class="btn-danger remove-btn" data-id="${item.id}">
              Remove
            </button>
          </div>
        </div>
      `
          )
          .join("");

  const content = `
    <section class="dashboard">
      <h1>Manage Stock</h1>

      <div class="card">
        <h3>Add New Item</h3>

        <input id="item-name" placeholder="Item name (e.g. Rice 1kg)" />
        <input id="item-price" type="number" placeholder="Price (₹)" />
        <input id="item-qty" type="number" placeholder="Quantity" />
        <input id="item-threshold" type="number" placeholder="Alert level" />

        <button id="add-item" class="btn-primary">
          Add Item
        </button>
      </div>

      <div style="margin-top:20px">
        <h3>Current Stock</h3>
        ${rows}
      </div>
    </section>
  `;

  container.innerHTML = renderLayout(content);
  attachNavEvents(); // ✅ critical after layout render

  /* =========================
     ADD NEW ITEM
  ========================= */
  document.getElementById("add-item").onclick = async () => {
    const name = document.getElementById("item-name").value.trim();
    const price = Number(document.getElementById("item-price").value);
    const quantity = Number(document.getElementById("item-qty").value);
    const threshold = Number(document.getElementById("item-threshold").value);

    if (!name || price <= 0 || quantity <= 0 || threshold < 0) {
      showToast("Please enter valid stock details", "error");
      return;
    }

    const exists = stockItems.find(
      i => i.name.toLowerCase() === name.toLowerCase()
    );

    if (exists) {
      showToast(
        `"${name}" already exists. Use + Add instead.`,
        "warning",
        3500
      );
      return;
    }

    await addStockItem({
      id: crypto.randomUUID(),
      name,
      price,
      quantity,
      threshold
    });

    showToast("Stock item added", "success", 3000);
    await renderStock(container);
  };

  /* =========================
     + ADD STOCK
  ========================= */
  document.querySelectorAll(".add-btn").forEach(btn => {
    btn.onclick = () => {
      const item = stockItems.find(i => i.id === btn.dataset.id);

      showStockEditModal({
        title: `Add Stock – ${item.name}`,
        placeholder: "Enter quantity to add",
        confirmText: "Add",
        onConfirm: async qty => {
          await updateStockQuantity(item.id, item.quantity + qty);
          showToast("Stock updated", "success", 3000);
          await renderStock(container);
        }
      });
    };
  });

  /* =========================
     EDIT ALERT
  ========================= */
  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.onclick = () => {
      const item = stockItems.find(i => i.id === btn.dataset.id);

      showStockEditModal({
        title: `Edit Alert – ${item.name}`,
        placeholder: "Enter new alert level",
        confirmText: "Save",
        onConfirm: async value => {
          await addStockItem({
            ...item,
            threshold: value
          });

          showToast("Alert updated", "success", 3000);
          await renderStock(container);
        }
      });
    };
  });

  /* =========================
     REMOVE ITEM
  ========================= */
  document.querySelectorAll(".remove-btn").forEach(btn => {
    btn.onclick = () => {
      const item = stockItems.find(i => i.id === btn.dataset.id);

      showConfirmModal({
        title: "Remove Item?",
        message: `Are you sure you want to remove "${item.name}"?`,
        onConfirm: async () => {
          await removeStockItem(item.id);
          showToast("Item removed", "warning", 3000);
          await renderStock(container);
        }
      });
    };
  });
}