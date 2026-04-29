/**
 * Database configuration and connection pool.
 * Reads all settings from environment variables.
 */
const mysql = require("mysql2");

const pool = mysql.createPool({
  host: process.env.DBHOST,
  user: process.env.DBUSER,
  password: process.env.DBPASS || "",
  database: process.env.DBNAME,
  port: parseInt(process.env.DBPORT || "3306", 10),
  connectionLimit: 10,
  waitForConnections: true,
  multipleStatements: true,
});

/**
 * Promise-based query wrapper.
 * @param {string} sql
 * @param {Array} params
 * @returns {Promise<any>}
 */
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

const fs = require("fs");
const path = require("path");

/**
 * Ensure extra tables exist on startup.
 * Uses CREATE TABLE IF NOT EXISTS — safe to call repeatedly.
 */
async function ensureExtraTables() {
  try {
    const schemaPath = path.join(__dirname, "..", "schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");
    await query(schemaSql);
  } catch (err) {
    console.error("Failed to execute schema.sql:", err.message);
    throw err;
  }
}

module.exports = { pool, query, ensureExtraTables };
