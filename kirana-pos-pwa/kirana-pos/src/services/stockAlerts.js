import { getAllStock } from "./db";

export async function getStockAlerts() {
  const stock = await getAllStock();

  return stock.filter(item => item.quantity <= item.threshold);
}