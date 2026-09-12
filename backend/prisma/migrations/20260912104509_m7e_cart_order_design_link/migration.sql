-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN     "designId" TEXT;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "designId" TEXT;

-- CreateIndex
CREATE INDEX "cart_items_designId_idx" ON "cart_items"("designId");

-- CreateIndex
CREATE INDEX "order_items_designId_idx" ON "order_items"("designId");

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_designId_fkey" FOREIGN KEY ("designId") REFERENCES "designs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_designId_fkey" FOREIGN KEY ("designId") REFERENCES "designs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
