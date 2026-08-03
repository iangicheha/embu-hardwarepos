/**
 * update-prices.ts
 *
 * Reads hardware.xlsx (one sheet per category, columns: No. | Item | Quantity
 * | Unit Price (Ksh) | Total (Ksh)) and updates the sellingPrice on each
 * matching product's BASE-UNIT selling unit in the DB.
 *
 * Matching rule: Category.name === sheet name (exact), Product.name matches
 * the "Item" cell after trimming + collapsing whitespace + case-insensitive
 * comparison. Anything that doesn't match is SKIPPED and printed in the
 * "unmatched" report at the end — nothing is guessed or fuzzy-matched.
 *
 * This does NOT touch quantity/stock — only sellingPrice.
 *
 * Usage:
 *   npx ts-node scripts/update-prices.ts ./hardware.xlsx
 *   (or compile with your normal build step, then `node dist/scripts/update-prices.js ./hardware.xlsx`)
 *
 * Requires: npm install xlsx   (SheetJS — not the same as your seed scripts'
 * excel lib if different; check before installing a duplicate)
 */

import * as XLSX from "xlsx";
import prisma from "../src/database/prisma";

type ExcelRow = {
  "No."?: number;
  Item?: string;
  Quantity?: number;
  "Unit Price (Ksh)"?: number;
  "Total (Ksh)"?: number;
};

function normalize(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: ts-node update-prices.ts <path-to-hardware.xlsx>");
    process.exit(1);
  }

  const workbook = XLSX.readFile(filePath);

  const updated: string[] = [];
  const created: string[] = [];
  const unmatchedProducts: { sheet: string; item: string }[] = [];
  const unmatchedCategories: string[] = [];
  const skippedRows: { sheet: string; item: string; reason: string }[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];

    // Row 1 is the sheet title, row 2 blank, row 3 is the real header —
    // matches the structure seen in hardware.xlsx (No. | Item | Quantity |
    // Unit Price (Ksh) | Total (Ksh)).
    const rows: ExcelRow[] = XLSX.utils.sheet_to_json(sheet, {
      range: 2 // 0-indexed: skips the title row + blank row, header on row 3
    });

    const category = await prisma.category.findUnique({
      where: { name: sheetName },
      select: { id: true, name: true }
    });

    if (!category) {
      unmatchedCategories.push(sheetName);
      continue;
    }

    for (const row of rows) {
      const itemName = row["Item"]?.toString().trim();
      const unitPrice = row["Unit Price (Ksh)"];

      if (!itemName) continue; // blank/spacer row
      if (unitPrice === undefined || unitPrice === null || isNaN(Number(unitPrice))) {
        skippedRows.push({ sheet: sheetName, item: itemName, reason: "missing/invalid Unit Price" });
        continue;
      }

      const candidates = await prisma.product.findMany({
        where: { categoryId: category.id },
        select: { id: true, name: true, baseUnit: true }
      });

      const match = candidates.find((p: { id: string; name: string; baseUnit: string }) =>
        normalize(p.name) === normalize(itemName)
      );

      if (!match) {
        unmatchedProducts.push({ sheet: sheetName, item: itemName });
        continue;
      }

      const existingUnit = await prisma.productUnit.findUnique({
        where: {
          productId_unit: { productId: match.id, unit: match.baseUnit }
        }
      });

      if (existingUnit) {
        await prisma.productUnit.update({
          where: { id: existingUnit.id },
          data: { sellingPrice: Number(unitPrice) }
        });
        updated.push(`${sheetName} / ${match.name}: -> Ksh ${unitPrice}`);
      } else {
        await prisma.productUnit.create({
          data: {
            productId: match.id,
            unit: match.baseUnit,
            conversionToBase: 1,
            sellingPrice: Number(unitPrice)
          }
        });
        created.push(`${sheetName} / ${match.name}: base unit '${match.baseUnit}' @ Ksh ${unitPrice}`);
      }
    }
  }

  console.log("\n=== UPDATED PRICES (" + updated.length + ") ===");
  updated.forEach((l) => console.log("  " + l));

  console.log("\n=== CREATED BASE-UNIT PRICES (" + created.length + ") ===");
  created.forEach((l) => console.log("  " + l));

  console.log("\n=== UNMATCHED PRODUCTS (" + unmatchedProducts.length + ") — no product with this name in this category ===");
  unmatchedProducts.forEach((u) => console.log(`  [${u.sheet}] "${u.item}"`));

  console.log("\n=== UNMATCHED CATEGORIES (" + unmatchedCategories.length + ") — no Category row with this exact name ===");
  unmatchedCategories.forEach((c) => console.log(`  "${c}"`));

  if (skippedRows.length) {
    console.log("\n=== SKIPPED ROWS (" + skippedRows.length + ") — bad data in the sheet itself ===");
    skippedRows.forEach((s) => console.log(`  [${s.sheet}] "${s.item}": ${s.reason}`));
  }

  console.log(
    `\nDone. ${updated.length} updated, ${created.length} newly created, ` +
    `${unmatchedProducts.length + unmatchedCategories.length} skipped for review.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
