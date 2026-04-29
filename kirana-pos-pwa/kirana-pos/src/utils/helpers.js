// ===============================
// STOCK SEARCH UTILITY
// ===============================
export function searchStock(stockList, query) {
  if (!query) return [];

  const q = query.toLowerCase();

  // 1️⃣ Prefix match first (Amazon-style)
  const startsWith = stockList.filter(item =>
    item.name.toLowerCase().startsWith(q)
  );

  // 2️⃣ Contains match (fallback)
  const includes = stockList.filter(
    item =>
      !item.name.toLowerCase().startsWith(q) &&
      item.name.toLowerCase().includes(q)
  );

  // 3️⃣ Merge + limit
  return [...startsWith, ...includes].slice(0, 5);
}

// ===============================
// XSS SANITIZATION (OWASP)
// ===============================
export function escapeHTML(str) {
  if (typeof str !== 'string' || !str) return str || '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}