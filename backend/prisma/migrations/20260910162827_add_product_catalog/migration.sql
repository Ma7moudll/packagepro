-- CreateEnum
CREATE TYPE "ProductCustomisation" AS ENUM ('custom', 'plain', 'pre_printed');

-- CreateEnum
CREATE TYPE "PrintMode" AS ENUM ('none', 'mono', 'full_color');

-- CreateEnum
CREATE TYPE "PrintSides" AS ENUM ('outside_only', 'inside_outside', 'single', 'double');

-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN     "config" JSONB,
ADD COLUMN     "productId" TEXT,
ADD COLUMN     "sku" TEXT,
ADD COLUMN     "variantId" TEXT;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "config" JSONB,
ADD COLUMN     "productId" TEXT,
ADD COLUMN     "sku" TEXT,
ADD COLUMN     "variantId" TEXT;

-- AlterTable
ALTER TABLE "pricing_rules" ADD COLUMN     "scope" TEXT NOT NULL DEFAULT 'productType',
ADD COLUMN     "scopeId" TEXT;

-- CreateTable
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_subcategories" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT,
    "description" TEXT,
    "customisation" "ProductCustomisation" NOT NULL DEFAULT 'custom',
    "productType" TEXT NOT NULL DEFAULT 'box',
    "boxType" TEXT,
    "moq" INTEGER NOT NULL DEFAULT 30,
    "sizeUnit" TEXT NOT NULL DEFAULT 'cm',
    "baseSizes" JSONB,
    "minDimensions" JSONB,
    "maxDimensions" JSONB,
    "priceFrom" DECIMAL(10,2),
    "thumbnail" TEXT,
    "gallery" TEXT[],
    "ecoFlags" JSONB,
    "filters" JSONB,
    "editorDefaults" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBestseller" BOOLEAN NOT NULL DEFAULT false,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "sizeCode" TEXT,
    "materialCode" TEXT,
    "color" TEXT,
    "printMode" "PrintMode" NOT NULL DEFAULT 'none',
    "printSides" "PrintSides" NOT NULL DEFAULT 'outside_only',
    "finish" TEXT DEFAULT 'none',
    "dimensions" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_options" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "control" TEXT NOT NULL DEFAULT 'select',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_option_values" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "priceDelta" DECIMAL(10,4),
    "priceType" TEXT NOT NULL DEFAULT 'per_unit',
    "appliesTo" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_option_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_slug_key" ON "product_categories"("slug");

-- CreateIndex
CREATE INDEX "product_categories_isActive_sortOrder_idx" ON "product_categories"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "product_subcategories_slug_key" ON "product_subcategories"("slug");

-- CreateIndex
CREATE INDEX "product_subcategories_categoryId_isActive_idx" ON "product_subcategories"("categoryId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_subcategoryId_isActive_idx" ON "products"("subcategoryId", "isActive");

-- CreateIndex
CREATE INDEX "products_productType_isActive_idx" ON "products"("productType", "isActive");

-- CreateIndex
CREATE INDEX "products_customisation_idx" ON "products"("customisation");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_productId_isActive_idx" ON "product_variants"("productId", "isActive");

-- CreateIndex
CREATE INDEX "product_variants_materialCode_idx" ON "product_variants"("materialCode");

-- CreateIndex
CREATE INDEX "product_options_productId_sortOrder_idx" ON "product_options"("productId", "sortOrder");

-- CreateIndex
CREATE INDEX "product_option_values_optionId_sortOrder_idx" ON "product_option_values"("optionId", "sortOrder");

-- CreateIndex
CREATE INDEX "product_option_values_productId_idx" ON "product_option_values"("productId");

-- CreateIndex
CREATE INDEX "pricing_rules_scope_scopeId_idx" ON "pricing_rules"("scope", "scopeId");

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_subcategories" ADD CONSTRAINT "product_subcategories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "product_subcategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_option_values" ADD CONSTRAINT "product_option_values_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "product_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_option_values" ADD CONSTRAINT "product_option_values_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
