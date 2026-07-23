/**
 * seed-products.ts
 *
 * One-time script to import products from an Excel workbook into the
 * database via your existing POST /inventory API — matching each sheet
 * to its category by name.
 *
 * CHANGE FROM ORIGINAL: sheets whose category is missing from the DB are
 * now collected and printed as a loud warning at the end, instead of a
 * single easy-to-miss console.log line during the run. This is what
 * silently dropped the entire "Plumbing & Piping" sheet last time.
 *
 * Usage:
 *   1. npm install -D tsx xlsx
 *   2. Put the workbook file next to this script, or set XLSX_PATH.
 *   3. Set env vars (PowerShell shown; use export on mac/linux):
 *        $env:NEXT_PUBLIC_API_URL="https://hardwareembu.onrender.com/api"
 *        $env:SEED_ADMIN_EMAIL="admin"
 *        $env:SEED_ADMIN_PASSWORD="Admin@123"
 *   4. npx tsx seed-products.ts
 */

import * as XLSX from "xlsx";
import * as path from "path";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "";
const XLSX_PATH = process.env.XLSX_PATH ?? path.join(__dirname, "hardware (1).xlsx");

// Maps a sheet name in the workbook to the exact category name in your DB.
const SHEET_TO_CATEGORY: Record<string, string> = {
  "Electrical Items": "Electrical",
  "Garden Tools": "Garden Tools",
  "Painting Tools & Materials": "Painting Tools & Materials",
  "Bathroom & Toiletry": "Bathroom & Toiletry",
  "General Hardware": "General Hardware",
  "Hand Tools & Measuring": "Hand Tools & Measuring",
  "Window & Lock Fittings": "Window & Lock Fittings",
  "Screws & Fasteners": "Screws & Fasteners",
  "Ropes": "Ropes",
  "Plumbing & Piping": "Plumbing & Piping",
  "Masonry & Hand Tools": "Masonry & Hand Tools",
  "Fasteners & Fixings": "Fasteners & Fixings",
  "Adhesives & Sealants": "Adhesives & Sealants",
  "Household Fittings": "Household Fittings",
  "Building Materials & Chemicals": "Building Materials & Chemicals",
  "Brackets & Hinges": "Brackets & Hinges",
  "Motorcycle & Bicycle Parts": "Motorcycle & Bicycle Parts",
  "Safety Equipment": "Safety Equipment",
  "Gates decoration": "Gate Decorations",
};
const DEFAULT_REORDER_LEVEL = 5;
// Buying price isn't in the sheet, so it's estimated from selling price using
// a 25% margin (buyingPrice = sellingPrice * (1 - 0.25)). Placeholder — go
// back and correct it per product once you know your real supplier cost.
const ESTIMATED_MARGIN = 0.25;

async function login(): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${await res.text()}`);
  const body = await res.json();
  return body.data.accessToken as string;
}

async function getCategoryIdMap(token: string): Promise<Map<string, string>> {
  const res = await fetch(`${API_BASE_URL}/categories?page=1&limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status} ${await res.text()}`);
  const body = await res.json();
  const map = new Map<string, string>();
  for (const cat of body.data.categories ?? []) {
    map.set(cat.name, cat.id);
  }
  return map;
}

async function getExistingProducts(
  token: string
): Promise<{ names: Set<string>; codes: Set<string> }> {
  const names = new Set<string>();
  const codes = new Set<string>();
  let page = 1;
  while (true) {
    const res = await fetch(`${API_BASE_URL}/inventory?page=${page}&limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed to fetch products: ${res.status} ${await res.text()}`);
    const body = await res.json();
    const products = body.data.products ?? [];
    for (const p of products) {
      names.add(p.name);
      if (p.productCode) codes.add(p.productCode);
    }
    const pagination = body.data.pagination;
    if (!pagination || page >= pagination.totalPages) break;
    page++;
  }
  return { names, codes };
}

// Given a prefix like "ELE" and the set of codes already in the DB, find the
// highest existing number for that prefix so new codes continue after it
// instead of colliding with e.g. ELE-0001 that already exists.
function highestExistingNumber(prefix: string, existingCodes: Set<string>): number {
  let max = 0;
  const re = new RegExp(`^${prefix}-(\\d+)$`);
  for (const code of existingCodes) {
    const m = code.match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max;
}

function categoryPrefix(categoryName: string): string {
  return (
    categoryName
      .replace(/[^A-Za-z ]/g, "")
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 4) || "GEN"
  );
}

type Row = { name: string; quantity: number; sellingPrice: number };

function readSheetRows(sheet: XLSX.WorkSheet): Row[] {
  const raw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const rows: Row[] = [];
  // raw[0] is the header row. Columns: No. | Item | Quantity | Unit Price | Total | (Notes)
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r || !r[1]) continue; // no item name -> skip (covers Grand Total row)
    if (String(r[1]).trim().toLowerCase() === "grand total") continue;
    const name = String(r[1]).trim();
    const quantity = Number(r[2]) || 0;
    const sellingPrice = Number(r[3]) || 0;
    rows.push({ name, quantity, sellingPrice });
  }
  return rows;
}

async function createProduct(
  token: string,
  data: {
    productCode: string;
    name: string;
    buyingPrice: number;
    sellingPrice: number;
    quantity: number;
    reorderLevel: number;
    categoryId: string;
  }
) {
  const res = await fetch(`${API_BASE_URL}/inventory`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create "${data.name}": ${res.status} ${text}`);
  }
  return res.json();
}

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("Set SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars first.");
  }

  const token = await login();
  const categoryMap = await getCategoryIdMap(token);
  const { names: existingNames, codes: existingCodes } = await getExistingProducts(token);

  console.log(`\nCategories currently in DB: ${categoryMap.size}`);
  console.log(`Products currently in DB: ${existingNames.size}\n`);

  const workbook = XLSX.readFile(XLSX_PATH);

  const counters: Record<string, number> = {};
  let created = 0;
  let skippedExisting = 0;
  let skippedNoCategory = 0;
  let skippedNoPrice = 0;
  const failedProducts: string[] = [];

  // Track which sheets get skipped and why, so it's impossible to miss.
  const skippedSheets: { sheet: string; reason: string }[] = [];

  for (const sheetName of workbook.SheetNames) {
    const categoryName = SHEET_TO_CATEGORY[sheetName];
    if (!categoryName) {
      skippedSheets.push({ sheet: sheetName, reason: "no entry in SHEET_TO_CATEGORY map" });
      continue;
    }
    const categoryId = categoryMap.get(categoryName);
    if (!categoryId) {
      skippedSheets.push({
        sheet: sheetName,
        reason: `category "${categoryName}" not found in DB — run seed-categories.ts first, or check spelling matches exactly`,
      });
      continue;
    }

    const prefix = categoryPrefix(categoryName);
    if (!(prefix in counters)) {
      counters[prefix] = highestExistingNumber(prefix, existingCodes);
    }

    const rows = readSheetRows(workbook.Sheets[sheetName]);
    console.log(`\n--- ${sheetName} (${rows.length} rows) ---`);

    for (const row of rows) {
      if (existingNames.has(row.name)) {
        console.log(`  Skip (exists): "${row.name}"`);
        skippedExisting++;
        continue;
      }
      if (!row.sellingPrice) {
        console.log(`  Skip (no price): "${row.name}" — fix in the Excel and re-run`);
        skippedNoPrice++;
        continue;
      }

      counters[prefix]++;
      let productCode = `${prefix}-${String(counters[prefix]).padStart(4, "0")}`;
      // Extra safety: if this exact code somehow already exists (e.g. gaps
      // in the DB's numbering), keep incrementing until we find a free one.
      while (existingCodes.has(productCode)) {
        counters[prefix]++;
        productCode = `${prefix}-${String(counters[prefix]).padStart(4, "0")}`;
      }
      const buyingPrice = Math.round(row.sellingPrice * (1 - ESTIMATED_MARGIN));

      try {
        await createProduct(token, {
          productCode,
          name: row.name,
          buyingPrice,
          sellingPrice: row.sellingPrice,
          quantity: row.quantity,
          reorderLevel: DEFAULT_REORDER_LEVEL,
          categoryId,
        });
        console.log(`  Created: "${row.name}" (${productCode})`);
        existingNames.add(row.name);
        existingCodes.add(productCode);
        created++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  FAILED: "${row.name}" — ${msg}`);
        failedProducts.push(row.name);
      }
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`Created:                 ${created}`);
  console.log(`Skipped (already exist): ${skippedExisting}`);
  console.log(`Skipped (no price):      ${skippedNoPrice}`);
  console.log(`Failed (API error):      ${failedProducts.length}`);

  if (failedProducts.length > 0) {
    console.log(`\nFailed products (check logs above for reason):`);
    for (const name of failedProducts) console.log(`  - ${name}`);
  }

  if (skippedSheets.length > 0) {
    console.log(`\n${"!".repeat(60)}`);
    console.log(`WARNING: ${skippedSheets.length} WHOLE SHEET(S) WERE SKIPPED:`);
    console.log("!".repeat(60));
    for (const s of skippedSheets) {
      console.log(`  Sheet "${s.sheet}": ${s.reason}`);
    }
    console.log(`\nNone of the products in these sheets were imported. Fix the`);
    console.log(`category issue above and re-run this script — it's safe to`);
    console.log(`re-run since it skips products that already exist.\n`);
  } else {
    console.log(`\nAll sheets matched a category — no sheets were skipped.\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});