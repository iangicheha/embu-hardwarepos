/**
 * scripts/find-duplicate-products.ts
 *
 * Lists any products that share the same name (case-insensitive) — the
 * likely cause of "duplicates" showing in the POS grid, e.g. from an import
 * script that ran more than once, or two products created for the same
 * item under slightly different productCodes.
 *
 * Read-only — makes no changes. Run it, review the output, then decide
 * which duplicate(s) to archive/delete via the Products page.
 *
 *   npx ts-node scripts/find-duplicate-products.ts
 */
import prisma from "../src/database/prisma"; // adjust path if your prisma client lives elsewhere

async function main() {
  const products = await prisma.product.findMany({
    where: { isArchived: false },
    include: { _count: { select: { orderItems: true } } },
    orderBy: { name: "asc" }
  });

  const groups = new Map<string, typeof products>();
  for (const p of products) {
    const key = p.name.trim().toLowerCase();
    const list = groups.get(key) ?? [];
    list.push(p);
    groups.set(key, list);
  }

  const duplicates = [...groups.entries()].filter(([, list]) => list.length > 1);

  if (duplicates.length === 0) {
    console.log("No duplicate product names found.");
    return;
  }

  console.log(`Found ${duplicates.length} product name(s) with duplicates:\n`);
  for (const [name, list] of duplicates) {
    console.log(`"${name}" — ${list.length} entries:`);
    for (const p of list) {
      console.log(
        `  id=${p.id}  code=${p.productCode}  qty=${p.quantity}  orders=${p._count.orderItems}  createdAt=${p.createdAt.toISOString()}`
      );
    }
    console.log("");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
