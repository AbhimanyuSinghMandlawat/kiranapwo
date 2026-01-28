const DB_NAME = "kirana_pos_db";
const DB_VERSION = 6;
const SALES_STORE = "sales";
const STOCK_STORE = "stocks";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains(SALES_STORE)) {
        const s = db.createObjectStore(SALES_STORE, { keyPath: "id" });
        s.createIndex("paymentMethod", "paymentMethod");
        s.createIndex("customerName", "customerName");
      }

      if (!db.objectStoreNames.contains(STOCK_STORE)) {
        db.createObjectStore(STOCK_STORE, { keyPath: "id" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject("DB open failed");
  });
}

/* SALES */
export async function saveSale(sale) {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(SALES_STORE, "readwrite");
    tx.objectStore(SALES_STORE).put(sale);
    tx.oncomplete = resolve;
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
  return new Promise(resolve => {
    const tx = db.transaction(STOCK_STORE, "readwrite");
    tx.objectStore(STOCK_STORE).put(item);
    tx.oncomplete = resolve;
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

    req.onsuccess = () => {
      if (!req.result) return resolve();
      req.result.quantity = quantity;
      store.put(req.result);
      resolve();
    };
  });
}

export async function removeStockItem(id) {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(STOCK_STORE, "readwrite");
    tx.objectStore(STOCK_STORE).delete(id);
    tx.oncomplete = resolve;
  });
}

export async function seedDefaultStock() {
  const existing = await getAllStock();
  if (existing.length > 0) return;

  await addStockItem({
    id: "rice",
    name: "Rice",
    price: 50,
    quantity: 5,
    threshold: 3
  });

  await addStockItem({
    id: "sugar",
    name: "Sugar",
    price: 40,
    quantity: 10,
    threshold: 4
  });
}

export async function processSale(sale) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STOCK_STORE, SALES_STORE], "readwrite");
    const stockStore = tx.objectStore(STOCK_STORE);
    const salesStore = tx.objectStore(SALES_STORE);

    try {
      sale.items.forEach(i => {
        const req = stockStore.get(i.itemId);
        req.onsuccess = () => {
          const s = req.result;
          if (!s || s.quantity < i.qty) {
            tx.abort();
            reject("Insufficient stock");
            return;
          }
          s.quantity -= i.qty;
          stockStore.put(s);
        };
      });

      salesStore.put(sale);
      tx.oncomplete = resolve;
    } catch (e) {
      reject(e);
    }
  });
}