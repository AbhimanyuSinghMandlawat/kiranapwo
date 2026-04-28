/**
 * fix_all.js — Comprehensive fix for BillScanner.js + billParser.js
 * 1. Replaces ALL mojibake (garbled emoji/chars) with clean ASCII text
 * 2. Fixes OCR parser: item name spacing, ₹→digit issue, bill number prefix
 */
const fs   = require("fs");
const path = require("path");

// ────────────────────────────────────────────────────────────────────────────
// PART 1: Fix BillScanner.js encoding issues
// ────────────────────────────────────────────────────────────────────────────
const scannerPath = path.join(__dirname,
  "../kirana-pos/src/pages/BillScanner.js");

let sc = fs.readFileSync(scannerPath, "latin1"); // read as raw bytes

// Mojibake patterns → clean replacements
// These are 4-byte UTF-8 emoji read as Latin-1 bytes
const emojiMap = [
  // 🤖 robot  (F0 9F A4 96 → ðŸ¤–)
  [/\xf0\x9f\xa4\x96/g,  ""],
  // 📷 camera (F0 9F 93 B7 → ðŸ"·)
  [/\xf0\x9f\x93\xb7/g,  ""],
  // 📋 clipboard (F0 9F 93 8B → ðŸ"‹)
  [/\xf0\x9f\x93\x8b/g,  ""],
  // 📂 folder (F0 9F 93 82 → ðŸ"‚)
  [/\xf0\x9f\x93\x82/g,  ""],
  // 🔍 search (F0 9F 94 8D → ðŸ")
  [/\xf0\x9f\x94\x8d/g,  ""],
  // 📦 box (F0 9F 93 A6 → ðŸ"¦)
  [/\xf0\x9f\x93\xa6/g,  ""],
  // 📄 document (F0 9F 93 84 → ðŸ"„)
  [/\xf0\x9f\x93\x84/g,  ""],
  // 🏪 shop (F0 9F 8F AA → ðŸª)
  [/\xf0\x9f\x8f\xaa/g,  ""],
  // 💾 floppy (F0 9F 92 BE → ðŸ'¾)
  [/\xf0\x9f\x92\xbe/g,  ""],
  // 🎯 target (F0 9F 8E AF → ðŸŽ¯)
  [/\xf0\x9f\x8e\xaf/g,  ""],
  // 🗑️ trash (F0 9F 97 91 → ðŸ—')
  [/\xf0\x9f\x97\x91/g,  "X"],
  // 💡 bulb  (F0 9F 92 A1 → ðŸ'¡)
  [/\xf0\x9f\x92\xa1/g,  ""],
  // 🔌 plug  (F0 9F 94 8C → ðŸ"Œ)
  [/\xf0\x9f\x94\x8c/g,  ""],
  // 📱 phone (F0 9F 93 B1 → ðŸ"±)
  [/\xf0\x9f\x93\xb1/g,  ""],
  // 🔄 arrows (F0 9F 94 84 → ðŸ"„ — different from 📄!)
  [/\xf0\x9f\x94\x84/g,  ""],
  // ⏳ hourglass (E2 8F B3 → â³)
  [/\xe2\x8f\xb3/g,  "..."],
  // ⚠️ warning (E2 9A A0 EF B8 8F → âš ï¸)
  [/\xe2\x9a\xa0\xef\xb8\x8f/g,  "(!!)"],
  [/\xe2\x9a\xa0/g,  "(!!)"],
  // ✅ check (E2 9C 85 → âœ…)
  [/\xe2\x9c\x85/g,  "OK"],
  // ➕ plus (E2 9E 95 → âž•)
  [/\xe2\x9e\x95/g,  "+"],
  // ₹ rupee (E2 82 B9 → â‚¹)
  [/\xe2\x82\xb9/g,  "Rs."],
  // — em-dash (E2 80 94 → â€")
  [/\xe2\x80\x94/g,  "-"],
  // → arrow (E2 86\x92 → â†')
  [/\xe2\x86\x92/g,  "->"],
  // · middle-dot (C2 B7 → Â·)
  [/\xc2\xb7/g,  "."],
  // ️  variation selector (EF B8 8F → ï¸)
  [/\xef\xb8\x8f/g,  ""],
  // 🛒 cart (F0 9F 9B' 92)  — sidebar icon, leave as-is  
  // ⚙️ gear (E2 9A 99 → âš™)
  [/\xe2\x9a\x99/g,  ""],
  // 🔒 lock (F0 9F 94 92)
  [/\xf0\x9f\x94\x92/g,  ""],
  // 🌐 globe (F0 9F 8C 90)
  [/\xf0\x9f\x8c\x90/g,  ""],
  // 📐 ruler (F0 9F 93 90)
  [/\xf0\x9f\x93\x90/g,  ""],
  // ✋ hand (E2 9C 8B)
  [/\xe2\x9c\x8b/g,  ""],
  // 🔑 key (F0 9F 94 91)
  [/\xf0\x9f\x94\x91/g,  ""],
  // ⭐ star (E2 AD 90)
  [/\xe2\xad\x90/g,  ""],
];

for (const [pat, rep] of emojiMap) {
  sc = sc.replace(pat, rep);
}

// Fix specific text strings that still have bad chars
// Description line: â€" Gemini AI → "-- Gemini AI"  
sc = sc.replace("Upload your supplier bill \xe2\x80\x94 Gemini AI extracts every detail automatically",
                "Upload your supplier bill and extract every detail automatically");

// Write back as UTF-8 (now clean ASCII-safe)
fs.writeFileSync(scannerPath, sc, "utf8");
console.log("BillScanner.js: encoding fixed");

// ────────────────────────────────────────────────────────────────────────────
// PART 2: Patch OCR accuracy fixes in billParser.js
// ────────────────────────────────────────────────────────────────────────────
const parserPath = path.join(__dirname, "billParser.js");
let bp = fs.readFileSync(parserPath, "utf8");

// Fix 1: Total amount — strip leading non-digit chars that look like ₹ (OCR reads as digit)
// The ₹ symbol is often read by Tesseract as "R" or "2" before the amount
// Fix the regex to skip single-char prefix before amount
bp = bp.replace(
  `const totalAmt    = toNum(firstMatch(text, [
    /TOTAL\\s*[₹Rs\\.]?\\s*([\\d,]+\\.?\\d*)\\s*$/im,
    /Grand\\s*Total\\s*[:\\-]?\\s*[₹Rs\\.]?\\s*([\\d,]+\\.?\\d*)/i
  ]));`,
  `const totalAmt    = toNum((firstMatch(text, [
    /TOTAL[^\\d\\n]{0,5}([\\d,]+\\.?\\d*)\\s*$/im,
    /Grand\\s*Total[^\\d\\n]{0,5}([\\d,]+\\.?\\d*)/i
  ]) || "").replace(/^\\D{0,3}/, ""));`
);

// Fix 2: Bill number — capture full alphanumeric prefix like "IN-15"
bp = bp.replace(
  `  const billNo  = firstMatch(text, [
    /Bill\\s*No\\.?\\s*[:\\-]?\\s*([A-Z0-9\\-\\/]+)/i,
    /Invoice\\s*No\\.?\\s*[:\\-]?\\s*([A-Z0-9\\-\\/]+)/i,
    /Receipt\\s*No\\.?\\s*[:\\-]?\\s*([A-Z0-9\\-\\/]+)/i,
    /\\bIN[-\\s]*(\\d+)\\b/i
  ]);`,
  `  const billNo  = firstMatch(text, [
    /Bill\\s*No\\.?\\s*[:\\-]?\\s*([A-Z]{0,4}[-\\s]?\\d+)/i,
    /(?:Invoice|Receipt)\\s*No\\.?\\s*[:\\-]?\\s*([A-Z]{0,4}[-\\s]?\\d+)/i,
    /\\bIN[-\\s]?(\\d+)\\b/
  ]);`
);

// Fix 3: cleanItemName — preserve spaces, don't strip valid word chars
bp = bp.replace(
  `const cleanItemName = raw => {
  if (!raw) return "Unknown Item";
  return raw
    .replace(/^\\d+[\\.\\)]\\s*/,  "")     // remove "1. " prefix
    .replace(/\\b\\d+%\\s*/g,      "")     // remove "5% " embedded tax pct
    .replace(/\\bTax\\s*Item\\b/gi,"")     // remove "Tax Item" suffix
    .replace(/\\s{2,}/g,        " ")
    .trim()
    || "Unknown Item";
};`,
  `const cleanItemName = raw => {
  if (!raw) return "Unknown Item";
  // Fix common OCR space-removal artifacts: "OrangePowder" -> "Orange Powder"
  // Insert space before capital letters that follow lowercase (CamelCase fix)
  let s = raw.replace(/([a-z])([A-Z])/g, "$1 $2");
  return s
    .replace(/^\\d+[\\.\\)]\\s*/,  "")  // remove "1. " prefix
    .replace(/\\b\\d+%\\s*/g,      "")  // remove "5% " embedded tax pct
    .replace(/\\bTax\\s*Item\\b/gi,"")  // remove "Tax Item" suffix
    .replace(/\\s{2,}/g,        " ")
    .trim()
    || "Unknown Item";
};`
);

fs.writeFileSync(parserPath, bp, "utf8");
console.log("billParser.js: OCR accuracy fixes applied");
console.log("All done!");
