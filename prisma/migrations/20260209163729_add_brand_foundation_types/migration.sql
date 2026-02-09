-- AlterEnum: Replace AssetType values
-- First add new values
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'MISSION';
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'VISION';
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'VALUES';
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'POSITIONING';
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'PROMISE';
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'STORY';
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'OTHER';

-- AlterEnum: Replace AssetStatus values
ALTER TYPE "AssetStatus" ADD VALUE IF NOT EXISTS 'ACTIVE';
ALTER TYPE "AssetStatus" ADD VALUE IF NOT EXISTS 'LOCKED';

-- Migrate existing data to new enum values before removing old ones
UPDATE "brand_assets" SET "type" = 'OTHER' WHERE "type" IN ('LOGO', 'COLOR', 'TYPOGRAPHY', 'MESSAGING', 'GUIDELINE');
UPDATE "brand_assets" SET "status" = 'ACTIVE' WHERE "status" = 'PUBLISHED';
UPDATE "brand_assets" SET "status" = 'DRAFT' WHERE "status" = 'ARCHIVED';

-- AlterTable: Add lockedById to brand_assets
ALTER TABLE "brand_assets" ADD COLUMN "lockedById" TEXT;

-- AddForeignKey
ALTER TABLE "brand_assets" ADD CONSTRAINT "brand_assets_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
