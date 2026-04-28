// run_migration.js — runs migrate_gemini.sql via mysql2
require("dotenv").config();
const mysql = require("mysql2");
const fs    = require("fs");
const path  = require("path");

const sql = fs.readFileSync(path.join(__dirname, "migrate_gemini.sql"), "utf8");

const db = mysql.createConnection({
  host:     process.env.DB_HOST || "localhost",
  user:     process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "kirana_pos",
  multipleStatements: true
});

db.connect(err => {
  if (err) { console.error("❌ DB connect failed:", err.message); process.exit(1); }
  console.log("✅ Connected. Running migration...");

  db.query(sql, (err2, results) => {
    if (err2) { console.error("❌ Migration error:", err2.message); db.end(); process.exit(1); }
    console.log("✅ Migration complete — suppliers & bill_records tables ready.");
    db.end();
  });
});
