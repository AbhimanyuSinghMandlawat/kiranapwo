const dotenv = require("dotenv");
const envPath = __dirname + "/.env";
const result = dotenv.config({ path: envPath, debug: true });

console.log("envPath:", envPath);
console.log("dotenv error:", result.error || null);
console.log("dotenv parsed:", result.parsed || null);
console.log("JWTSECRET:", process.env.JWTSECRET || null);

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { parseBill } = require("./billParser");

const app = express();

if (!process.env.JWTSECRET) throw new Error("JWTSECRET is required");
if (!process.env.DBHOST) throw new Error("DBHOST is required");
if (!process.env.DBUSER) throw new Error("DBUSER is required");
if (!process.env.DBNAME) throw new Error("DBNAME is required");

const JWTSECRET = process.env.JWTSECRET;
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const fallbackOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://localhost:4173",
  "http://localhost:5000",
  "https://kiranapwo.vercel.app"
];

const corsOrigins = allowedOrigins.length ? allowedOrigins : fallbackOrigins;

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.options("*", cors());

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const upload = multer({ dest: uploadsDir, limits: { fileSize: 10 * 1024 * 1024 } });

const db = mysql.createPool({
  host: process.env.DBHOST,
  user: process.env.DBUSER,
  password: process.env.DBPASS || "",
  database: process.env.DBNAME,
  port: parseInt(process.env.DBPORT || "3306", 10),
  connectionLimit: 10,
  waitForConnections: true,
  multipleStatements: true
});

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

async function ensureExtraTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS shops (
      id            INT           AUTO_INCREMENT PRIMARY KEY,
      shop_name     VARCHAR(150)  NOT NULL,
      owner_name    VARCHAR(120)  NOT NULL,
      owner_phone   VARCHAR(20)   NOT NULL UNIQUE,
      owner_email   VARCHAR(120),
      owner_mobile  VARCHAR(20),
      password_hash VARCHAR(255)  NOT NULL,
      created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id           VARCHAR(64)  PRIMARY KEY,
      shop_id      INT          NOT NULL,
      name         VARCHAR(120) NOT NULL,
      business_name VARCHAR(180),
      mobile       VARCHAR(15),
      gst_number   VARCHAR(20),
      address      TEXT,
      created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_sup_shop   (shop_id),
      INDEX idx_sup_name   (name),
      INDEX idx_sup_mobile (mobile),
      INDEX idx_sup_gst    (gst_number)
    );

    CREATE TABLE IF NOT EXISTS bill_records (
      id             VARCHAR(64)   PRIMARY KEY,
      shop_id        INT           NOT NULL,
      supplier_id    VARCHAR(64),
      bill_number    VARCHAR(60),
      bill_date      VARCHAR(20),
      total_amount   DECIMAL(12,2) DEFAULT 0,
      tax_amount     DECIMAL(12,2) DEFAULT 0,
      payment_method VARCHAR(30),
      items_json     JSON,
      scan_id        VARCHAR(64),
      created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_br_shop     (shop_id),
      INDEX idx_br_supplier (supplier_id),
      INDEX idx_br_date     (bill_date)
    );
  `);
}

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: "No token" });
  const token = header.split(" ")[1];
  jwt.verify(token, JWTSECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.shop = decoded;
    next();
  });
}

async function sendEmailNotification(subject, htmlBody) {
  try {
    if (!process.env.SMTPUSER || !process.env.SMTPPASS) {
      console.log("[EMAIL STUB] Would send:", subject);
      return { sent: false, reason: "SMTP not configured" };
    }
    const transporter = nodemailer.createTransport({
      host: process.env.SMTPHOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTPPORT || "587", 10),
      secure: false,
      auth: { user: process.env.SMTPUSER, pass: process.env.SMTPPASS }
    });
    await transporter.sendMail({
      from: `"Kirana POS" <${process.env.SMTPUSER}>`,
      to: process.env.NOTIFYEMAIL || process.env.SMTPUSER,
      subject,
      html: htmlBody
    });
    return { sent: true };
  } catch (err) {
    console.error("[EMAIL ERROR]", err.message);
    return { sent: false, reason: err.message };
  }
}

async function sendWhatsAppNotification(message) {
  try {
    if (!process.env.TWILIOSID || !process.env.TWILIOTOKEN) {
      console.log("[WHATSAPP STUB] Would send:", message.slice(0, 120));
      return { sent: false, reason: "Twilio not configured" };
    }
    return { sent: false, reason: "Twilio integration pending" };
  } catch (err) {
    return { sent: false, reason: err.message };
  }
}

// Health
app.get("/", (req, res) => res.json({ status: "Kirana POS Backend v3", corsOrigins }));

app.get("/api/ping", (req, res) => {
  db.query("SELECT 1", (err) => {
    if (err) return res.status(500).json({ status: "db_error", error: err.message });
    res.json({ status: "ok", time: new Date().toISOString() });
  });
});

// Rate limiter
const rateLimitMap = new Map();
function rateLimit(limit, windowMs) {
  return (req, res, next) => {
    const ip = req.ip || "unknown";
    const now = Date.now();
    let entry = rateLimitMap.get(ip);
    if (!entry || now > entry.resetTime) entry = { count: 0, resetTime: now + windowMs };
    entry.count += 1;
    rateLimitMap.set(ip, entry);
    if (entry.count > limit) return res.status(429).json({ message: "Too many requests." });
    next();
  };
}

const loginLimiter = rateLimit(10, 60 * 1000);
const scanLimiter = rateLimit(5, 60 * 1000);

// ─── REGISTER ────────────────────────────────────────────────────────────────
app.post("/api/register", async (req, res) => {
  console.log("[DEBUG] Registration request:", req.body);

  // Handle both shopname (new) and shop_name (old/alternate)
  const shopname = req.body.shopname || req.body.shop_name;
  const ownername = req.body.ownername || req.body.owner_name;
  const ownerphone = req.body.ownerphone || req.body.owner_phone;
  const owneremail = req.body.owneremail || req.body.owner_email;
  const ownermobile = req.body.ownermobile || req.body.owner_mobile;
  const password = req.body.password;

  if (!shopname || !ownername || !ownerphone || !password) {
    const missing = [];
    if (!shopname) missing.push("shopname");
    if (!ownername) missing.push("ownername");
    if (!ownerphone) missing.push("ownerphone");
    if (!password) missing.push("password");

    console.warn("[DEBUG] Registration failed - Missing fields:", missing);
    return res.status(400).json({
      message: "Missing required fields",
      missing,
      receivedKeys: Object.keys(req.body)
    });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO shops (shop_name, owner_name, owner_phone, owner_email, owner_mobile, password_hash)
       VALUES (?,?,?,?,?,?)`,
      [shopname, ownername, ownerphone, owneremail || null, ownermobile || null, hash]
    );

    res.json({ message: "Shop registered", shopid: result.insertId });
  } catch (err) {
    console.error("[REGISTER ERROR]", err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Phone number already registered" });
    }
    res.status(500).json({ message: "Database error during registration", detail: err.message });
  }
});

app.post("/api/auth/register", (req, res, next) => {
  req.url = "/api/register";
  app.handle(req, res, next);
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
app.post("/api/login", loginLimiter, async (req, res) => {
  const ownerphone = req.body.ownerphone || req.body.owner_phone;
  const password = req.body.password;

  if (!ownerphone || !password) {
    return res.status(400).json({ message: "Phone and password are required" });
  }

  try {
    const rows = await query("SELECT * FROM shops WHERE owner_phone = ?", [ownerphone]);
    if (rows.length === 0) return res.status(400).json({ message: "Shop not found" });

    const shop = rows[0];
    const valid = await bcrypt.compare(password, shop.password_hash);
    if (!valid) return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign({ shopid: shop.id }, JWTSECRET, { expiresIn: "7d" });
    const { password_hash, ...safeShop } = shop;
    res.json({ token, shop: safeShop });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", detail: err.message });
  }
});

// ─── SHOP PROFILE ─────────────────────────────────────────────────────────────
app.put("/api/shop-profile", auth, async (req, res) => {
  const shopid = req.shop.shopid;
  const { owneremail, ownermobile, shopname } = req.body;

  try {
    await query(
      `UPDATE shops SET
        owner_email  = COALESCE(?, owner_email),
        owner_mobile = COALESCE(?, owner_mobile),
        shop_name    = COALESCE(?, shop_name)
       WHERE id = ?`,
      [owneremail || null, ownermobile || null, shopname || null, shopid]
    );
    const rows = await query("SELECT * FROM shops WHERE id = ?", [shopid]);
    const { password_hash, ...safeShop } = rows[0];
    res.json({ message: "Profile updated", shop: safeShop });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "DB error", detail: err.message });
  }
});

// ─── SALES ────────────────────────────────────────────────────────────────────
app.post("/api/sales", auth, async (req, res) => {
  const s = req.body;
  const shopid = req.shop.shopid;

  if (!s.id || s.amount == null)
    return res.status(400).json({ message: "Missing sale id or amount" });

  try {
    await query(
      `INSERT INTO sales
       (id, shop_id, amount, payment_method, account_type, customer_name,
        customer_phone, transaction_type, stock_effect, liability_effect,
        reference_source, estimated_profit, sale_date, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
        amount           = VALUES(amount),
        payment_method   = VALUES(payment_method),
        account_type     = VALUES(account_type),
        customer_name    = VALUES(customer_name),
        customer_phone   = VALUES(customer_phone),
        transaction_type = VALUES(transaction_type),
        stock_effect     = VALUES(stock_effect),
        liability_effect = VALUES(liability_effect),
        reference_source = VALUES(reference_source),
        estimated_profit = VALUES(estimated_profit),
        sale_date        = VALUES(sale_date),
        notes            = VALUES(notes)`,
      [
        s.id, shopid, s.amount,
        s.paymentMethod || null, s.accountType || null,
        s.customerName || null, s.customerPhone || null,
        s.transactionType || "sale", s.stockEffect || null,
        s.liabilityEffect || null, s.referenceSource || null,
        s.estimatedProfit || 0,
        s.date || new Date().toLocaleDateString("en-IN"),
        s.notes || null
      ]
    );
    res.json({ message: "Sale synced", id: s.id });
  } catch (err) {
    console.error("sales sync error:", err);
    res.status(500).json({ message: "DB error", detail: err.message });
  }
});

app.get("/api/sales", auth, async (req, res) => {
  const shopid = req.shop.shopid;
  try {
    const rows = await query(
      "SELECT * FROM sales WHERE shop_id = ? ORDER BY created_at DESC", [shopid]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "DB error", detail: err.message });
  }
});

// ─── CUSTOMERS ───────────────────────────────────────────────────────────────
app.post("/api/customers", auth, async (req, res) => {
  const c = req.body;
  const shopid = req.shop.shopid;

  if (!c.id) return res.status(400).json({ message: "Missing customer id" });

  try {
    await query(
      `INSERT INTO customers
       (id, shop_id, display_name, phone, lifetime_spend, loyalty_level, visit_count, created_at)
       VALUES (?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
        display_name   = VALUES(display_name),
        phone          = VALUES(phone),
        lifetime_spend = VALUES(lifetime_spend),
        loyalty_level  = VALUES(loyalty_level),
        visit_count    = VALUES(visit_count)`,
      [
        c.id, shopid, c.displayName || null, c.phone || null,
        c.lifetimeSpend || 0, c.loyaltyLevel || "bronze",
        c.visitCount || 0,
        c.createdAt ? new Date(c.createdAt) : new Date()
      ]
    );
    res.json({ message: "Customer synced", id: c.id });
  } catch (err) {
    console.error("customer sync error:", err);
    res.status(500).json({ message: "DB error", detail: err.message });
  }
});

app.get("/api/customers", auth, async (req, res) => {
  const shopid = req.shop.shopid;
  try {
    const rows = await query(
      "SELECT * FROM customers WHERE shop_id = ? ORDER BY updated_at DESC, created_at DESC",
      [shopid]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "DB error", detail: err.message });
  }
});

// ─── STOCKS ───────────────────────────────────────────────────────────────────
app.post("/api/stocks", auth, async (req, res) => {
  const item = req.body;
  const shopid = req.shop.shopid;

  if (!item.id || !item.name)
    return res.status(400).json({ message: "Missing stock id or name" });

  try {
    await query(
      `INSERT INTO stocks
       (id, shop_id, name, price, cost_price, quantity, opening_quantity, is_opening, created_at)
       VALUES (?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
        name             = VALUES(name),
        price            = VALUES(price),
        cost_price       = VALUES(cost_price),
        quantity         = VALUES(quantity),
        opening_quantity = VALUES(opening_quantity),
        is_opening       = VALUES(is_opening)`,
      [
        item.id, shopid, item.name, item.price || 0,
        item.costPrice || 0, item.quantity || 0,
        item.openingQuantity || 0, item.isOpening ? 1 : 0,
        item.createdAt ? new Date(item.createdAt) : new Date()
      ]
    );
    res.json({ message: "Stock synced", id: item.id });
  } catch (err) {
    console.error("stock sync error:", err);
    res.status(500).json({ message: "DB error", detail: err.message });
  }
});

app.get("/api/stocks", auth, async (req, res) => {
  const shopid = req.shop.shopid;
  try {
    const rows = await query(
      "SELECT * FROM stocks WHERE shop_id = ? ORDER BY updated_at DESC, name ASC",
      [shopid]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "DB error", detail: err.message });
  }
});

// ─── COUPONS ──────────────────────────────────────────────────────────────────
app.post("/api/coupons", auth, async (req, res) => {
  const c = req.body;
  const shopid = req.shop.shopid;

  if (!c.id) return res.status(400).json({ message: "Missing coupon id" });

  const rawValue = parseFloat(c.value) || 0;
  const safeValue = c.type === "percent" ? Math.min(rawValue, 50) : Math.min(rawValue, 500);

  try {
    await query(
      `INSERT INTO coupons
       (id, shop_id, customer_id, code, title, type, value, min_purchase,
        loyalty_required, used, active, issued_at, expires_at, expiry_date)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
        customer_id      = VALUES(customer_id),
        code             = VALUES(code),
        title            = VALUES(title),
        type             = VALUES(type),
        value            = VALUES(value),
        min_purchase     = VALUES(min_purchase),
        loyalty_required = VALUES(loyalty_required),
        used             = VALUES(used),
        active           = VALUES(active),
        issued_at        = VALUES(issued_at),
        expires_at       = VALUES(expires_at),
        expiry_date      = VALUES(expiry_date)`,
      [
        c.id, shopid, c.customerId || null, c.code || null,
        c.title || null, c.type || "discount", safeValue,
        c.minPurchase || 0, c.loyaltyRequired || "bronze",
        c.used ? 1 : 0, c.active !== false ? 1 : 0,
        c.issuedAt ? new Date(c.issuedAt) : new Date(),
        c.expiresAt ? new Date(c.expiresAt) : null,
        c.expiryDate || null
      ]
    );
    res.json({ message: "Coupon synced", id: c.id });
  } catch (err) {
    console.error("coupon sync error:", err);
    res.status(500).json({ message: "DB error", detail: err.message });
  }
});

app.get("/api/coupons", auth, async (req, res) => {
  const shopid = req.shop.shopid;
  try {
    const rows = await query(
      "SELECT * FROM coupons WHERE shop_id = ? ORDER BY issued_at DESC", [shopid]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "DB error", detail: err.message });
  }
});

// ─── AUDIT LOGS ───────────────────────────────────────────────────────────────
app.post("/api/audit-logs", auth, async (req, res) => {
  const log = req.body;
  const shopid = req.shop.shopid;

  if (!log.id || !log.action)
    return res.status(400).json({ message: "Missing log id or action" });

  try {
    await query(
      `INSERT INTO audit_logs
       (id, shop_id, actor_id, actor_name, actor_role, action, module, target_id, metadata, log_date, timestamp)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
        actor_id   = VALUES(actor_id),
        actor_name = VALUES(actor_name),
        actor_role = VALUES(actor_role),
        module     = VALUES(module),
        target_id  = VALUES(target_id),
        metadata   = VALUES(metadata),
        log_date   = VALUES(log_date),
        timestamp  = VALUES(timestamp)`,
      [
        log.id, shopid, log.actorId || null,
        log.actorName || "System", log.actorRole || "system",
        log.action, log.module || null, log.targetId || null,
        JSON.stringify(log.metadata || {}),
        log.date || new Date().toLocaleDateString("en-IN"),
        log.timestamp || Date.now()
      ]
    );
    res.json({ message: "Audit log synced", id: log.id });
  } catch (err) {
    console.error("audit log sync error:", err);
    res.status(500).json({ message: "DB error", detail: err.message });
  }
});

app.get("/api/audit-logs", auth, async (req, res) => {
  const shopid = req.shop.shopid;
  try {
    const rows = await query(
      "SELECT * FROM audit_logs WHERE shop_id = ? ORDER BY timestamp DESC LIMIT 500",
      [shopid]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "DB error", detail: err.message });
  }
});

// ─── DAILY SUMMARY ────────────────────────────────────────────────────────────
app.post("/api/daily-summary", auth, async (req, res) => {
  const s = req.body;
  const shopid = req.shop.shopid;

  if (!s.id || !s.summaryDate)
    return res.status(400).json({ message: "Missing summary id or date" });

  try {
    await query(
      `INSERT INTO daily_summaries
       (id, shop_id, summary_date, total_sales, total_profit, transactions,
        credit_given, cash_total, upi_total, card_total, top_items, breakdown)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
        total_sales  = VALUES(total_sales),
        total_profit = VALUES(total_profit),
        transactions = VALUES(transactions),
        credit_given = VALUES(credit_given),
        cash_total   = VALUES(cash_total),
        upi_total    = VALUES(upi_total),
        card_total   = VALUES(card_total),
        top_items    = VALUES(top_items),
        breakdown    = VALUES(breakdown)`,
      [
        s.id, shopid, s.summaryDate,
        s.totalSales || 0, s.profit || 0, s.transactions || 0,
        s.creditGiven || 0, s.cashTotal || 0, s.upiTotal || 0, s.cardTotal || 0,
        JSON.stringify(s.topItems || []),
        JSON.stringify(s.breakdown || {})
      ]
    );

    const shopRows = await query("SELECT * FROM shops WHERE id = ?", [shopid]);
    const shop = shopRows[0] || {};

    const emailResult = await sendEmailNotification(
      `Daily Summary - ${s.summaryDate} - ${shop.shop_name || "Your Shop"}`,
      buildSummaryEmailHTML(s, shop)
    );
    const waResult = await sendWhatsAppNotification(buildSummaryWhatsApp(s, shop));

    if (emailResult.sent)
      await query("UPDATE daily_summaries SET sent_email = 1 WHERE id = ?", [s.id]);
    if (waResult.sent)
      await query("UPDATE daily_summaries SET sent_whatsapp = 1 WHERE id = ?", [s.id]);

    res.json({ message: "Daily summary saved", id: s.id, emailSent: emailResult.sent, whatsappSent: waResult.sent });
  } catch (err) {
    console.error("daily summary error:", err);
    res.status(500).json({ message: "DB error", detail: err.message });
  }
});

app.get("/api/daily-summary", auth, async (req, res) => {
  const shopid = req.shop.shopid;
  const date = req.query.date || new Date().toLocaleDateString("en-IN");
  try {
    const rows = await query(
      "SELECT * FROM daily_summaries WHERE shop_id = ? AND summary_date = ?",
      [shopid, date]
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ message: "DB error", detail: err.message });
  }
});

function buildSummaryEmailHTML(s, shop) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;background:#f9f9f9;border-radius:10px">
      <h2 style="color:#2e7d32">Daily Business Summary</h2>
      <h3>${shop.shop_name || "Your Kirana Shop"} - ${s.summaryDate}</h3>
      <table style="width:100%;border-collapse:collapse">
        <tr style="background:#e8f5e9"><td style="padding:8px"><strong>Total Sales</strong></td><td>Rs. ${(s.totalSales || 0).toFixed(2)}</td></tr>
        <tr><td style="padding:8px"><strong>Today's Profit</strong></td><td>Rs. ${(s.profit || 0).toFixed(2)}</td></tr>
        <tr style="background:#e8f5e9"><td style="padding:8px"><strong>Transactions</strong></td><td>${s.transactions || 0}</td></tr>
        <tr><td style="padding:8px"><strong>Credit Given</strong></td><td>Rs. ${(s.creditGiven || 0).toFixed(2)}</td></tr>
        <tr style="background:#e8f5e9"><td style="padding:8px"><strong>Cash Sales</strong></td><td>Rs. ${(s.cashTotal || 0).toFixed(2)}</td></tr>
        <tr><td style="padding:8px"><strong>UPI Sales</strong></td><td>Rs. ${(s.upiTotal || 0).toFixed(2)}</td></tr>
        <tr style="background:#e8f5e9"><td style="padding:8px"><strong>Card Sales</strong></td><td>Rs. ${(s.cardTotal || 0).toFixed(2)}</td></tr>
      </table>
      <p style="color:#888;font-size:12px;margin-top:20px">Sent automatically by Kirana POS.</p>
    </div>`;
}

function buildSummaryWhatsApp(s, shop) {
  return `Daily Summary - ${s.summaryDate}
Shop: ${shop.shop_name || "Your Shop"}
Total Sales: Rs. ${(s.totalSales || 0).toFixed(2)}
Profit: Rs. ${(s.profit || 0).toFixed(2)}
Transactions: ${s.transactions || 0}
Cash: Rs. ${(s.cashTotal || 0).toFixed(2)} | UPI: Rs. ${(s.upiTotal || 0).toFixed(2)} | Card: Rs. ${(s.cardTotal || 0).toFixed(2)}`;
}

// ─── BILL SCANNER ─────────────────────────────────────────────────────────────
app.post("/api/scan-bill", auth, scanLimiter, upload.single("bill"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No image uploaded" });

  const filePath = req.file.path;
  try {
    const result = await parseBill(filePath);

    if (!result.readable || result.rawOcrLines < 3) {
      fs.unlink(filePath, () => { });
      return res.status(422).json({ message: "Could not read text from image.", errorCode: "IMAGE_UNREADABLE" });
    }

    if (result.inventoryitems.length === 0 && result.confidence < 20) {
      fs.unlink(filePath, () => { });
      return res.status(422).json({ message: "Could not extract bill data.", errorCode: "LOW_CONFIDENCE" });
    }

    const scanId = crypto.randomUUID();
    query(
      `INSERT INTO bill_scans
       (id, shop_id, gst_number, bill_number, supplier_name, supplier_mobile, raw_text, items_json, confidence)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        scanId, req.shop.shopid,
        result.supplier.gstnumber || null,
        result.bill.billnumber || null,
        result.supplier.name || null,
        result.supplier.mobile || null,
        `OCR:${result.rawOcrLines} lines`,
        JSON.stringify(result.inventoryitems || []),
        result.confidence || 0
      ]
    ).catch((e) => console.warn("[BILL SCAN] DB save non-fatal:", e.message));

    fs.unlink(filePath, () => { });
    const { rawOcrLines, readable, ...clean } = result;
    res.json({ ...clean, scanId });
  } catch (err) {
    fs.unlink(filePath, () => { });
    res.status(500).json({ message: `Scan failed: ${err.message}`, errorCode: "SCAN_FAILED" });
  }
});

// ─── SUPPLIERS ────────────────────────────────────────────────────────────────
app.post("/api/suppliers", auth, async (req, res) => {
  const s = req.body;
  const shopid = req.shop.shopid;
  if (!s.name) return res.status(400).json({ message: "Supplier name required" });

  try {
    const id = s.id || crypto.randomUUID();
    await query(
      `INSERT INTO suppliers (id, shop_id, name, business_name, mobile, gst_number, address)
       VALUES (?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
        name          = VALUES(name),
        business_name = VALUES(business_name),
        mobile        = VALUES(mobile),
        gst_number    = VALUES(gst_number),
        address       = VALUES(address)`,
      [id, shopid, s.name, s.businessname || null, s.mobile || null, s.gstnumber || null, s.address || null]
    );
    res.json({ message: "Supplier saved", id });
  } catch (err) {
    console.error("[SUPPLIER]", err);
    res.status(500).json({ message: "DB error", detail: err.message });
  }
});

app.get("/api/suppliers", auth, async (req, res) => {
  const shopid = req.shop.shopid;
  try {
    const rows = await query("SELECT * FROM suppliers WHERE shop_id = ? ORDER BY name ASC", [shopid]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "DB error", detail: err.message });
  }
});

app.get("/api/suppliers/:id", auth, async (req, res) => {
  const shopid = req.shop.shopid;
  try {
    const rows = await query("SELECT * FROM suppliers WHERE id = ? AND shop_id = ?", [req.params.id, shopid]);
    rows.length ? res.json(rows[0]) : res.status(404).json({ message: "Not found" });
  } catch (err) {
    res.status(500).json({ message: "DB error", detail: err.message });
  }
});

// ─── BILL RECORDS ─────────────────────────────────────────────────────────────
app.post("/api/bill-records", auth, async (req, res) => {
  const b = req.body;
  const shopid = req.shop.shopid;
  try {
    const id = b.id || crypto.randomUUID();
    await query(
      `INSERT INTO bill_records
       (id, shop_id, supplier_id, bill_number, bill_date, total_amount, tax_amount, payment_method, items_json, scan_id)
       VALUES (?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
        supplier_id    = VALUES(supplier_id),
        bill_number    = VALUES(bill_number),
        bill_date      = VALUES(bill_date),
        total_amount   = VALUES(total_amount),
        tax_amount     = VALUES(tax_amount),
        payment_method = VALUES(payment_method),
        items_json     = VALUES(items_json),
        scan_id        = VALUES(scan_id)`,
      [
        id, shopid, b.supplierid || null, b.billnumber || null,
        b.billdate || null, b.totalamount || 0, b.taxamount || 0,
        b.paymentmethod || null, JSON.stringify(b.items || []), b.scanid || null
      ]
    );
    res.json({ message: "Bill record saved", id });
  } catch (err) {
    console.error("[BILL RECORD]", err);
    res.status(500).json({ message: "DB error", detail: err.message });
  }
});

app.get("/api/bill-records", auth, async (req, res) => {
  const shopid = req.shop.shopid;
  try {
    const rows = await query(
      `SELECT br.*, s.name AS supplier_name, s.mobile AS supplier_mobile
       FROM bill_records br
       LEFT JOIN suppliers s ON br.supplier_id = s.id
       WHERE br.shop_id = ?
       ORDER BY br.created_at DESC LIMIT 200`,
      [shopid]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "DB error", detail: err.message });
  }
});

// Serve static files from the React app
const distPath = path.join(__dirname, "../kirana-pos/dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  console.log(`[INFO] Serving frontend from ${distPath}`);

  // Catch-all for SPA routing
  app.get("/{*any}", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  console.log(`[WARN] Frontend dist folder not found at ${distPath}. Run 'npm run build' in the frontend folder if you want the backend to serve it.`);
}

// ─── START ────────────────────────────────────────────────────────────────────
ensureExtraTables()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`\nKirana POS Backend v3 -> http://0.0.0.0:${PORT}`);
      console.log(`DB   : ${process.env.DBNAME} @ ${process.env.DBHOST}:${process.env.DBPORT || "3306"}`);
      console.log(`CORS : ${corsOrigins.join(", ")}`);
      console.log(`AI   : ${process.env.GEMINIAPIKEY ? "Configured" : "Missing GEMINIAPIKEY"}`);
      console.log(`Mail : ${process.env.SMTPUSER ? "Configured" : "Stub"}\n`);
    });
  })
  .catch((err) => {
    console.error("Startup DB init failed:", err.message);
    process.exit(1);
  });