const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();

app.use(cors());
app.use(express.json());

const JWT_SECRET = "kirana_super_secret";

/* ===============================
   MYSQL CONNECTION
=============================== */

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Mandla@12",
  database: "kirana_pos",
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
   REGISTER SHOP
=============================== */

app.get("/", (req, res) => {
  res.send("Kirana POS Backend Running");
});

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

app.post("/api/sales", auth, (req, res) => {

  const { amount, payment_mode, notes } = req.body;

  const shop_id = req.shop.shop_id;

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

/* ===============================
   SERVER START
=============================== */

app.listen(5000, () => {
  console.log("Backend running on http://localhost:5000");
});