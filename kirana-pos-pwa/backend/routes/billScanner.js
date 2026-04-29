/**
 * Bill scanner route — OCR scan uploaded bill image.
 */
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { query } = require("../config/database");
const auth = require("../middleware/auth");
const rateLimit = require("../middleware/rateLimit");
const { parseBill } = require("../billParser");

const router = express.Router();
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
const upload = multer({ dest: uploadsDir, limits: { fileSize: 10 * 1024 * 1024 } });
const scanLimiter = rateLimit(5, 60 * 1000);

router.post("/", auth, scanLimiter, upload.single("bill"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No image uploaded" });
  const filePath = req.file.path;
  try {
    const result = await parseBill(filePath);
    if (!result.readable || result.rawOcrLines < 3) {
      fs.unlink(filePath, () => {});
      return res.status(422).json({ message: "Could not read text from image.", errorCode: "IMAGE_UNREADABLE" });
    }
    if (result.inventory_items.length === 0 && result.confidence < 20) {
      fs.unlink(filePath, () => {});
      return res.status(422).json({ message: "Could not extract bill data.", errorCode: "LOW_CONFIDENCE" });
    }
    const scanId = crypto.randomUUID();
    query(
      `INSERT INTO bill_scans (id,shop_id,gst_number,bill_number,supplier_name,supplier_mobile,raw_text,items_json,confidence) VALUES (?,?,?,?,?,?,?,?,?)`,
      [scanId, req.shop.shopid, result.supplier.gst_number||null, result.bill.bill_number||null, result.supplier.name||null, result.supplier.mobile||null, `OCR:${result.rawOcrLines} lines`, JSON.stringify(result.inventory_items||[]), result.confidence||0]
    ).catch(e => console.warn("[BILL SCAN] DB save non-fatal:", e.message));
    fs.unlink(filePath, () => {});
    const { rawOcrLines, readable, ...clean } = result;
    res.json({ ...clean, scanId });
  } catch (err) {
    fs.unlink(filePath, () => {});
    res.status(500).json({ message: `Scan failed: ${err.message}`, errorCode: "SCAN_FAILED" });
  }
});

module.exports = router;
