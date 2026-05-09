-- ADR-3: per-brand locale-routing voor F-VAL Pijler 3 heuristiek-pakketten.
-- IETF BCP 47 locale-tag (nl-NL / nl-BE / en-GB / de-DE in v1).
-- Nullable: getHeuristicsForBrand() resolver fallt terug op
-- Workspace.contentLanguage mapped naar default-locale wanneer null.
-- Validation in API-laag (Zod regex) — geen DB-constraint zodat toekomstige
-- locales (fr-BE, de-AT, etc.) zonder schema-migration toegevoegd kunnen worden.

ALTER TABLE "BrandVoiceguide" ADD COLUMN "contentLocale" TEXT;
