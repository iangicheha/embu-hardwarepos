/**
 * scripts/backfill-selling-units.ts
 *
 * Every product created before the multi-unit migration has ZERO rows in
 * ProductUnit — that's why the POS shows no price and does nothing when you
 * click a product. This script gives every such product a single default
 * selling unit ("pcs", conversionToBase 1) so it becomes sellable again.
 *
 * Price source, in priority order:
 *   1. price-list.json (name match, case-insensitive) — your original
 *      stock-take spreadsheet, treated as the selling price.
 *   2. buyingPrice * 1.2 (20% markup) as a last-resort fallback so nothing
 *      is left at 0 — you should review and correct these afterwards.
 *
 * DRY RUN BY DEFAULT. Run with `--apply` to actually write changes.
 *
 *   npx ts-node scripts/backfill-selling-units.ts          # preview only
 *   npx ts-node scripts/backfill-selling-units.ts --apply  # writes changes
 */
import prisma from "../src/database/prisma"; // adjust path if your prisma client lives elsewhere
import priceList from "./price-list.json";

const APPLY = process.argv.includes("--apply");

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

async function main() {
  const priceByName = new Map<string, number>();
  for (const row of priceList as { name: string; unitPrice: number }[]) {
    const key = normalize(row.name);
    // if a name repeats across sheets, keep the first price seen and warn
    if (!priceByName.has(key)) {
      priceByName.set(key, row.unitPrice);
    }
  }

  const products = await prisma.product.findMany({
    include: { sellingUnits: true }
  });

  const needsBackfill = products.filter((p) => p.sellingUnits.length === 0);

  console.log(`Total products: ${products.length}`);
  console.log(`Products missing sellingUnits: ${needsBackfill.length}`);
  console.log(APPLY ? "Mode: APPLY (writing changes)" : "Mode: DRY RUN (no changes written)");
  console.log("");

  let matchedFromSheet = 0;
  let fallbackMarkup = 0;

  for (const product of needsBackfill) {
    const key = normalize(product.name);
    const sheetPrice = priceByName.get(key);
    const buyingPrice = Number(product.buyingPrice);
    const sellingPrice = sheetPrice ?? Math.round(buyingPrice * 1.2);
    const source = sheetPrice !== undefined ? "price-list match" : "20% markup fallback";

    if (sheetPrice !== undefined) matchedFromSheet += 1;
    else fallbackMarkup += 1;

    console.log(
      `${product.productCode}\t${product.name}\t-> ${sellingPrice} (${source})`
    );

    if (APPLY) {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          baseUnit: product.baseUnit || "pcs",
          sellingUnits: {
            create: {
              unit: "pcs",
              conversionToBase: 1,
              sellingPrice
            }
          }
        }
      });
    }
  }

  console.log("");
  console.log(`Matched from price-list.json: ${matchedFromSheet}`);
  console.log(`Fell back to 20% markup: ${fallbackMarkup}`);
  if (!APPLY) {
    console.log("\nThis was a dry run — nothing was written. Re-run with --apply to commit.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
