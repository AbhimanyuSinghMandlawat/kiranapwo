/**
 * billParser.js  — v2
 * 100% local Tesseract OCR + position-aware table reconstruction
 * No API, no rate limits, no internet required.
 */

const Tesseract = require("tesseract.js");

// ─── OCR: get words with bounding boxes (more accurate than raw text) ─────────
async function ocrWithPositions(filePath) {
  const path = require("path");
  const worker = await Tesseract.createWorker("eng", 1, {
    cachePath: path.join(__dirname),
    logger: () => {}
  });

  await worker.setParameters({
    tessedit_pageseg_mode: "1",          // Auto PSM — best for mixed layouts
    tessedit_char_whitelist: "",         // Allow all characters
    preserve_interword_spaces: "1"
  });

  const { data } = await worker.recognize(filePath);
  await worker.terminate();

  return {
    text:  data.text  || "",
    words: data.words || [],
    lines: data.lines || [],
    confidence: data.confidence || 0
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toNum = str => {
  if (!str) return null;
  const n = parseFloat(String(str).replace(/,/g, "").replace(/[^\d.]/g, ""));
  return isNaN(n) ? null : n;
};

const firstMatch = (text, patterns) => {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return (m[1] || "").trim() || null;
  }
  return null;
};

const cleanItemName = raw => {
  if (!raw) return "Unknown Item";
  // Fix common OCR space-removal artifacts: "OrangePowder" -> "Orange Powder"
  // Insert space before capital letters that follow lowercase (CamelCase fix)
  let s = raw.replace(/([a-z])([A-Z])/g, "$1 $2");
  return s
    .replace(/^\d+[\.\)]\s*/,  "")  // remove "1. " prefix
    .replace(/\b\d+%\s*/g,      "")  // remove "5% " embedded tax pct
    .replace(/\bTax\s*Item\b/gi,"")  // remove "Tax Item" suffix
    .replace(/\s{2,}/g,        " ")
    .trim()
    || "Unknown Item";
};

// Normalise date to DD/MM/YYYY
const parseDate = raw => {
  if (!raw) return null;
  const months = { Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12,
                   January:1,February:2,March:3,April:4,June:6,July:7,August:8,
                   September:9,October:10,November:11,December:12 };
  // "23 - Jan - 2025" or "23-Jan-2025"
  const m1 = raw.match(/(\d{1,2})[\s\-\/]+([A-Za-z]+)[\s\-\/]+(\d{4})/);
  if (m1) return `${m1[1].padStart(2,"0")}/${String(months[m1[2]] || 1).padStart(2,"0")}/${m1[3]}`;
  const m2 = raw.match(/(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{4})/);
  if (m2) return `${m2[1].padStart(2,"0")}/${m2[2].padStart(2,"0")}/${m2[3]}`;
  const m3 = raw.match(/(\d{4})[\-\/](\d{2})[\-\/](\d{2})/);
  if (m3) return `${m3[3]}/${m3[2]}/${m3[1]}`;
  return null;
};

// ─── Group words into rows by Y-coordinate (within 8px tolerance) ─────────────
function groupWordsIntoRows(words, yTolerance = 8) {
  if (!words.length) return [];
  const rows = [];
  for (const word of words) {
    const cy = word.bbox.y0 + (word.bbox.y1 - word.bbox.y0) / 2;
    const row = rows.find(r => Math.abs(r.cy - cy) <= yTolerance);
    if (row) {
      row.words.push(word);
      row.cy = (row.cy + cy) / 2;
    } else {
      rows.push({ cy, words: [word] });
    }
  }
  // Sort rows top-to-bottom, words left-to-right
  rows.sort((a, b) => a.cy - b.cy);
  rows.forEach(r => r.words.sort((a, b) => a.bbox.x0 - b.bbox.x0));
  return rows;
}

function rowText(row) {
  return row.words.map(w => w.text).join(" ");
}

// ─── Main export ──────────────────────────────────────────────────────────────
async function parseBill(filePath) {
  const { text, words, lines, confidence: pageConfidence } = await ocrWithPositions(filePath);

  const rawLines = text.split("\n").map(l => l.trim()).filter(Boolean);
  console.log("[OCR] Page confidence:", pageConfidence.toFixed(1) + "%");
  console.log("[OCR] Raw lines:", rawLines.length);
  rawLines.forEach((l, i) => console.log(`  [${i}] ${l}`));

  // ── Positional row reconstruction ────────────────────────────────────────
  const posRows = groupWordsIntoRows(words, 10);

  // ── Supplier section ──────────────────────────────────────────────────────
  // First ALLCAPS word cluster = business name
  const businessLine = rawLines.find(l =>
    l.length > 2 && l === l.toUpperCase() &&
    !/^\d/.test(l) && !l.includes(":") &&
    !["IGST","CGST","SGST","SUBTOTAL","TOTAL","THANK","SN","ITEM","QTY","PRICE","AMT"].includes(l.replace(/\s/g,"").toUpperCase())
  ) || null;

  // Owner name = Title Case line near top (often right after business name)
  const bizIdx = businessLine ? rawLines.indexOf(businessLine) : -1;
  const ownerCandidate = bizIdx >= 0 ? rawLines[bizIdx + 1] : null;
  const ownerName = (ownerCandidate &&
    /^[A-Z][a-z]+ [A-Z]/.test(ownerCandidate) &&
    !ownerCandidate.includes(",") &&
    !ownerCandidate.includes("No") &&
    ownerCandidate.length < 40)
    ? ownerCandidate : null;

  const gst     = firstMatch(text, [
    /GSTIN?\s*[:\-]?\s*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9][Z][0-9A-Z])/i,
    /GST\s*No\.?\s*[:\-]?\s*([0-9A-Z]{15})/i
  ]);
  const mobile  = firstMatch(text, [
    /(?:PHONE|MOBILE|MOB|PH|TEL)\s*[:\-]?\s*\+?91[-\s]?(\d{10})/i,
    /(?:PHONE|MOBILE|MOB|PH)\s*[:\-]?\s*(\d{10})/,
    /\+91[-\s]?(\d{10})/
  ]);
  const email   = firstMatch(text, [/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/]);
  const addrLine = rawLines.find(l =>
    /(Road|Street|Sq\.?|Square|Nagar|Colony|Building|Plot|Near|Opp|Ward|Camp|Area|Sector|Block|Lane|Marg|Chowk)/i.test(l) &&
    l.length > 10
  ) || null;
  const pincode = firstMatch(text, [/\b(\d{6})\b/]);
  const city    = firstMatch(text, [/(?:IN,?|City)[,\s]+([A-Za-z ]+?)(?:\n|,)/i]);
  const state   = firstMatch(text, [/State\s*[:\-]?\s*([A-Za-z ]+)/i]);

  // ── Bill metadata ─────────────────────────────────────────────────────────
  const billNo  = firstMatch(text, [
    /Bill\s*No\.?\s*[:\-]?\s*([A-Z]{0,4}[-\s]?\d+)/i,
    /(?:Invoice|Receipt)\s*No\.?\s*[:\-]?\s*([A-Z]{0,4}[-\s]?\d+)/i,
    /\bIN[-\s]?(\d+)\b/
  ]);
  const dateRaw = firstMatch(text, [
    /Date\s*[:\-]?\s*(\d{1,2}[\s\-]+[A-Za-z]+[\s\-]+\d{4})/i,
    /Date\s*[:\-]?\s*(\d{1,2}[\-\/]\d{1,2}[\-\/]\d{4})/i,
    /Date\s*[:\-]?\s*(\d{4}[\-\/]\d{2}[\-\/]\d{2})/i,
    /(\d{1,2}[\s\-]+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\s\-]+\d{4})/i
  ]);
  const date = parseDate(dateRaw);

  // totalAmt — long whitespace allowed; ₹ symbol OCR'd as leading digit stripped later
  const totalAmtRaw = firstMatch(text, [
    /TOTAL[^\n]*(\d[\d,]*\.\d{2})\s*$/im,
    /Grand\s*Total[^\n]*(\d[\d,]*\.\d{2})/i,
    /TOTAL[^\d\n]*([\d,]+\.?\d*)\s*$/im
  ]);
  let totalAmt = toNum(totalAmtRaw);
  const subtotalAmt = toNum(firstMatch(text, [
    /(?:Sub\s*Total|Subtotal|Net\s*Amount)\s*[₹Rs\.]?\s*([\d,]+\.?\d*)/i
  ]));
  const taxAmt      = toNum(firstMatch(text, [
    /(?:Total\s*Tax|Tax\s*Total)\s*[₹Rs\.]?\s*([\d,]+\.?\d*)/i
  ]));

  // ── Item parsing using position-aware row groups ─────────────────────────
  // Find the header row (contains SN/No + Item + Qty/Quantity + Price/Rate + Amt/Amount)
  const headerRowIdx = posRows.findIndex(r => {
    const rt = rowText(r).toUpperCase();
    return (rt.includes("SN") || rt.includes("S.N") || rt.includes("SR")) &&
           (rt.includes("ITEM") || rt.includes("DESC") || rt.includes("PRODUCT")) &&
           (rt.includes("QTY") || rt.includes("QUANTITY")) &&
           (rt.includes("PRICE") || rt.includes("RATE") || rt.includes("MRP"));
  });

  // Detect column X positions from header row
  let colSN = 0, colItem = 0, colQty = 0, colPrice = 0, colAmt = 0;
  if (headerRowIdx >= 0) {
    const hr = posRows[headerRowIdx];
    for (const w of hr.words) {
      const wt = w.text.toUpperCase().replace(/[^A-Z]/g,"");
      const cx = (w.bbox.x0 + w.bbox.x1) / 2;
      if (["SN","NO","SR"].includes(wt)) colSN = cx;
      else if (["ITEM","DESCRIPTION","PRODUCT","PARTICULARS"].includes(wt)) colItem = cx;
      else if (["QTY","QUANTITY"].includes(wt)) colQty = cx;
      else if (["PRICE","RATE","MRP"].includes(wt)) colPrice = cx;
      else if (["AMT","AMOUNT","TOTAL"].includes(wt)) colAmt = cx;
    }
    console.log("[OCR] Header cols — SN:", colSN, "Item:", colItem, "Qty:", colQty, "Price:", colPrice, "Amt:", colAmt);
  }

  const inventory_items = [];
  const currency = /^[\d,]+\.\d{2}$/;

  if (headerRowIdx >= 0 && colQty > 0) {
    // Position-based column parsing
    let pendingItem = null;

    for (let ri = headerRowIdx + 1; ri < posRows.length; ri++) {
      const row = posRows[ri];
      const rt  = rowText(row).trim();

      // Stop at SUBTOTAL/TOTAL/IGST/CGST/Thank rows
      if (/^(SubTotal|Subtotal|TOTAL|IGST|CGST|SGST|Thank|Discount)/i.test(rt)) {
        if (pendingItem) { inventory_items.push(pendingItem); pendingItem = null; }
        break;
      }

      // Classify each word into column slot by x-position
      const snWords    = [];
      const itemWords  = [];
      const qtyWords   = [];
      const priceWords = [];
      const amtWords   = [];

      for (const w of row.words) {
        const cx = (w.bbox.x0 + w.bbox.x1) / 2;
        // Use midpoints between columns to classify
        const midSNItem   = (colSN   + colItem)  / 2 || colItem  - 50;
        const midItemQty  = (colItem + colQty)   / 2 || colQty   - 80;
        const midQtyPrice = (colQty  + colPrice) / 2 || colPrice - 60;
        const midPriceAmt = (colPrice + colAmt)  / 2 || colAmt   - 60;

        if      (cx < midSNItem)   snWords.push(w.text);
        else if (cx < midItemQty)  itemWords.push(w.text);
        else if (cx < midQtyPrice) qtyWords.push(w.text);
        else if (cx < midPriceAmt) priceWords.push(w.text);
        else                       amtWords.push(w.text);
      }

      const snText    = snWords.join(" ").trim();
      const itemText  = itemWords.join(" ").trim();
      const qtyText   = qtyWords.join(" ").trim();
      const priceText = priceWords.join(" ").trim();
      const amtText   = amtWords.join(" ").trim();

      // Allow SN misclassified into item column (e.g. '5 Glicerene')
      let effectiveItem = itemText;
      let effectiveSN   = snText;
      if (!/^\d+$/.test(snText) && /^\d+\s+\w/.test(itemText)) {
        const snFromItem = itemText.match(/^(\d+)\s+(.*)/);
        if (snFromItem) { effectiveSN = snFromItem[1]; effectiveItem = snFromItem[2]; }
      }
      const isSNRow = /^\d+$/.test(effectiveSN) || /^\d+[.\)]/.test(rt);

      if (isSNRow && effectiveItem) {
        const itemText = effectiveItem;  // shadow with corrected value
        // Flush previous item
        if (pendingItem) inventory_items.push(pendingItem);

        const taxMatch = itemText.match(/(\d+\.?\d*)%/);
        const taxRate  = taxMatch ? parseFloat(taxMatch[1]) : null;
        const qty      = toNum(qtyText) || 1;
        const price    = toNum(priceText);
        const total    = toNum(amtText) || (price ? price * qty : null);

        pendingItem = {
          item_name:    cleanItemName(itemText),
          quantity:     qty,
          unit:         "pcs",
          cost_price:   price,
          sell_price:   null,
          total_price:  total,
          tax_rate:     taxRate,
          hsn_code:     null,
          batch_number: null,
          expiry_date:  null,
          discount:     null,
          margin:       null
        };
      } else if (!isSNRow && itemText && pendingItem) {
        // Continuation line — append to pending item name
        const appendText = itemText.replace(/\bTax\s*Item\b/gi,"").trim();
        if (appendText && appendText.length < 25 && !/^[\d,.]+$/.test(appendText)) {
          pendingItem.item_name = cleanItemName(pendingItem.item_name + " " + appendText);
        }
      }
    }
    if (pendingItem) inventory_items.push(pendingItem);
  }

  // ── Fallback: raw-text regex if position-based found nothing ─────────────
  if (inventory_items.length === 0) {
    const itemRx = /^(\d+)\s+(.+?)\s+(\d+(?:\.\d+)?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s*$/;
    rawLines.forEach((line, i) => {
      const m = line.match(itemRx);
      if (!m) return;
      if (/TOTAL|IGST|CGST|SGST|Subtotal/i.test(m[2])) return;
      let name = m[2];
      // Check next line for continuation
      const next = rawLines[i + 1] || "";
      if (next && !/^\d/.test(next) && !/TOTAL|IGST|CGST/i.test(next) && next.length < 30) {
        name += " " + next;
      }
      const tm = name.match(/(\d+\.?\d*)%/);
      inventory_items.push({
        item_name:    cleanItemName(name),
        quantity:     toNum(m[3]) || 1,
        unit:         "pcs",
        cost_price:   toNum(m[4]),
        sell_price:   null,
        total_price:  toNum(m[5]),
        tax_rate:     tm ? parseFloat(tm[1]) : null,
        hsn_code:     null,
        batch_number: null,
        expiry_date:  null,
        discount:     null,
        margin:       null
      });
    });
  }

  // ── Cross-validate total amount: ₹ symbol often read as "2" by OCR ────────
  if (totalAmt) {
    const itemsSum = inventory_items.reduce((s, i) => s + (i.total_price || 0), 0);
    if (itemsSum > 0) {
      const totalStr  = String(Math.round(totalAmt * 100));
      const stripped  = parseFloat(totalStr.slice(1)) / 100;
      // If stripped value is within 10% of items sum, use it (₹ symbol was read as digit)
      if (Math.abs(stripped - itemsSum) / itemsSum < 0.1 &&
          Math.abs(totalAmt - itemsSum) / itemsSum > 0.05) {
        console.log(`[OCR] Total corrected: ${totalAmt} -> ${stripped} (items sum: ${itemsSum})`);
        totalAmt = stripped;
      }
      // Also try direct match
      if (Math.abs(totalAmt - itemsSum) / itemsSum > 0.05) {
        const lastNum = firstMatch(text, [/TOTAL[^\n]*?([\d,]+\.\d{2})\s*$/im]);
        const alt = toNum(lastNum);
        if (alt && Math.abs(alt - itemsSum) / itemsSum < 0.05) totalAmt = alt;
      }
    }
  }

  // ── Confidence ───────────────────────────────────────────────────────────
  let confidence = Math.round(pageConfidence * 0.3);
  if (businessLine)               confidence += 10;
  if (ownerName)                  confidence += 8;
  if (gst)                        confidence += 20;
  if (mobile)                     confidence += 8;
  if (billNo)                     confidence += 12;
  if (date)                       confidence += 10;
  if (totalAmt)                   confidence += 5;
  if (inventory_items.length > 0) confidence += Math.min(20, inventory_items.length * 3);
  confidence = Math.min(100, confidence);

  const imageQuality = rawLines.length >= 15 ? "good" : rawLines.length >= 8 ? "fair" : "poor";

  return {
    readable:     true,
    imageQuality,
    confidence,
    rawOcrLines:  rawLines.length,
    ocrConfidence: Math.round(pageConfidence),
    supplier: {
      name:          ownerName,
      business_name: businessLine,
      mobile,
      email,
      gst_number:    gst,
      address:       addrLine,
      city,
      state,
      pincode
    },
    bill: {
      bill_number:     billNo,
      date,
      due_date:        null,
      total_amount:    totalAmt,
      subtotal_amount: subtotalAmt,
      tax_amount:      taxAmt,
      discount_amount: null,
      payment_method:  null,
      notes:           null
    },
    inventory_items
  };
}

module.exports = { parseBill };
