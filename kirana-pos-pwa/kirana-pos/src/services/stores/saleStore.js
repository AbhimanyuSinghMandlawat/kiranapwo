import { openDB, SALES_STORE, STOCK_STORE } from "./core";
import { logStaffAction } from "../staffHistory";
import { getCurrentUser } from "../../auth/authService";
import { queueSync } from "../syncService";

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

      sale.items.forEach(i => {
        const req = stockStore.get(i.itemId);

        req.onsuccess = () => {
          if (aborted) return;
          const s = req.result;

          if (!s || s.quantity < i.qty) {
            aborted = true;
            tx.abort();
            reject("Insufficient stock");
            return;
          }
          const itemCost = (s.costPrice || 0) * i.qty;
          const itemRevenue = (s.price || 0) * i.qty;
          totalCost += itemCost;
          totalRevenue += itemRevenue;

          s.quantity -= i.qty;
          stockStore.put(s);

          pendingReads--;
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
      sale.estimatedProfit = totalRevenue - totalCost;

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

        await queueSync("sale", sale);
        resolve();
      };
    } catch (e) {
      reject(e);
    }
  });
}
