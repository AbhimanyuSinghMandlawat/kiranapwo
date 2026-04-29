/**
 * Stock routes — create and list stock items.
 */
const express = require("express");
const { query } = require("../config/database");
const auth = require("../middleware/auth");

const router = express.Router();

router.post("/", auth, async (req, res) => {
  const item = req.body;
  const shopid = req.shop.shopid;

  if (!item.id || !item.name) {
    return res.status(400).json({ message: "Missing stock id or name" });
  }

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
        item.createdAt ? new Date(item.createdAt) : new Date(),
      ]
    );
    res.json({ message: "Stock synced", id: item.id });
  } catch (err) {
    console.error("[STOCK ERROR]", err.message);
    res.status(500).json({ message: "DB error" });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const rows = await query(
      "SELECT * FROM stocks WHERE shop_id = ? ORDER BY updated_at DESC, name ASC",
      [req.shop.shopid]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "DB error" });
  }
});

module.exports = router;
