import { openDB } from "../services/db";

const SESSION_KEY = "customer_session";

export async function loginCustomer(phone, password) {

  const db = await openDB();

  const tx = db.transaction("customers", "readonly");
  const store = tx.objectStore("customers");
  const index = store.index("phone");

  const customer = await index.get(phone);

  if (!customer)
    throw new Error("Customer not found");

  if (customer.password !== password)
    throw new Error("Invalid password");

  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify(customer)
  );

  return customer;
}

export function getCustomerSession() {

  const raw = sessionStorage.getItem(SESSION_KEY);

  return raw ? JSON.parse(raw) : null;
}

export function logoutCustomer() {

  sessionStorage.removeItem(SESSION_KEY);
}