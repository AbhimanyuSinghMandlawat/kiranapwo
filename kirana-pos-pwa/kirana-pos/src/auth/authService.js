import {
  saveUser,
  getUserByUsername,
  saveSession,
  clearSession,
  getSession,
  saveShopSettings,
  getShopSettings
} from "../services/db";

import { ROLES } from "./roles";
import { logAudit } from "../services/auditLog";

<<<<<<< HEAD
// In production (Vercel) the /api/* calls are proxied by vercel.json → Render.
// In local dev vite.config.js proxies /api/* → localhost:5000.
// Using a relative base means ZERO hardcoded URLs — works everywhere.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
=======
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
>>>>>>> 2cff26b297962b9bd8ebed1b5583e7d60d2fe545

// Simple hashing for local auth
async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* -------------------------------------------------------
   Try to obtain a backend JWT and store it in settings.
   Works for BOTH new and old accounts.
   Fails silently if backend is offline.
------------------------------------------------------- */
async function tryBackendLogin(username, password) {
  try {
    if (!navigator.onLine || !API_BASE) return;

    const settings = await getShopSettings();
    const ownerPhone = settings?.ownerPhone || username;
    if (!ownerPhone) return;

    let loginRes = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerphone: ownerPhone, password }),
      signal: AbortSignal.timeout(5000)
    });

    if (!loginRes.ok && loginRes.status === 400) {
      const user = await getUserByUsername(username);

      const regRes = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopname: (user?.name || username) + "'s Shop",
          ownername: user?.name || username,
          ownerphone: ownerPhone,
          password
        }),
        signal: AbortSignal.timeout(5000)
      });

      if (!regRes.ok && regRes.status !== 409) {
        console.warn("[Auth] Backend registration failed:", regRes.status);
        return;
      }

      loginRes = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerphone: ownerPhone, password }),
        signal: AbortSignal.timeout(5000)
      });
    }

    if (!loginRes.ok) return;

    const data = await loginRes.json();

    if (data.token) {
      const shopId = data.shop?.id || null;
      // Namespace IndexedDB per shop so accounts never share data
      if (shopId) {
        localStorage.setItem("kirana_db_name", `kirana_pos_${shopId}`);
      }
      await saveShopSettings({
        ...(settings || {}),
        ownerPhone,
        backendToken: data.token,
        backendShopId: shopId
      });
      console.log("[Auth] Backend token obtained - sync enabled");
    }
  } catch (e) {
    console.warn("[Auth] Backend login failed (offline?):", e.message);
  }
}

export async function createOwnerAccount({
  name,
  username,
  password,
  phone,
  email,
  shopName
}) {
  const existing = await getUserByUsername(username);

  if (existing) {
    throw new Error("An account with this phone number already exists");
  }

  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const hashed = await hashPassword(password);

  const user = {
    id: crypto.randomUUID(),
    name,
    username,
    password: hashed,
    role: ROLES.OWNER,
    email: email || null,
    createdAt: Date.now()
  };

  await saveUser(user);

  const existingSettings = await getShopSettings();
  await saveShopSettings({
    ...(existingSettings || {}),
    ownerPhone: phone || username,
    ownerName: name,
    shopName: shopName || `${name}'s Shop`,
    ownerEmail: email || null
  });

  await tryBackendRegisterAndLogin({
    name,
    username,
    password,
    phone,
    email,
    shopName
  });
}

/* -------------------------------------------------------
   Register shop on backend (once) and store JWT token.
   Called during createOwnerAccount - fails silently if offline.
------------------------------------------------------- */
async function tryBackendRegisterAndLogin({
  name,
  username,
  password,
  phone,
  email,
  shopName
}) {
  try {
    if (!navigator.onLine || !API_BASE) return;

    const ownerPhone = phone || username;

    const regRes = await fetch(`${API_BASE}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopname: shopName || `${name}'s Shop`,
        ownername: name,
        ownerphone: ownerPhone,
        owneremail: email || null,
        password
      }),
      signal: AbortSignal.timeout(5000)
    });

    if (!regRes.ok && regRes.status !== 409) return;

    const loginRes = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerphone: ownerPhone, password }),
      signal: AbortSignal.timeout(5000)
    });

    if (!loginRes.ok) return;

    const data = await loginRes.json();

    if (data.token) {
      const shopId = data.shop?.id || null;
      // Namespace IndexedDB per shop so accounts never share data
      if (shopId) {
        localStorage.setItem("kirana_db_name", `kirana_pos_${shopId}`);
      }
      const current = await getShopSettings();
      await saveShopSettings({
        ...(current || {}),
        backendToken: data.token,
        backendShopId: shopId
      });
      console.log("[Auth] Backend token obtained");
    }
  } catch (e) {
    console.warn("[Auth] Backend registration failed (offline?) - local only:", e.message);
  }
}

export async function login(username, password) {
  const user = await getUserByUsername(username);

  if (!user) {
    throw new Error("User not found");
  }

  const hashed = await hashPassword(password);

  if (hashed !== user.password) {
    throw new Error("Invalid password");
  }

  await saveSession({
    id: "current",
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      upiId: user.upiId || null
    },
    loginTime: Date.now()
  });

  await logAudit({
    action: "USER_LOGIN",
    module: "auth",
    metadata: { username }
  });

  tryBackendLogin(username, password);

  return user;
}

export async function logout() {
  // Clear backend token from settings so the next account gets a fresh token
  try {
    const current = await getShopSettings();
    if (current) {
      await saveShopSettings({
        ...current,
        backendToken: null,
        backendShopId: null,
        backendPhone: null
      });
    }
  } catch (e) {
    console.warn("[Auth] Could not clear backend token on logout:", e.message);
  }
  // Remove the shop-scoped DB key so the next login opens a fresh DB namespace
  localStorage.removeItem("kirana_db_name");
  await clearSession();
  sessionStorage.removeItem("customer_session");
  sessionStorage.removeItem("session");
  location.hash = "";
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user || null;
}