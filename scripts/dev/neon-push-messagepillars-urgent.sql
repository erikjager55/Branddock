-- ===========================================================================
-- URGENT — losstaand van de brandstyle-stack (#255-#259)
--
-- `BrandVoiceguide.messagePillars` komt uit main-commit 467890fa (changelog
-- #460) en is dus AL GEDEPLOYED. Zonder de kolom faalt élk pad dat 'm leest:
--
--   · create-snapshot.ts        → elke brandstyle-analyse (fase 6)
--   · /api/brandmd/claim/[token] → de claim-flow (acquisitietrechter)
--   · /api/v1/brand-md          → de publieke API
--   · mcp-server.ts             → de MCP-server
--   · /api/export/design-system → exports + brand-kit-bundle
--   · /api/brandvoiceguide      → de hele Voice DNA-tab
--
-- Draai dit ONAFHANKELIJK van de stack; het hoeft niet te wachten op #257/#258.
--
--   psql "$NEON_DATABASE_URL" -f scripts/dev/neon-push-messagepillars-urgent.sql
-- ===========================================================================

-- Eerst kijken of het probleem er überhaupt is. Nul rijen = kolom ontbreekt.
SELECT 'VOOR: kolom aanwezig?' AS stap, count(*) AS gevonden
FROM information_schema.columns
WHERE table_name = 'BrandVoiceguide' AND column_name = 'messagePillars';

ALTER TABLE "BrandVoiceguide"
  ADD COLUMN IF NOT EXISTS "messagePillars" JSONB;

-- Verwacht: 1 rij, data_type jsonb.
SELECT 'NA: kolom aanwezig?' AS stap, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'BrandVoiceguide' AND column_name = 'messagePillars';
