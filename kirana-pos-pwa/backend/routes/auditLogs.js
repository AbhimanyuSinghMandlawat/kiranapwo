/**
 * Audit log routes — create and list audit entries.
 */
const express = require("express");
const { query } = require("../config/database");
const auth = require("../middleware/auth");

const router = express.Router();

router.post("/", auth, async (req, res) => {
  const log = req.body;
  const shopid = req.shop.shopid;

  if (!log.id || !log.action) {
    return res.status(400).json({ message: "Missing log id or action" });
  }

  try {
    await query(
      `INSERT INTO audit_logs
       (id, shop_id, actor_id, actor_name, actor_role, action, module, target_id, metadata, log_date, timestamp)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
        actor_id   = VALUES(actor_id),
        actor_name = VALUES(actor_name),
        actor_role = VALUES(actor_role),
        module     = VALUES(module),
        target_id  = VALUES(target_id),
        metadata   = VALUES(metadata),
        log_date   = VALUES(log_date),
        timestamp  = VALUES(timestamp)`,
      [
        log.id, shopid, log.actorId || null,
        log.actorName || "System", log.actorRole || "system",
        log.action, log.module || null, log.targetId || null,
        JSON.stringify(log.metadata || {}),
        log.date || new Date().toLocaleDateString("en-IN"),
        log.timestamp || Date.now(),
      ]
    );
    res.json({ message: "Audit log synced", id: log.id });
  } catch (err) {
    console.error("[AUDIT ERROR]", err.message);
    res.status(500).json({ message: "DB error" });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const rows = await query(
      "SELECT * FROM audit_logs WHERE shop_id = ? ORDER BY timestamp DESC LIMIT 500",
      [req.shop.shopid]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "DB error" });
  }
});

module.exports = router;
