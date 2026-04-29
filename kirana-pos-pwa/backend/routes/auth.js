/**
 * Authentication routes — register, login, profile.
 */
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../config/database");
const auth = require("../middleware/auth");

const router = express.Router();
const JWTSECRET = process.env.JWTSECRET;

// ─── REGISTER ────────────────────────────────────────────────────────────────
async function handleRegister(req, res) {
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
    return res.status(400).json({ message: "Missing required fields", missing });
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
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Phone number already registered" });
    }
    console.error("[REGISTER ERROR]", err.message);
    res.status(500).json({ message: "Database error during registration" });
  }
}

router.post("/register", handleRegister);
router.post("/auth/register", handleRegister);

// ─── LOGIN ───────────────────────────────────────────────────────────────────
const rateLimit = require("../middleware/rateLimit");
const loginLimiter = rateLimit(10, 60 * 1000);

router.post("/login", loginLimiter, async (req, res) => {
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
    console.error("[LOGIN ERROR]", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// ─── SHOP PROFILE ────────────────────────────────────────────────────────────
router.put("/shop-profile", auth, async (req, res) => {
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
    console.error("[PROFILE ERROR]", err.message);
    res.status(500).json({ message: "DB error" });
  }
});

module.exports = router;
