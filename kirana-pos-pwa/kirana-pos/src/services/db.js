const DB_NAME = "kirana_pos_db";
const DB_VERSION = 7;
const SALES_STORE = "sales";
const STOCK_STORE = "stocks";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains(SALES_STORE)) {
        const s = db.createObjectStore(SALES_STORE, { keyPath: "id" });
        s.createIndex("date", "date");
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

export async function processSale(sale) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STOCK_STORE, SALES_STORE], "readwrite");
    const stockStore = tx.objectStore(STOCK_STORE);
    const salesStore = tx.objectStore(SALES_STORE);

    let totalProfit = 0;

    sale.items.forEach(i => {
      const req = stockStore.get(i.itemId);
      req.onsuccess = () => {
        const stock = req.result;
        if (!stock || stock.quantity < i.qty) {
          tx.abort();
          reject("Insufficient stock");
          return;
        }

        stock.quantity -= i.qty;
        stockStore.put(stock);

        const cost = stock.costPrice || 0;
        totalProfit += (i.price - cost) * i.qty;
      };
    });

    sale.estimatedProfit = Math.max(0, Math.round(totalProfit));
    salesStore.put(sale);
    tx.oncomplete = resolve;
  });
}