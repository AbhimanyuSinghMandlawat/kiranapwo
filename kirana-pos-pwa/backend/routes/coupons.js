/**
 * Coupon routes — create and list coupons.
 */
const express = require("express");
const { query } = require("../config/database");
const auth = require("../middleware/auth");

const router = express.Router();

router.post("/", auth, async (req, res) => {
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
        c.expiryDate || null,
      ]
    );
    res.json({ message: "Coupon synced", id: c.id });
  } catch (err) {
    console.error("[COUPON ERROR]", err.message);
    res.status(500).json({ message: "DB error" });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const rows = await query(
      "SELECT * FROM coupons WHERE shop_id = ? ORDER BY issued_at DESC",
      [req.shop.shopid]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "DB error" });
  }
});

module.exports = router;
