import { 
  insertOpeningStock, 
  isOnboardingCompleted,
  saveShopSettings,
  getShopSettings
} from "../services/db";

import { createShop } from "../services/shopService";
import { showToast } from "../utils/toast";
import { navigate } from "../app";

export async function renderOpeningStockEntry(container) {

  container.innerHTML = `
  <div class="opening-wrapper">
    <div class="opening-card">

      <div class="opening-header">
        <h1>Setup Your Inventory</h1>
        <p>Enter your opening stock to start using the system</p>
      </div>

      <table class="inventory-table">
        <thead>
          <tr>
            <th>Item Name</th>
            <th>Cost ₹</th>
            <th>Sell ₹</th>
            <th>Qty</th>
            <th>Alert</th>
            <th>Margin</th>
          </tr>
        </thead>
        <tbody id="stock-body"></tbody>
      </table>

      <div class="table-actions">
        <button id="add-row" class="btn-outline">+ Add Row</button>
        <button class="btn-primary" id="save-opening">Save Opening Inventory</button>
      </div>

    </div>
  </div>
  `;

  const tbody = document.getElementById("stock-body");
  const saveBtn = document.getElementById("save-opening");

  /* ===============================
     CREATE ROW
  =============================== */
  function createRow(data = {}) {

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td><input class="name" placeholder="Item name" value="${data.name || ""}"></td>
      <td><input type="number" class="cost" value="${data.costPrice || ""}"></td>
      <td><input type="number" class="sell" value="${data.price || ""}"></td>
      <td><input type="number" class="qty" value="${data.quantity || ""}"></td>
      <td><input type="number" class="alert" value="${data.threshold || ""}"></td>
      <td class="margin">—</td>
    `;

    return tr;
  }

  /* ===============================
     LIVE MARGIN CALCULATION
  =============================== */
  function calculateMargin(row) {
    const cost = Number(row.querySelector(".cost").value || 0);
    const sell = Number(row.querySelector(".sell").value || 0);
    const cell = row.querySelector(".margin");

    if (!sell) {
      cell.textContent = "—";
      cell.classList.remove("profit", "loss");
      return;
    }

    const margin = ((sell - cost) / sell) * 100;

    cell.textContent = margin.toFixed(1) + "%";
    cell.classList.toggle("profit", margin > 0);
    cell.classList.toggle("loss", margin < 0);
  }

  /* Event delegation for live calc */
  tbody.addEventListener("input", (e) => {
    const row = e.target.closest("tr");
    if (!row) return;

    if (e.target.classList.contains("cost") || e.target.classList.contains("sell")) {
      calculateMargin(row);
    }
  });

  /* ===============================
     INITIAL ROW + FOCUS
  =============================== */
  const firstRow = createRow();
  tbody.appendChild(firstRow);
  firstRow.querySelector(".name").focus();

  /* ===============================
     ADD ROW
  =============================== */
  document.getElementById("add-row").onclick = () => {
    const row = createRow();
    tbody.appendChild(row);
    row.querySelector(".name").focus();
  };

  /* ===============================
     SAVE OPENING STOCK
  =============================== */
  saveBtn.onclick = async () => {

    /* Prevent double click */
    if (saveBtn.dataset.loading === "1") return;
    saveBtn.dataset.loading = "1";
    saveBtn.textContent = "Saving...";
    saveBtn.disabled = true;

    const rows = document.querySelectorAll("#stock-body tr");
    const items = [];

    for (const r of rows) {

      const name = r.querySelector(".name").value.trim();
      const cost = Number(r.querySelector(".cost").value);
      const sell = Number(r.querySelector(".sell").value);
      const qty = Number(r.querySelector(".qty").value);
      const alertQty = Number(r.querySelector(".alert").value);

      if (!name || qty <= 0) continue;

      if (sell <= 0) {
        showToast(`Selling price missing for "${name}"`, "error");
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Opening Inventory";
        saveBtn.dataset.loading = "0";
        return;
      }

      if (sell < cost) {
        showToast(`Selling price cannot be lower than cost for "${name}"`, "error");
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Opening Inventory";
        saveBtn.dataset.loading = "0";
        return;
      }

      items.push({
        id: crypto.randomUUID(),
        name,
        costPrice: cost,
        price: sell,
        quantity: qty,
        threshold: alertQty || 0
      });
    }

    if (items.length === 0) {
      showToast("Enter at least one valid item with name and quantity.", "error");
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Opening Inventory";
      saveBtn.dataset.loading = "0";
      return;
    }

    /* Save to DB */
    await insertOpeningStock(items);

    /* ===============================
      CREATE DEFAULT SHOP (ONE TIME)
    ================================= */

    const existingSettings = await getShopSettings();

    if (!existingSettings?.shopId) {

      const shopId = crypto.randomUUID();

      await createShop({
        id: shopId,
        name: "Main Shop",
        createdAt: Date.now()
      });

      await saveShopSettings({
        shopId
      });

    }

    /* Wait for IndexedDB commit (important) */
    let ready = false;
    for (let i = 0; i < 12; i++) {
      ready = await isOnboardingCompleted();
      if (ready) break;
      await new Promise(r => setTimeout(r, 80));
    }

    saveBtn.textContent = "Saved ✓";
    showToast("✅ Opening inventory saved! Welcome to your dashboard.", "success");

    /* Smooth navigate to dashboard */
    setTimeout(() => navigate("dashboard"), 800);
  };
}
