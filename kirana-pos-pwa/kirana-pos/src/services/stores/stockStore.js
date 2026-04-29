import { openDB, STOCK_STORE } from "./core";
import { logStaffAction } from "../staffHistory";
import { getCurrentUser } from "../../auth/authService";
import { queueSync } from "../syncService";

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
      await queueSync("stock", item);
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

    req.onsuccess = async () => {
      if (!req.result) return resolve();
      const before = req.result.quantity;
      req.result.quantity = quantity;
      store.put(req.result);
      const change = quantity - before;
      if (change > 0) {
        const actor = await getCurrentUser();
        await logStaffAction(actor, {
          module: "stock",
          action: "ADD_STOCK",
          summary: `Added ${req.result.name}`,
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
        if (actor) {
          await logStaffAction(actor, {
            module: "stock",
            action: "DELETE_ITEM",
            summary: `Removed item ${item.name}`,
            details: item
          });
        }
      } catch { }
    };
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

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

    tx.oncomplete = async () => {
      for (const item of items) {
        await queueSync("stock", {
          ...item,
          openingQuantity: item.quantity,
          isOpening: true,
          createdAt: Date.now()
        });
      }
      resolve(true);
    };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function upsertStockByName(item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STOCK_STORE, "readwrite");
    const store = tx.objectStore(STOCK_STORE);
    const idx   = store.index("name");
    const check = idx.get(item.name);

    check.onsuccess = () => {
      if (check.result) {
        const existing      = check.result;
        existing.quantity   = (existing.quantity || 0) + (item.quantity || 1);
        if (item.costPrice)  existing.costPrice  = item.costPrice;
        if (item.price)      existing.price      = item.price;
        if (item.threshold)  existing.threshold  = item.threshold;
        store.put(existing);
        tx.oncomplete = () => resolve("updated");
      } else {
        store.put({
          ...item,
          id:        item.id || crypto.randomUUID(),
          createdAt: item.createdAt || Date.now()
        });
        tx.oncomplete = () => resolve("created");
      }
    };
    tx.onerror = () => reject(tx.error);
  });
}
