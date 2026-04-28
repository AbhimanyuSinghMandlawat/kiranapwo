/**
 * strip_nonascii.js
 * Strip all non-ASCII characters from BillScanner.js source.
 * The emoji/special chars are purely decorative; stripping makes the UI clean.
 */
const fs   = require("fs");
const path = require("path");

const target = path.join(__dirname,
  "../kirana-pos/src/pages/BillScanner.js");

// Read as UTF-8 string
let src = fs.readFileSync(target, "utf8");
const before = src.length;

// Replace every SEQUENCE of non-printable / non-ASCII chars with nothing
// (keeps all ASCII: tabs, newlines, 0x20-0x7E)
src = src.replace(/[^\x09\x0A\x0D\x20-\x7E]+/g, "");

// Fix up empty span tags that now have no content: <span></span> → remove them
src = src.replace(/<span><\/span>/g, "");
src = src.replace(/<span\s+class="[^"]*"><\/span>/g, "");

// Restore meaningful label text that was adjacent to stripped emoji
// (the text is still there after the emoji since emoji were in separate <span> tags)

fs.writeFileSync(target, src, "utf8");
console.log(`Stripped: ${before} -> ${src.length} bytes (reduced by ${before - src.length})`);
console.log("All non-ASCII characters removed from BillScanner.js");
