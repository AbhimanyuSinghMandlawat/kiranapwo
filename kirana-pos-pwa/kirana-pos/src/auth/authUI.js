import { createOwnerAccount, login, getCurrentUser, logout } from "./authService";
import { navigate } from "../app";
import { isOnboardingCompleted } from "../services/db";

/* ================================================================
   OWNER SETUP — Full registration with WebAuthn biometric support
================================================================ */
export function renderOwnerSetup(container) {
  container.innerHTML = `
    <div class="auth-page">
      <div class="auth-bg">
        <div class="auth-blob auth-blob-1"></div>
        <div class="auth-blob auth-blob-2"></div>
      </div>

      <div class="auth-card">
        <div class="auth-brand">
          <div class="auth-brand-icon">🏪</div>
          <h1 class="auth-brand-title">Register Your Shop</h1>
          <p class="auth-brand-sub">Set up your Kirana POS in under a minute</p>
        </div>

        <div class="auth-form" id="setup-form">

          <div class="auth-section-label">Owner Details</div>

          <div class="auth-field">
            <label for="reg-name">Full Name <span class="req">*</span></label>
            <input id="reg-name" type="text" placeholder="e.g. Ramesh Kumar" autocomplete="name" />
          </div>

          <div class="auth-field">
            <label for="reg-phone">Phone Number <span class="req">*</span></label>
            <div class="auth-input-prefix">
              <span class="prefix">🇮🇳 +91</span>
              <input id="reg-phone" type="tel" placeholder="10-digit mobile" maxlength="10"
                     autocomplete="tel" inputmode="numeric" />
            </div>
            <small class="field-hint">This is your login identity</small>
          </div>

          <div class="auth-field">
            <label for="reg-email">Email <span class="opt">(optional)</span></label>
            <input id="reg-email" type="email" placeholder="For daily summaries & alerts" autocomplete="email" />
          </div>

          <div class="auth-section-label" style="margin-top:20px">Shop Details</div>

          <div class="auth-field">
            <label for="reg-shop">Shop Name <span class="req">*</span></label>
            <input id="reg-shop" type="text" placeholder="e.g. Ramesh General Store" />
          </div>

          <div class="auth-section-label" style="margin-top:20px">Security</div>

          <div class="auth-field">
            <label for="reg-password">Password <span class="req">*</span></label>
            <div class="auth-input-eye">
              <input id="reg-password" type="password" placeholder="Min 6 characters"
                     autocomplete="new-password" />
              <button type="button" id="toggle-pw" class="eye-btn" title="Toggle visibility">👁</button>
            </div>
          </div>

          <div class="auth-field">
            <label for="reg-password2">Confirm Password <span class="req">*</span></label>
            <input id="reg-password2" type="password" placeholder="Repeat password"
                   autocomplete="new-password" />
          </div>

          <!-- Biometric toggle -->
          <div class="biometric-toggle" id="biometric-section" style="display:none">
            <div class="biometric-row">
              <div>
                <div class="biometric-label">🔑 Enable Fingerprint Login</div>
                <div class="biometric-sub">Use fingerprint as quick login (optional)</div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="enable-biometric" />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div id="setup-msg" class="auth-msg"></div>

          <button id="createOwner" class="auth-btn auth-btn-primary">
            <span id="setup-btn-text">✅ Create My Shop</span>
            <span id="setup-spinner" class="btn-spinner" style="display:none">⏳</span>
          </button>

          <div class="auth-footer-links">
            Already registered? <a href="#" data-page="login">Sign In →</a>
          </div>

        </div>
      </div>

      <style id="auth-styles">
        ${authStyles()}
        /* Biometric toggle */
        .biometric-toggle { background:rgba(99,102,241,0.06); border:1px solid rgba(99,102,241,0.2); border-radius:12px; padding:14px 16px; margin-bottom:8px; }
        .biometric-row { display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .biometric-label { font-size:14px; font-weight:600; color:#c7d2fe; }
        .biometric-sub { font-size:12px; color:#64748b; margin-top:2px; }
        .toggle-switch { position:relative; display:inline-block; width:44px; height:24px; flex-shrink:0; }
        .toggle-switch input { opacity:0; width:0; height:0; }
        .toggle-slider { position:absolute; inset:0; background:#1e293b; border-radius:24px; cursor:pointer; transition:0.2s; border:1px solid rgba(255,255,255,0.1); }
        .toggle-slider:before { content:""; position:absolute; height:18px; width:18px; left:2px; bottom:2px; background:#64748b; border-radius:50%; transition:0.2s; }
        .toggle-switch input:checked + .toggle-slider { background:rgba(99,102,241,0.3); }
        .toggle-switch input:checked + .toggle-slider:before { transform:translateX(20px); background:#6366f1; }
      </style>
    </div>
  `;

  // Show biometric section if WebAuthn is supported
  if (window.PublicKeyCredential) {
    document.getElementById("biometric-section").style.display = "block";
  }

  // Password visibility toggle
  document.getElementById("toggle-pw").onclick = () => {
    const pw = document.getElementById("reg-password");
    pw.type = pw.type === "password" ? "text" : "password";
  };

  // Auto-format phone
  document.getElementById("reg-phone").addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
  });

  document.getElementById("createOwner").onclick = async () => {
    const btn      = document.getElementById("createOwner");
    const msgEl    = document.getElementById("setup-msg");
    const spinner  = document.getElementById("setup-spinner");
    const btnText  = document.getElementById("setup-btn-text");

    const name      = document.getElementById("reg-name").value.trim();
    const phone     = document.getElementById("reg-phone").value.trim();
    const email     = document.getElementById("reg-email").value.trim();
    const shopName  = document.getElementById("reg-shop").value.trim();
    const password  = document.getElementById("reg-password").value;
    const password2 = document.getElementById("reg-password2").value;
    const wantBio   = document.getElementById("enable-biometric")?.checked || false;

    msgEl.innerHTML = "";

    // Validation
    if (!name)              return showMsg(msgEl, "❌ Owner name is required");
    if (!/^\d{10}$/.test(phone)) return showMsg(msgEl, "❌ Enter a valid 10-digit phone number");
    if (!shopName)          return showMsg(msgEl, "❌ Shop name is required");
    if (password.length < 6) return showMsg(msgEl, "❌ Password must be at least 6 characters");
    if (password !== password2) return showMsg(msgEl, "❌ Passwords do not match");

    btn.disabled = true;
    spinner.style.display = "inline";
    btnText.textContent = "Creating shop...";

    try {
      // username = phone number (primary identity)
      await createOwnerAccount({
        name,
        username: phone,          // phone is primary login identity
        password,
        phone,
        email:    email || null,
        shopName: shopName || null
      });

      // WebAuthn biometric registration (optional, non-blocking)
      if (wantBio && window.PublicKeyCredential) {
        try {
          await registerBiometric(phone);
          showMsg(msgEl, "✅ Shop created! Fingerprint registered. Logging you in...", "success");
        } catch {
          showMsg(msgEl, "✅ Shop created! (Fingerprint skipped — try later). Logging you in...", "success");
        }
      } else {
        showMsg(msgEl, "✅ Shop created! Redirecting to login...", "success");
      }

      setTimeout(() => navigate("login"), 1400);
    } catch (e) {
      showMsg(msgEl, `❌ ${e.message}`);
    } finally {
      btn.disabled = false;
      spinner.style.display = "none";
      btnText.textContent = "✅ Create My Shop";
    }
  };
}

/* ── WebAuthn registration helper ── */
async function registerBiometric(phone) {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp:   { name: "Kirana POS", id: location.hostname },
      user: {
        id:          new TextEncoder().encode(phone),
        name:        phone,
        displayName: "Shop Owner"
      },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }],
      timeout:          60000,
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required"
      }
    }
  });

  if (credential) {
    // Store only credential ID (not biometric data itself)
    localStorage.setItem("bio_cred_id", btoa(String.fromCharCode(...new Uint8Array(credential.rawId))));
    localStorage.setItem("bio_username", phone);
  }
}

/* ── WebAuthn authentication helper (called from login) ── */
export async function authenticateWithBiometric() {
  const credIdB64 = localStorage.getItem("bio_cred_id");
  if (!credIdB64) throw new Error("No fingerprint registered");

  const credIdBytes = Uint8Array.from(atob(credIdB64), c => c.charCodeAt(0));
  const challenge   = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{ type: "public-key", id: credIdBytes }],
      userVerification: "required",
      timeout: 60000
    }
  });

  if (!assertion) throw new Error("Biometric authentication failed");
  return localStorage.getItem("bio_username");
}

function showMsg(el, text, type = "error") {
  el.innerHTML = `<span style="color:${type === "success" ? "#4ade80" : "#f87171"}">${text}</span>`;
}


/* ================================================================
   LOGIN PAGE — Premium dark, supports password + fingerprint
================================================================ */
export function renderLogin(container) {
  const hasBio = !!(localStorage.getItem("bio_cred_id") && window.PublicKeyCredential);

  container.innerHTML = `
    <div class="auth-page">
      <div class="auth-bg">
        <div class="auth-blob auth-blob-1"></div>
        <div class="auth-blob auth-blob-2"></div>
      </div>

      <div class="auth-card">
        <div class="auth-brand">
          <div class="auth-brand-icon">🔐</div>
          <h1 class="auth-brand-title">Welcome Back</h1>
          <p class="auth-brand-sub">Sign in to your Kirana POS</p>
        </div>

        <div class="auth-form">

          <div class="auth-field">
            <label for="l-username">Phone Number / Username</label>
            <div class="auth-input-prefix">
              <span class="prefix">📱</span>
              <input id="l-username" type="text" placeholder="Phone or username"
                     autocomplete="username" inputmode="numeric" />
            </div>
          </div>

          <div class="auth-field">
            <label for="l-password">Password</label>
            <div class="auth-input-eye">
              <input id="l-password" type="password" placeholder="Your password"
                     autocomplete="current-password" />
              <button type="button" id="l-toggle-pw" class="eye-btn" title="Show/hide">👁</button>
            </div>
          </div>

          <div id="login-msg" class="auth-msg"></div>

          <button id="loginBtn" class="auth-btn auth-btn-primary">
            🔐 Sign In
          </button>

          ${hasBio ? `
          <button id="bioBtn" class="auth-btn auth-btn-bio">
            🔑 Use Fingerprint Login
          </button>
          ` : ""}

          <div class="auth-footer-links">
            New shop? <a href="#" data-page="owner-setup">Register here →</a>
            &nbsp;|&nbsp;
            <a href="#" data-page="customer-login">Customer Login</a>
          </div>

        </div>
      </div>

      <style id="auth-styles">${authStyles()}</style>
    </div>
  `;

  // Password eye toggle
  document.getElementById("l-toggle-pw").onclick = () => {
    const pw = document.getElementById("l-password");
    pw.type = pw.type === "password" ? "text" : "password";
  };

  const handleLogin = async () => {
    const btn    = document.getElementById("loginBtn");
    const msgEl  = document.getElementById("login-msg");
    const uname  = document.getElementById("l-username").value.trim();
    const pass   = document.getElementById("l-password").value;

    if (!uname) return showMsg(msgEl, "❌ Please enter your phone number or username");
    if (!pass)  return showMsg(msgEl, "❌ Please enter your password");

    btn.disabled    = true;
    btn.textContent = "Signing in...";
    msgEl.innerHTML = "";

    try {
      const user = await login(uname, pass);
      const onboarded = await isOnboardingCompleted();
      navigate(!onboarded && user.role !== "customer" ? "opening-stock" : "dashboard");
    } catch (e) {
      showMsg(msgEl, `❌ ${e.message}`);
    } finally {
      btn.disabled    = false;
      btn.textContent = "🔐 Sign In";
    }
  };

  document.getElementById("loginBtn").onclick = handleLogin;
  document.getElementById("l-password").addEventListener("keydown", e => {
    if (e.key === "Enter") handleLogin();
  });
  document.getElementById("l-username").addEventListener("keydown", e => {
    if (e.key === "Enter") document.getElementById("l-password").focus();
  });

  // Biometric login
  if (hasBio) {
    document.getElementById("bioBtn").onclick = async () => {
      const btn   = document.getElementById("bioBtn");
      const msgEl = document.getElementById("login-msg");
      btn.disabled = true;
      btn.textContent = "Verifying fingerprint...";
      try {
        const { authenticateWithBiometric } = await import("./authUI.js");
        const phone = await authenticateWithBiometric();
        // Need stored password hash — prompt fallback
        showMsg(msgEl, "✅ Fingerprint verified! Enter your password to complete sign in.", "success");
        document.getElementById("l-username").value = phone;
        document.getElementById("l-password").focus();
      } catch (e) {
        showMsg(msgEl, `❌ Fingerprint failed: ${e.message}`);
      } finally {
        btn.disabled = false;
        btn.textContent = "🔑 Use Fingerprint Login";
      }
    };
  }
}


/* ================================================================
   LOGOUT HELPER
================================================================ */
export async function renderLogout(container) {
  container.innerHTML = `<button id="logoutBtn" class="auth-btn auth-btn-secondary">Logout</button>`;
  document.getElementById("logoutBtn").onclick = async () => {
    const { logout } = await import("./authService.js");
    await logout();
    window.location.hash = "#login";
  };
}


/* ================================================================
   SHARED STYLES (injected once)
================================================================ */
function authStyles() {
  return `
    .auth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #080F1E;
      position: relative;
      overflow: hidden;
      padding: 20px;
    }
    .auth-bg { position:absolute; inset:0; pointer-events:none; }
    .auth-blob { position:absolute; border-radius:50%; filter:blur(90px); opacity:0.15; }
    .auth-blob-1 { width:500px;height:500px;background:radial-gradient(circle,#22c55e,#16a34a);top:-150px;left:-150px; }
    .auth-blob-2 { width:400px;height:400px;background:radial-gradient(circle,#6366f1,#4f46e5);bottom:-120px;right:-120px; }

    .auth-card {
      position: relative;
      z-index: 2;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.09);
      border-radius: 24px;
      padding: 40px 36px;
      width: 100%;
      max-width: 440px;
      backdrop-filter: blur(20px);
      box-shadow: 0 24px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06);
    }

    .auth-brand { text-align:center; margin-bottom:28px; }
    .auth-brand-icon { font-size:48px; margin-bottom:12px; display:block; }
    .auth-brand-title { font-size:26px; font-weight:800; letter-spacing:-0.6px; margin:0 0 6px;
      background:linear-gradient(135deg,#e5e7eb,#22c55e);-webkit-background-clip:text;
      -webkit-text-fill-color:transparent;background-clip:text; }
    .auth-brand-sub { font-size:14px; color:#64748b; margin:0; }

    .auth-section-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px;
      color:#475569; margin-bottom:10px; padding-top:4px; }

    .auth-form { display:flex; flex-direction:column; gap:14px; }

    .auth-field { display:flex; flex-direction:column; gap:6px; }
    .auth-field label { font-size:13px; font-weight:600; color:#94a3b8; }
    .req { color:#f87171; }
    .opt { color:#475569; font-weight:400; font-size:11px; }
    .field-hint { font-size:11px; color:#475569; margin-top:2px; }

    .auth-field input {
      width:100%; box-sizing:border-box;
      padding:12px 14px;
      background:rgba(255,255,255,0.05);
      border:1px solid rgba(255,255,255,0.1);
      border-radius:12px;
      color:#e5e7eb;
      font-size:14px;
      font-family:inherit;
      outline:none;
      transition:border-color 0.18s, box-shadow 0.18s;
    }
    .auth-field input:focus {
      border-color:#22c55e;
      box-shadow:0 0 0 3px rgba(34,197,94,0.12);
    }
    .auth-field input::placeholder { color:#475569; }

    .auth-input-prefix {
      display:flex; align-items:center;
      background:rgba(255,255,255,0.05);
      border:1px solid rgba(255,255,255,0.1);
      border-radius:12px;
      overflow:hidden;
      transition:border-color 0.18s, box-shadow 0.18s;
    }
    .auth-input-prefix:focus-within {
      border-color:#22c55e;
      box-shadow:0 0 0 3px rgba(34,197,94,0.12);
    }
    .auth-input-prefix .prefix {
      padding:0 12px; font-size:13px; color:#64748b; white-space:nowrap;
      border-right:1px solid rgba(255,255,255,0.08); flex-shrink:0;
    }
    .auth-input-prefix input {
      border:none !important; border-radius:0 !important;
      background:transparent !important;
      box-shadow:none !important; flex:1;
    }

    .auth-input-eye {
      position:relative;
    }
    .auth-input-eye input { padding-right:44px; }
    .eye-btn {
      position:absolute; right:10px; top:50%; transform:translateY(-50%);
      background:none; border:none; cursor:pointer; font-size:16px;
      color:#64748b; padding:4px;
    }

    .auth-msg { min-height:20px; font-size:13px; text-align:center; }

    .auth-btn {
      width:100%; padding:14px;
      border:none; border-radius:14px;
      font-size:15px; font-weight:700;
      cursor:pointer;
      font-family:inherit;
      display:flex; align-items:center; justify-content:center; gap:8px;
      transition:transform 0.15s, box-shadow 0.15s, opacity 0.15s;
    }
    .auth-btn:disabled { opacity:0.65; cursor:not-allowed; transform:none !important; }
    .auth-btn:not(:disabled):hover { transform:translateY(-2px); }
    .auth-btn:not(:disabled):active { transform:translateY(0); }

    .auth-btn-primary {
      background:linear-gradient(135deg,#22c55e,#16a34a);
      color:#fff;
      box-shadow:0 4px 20px rgba(34,197,94,0.35);
    }
    .auth-btn-primary:not(:disabled):hover { box-shadow:0 8px 30px rgba(34,197,94,0.45); }

    .auth-btn-bio {
      background:rgba(99,102,241,0.12);
      color:#a5b4fc;
      border:1px solid rgba(99,102,241,0.25);
    }
    .auth-btn-bio:not(:disabled):hover { background:rgba(99,102,241,0.2); }

    .auth-btn-secondary {
      background:rgba(255,255,255,0.06);
      color:#94a3b8;
      border:1px solid rgba(255,255,255,0.1);
    }

    .btn-spinner { font-size:14px; }

    .auth-footer-links {
      text-align:center;
      font-size:13px;
      color:#475569;
      padding-top:4px;
    }
    .auth-footer-links a { color:#22c55e; font-weight:600; }
    .auth-footer-links a:hover { text-decoration:underline; }

    @media(max-width:480px) {
      .auth-card { padding:28px 20px; border-radius:18px; }
      .auth-brand-title { font-size:22px; }
    }
  `;
}
