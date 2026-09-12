-- Migration: 004_add_design_lifecycle_status
-- Description: Add design lifecycle status enum and field to Design model
-- Created: 2026-06-01

-- Create the enum type for design lifecycle status
CREATE TYPE "DesignLifecycleStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'IN_REVIEW',
    'APPROVED',
    'REJECTED',
    'IN_PRODUCTION'
);

-- Add the lifecycleStatus column to designs table
ALTER TABLE "designs" 
ADD COLUMN "lifecycleStatus" "DesignLifecycleStatus" NOT NULL DEFAULT 'DRAFT';

-- Create index for lifecycle status queries
CREATE INDEX "idx_designs_lifecycle_status" ON "designs"("lifecycleStatus");

-- Create index for combined queries (orderId + lifecycleStatus)
CREATE INDEX "idx_designs_order_lifecycle" ON "designs"("orderId", "lifecycleStatus");
