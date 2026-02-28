import { renderLayout } from "../components/Layout";
import { openDB } from "../services/db";

export async function renderAuditLog(container) {

  const db = await openDB();

  const logs = await new Promise(resolve => {
    const tx = db.transaction("audit_logs", "readonly");
    const store = tx.objectStore("audit_logs");
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });

  logs.sort((a,b) => b.timestamp - a.timestamp);

  const content = `
    <section class="dashboard">
      <h1>System Audit Log</h1>

      ${
        logs.length === 0
          ? "<p>No activity recorded.</p>"
          : logs.map(l => `
              <div class="card ledger-row">
                <div>
                  <strong>${l.actorName}</strong>
                  <small>(${l.actorRole})</small>
                  <p>${l.action}</p>
                  <p>Module: ${l.module}</p>
                  <small>${l.date}</small>
                </div>
              </div>
            `).join("")
      }
    </section>
  `;

  // ✅ THIS IS THE CRITICAL FIX
  container.innerHTML = await renderLayout(content);
}