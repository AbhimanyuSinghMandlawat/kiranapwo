import {
  saveUser,
  getUserByUsername,
  saveSession,
  clearSession,
  getSession
} from "../services/db";

import { ROLES } from "./roles";

// Simple hashing (can be upgraded later)
async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createOwnerAccount({ name, username, password }) {
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
      upiId: user.upiId || null   // include UPI

    },
    loginTime: Date.now()
  });

  return user;
}

export async function logout() {
  await clearSession();
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user || null;
}
