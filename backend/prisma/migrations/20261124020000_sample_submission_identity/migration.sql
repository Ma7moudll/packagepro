ALTER TABLE "samples" ADD COLUMN "submissionId" TEXT;
UPDATE "samples" SET "submissionId" = gen_random_uuid()::text WHERE "submissionId" IS NULL;
ALTER TABLE "samples" ALTER COLUMN "submissionId" SET NOT NULL;
