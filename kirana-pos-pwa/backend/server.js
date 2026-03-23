require("dotenv").config();

const express  = require("express");
const cors     = require("cors");
const mysql    = require("mysql2");
const jwt      = require("jsonwebtoken");
const bcrypt   = require("bcryptjs");
const multer   = require("multer");
const path     = require("path");
const fs       = require("fs");
const nodemailer = require("nodemailer");

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:4173",
    "http://localhost:5000"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json({ limit: "50mb" }));

const JWT_SECRET = process.env.JWT_SECRET || "kirana_super_secret_change_me";
const PORT       = process.env.PORT || 5000;

/* ===============================
   MULTER – file uploads (bill scanner)
=============================== */
const upload = multer({
  dest: path.join(__dirname, "uploads"),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB max
});

if (!fs.existsSync(path.join(__dirname, "uploads"))) {
  fs.mkdirSync(path.join(__dirname, "uploads"));
}

/* ===============================
   MYSQL CONNECTION POOL
=============================== */
const db = mysql.createPool({
  host:            process.env.DB_HOST || "localhost",
  user:            process.env.DB_USER || "root",
  password:        process.env.DB_PASS || "",
  database:        process.env.DB_NAME || "kirana_pos",
  connectionLimit: 10,
  waitForConnections: true
});

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

/* ===============================
   AUTH MIDDLEWARE
=============================== */
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: "No token" });
  const token = header.split(" ")[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.shop = decoded;
    next();
  });
}

/* ===============================
   EMAIL NOTIFICATION (STUB)
   TODO: Fill in SMTP credentials in .env:
     SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, NOTIFY_EMAIL
=============================== */
async function sendEmailNotification(subject, htmlBody) {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log("[EMAIL STUB] Would send email:", subject);
      console.log("[EMAIL STUB] Body preview:", htmlBody.substring(0, 200));
      return { sent: false, reason: "No SMTP credentials configured" };
    }
    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST || "smtp.gmail.com",
      port:   parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    await transporter.sendMail({
      from:    `"Kirana POS" <${process.env.SMTP_USER}>`,
      to:      process.env.NOTIFY_EMAIL || process.env.SMTP_USER,
      subject,
      html:    htmlBody
    });
    return { sent: true };
  } catch (err) {
    console.error("[EMAIL ERROR]", err.message);
    return { sent: false, reason: err.message };
  }
}

/* ===============================
   WHATSAPP NOTIFICATION (STUB)
   TODO: Fill in Twilio credentials in .env:
     TWILIO_SID, TWILIO_TOKEN, TWILIO_WHATSAPP_FROM, NOTIFY_WHATSAPP_TO
=============================== */
async function sendWhatsAppNotification(message) {
  try {
    if (!process.env.TWILIO_SID || !process.env.TWILIO_TOKEN) {
      console.log("[WHATSAPP STUB] Would send WhatsApp:", message.substring(0, 150));
      return { sent: false, reason: "No Twilio credentials configured" };
    }
    // TODO: Uncomment when credentials are available
    // const client = require("twilio")(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
    // await client.messages.create({
    //   body: message,
    //   from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
    //   to:   `whatsapp:${process.env.NOTIFY_WHATSAPP_TO}`
    // });
    return { sent: false, reason: "Twilio integration pending – add credentials to .env" };
  } catch (err) {
    console.error("[WHATSAPP ERROR]", err.message);
    return { sent: false, reason: err.message };
  }
}

/* ===============================
   HEALTH CHECK
=============================== */
app.get("/", (req, res) => res.send("Kirana POS Backend v2 Running"));

app.get("/api/ping", (req, res) => {
  db.query("SELECT 1", (err) => {
    if (err) return res.status(500).json({ status: "db_error", error: err.message });
    res.json({ status: "ok", time: new Date().toISOString() });
  });
});

/* ===============================
   REGISTER SHOP
=============================== */
app.post("/api/register", async (req, res) => {
  const { shop_name, owner_name, owner_phone, owner_email, owner_mobile, password } = req.body;

  if (!shop_name || !owner_name || !owner_phone || !password)
    return res.status(400).json({ message: "Missing required fields" });

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO shops
         (shop_name, owner_name, owner_phone, owner_email, owner_mobile, password_hash)
       VALUES (?,?,?,?,?,?)`,
      [shop_name, owner_name, owner_phone, owner_email || null, owner_mobile || null, hash]
    );
    res.json({ message: "Shop registered", shop_id: result.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(409).json({ message: "Phone already registered" });
    console.error(err);
    res.status(500).json({ message: "Database error" });
  }
});

// Alias: /api/auth/register → same as /api/register
app.post("/api/auth/register", (req, res, next) => {
  req.url = "/api/register";
  app.handle(req, res, next);
});


/* ===============================
   LOGIN
=============================== */
app.post("/api/login", async (req, res) => {
  const { owner_phone, password } = req.body;
  try {
    const rows = await query("SELECT * FROM shops WHERE owner_phone = ?", [owner_phone]);
    if (rows.length === 0)
      return res.status(400).json({ message: "Shop not found" });

    const shop  = rows[0];
    const valid = await bcrypt.compare(password, shop.password_hash);
    if (!valid)
      return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign({ shop_id: shop.id }, JWT_SECRET, { expiresIn: "7d" });
    const { password_hash, ...safeShop } = shop;
    res.json({ token, shop: safeShop });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ===============================
   SHOP PROFILE UPDATE (owner only)
=============================== */
app.put("/api/shop-profile", auth, async (req, res) => {
  const shop_id = req.shop.shop_id;
  const { owner_email, owner_mobile, shop_name } = req.body;
  try {
    await query(
      `UPDATE shops SET
         owner_email  = COALESCE(?, owner_email),
         owner_mobile = COALESCE(?, owner_mobile),
         shop_name    = COALESCE(?, shop_name)
       WHERE id = ?`,
      [owner_email || null, owner_mobile || null, shop_name || null, shop_id]
    );
    const rows = await query("SELECT * FROM shops WHERE id = ?", [shop_id]);
    const { password_hash, ...safeShop } = rows[0];
    res.json({ message: "Profile updated", shop: safeShop });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "DB error", detail: err.message });
  }
});

/* ===============================
   SALES  (upsert – idempotent)
=============================== */
app.post("/api/sales", auth, async (req, res) => {
  const s       = req.body;
  const shop_id = req.shop.shop_id;

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
         estimated_profit = VALUES(estimated_profit)`,
      [
        s.id, shop_id, s.amount,
        s.paymentMethod   || null,
        s.accountType     || null,
        s.customerName    || null,
        s.customerPhone   || null,
        s.transactionType || "sale",
        s.stockEffect     || null,
        s.liabilityEffect || null,
        s.referenceSource || null,
        s.estimatedProfit || 0,
        s.date            || new Date().toLocaleDateString(),
        s.notes           || null
      ]
    );
    res.json({ message: "Sale synced", id: s.id });
  } catch (err) {
    console.error("sales sync error:", err);
    res.status(500).json({ message: "DB error", detail: err.message });
  }
});

app.get("/api/sales", auth, async (req, res) => {
  const shop_id = req.shop.shop_id;
  try {
    const rows = await query(
      "SELECT * FROM sales WHERE shop_id=? ORDER BY created_at DESC", [shop_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "DB error" });
  }
});

/* ===============================
   CUSTOMERS  (upsert)
=============================== */
app.post("/api/customers", auth, async (req, res) => {
  const c       = req.body;
  const shop_id = req.shop.shop_id;

  if (!c.id) return res.status(400).json({ message: "Missing customer id" });

  try {
    await query(
      `INSERT INTO customers
         (id, shop_id, display_name, phone, lifetime_spend,
          loyalty_level, visit_count, created_at)
       VALUES (?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         display_name   = VALUES(display_name),
         phone          = VALUES(phone),
         lifetime_spend = VALUES(lifetime_spend),
         loyalty_level  = VALUES(loyalty_level),
         visit_count    = VALUES(visit_count)`,
      [
        c.id, shop_id,
        c.displayName   || null,
        c.phone         || null,
        c.lifetimeSpend || 0,
        c.loyaltyLevel  || "bronze",
        c.visitCount    || 0,
        c.createdAt     ? new Date(c.createdAt) : new Date()
      ]
    );
    res.json({ message: "Customer synced", id: c.id });
  } catch (err) {
    console.error("customer sync error:", err);
    res.status(500).json({ message: "DB error", detail: err.message });
  }
});

/* ===============================
   STOCKS  (upsert)
=============================== */
app.post("/api/stocks", auth, async (req, res) => {
  const item    = req.body;
  const shop_id = req.shop.shop_id;

  if (!item.id || !item.name)
    return res.status(400).json({ message: "Missing stock id or name" });

  try {
    await query(
      `INSERT INTO stocks
         (id, shop_id, name, price, cost_price, quantity,
          opening_quantity, is_opening, created_at)
       VALUES (?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         name             = VALUES(name),
         price            = VALUES(price),
         cost_price       = VALUES(cost_price),
         quantity         = VALUES(quantity)`,
      [
        item.id, shop_id,
        item.name,
        item.price           || 0,
        item.costPrice       || 0,
        item.quantity        || 0,
        item.openingQuantity || 0,
        item.isOpening       || false,
        item.createdAt       ? new Date(item.createdAt) : new Date()
      ]
    );
    res.json({ message: "Stock synced", id: item.id });
  } catch (err) {
    console.error("stock sync error:", err);
    res.status(500).json({ message: "DB error", detail: err.message });
  }
});

/* ===============================
   COUPONS  (upsert)
=============================== */
app.post("/api/coupons", auth, async (req, res) => {
  const c       = req.body;
  const shop_id = req.shop.shop_id;

  if (!c.id) return res.status(400).json({ message: "Missing coupon id" });

  // Cap discount: max 50% for percent-type, max ₹500 for flat-₹ type
  const rawValue  = parseFloat(c.value) || 0;
  const safeValue = (c.type === "percent")
    ? Math.min(rawValue, 50)   // max 50% off
    : Math.min(rawValue, 500); // max ₹500 flat off

  try {
    await query(
      `INSERT INTO coupons
         (id, shop_id, customer_id, code, title, type, value,
          min_purchase, loyalty_required, used, active, issued_at, expires_at, expiry_date)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         used       = VALUES(used),
         active     = VALUES(active),
         expires_at = VALUES(expires_at)`,
      [
        c.id, shop_id,
        c.customerId       || null,
        c.code             || null,
        c.title            || null,
        c.type             || "discount",
        safeValue,
        c.minPurchase      || 0,
        c.loyaltyRequired  || "bronze",
        c.used             || false,
        c.active !== false,
        c.issuedAt         ? new Date(c.issuedAt)  : new Date(),
        c.expiresAt        ? new Date(c.expiresAt) : null,
        c.expiryDate       || null
      ]
    );
    res.json({ message: "Coupon synced", id: c.id });
  } catch (err) {
    console.error("coupon sync error:", err);
    res.status(500).json({ message: "DB error", detail: err.message });
  }
});

/* ===============================
   AUDIT LOGS  (upsert)
=============================== */
app.post("/api/audit-logs", auth, async (req, res) => {
  const log     = req.body;
  const shop_id = req.shop.shop_id;

  if (!log.id || !log.action)
    return res.status(400).json({ message: "Missing log id or action" });

  try {
    await query(
      `INSERT INTO audit_logs
         (id, shop_id, actor_id, actor_name, actor_role,
          action, module, target_id, metadata, log_date, timestamp)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         metadata = VALUES(metadata)`,
      [
        log.id, shop_id,
        log.actorId   || null,
        log.actorName || "System",
        log.actorRole || "system",
        log.action,
        log.module    || null,
        log.targetId  || null,
        JSON.stringify(log.metadata || {}),
        log.date      || new Date().toLocaleDateString(),
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
  const shop_id = req.shop.shop_id;
  try {
    const rows = await query(
      "SELECT * FROM audit_logs WHERE shop_id=? ORDER BY timestamp DESC LIMIT 500",
      [shop_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "DB error" });
  }
});

/* ===============================
   DAILY SUMMARY  (save + notify)
=============================== */
app.post("/api/daily-summary", auth, async (req, res) => {
  const s       = req.body;
  const shop_id = req.shop.shop_id;

  if (!s.id || !s.summaryDate)
    return res.status(400).json({ message: "Missing summary id or date" });

  try {
    await query(
      `INSERT INTO daily_summaries
         (id, shop_id, summary_date, total_sales, total_profit, transactions,
          credit_given, cash_total, upi_total, card_total, top_items, breakdown)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         total_sales   = VALUES(total_sales),
         total_profit  = VALUES(total_profit),
         transactions  = VALUES(transactions),
         credit_given  = VALUES(credit_given),
         cash_total    = VALUES(cash_total),
         upi_total     = VALUES(upi_total),
         card_total    = VALUES(card_total),
         top_items     = VALUES(top_items),
         breakdown     = VALUES(breakdown)`,
      [
        s.id, shop_id, s.summaryDate,
        s.totalSales   || 0,
        s.profit       || 0,
        s.transactions || 0,
        s.creditGiven  || 0,
        s.cashTotal    || 0,
        s.upiTotal     || 0,
        s.cardTotal    || 0,
        JSON.stringify(s.topItems  || []),
        JSON.stringify(s.breakdown || {})
      ]
    );

    // Send notifications
    const shopRows = await query("SELECT * FROM shops WHERE id = ?", [shop_id]);
    const shop     = shopRows[0] || {};

    const emailBody = buildSummaryEmailHTML(s, shop);
    const emailResult = await sendEmailNotification(
      `📊 Daily Summary – ${s.summaryDate} – ${shop.shop_name || "Your Shop"}`,
      emailBody
    );

    const waMessage = buildSummaryWhatsApp(s, shop);
    const waResult  = await sendWhatsAppNotification(waMessage);

    // Update sent flags if successful
    if (emailResult.sent) {
      await query("UPDATE daily_summaries SET sent_email=1 WHERE id=?", [s.id]);
    }
    if (waResult.sent) {
      await query("UPDATE daily_summaries SET sent_whatsapp=1 WHERE id=?", [s.id]);
    }

    res.json({
      message: "Daily summary saved",
      id: s.id,
      emailSent: emailResult.sent,
      whatsappSent: waResult.sent
    });
  } catch (err) {
    console.error("daily summary error:", err);
    res.status(500).json({ message: "DB error", detail: err.message });
  }
});

app.get("/api/daily-summary", auth, async (req, res) => {
  const shop_id = req.shop.shop_id;
  const date    = req.query.date || new Date().toLocaleDateString();
  try {
    const rows = await query(
      "SELECT * FROM daily_summaries WHERE shop_id=? AND summary_date=?",
      [shop_id, date]
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ message: "DB error" });
  }
});

function buildSummaryEmailHTML(s, shop) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;background:#f9f9f9;border-radius:10px">
      <h2 style="color:#2e7d32">📊 Daily Business Summary</h2>
      <h3>${shop.shop_name || "Your Kirana Shop"} — ${s.summaryDate}</h3>
      <table style="width:100%;border-collapse:collapse">
        <tr style="background:#e8f5e9"><td style="padding:8px"><strong>Total Sales</strong></td><td>₹${(s.totalSales||0).toFixed(2)}</td></tr>
        <tr><td style="padding:8px"><strong>Today's Profit</strong></td><td>₹${(s.profit||0).toFixed(2)}</td></tr>
        <tr style="background:#e8f5e9"><td style="padding:8px"><strong>Transactions</strong></td><td>${s.transactions||0}</td></tr>
        <tr><td style="padding:8px"><strong>Credit Given</strong></td><td>₹${(s.creditGiven||0).toFixed(2)}</td></tr>
        <tr style="background:#e8f5e9"><td style="padding:8px"><strong>Cash Sales</strong></td><td>₹${(s.cashTotal||0).toFixed(2)}</td></tr>
        <tr><td style="padding:8px"><strong>UPI Sales</strong></td><td>₹${(s.upiTotal||0).toFixed(2)}</td></tr>
        <tr style="background:#e8f5e9"><td style="padding:8px"><strong>Card Sales</strong></td><td>₹${(s.cardTotal||0).toFixed(2)}</td></tr>
      </table>
      ${(s.topItems||[]).length > 0 ? `
        <h4>🏆 Top Selling Items</h4>
        <ul>${(s.topItems||[]).map(i => `<li>${i.name} — ${i.qtySold} units sold</li>`).join("")}</ul>
      ` : ""}
      <p style="color:#888;font-size:12px;margin-top:20px">Sent automatically by Kirana POS at shop closing time.</p>
    </div>
  `;
}

function buildSummaryWhatsApp(s, shop) {
  return `📊 *Daily Summary* — ${s.summaryDate}
🏪 ${shop.shop_name || "Your Shop"}
━━━━━━━━━━━━━━━
💰 Total Sales: ₹${(s.totalSales||0).toFixed(2)}
📈 Profit: ₹${(s.profit||0).toFixed(2)}
🛒 Transactions: ${s.transactions||0}
💳 Credit Given: ₹${(s.creditGiven||0).toFixed(2)}
━━━━━━━━━━━━━━━
Cash: ₹${(s.cashTotal||0).toFixed(2)} | UPI: ₹${(s.upiTotal||0).toFixed(2)} | Card: ₹${(s.cardTotal||0).toFixed(2)}
Have a great evening! 🙏`;
}

/* ===============================
   AI BILL SCANNER  (Tesseract OCR + Smart Parsing)
=============================== */
app.post("/api/scan-bill", auth, upload.single("bill"), async (req, res) => {
  if (!req.file)
    return res.status(400).json({ message: "No image uploaded" });

  const filePath = req.file.path;

  try {
    // Dynamically import Tesseract.js (ESM compatible)
    const Tesseract = require("tesseract.js");

    console.log("[BILL SCAN] Starting OCR on:", req.file.originalname);

    const { data } = await Tesseract.recognize(filePath, "eng", {
      logger: m => {
        if (m.status === "recognizing text") {
          process.stdout.write(`\r[OCR] Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });

    console.log("\n[BILL SCAN] OCR complete. Parsing...");

    const rawText = data.text;
    const result  = parseBillText(rawText);

    // Save the scan result to DB
    const shop_id = req.shop.shop_id;
    const scanId  = require("crypto").randomUUID();

    await query(
      `INSERT INTO bill_scans
         (id, shop_id, gst_number, bill_number, supplier_name,
          supplier_mobile, raw_text, items_json, confidence)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        scanId, shop_id,
        result.gstNumber      || null,
        result.billNumber     || null,
        result.supplierName   || null,
        result.supplierMobile || null,
        rawText,
        JSON.stringify(result.items),
        result.confidence
      ]
    );

    // Clean up uploaded file
    fs.unlink(filePath, () => {});

    res.json({
      ...result,
      scanId,
      rawText: rawText.substring(0, 500) // send preview only
    });

  } catch (err) {
    console.error("[BILL SCAN ERROR]", err);
    fs.unlink(filePath, () => {});
    res.status(500).json({ message: "OCR failed", detail: err.message });
  }
});

/**
 * parseBillText – Intelligently extracts structured data from OCR'd bill text.
 * Handles most Indian bill/invoice formats.
 */
function parseBillText(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  // ── GST Number (15-char alphanumeric starting with 2 digits) ──
  const gstMatch = text.match(/\b(\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1})\b/i);
  const gstNumber = gstMatch ? gstMatch[1].toUpperCase() : null;

  // ── Bill / Invoice Number ──
  const billMatch = text.match(/(?:bill|invoice|inv|receipt)\s*(?:no|num|number|#)?[\s:.]*([A-Z0-9\-\/]+)/i);
  const billNumber = billMatch ? billMatch[1].trim() : null;

  // ── Supplier Name (usually first prominent line or after "M/s", "From:", "Sold by") ──
  let supplierName = null;
  const supplierPatterns = [
    /(?:m\/s|from|sold by|supplier|vendor|bill from|billed by)[:\s]+([A-Za-z\s&.,']+)/i,
    /^([A-Z][A-Z\s&.']+(?:STORE|MART|TRADERS|ENTERPRISES|WHOLESALE|DISTRIBUTOR|AGENCY|INDUSTRIES|CO\.|LTD\.|PVT\.?))/m
  ];
  for (const p of supplierPatterns) {
    const m = text.match(p);
    if (m) { supplierName = m[1].trim().substring(0, 80); break; }
  }
  if (!supplierName && lines.length > 0) {
    // Fallback: first non-numeric line that looks like a business name
    const candidate = lines.find(l => l.length > 3 && l.length < 60 && /[A-Za-z]/.test(l) && !/^(date|tel|mob|phone|gst|invoice)/i.test(l));
    if (candidate) supplierName = candidate;
  }

  // ── Supplier Mobile ──
  const mobileMatch = text.match(/(?:mob(?:ile)?|tel|ph(?:one)?|contact)[:\s]*(\+?91[\-\s]?)?([6-9]\d{9})/i);
  const supplierMobile = mobileMatch ? mobileMatch[2] : null;

  // ── Item Extraction ──
  // Strategy: look for lines with a price pattern at the end (common in bills)
  // Patterns: "Sugar 5kg  2  45.00  90.00"  or "Rice   10  ₹35   ₹350"
  const items = [];
  const itemLineRegex = /^(.+?)\s+(\d+(?:\.\d+)?)\s+[\₹Rs.]?\s*(\d+(?:\.\d+)?)\s+[\₹Rs.]?\s*(\d+(?:\.\d+)?)$/;
  const simpleItemRegex = /^(.+?)\s+(?:×|x|\*|qty[\s:]*)?(\d+(?:\.\d+)?)\s+[\₹Rs.]?\s*(\d+(?:\.\d+)?)$/i;

  for (const line of lines) {
    // Skip header/footer noise
    if (/total|subtotal|tax|gst|discount|amount|grand|net|paid|balance|thank|address|date|bill no|invoice/i.test(line)) continue;
    if (line.length < 5 || /^[\d\s.₹-]+$/.test(line)) continue;

    let m = line.match(itemLineRegex);
    if (m) {
      const name     = m[1].trim();
      const qty      = parseFloat(m[2]);
      const rate     = parseFloat(m[3]);
      const total    = parseFloat(m[4]);
      // Validate: total should roughly equal qty × rate
      if (Math.abs(total - qty * rate) < 2 || total > 0) {
        items.push({ name, qty, price: rate, total });
        continue;
      }
    }

    m = line.match(simpleItemRegex);
    if (m) {
      const name  = m[1].trim();
      const qty   = parseFloat(m[2]);
      const price = parseFloat(m[3]);
      if (name.length > 1 && name.length < 60 && qty > 0 && price > 0) {
        items.push({ name, qty, price, total: qty * price });
      }
    }
  }

  // Confidence score (0–100) based on how much we could extract
  let confidence = 0;
  if (gstNumber)    confidence += 25;
  if (billNumber)   confidence += 15;
  if (supplierName) confidence += 20;
  if (supplierMobile) confidence += 10;
  if (items.length > 0) confidence += Math.min(30, items.length * 5);

  return {
    gstNumber,
    billNumber,
    supplierName,
    supplierMobile,
    items,
    confidence
  };
}

/* ===============================
   SERVER START
=============================== */
app.listen(PORT, () => {
  console.log(`\n✅ Kirana POS Backend v2 running → http://localhost:${PORT}`);
  console.log(`   DB: ${process.env.DB_NAME || "kirana_pos"} @ ${process.env.DB_HOST || "localhost"}`);
  console.log(`   Bill Scanner: Tesseract.js OCR (local, free)`);
  console.log(`   Email: ${process.env.SMTP_USER ? "✅ Configured" : "⚠️  STUB (add SMTP_USER/SMTP_PASS to .env)"}`);
  console.log(`   WhatsApp: ${process.env.TWILIO_SID ? "✅ Configured" : "⚠️  STUB (add TWILIO_SID/TWILIO_TOKEN to .env)"}\n`);
});