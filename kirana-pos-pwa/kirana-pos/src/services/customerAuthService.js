import { openDB } from "./db";

const SESSION_KEY = "customer_session";


/* CREATE CUSTOMER */
export async function createCustomerAccount({ name, phone, password }) {

  const db = await openDB();

  return new Promise((resolve, reject) => {

    const tx = db.transaction("customers", "readwrite");
    const store = tx.objectStore("customers");
    const index = store.index("phone");

    const lookup = index.get(phone);

    lookup.onsuccess = () => {

      const existing = lookup.result;

      if (existing) {

        // UPDATE existing customer
        existing.password = password;
        existing.displayName = name;
        existing.updatedAt = Date.now();

        store.put(existing);

        tx.oncomplete = () => resolve(existing);
        tx.onerror = () => reject(tx.error);

        return;
      }

      // CREATE new customer
      const newCustomer = {
        id: crypto.randomUUID(),
        displayName: name.trim(),
        phone,
        password,
        lifetimeSpend: 0,
        loyaltyLevel: "bronze",
        visitCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      store.put(newCustomer);

      tx.oncomplete = () => resolve(newCustomer);
      tx.onerror = () => reject(tx.error);
    };

    lookup.onerror = () => reject(lookup.error);

  });

}


/* GET CUSTOMER BY PHONE */
export async function getCustomerByPhone(phone) {

  const db = await openDB();

  return new Promise((resolve, reject) => {

    const tx = db.transaction("customers", "readonly");

    const store = tx.objectStore("customers");

    const index = store.index("phone");

    const request = index.get(phone);

    request.onsuccess = () => {

      resolve(request.result || null);

    };

    request.onerror = () => reject(request.error);

  });

}


/* LOGIN CUSTOMER */
export async function loginCustomer(phone, password) {

  const customer = await getCustomerByPhone(phone);

  if (!customer) return null;

  if (customer.password !== password) return null;

  /* Clear previous session */
  sessionStorage.removeItem(SESSION_KEY);

  /* Store new session */
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      id: customer.id,
      name: customer.name,
      phone: customer.phone
    })
  );

  return customer;
}


/* CHECK SESSION */
export function isCustomerLoggedIn() {

  const session = sessionStorage.getItem(SESSION_KEY);

  if (!session) return false;

  try {
    const parsed = JSON.parse(session);
    return !!parsed?.id;
  } catch {
    return false;
  }

}


/* GET SESSION */
export function getCustomerSession() {

  const session = sessionStorage.getItem(SESSION_KEY);

  if (!session) return null;

  try {
    return JSON.parse(session);
  } catch {
    return null;
  }

}


/* LOGOUT */
export function logoutCustomer() {

  sessionStorage.removeItem(SESSION_KEY);

}

export async function getCurrentCustomer() {

  const session =
    sessionStorage.getItem("customer_session");

  if (!session)
    return null;

  let parsed;

  try {
    parsed = JSON.parse(session);
  }
  catch {
    return null;
  }

  if (!parsed?.id)
    return null;

  const db = await openDB();

  const tx =
    db.transaction("customers", "readonly");

  const store =
    tx.objectStore("customers");

  const customer = await new Promise(resolve => {

    const req = store.get(parsed.id);

    req.onsuccess = () => resolve(req.result);

    req.onerror = () => resolve(null);

  });

  return customer;
}