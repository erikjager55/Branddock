# Merk-DNA-migratie (lokaal → productie)

Migreert **alleen het merk-fundament** van één workspace (brand assets, voice, brandstyle,
personas, producten, concurrenten, trends, `FidelityConfig` STRICT, brand rules) naar een
**vers prod-account**. Content-, campagne- en telemetrie-historie blijft bewust lokaal.

> Gebruikt voor de eerste pilot (Better Brands). Herbruikbaar voor volgende pilots.
> Ontworpen zodat **jij** (met de prod-creds) de prod-stappen draait; de scripts raken
> nooit zelf productie zonder dat jij ze aanroept.

## Model-set

De exacte set + volgorde staat in [`models.ts`](./models.ts) (geverifieerd tegen
`information_schema`). Bewust **uitgesloten**: alle content/deliverables, MediaAsset-library,
AI-call-telemetrie, learning-events, agent-runs, competitor-snapshots/-activities, workshops,
integraties/OAuth-tokens en billing.

## Runbook

### Stap 0 — Owner meldt zich aan op productie
Laat de pilot-stakeholder zich normaal registreren op de live app. De auto-provisioning
(`provisionNewUser`, `src/lib/auth.ts`) maakt automatisch een organization + workspace +
owner-membership + 11 lege canonical brand assets. Onthoud het **owner-e-mailadres**.

### Stap 1 — Exporteer lokaal (bron = lokale DB)
```bash
DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" \
  npx tsx scripts/migrate-brand-dna/export.ts "Better Brands" brand-dna-better-brands.json
```
Levert `brand-dna-better-brands.json`. Inspecteer die gerust — het is leesbare JSON.
De output meldt het aantal rijen + hoeveel lokale beeld-referenties er zijn.

### Stap 2 — Upload de beelden naar R2 (optioneel maar aanbevolen)
Zonder deze stap resolven de merk-beelden (logo's, styleguide-componenten) **niet** op prod.
Vereist de R2-creds in `.env.local` (`R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` /
`R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` + **verplicht** `R2_PUBLIC_URL`, anders krijg je
signed-URLs die na ~1 uur verlopen):
```bash
npx tsx scripts/migrate-brand-dna/upload-images.ts brand-dna-better-brands.json
```
Uploadt de lokale `public/uploads/…`-bestanden naar R2 en herschrijft de URLs in de bundle.
Ontbreekt een bestand op schijf, dan blijft die ref als waarschuwing in de bundle staan.

### Stap 3 — Controleer het prod-schema
Prod-schema wordt via `prisma db push` bijgehouden (memory `neon-schema-push-on-deploy`).
Zorg dat het actueel is vóór import, anders missen merk-DNA-kolommen op prod:
```bash
DATABASE_URL="<prod-neon-pooled-url>" npx prisma db push
```

### Stap 4 — Dry-run tegen productie (schrijft niets)
> Gebruik hier **dezelfde DIRECTE (unpooled) URL** als voor de echte import in stap 5, zodat
> de getoonde `DB-host=…` exact de host is die je straks aan `--confirm-host` geeft.
```bash
DATABASE_URL="<prod-neon-DIRECT-url>" \
  npx tsx scripts/migrate-brand-dna/import.ts brand-dna-better-brands.json \
  --email owner@betterbrands.example --dry-run
```
Toont de `DB-host`, de doel-staat per guard-model, en per model hoeveel er gewist/ingevoegd
zou worden. De **fresh-workspace-guard** weigert (buiten `--force`) een workspace met >11
brand assets of enig ander merk-DNA/content-signaal — dat is opzet.

### Stap 5 — Echte import tegen productie
> Gebruik hier de **directe (unpooled) Neon-URL**, niet de pooler. De import draait één
> interactieve transactie; Prisma raadt daarvoor een directe connectie aan (de PgBouncer-pooler
> kan lange interactieve transacties afbreken). Het script print de DB-host die het gebruikt —
> controleer die vóór je doorgaat.
Een echte schrijfactie eist **`--confirm-host <db-host>`** gelijk aan de DB-host die de dry-run
toonde (`[import] DB-host=…`) — zo wipe je nooit per ongeluk de verkeerde database:
```bash
DATABASE_URL="<prod-neon-DIRECT-url>" \
  npx tsx scripts/migrate-brand-dna/import.ts brand-dna-better-brands.json \
  --email owner@betterbrands.example --confirm-host <db-host-uit-dry-run>
```
Draait in één transactie (wipe + insert atomisch). Remapt `workspaceId` naar de nieuwe
workspace en user-referenties (`createdById`/`lockedById`/…) naar de nieuwe owner. Lost een
globaal-unieke `Product.slug`-botsing met een andere workspace op via een suffix. Herstelt
de `centroidEmbedding`-vector via raw SQL.

> Ambigu wie de workspace is? De owner heeft >1 workspace? Het script stopt en vraagt om
> `--slug <workspace-slug>` i.p.v. `--email`.
> Bewust een niet-verse workspace overschrijven? Voeg `--force` toe. De guard weigert
> anders bij meer dan de canonieke brand assets of enig `NONFRESH_MODELS`-signaal
> (campaigns/media/personas/producten/concurrenten/strategie/voice/style/rules/fidelity/
> trends/workshops/interviews). **Let op:** `--force` wist het merk-DNA én cascadeert naar
> niet-gemigreerde afhankelijke data (persona-chats, campagne-links) — alleen op een
> workspace die je bewust wilt overschrijven.

### Stap 6 — Vector-indexen (eenmalig per prod-DB)
Als dit de eerste keer is dat pgvector-data op prod landt:
```bash
DATABASE_URL="<prod-neon-pooled-url>" npx tsx scripts/prod/create-vector-indexes.ts
```

## Rollback
De import is idempotent: een herhaalde run wist eerst de merk-DNA-rijen van de doel-workspace
en zet ze opnieuw. Wil je de migratie volledig terugdraaien, verwijder dan het prod-account
(org-delete cascadeert alles) en laat de owner opnieuw registreren.

## Verificatie (hoe dit is getest)
Cross-DB round-trip, 2026-07-07: schema van lokaal gekloond naar een scratch-DB
(`pg_dump --schema-only`), verse workspace + 11 lege assets aangemaakt, `import` gedraaid,
en geassert: 11 assets (geen dubbele), voiceguide/styleguide/fidelity/personas/rules/
competitors-counts kloppen, en `centroidEmbedding` hersteld op 1536 dimensies. Alle asserts
groen. `npx tsc --noEmit` + `eslint` schoon.
```bash
# Reproduceren:
BIN=/opt/homebrew/opt/postgresql@17/bin
$BIN/createdb branddock_rt
$BIN/pg_dump --schema-only "postgresql://erikjager:@localhost:5432/branddock" | \
  $BIN/psql "postgresql://erikjager:@localhost:5432/branddock_rt"
# maak een verse workspace in branddock_rt, draai export (lokaal) → import (branddock_rt), assert, dan:
$BIN/dropdb branddock_rt
```
