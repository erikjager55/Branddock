-- ADR 2026-05-15: Tone-of-Voice consolidatie van BrandStyleguide naar BrandVoiceguide.
-- Drie velden (contentGuidelines / writingGuidelines / examplePhrases) + de save-for-AI
-- toggle (toneSavedForAi gesplitst in guidelinesSavedForAi + examplePhrasesSavedForAi)
-- verhuizen van Brandstyleguide naar Brandvoiceguide als single source-of-truth.
--
-- Migratie-pad (in deze volgorde binnen de transactie):
--   1. ADD nieuwe kolommen aan BrandVoiceguide
--   2. BACKFILL bestaande BrandVoiceguide rows met content uit Brandstyleguide
--   3. INSERT BrandVoiceguide voor workspaces die alleen Brandstyleguide hadden
--   4. DROP oude kolommen uit Brandstyleguide
--
-- Conflict-policy: bestaande voiceguide-velden worden NIET overschreven (UPDATE filtert
-- op lege voiceguide-velden). Voorkomt dataverlies bij workspaces die zowel styleguide
-- guidelines als voiceguide guidelines hadden gezet.

-- 1. ADD nieuwe BrandVoiceguide-kolommen
ALTER TABLE "BrandVoiceguide" ADD COLUMN "contentGuidelines" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "BrandVoiceguide" ADD COLUMN "writingGuidelines" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "BrandVoiceguide" ADD COLUMN "examplePhrases" JSONB;
ALTER TABLE "BrandVoiceguide" ADD COLUMN "guidelinesSavedForAi" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "BrandVoiceguide" ADD COLUMN "examplePhrasesSavedForAi" BOOLEAN NOT NULL DEFAULT true;

-- Strip de DEFAULT zodat de Prisma client deze niet als runtime-default ziet
-- (alleen migration-time default voor backfill).
ALTER TABLE "BrandVoiceguide" ALTER COLUMN "contentGuidelines" DROP DEFAULT;
ALTER TABLE "BrandVoiceguide" ALTER COLUMN "writingGuidelines" DROP DEFAULT;
ALTER TABLE "BrandVoiceguide" ALTER COLUMN "contentGuidelines" SET NOT NULL;
ALTER TABLE "BrandVoiceguide" ALTER COLUMN "writingGuidelines" SET NOT NULL;

-- 2. BACKFILL: kopieer styleguide-velden naar bestaande voiceguide-rows (zonder
-- bestaande voiceguide-content te overschrijven).
UPDATE "BrandVoiceguide" v
SET
  "contentGuidelines" = COALESCE(s."contentGuidelines", ARRAY[]::TEXT[]),
  "writingGuidelines" = COALESCE(s."writingGuidelines", ARRAY[]::TEXT[]),
  "examplePhrases"    = s."examplePhrases"
FROM "BrandStyleguide" s
WHERE v."workspaceId" = s."workspaceId"
  AND (
    COALESCE(array_length(s."contentGuidelines", 1), 0) > 0
    OR COALESCE(array_length(s."writingGuidelines", 1), 0) > 0
    OR s."examplePhrases" IS NOT NULL
  )
  AND COALESCE(array_length(v."contentGuidelines", 1), 0) = 0
  AND COALESCE(array_length(v."writingGuidelines", 1), 0) = 0
  AND v."examplePhrases" IS NULL;

-- 3. INSERT BrandVoiceguide voor workspaces die alleen Brandstyleguide-content hadden.
-- `id` met gen_random_uuid() — Prisma's cuid-default is alleen TS-level; DB accepteert
-- elke TEXT primary key. source='extracted' signaleert herkomst-via-migratie.
INSERT INTO "BrandVoiceguide" (
  "id", "workspaceId", "contentGuidelines", "writingGuidelines", "examplePhrases",
  "wordsWeUse", "wordsWeAvoid", "antiPatterns", "writingSamples",
  "source", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::TEXT,
  s."workspaceId",
  COALESCE(s."contentGuidelines", ARRAY[]::TEXT[]),
  COALESCE(s."writingGuidelines", ARRAY[]::TEXT[]),
  s."examplePhrases",
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  '[]'::JSONB,
  'extracted',
  NOW(),
  NOW()
FROM "BrandStyleguide" s
WHERE NOT EXISTS (
    SELECT 1 FROM "BrandVoiceguide" v WHERE v."workspaceId" = s."workspaceId"
  )
  AND (
    COALESCE(array_length(s."contentGuidelines", 1), 0) > 0
    OR COALESCE(array_length(s."writingGuidelines", 1), 0) > 0
    OR s."examplePhrases" IS NOT NULL
  );

-- 4. DROP oude BrandStyleguide-kolommen — data is veilig in BrandVoiceguide.
ALTER TABLE "BrandStyleguide" DROP COLUMN "contentGuidelines";
ALTER TABLE "BrandStyleguide" DROP COLUMN "writingGuidelines";
ALTER TABLE "BrandStyleguide" DROP COLUMN "examplePhrases";
ALTER TABLE "BrandStyleguide" DROP COLUMN "toneSavedForAi";
