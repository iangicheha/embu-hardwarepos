/**
 * seed-categories.ts
 *
 * Creates any categories from SHEET_TO_CATEGORY that don't yet exist in
 * the DB. Safe to re-run — skips categories that already exist.
 *
 * Usage:
 *   1. npm install -D tsx
 *   2. Set env vars (same as seed-products.ts):
 *        $env:NEXT_PUBLIC_API_URL="https://hardwareembu.onrender.com/api"
 *        $env:SEED_ADMIN_EMAIL="admin"
 *        $env:SEED_ADMIN_PASSWORD="Admin@123"
 *   3. npx tsx seed-categories.ts
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "";

// Same list as SHEET_TO_CATEGORY values in seed-products.ts.
const REQUIRED_CATEGORIES = [
  "Electrical",
  "Garden Tools",
  "Painting Tools & Materials",
  "Bathroom & Toiletry",
  "General Hardware",
  "Hand Tools & Measuring",
  "Window & Lock Fittings",
  "Screws & Fasteners",
  "Ropes",
  "Plumbing & Piping",
  "Masonry & Hand Tools",
  "Fasteners & Fixings",
  "Adhesives & Sealants",
  "Household Fittings",
  "Building Materials & Chemicals",
  "Brackets & Hinges",
  "Motorcycle & Bicycle Parts",
  "Safety Equipment",
];

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

async function getExistingCategoryNames(token: string): Promise<Set<string>> {
  const names = new Set<string>();
  const res = await fetch(`${API_BASE_URL}/categories?page=1&limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status} ${await res.text()}`);
  const body = await res.json();
  for (const cat of body.data.categories ?? []) names.add(cat.name);
  return names;
}

async function createCategory(token: string, name: string) {
  const res = await fetch(`${API_BASE_URL}/categories`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create "${name}": ${res.status} ${text}`);
  }
  return res.json();
}

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("Set SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars first.");
  }

  const token = await login();
  const existing = await getExistingCategoryNames(token);

  console.log(`Categories already in DB (${existing.size}):`);
  for (const name of existing) console.log(`  - ${name}`);

  const missing = REQUIRED_CATEGORIES.filter((c) => !existing.has(c));
  console.log(`\nMissing categories to create (${missing.length}):`);
  for (const name of missing) console.log(`  - ${name}`);

  if (missing.length === 0) {
    console.log("\nNothing to do — all required categories already exist.");
    return;
  }

  console.log(`\nCreating...`);
  let created = 0;
  const failed: string[] = [];
  for (const name of missing) {
    try {
      await createCategory(token, name);
      console.log(`  Created: "${name}"`);
      created++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  FAILED: "${name}" — ${msg}`);
      failed.push(name);
    }
  }

  console.log(`\nDone. Created: ${created}, failed: ${failed.length}`);
  if (failed.length > 0) {
    console.log("Failed categories (check errors above):");
    for (const name of failed) console.log(`  - ${name}`);
  }
  console.log(`\nNext: re-run seed-products.ts to import the products for these categories.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});