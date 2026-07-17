-- AlterTable
ALTER TABLE "products" ADD COLUMN     "imageUrl" TEXT;

-- CreateTable
CREATE TABLE "printers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "printerType" TEXT NOT NULL DEFAULT 'THERMAL',
    "connectionType" TEXT NOT NULL DEFAULT 'USB',
    "ipAddress" TEXT,
    "port" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "paperSize" TEXT NOT NULL DEFAULT '80MM',
    "autoPrint" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "printers_pkey" PRIMARY KEY ("id")
);
