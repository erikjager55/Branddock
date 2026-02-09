-- Migrate existing data from old enum values to new ones
UPDATE "brand_assets" SET "type" = 'OTHER' WHERE "type" IN ('LOGO', 'COLOR', 'TYPOGRAPHY', 'MESSAGING', 'GUIDELINE');
UPDATE "brand_assets" SET "status" = 'ACTIVE' WHERE "status" = 'PUBLISHED';
UPDATE "brand_assets" SET "status" = 'DRAFT' WHERE "status" = 'ARCHIVED';
