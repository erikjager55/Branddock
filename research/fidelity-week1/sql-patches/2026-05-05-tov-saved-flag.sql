-- ============================================================
-- Research aanpassing: ToneOfVoice gelijktrekken voor pilot-merken
-- ============================================================
--
-- Datum: 2026-05-05
-- Doel: voor de F-VAL drift-meting moeten LINFI en Better Brands
-- dezelfde BVD-baseline hebben als WRA Juristen (waar
-- toneSavedForAi al TRUE was). Hiermee testen we Conditie A vs B
-- zuiver tussen merken zonder ToV-asymmetrie als noise.
--
-- Status vóór patch:
--   wra-juristen | toneSavedForAi=TRUE
--   linfi        | toneSavedForAi=FALSE  (data wel ingevoerd: 7+9 items)
--   better-brands| toneSavedForAi=FALSE  (data wel ingevoerd: 6+8 items)
--
-- Status na patch: alle 3 op TRUE.
--
-- Reversibel: kan teruggezet worden via UPDATE met FALSE indien gewenst.
-- Dit is NIET een Prisma migration — pure research-aanpassing op
-- bestaande data. Geen schema-wijziging.
-- ============================================================

UPDATE "BrandStyleguide" bs
SET "toneSavedForAi" = TRUE
FROM "Workspace" w
WHERE bs."workspaceId" = w.id
  AND w.slug IN ('linfi', 'better-brands')
RETURNING w.slug, bs."toneSavedForAi";

-- Verificatie na uitvoering (handmatig):
--   SELECT w.slug, bs."toneSavedForAi"
--   FROM "BrandStyleguide" bs JOIN "Workspace" w ON bs."workspaceId" = w.id
--   WHERE w.slug IN ('wra-juristen', 'linfi', 'better-brands')
--   ORDER BY w.slug;
-- Verwacht: alle 3 op TRUE.
