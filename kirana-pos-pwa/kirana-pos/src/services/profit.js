import { getAllSales } from "./db";
import { ACCOUNT_TYPE } from "./transactionTypes";

/* ===============================
   TODAY'S PROFIT
   Only goods sold generate profit
=============================== */
export async function getTodayProfit() {
  const sales = await getAllSales();
  const today = new Date().toLocaleDateString();

  return sales
    .filter(
      s =>
        s.date === today &&
        s.accountType === ACCOUNT_TYPE.ITEM_SALE
    )
    .reduce((sum, s) => sum + (Number(s.estimatedProfit) || 0), 0);
}

/* ===============================
   TOTAL PROFIT (ALL TIME)
=============================== */
export async function getTotalProfit() {
  const sales = await getAllSales();

  return sales
    .filter(s => s.accountType === ACCOUNT_TYPE.ITEM_SALE)
    .reduce((sum, s) => sum + (Number(s.estimatedProfit) || 0), 0);
}
