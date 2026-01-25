// ===============================
// STOCK SEARCH UTILITY
// ===============================

/**
 * Filters stock items by name (prefix-based, Amazon-style)
 * @param {Array} stock - full stock list
 * @param {String} query - search text
 * @returns {Array} filtered stock list (max 6)
 */
export function searchStock(stock, query) {
  if (!query || !query.trim()) return [];

  const q = query.toLowerCase();

  return stock
    .filter(item => item.name.toLowerCase().startsWith(q))
    .slice(0, 6);
}