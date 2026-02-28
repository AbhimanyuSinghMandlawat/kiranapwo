import { clearSession } from "../services/db";

export async function logout() {

  /* clear owner session (IndexedDB) */
  await clearSession();

  /* clear customer session */
  sessionStorage.removeItem("customer_session");

  /* safety cleanup */
  sessionStorage.removeItem("session");

}