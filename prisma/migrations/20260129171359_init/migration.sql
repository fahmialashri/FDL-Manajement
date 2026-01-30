/*
  Warnings:

  - You are about to drop the column `productId` on the `InvoiceItem` table. All the data in the column will be lost.
  - Added the required column `productName` to the `InvoiceItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unit` to the `InvoiceItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "InvoiceItem" DROP CONSTRAINT "InvoiceItem_productId_fkey";

-- AlterTable
ALTER TABLE "InvoiceItem" DROP COLUMN "productId",
ADD COLUMN     "productName" TEXT NOT NULL,
ADD COLUMN     "unit" TEXT NOT NULL;
