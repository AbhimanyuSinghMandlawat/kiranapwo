import { openDB } from "../services/db";
import { getCurrentUser } from "../auth/authService";

/* ── Module colours & icons ─────────────────────────── */
const MODULE_META = {
  sale:    { icon: "🛒", label: "Sales",     cls: "mod-sale"    },
  sales:   { icon: "🛒", label: "Sales",     cls: "mod-sales"   },
  stock:   { icon: "📦", label: "Stock",     cls: "mod-stock"   },
  auth:    { icon: "🔐", label: "Auth",      cls: "mod-auth"    },
  default: { icon: "📝", label: "System",    cls: "mod-default" }
};

/* ── Friendly action labels ─────────────────────────── */
const ACTION_LABEL = {
  SALE:             "Sale Completed",
  SALE_CREATED:     "Sale Created",
  CREDIT_GIVEN:     "Credit Given",
  SETTLEMENT:       "Settlement Recorded",
  NEW_ITEM:         "Stock Item Added",
  ADD_STOCK:        "Stock Quantity Updated",
  DELETE_ITEM:      "Stock Item Removed",
  USER_LOGIN:       "User Logged In",
  SALE_MANUALLY:    "Quick Amount Sale"
};

/* ── Role pill colours ──────────────────────────────── */
function rolePill(role) {
  const cls =
    role === "owner"   ? "role-owner"   :
    role === "manager" ? "role-manager" :
    role === "cashier" ? "role-cashier" : "role-system";
  return `<span class="audit-role-pill ${cls}">${role || "system"}</span>`;
}

/* ── Build one audit card ───────────────────────────── */
function buildCard(log) {
  const mod     = MODULE_META[log.module] || MODULE_META.default;
  const label   = ACTION_LABEL[log.action] || log.action || "Action";
  const meta    = log.metadata || {};
  const time    = log.timestamp
    ? new Date(log.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";
  const actor   = log.actorName || "System";
  const role    = log.actorRole  || "system";

  /* ── Detail chips by module ── */
  let detailHtml = "";

  if (log.module === "sale" || log.module === "sales") {
    const items    = meta.items || [];
    const amount   = meta.amount   || meta.total   || null;
    const payment  = meta.payment  || meta.paymentMethod || null;
    const customer = meta.customer || meta.customerName  || null;

    const itemTagsHtml = items.length > 0
      ? `<div class="audit-detail-chip" style="grid-column:1/-1">
           <label>Items</label>
           <div class="audit-items-list">
             ${items.map(i => `<span class="audit-item-tag">${i.name} ×${i.qty || i.quantity || 1}</span>`).join("")}
           </div>
         </div>`
      : "";

    detailHtml = `
      ${itemTagsHtml}
      ${amount  != null ? `<div class="audit-detail-chip audit-amount-chip"><label>Total</label><span>₹${Number(amount).toLocaleString("en-IN")}</span></div>` : ""}
      ${payment  ? `<div class="audit-detail-chip audit-payment-chip"><label>Payment</label><span>${String(payment).toUpperCase()}</span></div>` : ""}
      ${customer ? `<div class="audit-detail-chip"><label>Customer</label><span>${customer}</span></div>` : ""}
    `;
  }

  if (log.module === "stock") {
    const item   = meta.item   || meta.name   || null;
    const added  = meta.added  ?? null;
    const before = meta.before ?? null;
    const after  = meta.after  ?? null;
    const bill   = meta.billNumber || null;
    const mode   = meta.mode       || null;

    detailHtml = `
      ${item  ? `<div class="audit-detail-chip"><label>Item</label><span>${item}</span></div>` : ""}
      ${added != null ? `<div class="audit-detail-chip audit-amount-chip"><label>Qty Added</label><span>+${added} <small style="color:#9ca3af">(${before} → ${after})</small></span></div>` : ""}
      ${bill  ? `<div class="audit-detail-chip"><label>Bill #</label><span>${bill}</span></div>` : ""}
      ${mode  ? `<div class="audit-detail-chip"><label>Mode</label><span>${mode}</span></div>` : ""}
    `;
  }

  if (log.module === "auth") {
    const username = meta.username || null;
    detailHtml = username
      ? `<div class="audit-detail-chip"><label>Username</label><span>${username}</span></div>`
      : "";
  }

  return `
    <div class="audit-card" data-module="${log.module || "default"}">
      <div class="audit-card-header">

        <div class="audit-icon-wrap ${mod.cls}">
          ${mod.icon}
        </div>

        <div class="audit-main">
          <p class="audit-action">${label}</p>
          <div class="audit-actor-row">
            <span class="audit-actor-name">${actor}</span>
            ${rolePill(role)}
          </div>
        </div>

        <span class="audit-time">${time}</span>
      </div>

      ${detailHtml.trim()
        ? `<div class="audit-detail">${detailHtml}</div>`
        : ""}
    </div>
  `;
}

/* ── Build grouped HTML ─────────────────────────────── */
function buildGroupedHtml(logs) {
  if (logs.length === 0) return `
    <div class="audit-empty">
      <div class="audit-empty-icon">📋</div>
      <h3>No activity recorded yet</h3>
      <p>Logs will appear here as you use the system</p>
    </div>`;

  const byDate = {};
  for (const log of logs) {
    const d = log.date || new Date(log.timestamp).toLocaleDateString("en-IN");
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(log);
  }

  return Object.keys(byDate)
    .sort((a, b) => new Date(b) - new Date(a))
    .map(date => `
      <div class="audit-date-group">
        <div class="audit-date-header">${date}</div>
        ${byDate[date].map(buildCard).join("")}
      </div>
    `).join("");
}

/* ── MAIN RENDER ────────────────────────────────────── */
export async function renderAuditLog(container) {

  const user = await getCurrentUser();

  /* Owner-only guard */
  if (!user || user.role !== "owner") {
    document.querySelector(".main-content").innerHTML = `
      <section class="dashboard">
        <div class="glass-card" style="text-align:center;padding:40px">
          <div style="font-size:3rem;margin-bottom:16px">🔒</div>
          <h2>Access Denied</h2>
          <p>Only the <strong>Owner</strong> can view Audit Logs.</p>
        </div>
      </section>`;
    return;
  }

  /* Load from IndexedDB */
  const db   = await openDB();
  const logs = await new Promise(resolve => {
    const tx  = db.transaction("audit_logs", "readonly");
    const req = tx.objectStore("audit_logs").getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror   = () => resolve([]);
  });

  logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  /* ── Stat counts ── */
  const totalLogs    = logs.length;
  const saleLogs     = logs.filter(l => l.module === "sale" || l.module === "sales").length;
  const stockLogs    = logs.filter(l => l.module === "stock").length;
  const authLogs     = logs.filter(l => l.module === "auth").length;

  const content = `
    <section class="dashboard">

      <div class="audit-header">
        <h1>📜 Audit Log</h1>
        <span class="badge badge-owner">Owner Only</span>
      </div>

      <!-- Stats bar -->
      <div class="audit-stats-bar">
        <div class="audit-stat-card">
          <div class="audit-stat-icon">📋</div>
          <div class="audit-stat-info">
            <p>Total Logs</p>
            <strong>${totalLogs}</strong>
          </div>
        </div>
        <div class="audit-stat-card">
          <div class="audit-stat-icon">🛒</div>
          <div class="audit-stat-info">
            <p>Sales</p>
            <strong>${saleLogs}</strong>
          </div>
        </div>
        <div class="audit-stat-card">
          <div class="audit-stat-icon">📦</div>
          <div class="audit-stat-info">
            <p>Stock Actions</p>
            <strong>${stockLogs}</strong>
          </div>
        </div>
        <div class="audit-stat-card">
          <div class="audit-stat-icon">🔐</div>
          <div class="audit-stat-info">
            <p>Logins</p>
            <strong>${authLogs}</strong>
          </div>
        </div>
      </div>

      <!-- Filter bar -->
      <div class="audit-filter-bar">
        <input id="audit-search" placeholder="🔍 Search by action, user, amount..." />
        <select id="audit-module-filter">
          <option value="">All Modules</option>
          <option value="sale">Sales</option>
          <option value="stock">Stock</option>
          <option value="auth">Auth / Login</option>
          <option value="sales" style="display:none">Sales (alias)</option>
        </select>
      </div>

      <!-- Log body -->
      <div id="audit-log-body">
        ${buildGroupedHtml(logs)}
      </div>

    </section>
  `;

  document.querySelector(".main-content").innerHTML = content;

  /* ── Live filter ── */
  const searchInput  = document.getElementById("audit-search");
  const moduleFilter = document.getElementById("audit-module-filter");
  const body         = document.getElementById("audit-log-body");

  if (!searchInput || !body) return;

  function applyFilter() {
    const q   = (searchInput.value || "").toLowerCase().trim();
    const mod = moduleFilter?.value || "";

    const filtered = logs.filter(l => {
      const matchModule = !mod || l.module === mod || (mod === "sale" && l.module === "sales");
      const str = `${l.action} ${l.module} ${l.actorName} ${JSON.stringify(l.metadata || {})}`.toLowerCase();
      return matchModule && (!q || str.includes(q));
    });

    filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    body.innerHTML = buildGroupedHtml(filtered);
  }

  searchInput.addEventListener("input",  applyFilter);
  moduleFilter.addEventListener("change", applyFilter);
}