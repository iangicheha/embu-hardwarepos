/**
 * seed-categories.ts
 *
 * One-time script to populate real categories in the database via the
 * existing /categories API (see createCategory in lib/api.ts) instead of
 * hardcoding category names anywhere in the frontend.
 *
 * Usage:
 *   1. Make sure your backend is running and NEXT_PUBLIC_API_URL / API_BASE_URL
 *      points at it.
 *   2. You need a logged-in admin token. Either:
 *        a) run this in a browser console on an already-logged-in admin session, or
 *        b) fill in ADMIN_EMAIL / ADMIN_PASSWORD below to log in first.
 *   3. Run with: npx tsx seed-categories.ts   (or ts-node)
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "";

// Name + description + color per category. Color is optional — the frontend
// already auto-picks one from the name (pickColor) if you omit it, so it's
// left out here on purpose to reuse that logic rather than duplicate it.
const CATEGORIES: Array<{ name: string; description: string }> = [
  { name: "Electrical", description: "Lampholders, switches, sockets, cable clips, bulbs, tape, boxes" },
  { name: "Garden Tools", description: "Rakes, pangas, jembes, hammers, spades, sprayers and related tools" },
  { name: "Painting Tools & Materials", description: "Brushes, rollers, thinner, turpentine" },
  { name: "Bathroom & Toiletry", description: "Flush handles, taps, cisterns, toilet pans/bowls, shower heads" },
  { name: "General Hardware", description: "Plumb bobs, chair pins, screw hooks, padlocks, concrete nails, oils" },
  { name: "Hand Tools & Measuring", description: "Files, trowels, try squares, tape measures" },
  { name: "Window & Lock Fittings", description: "Window stays/fasteners, lock bolts, tower bolts, bed nuts" },
  { name: "Screws & Fasteners", description: "MDF screws, gypsum screws, wood screws" },
  { name: "Ropes", description: "General purpose and sized ropes" },
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
  const res = await fetch(`${API_BASE_URL}/categories?page=1&limit=200`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`);
  const body = await res.json();
  const names: string[] = (body.data.categories ?? []).map((c: any) => c.name);
  return new Set(names);
}

async function createCategory(token: string, cat: { name: string; description: string }) {
  const res = await fetch(`${API_BASE_URL}/categories`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(cat),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create "${cat.name}": ${res.status} ${text}`);
  }
  return res.json();
}

async function main() {
  let token: string;

  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    token = await login();
  } else if (typeof window !== "undefined") {
    token = window.localStorage.getItem("accessToken") ?? "";
    if (!token) throw new Error("No accessToken in localStorage — log in first.");
  } else {
    throw new Error("Set SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars, or run in an authenticated browser console.");
  }

  const existing = await getExistingCategoryNames(token);

  for (const cat of CATEGORIES) {
    if (existing.has(cat.name)) {
      console.log(`Skipping "${cat.name}" — already exists`);
      continue;
    }
    await createCategory(token, cat);
    console.log(`Created "${cat.name}"`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});