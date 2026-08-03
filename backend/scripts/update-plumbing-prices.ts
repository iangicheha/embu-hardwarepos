import prisma from "../src/database/prisma";
const plumbingData = require("../../backend/scripts/plumbing-piping.json") as Array<{
  name: string;
  unitPrice: number;
}>;

async function main() {
  console.log("Starting plumbing prices update...");
  
  let updatedCount = 0;
  let createdUnitCount = 0;
  let notFoundCount = 0;

  for (const item of plumbingData) {
    const productName = item.name.trim();
    const sellingPrice = item.unitPrice;

    // Find the product by name (case-insensitive)
    const product = await prisma.product.findFirst({
      where: {
        name: {
          equals: productName,
          mode: 'insensitive'
        }
      },
      include: {
        sellingUnits: true
      }
    });

    if (product) {
      // Check if it has a 'pcs' unit or any unit to update
      const pcsUnit = product.sellingUnits.find(u => u.unit.toLowerCase() === 'pcs');
      
      if (pcsUnit) {
        await prisma.productUnit.update({
          where: { id: pcsUnit.id },
          data: { sellingPrice }
        });
        updatedCount++;
      } else if (product.sellingUnits.length > 0) {
        // Update the first unit if no 'pcs' unit exists
        await prisma.productUnit.update({
          where: { id: product.sellingUnits[0].id },
          data: { sellingPrice }
        });
        updatedCount++;
      } else {
        // Create a default unit if none exist
        await prisma.productUnit.create({
          data: {
            productId: product.id,
            unit: "pcs",
            conversionToBase: 1,
            sellingPrice
          }
        });
        createdUnitCount++;
      }
    } else {
      notFoundCount++;
      // Optional: Create the product if it doesn't exist? 
      // The user said "update", so maybe we shouldn't create new ones unless asked.
      // But adding them to the seed is better for new setups.
    }
  }

  console.log(`Update complete:`);
  console.log(`- Updated prices for ${updatedCount} products`);
  console.log(`- Created new selling units for ${createdUnitCount} products`);
  console.log(`- Products not found in database: ${notFoundCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
