/*
  Warnings:

  - A unique constraint covering the columns `[receiptNumber]` on the table `orders` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "receiptNumber" TEXT,
ADD COLUMN     "subtotal" DECIMAL(12,2),
ADD COLUMN     "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Backfill existing data
UPDATE "orders" SET "receiptNumber" = 'REC-' || id, "subtotal" = "totalAmount" WHERE "receiptNumber" IS NULL;

-- Make columns NOT NULL after backfill
ALTER TABLE "orders" ALTER COLUMN "receiptNumber" SET NOT NULL,
ALTER COLUMN "subtotal" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "orders_receiptNumber_key" ON "orders"("receiptNumber");

-- CreateIndex
CREATE INDEX "orders_receiptNumber_idx" ON "orders"("receiptNumber");
