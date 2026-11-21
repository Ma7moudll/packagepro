-- AlterTable
ALTER TABLE "carts" ALTER COLUMN "currency" SET DEFAULT 'EGP';

-- AlterTable
ALTER TABLE "materials" ALTER COLUMN "currency" SET DEFAULT 'EGP';

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "currency" SET DEFAULT 'EGP';

-- AlterTable
ALTER TABLE "purchase_orders" ALTER COLUMN "currency" SET DEFAULT 'EGP';

-- AlterTable
ALTER TABLE "settlements" ALTER COLUMN "currency" SET DEFAULT 'EGP';
