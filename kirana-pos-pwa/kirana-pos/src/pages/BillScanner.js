import { renderLayout } from "../components/Layout";
import {
  getShopSettings,
  saveSupplier, getAllSuppliers,
  saveBillRecord, getAllBillRecords,
  upsertStockByName
} from "../services/db";
import { showToast } from "../utils/toast";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";


export async function renderBillScanner(container) {
  const settings = await getShopSettings();
  const token    = settings?.backendToken || null;

  container.innerHTML = await renderLayout(`
    <section class="dashboard bill-scanner-page">

      <!-- HERO -->
      <div class="scanner-hero">
        <div class="scanner-hero-icon"></div>
        <h1>AI Bill Scanner</h1>
        <p>Upload your supplier bill image &mdash; AI extracts every detail automatically</p>
      </div>

      <!-- TAB BAR -->
      <div class="scanner-tabs" role="tablist">
        <button class="scanner-tab active" id="tab-scan" role="tab" aria-selected="true">&#128247; Scan Bill</button>
        <button class="scanner-tab"        id="tab-history" role="tab" aria-selected="false">&#128203; Bills History</button>
      </div>

      <!-- SCAN PANEL -->
      <div id="scan-panel">

        <!-- UPLOAD ZONE -->
        <div class="glass-card scanner-upload-card" id="scanner-upload-area">
          <div class="bill-drop-zone" id="drop-zone">
            <div class="drop-zone-content">
              <div class="drop-icon-wrap">
                <span class="drop-icon">&#128247;</span>
                <div class="drop-pulse"></div>
              </div>
              <h3>Drop bill image here</h3>
              <p>or click to choose a file</p>
              <small>Supports JPG, PNG, WebP. Max 10 MB</small>
            </div>
            <input type="file" id="bill-file" accept="image/*" style="display:none" />
            <button class="btn-scan-upload" id="choose-file-btn">
                &#128194; Choose Bill Image
            </button>
          </div>

          <!-- PREVIEW STRIP (shown after file chosen) -->
          <div id="preview-strip" style="display:none">
            <img id="preview-img" src="" alt="Bill preview" />
            <div class="preview-info">
              <span id="preview-name"></span>
              <button class="btn-do-scan" id="do-scan-btn">&#128269; Scan Bill</button>
            </div>
          </div>
        </div>

        <!-- PROGRESS -->
        <div id="scanner-progress" style="display:none">
          <div class="glass-card scan-progress-card">
            <div class="scan-animation">
              <div class="scan-beam"></div>
              <div class="scan-icon"></div>
            </div>
            <p id="scan-status-text" class="scan-status">Uploading bill to Gemini AI...</p>
            <div class="scan-progress-bar-wrap">
              <div id="scan-progress-bar" class="scan-progress-bar-fill"></div>
            </div>
            <div class="scan-steps">
              <span id="step1" class="scan-step active"> Uploading</span>
              <span id="step2" class="scan-step"> Reading</span>
              <span id="step3" class="scan-step"> Extracting</span>
              <span id="step4" class="scan-step">OK Done</span>
            </div>
          </div>
        </div>

        <!-- RESULT PANEL (injected dynamically) -->
        <div id="scanner-result" style="display:none"></div>

      </div><!-- /scan-panel -->

      <!-- HISTORY PANEL -->
      <div id="history-panel" style="display:none">
        <div class="glass-card" id="history-list-wrap">
          <div class="history-header">
            <h3> Previous Bills</h3>
            <span id="history-count" class="item-count-badge">0</span>
          </div>
          <div id="history-list"><p class="text-muted" style="padding:20px">Loading</p></div>
        </div>
      </div>

    </section>
  `);

  injectScannerStyles();

  //  State 
  let selectedFile = null;

  //  Tabs 
  const tabScan    = document.getElementById("tab-scan");
  const tabHistory = document.getElementById("tab-history");
  const scanPanel  = document.getElementById("scan-panel");
  const histPanel  = document.getElementById("history-panel");

  tabScan.onclick = () => {
    tabScan.classList.add("active");    tabScan.setAttribute("aria-selected","true");
    tabHistory.classList.remove("active"); tabHistory.setAttribute("aria-selected","false");
    scanPanel.style.display  = "";
    histPanel.style.display  = "none";
  };
  tabHistory.onclick = async () => {
    tabHistory.classList.add("active");  tabHistory.setAttribute("aria-selected","true");
    tabScan.classList.remove("active");  tabScan.setAttribute("aria-selected","false");
    scanPanel.style.display  = "none";
    histPanel.style.display  = "";
    await renderHistory();
  };

  //  File picker 
  const fileInput  = document.getElementById("bill-file");
  const chooseBtn  = document.getElementById("choose-file-btn");
  const dropZone   = document.getElementById("drop-zone");
  const previewStrip = document.getElementById("preview-strip");

  chooseBtn.onclick = () => fileInput.click();
  fileInput.onchange = () => { if (fileInput.files[0]) prepareFile(fileInput.files[0]); };

  dropZone.ondragover  = e => { e.preventDefault(); dropZone.classList.add("dragging"); };
  dropZone.ondragleave = () => dropZone.classList.remove("dragging");
  dropZone.ondrop = e => {
    e.preventDefault();
    dropZone.classList.remove("dragging");
    const file = e.dataTransfer?.files?.[0];
    if (file) prepareFile(file);
  };

  //  Prepare file  show preview 
  function prepareFile(file) {
    if (file.size > 10 * 1024 * 1024) {
      showToast("File too large  max 10 MB", "error"); return;
    }
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = ev => {
      document.getElementById("preview-img").src      = ev.target.result;
      document.getElementById("preview-name").textContent = file.name;
      previewStrip.style.display = "flex";
    };
    reader.readAsDataURL(file);
  }

  document.getElementById("do-scan-btn").onclick = () => {
    if (selectedFile) processFile(selectedFile);
  };

  // -- State machine constants --
  const STATES = { IDLE:"idle", UPLOADING:"uploading", CHECKING:"checking", EXTRACTING:"extracting", DONE:"done", ERROR:"error" };
  let scanState = STATES.IDLE;

  function setScanState(state, message) {
    scanState = state;
    const statusText = document.getElementById("scan-status-text");
    const bar        = document.getElementById("scan-progress-bar");
    const steps      = ["step1","step2","step3","step4"];
    const cfg = {
      uploading:  { pct:15,  step:0, text:" Uploading bill image...",             color:"#6366f1" },
      checking:   { pct:42,  step:1, text:" Checking image quality with AI...",   color:"#f59e0b" },
      extracting: { pct:74,  step:2, text:" AI extracting all bill data...",       color:"#22c55e" },
      done:       { pct:100, step:3, text:"OK Extraction complete!",                 color:"#22c55e" },
      error:      { pct:100, step:-1,text:message||" Scan failed",                 color:"#ef4444" }
    }[state];
    if (!cfg) return;
    if (statusText) statusText.textContent = cfg.text;
    if (bar) { bar.style.width = cfg.pct + "%"; bar.style.background = cfg.color; }
    steps.forEach((id, i) => {
      const el = document.getElementById(id); if (!el) return;
      el.classList.toggle("active",    i <= cfg.step);
      el.classList.toggle("completed", i <  cfg.step);
    });
  }

  // -- Process (upload) --
  async function processFile(file) {
    const uploadArea  = document.getElementById("scanner-upload-area");
    const progressDiv = document.getElementById("scanner-progress");
    const resultDiv   = document.getElementById("scanner-result");

    uploadArea.style.display  = "none";
    progressDiv.style.display = "block";
    resultDiv.style.display   = "none";
    setScanState(STATES.UPLOADING);

    if (!token) {
      await sleep(400);
      progressDiv.style.display = "none";
      showScanError(" Not connected to backend. Configure your shop in Settings first.", "NOT_CONNECTED");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("bill", file);

      await sleep(300);
      setScanState(STATES.CHECKING);

      const res = await fetch(`${API_BASE}/api/scan-bill`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}` },
        body:    formData
      });

      setScanState(STATES.EXTRACTING);

      let data;
      try   { data = await res.json(); }
      catch { data = { message: `Server returned HTTP ${res.status}` }; }

      if (!res.ok) {
        const code = data.errorCode || "SCAN_FAILED";
        progressDiv.style.display = "none";
        showScanError(data.message || "Scan failed. Please try again.", code);
        return;
      }

      setScanState(STATES.DONE);
      await sleep(700);

      if (data.imageQuality === "poor" || (data.confidence != null && data.confidence < 35)) {
        showToast("(!!) Low confidence (" + (data.confidence||0) + "%) - please verify fields.", "warn");
      }

      progressDiv.style.display = "none";
      renderResult(data);

    } catch (err) {
      progressDiv.style.display = "none";
      const isNetwork = err.name === "TypeError" || err.message.includes("fetch");
      showScanError(
        isNetwork
          ? "⚠️ Cannot reach backend. Check your internet connection or reconnect in Shop Settings."
          : "⚠️ Unexpected error: " + err.message,
        isNetwork ? "NETWORK_ERROR" : "UNKNOWN"
      );
    }
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // -- Error display (never auto-resets UI) --
  function showScanError(message, errorCode) {
    const resultDiv = document.getElementById("scanner-result");
    resultDiv.style.display = "block";

    const icons = { IMAGE_UNREADABLE:"", LOW_CONFIDENCE:"(!!)", NOT_CONNECTED:"", AUTH_ERROR:"", NETWORK_ERROR:"", SCAN_FAILED:"", RATE_LIMITED:"...", UNKNOWN:"(!!)" };
    const icon  = icons[errorCode] || "(!!)";

    const allTips = {
      IMAGE_UNREADABLE: [["","Use natural light directly above the bill"],["","Hold camera flat and parallel to bill"],["","Keep hands steady, rest elbows on surface"],["","Ensure full bill is in frame"]],
      LOW_CONFIDENCE:   [["","Use better lighting  shadows reduce accuracy"],["","Zoom in so bill fills the frame"],["","Clean camera lens before shooting"]],
      NETWORK_ERROR:    [["","Run: node server.js in the backend folder"],["","Check internet/LAN connection"],["","Refresh the app and try again"]],
      NOT_CONNECTED:    [["","Go to Shop Settings and connect backend"],["","Log out and log back in"]],
      RATE_LIMITED:     [["...","Wait the indicated time then click Retry Scan"],["","Gemini free tier allows 30 scans/minute"],["","You can try closing and reopening the scanner"]],
    };
    const tips = allTips[errorCode] || [["","Try uploading again"],["","Ensure bill is clearly visible"]];

    const titles = { IMAGE_UNREADABLE:"Image Unreadable", LOW_CONFIDENCE:"Could Not Extract Data", NETWORK_ERROR:"Connection Failed", AUTH_ERROR:"Session Expired", NOT_CONNECTED:"Not Connected", RATE_LIMITED:"AI Rate Limit" };
    const title  = titles[errorCode] || "Scan Failed";

    resultDiv.innerHTML = `
      <div class="glass-card scan-error-card">
        <div class="scan-error-icon">${icon}</div>
        <h3 class="scan-error-title">${title}</h3>
        <p class="scan-error-msg">${message}</p>
        <div class="scan-error-tips">${tips.map(([e,t])=>`<div class="tip"><span>${e}</span>${t}</div>`).join("")}</div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:8px">
          <button id="retry-scan-btn"   class="btn-scan-upload" style="gap:6px"> Retry Scan</button>
          <button id="new-image-btn"    class="btn-scan-upload" style="background:rgba(255,255,255,0.06);color:#94a3b8;border:1px solid rgba(255,255,255,0.1)"> New Image</button>
        </div>
      </div>`;
    document.getElementById("retry-scan-btn").onclick = () => {
      resultDiv.style.display = "none";
      if (selectedFile) {
        document.getElementById("scanner-upload-area").style.display = "block";
        const bar = document.getElementById("scan-progress-bar"); if(bar) bar.style.width="0%";
      } else { resetUI(); }
    };
    document.getElementById("new-image-btn").onclick = resetUI;
  }

  function resetUI() {
    document.getElementById("scanner-progress").style.display   = "none";
    document.getElementById("scanner-upload-area").style.display = "block";
    previewStrip.style.display = "none";
    selectedFile = null;
  }

  //  Render result 
  async function renderResult(data) {
    const resultDiv = document.getElementById("scanner-result");
    resultDiv.style.display = "block";

    const items    = data.inventory_items || [];
    const supplier = data.supplier        || {};
    const bill     = data.bill            || {};
    const conf     = data.confidence      || 0;
    const confColor = conf >= 70 ? "#4caf50" : conf >= 40 ? "#ff9800" : "#f44336";

    // Load known suppliers for autocomplete
    const knownSuppliers = await getAllSuppliers();
    const supNames = knownSuppliers.map(s => s.name).filter(Boolean);

    resultDiv.innerHTML = `
      <!-- Confidence -->
      <div class="glass-card scan-conf-card">
        <div class="conf-row">
          <span class="conf-label">&#127919; AI Confidence</span>
          <span class="conf-value" style="color:${confColor}">${conf}%</span>
        </div>
        <div class="conf-bar-wrap">
          <div class="conf-bar-fill" style="width:${conf}%;background:${confColor}"></div>
        </div>
        ${conf < 40 ? `<p class="conf-warn">(!) Low confidence &mdash; please verify all fields before saving.</p>` : ""}
      </div>

      <!-- Supplier Info -->
      <div class="glass-card scan-section-card">
        <div class="scan-section-header">
          <span>&#127978;</span>
          <h3>Supplier Information</h3>
          <span class="edit-badge">Editable</span>
        </div>
        <div id="sup-autocomplete-wrap" style="position:relative;grid-column:1/-1;margin-bottom:6px">
          <label class="scan-label">Supplier / Owner Name</label>
          <input id="sup-name" class="scan-input" value="${escHtml(supplier.name || '')}" placeholder="Supplier name" autocomplete="off" list="sup-datalist" />
          <datalist id="sup-datalist">${supNames.map(n => `<option value="${escHtml(n)}">`).join("")}</datalist>
        </div>
        <div class="scan-fields-grid">
          <div class="scan-field-group">
            <label>Business Name</label>
            <input id="sup-biz" class="scan-input" value="${escHtml(supplier.business_name || '')}" placeholder="Shop / company name" />
          </div>
          <div class="scan-field-group">
            <label>Mobile Number</label>
            <input id="sup-mobile" class="scan-input" value="${escHtml(supplier.mobile || '')}" placeholder="10-digit mobile" />
          </div>
          <div class="scan-field-group">
            <label>GST Number</label>
            <input id="sup-gst" class="scan-input" value="${escHtml(supplier.gst_number || '')}" placeholder="GST number" />
          </div>
        </div>
      </div>

      <!-- Bill Details -->
      <div class="glass-card scan-section-card">
        <div class="scan-section-header">
          <span>&#128196;</span>
          <h3>Bill Details</h3>
          <span class="edit-badge">Editable</span>
        </div>
        <div class="scan-fields-grid">
          <div class="scan-field-group">
            <label>Bill / Invoice Number</label>
            <input id="bill-number" class="scan-input" value="${escHtml(bill.bill_number || '')}" placeholder="Bill number" />
          </div>
          <div class="scan-field-group">
            <label>Bill Date</label>
            <input id="bill-date" class="scan-input" value="${escHtml(bill.date || '')}" placeholder="DD/MM/YYYY" />
          </div>
          <div class="scan-field-group">
            <label>Total Amount (Rs.)</label>
            <input id="bill-total" class="scan-input" type="number" value="${bill.total_amount || ''}" placeholder="Total Rs." />
          </div>
          <div class="scan-field-group">
            <label>Tax Amount (Rs.)</label>
            <input id="bill-tax" class="scan-input" type="number" value="${bill.tax_amount || ''}" placeholder="GST/Tax Rs." />
          </div>
          <div class="scan-field-group">
            <label>Payment Method</label>
            <select id="bill-payment" class="scan-input">
              <option value="">-- Select --</option>
              <option value="cash"   ${bill.payment_method === "cash"   ? "selected" : ""}>Cash</option>
              <option value="upi"    ${bill.payment_method === "upi"    ? "selected" : ""}>UPI</option>
              <option value="credit" ${bill.payment_method === "credit" ? "selected" : ""}>Credit</option>
              <option value="cheque" ${bill.payment_method === "cheque" ? "selected" : ""}>Cheque</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Inventory Items -->
      <div class="glass-card scan-section-card">
        <div class="scan-section-header">
          <span>&#128230;</span>
          <h3>Inventory Items <span class="item-count-badge">${items.length}</span></h3>
          <span class="edit-badge">Auto-Filled &middot; Editable</span>
        </div>

        ${items.length === 0 ? `
          <div class="no-items-msg">
            
            <p>No items extracted. Add manually below.</p>
          </div>
        ` : ""}

        <div class="items-table-wrap">
          <div class="items-table-header">
            <span>Item Name</span>
            <span>Cost Rs.</span>
            <span>Sell Rs.</span>
            <span>Qty</span>
            <span>Unit</span>
            <span>Alert</span>
            <span>Margin</span>
            
          </div>
          <div id="extracted-items-list">
            ${items.map((item, i) => buildItemRow(item, i)).join("")}
          </div>
        </div>

        <button id="add-item-row" class="btn-add-row">+ Add Item Row</button>
      </div>

      <!-- Action Bar -->
      <div class="scan-action-bar">
        <button id="save-all-btn" class="btn-save-all">
          &#128190; Save All to Database
        </button>
        <button id="scan-another" class="btn-scan-again">
          &#128247; Scan Another Bill
        </button>
      </div>
    `;

    //  Delegated listeners 
    document.getElementById("add-item-row").onclick = () => {
      const list = document.getElementById("extracted-items-list");
      const idx  = list.querySelectorAll(".item-row").length;
      const wrap = document.createElement("div");
      wrap.innerHTML = buildItemRow({}, idx);
      const row = wrap.firstElementChild;
      list.appendChild(row);
      attachMarginCalc(row);
    };

    document.getElementById("extracted-items-list").addEventListener("click", e => {
      const btn = e.target.closest(".btn-remove-row");
      if (btn) btn.closest(".item-row").remove();
    });

    document.querySelectorAll(".item-row").forEach(row => attachMarginCalc(row));

    // Supplier auto-fill from IndexedDB on name select
    document.getElementById("sup-name").addEventListener("change", async e => {
      const match = knownSuppliers.find(s => s.name === e.target.value);
      if (match) {
        document.getElementById("sup-biz").value    = match.business_name || "";
        document.getElementById("sup-mobile").value = match.mobile        || "";
        document.getElementById("sup-gst").value    = match.gst_number    || "";
        showToast("Supplier details auto-filled OK", "info");
      }
    });

    document.getElementById("save-all-btn").onclick   = () => saveAll(data.scanId);
    document.getElementById("scan-another").onclick   = resetUI;
  }

  //  Row builder 
  function buildItemRow(item, i) {
    const margin = (item.sell_price && item.cost_price && item.cost_price > 0)
      ? Math.round(((item.sell_price - item.cost_price) / item.cost_price) * 100)
      : "";
    return `
      <div class="item-row" data-index="${i}">
        <input class="scan-input ir-name"  value="${escHtml(item.item_name  || '')}" placeholder="Item name" />
        <input class="scan-input ir-cost"  value="${item.cost_price || ''}"  type="number" min="0" step="0.01" placeholder="0.00" />
        <input class="scan-input ir-sell"  value="${item.sell_price || ''}"  type="number" min="0" step="0.01" placeholder="0.00" />
        <input class="scan-input ir-qty"   value="${item.quantity   || 1}"   type="number" min="1" placeholder="1" />
        <input class="scan-input ir-unit"  value="${escHtml(item.unit || 'pcs')}"    placeholder="pcs" />
        <input class="scan-input ir-alert" value="${item.alert      || ''}"  type="number" min="0" placeholder="0" />
        <span  class="margin-display ir-margin">${margin ? margin + "%" : ""}</span>
        <button class="btn-remove-row" title="Remove">[X]</button>
      </div>
    `;
  }

  function attachMarginCalc(row) {
    const cost = row.querySelector(".ir-cost");
    const sell = row.querySelector(".ir-sell");
    const disp = row.querySelector(".ir-margin");
    const calc = () => {
      const c = parseFloat(cost?.value) || 0;
      const s = parseFloat(sell?.value) || 0;
      if (c > 0 && s > 0) {
        const m = Math.round(((s - c) / c) * 100);
        disp.textContent = m + "%";
        disp.style.color = m >= 0 ? "#4caf50" : "#f44336";
      } else { disp.textContent = "-"; disp.style.color = ""; }
    };
    cost?.addEventListener("input", calc);
    sell?.addEventListener("input", calc);
  }

  //  Save pipeline: IndexedDB  Backend 
  async function saveAll(scanId) {
    const btn = document.getElementById("save-all-btn");
    btn.disabled = true;
    btn.innerHTML = " Saving...";

    try {
      // 1. Collect supplier
      const supName = document.getElementById("sup-name")?.value.trim();
      let supplierId = null;

      if (supName) {
        const supObj = {
          name:          supName,
          business_name: document.getElementById("sup-biz")?.value.trim()    || null,
          mobile:        document.getElementById("sup-mobile")?.value.trim() || null,
          gst_number:    document.getElementById("sup-gst")?.value.trim()    || null
        };

        // Save locally first
        supplierId = await saveSupplier(supObj);

        // Then sync to backend (fire-and-forget, no block)
        if (token) {
          fetch(`${API_BASE}/api/suppliers`, {
            method:  "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body:    JSON.stringify({ ...supObj, id: supplierId })
          }).catch(() => {});
        }
      }

      // 2. Collect items from UI
      const rows   = document.querySelectorAll(".item-row");
      const uiItems = [];
      rows.forEach(row => {
        const name = row.querySelector(".ir-name")?.value.trim();
        const cost = parseFloat(row.querySelector(".ir-cost")?.value) || 0;
        const sell = parseFloat(row.querySelector(".ir-sell")?.value) || 0;
        const qty  = parseFloat(row.querySelector(".ir-qty")?.value)  || 1;
        const unit = row.querySelector(".ir-unit")?.value.trim()      || "pcs";
        const alrt = parseFloat(row.querySelector(".ir-alert")?.value) || 5;
        if (name) uiItems.push({ name, cost, sell, qty, unit, alert: alrt });
      });

      // 3. Upsert stock items (add qty if exists, create if new)
      let created = 0, updated = 0, skipped = 0;
      for (const item of uiItems) {
        if (!item.name || item.qty <= 0) { skipped++; continue; }
        try {
          const result = await upsertStockByName({
            name:      item.name,
            price:     item.sell || item.cost,
            costPrice: item.cost,
            quantity:  item.qty,
            threshold: item.alert,
            unit:      item.unit,
            createdAt: Date.now()
          });
          if (result === "created") created++;
          else                      updated++;
        } catch (e) { skipped++; }
      }

      // 4. Save bill record locally
      const billData = {
        supplier_id:    supplierId,
        supplier_name:  supName || null,
        bill_number:    document.getElementById("bill-number")?.value.trim()  || null,
        bill_date:      document.getElementById("bill-date")?.value.trim()    || null,
        total_amount:   parseFloat(document.getElementById("bill-total")?.value) || 0,
        tax_amount:     parseFloat(document.getElementById("bill-tax")?.value)   || 0,
        payment_method: document.getElementById("bill-payment")?.value          || null,
        scan_id:        scanId,
        items:          uiItems
      };
      const billId = await saveBillRecord(billData);

      // 5. Sync bill record to backend
      if (token) {
        fetch(`${API_BASE}/api/bill-records`, {
          method:  "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body:    JSON.stringify({ ...billData, id: billId })
        }).catch(() => {});
      }

      //  Success toasts 
      btn.innerHTML = "<span>OK</span> Saved!";
      btn.style.background = "linear-gradient(135deg,#2e7d32,#43a047)";

      if (created > 0) showToast(`OK ${created} new item(s) added to stock`, "success");
      if (updated > 0) showToast(` ${updated} item(s) quantity updated`, "info");
      if (skipped > 0) showToast(` ${skipped} item(s) skipped (empty)`, "info");
      if (supplierId)  showToast(` Supplier "${supName}" saved`, "success");
      if (billData.bill_number) showToast(` Bill #${billData.bill_number} recorded`, "info");

    } catch (err) {
      console.error("[SAVE ERROR]", err);
      showToast("Save failed: " + (err.message || err), "error");
      btn.disabled = false;
      btn.innerHTML = " Save All to Database";
    }
  }

  //  History tab 
  async function renderHistory() {
    const listEl   = document.getElementById("history-list");
    const countEl  = document.getElementById("history-count");
    listEl.innerHTML = "<p style='padding:20px;color:#888'>Loading</p>";

    const records = await getAllBillRecords();
    countEl.textContent = records.length;

    if (records.length === 0) {
      listEl.innerHTML = `<div class="no-history"><p>No bills saved yet.</p></div>`;
      return;
    }

    listEl.innerHTML = records.map(r => `
      <div class="history-row">
        <div class="hr-left">
          
          <div>
            <div class="hr-title">${r.bill_number ? `Bill #${escHtml(r.bill_number)}` : "No bill number"}</div>
            <div class="hr-sub">${r.supplier_name ? ` ${escHtml(r.supplier_name)}` : "Unknown supplier"} ${r.bill_date ? ". " + escHtml(r.bill_date) : ""}</div>
          </div>
        </div>
        <div class="hr-right">
          <span class="hr-amount">${r.total_amount ? "Rs." + Number(r.total_amount).toFixed(2) : ""}</span>
          <span class="hr-items">${Array.isArray(r.items) ? r.items.length + " items" : ""}</span>
        </div>
      </div>
    `).join("");
  }
}

//  Utility 
function escHtml(str) {
  return String(str || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

//  Styles 
function injectScannerStyles() {
  if (document.getElementById("bill-scanner-styles")) return;
  const style = document.createElement("style");
  style.id = "bill-scanner-styles";
  style.textContent = `
    .bill-scanner-page { max-width: 940px; margin: 0 auto; padding-bottom: 60px; }

    /* Hero */
    .scanner-hero { text-align:center; margin-bottom:24px; padding:32px 20px 16px; }
    .scanner-hero-icon { font-size:56px; margin-bottom:12px; }
    .scanner-hero h1 { font-size:28px; font-weight:800; margin:0 0 8px; }
    .scanner-hero p  { color:var(--text-muted,#888); font-size:15px; margin:0; }

    /* Tabs */
    .scanner-tabs { display:flex; gap:8px; margin-bottom:20px; background:rgba(255,255,255,0.04); border-radius:14px; padding:6px; }
    .scanner-tab  { flex:1; padding:10px 0; border:none; border-radius:10px; background:transparent; color:inherit; font-size:14px; font-weight:600; cursor:pointer; transition:background 0.2s,color 0.2s; }
    .scanner-tab.active { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; box-shadow:0 4px 12px rgba(99,102,241,0.3); }

    /* Upload */
    .scanner-upload-card { padding:0; overflow:hidden; border-radius:20px; }
    .bill-drop-zone {
      border:2px dashed rgba(99,102,241,0.4); border-radius:18px;
      padding:40px 24px; text-align:center; cursor:pointer;
      transition:border-color 0.2s,background 0.2s;
    }
    .bill-drop-zone.dragging { border-color:#6366f1; background:rgba(99,102,241,0.06); }
    .drop-zone-content { margin-bottom:20px; }
    .drop-icon-wrap { position:relative; display:inline-block; margin-bottom:16px; }
    .drop-icon  { font-size:52px; display:block; }
    .drop-pulse {
      position:absolute; inset:-8px; border-radius:50%;
      background:radial-gradient(circle,rgba(99,102,241,0.2),transparent);
      animation:pulse 2s ease-in-out infinite;
    }
    @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.15);opacity:0.5} }
    .drop-zone-content h3  { font-size:18px; font-weight:700; margin:0 0 6px; }
    .drop-zone-content p   { color:#888; margin:0 0 8px; font-size:14px; }
    .drop-zone-content small { color:#aaa; font-size:12px; }
    .btn-scan-upload {
      background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
      border:none; border-radius:12px; padding:12px 28px;
      font-size:15px; font-weight:600; cursor:pointer;
      transition:transform 0.15s,box-shadow 0.15s;
      box-shadow:0 4px 16px rgba(99,102,241,0.3);
    }
    .btn-scan-upload:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(99,102,241,0.4); }

    /* Preview strip */
    #preview-strip {
      display:flex; align-items:center; gap:16px;
      padding:16px 20px; border-top:1px solid rgba(255,255,255,0.06);
      background:rgba(99,102,241,0.04);
    }
    #preview-img { width:72px; height:72px; object-fit:cover; border-radius:10px; border:2px solid rgba(99,102,241,0.3); }
    .preview-info { flex:1; display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
    #preview-name { font-size:13px; color:#aaa; flex:1; word-break:break-all; }
    .btn-do-scan {
      background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
      border:none; border-radius:10px; padding:10px 20px;
      font-size:14px; font-weight:700; cursor:pointer;
      box-shadow:0 4px 14px rgba(99,102,241,0.35);
      transition:transform 0.15s;
    }
    .btn-do-scan:hover { transform:translateY(-2px); }

    /* Progress */
    .scan-progress-card { text-align:center; padding:40px 24px; }
    .scan-animation  { position:relative; display:inline-block; margin-bottom:20px; }
    .scan-icon  { font-size:48px; }
    .scan-beam  {
      position:absolute; top:0; left:-20px; right:-20px; height:3px;
      background:linear-gradient(90deg,transparent,#6366f1,transparent);
      animation:beam 1.5s ease-in-out infinite;
    }
    @keyframes beam { 0%,100%{top:0;opacity:0} 50%{top:100%;opacity:1} }
    .scan-status { font-size:16px; color:#888; margin-bottom:16px; }
    .scan-progress-bar-wrap { height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden; margin-bottom:20px; }
    .scan-progress-bar-fill { height:100%; width:0%; background:linear-gradient(90deg,#6366f1,#8b5cf6); border-radius:3px; transition:width 0.4s ease; }
    .scan-steps { display:flex; justify-content:center; gap:12px; flex-wrap:wrap; }
    .scan-step  { font-size:12px; padding:4px 10px; border-radius:20px; background:rgba(255,255,255,0.05); color:#666; transition:all 0.3s; }
    .scan-step.active { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; }

    /* Confidence */
    .scan-conf-card { margin-bottom:16px; }
    .conf-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
    .conf-label { font-size:14px; font-weight:600; }
    .conf-value { font-size:22px; font-weight:800; }
    .conf-bar-wrap { height:8px; background:rgba(255,255,255,0.08); border-radius:4px; overflow:hidden; }
    .conf-bar-fill { height:100%; border-radius:4px; transition:width 0.6s ease; }
    .conf-warn { margin-top:10px; font-size:13px; color:#ff9800; background:rgba(255,152,0,0.08); border-radius:8px; padding:8px 12px; }

    /* Sections */
    .scan-section-card { margin-bottom:16px; }
    .scan-section-header { display:flex; align-items:center; gap:10px; margin-bottom:20px; padding-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.08); }
    .scan-section-header h3 { margin:0; font-size:16px; font-weight:700; flex:1; }
    .edit-badge { font-size:11px; padding:3px 8px; border-radius:20px; background:rgba(99,102,241,0.15); color:#6366f1; font-weight:600; }
    .item-count-badge { font-size:13px; padding:2px 8px; border-radius:12px; background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; margin-left:8px; font-weight:700; }

    .scan-label { display:block; font-size:12px; color:#888; margin-bottom:6px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; }
    .scan-fields-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    @media(max-width:600px) { .scan-fields-grid { grid-template-columns:1fr; } }
    .scan-field-group label { display:block; font-size:12px; color:#888; margin-bottom:6px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; }
    .scan-input {
      width:100%; box-sizing:border-box; padding:10px 12px;
      border-radius:10px; border:1px solid rgba(255,255,255,0.1);
      background:rgba(255,255,255,0.05); color:inherit;
      font-size:14px; transition:border-color 0.2s,box-shadow 0.2s; outline:none;
    }
    .scan-input:focus { border-color:#6366f1; box-shadow:0 0 0 2px rgba(99,102,241,0.2); }
    select.scan-input { cursor:pointer; }

    /* Items table */
    .items-table-wrap { overflow-x:auto; margin-bottom:12px; }
    .items-table-header, .item-row {
      display:grid;
      grid-template-columns:2fr 1fr 1fr 0.7fr 0.7fr 0.7fr 0.7fr 36px;
      gap:6px; align-items:center; padding:6px 0;
    }
    .items-table-header { font-size:11px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:0.4px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:10px; margin-bottom:6px; }
    .item-row { border-bottom:1px solid rgba(255,255,255,0.04); }
    .item-row .scan-input { padding:7px 8px; font-size:13px; }
    .margin-display { font-size:13px; font-weight:700; text-align:center; }
    .btn-remove-row { background:rgba(244,67,54,0.12); border:none; border-radius:8px; color:#f44336; cursor:pointer; padding:6px; font-size:14px; transition:background 0.2s; }
    .btn-remove-row:hover { background:rgba(244,67,54,0.25); }
    .btn-add-row { background:rgba(99,102,241,0.1); border:1px dashed rgba(99,102,241,0.3); color:#6366f1; border-radius:10px; padding:10px 18px; font-size:13px; font-weight:600; cursor:pointer; width:100%; margin-top:8px; transition:background 0.2s; }
    .btn-add-row:hover { background:rgba(99,102,241,0.2); }
    .no-items-msg { display:flex; align-items:center; gap:10px; padding:12px; background:rgba(255,152,0,0.08); border-radius:10px; color:#ff9800; margin-bottom:16px; font-size:14px; }

    /* Action bar */
    .scan-action-bar { display:flex; gap:12px; margin-top:20px; flex-wrap:wrap; }
    .btn-save-all {
      flex:1; padding:14px 24px; border:none; border-radius:14px;
      background:linear-gradient(135deg,#6366f1,#8b5cf6);
      color:#fff; font-size:16px; font-weight:700; cursor:pointer;
      display:flex; align-items:center; justify-content:center; gap:8px;
      box-shadow:0 4px 20px rgba(99,102,241,0.35);
      transition:transform 0.15s,box-shadow 0.15s;
    }
    .btn-save-all:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 28px rgba(99,102,241,0.5); }
    .btn-save-all:disabled { opacity:0.7; cursor:not-allowed; }
    .btn-scan-again { padding:14px 24px; border:1px solid rgba(255,255,255,0.1); border-radius:14px; background:rgba(255,255,255,0.05); color:inherit; font-size:15px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:8px; transition:background 0.2s; }
    .btn-scan-again:hover { background:rgba(255,255,255,0.1); }

    /* History */
    .history-header { display:flex; align-items:center; gap:10px; margin-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:14px; }
    .history-header h3 { margin:0; font-size:16px; font-weight:700; flex:1; }
    .history-row { display:flex; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.05); }
    .history-row:last-child { border-bottom:none; }
    .hr-left { display:flex; align-items:center; gap:12px; flex:1; min-width:0; }
    .hr-icon { font-size:24px; }
    .hr-title { font-size:14px; font-weight:700; }
    .hr-sub   { font-size:12px; color:#888; margin-top:2px; }
    .hr-right { text-align:right; }
    .hr-amount { display:block; font-size:16px; font-weight:800; color:#6366f1; }
    .hr-items  { font-size:11px; color:#888; }
    .no-history { text-align:center; padding:40px 20px; color:#888; font-size:15px; }
    .no-history span { font-size:40px; display:block; margin-bottom:10px; }

    /* Scan error state */
    .scan-error-card { text-align:center; padding:40px 24px; }
    .scan-error-icon { font-size:56px; margin-bottom:16px; display:block; }
    .scan-error-title { font-size:20px; font-weight:700; margin:0 0 10px; color:#f87171; }
    .scan-error-msg { font-size:14px; color:#94a3b8; margin:0 0 24px; line-height:1.6; }
    .scan-error-tips { display:flex; flex-direction:column; gap:8px; margin-bottom:20px; text-align:left; }
    .scan-error-tips .tip { display:flex; align-items:center; gap:10px; font-size:13px; color:#64748b;
      background:rgba(255,255,255,0.03); border-radius:8px; padding:10px 12px; }
    .scan-error-tips .tip span { font-size:18px; flex-shrink:0; }
  `;
  document.head.appendChild(style);
}

