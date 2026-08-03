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

  const plumbingCategory = await prisma.category.findUnique({
    where: { name: "Plumbing" }
  });

  const sampleProducts = [
    {
      productCode: "HAM-001",
      name: "Claw Hammer",
      description: "16oz steel claw hammer",
      buyingPrice: 450,
      sellingPrice: 750,
      quantity: 50,
      reorderLevel: 10,
      categoryId: toolsCategory?.id
    },
    {
      productCode: "SWR-001",
      name: "Steel Wire",
      description: "Galvanized steel wire roll",
      buyingPrice: 800,
      sellingPrice: 1200,
      quantity: 30,
      reorderLevel: 5,
      categoryId: buildingMaterialsCategory?.id
    },
    {
      productCode: "PNT-001",
      name: "Wall Paint 4L",
      description: "White emulsion paint",
      buyingPrice: 1200,
      sellingPrice: 1800,
      quantity: 8,
      reorderLevel: 10,
      categoryId: paintsCategory?.id
    }
  ];

  // Add plumbing products from the provided data
  const plumbingProducts = [
    { name: "Waste gully trap", price: 150 },
    { name: "Connection tubes", price: 300 },
    { name: "PVC fitting and piping 100ml", price: 280 },
    { name: "PVC fitting and piping 50ml", price: 200 },
    { name: "Contact pipe 100ml", price: 250 },
    { name: "Piping 1 1/4 inch", price: 60 },
    { name: "Piping 1 1/2 inch", price: 150 },
    { name: "Piping 2 inch", price: 100 },
    { name: "Flex tube metallic - Lirlee 1.5feet", price: 200 },
    { name: "Flex tube metallic -Lirlee 2feet", price: 250 },
    { name: "Bottle trap 1 1/2 inch", price: 180 },
    { name: "Flexible magic connector", price: 180 },
    { name: "Waste plug 3\"", price: 100 },
    { name: "Waste plug - 1/1/2", price: 40 },
    { name: "Waste plug - 2\"", price: 60 },
    { name: "Second pile 3/4 inch", price: 30 },
    { name: "Second pile 1/2 inch", price: 30 },
    { name: "PVC male connector 3/4 inch", price: 40 },
    { name: "PVC male connector 1/2 inch", price: 40 },
    { name: "T-pipe 1/2 inch", price: 30 },
    { name: "Big bend 1 inch", price: 50 },
    { name: "PVC socket 3/4 inch", price: 30 },
    { name: "PVC socket 1/2 inch", price: 20 },
    { name: "Male tee 1/2 by 1/2", price: 60 },
    { name: "Female tee 3/4 by 3/4", price: 70 },
    { name: "Male adapter", price: 100 },
    { name: "Male-female tee 3/4 by 1/2", price: 70 },
    { name: "Female adapter 3/4 by 1/2", price: 70 },
    { name: "Male adapter 3/4 by 1/2", price: 70 },
    { name: "Female elbow 3/4 by 1/2", price: 60 },
    { name: "Male elbow 3/4 by 1/2", price: 60 },
    { name: "Female adapter 3/4 by 3/4", price: 70 },
    { name: "Female tee 1/2 by 1/2", price: 60 },
    { name: "Female tee 3/4 by 1/2", price: 60 },
    { name: "Flexible cable 1/2 by 30", price: 80 },
    { name: "PPR elbow 3/4", price: 30 },
    { name: "PPR tee 3/4", price: 40 },
    { name: "PPR plain socket 3/4", price: 40 },
    { name: "Angle valve", price: 300 },
    { name: "Sink hole", price: 100 },
    { name: "Thread seal tape - small", price: 30 },
    { name: "Thread seal tape - big", price: 100 },
    { name: "Metal pipe rodes 1feet", price: 150 },
    { name: "Metal pipe rodes 1.5", price: 200 },
    { name: "Metal pipe rodes 3 feet", price: 300 },
    { name: "Waste t 4 inch", price: 250 },
    { name: "Inspection bend 110*92.5", price: 300 },
    { name: "Waste elbow 45 inch 90", price: 180 },
    { name: "Waste elbow 3 inch 45", price: 150 },
    { name: "Waste elbow 3 inch 90", price: 150 },
    { name: "Waste t 3 inch", price: 200 },
    { name: "Inspection bend 110mm", price: 300 },
    { name: "4 way floor trap", price: 350 },
    { name: "1 way floor trap", price: 250 },
    { name: "1 way floor trap(black)", price: 150 },
    { name: "Waste pipe cover", price: 100 },
    { name: "Floor trap cover I(gratter)big", price: 60 },
    { name: "Floor trap cover I(gratter)small silver", price: 40 },
    { name: "Floor trap cover I(gratter)small plastic", price: 40 },
    { name: "Butterfly bush", price: 100 },
    { name: "Bullet bush", price: 120 },
    { name: "Bush", price: 60 },
    { name: "Floor trap cover", price: 150 },
    { name: "GI elbow 1/2", price: 30 },
    { name: "GI socket 1/2", price: 30 },
    { name: "GI hex 1/2", price: 30 },
    { name: "GI Back nut 1/2", price: 30 },
    { name: "GI Back nut 3/4", price: 40 },
    { name: "GI cup 1/2", price: 30 },
    { name: "GI cork 1/2", price: 30 },
    { name: "GI union", price: 80 },
    { name: "GI t 1/2", price: 40 },
    { name: "GI long nipple 1/2", price: 50 },
    { name: "GI short nipple 1/2", price: 30 },
    { name: "GI cup 3/4", price: 40 },
    { name: "GI hex 3/4", price: 50 },
    { name: "GI socket 3/4", price: 40 },
    { name: "GI elbow 3/4", price: 40 },
    { name: "Red bush 3/4", price: 40 },
    { name: "GI t 3/4", price: 50 },
    { name: "Red bush 1/2", price: 40 },
    { name: "Red socket 3/4", price: 40 },
    { name: "Red socket 1/2", price: 40 },
    { name: "GI union 3/4", price: 100 },
    { name: "GI socket 1 inch", price: 90 },
    { name: "Red 2*1/1/4", price: 40 },
    { name: "Red 1/1/2 *1/1/4", price: 30 },
    { name: "Pillar tap 3/4", price: 500 },
    { name: "Gate valve pn2 1/2", price: 200 },
    { name: "GI end cork 3/4", price: 40 },
    { name: "Short nipple 3/4", price: 50 },
    { name: "Long nipple 3/4", price: 80 },
    { name: "HDPE socket 1/2 heavy duty", price: 150 },
    { name: "HDPE elbow 1/2 heavy duty", price: 120 },
    { name: "HDPE t 1/2 heavy duty", price: 200 },
    { name: "HDPE lightgauge elbow 1/2", price: 130 },
    { name: "HDPE lightgauge t1/2", price: 150 },
    { name: "HDPE lightgauge male socket 1/2", price: 120 },
    { name: "HDPE lightgauge female socket 1/2", price: 120 },
    { name: "Flexible tube 1/2*30 cm", price: 80 },
    { name: "Flexible tube 1.5", price: 100 },
    { name: "Flexible tube 2 feet", price: 150 },
    { name: "Flexible tube fiber 1.5 feet", price: 120 },
    { name: "Flexible tube fiber 2 feet", price: 180 },
    { name: "Red pipe 4 inch long", price: 1400 },
    { name: "White pipe 4 inch long", price: 1200 },
    { name: "Water pipe 1/1/2 inch", price: 450 },
    { name: "Water pipe 2 inch", price: 600 },
    { name: "One white half 4 inch", price: 600 },
    { name: "Electric pipe", price: 100 },
    { name: "3/4 pipe long", price: 300 },
    { name: "1/2 pipe long", price: 180 },
    { name: "Danco 1/2", price: 250 },
    { name: "PVC water host clear 1/2 inches *60feet", price: 700 },
    { name: "PVC water host 1/2 inches *60feet", price: 700 },
    { name: "Male Socket 1/2\"", price: 50 },
    { name: "PPR Socket 1/2\"", price: 20 },
    { name: "PPR Elbow 1/2\"", price: 20 },
    { name: "Male Elbow 1/2\"", price: 50 },
    { name: "PPR gate valve 3/4", price: 200 },
    { name: "PPR female socket 3/4", price: 60 },
    { name: "PPR male socket 3/4", price: 60 },
    { name: "PPR female elbow 3/4", price: 60 },
    { name: "PPR male elbow 3/4", price: 60 },
    { name: "PPR female tee 3/4", price: 70 },
    { name: "PPR male tee 3/4", price: 70 },
    { name: "PPR union 3/4", price: 120 },
    { name: "PPR stop cock 3/4", price: 350 },
    { name: "PPR tank connector 3/4", price: 100 },
    { name: "PPR reducer 3/4 to 1/2", price: 30 },
    { name: "PPR end cap 3/4", price: 20 }
  ];

  // Process all products
  const allToSeed = [
    ...sampleProducts,
    ...plumbingProducts.map((p, idx) => ({
      productCode: `PLM-${String(idx + 1).padStart(3, '0')}`,
      name: p.name,
      description: `${p.name} - Plumbing and Piping`,
      buyingPrice: Math.round(p.price * 0.8), // Estimate buying price as 80% of selling price
      sellingPrice: p.price,
      quantity: 20,
      reorderLevel: 5,
      categoryId: plumbingCategory?.id
    }))
  ];

  for (const p of allToSeed) {
    const { sellingPrice, ...productData } = p;
    await prisma.product.upsert({
      where: { productCode: p.productCode },
      update: {
        buyingPrice: productData.buyingPrice,
        categoryId: productData.categoryId,
        sellingUnits: {
          updateMany: {
            where: { unit: "pcs" },
            data: { sellingPrice: sellingPrice }
          }
        }
      },
      create: {
        ...productData,
        supplierId: supplier.id,
        sellingUnits: {
          create: {
            unit: "pcs",
            conversionToBase: 1,
            sellingPrice: sellingPrice
          }
        }
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