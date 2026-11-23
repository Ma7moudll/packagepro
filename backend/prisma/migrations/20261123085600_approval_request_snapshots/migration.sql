-- AlterTable
ALTER TABLE "order_approval_tokens" ADD COLUMN     "requestId" TEXT;

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'generating',
    "contentHash" TEXT NOT NULL,
    "designSnapshot" JSONB NOT NULL,
    "printFileId" TEXT NOT NULL,
    "printSha256" TEXT NOT NULL,
    "printSnapshotUrl" TEXT NOT NULL,
    "dielineFileId" TEXT,
    "dielineSha256" TEXT,
    "dielineSnapshotUrl" TEXT,
    "proofFileId" TEXT,
    "proofSha256" TEXT,
    "proofUrl" TEXT,
    "deliveryState" TEXT NOT NULL DEFAULT 'not_sent',
    "failureCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "approval_requests_orderId_createdAt_idx" ON "approval_requests"("orderId", "createdAt");

-- AddForeignKey
ALTER TABLE "order_approval_tokens" ADD CONSTRAINT "order_approval_tokens_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "approval_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_designId_fkey" FOREIGN KEY ("designId") REFERENCES "designs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

