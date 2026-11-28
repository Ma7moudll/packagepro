-- Prospective field only. No backfill or historical currency inference.
ALTER TABLE "orders" ADD COLUMN "currency" TEXT;
