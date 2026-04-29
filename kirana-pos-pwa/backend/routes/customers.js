/**
 * Customer routes — create and list customers.
 */
const express = require("express");
const { query } = require("../config/database");
const auth = require("../middleware/auth");

const router = express.Router();

router.post("/", auth, async (req, res) => {
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
        c.createdAt ? new Date(c.createdAt) : new Date(),
      ]
    );
    res.json({ message: "Customer synced", id: c.id });
  } catch (err) {
    console.error("[CUSTOMER ERROR]", err.message);
    res.status(500).json({ message: "DB error" });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const rows = await query(
      "SELECT * FROM customers WHERE shop_id = ? ORDER BY updated_at DESC, created_at DESC",
      [req.shop.shopid]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "DB error" });
  }
});

module.exports = router;
