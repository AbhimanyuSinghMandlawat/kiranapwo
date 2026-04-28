require("dotenv").config();
const mysql = require("mysql2/promise");

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASS, database: process.env.DB_NAME
  });

  // Show all tables
  console.log("\n=== TABLES ===");
  const [tables] = await conn.execute("SHOW TABLES");
  console.table(tables);

  // Show shops
  console.log("\n=== SHOPS ===");
  const [shops] = await conn.execute(
    "SELECT id, shop_name, owner_name, owner_phone FROM shops ORDER BY id DESC LIMIT 10"
  );
  console.table(shops);

  // Detect which table holds user/auth records
  const tableNames = tables.map(r => Object.values(r)[0]);
  for (const t of ["users","staff","staff_accounts","owners","accounts"]) {
    if (tableNames.includes(t)) {
      console.log(`\n=== ${t.toUpperCase()} ===`);
      const [rows] = await conn.execute(`SELECT * FROM ${t} LIMIT 10`);
      console.table(rows);
    }
  }

  await conn.end();
})().catch(e => console.error("DB Error:", e.message));
