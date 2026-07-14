import bcrypt from "bcrypt";
import prisma from "./prisma";

async function main() {
  const password = await bcrypt.hash("Admin@123", 12);

  await prisma.user.upsert({
    where: { email: "admin@hardware.com" },
    update: { username: "admin" },
    create: {
      fullName: "System Admin",
      username: "admin",
      email: "admin@hardware.com",
      phone: "+254700000000",
      passwordHash: password,
      role: "admin",
      isActive: true
    }
  });

  const settingsCount = await prisma.setting.count();

  if (settingsCount === 0) {
    await prisma.setting.create({
      data: {
        businessName: "Hardware Store",
        address: "Nairobi, Kenya",
        phone: "+254700000000",
        email: "info@hardware.com",
        taxRate: 16,
        currency: "KES",
        receiptFooter: "Thank you for shopping with us."
      }
    });
  }

  const categories = [
    { name: "Building Materials", description: "Cement, sand, aggregates, bricks, and blocks" },
    { name: "Plumbing", description: "Pipes, fittings, and fixtures"},
    { name: "Electrical", description: "Wiring and electrical supplies" },
    { name: "Paints & Finishes", description: "Paints, primers, and finishing products" },
    { name: "Tools & Equipment", description: "Hand and power tools,machinery, and equipment" },
    { name: "Fasteners & Locks", description: "Nails, screws, bolts,padlocks, and security hardware" },
    { name: "Roofing", description: "Roofing sheets, tiles, gutters,and accessories" },
    { name: "Agricultural Supplies", description: "Farming tools, fertilizers, and agro supplies" },
    { name: "Safety Equipment", description: "PPE, gloves, helmets, and safety gear" },
    { name: "General Hardware", description: "Miscellaneous hardwareitems" }
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category
    });
  }

  let supplier = await prisma.supplier.findFirst({
    where: { supplierName: "Default Supplier Ltd" }
  });

  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: {
        supplierName: "Default Supplier Ltd",
        contactPerson: "John Doe",
        phone: "+254711111111",
        email: "supplier@example.com",
        address: "Industrial Area, Nairobi"
      }
    });
  }

  const toolsCategory = await prisma.category.findUnique({
    where: { name: "Tools & Equipment" }
  });
  const buildingMaterialsCategory = await prisma.category.findUnique({
    where: { name: "Building Materials" }
  });
  const paintsCategory = await prisma.category.findUnique({
    where: { name: "Paints & Finishes" }
  });

  const sampleProducts = [
    {
      productCode: "HAM-001",
      name: "Claw Hammer",
      description: "16oz steel claw hammer",
      buyingPrice: 450,
      sellingPrice: 750,
      quantity: 50,
      reorderLevel: 10
    },
    {
      productCode: "SWR-001",
      name: "Steel Wire",
      description: "Galvanized steel wire roll",
      buyingPrice: 800,
      sellingPrice: 1200,
      quantity: 30,
      reorderLevel: 5
    },
    {
      productCode: "PNT-001",
      name: "Wall Paint 4L",
      description: "White emulsion paint",
      buyingPrice: 1200,
      sellingPrice: 1800,
      quantity: 8,
      reorderLevel: 10
    }
  ];

  const productCategoryMap: Record<string, string | undefined> = {
    "HAM-001": toolsCategory?.id,
    "SWR-001": buildingMaterialsCategory?.id,
    "PNT-001": paintsCategory?.id,
  };

  for (const product of sampleProducts) {
    await prisma.product.upsert({
      where: { productCode: product.productCode },
      update: {},
      create: {
        ...product,
        categoryId: productCategoryMap[product.productCode],
        supplierId: supplier.id
      }
    });
  }

  console.log("Seed completed: admin, settings, categories, supplier, products");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });