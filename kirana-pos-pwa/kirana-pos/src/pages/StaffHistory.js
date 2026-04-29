import { renderLayout } from "../components/Layout";
import { getStaffHistory } from "../services/staffHistory";
import { getAllUsers } from "../services/db";

export async function renderStaffHistory(container) {

  // Read staff id from URL hash
  const params = new URLSearchParams(location.hash.split("?")[1]);
  const staffId = params.get("id");

  if (!staffId) {
    container.innerHTML = renderLayout("<p>No staff selected.</p>");
    return;
  }

  const users = await getAllUsers();
  const staff = users.find(u => u.id === staffId);

  const history = await getStaffHistory(staffId);

  const historyHtml = history
    .map(
      h => `
      <div class="card">
        <p><strong>Action:</strong> ${h.action}</p>
        <p><strong>By:</strong> ${h.changedBy}</p>
        <p><strong>Date:</strong> ${new Date(h.timestamp).toLocaleString()}</p>

        <p><strong>Old Value:</strong></p>
        <pre>${JSON.stringify(h.oldValue, null, 2)}</pre>

        <p><strong>New Value:</strong></p>
        <pre>${JSON.stringify(h.newValue, null, 2)}</pre>
      </div>
    `
    )
    .join("");

  const content = `
    <section class="dashboard">
      <h2>History for: ${staff?.name || "Unknown Staff"}</h2>

      <div style="margin-bottom:15px">
        <button onclick="location.hash='manage-staff'">
          ← Back to Manage Staff
        </button>
      </div>

      ${historyHtml || "<p>No history found</p>"}
    </section>
  `;

  document.querySelector(".main-content").innerHTML = content;
}
