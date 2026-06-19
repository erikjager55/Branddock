---
id: content-item-images-to-library
title: Gegenereerde content-item beelden automatisch in de Media Library
fase: pre-launch
priority: now
effort: 1-1,5 dag
owner: claude-code
status: done
created: 2026-06-19
completed: 2026-06-19
related-adr: -
related-spec: -
worktree: branddock-feat-content-images-library
---

# Probleem

Beelden die je vanuit een content-item genereert in Canvas Step 2/3 worden alleen opgeslagen als `DeliverableComponent.imageUrl` (rauwe blob-URL naar R2/local). Ze worden nooit als `MediaAsset` weggeschreven, dus ze zijn onzichtbaar in de Media Library, doen niet mee in semantische zoek (`findSimilarMediaAssets`) en zijn niet herbruikbaar via library-first matching.

PR #325 (`226efb6d`) loste dit al op voor LP-feature-cards via de fire-and-forget util `importGeneratedImageToLibrary()` (`src/lib/media/import-generated-image.ts`), maar die aanroep zit in **slechts 1 van de ~5 beeld-entry-points** (`generate-feature-visuals`). De overige paden (`generate-visual`, `-trained`, `-compose`, `refine-visual`, `edit-image`) missen de aanroep.

Daarnaast bleek bij de analyse dat `edit-image` een **losstaande live bug** heeft: het geeft een verlopende fal-hosted URL terug die de frontend (`handleEditApplied`) direct in `imageVariants`/hero zet, zónder upload naar onze storage — bewerkte beelden worden dode links na ~30-60 min.

# Voorstel

De bestaande #325-util **hergebruiken** (geen parallel ingestie-pad) op elk content-item AI-beeld-entry-point, exact volgens het bewezen patroon (`void` fire-and-forget, alleen voor echt AI-gegenereerde beelden, library-sourced rijen overslaan). De util krijgt één backward-compatibele uitbreiding: optionele `category`-param + echte `contentType` + cache-invalidatie van de media-prefix. `edit-image` krijgt eerst de verplichte storage-fix (fetch→upload→stored-URL teruggeven) en daarna óók library-ingestie.

**Beslissingen (sessie 2026-06-19):**
- **edit-image** → storage-fix **én** library-ingest.
- **Categorie** → per `contentType` mappen (social→`SOCIAL_MEDIA`, ads→`ADVERTISEMENT`, hero/LP→`HERO_IMAGE`, rest→`LIFESTYLE`).
- **refine-visual** → alleen de **finale/geselecteerde** versie ingesten (niet elke iteratie).

# Acceptatiecriteria

- [ ] Elke variant uit `generate-visual` (FLUX/Imagen/Recraft), `generate-visual-trained` (LoRA) en `generate-visual-compose` (Gemini) wordt een `MediaAsset(source=AI_GENERATED)` in de juiste workspace, zichtbaar in de Media Library na navigeren.
- [ ] `refine-visual` ingest alleen het finale resultaat per slot (geen N-assets-per-iteratie).
- [ ] `edit-image` uploadt het resultaat eerst naar onze storage en geeft de **stored** URL terug (geen fal-URL meer); dat resultaat landt óók in de library.
- [ ] Library-sourced varianten (`imageSource` begint met `library:`) worden NIET opnieuw ingest (geen duplicaten).
- [ ] Elke nieuwe `MediaAsset` krijgt niet-null `aiDescription`, `aiTags` incl. `auth:AI_GENERATED`, en een berekende embedding (`embeddingComputedAt` gezet) binnen ~30s → doet mee in `findSimilarMediaAssets`.
- [ ] `MediaAsset.workspaceId` = workspace van de deliverable; `uploadedById` = aanvragende user (geen null/FK-fout); `fileSize` = echte byte-lengte (niet 0), óók voor de transactie-fallback-rijen (`id=''`).
- [x] Categorie wordt per `contentType` gemapt (id-keyed); `fileType` reflecteert de echte mime (jpg vs png).
- [x] Ingestie is fire-and-forget: een geforceerde fout (dup slug, DB-fout) wordt als warning gelogd en verandert de HTTP-response, de `DeliverableComponent`-rijen noch de teruggegeven variant-URLs niet (try/catch in util).
- [x] Dezelfde URL twee keer ingesten gooit niet en dubbel-tagt niet (slug-collision fail-soft + tagger idempotency-guard).
- [x] `npx tsc --noEmit` 0 errors
- [x] `eslint` op gewijzigde bestanden 0 errors (volledige `npm run lint` bij task-finalize)
- [x] Smoke uitgevoerd (`smoke:content-library-ingest` 43/0 + feature-visual-smokes 72/0 groen) — handmatige browser-smoke open
- [ ] Documentatie bijgewerkt indien van toepassing (changelog bij task-finalize)

# Bestanden die ik aanraak

- `src/lib/media/import-generated-image.ts` — optionele `category?: MediaCategory` (resolve: `sceneType` → `category` → `LIFESTYLE`); echte `contentType`/`fileType` i.p.v. hardcoded `image/png`; `invalidateCache(cacheKeys.prefixes.media(workspaceId))` na create (in bestaande try/catch). Bestaande feature-visual-aanroep blijft ongewijzigd.
- `src/lib/media/` — kleine pure helper `resolveMediaCategory(contentType)` voor de per-type mapping (testbaar).
- `src/app/api/studio/[deliverableId]/generate-visual/route.ts` — ingest-loop na persist-transactie; `rawBytes.length` doorvoeren incl. de fallback-array (`id=''`).
- `src/app/api/studio/[deliverableId]/generate-visual-trained/route.ts` — zelfde loop met `session.user.id`.
- `src/app/api/studio/[deliverableId]/generate-visual-compose/route.ts` — zelfde loop; echte mime (jpg/png) meegeven.
- `src/app/api/studio/[deliverableId]/components/[componentId]/refine-visual/route.ts` — ingest alleen finale versie; auth-guard → `requireDeliverableAccess` voor `userId` (status-contract behouden).
- `src/app/api/studio/[deliverableId]/edit-image/route.ts` — fetch+upload naar onze storage, stored-URL teruggeven, dan ingest; auth-guard → `requireDeliverableAccess`.
- `scripts/smoke-tests/content-item-library-ingest.ts` — **nieuw**: category-resolutie + static census-grep dat álle beeld-routes de util aanroepen (regressie-vangnet).
- `package.json` — `smoke:content-library-ingest` script.

# Bestanden die ik NIET aanraak

- `src/app/api/studio/[deliverableId]/generate-feature-visuals/route.ts` — al gewired via #325; gedrag mag niet wijzigen.
- `src/app/api/studio/[deliverableId]/hero-image/route.ts` — setter (geen AI-generatie); bewust OOS.
- `generate-video` / `generate-voiceover` routes — video/audio naar fal.storage, tagger draait alleen op IMAGE.
- `components/[componentId]/generate` + `regenerate` — geverifieerd tekst-only (`dispatchTextCompletion`).
- DeliverableComponent↔MediaAsset FK / schema-migratie — blijft workspace-scoped zoals #325.

# Smoke test plan

1. `npm run smoke:content-library-ingest` (category-precedentie + census dat alle 5 routes de util aanroepen) + `tsx scripts/smoke-tests/feature-visual-gate.ts` (bewijst #325 intact).
2. `npm run dev`; open seeded workspace; noteer asset-count in Media Library.
3. Content-item deliverable → Canvas Step 2 → Generate Visual (FLUX) → 2-3 varianten; ~20-30s wachten → Media Library toont N nieuwe `AI_GENERATED` assets met description+tags, juiste workspace.
4. Herhaal met compose-pad en met de "Verbeter"-knop (refine) → finale versie verschijnt als één asset.
5. edit-image: pas een edit toe → response-URL wijst naar onze storage (geen `*.fal.media`), asset verschijnt in library.
6. Kies een bestaand library-beeld als variant-bron → géén duplicaat-asset.
7. Forceer een slug-collision (zelfde name) → beeld genereert/persisteert nog steeds, alleen warning gelogd.
8. DB-check: `/opt/homebrew/opt/postgresql@17/bin/psql ... -c 'select source, count(*) from "MediaAsset" where "workspaceId"=... group by source;'`

# Risico's

- **edit-image auth/contract**: route mist nu `getServerSession`; switch naar `requireDeliverableAccess` voor `userId`. Mitigatie: `access.status` mappen zodat bestaande 403/status-contract behouden blijft; rate-limit-volgorde intact houden.
- **refine-visual auth idem** — zelfde mitigatie.
- **fileSize fallback-rijen**: byte-lengte ook door de fallback-array (`id=''`) threaden, anders 0/undefined.
- **fire-and-forget embedding** kan stil falen (geen retry) → asset zonder embedding (uitgesloten van library-first). Pre-existing #325-gedrag; geaccepteerd, niet hier geïntroduceerd.
- **cache-churn**: `invalidateCache(media)` in de util vuurt nu ook bij feature-visuals. Additief en goedkoop (prefix-bust); aligned met "elke mutatie invalideert".
- **Parallelle sessies in één worktree** = bekend patroon bij deze user; studio-routes zijn hotspots. Mitigatie: dedicated worktree `branddock-feat-content-images-library` + `git fetch` vóór push.

# Out of scope

- Video/audio library-ingestie (aparte workstream).
- Backfill van bestaande orphan `DeliverableComponent.imageUrl`-rijen (alleen nieuwe generaties worden ingest).
- `imageSource` string → enum/FK refactor op DeliverableComponent.
- Dedup op file-hash/perceptuele gelijkenis (leunt op slug-uniciteit + embedding-similarity, zoals #325).
- `MediaAsset.productId`-koppeling aan bron-product (additieve enhancement; niet nu).
- `hero-image` POST setter-pad.

# Notes

- Bron: ultracode-workflow `plan-content-item-images-to-library` (investigatie 4 readers → synthese → adversariële review), 2026-06-19. Script: `…/workflows/scripts/plan-content-item-images-to-library-wf_45419149-abd.js`.
- Census uit review: enige IMAGE-byte-producerende studio-routes zijn `generate-visual`, `-trained`, `-compose`, `refine-visual`, `generate-feature-visuals` (al gewired) + `edit-image` (partial). `components/[componentId]/generate`, `regenerate`, `photo-brief`, `inline-transform` zijn tekst-only.
- De "skip `library:`-rijen"-guard uit #325 is in deze 4 routes feitelijk een no-op (ze hardcoden `imageSource:'ai_generated'`); de echte edge is de persist-fallback-rij — behoud beide guards voor robuustheid.
- `MediaCategory`-enum bevat `SOCIAL_MEDIA`, `ADVERTISEMENT`, `HERO_IMAGE`, `LIFESTYLE` (bevestigd door review) → per-type mapping is haalbaar.

## Uitvoering 2026-06-19 (gebouwd, gates groen)

Bestanden: `src/lib/media/import-generated-image.ts` (uitgebreid: `category`/`contentType`/`replaceBySourceUrl` + media-cache-invalidatie), nieuw `src/lib/media/resolve-media-category.ts`, 5 routes gewired (`generate-visual`, `-trained`, `-compose`, `refine-visual`, `edit-image`), nieuw `scripts/smoke-tests/content-item-library-ingest.ts` + `package.json` script. Gates: `tsc` 0, `eslint` 0, `smoke:content-library-ingest` 43/0, #325-smokes (gate/preserve/prompts) 72/0 ongewijzigd.

**Adversariële review (3 lenzen) — 2 MAJOR gefixt:**
- `Deliverable.contentType` slaat de type-**id** op ("blog-post"), NIET de naam. Mijn name-lookup in refine + edit-image viel daardoor stil terug op LIFESTYLE. Gefixt → id-keyed `getDeliverableTypeById(contentType)?.category` (consistent met de 3 generate-routes die `stack.deliverableTypeId` gebruiken; `canvas-context.ts:761` zet die = `deliverable.contentType`). Smoke uitgebreid met end-to-end id-contract + regressie-guard tegen name-lookup.
- Review bevestigde verder: IDOR dicht (requireDeliverableAccess), verlopende fal-URL gedicht in edit-image, `access.userId` altijd gezet, geen dode imports.

**Bewust uitgesteld (review-minors, niet-blokkerend):**
- Replace-per-slot (`deleteMany`+`create`) is niet-transactioneel → theoretische race bij 2 gelijktijdige refines van hetzelfde component (zelf-herstellend bij volgende refine; "Improve"-knop is disabled tijdens request). Documenteren i.p.v. schijnzekerheid van een $transaction die onder read-committed alsnog niet serialiseert.
- Status-contract refine/edit: nu 401/403/404 i.p.v. altijd 403 — granulairder en niet-brekend (callers checken alleen `!res.ok`).
- DRY: de ingest-loop staat ~verbatim in de 3 generate-routes; extractie naar `ingestUploadsToLibrary()` is een nette follow-up (overgeslagen om niet 5 files opnieuw te raken; divergentie nu afgedekt door identieke one-liner + smoke-contract).
- edit-image accumuleert per edit (geen replace) — bewust: een edit is een losse transformatie en kan als nieuwe variant landen i.p.v. de bron vervangen (gedocumenteerd in de route).

**Open:** browser-verificatie op localhost (genereer → Media Library toont nieuwe AI-assets; compose + improve + edit; library-bron levert geen duplicaat) + `task-finalize` (commit + changelog).
