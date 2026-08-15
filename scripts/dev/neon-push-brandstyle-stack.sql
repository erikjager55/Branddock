-- ===========================================================================
-- Neon-push voor de brandstyle-stack (PR #255-#259) + de al-gemergde main-kolom
--
-- Waarom handmatig: dit project pusht schema-wijzigingen niet via de Vercel-
-- build maar met een gerichte push naar Neon (memory `neon-schema-push-on-deploy`).
-- `prisma db push` is hier bewust NIET de weg: die loopt vast op een
-- pre-existing drift (`LandingPage.livePublishId` mist lokaal een unique
-- constraint) en zou die drift stilzwijgend meenemen naar prod.
--
-- Alles is additief en idempotent (`IF NOT EXISTS`), dus veilig meerdere keren
-- te draaien. Geen enkele bestaande kolom wordt aangeraakt.
--
-- DRAAI DIT VÓÓR de deploy van #258. Zonder deze kolommen 500't élke
-- brandstyle-analyse en de brandstyle-PATCH.
--
--   psql "$NEON_DATABASE_URL" -f scripts/dev/neon-push-brandstyle-stack.sql
-- ===========================================================================

BEGIN;

-- ── Uit main (467890fa, AL GEMERGED) ───────────────────────────────────────
-- BRAND.md 0.3 Message Pillars. Staat al op main, dus als de deploy daarvan
-- gedraaid is zonder deze kolom, faalt GET/PATCH /api/brandvoiceguide nu al.
ALTER TABLE "BrandVoiceguide"
  ADD COLUMN IF NOT EXISTS "messagePillars" JSONB;

-- ── Uit #257 — reviewstatus-reset bij drift ────────────────────────────────
-- Onderscheidt "goedkeuring ingetrokken door drift" van "nog nooit bekeken".
ALTER TABLE "StyleguideReview"
  ADD COLUMN IF NOT EXISTS "staleAt" TIMESTAMP(3);

-- ── Uit #258 — een re-analyse vernietigt geen user-edits meer ──────────────
-- Eigenaarschap per rij: 'scraped' = analyzer mag overschrijven, 'user' =
-- overleeft elke re-scrape. Bestaande rijen worden 'scraped' — we kunnen niet
-- achteraf raden wat ooit handmatig was.
ALTER TABLE "StyleguideColor"
  ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'scraped';

ALTER TABLE "StyleguideComponent"
  ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'scraped';

-- Het analyzer-label van vóór een hernoeming: de sleutel waarop de scraper
-- zijn eigen component terugherkent. Zonder dit levert een rename een duplicaat.
ALTER TABLE "StyleguideComponent"
  ADD COLUMN IF NOT EXISTS "detectedLabel" TEXT;

-- Welke gecureerde lijsten de gebruiker zelf schreef; de analyzer slaat die over.
ALTER TABLE "BrandStyleguide"
  ADD COLUMN IF NOT EXISTS "userEditedFields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

COMMIT;

-- ── Verificatie ────────────────────────────────────────────────────────────
-- Verwacht: 6 rijen. Minder = de push is niet volledig doorgekomen.
SELECT table_name, column_name, data_type, column_default
FROM information_schema.columns
WHERE (table_name = 'BrandVoiceguide'     AND column_name = 'messagePillars')
   OR (table_name = 'StyleguideReview'    AND column_name = 'staleAt')
   OR (table_name = 'StyleguideColor'     AND column_name = 'source')
   OR (table_name = 'StyleguideComponent' AND column_name IN ('source', 'detectedLabel'))
   OR (table_name = 'BrandStyleguide'     AND column_name = 'userEditedFields')
ORDER BY table_name, column_name;
