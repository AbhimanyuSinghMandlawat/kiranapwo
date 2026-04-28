
// ===============================================================
// REPLACEMENT: lines 614..892 of server.js
// Single-call Gemini scan — no pre-check, handles rate limits
// ===============================================================

const SCAN_ROUTE_START = 614; // 1-indexed
const SCAN_ROUTE_END   = 892; // 1-indexed (inclusive of closing });)

const newScanBlock = `/* ===============================
   AI BILL SCANNER — Gemini Vision (single-call, rate-limit aware)
=============================== */
app.post("/api/scan-bill", auth, scanLimiter, upload.single("bill"), async (req, res) => {
  if (!req.file)
    return res.status(400).json({ message: "No image uploaded" });

  const filePath = req.file.path;

  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
      fs.unlink(filePath, () => {});
      return res.status(500).json({ message: "Gemini API key not configured in .env" });
    }

    console.log("[BILL SCAN] Processing:", req.file.originalname, \`(\${(req.file.size/1024).toFixed(0)} KB)\`);

    const imageData   = fs.readFileSync(filePath);
    const base64Image = imageData.toString("base64");
    const mimeType    = req.file.mimetype || "image/jpeg";

    // Single model — use flash-lite for better free-tier quota
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    // ONE prompt that handles quality + extraction together
    const prompt = \`You are an expert AI bill processing engine for an Indian Kirana store POS system.

First check if this image is a readable bill, invoice, or receipt.
If it is NOT (e.g. blurry, dark, not a bill, random photo), return ONLY:
{"readable":false,"reason":"brief reason"}

If it IS a readable bill, extract ALL visible data and return ONLY this JSON (no markdown, no extra text):
{
  "readable": true,
  "image_quality": "good or fair or poor",
  "supplier": {
    "name":          "Owner/person name as printed, or null",
    "business_name": "Shop or company name, or null",
    "mobile":        "10-digit mobile number only, or null",
    "email":         "Email address if visible, or null",
    "gst_number":    "GST number (15-char), or null",
    "address":       "Full address, or null",
    "city":          "City, or null",
    "state":         "State, or null",
    "pincode":       "6-digit pincode, or null"
  },
  "bill": {
    "bill_number":     "Bill/invoice number, or null",
    "date":            "Date DD/MM/YYYY, or null",
    "due_date":        "Due date DD/MM/YYYY if visible, or null",
    "total_amount":    total numeric amount including tax or null,
    "subtotal_amount": subtotal before tax or null,
    "tax_amount":      total GST/tax numeric or null,
    "discount_amount": discount numeric or null,
    "payment_method":  "cash or upi or credit or cheque or null",
    "notes":           "any remarks or null"
  },
  "inventory_items": [
    {
      "item_name":   "Clean product name (no serial numbers)",
      "quantity":    numeric quantity ordered or 1,
      "unit":        "pcs or kg or g or ltr or ml or box or pkt",
      "cost_price":  price per single unit as number or null,
      "sell_price":  MRP per unit if printed or null,
      "total_price": line total for this item as number or null,
      "tax_rate":    GST % as number (0/3/5/12/18/28) or null,
      "hsn_code":    "HSN code if printed or null",
      "discount":    per-item discount amount or null
    }
  ]
}

Critical rules:
1. NEVER hallucinate — use null for anything not clearly visible.
2. cost_price = price per ONE unit (not line total).
3. Normalize item names: remove serial numbers, fix typos, proper Title Case.
4. Return ONLY the JSON — no text before or after.\`;

    const result = await model.generateContent([
      { inlineData: { mimeType, data: base64Image } },
      prompt
    ]);

    const rawResponse = result.response.text().trim();
    console.log("[GEMINI] Raw response length:", rawResponse.length);

    // Extract JSON
    let jsonStr = rawResponse
      .replace(/^\`\`\`json\\s*/i, "")
      .replace(/^\`\`\`\\s*/i, "")
      .replace(/\\s*\`\`\`\\s*$/i, "")
      .trim();

    const firstBrace = jsonStr.indexOf("{");
    const lastBrace  = jsonStr.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("[GEMINI PARSE ERROR]", jsonStr.substring(0, 300));
      fs.unlink(filePath, () => {});
      return res.status(500).json({
        message: "AI returned unreadable response — please try again with a clearer image.",
        detail: parseErr.message
      });
    }

    // Handle unreadable image
    if (parsed.readable === false) {
      fs.unlink(filePath, () => {});
      const reason = parsed.reason || "image unreadable";
      const msg = reason.includes("blurry")
        ? "📷 Image too blurry — retake with steady hands and good lighting."
        : reason.includes("dark")
          ? "🌑 Image too dark — use better lighting."
          : reason.includes("not a bill") || reason.includes("not a receipt")
            ? "❌ This doesn't appear to be a bill or invoice."
            : \`⚠️ Image unreadable: \${reason}.\`;
      return res.status(422).json({ message: msg, errorCode: "IMAGE_UNREADABLE", reason });
    }

    const sup          = parsed.supplier || {};
    const bil          = parsed.bill     || {};
    const imageQuality = parsed.image_quality || "unknown";

    const structured = {
      supplier: {
        name:          sup.name          || null,
        business_name: sup.business_name || null,
        mobile:        sup.mobile        || null,
        email:         sup.email         || null,
        gst_number:    sup.gst_number    || null,
        address:       sup.address       || null,
        city:          sup.city          || null,
        state:         sup.state         || null,
        pincode:       sup.pincode       || null
      },
      bill: {
        bill_number:     bil.bill_number     || null,
        date:            bil.date            || null,
        due_date:        bil.due_date        || null,
        total_amount:    bil.total_amount    || null,
        subtotal_amount: bil.subtotal_amount || null,
        tax_amount:      bil.tax_amount      || null,
        discount_amount: bil.discount_amount || null,
        payment_method:  bil.payment_method  || null,
        notes:           bil.notes           || null
      },
      inventory_items: Array.isArray(parsed.inventory_items)
        ? parsed.inventory_items.map(it => ({
            item_name:    it.item_name    || "Unknown Item",
            hsn_code:     it.hsn_code     || null,
            batch_number: it.batch_number || null,
            expiry_date:  it.expiry_date  || null,
            cost_price:   it.cost_price   || null,
            sell_price:   it.sell_price   || null,
            quantity:     it.quantity     || 1,
            unit:         it.unit         || "pcs",
            total_price:  it.total_price  || null,
            tax_rate:     it.tax_rate     || null,
            discount:     it.discount     || null,
            margin: (it.sell_price && it.cost_price && it.cost_price > 0)
              ? Math.round(((it.sell_price - it.cost_price) / it.cost_price) * 100)
              : null
          }))
        : []
    };

    // Confidence scoring
    let confidence = 0;
    if (structured.supplier.name)          confidence += 15;
    if (structured.supplier.business_name) confidence += 5;
    if (structured.supplier.gst_number)    confidence += 15;
    if (structured.supplier.mobile)        confidence += 8;
    if (structured.supplier.address)       confidence += 5;
    if (structured.bill.bill_number)       confidence += 12;
    if (structured.bill.date)              confidence += 10;
    if (structured.bill.total_amount)      confidence += 5;
    if (structured.bill.tax_amount)        confidence += 5;
    if (structured.inventory_items.length > 0)
      confidence += Math.min(20, structured.inventory_items.length * 2);
    const itemsWithCost = structured.inventory_items.filter(i => i.cost_price).length;
    if (itemsWithCost > 0) confidence += Math.min(5, itemsWithCost);
    if (imageQuality === "poor") confidence = Math.max(0, confidence - 15);
    confidence = Math.min(100, confidence);

    if (confidence < 20 && structured.inventory_items.length === 0) {
      fs.unlink(filePath, () => {});
      return res.status(422).json({
        message: "📷 Could not extract data — please use a clearer, well-lit photo.",
        errorCode: "LOW_CONFIDENCE",
        confidence, imageQuality
      });
    }

    // Persist to DB (non-blocking)
    const scanId = require("crypto").randomUUID();
    query(
      \`INSERT INTO bill_scans (id,shop_id,gst_number,bill_number,supplier_name,supplier_mobile,raw_text,items_json,confidence)
       VALUES (?,?,?,?,?,?,?,?,?)\`,
      [scanId, req.shop.shop_id,
       structured.supplier.gst_number, structured.bill.bill_number,
       structured.supplier.name, structured.supplier.mobile,
       jsonStr.substring(0, 5000), JSON.stringify(structured.inventory_items), confidence]
    ).catch(e => console.warn("[BILL SCAN] DB insert failed (non-fatal):", e.message));

    fs.unlink(filePath, () => {});
    console.log(\`[BILL SCAN] ✅ Items:\${structured.inventory_items.length} Confidence:\${confidence}% Quality:\${imageQuality}\`);

    res.json({ ...structured, scanId, confidence, imageQuality });

  } catch (err) {
    fs.unlink(filePath, () => {});

    // Handle rate limit explicitly
    if (err.status === 429) {
      const retryAfter = err.errorDetails?.find(d => d["@type"]?.includes("RetryInfo"))?.retryDelay || "15s";
      const seconds = parseInt(retryAfter) || 15;
      console.warn(\`[BILL SCAN] Rate limited — retry after \${retryAfter}\`);
      return res.status(429).json({
        message: \`⏳ AI rate limit reached — please wait \${seconds} seconds and try again.\`,
        errorCode: "RATE_LIMITED",
        retryAfter: seconds
      });
    }

    console.error("[BILL SCAN ERROR]", err.message);
    res.status(500).json({
      message: \`Gemini scan failed: \${err.message}\`,
      errorCode: "SCAN_FAILED",
      detail: err.message
    });
  }
});`;

module.exports = { newScanBlock, SCAN_ROUTE_START, SCAN_ROUTE_END };
