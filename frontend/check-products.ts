import * as XLSX from "xlsx";
import * as path from "path";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://hardwareembu.onrender.com/api";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "";

const XLSX_PATH =
  process.env.XLSX_PATH ??
  path.join(__dirname, "hardware (1).xlsx");

async function login(): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });

  if (!res.ok) {
    throw new Error(`Login failed: ${res.status}`);
  }

  const body = await res.json();
  return body.data.accessToken;
}

async function getAllProducts(token: string): Promise<Set<string>> {
  const products = new Set<string>();

  let page = 1;

  while (true) {
    const res = await fetch(
      `${API_BASE_URL}/inventory?page=${page}&limit=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch inventory`);
    }

    const body = await res.json();

    const rows = body.data.products ?? [];

    for (const p of rows) {
      products.add(String(p.name).trim().toLowerCase());
    }

    const pagination = body.data.pagination;

    if (!pagination || page >= pagination.totalPages) {
      break;
    }

    page++;
  }

  return products;
}

function getExcelProducts(): string[] {
  const workbook = XLSX.readFile(XLSX_PATH);

  const names: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];

    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
    });

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      if (!row || !row[1]) continue;

      const name = String(row[1]).trim();

      if (name.toLowerCase() === "grand total") continue;

      names.push(name);
    }
  }

  return names;
}

async function main() {
  const token = await login();

  const dbProducts = await getAllProducts(token);

  const excelProducts = getExcelProducts();

  const missing: string[] = [];

  for (const product of excelProducts) {
    if (!dbProducts.has(product.toLowerCase())) {
      missing.push(product);
    }
  }

  console.log("\n===============================");
  console.log(`Excel Products : ${excelProducts.length}`);
  console.log(`POS Products   : ${dbProducts.size}`);
  console.log(`Missing        : ${missing.length}`);
  console.log("===============================\n");

  if (missing.length > 0) {
    console.log("MISSING PRODUCTS:\n");

    for (const p of missing) {
      console.log(`- ${p}`);
    }
  } else {
    console.log("✅ All Excel products exist in POS");
  }
}

main().catch(console.error);