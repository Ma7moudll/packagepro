CREATE TABLE "order_approval_tokens" (
 "tokenHash" TEXT NOT NULL PRIMARY KEY,
 "orderId" TEXT NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "consumedAt" TIMESTAMP(3)
);
CREATE INDEX "order_approval_tokens_orderId_idx" ON "order_approval_tokens"("orderId");
