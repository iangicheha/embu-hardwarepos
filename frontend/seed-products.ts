/**
 * seed-products.ts
 *
 * One-time script to import products from an Excel workbook (like the one
 * Claude generated earlier) into the database via your existing
 * POST /inventory API — matching each sheet to its category by name.
 *
 * Usage:
 *   1. npm install -D tsx xlsx
 *   2. Put the workbook file next to this script, or set XLSX_PATH.
 *   3. Set DATABASE-facing API env vars (same pattern as seed-categories.ts):
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
const XLSX_PATH = process.env.XLSX_PATH ?? path.join(__dirname, "electrical_items.xlsx");

// Maps a sheet name in the workbook to the exact category name in your DB.
// Add to this as you add more sheets/categories later.
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
};

const DEFAULT_REORDER_LEVEL = 5;
// Buying price isn't in the sheet, so it's estimated from selling price using
// a 25% margin on selling price (buyingPrice = sellingPrice * (1 - 0.25)).
// This is a placeholder — go back and correct it per product once you know
// your real supplier cost.
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

async function getExistingProductNames(token: string): Promise<Set<string>> {
  const names = new Set<string>();
  let page = 1;
  while (true) {
    const res = await fetch(`${API_BASE_URL}/inventory?page=${page}&limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed to fetch products: ${res.status} ${await res.text()}`);
    const body = await res.json();
    const products = body.data.products ?? [];
    for (const p of products) names.add(p.name);
    const pagination = body.data.pagination;
    if (!pagination || page >= pagination.totalPages) break;
    page++;
  }
  return names;
}

function categoryPrefix(categoryName: string): string {
  return categoryName
    .replace(/[^A-Za-z ]/g, "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 4) || "GEN";
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
  const existingNames = await getExistingProductNames(token);

  const workbook = XLSX.readFile(XLSX_PATH);

  const counters: Record<string, number> = {};
  let created = 0;
  let skippedExisting = 0;
  let skippedNoCategory = 0;
  let skippedNoPrice = 0;

  for (const sheetName of workbook.SheetNames) {
    const categoryName = SHEET_TO_CATEGORY[sheetName];
    if (!categoryName) {
      console.log(`No category mapping for sheet "${sheetName}" — skipping sheet.`);
      continue;
    }
    const categoryId = categoryMap.get(categoryName);
    if (!categoryId) {
      console.log(`Category "${categoryName}" not found in DB — skipping sheet "${sheetName}". Run seed-categories.ts first.`);
      continue;
    }

    const prefix = categoryPrefix(categoryName);
    counters[prefix] = counters[prefix] ?? 0;

    const rows = readSheetRows(workbook.Sheets[sheetName]);
    for (const row of rows) {
      if (existingNames.has(row.name)) {
        console.log(`Skipping "${row.name}" — product with this name already exists`);
        skippedExisting++;
        continue;
      }
      if (!row.sellingPrice) {
        console.log(`Skipping "${row.name}" — no price given in the sheet, add it manually`);
        skippedNoPrice++;
        continue;
      }

      counters[prefix]++;
      const productCode = `${prefix}-${String(counters[prefix]).padStart(4, "0")}`;
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
        console.log(`Created "${row.name}" (${productCode}) in "${categoryName}"`);
        existingNames.add(row.name);
        created++;
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
      }
    }
  }

  console.log(
    `\nDone. Created: ${created}, skipped (already existed): ${skippedExisting}, skipped (no price): ${skippedNoPrice}, skipped (no category): ${skippedNoCategory}`
  );
  console.log(
    `Note: buyingPrice was ESTIMATED using a 25% margin on selling price (sheet only had selling prices) — go back and correct it per product once you know your real supplier cost.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});