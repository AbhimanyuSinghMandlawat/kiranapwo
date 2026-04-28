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
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
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
   MULTER Ã¢â‚¬â€œ file uploads (bill scanner)
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
    return { sent: false, reason: "Twilio integration pending Ã¢â‚¬â€œ add credentials to .env" };
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
   SECURITY: RATE LIMITING
=============================== */
const rateLimitMap = new Map();
function rateLimit(limit, windowMs) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    let entry = rateLimitMap.get(ip);
    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime: now + windowMs };
    }
    entry.count++;
    rateLimitMap.set(ip, entry);
    if (entry.count > limit) {
      return res.status(429).json({ message: "Too many requests. Please try again later." });
    }
    next();
  };
}

const loginLimiter = rateLimit(10, 60 * 1000); // 10 attempts / min
const scanLimiter  = rateLimit(5,  60 * 1000); // 5 scans / min

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

// Alias: /api/auth/register Ã¢â€ â€™ same as /api/register
app.post("/api/auth/register", (req, res, next) => {
  req.url = "/api/register";
  app.handle(req, res, next);
});


/* ===============================
   LOGIN
=============================== */
app.post("/api/login", loginLimiter, async (req, res) => {
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
   SALES  (upsert Ã¢â‚¬â€œ idempotent)
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

  // Cap discount: max 50% for percent-type, max Ã¢â€šÂ¹500 for flat-Ã¢â€šÂ¹ type
  const rawValue  = parseFloat(c.value) || 0;
  const safeValue = (c.type === "percent")
    ? Math.min(rawValue, 50)   // max 50% off
    : Math.min(rawValue, 500); // max Ã¢â€šÂ¹500 flat off

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
      `Ã°Å¸â€œÅ  Daily Summary Ã¢â‚¬â€œ ${s.summaryDate} Ã¢â‚¬â€œ ${shop.shop_name || "Your Shop"}`,
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
      <h2 style="color:#2e7d32">Ã°Å¸â€œÅ  Daily Business Summary</h2>
      <h3>${shop.shop_name || "Your Kirana Shop"} Ã¢â‚¬â€ ${s.summaryDate}</h3>
      <table style="width:100%;border-collapse:collapse">
        <tr style="background:#e8f5e9"><td style="padding:8px"><strong>Total Sales</strong></td><td>Ã¢â€šÂ¹${(s.totalSales||0).toFixed(2)}</td></tr>
        <tr><td style="padding:8px"><strong>Today's Profit</strong></td><td>Ã¢â€šÂ¹${(s.profit||0).toFixed(2)}</td></tr>
        <tr style="background:#e8f5e9"><td style="padding:8px"><strong>Transactions</strong></td><td>${s.transactions||0}</td></tr>
        <tr><td style="padding:8px"><strong>Credit Given</strong></td><td>Ã¢â€šÂ¹${(s.creditGiven||0).toFixed(2)}</td></tr>
        <tr style="background:#e8f5e9"><td style="padding:8px"><strong>Cash Sales</strong></td><td>Ã¢â€šÂ¹${(s.cashTotal||0).toFixed(2)}</td></tr>
        <tr><td style="padding:8px"><strong>UPI Sales</strong></td><td>Ã¢â€šÂ¹${(s.upiTotal||0).toFixed(2)}</td></tr>
        <tr style="background:#e8f5e9"><td style="padding:8px"><strong>Card Sales</strong></td><td>Ã¢â€šÂ¹${(s.cardTotal||0).toFixed(2)}</td></tr>
      </table>
      ${(s.topItems||[]).length > 0 ? `
        <h4>Ã°Å¸Ââ€  Top Selling Items</h4>
        <ul>${(s.topItems||[]).map(i => `<li>${i.name} Ã¢â‚¬â€ ${i.qtySold} units sold</li>`).join("")}</ul>
      ` : ""}
      <p style="color:#888;font-size:12px;margin-top:20px">Sent automatically by Kirana POS at shop closing time.</p>
    </div>
  `;
}

function buildSummaryWhatsApp(s, shop) {
  return `ðŸ“Š *Daily Summary* â€” ${s.summaryDate}
ðŸª ${shop.shop_name || "Your Shop"}
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ðŸ’° Total Sales: â‚¹${(s.totalSales||0).toFixed(2)}
ðŸ“ˆ Profit: â‚¹${(s.profit||0).toFixed(2)}
ðŸ›’ Transactions: ${s.transactions||0}
ðŸ’³ Credit Given: â‚¹${(s.creditGiven||0).toFixed(2)}
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
Cash: â‚¹${(s.cashTotal||0).toFixed(2)} | UPI: â‚¹${(s.upiTotal||0).toFixed(2)} | Card: â‚¹${(s.cardTotal||0).toFixed(2)}
Have a great evening! ðŸ™`;
}

/* ===============================
/* ===============================
   AI BILL SCANNER — Tesseract OCR (100% free, no rate limits, no API)
=============================== */
const { parseBill } = require("./billParser");

app.post("/api/scan-bill", auth, upload.single("bill"), async (req, res) => {
  if (!req.file)
    return res.status(400).json({ message: "No image uploaded" });

  const filePath = req.file.path;

  try {
    console.log("[BILL SCAN] OCR processing:", req.file.originalname,
      `(${(req.file.size / 1024).toFixed(0)} KB)`);

    const result = await parseBill(filePath);

    if (!result.readable || result.rawOcrLines < 3) {
      fs.unlink(filePath, () => {});
      return res.status(422).json({
        message: "📷 Could not read text from image — please use a clearer, well-lit photo.",
        errorCode: "IMAGE_UNREADABLE"
      });
    }

    if (result.inventory_items.length === 0 && result.confidence < 20) {
      fs.unlink(filePath, () => {});
      return res.status(422).json({
        message: "📷 Could not extract bill data — please upload a clearer image.",
        errorCode: "LOW_CONFIDENCE",
        confidence: result.confidence,
        imageQuality: result.imageQuality
      });
    }

    // Save to DB (non-blocking)
    const scanId = require("crypto").randomUUID();
    const shop_id = req.shop.shop_id;
    query(
      `INSERT INTO bill_scans
         (id, shop_id, gst_number, bill_number, supplier_name, supplier_mobile, raw_text, items_json, confidence)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        scanId, shop_id,
        result.supplier.gst_number,
        result.bill.bill_number,
        result.supplier.name || result.supplier.business_name,
        result.supplier.mobile,
        `OCR:${result.rawOcrLines} lines`,
        JSON.stringify(result.inventory_items),
        result.confidence
      ]
    ).catch(e => console.warn("[BILL SCAN] DB save (non-fatal):", e.message));

    fs.unlink(filePath, () => {});
    console.log(`[BILL SCAN] Done — Items:${result.inventory_items.length} Confidence:${result.confidence}% OCR lines:${result.rawOcrLines}`);

    const { rawOcrLines, readable, ...clean } = result;
    res.json({ ...clean, scanId });

  } catch (err) {
    fs.unlink(filePath, () => {});
    console.error("[BILL SCAN ERROR]", err.message);
    res.status(500).json({
      message: `Scan failed: ${err.message}`,
      errorCode: "SCAN_FAILED"
    });
  }
});

app.post("/api/suppliers", auth, async (req, res) => {
  const s       = req.body;
  const shop_id = req.shop.shop_id;
  if (!s.name) return res.status(400).json({ message: "Supplier name required" });

  try {
    const id = s.id || require("crypto").randomUUID();
    await query(
      `INSERT INTO suppliers (id, shop_id, name, business_name, mobile, gst_number, address)
       VALUES (?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         name          = VALUES(name),
         business_name = VALUES(business_name),
         mobile        = VALUES(mobile),
         gst_number    = VALUES(gst_number)`,
      [id, shop_id, s.name, s.business_name || null, s.mobile || null, s.gst_number || null, s.address || null]
    );
    res.json({ message: "Supplier saved", id });
  } catch (err) {
    console.error("[SUPPLIER]", err);
    res.status(500).json({ message: "DB error", detail: err.message });
  }
});

app.get("/api/suppliers", auth, async (req, res) => {
  const shop_id = req.shop.shop_id;
  try {
    const rows = await query("SELECT * FROM suppliers WHERE shop_id=? ORDER BY name ASC", [shop_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "DB error" });
  }
});

app.get("/api/suppliers/:id", auth, async (req, res) => {
  const shop_id = req.shop.shop_id;
  try {
    const rows = await query("SELECT * FROM suppliers WHERE id=? AND shop_id=?", [req.params.id, shop_id]);
    rows.length ? res.json(rows[0]) : res.status(404).json({ message: "Not found" });
  } catch (err) {
    res.status(500).json({ message: "DB error" });
  }
});

/* ===============================
   BILL RECORDS  (upsert / list)
=============================== */
app.post("/api/bill-records", auth, async (req, res) => {
  const b       = req.body;
  const shop_id = req.shop.shop_id;

  try {
    const id = b.id || require("crypto").randomUUID();
    await query(
      `INSERT INTO bill_records
         (id, shop_id, supplier_id, bill_number, bill_date,
          total_amount, tax_amount, payment_method, items_json, scan_id)
       VALUES (?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         total_amount   = VALUES(total_amount),
         items_json     = VALUES(items_json)`,
      [
        id, shop_id,
        b.supplier_id    || null,
        b.bill_number    || null,
        b.bill_date      || null,
        b.total_amount   || 0,
        b.tax_amount     || 0,
        b.payment_method || null,
        JSON.stringify(b.items || []),
        b.scan_id        || null
      ]
    );
    res.json({ message: "Bill record saved", id });
  } catch (err) {
    console.error("[BILL RECORD]", err);
    res.status(500).json({ message: "DB error", detail: err.message });
  }
});

app.get("/api/bill-records", auth, async (req, res) => {
  const shop_id = req.shop.shop_id;
  try {
    const rows = await query(
      `SELECT br.*, s.name AS supplier_name, s.mobile AS supplier_mobile
       FROM bill_records br
       LEFT JOIN suppliers s ON br.supplier_id = s.id
       WHERE br.shop_id=?
       ORDER BY br.created_at DESC LIMIT 200`,
      [shop_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "DB error" });
  }
});

/* ===============================
   SERVER START
=============================== */
app.listen(PORT, () => {
  console.log(`\nÃ¢Å“â€¦ Kirana POS Backend v3 Ã¢â€ â€™ http://localhost:${PORT}`);
  console.log(`   DB  : ${process.env.DB_NAME || "kirana_pos"} @ ${process.env.DB_HOST || "localhost"}`);
  console.log(`   AI  : Ã°Å¸Â¤â€“ Gemini Vision API (gemini-1.5-flash)`);
  console.log(`   Key : ${process.env.GEMINI_API_KEY ? "Ã¢Å“â€¦ Configured" : "Ã¢ÂÅ’ MISSING Ã¢â‚¬â€ add GEMINI_API_KEY to .env"}`);
  console.log(`   Mail: ${process.env.SMTP_USER ? "Ã¢Å“â€¦ Configured" : "Ã¢Å¡Â Ã¯Â¸Â  STUB"}\n`);
});
