-- CreateTable
CREATE TABLE "dispatch_prototype_reservations" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "packetHash" TEXT NOT NULL,
    "packet" JSONB NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'reserved',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispatch_prototype_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_prototype_attempts" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "packetHash" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'attempt_started',
    "providerReference" TEXT NOT NULL,
    "result" JSONB,
    "failureCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispatch_prototype_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_prototype_reservations_orderId_key" ON "dispatch_prototype_reservations"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_prototype_attempts_reservationId_key" ON "dispatch_prototype_attempts"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_prototype_attempts_providerReference_key" ON "dispatch_prototype_attempts"("providerReference");

-- AddForeignKey
ALTER TABLE "dispatch_prototype_attempts" ADD CONSTRAINT "dispatch_prototype_attempts_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "dispatch_prototype_reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE dispatch_prototype_reservations ADD CONSTRAINT dispatch_prototype_order_fk FOREIGN KEY ("orderId") REFERENCES orders(id) ON DELETE RESTRICT;
