/*
  Warnings:

  - You are about to alter the column `quantity` on the `order_items` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(12,4)`.
  - You are about to alter the column `quantity` on the `products` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(12,4)`.
  - You are about to alter the column `reorderLevel` on the `products` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(12,4)`.
  - You are about to alter the column `quantityAdded` on the `restocks` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(12,4)`.

*/
-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "productUnitId" TEXT,
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(12,4);

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "baseUnit" TEXT NOT NULL DEFAULT 'pcs',
ALTER COLUMN "quantity" SET DEFAULT 0,
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(12,4),
ALTER COLUMN "reorderLevel" SET DEFAULT 10,
ALTER COLUMN "reorderLevel" SET DATA TYPE DECIMAL(12,4);

-- AlterTable
ALTER TABLE "restocks" ALTER COLUMN "quantityAdded" SET DATA TYPE DECIMAL(12,4);

-- CreateTable
CREATE TABLE "product_units" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "conversionToBase" DECIMAL(12,4) NOT NULL,
    "sellingPrice" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_units_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_units_productId_unit_key" ON "product_units"("productId", "unit");

-- AddForeignKey
ALTER TABLE "product_units" ADD CONSTRAINT "product_units_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productUnitId_fkey" FOREIGN KEY ("productUnitId") REFERENCES "product_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
