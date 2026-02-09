-- Add new AssetType enum values
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'MISSION';
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'VISION';
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'VALUES';
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'POSITIONING';
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'PROMISE';
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'STORY';
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'OTHER';

-- Add new AssetStatus enum values
ALTER TYPE "AssetStatus" ADD VALUE IF NOT EXISTS 'ACTIVE';
ALTER TYPE "AssetStatus" ADD VALUE IF NOT EXISTS 'LOCKED';

-- Add lockedById column to brand_assets
ALTER TABLE "brand_assets" ADD COLUMN "lockedById" TEXT;

-- Add foreign key for lockedById
ALTER TABLE "brand_assets" ADD CONSTRAINT "brand_assets_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
