// src/pages/Stock.js

import { renderLayout } from "../components/Layout";
import {
  addStockItem,
  getAllStock,
  updateStockQuantity
} from "../services/db";
import { showToast } from "../utils/toast";

/* ===============================
   RENDER STOCK PAGE
=============================== */
export async function renderStock(container) {
  const stock = await getAllStock();

  container.innerHTML = renderLayout(`
    <section class="stock-page">
      <div class="glass-card">
        <h1>Stock Management</h1>

        <!-- ADD STOCK -->
        <div class="stock-form">
          <h3>Add New Item</h3>

          <input id="item-name" placeholder="Item name" />
          <input id="item-price" type="number" placeholder="Selling Price (₹)" />
          <input id="item-cost" type="number" placeholder="Cost Price (₹)" />
          <input id="item-qty" type="number" placeholder="Quantity" />
          <input id="item-threshold" type="number" placeholder="Low stock alert" />

          <button id="add-stock-btn" class="btn-primary">
            Add Item
          </button>
        </div>

        <!-- STOCK LIST -->
        <div class="stock-list">
          <h3>Current Stock</h3>

          ${
            stock.length === 0
              ? `<p class="muted">No stock items added yet</p>`
              : `
                <table class="stock-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Sell ₹</th>
                      <th>Cost ₹</th>
                      <th>Qty</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${stock
                      .map(
                        item => `
                          <tr>
                            <td>${item.name}</td>
                            <td>₹${item.price}</td>
                            <td>₹${item.costPrice ?? 0}</td>
                            <td>${item.quantity}</td>
                            <td>
                              <button
                                class="btn-small"
                                data-id="${item.id}"
                                data-qty="${item.quantity}"
                              >
                                + Add
                              </button>
                            </td>
                          </tr>
                        `
                      )
                      .join("")}
                  </tbody>
                </table>
              `
          }
        </div>
      </div>
    </section>
  `);

  /* ===============================
     ADD STOCK HANDLER
  =============================== */
  document.getElementById("add-stock-btn").onclick = async () => {
    const name = document.getElementById("item-name").value.trim();
    const price = Number(document.getElementById("item-price").value);
    const costPrice = Number(document.getElementById("item-cost").value);
    const quantity = Number(document.getElementById("item-qty").value);
    const threshold = Number(document.getElementById("item-threshold").value);

    if (!name || price <= 0 || quantity <= 0) {
      showToast("Please enter valid stock details", "error");
      return;
    }

    await addStockItem({
      id: crypto.randomUUID(),
      name,
      price,
      costPrice: costPrice || 0, // 🔑 IMPORTANT FOR PROFIT
      quantity,
      threshold
    });

    showToast("Stock item added", "success");
    renderStock(container);
  };

  /* ===============================
     UPDATE QUANTITY HANDLER
  =============================== */
  document.querySelectorAll(".btn-small").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const currentQty = Number(btn.dataset.qty);

      const addQty = Number(prompt("Add quantity:"));
      if (!addQty || addQty <= 0) return;

      await updateStockQuantity(id, currentQty + addQty);
      showToast("Stock updated", "success");
      renderStock(container);
    };
  });
}