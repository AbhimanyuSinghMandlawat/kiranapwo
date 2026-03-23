import { renderLayout } from "../components/Layout";
import { getAllStock, addStockItem } from "../services/db";
import { getShopSettings } from "../services/db";
import { showToast } from "../utils/toast";

const API_BASE = "http://localhost:5000";

export async function renderBillScanner(container) {

  const settings = await getShopSettings();
  const token    = settings?.backendToken || null;

  container.innerHTML = await renderLayout(`
    <section class="dashboard">
      <h1>🤖 AI Bill Scanner</h1>
      <p style="color:#888;margin-bottom:16px">
        Upload a photo or scan of your supplier bill. Our AI will automatically
        extract supplier details and all item entries.
      </p>

      <div class="glass-card" id="scanner-upload-area">
        <div class="bill-drop-zone" id="drop-zone">
          <div class="drop-icon">📷</div>
          <p>Drop bill image here or click to upload</p>
          <small>Supports JPG, PNG, PDF images</small>
          <input type="file" id="bill-file" accept="image/*,.pdf,application/pdf" style="display:none" />
          <button class="btn-primary" id="choose-file-btn" style="margin-top:12px">
            📂 Choose File (Image or PDF)
          </button>
        </div>
      </div>

      <div id="scanner-progress" style="display:none" class="glass-card">
        <div class="scan-progress">
          <div class="scan-spinner">🔄</div>
          <p id="scan-status-text">Uploading and analysing bill...</p>
          <div class="progress-bar-wrap">
            <div id="scan-progress-bar" class="progress-bar-fill" style="width:0%"></div>
          </div>
        </div>
      </div>

      <div id="scanner-result" style="display:none">
        <!-- filled by JS -->
      </div>
    </section>
  `);

  // ── File picker ──
  const fileInput  = document.getElementById("bill-file");
  const choosBtn   = document.getElementById("choose-file-btn");
  const dropZone   = document.getElementById("drop-zone");

  choosBtn.onclick = () => fileInput.click();
  fileInput.onchange = () => {
    if (fileInput.files[0]) processFile(fileInput.files[0]);
  };

  // Drag & drop
  dropZone.ondragover = e => { e.preventDefault(); dropZone.classList.add("dragging"); };
  dropZone.ondragleave = () => dropZone.classList.remove("dragging");
  dropZone.ondrop = e => {
    e.preventDefault();
    dropZone.classList.remove("dragging");
    const file = e.dataTransfer?.files?.[0];
    if (file) processFile(file);
  };

  // ── Process uploaded file ──
  async function processFile(file) {
    const progress   = document.getElementById("scanner-progress");
    const uploadArea = document.getElementById("scanner-upload-area");
    const statusText = document.getElementById("scan-status-text");
    const progressBar = document.getElementById("scan-progress-bar");

    uploadArea.style.display = "none";
    progress.style.display   = "block";

    // Simulate progress feedback while OCR runs (can take 5-20s)
    let pct = 0;
    const progressTimer = setInterval(() => {
      pct = Math.min(pct + 3, 90);
      progressBar.style.width = pct + "%";
    }, 600);

    const stages = [
      [1500, "🔍 Preprocessing image..."],
      [4000, "🤖 Running OCR — extracting text..."],
      [8000, "📋 Analysing bill structure..."],
      [12000,"🧮 Identifying items and prices..."]
    ];
    for (const [delay, msg] of stages) {
      setTimeout(() => { if (statusText) statusText.textContent = msg; }, delay);
    }

    try {
      if (!token) {
        showToast("Not logged in to backend — cannot scan", "error");
        resetUI();
        return;
      }

      const formData = new FormData();
      formData.append("bill", file);

      const res = await fetch(`${API_BASE}/api/scan-bill`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body:   formData
      });

      clearInterval(progressTimer);
      progressBar.style.width = "100%";

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Scan failed" }));
        showToast(err.message || "Scan failed", "error");
        resetUI();
        return;
      }

      const data = await res.json();
      progress.style.display = "none";
      renderScanResult(data);

    } catch (err) {
      clearInterval(progressTimer);
      console.error("[BillScanner]", err);
      showToast("Connection error — is the backend running?", "error");
      resetUI();
    }
  }

  function resetUI() {
    document.getElementById("scanner-progress").style.display   = "none";
    document.getElementById("scanner-upload-area").style.display = "block";
  }

  // ── Render Results ──
  function renderScanResult(data) {
    const resultDiv = document.getElementById("scanner-result");
    resultDiv.style.display = "block";

    const missingFields = [];
    if (!data.gstNumber)    missingFields.push("GST Number");
    if (!data.supplierName) missingFields.push("Supplier Name");
    if (!data.supplierMobile) missingFields.push("Supplier Mobile");

    // ── Check if critical info is missing → show popup ──
    if (missingFields.length > 0) {
      showMissingInfoPopup(missingFields, data, resultDiv);
      return;
    }

    renderExtractedData(data, resultDiv);
  }

  function showMissingInfoPopup(missing, data, resultDiv) {
    const overlay = document.createElement("div");
    overlay.className = "missing-info-overlay";
    overlay.innerHTML = `
      <div class="missing-info-modal">
        <div class="missing-info-icon">⚠️</div>
        <h3>Some Details are Missing</h3>
        <p>Could not extract: <strong>${missing.join(", ")}</strong></p>
        <p style="color:#888;font-size:14px">This may be due to image quality or bill format.</p>
        <div class="missing-info-actions">
          <button id="missing-continue" class="btn-primary">✅ Continue Anyway</button>
          <button id="missing-cancel"   class="btn-secondary">❌ Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById("missing-continue").onclick = () => {
      overlay.remove();
      renderExtractedData(data, resultDiv);
    };
    document.getElementById("missing-cancel").onclick = () => {
      overlay.remove();
      resultDiv.style.display = "none";
      document.getElementById("scanner-upload-area").style.display = "block";
    };
  }

  function renderExtractedData(data, resultDiv) {
    const items = data.items || [];

    resultDiv.innerHTML = `
      <div class="glass-card" style="margin-top:20px">
        <h2>✅ Bill Scanned Successfully</h2>
        <div class="scan-confidence">
          Confidence: <strong>${data.confidence || 0}%</strong>
          <div class="confidence-bar">
            <div class="confidence-fill" style="width:${data.confidence || 0}%"></div>
          </div>
        </div>

        <div class="scan-supplier-info">
          <div class="scan-field"><label>GST Number</label><span>${data.gstNumber || "—"}</span></div>
          <div class="scan-field"><label>Bill Number</label><span>${data.billNumber || "—"}</span></div>
          <div class="scan-field"><label>Supplier Name</label><span>${data.supplierName || "—"}</span></div>
          <div class="scan-field"><label>Supplier Mobile</label><span>${data.supplierMobile || "—"}</span></div>
        </div>

        <h3 style="margin-top:20px">📦 Extracted Items (${items.length})</h3>

        ${items.length === 0 ? `
          <p style="color:#e57373">No items could be automatically extracted from this bill.</p>
          <p style="color:#888;font-size:13px">Image may be blurry or the bill format is unusual. You can add items manually below.</p>
        ` : ""}

        <div id="extracted-items-list">
          ${items.map((item, i) => `
            <div class="extracted-item-row" data-index="${i}">
              <input class="item-name"  value="${item.name}"  placeholder="Item name" />
              <input class="item-qty"   value="${item.qty}"   type="number" min="1" placeholder="Qty" />
              <input class="item-price" value="${item.price}" type="number" min="0" step="0.01" placeholder="Price ₹" />
              <button class="btn-remove-item" data-i="${i}">🗑️</button>
            </div>
          `).join("")}
        </div>

        <button id="add-item-row" class="btn-secondary" style="margin-top:8px">➕ Add Item Row</button>

        <div style="margin-top:20px;display:flex;gap:12px">
          <button id="save-to-stock" class="btn-primary">💾 Save All Items to Stock</button>
          <button id="scan-another"  class="btn-secondary">🔄 Scan Another Bill</button>
        </div>
      </div>
    `;

    // ── Add item row ──
    document.getElementById("add-item-row").onclick = () => {
      const list = document.getElementById("extracted-items-list");
      const idx  = list.children.length;
      const row  = document.createElement("div");
      row.className = "extracted-item-row";
      row.dataset.index = idx;
      row.innerHTML = `
        <input class="item-name"  placeholder="Item name" />
        <input class="item-qty"   type="number" value="1" min="1" placeholder="Qty" />
        <input class="item-price" type="number" value="0" step="0.01" placeholder="Price ₹" />
        <button class="btn-remove-item" data-i="${idx}">🗑️</button>
      `;
      list.appendChild(row);
    };

    // ── Remove row ──
    document.getElementById("extracted-items-list").addEventListener("click", e => {
      const btn = e.target.closest(".btn-remove-item");
      if (btn) btn.closest(".extracted-item-row").remove();
    });

    // ── Save to stock ──
    document.getElementById("save-to-stock").onclick = async () => {
      const rows = document.querySelectorAll(".extracted-item-row");
      let saved = 0, skipped = 0;

      for (const row of rows) {
        const name  = row.querySelector(".item-name")?.value.trim();
        const qty   = parseFloat(row.querySelector(".item-qty")?.value)  || 0;
        const price = parseFloat(row.querySelector(".item-price")?.value) || 0;

        if (!name || qty <= 0) { skipped++; continue; }

        try {
          await addStockItem({
            id:        crypto.randomUUID(),
            name,
            price,
            costPrice: price,
            quantity:  qty,
            createdAt: Date.now()
          });
          saved++;
        } catch (err) {
          if (err === "ITEM_EXISTS") {
            skipped++;
          }
        }
      }

      if (saved > 0) showToast(`✅ ${saved} item(s) added to stock!`, "success");
      if (skipped > 0) showToast(`⚠️ ${skipped} item(s) skipped (already exist or invalid)`, "info");
    };

    // ── Scan another ──
    document.getElementById("scan-another").onclick = () => {
      resultDiv.style.display = "none";
      document.getElementById("scanner-upload-area").style.display = "block";
    };
  }
}
