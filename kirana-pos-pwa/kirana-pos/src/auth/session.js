import { getCurrentUser } from "./authService";
import { hasPermission } from "./roles";

export async function requireAuth() {
  const user = await getCurrentUser();
  return !!user;
}

export async function requirePermission(permission) {
  const user = await getCurrentUser();
  if (!user) return false;

  return hasPermission(user.role, permission);
}
