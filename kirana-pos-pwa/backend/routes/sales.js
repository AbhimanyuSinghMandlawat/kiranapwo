/**
 * Sales routes — create and list sales.
 */
const express = require("express");
const { query } = require("../config/database");
const auth = require("../middleware/auth");

const router = express.Router();

router.post("/", auth, async (req, res) => {
  const s = req.body;
  const shopid = req.shop.shopid;

  if (!s.id || s.amount == null) {
    return res.status(400).json({ message: "Missing sale id or amount" });
  }

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
        customer_phone   = VALUES(customer_phone),
        transaction_type = VALUES(transaction_type),
        stock_effect     = VALUES(stock_effect),
        liability_effect = VALUES(liability_effect),
        reference_source = VALUES(reference_source),
        estimated_profit = VALUES(estimated_profit),
        sale_date        = VALUES(sale_date),
        notes            = VALUES(notes)`,
      [
        s.id, shopid, s.amount,
        s.paymentMethod || null, s.accountType || null,
        s.customerName || null, s.customerPhone || null,
        s.transactionType || "sale", s.stockEffect || null,
        s.liabilityEffect || null, s.referenceSource || null,
        s.estimatedProfit || 0,
        s.date || new Date().toLocaleDateString("en-IN"),
        s.notes || null,
      ]
    );
    res.json({ message: "Sale synced", id: s.id });
  } catch (err) {
    console.error("[SALES ERROR]", err.message);
    res.status(500).json({ message: "DB error" });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const rows = await query(
      "SELECT * FROM sales WHERE shop_id = ? ORDER BY created_at DESC",
      [req.shop.shopid]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "DB error" });
  }
});

module.exports = router;
