/**
 * seed-product-images.ts
 *
 * One-time script to backfill `imageUrl` on every Product by looking up the
 * product name in lib/product-images.ts. Any product not in the map is
 * skipped (its imageUrl is left unchanged — likely the gray placeholder).
 *
 * Usage:
 *   1. Set env vars:
 *        $env:NEXT_PUBLIC_API_URL="https://hardwareembu.onrender.com/api"
 *        $env:SEED_ADMIN_EMAIL="admin"
 *        $env:SEED_ADMIN_PASSWORD="Admin@123"
 *   2. npx tsx seed-product-images.ts
 *
 * Re-runnable: it only PATCHes products whose current imageUrl doesn't match
 * the one in the map, so re-running is a no-op once the data is consistent.
 */

import { imageFor } from "./lib/product-images";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "";

async function login(): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  });
  if (!res.ok) {
    throw new Error(`Login failed: ${res.status} ${await res.text()}`);
  }
  const body = await res.json();
  return body.data.accessToken as string;
}

type ApiProduct = {
  id: string;
  name: string;
  imageUrl: string | null;
};

async function listAllProducts(token: string): Promise<ApiProduct[]> {
  const out: ApiProduct[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `${API_BASE_URL}/inventory?page=${page}&limit=100`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      throw new Error(
        `Failed to fetch products (page ${page}): ${res.status} ${await res.text()}`
      );
    }
    const body = await res.json();
    const products: ApiProduct[] = body.data?.products ?? [];
    out.push(...products);
    const pagination = body.data?.pagination;
    if (!pagination || page >= pagination.totalPages) break;
    page++;
  }
  return out;
}

async function updateImageUrl(
  token: string,
  id: string,
  imageUrl: string
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/inventory/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ imageUrl })
  });
  if (!res.ok) {
    throw new Error(
      `Failed to update product ${id}: ${res.status} ${await res.text()}`
    );
  }
}

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error(
      "Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD env vars first."
    );
  }

  console.log(`Backfilling product imageUrl against ${API_BASE_URL} ...`);
  const token = await login();
  const products = await listAllProducts(token);
  console.log(`Found ${products.length} products.`);

  let updated = 0;
  let unchanged = 0;
  let noMatch = 0;
  let failed = 0;
  const noMatchNames: string[] = [];

  for (const p of products) {
    const imageUrl = imageFor(p.name);
    if (!imageUrl) {
      noMatch++;
      noMatchNames.push(p.name);
      continue;
    }
    if (p.imageUrl === imageUrl) {
      unchanged++;
      continue;
    }
    try {
      await updateImageUrl(token, p.id, imageUrl);
      console.log(`  ${p.name} -> ${imageUrl}`);
      updated++;
    } catch (err) {
      failed++;
      console.error(
        `  FAIL: ${p.name} — ${err instanceof Error ? err.message : err}`
      );
    }
  }

  console.log(
    `\nDone. updated=${updated}, unchanged=${unchanged}, no-match=${noMatch}, failed=${failed}`
  );
  if (noMatch > 0) {
    console.log(`No-match products (need entries in PRODUCT_IMAGE_MAP):`);
    for (const name of noMatchNames) console.log(`  - ${name}`);
    console.log(
      `Tip: open frontend/lib/product-images.ts and add entries for these products, then re-run.`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
