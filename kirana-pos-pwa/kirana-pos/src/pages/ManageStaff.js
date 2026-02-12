import { renderLayout } from "../components/Layout";
import { getAllUsers, saveUser } from "../services/db";
import { ROLES } from "../auth/roles";
import { showToast } from "../utils/toast";
import { changeStaffSalary, softDeleteStaff } from "../services/payroll";
import { getCurrentUser } from "../auth/authService";



export async function renderManageStaff(container) {

  const users = await getAllUsers();
  const currentUser = await getCurrentUser();

  // Only show staff who are not deleted
  const activeStaff = users.filter(
    u => u.role !== ROLES.OWNER && u.isActive !== false && !u.isDeleted
  );

  const pastStaff = users.filter(
    u => u.role !== ROLES.OWNER && (u.isActive === false || u.isDeleted)
  );

  function renderStaffList(list, showActions = true) {
    if (list.length === 0) return "<p>No records.</p>";

    return list
      .map(
        u => `
      <div class="card ledger-row">
        <div>
          <strong>${u.name}</strong>
          <p>Username: ${u.username}</p>
          <p>Role: ${u.role}</p>
          <p>Joined: ${u.joinDate || "N/A"}</p>
          <p>Salary: ₹${u.baseSalary || 0}</p>
          ${u.leftDate ? `<p>Left On: ${u.leftDate}</p>` : ""}
        </div>

        ${
          showActions
            ? `
          <div style="margin-top:10px">
            <input id="salary-${u.id}" placeholder="New Salary" />
            <button data-salary="${u.id}">Change Salary</button>

            <button data-remove="${u.id}">
              Mark as Left
            </button>

            <button data-delete="${u.id}">
              Delete
            </button>

            <button data-history="${u.id}">
              View History
            </button>
          </div>
        `
            : `
            <div style="margin-top:10px">
              <button data-history="${u.id}">
                View History
              </button>
            </div>
        `
        }
      </div>
    `
      )
      .join("");
  }

  const content = `
    <section class="dashboard">
      <h1>Manage Staff</h1>

      <div class="card">
        <h3>Create Staff Account</h3>

        <input id="staff-name" placeholder="Full Name" />
        <input id="staff-username" placeholder="Username" />
        <input id="staff-password" type="password" placeholder="Password" />

        <input id="staff-joindate" type="date" />

        <input id="staff-salary" type="number" placeholder="Monthly Salary" />

        <select id="staff-role">
          <option value="cashier">Cashier</option>
          <option value="manager">Manager</option>
        </select>

        <button id="create-staff" class="btn-primary">
          Create Staff
        </button>
      </div>

      <div style="margin-top:20px">
        <h3>Active Staff</h3>
        ${renderStaffList(activeStaff, true)}
      </div>

      <div style="margin-top:20px">
        <h3>Past Staff</h3>
        ${renderStaffList(pastStaff, false)}
      </div>

    </section>
  `;

  container.innerHTML = renderLayout(content);

  // ===== CREATE STAFF =====

  document.getElementById("create-staff").onclick = async () => {
    const name = document.getElementById("staff-name").value.trim();
    const username = document.getElementById("staff-username").value.trim();
    const password = document.getElementById("staff-password").value.trim();
    const role = document.getElementById("staff-role").value;
    const joinDate = document.getElementById("staff-joindate").value;
    const salary = document.getElementById("staff-salary").value;

    if (!name || !username || !password || !joinDate || !salary) {
      showToast("All fields required", "error");
      return;
    }

    const hashed = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(password)
    );

    const hashString = Array.from(new Uint8Array(hashed))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    await saveUser({
      id: crypto.randomUUID(),
      name,
      username,
      password: hashString,
      role,
      joinDate,
      baseSalary: Number(salary),
      isActive: true,
      isDeleted: false,
      createdAt: Date.now()
    });

    showToast("Staff created successfully", "success");

    renderManageStaff(container);
  };

  // ===== CHANGE SALARY =====

  document.querySelectorAll("[data-salary]").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.salary;

      const newSalary = document.getElementById(`salary-${id}`).value;

      if (!newSalary) {
        showToast("Enter new salary", "error");
        return;
      }

      const staff = users.find(u => u.id === id);

      await changeStaffSalary(staff, newSalary, "Owner update", currentUser);

      await saveUser(staff);

      showToast("Salary updated", "success");

      renderManageStaff(container);
    };
  });

  // ===== MARK AS LEFT =====

  document.querySelectorAll("[data-remove]").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.remove;

      const staff = users.find(u => u.id === id);

      staff.isActive = false;
      staff.leftDate = new Date().toISOString().split("T")[0];

      await saveUser(staff);

      showToast("Staff marked as left", "success");

      renderManageStaff(container);
    };
  });

  // ===== SOFT DELETE STAFF =====

  document.querySelectorAll("[data-delete]").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.delete;

      const staff = users.find(u => u.id === id);

      await softDeleteStaff(staff, currentUser);

      showToast("Staff deleted successfully", "success");

      renderManageStaff(container);
    };
  });

  // ===== VIEW HISTORY =====

  document.querySelectorAll("[data-history]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.history;
      location.hash = `staff-history?id=${id}`;
    };
  });
}
