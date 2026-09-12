/*
  Warnings:

  - You are about to alter the column `unitPrice` on the `materials` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,4)` to `Decimal(10,6)`.

*/
-- AlterTable
ALTER TABLE "materials" ALTER COLUMN "unitPrice" SET DATA TYPE DECIMAL(10,6);
