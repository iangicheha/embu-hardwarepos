const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const wb = XLSX.readFile(path.join(__dirname, 'electrical_items.xlsx'));

// Sheet -> { prefix, categoryName } mapping (mirrors seed-products.ts SHEET_TO_CATEGORY)
const SHEET_PREFIX = {
  "Electrical Items": "ELE",
  "Garden Tools": "GAR",
  "Painting Tools & Materials": "PTM",
  "Bathroom & Toiletry": "BAT",
  "General Hardware": "GHW",
  "Hand Tools & Measuring": "HTM",
  "Window & Lock Fittings": "WLF",
  "Screws & Fasteners": "SCF",
  "Ropes": "ROP",
  "Plumbing & Piping": "PLP",
  "Masonry & Hand Tools": "MAH",
  "Fasteners & Fixings": "FAF",
  "Adhesives & Sealants": "ADS",
  "Household Fittings": "HSF",
  "Building Materials & Chemicals": "BMC",
  "Brackets & Hinges": "BRH",
  "Motorcycle & Bicycle Parts": "MBP",
  "Safety Equipment": "SAF",
};

const out = {};
for (const sheetName of wb.SheetNames) {
  const raw = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });
  const items = [];
  let sheetTotal = 0;
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r || !r[1]) continue;
    if (String(r[1]).trim().toLowerCase() === 'grand total') continue;
    const name = String(r[1]).trim();
    const quantity = Number(r[2]) || 0;
    const unitPrice = Number(r[3]) || 0;
    const total = Number(r[4]) || 0;
    items.push({ name, quantity, unitPrice, total });
    sheetTotal += total;
  }
  out[sheetName] = {
    prefix: SHEET_PREFIX[sheetName],
    items,
    productCount: items.length,
    totalPurchases: sheetTotal,
  };
}
fs.writeFileSync('extracted_products.json', JSON.stringify(out, null, 2));
console.log('Wrote extracted_products.json');
console.log('Sheets:', Object.keys(out).length);
console.log('Total products:', Object.values(out).reduce((sum, s) => sum + s.productCount, 0));
