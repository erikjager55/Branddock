-- competitor-content-item-discovery (#xxx): additieve kolom voor discovery/classifier-pipeline-versie.
-- Maakt toekomstige re-discovery na format-classifier upgrades mogelijk.
-- Toegepast op dev-DB via raw ALTER (additief, tabel was leeg) i.p.v. db push
-- wegens schema-drift-risico; geparkeerd hier voor Vercel/Neon-bootstrap.
ALTER TABLE "CompetitorContentItem" ADD COLUMN IF NOT EXISTS "discovererVersion" INTEGER NOT NULL DEFAULT 1;
