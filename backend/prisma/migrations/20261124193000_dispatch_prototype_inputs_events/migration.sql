-- CreateTable
CREATE TABLE "dispatch_prototype_inputs" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "hubId" TEXT NOT NULL,
    "pickup" JSONB NOT NULL,
    "parcels" JSONB NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispatch_prototype_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_prototype_events" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "attemptId" TEXT,
    "kind" TEXT NOT NULL,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispatch_prototype_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_prototype_inputs_orderId_key" ON "dispatch_prototype_inputs"("orderId");

-- CreateIndex
CREATE INDEX "dispatch_prototype_events_reservationId_createdAt_idx" ON "dispatch_prototype_events"("reservationId", "createdAt");
ALTER TABLE dispatch_prototype_inputs ADD CONSTRAINT dispatch_inputs_order_fk FOREIGN KEY ("orderId") REFERENCES orders(id) ON DELETE RESTRICT;
ALTER TABLE dispatch_prototype_inputs ADD CONSTRAINT dispatch_inputs_hub_fk FOREIGN KEY ("hubId") REFERENCES consolidation_hubs(id) ON DELETE RESTRICT;
ALTER TABLE dispatch_prototype_events ADD CONSTRAINT dispatch_event_reservation_fk FOREIGN KEY ("reservationId") REFERENCES dispatch_prototype_reservations(id) ON DELETE RESTRICT;
CREATE FUNCTION dispatch_prototype_event_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Dispatch prototype events are append-only' USING ERRCODE='23514'; END; $$;
CREATE TRIGGER dispatch_prototype_event_append_only BEFORE UPDATE OR DELETE ON dispatch_prototype_events FOR EACH ROW EXECUTE FUNCTION dispatch_prototype_event_immutable();
