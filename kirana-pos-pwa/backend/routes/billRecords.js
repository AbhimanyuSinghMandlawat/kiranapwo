/**
 * Bill records routes — save and list bill records.
 */
const express = require("express");
const crypto = require("crypto");
const { query } = require("../config/database");
const auth = require("../middleware/auth");
const router = express.Router();

router.post("/", auth, async (req, res) => {
  const b = req.body;
  const shopid = req.shop.shopid;
  try {
    const id = b.id || crypto.randomUUID();
    await query(
      `INSERT INTO bill_records (id,shop_id,supplier_id,bill_number,bill_date,total_amount,tax_amount,payment_method,items_json,scan_id)
       VALUES (?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE supplier_id=VALUES(supplier_id),bill_number=VALUES(bill_number),bill_date=VALUES(bill_date),
       total_amount=VALUES(total_amount),tax_amount=VALUES(tax_amount),payment_method=VALUES(payment_method),items_json=VALUES(items_json),scan_id=VALUES(scan_id)`,
      [id, shopid, b.supplierid||null, b.billnumber||null, b.billdate||null, b.totalamount||0, b.taxamount||0, b.paymentmethod||null, JSON.stringify(b.items||[]), b.scanid||null]
    );
    res.json({ message: "Bill record saved", id });
  } catch (err) {
    console.error("[BILL RECORD]", err.message);
    res.status(500).json({ message: "DB error" });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const rows = await query(
      `SELECT br.*, s.name AS supplier_name, s.mobile AS supplier_mobile
       FROM bill_records br LEFT JOIN suppliers s ON br.supplier_id = s.id
       WHERE br.shop_id = ? ORDER BY br.created_at DESC LIMIT 200`,
      [req.shop.shopid]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: "DB error" }); }
});

module.exports = router;
