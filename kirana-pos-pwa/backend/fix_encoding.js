/**
 * fix_encoding.js — Fix UTF-8 mojibake in BillScanner.js
 * Run: node fix_encoding.js
 */
const fs = require("fs");
const path = require("path");

const target = path.join(
  __dirname,
  "../kirana-pos/src/pages/BillScanner.js"
);

let c = fs.readFileSync(target, "utf8");
const before = c.length;

// Map of mojibake → clean replacement
// These are UTF-8 emojis/chars that were double-encoded as Latin-1
const fixes = [
  // Rupee sign ₹ (often appears as â‚¹ or Ã¢â‚¬ )
  [/â‚¹/g,                       "Rs."],
  // Em-dash — (appears as â€")
  [/â€"/g,                       " - "],
  // Middle dot · (appears as Â·)
  [/Â·/g,                        "."],
  // Right arrow → (appears as â†')
  [/â†'/g,                       "->"],
  // Delete icon 🗑️ (appears as ðŸ—'ï¸ or ðŸ—' )
  [/ð[\x80-\xBF][\x80-\xBF][^\s"<>]*/g, ""],
  // Any remaining Ã° or ðŸ type mojibake sequences
  [/Ã°[^\s"<>`;)]+/g,             ""],
  // ✅ → OK
  [/âœ…/g,                        "OK"],
  // ⚠️ → WARN
  [/âš ï¸/g,                     "(!!)"],
  [/âš /g,                       "(!!)"],
  // ➕ → +
  [/âž•/g,                       "+"],
  // ⏳ → ...
  [/â³/g,                        "..."],
  // Leftover Ã sequences
  [/Ã[^\s"<>`;)]{1,3}/g,         ""],
  // Fix "Auto-Filled Â· Editable" -> "Auto-Filled · Editable"
  [/Auto-Filled\s*\.\s*Editable/g, "Auto-Filled · Editable"],
  // Fix column header labels that had ₹
  [/Cost\s*Rs\./gi,              "Cost Rs."],
  [/Sell\s*Rs\./gi,              "Sell Rs."],
  [/Total\s*Rs\./gi,             "Total Rs."],
  // Fix delete button text to use plain text
  [/class="btn-remove-row"[^>]+>[^<]*<\/button>/g,
   'class="btn-remove-row" title="Remove">[X]</button>'],
  // Fix margin display em-dash
  [/disp\.textContent\s*=\s*"[^"]*â[^"]*"/g,
   'disp.textContent = "-"'],
];

for (const [pattern, replacement] of fixes) {
  c = c.replace(pattern, replacement);
}

// Also fix specific known strings
c = c.replace(/"â€""/g, '"-"');
c = c.replace(/'â€"'/g, '"-"');
c = c.replace(/> Scan with AI</g, '> Scan Bill <');

fs.writeFileSync(target, c, "utf8");
console.log(`Fixed: ${before} -> ${c.length} bytes (diff: ${c.length - before})`);
console.log("Done.");
