-- CreateTable
CREATE TABLE "checkout_attempts" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "snapshotHash" TEXT NOT NULL,
    "intentHash" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "cartSnapshot" JSONB NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'reserved',
    "result" JSONB,
    "reconciliation" JSONB,
    "isolation" JSONB,
    "attachment" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checkout_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkout_request_keys" (
    "customerId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,

    CONSTRAINT "checkout_request_keys_pkey" PRIMARY KEY ("customerId","key")
);

-- CreateIndex
CREATE UNIQUE INDEX "checkout_attempts_orderId_key" ON "checkout_attempts"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "checkout_attempts_customerId_snapshotHash_key" ON "checkout_attempts"("customerId", "snapshotHash");

-- AddForeignKey
ALTER TABLE "checkout_attempts" ADD CONSTRAINT "checkout_attempts_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_request_keys" ADD CONSTRAINT "checkout_request_keys_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "checkout_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- A millisecond timestamp cannot detect edit/restore in one millisecond.
ALTER TABLE "cart_items" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;
CREATE FUNCTION checkout_cart_item_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.revision := OLD.revision + 1; RETURN NEW; END;
$$;
CREATE TRIGGER checkout_cart_item_revision BEFORE UPDATE ON "cart_items"
FOR EACH ROW EXECUTE FUNCTION checkout_cart_item_revision();
CREATE INDEX "checkout_attempts_customerId_state_idx" ON "checkout_attempts"("customerId","state");

CREATE TABLE checkout_status_operations (
 "id" TEXT PRIMARY KEY,"attemptId" TEXT NOT NULL REFERENCES checkout_attempts(id) ON DELETE RESTRICT ON UPDATE CASCADE,"actorId" TEXT NOT NULL,"reason" TEXT NOT NULL,"providerRef" TEXT NOT NULL,"observedProviderStatus" TEXT NOT NULL,"state" TEXT NOT NULL DEFAULT 'started',"outcome" JSONB,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "checkout_status_operations_attemptId_state_idx" ON checkout_status_operations("attemptId",state);

-- Partial index is intentionally SQL-managed (Prisma 5 does not model partial uniqueness).
CREATE UNIQUE INDEX checkout_status_operations_one_started ON checkout_status_operations("attemptId") WHERE state='started';
