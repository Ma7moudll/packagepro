-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN     "sessionId" TEXT;

-- AlterTable
ALTER TABLE "designs" ADD COLUMN     "ownerId" TEXT,
ALTER COLUMN "orderId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "designs_ownerId_idx" ON "designs"("ownerId");

-- AddForeignKey
ALTER TABLE "designs" ADD CONSTRAINT "designs_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
