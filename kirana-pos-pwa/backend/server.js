require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:4173", "http://localhost:5000"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;
const PORT       = process.env.PORT || 5000;

/* ===============================
   MYSQL CONNECTION
=============================== */

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10
});

/* ===============================
   AUTH MIDDLEWARE
=============================== */

function auth(req, res, next) {

  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ message: "No token" });
  }

  const token = header.split(" ")[1];

  jwt.verify(token, JWT_SECRET, (err, decoded) => {

    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }

    req.shop = decoded;

    next();
  });
}

/* ===============================
   HEALTH CHECK
=============================== */

app.get("/", (req, res) => res.send("Kirana POS Backend Running"));

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

  const { shop_name, owner_name, owner_phone, password } = req.body;

  if (!shop_name || !owner_name || !owner_phone || !password) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const hash = await bcrypt.hash(password, 10);

  db.query(
    "INSERT INTO shops (shop_name, owner_name, owner_phone, password_hash) VALUES (?,?,?,?)",
    [shop_name, owner_name, owner_phone, hash],
    (err, result) => {

      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Database error" });
      }

      res.json({
        message: "Shop registered",
        shop_id: result.insertId
      });

    }
  );

});

/* ===============================
   LOGIN
=============================== */

app.post("/api/login", (req, res) => {

  const { owner_phone, password } = req.body;

  db.query(
    "SELECT * FROM shops WHERE owner_phone = ?",
    [owner_phone],
    async (err, rows) => {

      if (err) return res.status(500).json({ message: "DB error" });

      if (rows.length === 0) {
        return res.status(400).json({ message: "Shop not found" });
      }

      const shop = rows[0];

      const valid = await bcrypt.compare(password, shop.password_hash);

      if (!valid) {
        return res.status(400).json({ message: "Invalid password" });
      }

      const token = jwt.sign(
        {
          shop_id: shop.id
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        token,
        shop
      });

    }
  );

});

/* ===============================
   ADD SALE
=============================== */

app.post("/api/sales", (req, res) => {

  const { shop_id, amount, payment_mode, notes } = req.body;

  const sale_date = new Date().toISOString().slice(0,10);

  db.query(
    "INSERT INTO sales (shop_id,amount,payment_mode,sale_date,notes) VALUES (?,?,?,?,?)",
    [shop_id, amount, payment_mode, sale_date, notes],
    (err,result)=>{

      if(err){
        console.error(err);
        return res.status(500).json({message:"DB error"});
      }

      res.json({
        message:"Sale saved",
        sale_id:result.insertId
      });

    }
  );

});

/* ===============================
   GET SALES
=============================== */

app.get("/api/sales", auth, (req,res)=>{

  const shop_id = req.shop.shop_id;

  db.query(
    "SELECT * FROM sales WHERE shop_id=? ORDER BY created_at DESC",
    [shop_id],
    (err,rows)=>{

      if(err) return res.status(500).json({message:"DB error"});

      res.json(rows);

    }
  );

});
app.post("/api/customers", (req,res)=>{

  const { shop_id, name, phone } = req.body;

  db.query(
    `INSERT INTO customers (shop_id,name,phone)
     VALUES (?,?,?)
     ON DUPLICATE KEY UPDATE name=VALUES(name)`,
    [shop_id,name,phone],
    (err)=>{
      if(err) return res.status(500).json({message:"DB error"});
      res.json({message:"customer saved"});
    }
  );

});
app.post("/api/stocks", (req,res)=>{

  const { shop_id, name, price, qty } = req.body;

  db.query(
    `INSERT INTO stocks (shop_id,name,price,qty)
     VALUES (?,?,?,?)
     ON DUPLICATE KEY UPDATE price=VALUES(price),qty=VALUES(qty)`,
    [shop_id,name,price,qty],
    (err)=>{
      if(err) return res.status(500).json({message:"DB error"});
      res.json({message:"stock saved"});
    }
  );

});

/* ===============================
   COUPON UPSERT
=============================== */

app.post("/api/coupons", (req, res) => {

  const { shop_id, code, discount, min_purchase, loyalty_required, expiry_date } = req.body;

  if (!shop_id || !code) {
    return res.status(400).json({ message: "Missing coupon data" });
  }

  db.query(
    `INSERT INTO coupons 
      (shop_id, code, discount, min_purchase, loyalty_required, expiry_date)
     VALUES (?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE
       discount = VALUES(discount),
       min_purchase = VALUES(min_purchase),
       loyalty_required = VALUES(loyalty_required),
       expiry_date = VALUES(expiry_date)`,
    [shop_id, code, discount, min_purchase, loyalty_required, expiry_date],
    (err) => {

      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Database error" });
      }

      res.json({ message: "Coupon saved" });

    }
  );

});

/* ===============================
   SERVER START
=============================== */

app.listen(5000, () => {
  console.log("Backend running on http://localhost:5000");
});