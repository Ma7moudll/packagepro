-- CreateTable
CREATE TABLE "consolidation_hubs" (
    "id" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "consolidation_hubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consolidation_capabilities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hubId" TEXT NOT NULL,
    "canPlan" BOOLEAN NOT NULL DEFAULT false,
    "canReceive" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "consolidation_capabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consolidation_manifests" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "hubId" TEXT NOT NULL,
    "hubRevision" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "receiptRevision" INTEGER NOT NULL DEFAULT 0,
    "sourceHash" TEXT NOT NULL,
    "allocations" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consolidation_manifests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consolidation_receipt_events" (
    "id" TEXT NOT NULL,
    "manifestId" TEXT NOT NULL,
    "manifestRevision" INTEGER NOT NULL,
    "receiptRevision" INTEGER NOT NULL,
    "eventKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consolidation_receipt_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consolidation_confirmations" (
    "id" TEXT NOT NULL,
    "manifestId" TEXT NOT NULL,
    "manifestRevision" INTEGER NOT NULL,
    "receiptRevision" INTEGER NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "hubRevision" INTEGER NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consolidation_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "consolidation_capabilities_userId_hubId_key" ON "consolidation_capabilities"("userId", "hubId");

-- CreateIndex
CREATE UNIQUE INDEX "consolidation_manifests_orderId_key" ON "consolidation_manifests"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "consolidation_receipt_events_manifestId_eventKey_key" ON "consolidation_receipt_events"("manifestId", "eventKey");

-- CreateIndex
CREATE UNIQUE INDEX "consolidation_receipt_events_manifestId_receiptRevision_key" ON "consolidation_receipt_events"("manifestId", "receiptRevision");

-- CreateIndex
CREATE UNIQUE INDEX "consolidation_confirmations_manifestId_manifestRevision_rec_key" ON "consolidation_confirmations"("manifestId", "manifestRevision", "receiptRevision");

-- AddForeignKey
ALTER TABLE "consolidation_capabilities" ADD CONSTRAINT "consolidation_capability_user_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consolidation_capabilities" ADD CONSTRAINT "consolidation_capability_hub_fk" FOREIGN KEY ("hubId") REFERENCES "consolidation_hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consolidation_manifests" ADD CONSTRAINT "consolidation_manifest_order_fk" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consolidation_manifests" ADD CONSTRAINT "consolidation_manifest_hub_fk" FOREIGN KEY ("hubId") REFERENCES "consolidation_hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consolidation_manifests" ADD CONSTRAINT "consolidation_manifest_actor_fk" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consolidation_receipt_events" ADD CONSTRAINT "consolidation_receipt_manifest_fk" FOREIGN KEY ("manifestId") REFERENCES "consolidation_manifests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consolidation_receipt_events" ADD CONSTRAINT "consolidation_receipt_actor_fk" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consolidation_confirmations" ADD CONSTRAINT "consolidation_confirmation_manifest_fk" FOREIGN KEY ("manifestId") REFERENCES "consolidation_manifests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consolidation_confirmations" ADD CONSTRAINT "consolidation_confirmation_actor_fk" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE consolidation_hubs ADD CONSTRAINT consolidation_hub_revision CHECK (revision > 0);
ALTER TABLE consolidation_manifests ADD CONSTRAINT consolidation_manifest_revisions CHECK (revision > 0 AND "receiptRevision" >= 0 AND "hubRevision" > 0);
ALTER TABLE consolidation_receipt_events ADD CONSTRAINT consolidation_receipt_revisions CHECK ("manifestRevision" > 0 AND "receiptRevision" > 0);
ALTER TABLE consolidation_confirmations ADD CONSTRAINT consolidation_confirmation_revisions CHECK ("manifestRevision" > 0 AND "receiptRevision" > 0 AND "hubRevision" > 0);

CREATE FUNCTION consolidation_immutable_ledger() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Consolidation ledger is append-only' USING ERRCODE='23514'; END $$;
CREATE TRIGGER consolidation_receipt_immutable BEFORE UPDATE OR DELETE ON consolidation_receipt_events FOR EACH ROW EXECUTE FUNCTION consolidation_immutable_ledger();
CREATE TRIGGER consolidation_confirmation_immutable BEFORE UPDATE OR DELETE ON consolidation_confirmations FOR EACH ROW EXECUTE FUNCTION consolidation_immutable_ledger();

CREATE FUNCTION consolidation_validate_receipt() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE m consolidation_manifests%ROWTYPE; entry jsonb; field text; n numeric; total numeric;
BEGIN
 SELECT * INTO m FROM consolidation_manifests WHERE id=NEW."manifestId" FOR UPDATE;
 IF NEW."manifestRevision" IS DISTINCT FROM m.revision OR NEW."receiptRevision" IS DISTINCT FROM m."receiptRevision"+1 THEN RAISE EXCEPTION 'Receipt revision mismatch' USING ERRCODE='23514'; END IF;
 SELECT x INTO entry FROM jsonb_array_elements(m.allocations) x WHERE x->>'id'=NEW."allocationId";
 IF entry IS NULL OR NEW.snapshot->>'poId' IS DISTINCT FROM entry->>'poId' OR NEW.snapshot->>'orderItemId' IS DISTINCT FROM entry->>'orderItemId' OR NEW.snapshot->>'unit' IS DISTINCT FROM entry->>'unit' THEN RAISE EXCEPTION 'Receipt identity mismatch' USING ERRCODE='23514'; END IF;
 FOREACH field IN ARRAY ARRAY['received','accepted','rejected'] LOOP
  IF jsonb_typeof(NEW.snapshot->field) IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Numeric receipt counts required' USING ERRCODE='23514'; END IF;
  n=(NEW.snapshot->>field)::numeric;
  IF n<0 OR n>2147483647 OR trunc(n)<>n THEN RAISE EXCEPTION 'Invalid receipt count' USING ERRCODE='23514'; END IF;
 END LOOP;
 total=(NEW.snapshot->>'accepted')::numeric+(NEW.snapshot->>'rejected')::numeric;
 IF total>(NEW.snapshot->>'received')::numeric THEN RAISE EXCEPTION 'Reviewed count exceeds received count' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER consolidation_receipt_validate BEFORE INSERT ON consolidation_receipt_events FOR EACH ROW EXECUTE FUNCTION consolidation_validate_receipt();

CREATE FUNCTION consolidation_counter_consistent() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE mid text; expected int; actual int;
BEGIN
 IF TG_TABLE_NAME='consolidation_manifests' THEN mid=NEW.id; ELSE mid=NEW."manifestId"; END IF;
 SELECT "receiptRevision" INTO expected FROM consolidation_manifests WHERE id=mid;
 SELECT coalesce(max("receiptRevision"),0) INTO actual FROM consolidation_receipt_events WHERE "manifestId"=mid;
 IF expected IS DISTINCT FROM actual THEN RAISE EXCEPTION 'Receipt ledger counter mismatch' USING ERRCODE='23514'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER consolidation_manifest_counter AFTER INSERT OR UPDATE ON consolidation_manifests DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION consolidation_counter_consistent();
CREATE CONSTRAINT TRIGGER consolidation_receipt_counter AFTER INSERT ON consolidation_receipt_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION consolidation_counter_consistent();
