/**
 * check-missing-products.ts
 *
 * READ-ONLY. Does NOT create anything in the POS.
 * Compares every product row in electrical_items.xlsx against the product
 * names that already exist in your live POS (via GET /inventory), and
 * prints a report of which Excel products are missing from the POS.
 *
 * Usage:
 *   1. npm install -D tsx xlsx
 *   2. Put electrical_items.xlsx next to this script, or set XLSX_PATH.
 *   3. Set env vars (PowerShell shown; use export on mac/linux):
 *        $env:NEXT_PUBLIC_API_URL="https://hardwareembu.onrender.com/api"
 *        $env:SEED_ADMIN_EMAIL="admin"
 *        $env:SEED_ADMIN_PASSWORD="Admin@123"
 *   4. npx tsx check-missing-products.ts
 *
 * Output: prints the missing list to the terminal AND writes
 * missing-products.json + missing-products.csv next to this script.
 */

import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "";
const XLSX_PATH = process.env.XLSX_PATH ?? path.join(__dirname, "electrical_items.xlsx");

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
    for (const p of products) names.add(String(p.name).trim());
    const pagination = body.data.pagination;
    if (!pagination || page >= pagination.totalPages) break;
    page++;
  }
  return names;
}

type Row = { name: string; category: string; quantity: number; sellingPrice: number };

function readAllRows(workbook: XLSX.WorkBook): Row[] {
  const rows: Row[] = [];
  for (const sheetName of workbook.SheetNames) {
    const raw: any[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: null });
    for (let i = 1; i < raw.length; i++) {
      const r = raw[i];
      if (!r || !r[1]) continue;
      if (String(r[1]).trim().toLowerCase() === "grand total") continue;
      rows.push({
        name: String(r[1]).trim(),
        category: sheetName,
        quantity: Number(r[2]) || 0,
        sellingPrice: Number(r[3]) || 0,
      });
    }
  }
  return rows;
}

// Case-insensitive, whitespace-normalized match so "LED Bulb " and "led bulb"
// still count as the same product.
function normalize(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("Set SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars first.");
  }

  console.log(`Logging in to ${API_BASE_URL} ...`);
  const token = await login();

  console.log("Fetching existing POS product names ...");
  const existingNamesRaw = await getExistingProductNames(token);
  const existingNormalized = new Set([...existingNamesRaw].map(normalize));
  console.log(`POS currently has ${existingNamesRaw.size} products.`);

  console.log(`Reading ${XLSX_PATH} ...`);
  const workbook = XLSX.readFile(XLSX_PATH);
  const rows = readAllRows(workbook);
  console.log(`Excel has ${rows.length} product rows across ${workbook.SheetNames.length} sheets.`);

  const missing = rows.filter((r) => !existingNormalized.has(normalize(r.name)));

  console.log(`\n=== MISSING FROM POS: ${missing.length} products ===\n`);
  for (const m of missing) {
    console.log(`- [${m.category}] ${m.name} (qty ${m.quantity}, price ${m.sellingPrice})`);
  }

  fs.writeFileSync(
    path.join(__dirname, "missing-products.json"),
    JSON.stringify(missing, null, 2)
  );

  const csvLines = ["category,name,quantity,sellingPrice"];
  for (const m of missing) {
    csvLines.push(`"${m.category}","${m.name.replace(/"/g, '""')}",${m.quantity},${m.sellingPrice}`);
  }
  fs.writeFileSync(path.join(__dirname, "missing-products.csv"), csvLines.join("\n"));

  console.log(`\nWrote missing-products.json and missing-products.csv (${missing.length} rows).`);
  console.log("Nothing was created or modified in the POS — this script is read-only.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
