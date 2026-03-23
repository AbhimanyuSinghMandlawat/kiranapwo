import { createOwnerAccount, login, getCurrentUser, logout } from "./authService";
import { navigate } from "../app";

/* ===============================
   OWNER SETUP  (first login – collects email + mobile)
=============================== */
export function renderOwnerSetup(container) {
  container.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-logo">🏪</div>
        <h2>Welcome to Kirana POS</h2>
        <p style="color:#888;font-size:14px;margin-bottom:20px">Set up your owner account to get started</p>

        <input id="name"     placeholder="Your Full Name"   autocomplete="name" />
        <input id="username" placeholder="Username (for login)" autocomplete="username" />
        <input id="password" type="password" placeholder="Password" autocomplete="new-password" />

        <div class="auth-divider">Contact Details <small style="color:#888">(for notifications)</small></div>

        <input id="email"  type="email" placeholder="Email Address (for daily summary)" />
        <input id="mobile" type="tel"   placeholder="Mobile Number (WhatsApp notifications)" />

        <button id="createOwner" class="btn-primary full-width" style="margin-top:16px">
          ✅ Create Owner Account
        </button>
        <div id="msg" class="auth-msg"></div>
      </div>
    </div>
  `;

  document.getElementById("createOwner").onclick = async () => {
    const btn = document.getElementById("createOwner");
    btn.disabled = true;
    btn.textContent = "Creating...";
    try {
      await createOwnerAccount({
        name:     document.getElementById("name").value.trim(),
        username: document.getElementById("username").value.trim(),
        password: document.getElementById("password").value,
        email:    document.getElementById("email").value.trim()   || null,
        mobile:   document.getElementById("mobile").value.trim()  || null
      });
      document.getElementById("msg").innerHTML =
        "<span style='color:#4caf50'>✅ Account created! Please log in.</span>";
      setTimeout(() => navigate("login"), 1200);
    } catch (e) {
      document.getElementById("msg").innerHTML =
        `<span style='color:#e57373'>❌ ${e.message}</span>`;
    } finally {
      btn.disabled = false;
      btn.textContent = "✅ Create Owner Account";
    }
  };
}

/* ===============================
   LOGIN PAGE
=============================== */
export function renderLogin(container) {
  container.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-logo">🏪</div>
        <h2>Kirana POS Login</h2>

        <input id="username" placeholder="Username" autocomplete="username" />
        <input id="password" type="password" placeholder="Password" autocomplete="current-password" />

        <button id="loginBtn" class="btn-primary full-width" style="margin-top:16px">
          🔐 Login
        </button>
        <div id="msg" class="auth-msg"></div>
      </div>
    </div>
  `;

  const handleLogin = async () => {
    const btn = document.getElementById("loginBtn");
    btn.disabled = true;
    btn.textContent = "Logging in...";
    try {
      await login(
        document.getElementById("username").value.trim(),
        document.getElementById("password").value
      );
      navigate("dashboard");
    } catch (e) {
      document.getElementById("msg").innerHTML =
        `<span style='color:#e57373'>❌ ${e.message}</span>`;
    } finally {
      btn.disabled = false;
      btn.textContent = "🔐 Login";
    }
  };

  document.getElementById("loginBtn").onclick = handleLogin;

  // Allow pressing Enter key
  document.getElementById("password").addEventListener("keydown", e => {
    if (e.key === "Enter") handleLogin();
  });
}

/* ===============================
   LOGOUT HELPER
=============================== */
export async function renderLogout(container) {
  container.innerHTML = `<button id="logoutBtn" class="btn-secondary">Logout</button>`;
  document.getElementById("logoutBtn").onclick = async () => {
    await logout();
    window.location.hash = "#login";
  };
}
