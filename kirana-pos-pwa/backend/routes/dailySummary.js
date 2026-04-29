/**
 * Daily summary routes — save and retrieve summaries with email/WhatsApp notifications.
 */
const express = require("express");
const { query } = require("../config/database");
const auth = require("../middleware/auth");
const { sendEmailNotification, sendWhatsAppNotification } = require("../utils/notifications");

const router = express.Router();

router.post("/", auth, async (req, res) => {
  const s = req.body;
  const shopid = req.shop.shopid;

  if (!s.id || !s.summaryDate) {
    return res.status(400).json({ message: "Missing summary id or date" });
  }

  try {
    await query(
      `INSERT INTO daily_summaries
       (id, shop_id, summary_date, total_sales, total_profit, transactions,
        credit_given, cash_total, upi_total, card_total, top_items, breakdown)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
        total_sales  = VALUES(total_sales),
        total_profit = VALUES(total_profit),
        transactions = VALUES(transactions),
        credit_given = VALUES(credit_given),
        cash_total   = VALUES(cash_total),
        upi_total    = VALUES(upi_total),
        card_total   = VALUES(card_total),
        top_items    = VALUES(top_items),
        breakdown    = VALUES(breakdown)`,
      [
        s.id, shopid, s.summaryDate,
        s.totalSales || 0, s.profit || 0, s.transactions || 0,
        s.creditGiven || 0, s.cashTotal || 0, s.upiTotal || 0, s.cardTotal || 0,
        JSON.stringify(s.topItems || []),
        JSON.stringify(s.breakdown || {}),
      ]
    );

    const shopRows = await query("SELECT * FROM shops WHERE id = ?", [shopid]);
    const shop = shopRows[0] || {};

    const emailResult = await sendEmailNotification(
      `Daily Summary - ${s.summaryDate} - ${shop.shop_name || "Your Shop"}`,
      buildSummaryEmailHTML(s, shop)
    );
    const waResult = await sendWhatsAppNotification(buildSummaryWhatsApp(s, shop));

    if (emailResult.sent)
      await query("UPDATE daily_summaries SET sent_email = 1 WHERE id = ?", [s.id]);
    if (waResult.sent)
      await query("UPDATE daily_summaries SET sent_whatsapp = 1 WHERE id = ?", [s.id]);

    res.json({
      message: "Daily summary saved",
      id: s.id,
      emailSent: emailResult.sent,
      whatsappSent: waResult.sent,
    });
  } catch (err) {
    console.error("[DAILY SUMMARY ERROR]", err.message);
    res.status(500).json({ message: "DB error" });
  }
});

router.get("/", auth, async (req, res) => {
  const shopid = req.shop.shopid;
  const date = req.query.date || new Date().toLocaleDateString("en-IN");
  try {
    const rows = await query(
      "SELECT * FROM daily_summaries WHERE shop_id = ? AND summary_date = ?",
      [shopid, date]
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ message: "DB error" });
  }
});

function buildSummaryEmailHTML(s, shop) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;background:#f9f9f9;border-radius:10px">
      <h2 style="color:#2e7d32">Daily Business Summary</h2>
      <h3>${shop.shop_name || "Your Kirana Shop"} - ${s.summaryDate}</h3>
      <table style="width:100%;border-collapse:collapse">
        <tr style="background:#e8f5e9"><td style="padding:8px"><strong>Total Sales</strong></td><td>Rs. ${(s.totalSales || 0).toFixed(2)}</td></tr>
        <tr><td style="padding:8px"><strong>Today's Profit</strong></td><td>Rs. ${(s.profit || 0).toFixed(2)}</td></tr>
        <tr style="background:#e8f5e9"><td style="padding:8px"><strong>Transactions</strong></td><td>${s.transactions || 0}</td></tr>
        <tr><td style="padding:8px"><strong>Credit Given</strong></td><td>Rs. ${(s.creditGiven || 0).toFixed(2)}</td></tr>
        <tr style="background:#e8f5e9"><td style="padding:8px"><strong>Cash Sales</strong></td><td>Rs. ${(s.cashTotal || 0).toFixed(2)}</td></tr>
        <tr><td style="padding:8px"><strong>UPI Sales</strong></td><td>Rs. ${(s.upiTotal || 0).toFixed(2)}</td></tr>
        <tr style="background:#e8f5e9"><td style="padding:8px"><strong>Card Sales</strong></td><td>Rs. ${(s.cardTotal || 0).toFixed(2)}</td></tr>
      </table>
      <p style="color:#888;font-size:12px;margin-top:20px">Sent automatically by Kirana POS.</p>
    </div>`;
}

function buildSummaryWhatsApp(s, shop) {
  return `Daily Summary - ${s.summaryDate}
Shop: ${shop.shop_name || "Your Shop"}
Total Sales: Rs. ${(s.totalSales || 0).toFixed(2)}
Profit: Rs. ${(s.profit || 0).toFixed(2)}
Transactions: ${s.transactions || 0}
Cash: Rs. ${(s.cashTotal || 0).toFixed(2)} | UPI: Rs. ${(s.upiTotal || 0).toFixed(2)} | Card: Rs. ${(s.cardTotal || 0).toFixed(2)}`;
}

module.exports = router;
