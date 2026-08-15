-- ===========================================================================
-- Neon-push voor de brand.md lifecycle-mails (changelog #462)
--
-- Waarom handmatig: dit project pusht schema-wijzigingen niet via de Vercel-
-- build maar met een gerichte push naar Neon (memory `neon-schema-push-on-deploy`).
-- `prisma db push` is hier bewust NIET de weg: die loopt vast op een
-- pre-existing drift (`LandingPage.livePublishId` mist lokaal een unique
-- constraint) en zou die drift stilzwijgend meenemen naar prod — zelfde
-- overweging als in `neon-push-brandstyle-stack.sql`.
--
-- Alles is additief en idempotent (`IF NOT EXISTS`), dus veilig meerdere keren
-- te draaien. Geen enkele bestaande kolom wordt aangeraakt.
--
-- DRAAI DIT VÓÓR de deploy van #462. Zonder deze kolommen 500't
-- /api/brandmd/track — en dat is de download-gate van de live generator, dus
-- élke bezoeker die zijn e-mail achterlaat loopt vast.
--
--   psql "$NEON_DATABASE_URL" -f scripts/dev/neon-push-brandmd-lifecycle.sql
-- ===========================================================================

BEGIN;

-- Claim-token versleuteld (v1 token-crypto). De cron bouwt hier de download-,
-- claim- en unsubscribe-links van latere mails mee; lookup blijft via de hash.
-- Dat dit veld pas vanaf deze release gevuld wordt, is tegelijk de afbakening
-- van de mailreeks: oudere drafts kregen de "one-time email"-belofte.
ALTER TABLE "GeneratedBrandProfile"
  ADD COLUMN IF NOT EXISTS "claimTokenEnc" TEXT;

-- Expliciete opt-in (vinkje bij de download-gate) voor de mails 2.2-2.4.
ALTER TABLE "GeneratedBrandProfile"
  ADD COLUMN IF NOT EXISTS "lifecycleOptInAt" TIMESTAMP(3);

-- Uitschrijving (tokenlink of RFC 8058 one-click) — stopt 2.2-2.4 direct.
ALTER TABLE "GeneratedBrandProfile"
  ADD COLUMN IF NOT EXISTS "lifecycleOptOutAt" TIMESTAMP(3);

-- Verzonden stages ("2.2".."2.5") — idempotente cron zonder extra tabel.
ALTER TABLE "GeneratedBrandProfile"
  ADD COLUMN IF NOT EXISTS "lifecycleStagesSent" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

COMMIT;

-- ── Verificatie ────────────────────────────────────────────────────────────
-- Verwacht: 4 rijen. Minder = de push is niet volledig doorgekomen.
-- "Het commando gaf geen fout" bewijst niets (gotcha 2026-07-13) — lees de rijen.
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'GeneratedBrandProfile'
  AND column_name IN (
    'claimTokenEnc',
    'lifecycleOptInAt',
    'lifecycleOptOutAt',
    'lifecycleStagesSent'
  )
ORDER BY column_name;
