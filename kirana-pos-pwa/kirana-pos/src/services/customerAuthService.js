import { openDB } from "./db";

const SESSION_KEY = "customer_session";


/* CREATE CUSTOMER */
export async function createCustomerAccount(customer) {

  const db = await openDB();

  return new Promise((resolve, reject) => {

    const tx = db.transaction("customers", "readwrite");

    const store = tx.objectStore("customers");

    const request = store.put(customer);

    request.onsuccess = () => resolve(customer);

    request.onerror = () => reject(request.error);

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

  console.log("DB customer:", customer);

  if (!customer) return null;

  if (customer.password !== password) return null;

  sessionStorage.removeItem("session");

  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify(customer)
  );

  return customer;

}


/* CHECK SESSION */
export function isCustomerLoggedIn() {

  return sessionStorage.getItem(SESSION_KEY) !== null;

}


/* GET SESSION */
export function getCustomerSession() {

  return JSON.parse(
    sessionStorage.getItem(SESSION_KEY)
  );

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

  try {
    return JSON.parse(session);
  }
  catch {
    return null;
  }
}