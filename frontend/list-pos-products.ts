/**
 * list-pos-products.ts
 *
 * READ-ONLY. Fetches every product currently in the POS and prints/saves
 * them so you can compare against the Excel yourself, or paste the output
 * back into chat.
 *
 * Usage:
 *   1. npm install -D tsx
 *   2. Set env vars (same as the other scripts):
 *        $env:NEXT_PUBLIC_API_URL="https://hardwareembu.onrender.com/api"
 *        $env:SEED_ADMIN_EMAIL="admin"
 *        $env:SEED_ADMIN_PASSWORD="Admin@123"
 *   3. npx tsx list-pos-products.ts
 *
 * Output: prints a table to the terminal AND writes pos-products.json +
 * pos-products.csv next to this script.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "";

import * as fs from "fs";
import * as path from "path";

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

type Product = {
  name: string;
  productCode?: string;
  category?: string | { name?: string };
  sellingPrice?: number;
  quantity?: number;
};

async function getAllProducts(token: string): Promise<Product[]> {
  const all: Product[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${API_BASE_URL}/inventory?page=${page}&limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed to fetch products: ${res.status} ${await res.text()}`);
    const body = await res.json();
    const products = body.data.products ?? [];
    all.push(...products);
    const pagination = body.data.pagination;
    if (!pagination || page >= pagination.totalPages) break;
    page++;
  }
  return all;
}

function categoryName(c: Product["category"]): string {
  if (!c) return "";
  if (typeof c === "string") return c;
  return c.name ?? "";
}

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("Set SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars first.");
  }

  console.log(`Logging in to ${API_BASE_URL} ...`);
  const token = await login();

  console.log("Fetching all products from POS ...");
  const products = await getAllProducts(token);
  console.log(`\nTotal products in POS: ${products.length}\n`);

  // Sort by category then name for readability
  products.sort((a, b) => {
    const catCmp = categoryName(a.category).localeCompare(categoryName(b.category));
    if (catCmp !== 0) return catCmp;
    return a.name.localeCompare(b.name);
  });

  let currentCategory = "";
  for (const p of products) {
    const cat = categoryName(p.category);
    if (cat !== currentCategory) {
      currentCategory = cat;
      console.log(`\n--- ${cat} ---`);
    }
    console.log(`  ${p.productCode ?? "(no code)"}  ${p.name}  (Ksh ${p.sellingPrice ?? "?"}, qty ${p.quantity ?? "?"})`);
  }

  fs.writeFileSync(path.join(__dirname, "pos-products.json"), JSON.stringify(products, null, 2));

  const csvLines = ["category,productCode,name,sellingPrice,quantity"];
  for (const p of products) {
    csvLines.push(
      `"${categoryName(p.category)}","${p.productCode ?? ""}","${p.name.replace(/"/g, '""')}",${p.sellingPrice ?? ""},${p.quantity ?? ""}`
    );
  }
  fs.writeFileSync(path.join(__dirname, "pos-products.csv"), csvLines.join("\n"));

  console.log(`\n\nWrote pos-products.json and pos-products.csv (${products.length} rows).`);
  console.log("Nothing was modified in the POS — this script is read-only.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
