import { logStaffAction } from "./staffHistory";
import { getCurrentUser } from "../auth/authService";
import { queueSync } from "./syncService";
const DB_NAME = "kirana_pos_db";
const DB_VERSION = 52;     // only change: increased version

const SALES_STORE = "sales";
const STOCK_STORE = "stocks";
const USER_STORE = "users";
const SESSION_STORE = "sessions";

// ---- NEW STORES (ADDED ONLY) ----
const ADVANCE_STORE = "advances";
const PAYROLL_STORE = "payroll_records";
const SALARY_HISTORY_STORE = "salary_history";
const STAFF_HISTORY_STORE = "staff_history";


export function openDB() {
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

      // ===== NEW PAYROLL STORES (ONLY ADDITION) =====

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
        store.createIndex("timestamp", "timestamp",{ unique: false });
        store.createIndex("actorId", "actorId",{ unique: false });
        store.createIndex("module", "module",{ unique: false });
      }

      if (!db.objectStoreNames.contains("customers")) {

       const store = db.createObjectStore("customers", {
         keyPath: "id"
        });

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

        const store = 
          db.createObjectStore("customer_profiles", {
            keyPath: "customer"
          });
        store.createIndex("loyaltyLevel","loyaltyLevel");

        store.createIndex("lifetimeSpend","lifetimeSpend");
      }

      /* ===== SYNC QUEUE STORE ===== */

      if (!db.objectStoreNames.contains("sync_queue")) {
        const q = db.createObjectStore("sync_queue", { keyPath: "id" });
        q.createIndex("synced","synced");
        q.createIndex("type","type");
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

    req.onerror = () => {
      reject(new Error("DB open failed"));
    };

    req.onblocked = () => {
      reject(new Error("DB blocked by another open connection"));
    };
  });
}

/* SALES */
export async function saveSale(sale) {
  const db = await openDB();

  return new Promise(resolve => {
    const tx = db.transaction(SALES_STORE, "readwrite");
    tx.objectStore(SALES_STORE).put(sale);

    tx.oncomplete = async () => {

      let actionType = sale.accountType;
      if (sale.paymentMethod === "credit") actionType = "CREDIT_GIVEN";
      if (sale.transactionType === "settlement") actionType = "SETTLEMENT";
      const actor = await getCurrentUser();

      await logStaffAction(actor, {
        module: "sale",
        action: actionType,
        summary: `Transaction ₹${sale.amount}`,
        details: {
          amount: sale.amount,
          payment: sale.paymentMethod,
          customer: sale.customerName || "Walk-in"
        }
      });
      await queueSync("sale", sale);

      resolve();
    };
  });
}


export async function getAllSales() {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(SALES_STORE, "readonly");
    const req = tx.objectStore(SALES_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
  });
}

/* STOCK */
export async function addStockItem(item) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STOCK_STORE, "readwrite");
    const store = tx.objectStore(STOCK_STORE);
    const index = store.index("name");

    const checkReq = index.get(item.name);

    checkReq.onsuccess = async () => {
      if (checkReq.result) {
        reject("ITEM_EXISTS");
        return;
      }

      store.put(item);
    };

    tx.oncomplete = async () => {
      const actor = await getCurrentUser();
        await logStaffAction(actor, {
          module: "stock",
          action: "NEW_ITEM",
          summary: `Created item ${item.name}`,
          details: item
        });
      resolve();
    };

    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}



export async function getAllStock() {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(STOCK_STORE, "readonly");
    const req = tx.objectStore(STOCK_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
  });
}

export async function updateStockQuantity(id, quantity) {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(STOCK_STORE, "readwrite");
    const store = tx.objectStore(STOCK_STORE);
    const req = store.get(id);

    req.onsuccess = async() => {
      if (!req.result) return resolve();
      const before = req.result.quantity;
      req.result.quantity = quantity;
      store.put(req.result);
      const change = quantity - before;
      if(change > 0){
        const actor = await getCurrentUser();
        await logStaffAction(actor, {
          module: "stock",
          action: "ADD_STOCK",
          summary:`Added ${req.result.name}`,
          details: {
            item: req.result.name,
            added: change,
            before,
            after: quantity
          }
        });
      }
      resolve();
    };
  });
}
export async function updateStockItem(item) {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(STOCK_STORE, "readwrite");
    tx.objectStore(STOCK_STORE).put(item);
    tx.oncomplete = resolve;
  });
}


export async function removeStockItem(id) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STOCK_STORE, "readwrite");
    const store = tx.objectStore(STOCK_STORE);
    const getreq = store.get(id);

    getreq.onsuccess = async () => {
      if (!getreq.result) return resolve();

      const item = getreq.result;
      store.delete(id);
      try {

        const actor = await getCurrentUser();
        if(actor){
            await logStaffAction(actor, {
            module: "stock",
            action: "DELETE_ITEM",
            summary: `Removed item ${item.name}`,
            details: item
          });
        }
      } catch{}
    };
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);

    
  });
}




export async function processSale(sale) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STOCK_STORE, SALES_STORE], "readwrite");
    const stockStore = tx.objectStore(STOCK_STORE);
    const salesStore = tx.objectStore(SALES_STORE);

    try {
      let totalCost = 0;
      let totalRevenue = 0;
      let pendingReads = sale.items.length;
      let aborted = false;

      // ===== UPDATE STOCK =====
      sale.items.forEach(i => {
        const req = stockStore.get(i.itemId);

        req.onsuccess = () => {
          if(aborted) return;
          const s = req.result;

          if (!s || s.quantity < i.qty) {
            aborted = true;
            tx.abort();
            reject("Insufficient stock");
            return;
          }
          //======Profit calculation =========//
          const itemCost = (s.costPrice || 0) * i.qty;
          const itemRevenue = (s.price || 0) * i.qty;
          totalCost += itemCost;
          totalRevenue += itemRevenue;
          //reduce stock

          s.quantity -= i.qty;
          stockStore.put(s);

          pendingReads--;
          //wait until all items processed
          if (pendingReads === 0 && !aborted) {
            sale.estimatedProfit = totalRevenue - totalCost;
            salesStore.put(sale);
          }
        };
        req.onerror = () => {
          aborted = true;
          tx.abort();
          reject("Stock read error");
        };
      });
      //==========Finalize profit=====//
      sale.estimatedProfit = totalRevenue - totalCost;

      // ===== AFTER SUCCESSFUL COMMIT → LOG AUDIT =====
      tx.oncomplete = async () => {

        let itemSummary = "Quick Sale";

        if (Array.isArray(sale.items) && sale.items.length > 0) {
          itemSummary = sale.items
            .map(i => `${i.name} ×${i.qty}`)
            .join(", ");
        }
        const actor = await getCurrentUser();

        await logStaffAction(actor, {
          module: "sale",
          action: "SALE",
          summary: `Sold: ${itemSummary} — ₹${sale.amount} via ${sale.paymentMethod.toUpperCase()}`,
          details: {
            items: sale.items,
            total: sale.amount,
            payment: sale.paymentMethod,
            customer: sale.customerName || "Walk-in"
          }
        });

        resolve();
      };

    } catch (e) {
      reject(e);
    }
  });
}


/* ===== USER FUNCTIONS ===== */

export async function saveUser(user) {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(USER_STORE, "readwrite");
    tx.objectStore(USER_STORE).put(user);
    tx.oncomplete = resolve;
  });
}

export async function getAllUsers() {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(USER_STORE, "readonly");
    const req = tx.objectStore(USER_STORE).getAll();
    req.onsuccess = () => {
     const data = req.result || [];
     resolve(data);
    };

  });
}

export async function getUserByUsername(username) {
  const users = await getAllUsers();
  return users.find(u => u.username === username);
}

/* ===== SESSION FUNCTIONS ===== */

export async function saveSession(session) {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(SESSION_STORE, "readwrite");
    tx.objectStore(SESSION_STORE).put(session);
    tx.oncomplete = resolve;
  });
}

export async function getSession() {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(SESSION_STORE, "readonly");
    const req = tx.objectStore(SESSION_STORE).getAll();
    req.onsuccess = () => resolve(req.result[0] || null);
  });
}

export async function clearSession() {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(SESSION_STORE, "readwrite");
    tx.objectStore(SESSION_STORE).clear();
    tx.oncomplete = resolve;
  });
}

/* ===== NEW PAYROLL FUNCTIONS (ONLY ADDITIONS) ===== */

export async function addAdvance(advance) {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(ADVANCE_STORE, "readwrite");
    tx.objectStore(ADVANCE_STORE).put(advance);
    tx.oncomplete = resolve;
  });
}

export async function getAdvancesByStaff(staffId) {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(ADVANCE_STORE, "readonly");
    const req = tx.objectStore(ADVANCE_STORE).getAll();
    req.onsuccess = () =>
      resolve(req.result.filter(a => a.staffId === staffId));
  });
}

export async function savePayrollRecord(record) {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(PAYROLL_STORE, "readwrite");
    tx.objectStore(PAYROLL_STORE).put(record);
    tx.oncomplete = resolve;
  });
}

export async function getPayrollRecords() {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(PAYROLL_STORE, "readonly");
    const req = tx.objectStore(PAYROLL_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
  });
}

export async function addSalaryHistory(history) {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(SALARY_HISTORY_STORE, "readwrite");
    tx.objectStore(SALARY_HISTORY_STORE).put(history);
    tx.oncomplete = resolve;
  });
}

export async function getSalaryHistory(staffId) {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(SALARY_HISTORY_STORE, "readonly");
    const req = tx.objectStore(SALARY_HISTORY_STORE).getAll();
    req.onsuccess = () =>
      resolve(req.result.filter(h => h.staffId === staffId));
  });
}
export async function addStaffHistory(record) {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(STAFF_HISTORY_STORE, "readwrite");
    tx.objectStore(STAFF_HISTORY_STORE).put(record);
    tx.oncomplete = resolve;
  });
}

export async function getStaffHistory(staffId) {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(STAFF_HISTORY_STORE, "readonly");
    const req = tx.objectStore(STAFF_HISTORY_STORE).getAll();
    req.onsuccess = () => {
      resolve(req.result.filter(r => r.staffId === staffId));
    };
  });
}

export async function completeOnboarding() {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction("settings", "readwrite");
    tx.objectStore("settings").put({
      id: "system",
      onboardingCompleted: true,
      date: Date.now()
    });
    tx.oncomplete = resolve;
  });
}
export async function isOnboardingCompleted() {
  const db = await openDB();

  return new Promise(resolve => {
    const tx = db.transaction("settings", "readonly");
    const req = tx.objectStore("settings").get("system");

    req.onsuccess = () => {
      resolve(req.result?.onboardingCompleted === true);
    };

    req.onerror = () => resolve(false);
  });
}

/* ===== OPENING STOCK INSERT ===== */

export async function insertOpeningStock(items) {
  const db = await openDB();

  return new Promise((resolve, reject) => {

    const tx = db.transaction(["stocks", "settings"], "readwrite");
    const stockStore = tx.objectStore("stocks");
    const settingsStore = tx.objectStore("settings");

    for (const item of items) {
      stockStore.put({
        ...item,
        openingQuantity: item.quantity,
        isOpening: true,
        createdAt: Date.now()
      });
    }

    settingsStore.put({
      id: "system",
      onboardingCompleted: true,
      completedAt: Date.now()
    });

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
export async function updateUser(user) {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction("users", "readwrite");
    tx.objectStore("users").put(user);
    tx.oncomplete = resolve;
  });
}
export async function saveShopSettings(data) {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction("settings", "readwrite");
    tx.objectStore("settings").put({
      id: "shop_config",
      ...data
    });
    tx.oncomplete = resolve;
  });
}

export async function getShopSettings() {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction("settings", "readonly");
    const req = tx.objectStore("settings").get("shop_config");
    req.onsuccess = () => resolve(req.result || null);
  });
}
