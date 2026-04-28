/**
 * test_ocr.js — Test the Tesseract OCR parser on the sample bill
 * Run: node test_ocr.js
 */
const { parseBill } = require("./billParser");
const path = require("path");

const testImage = process.argv[2] || path.join(__dirname, "uploads", "bill 1.png");

console.log("Testing OCR on:", testImage);
console.log("─".repeat(60));

parseBill(testImage)
  .then(result => {
    console.log("\n✅ EXTRACTION RESULT");
    console.log("=".repeat(60));
    console.log(`OCR Lines:   ${result.rawOcrLines}`);
    console.log(`Quality:     ${result.imageQuality}`);
    console.log(`Confidence:  ${result.confidence}%`);

    console.log("\n── SUPPLIER ──");
    console.table(result.supplier);

    console.log("\n── BILL ──");
    console.table(result.bill);

    console.log("\n── ITEMS (",result.inventory_items.length,") ──");
    console.table(result.inventory_items.map(i => ({
      name:        i.item_name,
      qty:         i.quantity,
      unit:        i.unit,
      cost_price:  i.cost_price,
      total_price: i.total_price,
      tax_rate:    i.tax_rate
    })));
  })
  .catch(err => console.error("❌ Error:", err.message));
