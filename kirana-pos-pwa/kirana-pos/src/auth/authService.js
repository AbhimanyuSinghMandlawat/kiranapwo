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

const BACKEND = "http://localhost:5000";

// Simple hashing for local auth
async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/* -------------------------------------------------------
   Try to obtain a backend JWT and store it in settings.
   Works for BOTH new and old accounts.
   Fails silently if backend is offline.
------------------------------------------------------- */
async function tryBackendLogin(username, password) {
  try {
    if (!navigator.onLine) return;

    const settings = await getShopSettings();
    // Use stored phone OR fall back to username (for old accounts)
    const ownerPhone = settings?.ownerPhone || username;
    if (!ownerPhone) return;

    // Step 1: Try to login
    let loginRes = await fetch(`${BACKEND}/api/login`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ owner_phone: ownerPhone, password }),
      signal:  AbortSignal.timeout(5000)
    });

    // Step 2: If login fails (400 = not found on backend), auto-register first
    if (!loginRes.ok && loginRes.status === 400) {
      const user = await getUserByUsername(username);
      const regRes = await fetch(`${BACKEND}/api/register`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          shop_name:   (user?.name || username) + "'s Shop",
          owner_name:  user?.name || username,
          owner_phone: ownerPhone,
          password
        }),
        signal: AbortSignal.timeout(5000)
      });

      if (!regRes.ok && regRes.status !== 409) {
        console.warn("[Auth] Backend registration failed:", regRes.status);
        return;
      }

      // Retry login after registration
      loginRes = await fetch(`${BACKEND}/api/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ owner_phone: ownerPhone, password }),
        signal:  AbortSignal.timeout(5000)
      });
    }

    if (!loginRes.ok) return;

    const data = await loginRes.json();
    if (data.token) {
      await saveShopSettings({
        ...(settings || {}),
        ownerPhone,
        backendToken:  data.token,
        backendShopId: data.shop?.id || null
      });
      console.log("[Auth] ✅ Backend token obtained – sync enabled");
    }
  } catch (e) {
    console.warn("[Auth] Backend login failed (offline?):", e.message);
  }
}

export async function createOwnerAccount({ name, username, password, phone }) {
  const existing = await getUserByUsername(username);

  if (existing) {
    throw new Error("User already exists");
  }

  const hashed = await hashPassword(password);

  const user = {
    id: crypto.randomUUID(),
    name,
    username,
    password: hashed,
    role: ROLES.OWNER,
    createdAt: Date.now()
  };

  await saveUser(user);

  // Store owner phone in settings so sync can use it for backend auth
  const existingSettings = await getShopSettings();
  if (phone) {
    await saveShopSettings({ ...(existingSettings || {}), ownerPhone: phone });
  }

  // ✅ FIX 4: Register on backend + get JWT so sync can work
  await tryBackendRegisterAndLogin({ name, username, password, phone });
}

/* -------------------------------------------------------
   Register shop on backend (once) and store JWT token.
   Called during createOwnerAccount – fails silently if offline.
------------------------------------------------------- */
async function tryBackendRegisterAndLogin({ name, username, password, phone }) {
  try {
    if (!navigator.onLine) return;

    // Step 1: Register on backend
    const regRes = await fetch(`${BACKEND}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop_name:    name + "'s Shop",
        owner_name:   name,
        owner_phone:  phone || username,
        password
      }),
      signal: AbortSignal.timeout(5000)
    });

    // 409 = already registered (phone taken) — try to login anyway
    if (!regRes.ok && regRes.status !== 409) return;

    // Step 2: Login to get JWT
    const loginRes = await fetch(`${BACKEND}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner_phone: phone || username, password }),
      signal: AbortSignal.timeout(5000)
    });

    if (!loginRes.ok) return;

    const data = await loginRes.json();
    if (data.token) {
      const current = await getShopSettings();
      await saveShopSettings({
        ...(current || {}),
        backendToken:  data.token,
        backendShopId: data.shop?.id || null
      });
      console.log("[Auth] Backend token obtained ✅");
    }
  } catch (e) {
    console.warn("[Auth] Backend registration failed (offline?) – local only:", e.message);
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
      id:    user.id,
      name:  user.name,
      role:  user.role,
      upiId: user.upiId || null
    },
    loginTime: Date.now()
  });

  await logAudit({
    action: "USER_LOGIN",
    module: "auth",
    metadata: { username }
  });

  // Try to get backend JWT in background (non-blocking)
  tryBackendLogin(username, password);

  return user;
}

export async function logout() {

  /* clear owner session */
  await clearSession();

  /* clear customer session */
  sessionStorage.removeItem("customer_session");

  /* clear any legacy session */
  sessionStorage.removeItem("session");

  /* redirect to welcome page */
  location.hash = "";

}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user || null;
}
