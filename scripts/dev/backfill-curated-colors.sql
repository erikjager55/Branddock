-- ===========================================================================
-- Backfill: gecureerde merkdata beschermen tegen de eerstvolgende re-analyse
--
-- ⚠️  DIT SCRIPT DOET NIETS ALS JE HET DRAAIT. Dat is opzet.
--
-- Stap 1 (de SELECT hieronder) is read-only en laat zien wat er zou gebeuren.
-- Stap 2 staat uitgecommentarieerd; haal het commentaar er pas af nadat je de
-- aantallen uit stap 1 hebt gecontroleerd. De UPDATE is onomkeerbaar zonder
-- handwerk: een kleur op `source: 'user'` wordt NOOIT meer door de scraper
-- ververst.
--
--   psql "$NEON_DATABASE_URL" -f scripts/dev/backfill-curated-colors.sql
--
-- ## Achtergrond
--
-- #465 gaf `StyleguideColor`/`StyleguideComponent` een `source`-kolom: 'user'
-- overleeft een re-scrape, 'scraped' niet. Bestaande rijen kregen de default
-- 'scraped' — we kunnen niet achteraf raden wat ooit handmatig was. Voor
-- workspaces waarvan de merkdata uit brondocumenten komt is dat verkeerd.
--
-- ## Twee voorwaarden, niet één
--
-- `sourceType = 'PDF'` alléén is niet genoeg: dat veld wordt bij ELKE analyse
-- overschreven, dus het zegt "de laatste analyse was een PDF", niet "deze
-- rijen komen uit een document". Een workspace die ooit van URL is gescrapet
-- en later één keer met een PDF geanalyseerd, zou anders zijn gescrapete
-- kleuren permanent bevriezen.
--
-- Daarom óók `detectorSource IS NULL`: dat veld wordt uitsluitend door de
-- kleur-resolver van de URL-scraper gezet. Is het leeg, dan komt de rij niet
-- uit die scraper.
-- ===========================================================================

-- ── Stap 1: dry-run (read-only) ────────────────────────────────────────────
-- Twee losse subqueries; één query met twee LEFT JOINs zou een kruisproduct
-- tellen (C×K rijen per styleguide) en dus onzin rapporteren.
SELECT w.name,
       s."sourceType",
       (SELECT count(*) FROM "StyleguideColor" c
         WHERE c."styleguideId" = s.id
           AND c.source <> 'user'
           AND c."detectorSource" IS NULL)      AS kleuren,
       (SELECT count(*) FROM "StyleguideComponent" k
         WHERE k."styleguideId" = s.id
           AND k.source <> 'user')              AS componenten
FROM "BrandStyleguide" s
JOIN "Workspace" w ON w.id = s."workspaceId"
WHERE s."sourceType" = 'PDF'
ORDER BY w.name;

-- ── Stap 2: de backfill ────────────────────────────────────────────────────
-- Haal het commentaar hieronder weg zodra stap 1 klopt, en draai opnieuw.
--
-- BEGIN;
--
-- UPDATE "StyleguideColor" c
--    SET source = 'user'
--   FROM "BrandStyleguide" s
--  WHERE c."styleguideId" = s.id
--    AND s."sourceType" = 'PDF'
--    AND c."detectorSource" IS NULL
--    AND c.source <> 'user';
--
-- UPDATE "StyleguideComponent" k
--    SET source = 'user'
--   FROM "BrandStyleguide" s
--  WHERE k."styleguideId" = s.id
--    AND s."sourceType" = 'PDF'
--    AND k.source <> 'user';
--
-- COMMIT;
--
-- -- Verificatie ná stap 2:
-- SELECT s."sourceType", c.source, count(*) AS kleuren
-- FROM "StyleguideColor" c
-- JOIN "BrandStyleguide" s ON s.id = c."styleguideId"
-- GROUP BY 1, 2 ORDER BY 1, 2;
