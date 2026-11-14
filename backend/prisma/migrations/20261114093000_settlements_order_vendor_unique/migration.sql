-- SEC-03a: settlements become unique per (orderId, vendorId) instead of per orderId.
-- An order now settles every vendor holding a confirmed PO, so the compound pair
-- is the natural key. The legacy single-column unique index is replaced.
--
-- SAFETY PRECONDITION (enforced below, aborting): no legacy row set may already
-- contain two settlements sharing the same (orderId, vendorId). If duplicates
-- exist, resolve them manually before applying this migration.
DO $$
DECLARE
  duplicate_groups INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_groups
  FROM (
    SELECT "orderId", "vendorId"
    FROM "settlements"
    GROUP BY "orderId", "vendorId"
    HAVING COUNT(*) > 1
  ) dup;

  IF duplicate_groups > 0 THEN
    RAISE EXCEPTION 'Cannot apply migration: % duplicate (orderId, vendorId) group(s) exist in "settlements". Resolve duplicates first.', duplicate_groups;
  END IF;
END $$;

DROP INDEX "settlements_orderId_key";

CREATE UNIQUE INDEX "settlements_orderId_vendorId_key" ON "settlements"("orderId", "vendorId");
