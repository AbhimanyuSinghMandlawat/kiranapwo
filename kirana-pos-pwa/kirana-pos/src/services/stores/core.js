export const DB_VERSION = 55;

export function getActiveDbName() {
  return localStorage.getItem("kirana_db_name") || "kirana_pos_db";
}

export const SALES_STORE = "sales";
export const STOCK_STORE = "stocks";
export const USER_STORE = "users";
export const SESSION_STORE = "sessions";
export const ADVANCE_STORE = "advances";
export const PAYROLL_STORE = "payroll_records";
export const SALARY_HISTORY_STORE = "salary_history";
export const STAFF_HISTORY_STORE = "staff_history";

export function openDB() {
  const DB_NAME = getActiveDbName();
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains("staff_history")) {
        db.createObjectStore("staff_history", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(USER_STORE)) {
        const u = db.createObjectStore(USER_STORE, { keyPath: "id" });
        u.createIndex("username", "username", { unique: true });
        u.createIndex("role", "role");
      }

      if (!db.objectStoreNames.contains(SESSION_STORE)) {
        db.createObjectStore(SESSION_STORE, { keyPath: "id" });
      }
      const SETTINGS_STORE = "settings";

      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(SALES_STORE)) {
        const s = db.createObjectStore(SALES_STORE, { keyPath: "id" });
        s.createIndex("paymentMethod", "paymentMethod");
        s.createIndex("customerName", "customerName");
      }

      if (!db.objectStoreNames.contains(STOCK_STORE)) {
        const stock = db.createObjectStore(STOCK_STORE, { keyPath: "id" });
        stock.createIndex("name", "name", { unique: true });
      }

      if (!db.objectStoreNames.contains(ADVANCE_STORE)) {
        const a = db.createObjectStore(ADVANCE_STORE, { keyPath: "advanceId" });
        a.createIndex("staffId", "staffId");
      }

      if (!db.objectStoreNames.contains(PAYROLL_STORE)) {
        const p = db.createObjectStore(PAYROLL_STORE, { keyPath: "recordId" });
        p.createIndex("staffId", "staffId");
        p.createIndex("monthYear", "monthYear");
      }

      if (!db.objectStoreNames.contains(SALARY_HISTORY_STORE)) {
        const s = db.createObjectStore(SALARY_HISTORY_STORE, { keyPath: "historyId" });
        s.createIndex("staffId", "staffId");
      }

      if (!db.objectStoreNames.contains("audit_logs")) {
        const store = db.createObjectStore("audit_logs", { keyPath: "id" });
        store.createIndex("timestamp", "timestamp", { unique: false });
        store.createIndex("actorId", "actorId", { unique: false });
        store.createIndex("module", "module", { unique: false });
      }

      if (!db.objectStoreNames.contains("customers")) {
        const store = db.createObjectStore("customers", { keyPath: "id" });
        store.createIndex("phone", "phone", { unique: true });
      }

      if (!db.objectStoreNames.contains("shops")) {
        db.createObjectStore("shops", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("coupons")) {
        db.createObjectStore("coupons", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("customer_shops")) {
        const store = db.createObjectStore("customer_shops", { keyPath: "id" });
        store.createIndex("customerId", "customerId");
        store.createIndex("shopId", "shopId");
      }
      if (!db.objectStoreNames.contains("customer_profiles")) {
        const store = db.createObjectStore("customer_profiles", { keyPath: "customer" });
        store.createIndex("loyaltyLevel", "loyaltyLevel");
        store.createIndex("lifetimeSpend", "lifetimeSpend");
      }

      if (!db.objectStoreNames.contains("sync_queue")) {
        const q = db.createObjectStore("sync_queue", { keyPath: "id" });
        q.createIndex("synced", "synced");
        q.createIndex("type", "type");
      }

      if (!db.objectStoreNames.contains("suppliers")) {
        const sup = db.createObjectStore("suppliers", { keyPath: "id" });
        sup.createIndex("name",       "name");
        sup.createIndex("gst_number", "gst_number");
        sup.createIndex("mobile",     "mobile");
      }

      if (!db.objectStoreNames.contains("bill_records")) {
        const br = db.createObjectStore("bill_records", { keyPath: "id" });
        br.createIndex("supplier_id", "supplier_id");
        br.createIndex("bill_date",   "bill_date");
      }
    };

    req.onsuccess = e => {
      const db = e.target.result;
      db.onversionchange = () => {
        db.close();
        console.warn("IndexedDB connection closed due to version change");
      };
      resolve(db);
    };

    req.onerror = () => reject(new Error("DB open failed"));
    req.onblocked = () => reject(new Error("DB blocked by another open connection"));
  });
}
