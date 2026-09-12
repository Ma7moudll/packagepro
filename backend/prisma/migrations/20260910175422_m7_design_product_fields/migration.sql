-- AlterTable
ALTER TABLE "designs" ADD COLUMN     "designConfig" JSONB,
ADD COLUMN     "productId" TEXT,
ADD COLUMN     "sku" TEXT,
ADD COLUMN     "variantId" TEXT;

-- CreateIndex
CREATE INDEX "designs_sessionId_idx" ON "designs"("sessionId");

-- CreateIndex
CREATE INDEX "designs_productId_idx" ON "designs"("productId");
