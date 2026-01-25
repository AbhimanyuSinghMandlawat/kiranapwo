const DB_NAME = "kirana_pos_db";
const DB_VERSION = 6;
const SALES_STORE = "sales";
const STOCK_STORE = "stocks";

/* =========================
   OPEN DATABASE
========================= */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = e => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains(SALES_STORE)) {
        const store = db.createObjectStore(SALES_STORE, { keyPath: "id" });
        store.createIndex("syncStatus", "syncStatus");
        store.createIndex("customerName", "customerName");
        store.createIndex("paymentMethod", "paymentMethod");
      }

      if (!db.objectStoreNames.contains(STOCK_STORE)) {
        db.createObjectStore(STOCK_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject("Failed to open DB");
  });
}

/* =========================
   SALES FUNCTIONS
========================= */
export async function saveSale(sale) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(SALES_STORE, "readwrite");
    tx.objectStore(SALES_STORE).put(sale);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject("Save sale failed");
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

export async function getPendingSales() {
  const db = await openDB();

  return new Promise(resolve => {
    const tx = db.transaction(SALES_STORE, "readonly");
    const index = tx.objectStore(SALES_STORE).index("syncStatus");
    const req = index.getAll("pending");
    req.onsuccess = () => resolve(req.result || []);
  });
}

export async function updateSale(id, updates) {
  const db = await openDB();

  return new Promise(resolve => {
    const tx = db.transaction(SALES_STORE, "readwrite");
    const store = tx.objectStore(SALES_STORE);

    const req = store.get(id);
    req.onsuccess = () => {
      if (!req.result) return resolve();
      store.put({ ...req.result, ...updates });
      resolve();
    };
  });
}

/* =========================
   STOCK FUNCTIONS
========================= */
export async function addStockItem(item) {
  const db = await openDB();

  return new Promise(resolve => {
    const tx = db.transaction(STOCK_STORE, "readwrite");
    tx.objectStore(STOCK_STORE).put(item);
    tx.oncomplete = () => resolve();
  });
}

export async function getAllStock() {
  const db = await openDB();

  // ✅ SAFETY CHECK (IMPORTANT)
  if (!db.objectStoreNames.contains(STOCK_STORE)) {
    console.warn("Stock store not found. Returning empty stock list.");
    return [];
  }

  return new Promise(resolve => {
    const tx = db.transaction(STOCK_STORE, "readonly");
    const req = tx.objectStore(STOCK_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
  });
}

export async function updateStockQuantity(id, quantity) {
  const db = await openDB();
  if (!db.objectStoreNames.contains(STOCK_STORE)) {
    console.warn("Stock store not found.");
    return;
  }
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
export async function seedDefaultStock() {
  const existing = await getAllStock();
  if (existing.length > 0) return;

  await addStockItem({
    id: "rice",
    name: "Rice",
    quantity: 5,
    threshold: 3
  });

  await addStockItem({
    id: "sugar",
    name: "Sugar",
    quantity: 10,
    threshold: 4
  });

  console.log("Default stock seeded");
}
// ❌ REMOVE STOCK ITEM
export async function removeStockItem(id) {
  const db = await openDB();

  return new Promise(resolve => {
    const tx = db.transaction("stocks", "readwrite");
    tx.objectStore("stocks").delete(id);
    tx.oncomplete = () => resolve();
  });
}
// ===============================
// PROCESS SALE (AUTO STOCK DEDUCTION)
// ===============================
export async function processSale(sale) {
  const db = await openDB();

  return new Promise(async (resolve, reject) => {
    const tx = db.transaction([STOCK_STORE, SALES_STORE], "readwrite");
    const stockStore = tx.objectStore(STOCK_STORE);
    const salesStore = tx.objectStore(SALES_STORE);

    try {
      // 1️⃣ Validate & deduct stock
      for (const item of sale.items) {
        const req = stockStore.get(item.itemId);

        await new Promise(res => {
          req.onsuccess = () => {
            const stock = req.result;

            if (!stock) {
              reject(`Item not found: ${item.itemId}`);
              return;
            }

            if (stock.quantity < item.qty) {
              reject(`Insufficient stock for ${stock.name}`);
              return;
            }

            // Deduct quantity
            stock.quantity -= item.qty;
            // LOW STOCK CHECK
             if (stock.quantity <= stock.threshold) {
                stock.lowStock = true;
              } else {
                stock.lowStock = false;
              }
            stockStore.put(stock);
            res();
          };
        });
      }

      // 2️⃣ Save sale AFTER stock is updated
      salesStore.put(sale);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject("Sale transaction failed");
    } catch (err) {
      reject(err);
    }
  });
}