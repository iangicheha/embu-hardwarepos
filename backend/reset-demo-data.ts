/**
 * ONE-TIME SCRIPT: wipes demo/test transactional data before going to production.
 *
 * Deletes:
 *   - OrderItem  (child of Order + Product)
 *   - Order      (parent — weekly/monthly payment figures are derived from this)
 *   - Restock    (child of Product + Supplier + User)
 *
 * Keeps untouched:
 *   - Product, Category, Supplier, User, Customer, Setting, Printer
 *
 * IMPORTANT: this does NOT touch Product.quantity. If your demo orders/restocks
 * changed stock counts, those counts will still reflect the deleted transactions.
 * If you want stock quantities reset too, uncomment the RESET_QUANTITIES block
 * below and set the value you want each product to start at.
 *
 * Run with:  npx ts-node reset-demo-data.ts
 * (or compile and run with node, depending on your project setup)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting demo data reset...");

  const deletedOrderItems = await prisma.orderItem.deleteMany({});
  console.log(`Deleted ${deletedOrderItems.count} order items`);

  const deletedOrders = await prisma.order.deleteMany({});
  console.log(`Deleted ${deletedOrders.count} orders`);

  const deletedRestocks = await prisma.restock.deleteMany({});
  console.log(`Deleted ${deletedRestocks.count} restocks`);

  // --- OPTIONAL: reset product stock quantities to zero ---
  // Uncomment if your demo orders/restocks left quantities in a state
  // that no longer makes sense once the transactions are gone.
  //
  // const resetQuantities = await prisma.product.updateMany({
  //   data: { quantity: 0 }
  // });
  // console.log(`Reset quantity to 0 on ${resetQuantities.count} products`);

  console.log("Done. Products, categories, and suppliers were left untouched.");
}

main()
  .catch((err) => {
    console.error("Reset failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
