-- SEC-03c: Stripe webhook event ledger — idempotency for webhook processing.
-- The (eventId) unique index is the concurrency arbiter: concurrent duplicate
-- deliveries race on INSERT; the loser aborts the transaction without
-- repeating side effects.

CREATE TABLE "processed_stripe_events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_stripe_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "processed_stripe_events_eventId_key" ON "processed_stripe_events"("eventId");
