/**
 * Kirana POS Backend — Entry Point
 *
 * Loads environment, configures middleware, mounts route modules, and starts the server.
 * All route logic lives in ./routes/*.js, keeping this file thin and readable.
 */
const dotenv = require("dotenv");
dotenv.config({ path: __dirname + "/.env" });

// ─── Validate required env vars ──────────────────────────────────────────────
const required = ["JWTSECRET", "DBHOST", "DBUSER", "DBNAME"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const { ensureExtraTables } = require("./config/database");

// ─── Express app ─────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 5000;

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const devOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:4173",
  "http://localhost:5000",
];

const corsOrigins = allowedOrigins.length ? allowedOrigins : devOrigins;

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));
app.options(/.*/, cors());

// ─── Body parsing ────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health check ────────────────────────────────────────────────────────────
app.get("/", (_req, res) => res.json({ status: "Kirana POS Backend v3" }));

app.get("/api/ping", (_req, res) => {
  const { pool } = require("./config/database");
  pool.query("SELECT 1", (err) => {
    if (err) return res.status(500).json({ status: "db_error", error: err.message });
    res.json({ status: "ok", time: new Date().toISOString() });
  });
});

// ─── Mount route modules ─────────────────────────────────────────────────────
app.use("/api", require("./routes/auth"));
app.use("/api/sales", require("./routes/sales"));
app.use("/api/customers", require("./routes/customers"));
app.use("/api/stocks", require("./routes/stocks"));
app.use("/api/coupons", require("./routes/coupons"));
app.use("/api/audit-logs", require("./routes/auditLogs"));
app.use("/api/daily-summary", require("./routes/dailySummary"));
app.use("/api/scan-bill", require("./routes/billScanner"));
app.use("/api/suppliers", require("./routes/suppliers"));
app.use("/api/bill-records", require("./routes/billRecords"));

// ─── Serve frontend static files (production) ───────────────────────────────
const distPath = path.join(__dirname, "../kirana-pos/dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// ─── Start server ────────────────────────────────────────────────────────────
ensureExtraTables()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`\nKirana POS Backend v3 -> http://0.0.0.0:${PORT}`);
      console.log(`DB   : ${process.env.DBNAME} @ ${process.env.DBHOST}:${process.env.DBPORT || "3306"}`);
      console.log(`CORS : ${corsOrigins.join(", ")}`);
      console.log(`AI   : ${process.env.GEMINIAPIKEY ? "Configured" : "Missing GEMINIAPIKEY"}`);
      console.log(`Mail : ${process.env.SMTPUSER ? "Configured" : "Not configured"}\n`);
    });
  })
  .catch((err) => {
    console.error("Startup DB init failed:", err.message);
    process.exit(1);
  });