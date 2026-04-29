/**
 * Supplier routes — CRUD for suppliers.
 */
const express = require("express");
const crypto = require("crypto");
const { query } = require("../config/database");
const auth = require("../middleware/auth");
const router = express.Router();

router.post("/", auth, async (req, res) => {
  const s = req.body;
  const shopid = req.shop.shopid;
  if (!s.name) return res.status(400).json({ message: "Supplier name required" });
  try {
    const id = s.id || crypto.randomUUID();
    await query(
      `INSERT INTO suppliers (id,shop_id,name,business_name,mobile,gst_number,address) VALUES (?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE name=VALUES(name),business_name=VALUES(business_name),mobile=VALUES(mobile),gst_number=VALUES(gst_number),address=VALUES(address)`,
      [id, shopid, s.name, s.businessname||null, s.mobile||null, s.gstnumber||null, s.address||null]
    );
    res.json({ message: "Supplier saved", id });
  } catch (err) {
    console.error("[SUPPLIER]", err.message);
    res.status(500).json({ message: "DB error" });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const rows = await query("SELECT * FROM suppliers WHERE shop_id = ? ORDER BY name ASC", [req.shop.shopid]);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: "DB error" }); }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const rows = await query("SELECT * FROM suppliers WHERE id = ? AND shop_id = ?", [req.params.id, req.shop.shopid]);
    rows.length ? res.json(rows[0]) : res.status(404).json({ message: "Not found" });
  } catch (err) { res.status(500).json({ message: "DB error" }); }
});

module.exports = router;
