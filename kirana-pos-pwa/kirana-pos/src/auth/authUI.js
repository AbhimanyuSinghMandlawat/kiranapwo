import { createOwnerAccount, login, getCurrentUser, logout } from "./authService";
import { navigate } from "../app";


// Render Owner Registration Form
export function renderOwnerSetup(container) {
  container.innerHTML = `
    <div class="auth-container">
      <h2>Owner Setup</h2>
      <input id="name" placeholder="Owner Name" />
      <input id="username" placeholder="Username" />
      <input id="password" type="password" placeholder="Password" />
      <button id="createOwner">Create Account</button>
      <div id="msg"></div>
    </div>
  `;

  document.getElementById("createOwner").onclick = async () => {
    try {
      await createOwnerAccount({
        name: name.value,
        username: username.value,
        password: password.value
      });

      msg.innerHTML = "Owner account created. Please login.";
      navigate("login");

    } catch (e) {
      msg.innerHTML = e.message;
    }
  };
}

// Render Login Page
export function renderLogin(container) {
  container.innerHTML = `
    <div class="auth-container">
      <h2>Login</h2>
      <input id="username" placeholder="Username" />
      <input id="password" type="password" placeholder="Password" />
      <button id="loginBtn">Login</button>
      <div id="msg"></div>
    </div>
  `;

  document.getElementById("loginBtn").onclick = async () => {
    try {
      await login(username.value, password.value);
      navigate("dashboard");
    } catch (e) {
      msg.innerHTML = e.message;
    }
  };
}

// Logout UI helper
export async function renderLogout(container) {
  container.innerHTML = `
    <button id="logoutBtn">Logout</button>
  `;

  document.getElementById("logoutBtn").onclick = async () => {
    await logout();
    window.location.hash = "#login";
  };
}
