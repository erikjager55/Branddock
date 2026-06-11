---
id: lp-library-first-matching
title: Library-first matching — echte merkfoto's semantisch matchen vóór AI-generatie
fase: pre-launch
priority: next
effort: ~2 dagen
owner: claude-code
status: done
created: 2026-06-11
completed: 2026-06-11
related-adr: docs/adr/2026-06-10-feature-visual-pipeline.md (beslissing 10)
related-spec: docs/audits/2026-06-10-lp-feature-image-diversity.md (jury-grafts source-first lens)
worktree: branddock-feat-lp-library-first (bij start aanmaken)
---

# Probleem

LP feature-beelden worden altijd AI-gegenereerd, ook wanneer de Media Library een échte merkfoto heeft die de sectie dekt. De bron-laag was dood (brandImages=JsonNull sinds a3c49ecf) en de embeddings ontbraken — **dat laatste is opgelost**: backfill 2026-06-11 → 202/522 image-assets met aiDescription + pgvector-embedding (rest = orphaned DB-records zonder disk-file). `findSimilarMediaAssets` (tekst-query vs aiDescription-embedding) is precies hiervoor gebouwd.

# Voorstel

Server-side slot-matcher in de generate-feature-visuals-route (additief, vóór het generatie-pad): per slot de copy/brief embedden → `findSimilarMediaAssets` met categorie-filter (exclude LOGO/BRAND_MARK/ICON/ILLUSTRATION/INFOGRAPHIC/PRESENTATION) + `auth:PHOTO_REAL`-boost → greedy unieke toewijzing (één asset → max één slot, similarity-drempel start 0,55) → gedekte slots krijgen de asset-URL ($0, `sources: 'library'`), ongedekte gaan naar het bestaande AI-pad. Cold-start degradeert naar all-AI zonder throw. Dry-run-tooling bestaat al (`scripts/dev/lp-feature-image-dryrun.ts` uitbreiden met match-rapportage); fire-and-forget embedding-trigger voor nieuwe assets zit al in de dam-auto-tagger.

# Acceptatiecriteria

- [x] Slot met passende library-foto (similarity ≥ drempel) gebruikt die foto; response `sources` toont 'library'; geen fal-kosten voor dat slot
- [x] Geen asset op twee slots; LOGO/ICON/illustraties nooit gematcht
- [x] Cold-start (workspace zonder embeddings) → volledig AI-pad, geen errors
- [x] Golden-set dry-run over Napking/Zwarthout/Better Brands met asserts op verwachte match-categorieën (drempel-tuning meetbaar)
- [x] Bron-badge in PuckImageField toont 'Media library' voor gematchte beelden (werkt al via URL-heuristiek)
- [x] tsc 0 · lint 0 · smokes groen

# Bestanden die ik aanraak

- `src/lib/landing-pages/source-image-matcher.ts` (NIEUW)
- `src/lib/media/embedding-search.ts` (additieve categories-filterparam)
- `src/app/api/studio/[deliverableId]/generate-feature-visuals/route.ts` (matcher vóór generatie)
- `scripts/dev/lp-feature-image-dryrun.ts` (match-rapportage)

# Bestanden die ik NIET aanraak

- ImageSourcePanel/LibraryAssetPicker (hero-source-flow) — feature-target-UI is een aparte vervolg-stap
- dam-auto-tagger (embedding-trigger bestaat al)

# Smoke test plan

1. Matcher-unit (gemockte findSimilar): unieke toewijzing, categorie-filter, drempel, cold-start
2. Dry-run golden-set: Better Brands (grootste library) verwacht matches; Napking (2 assets) grotendeels AI
3. Live: 1 page-run met geseede passende asset → slot gebruikt library-foto

# Risico's

- "Echt maar fout" beeld erger dan goed AI-beeld → drempel conservatief starten (0,55) + golden-set-tuning + bron-badge maakt missers zichtbaar
- Better Brands library bevat veel orphaned records → matcher moet disk-existence niet aannemen (URL-check of alleen assets mét embedding)

# Out of scope

- Feature-target in de source-keuze-UI (handmatige per-slot picker)
- Gegenereerde beelden als MediaAsset importeren + embedden (reuse-detectie-uitbreiding)

# Notes

- 2-reviewer ronde 1: 1 CRITICAL (webp-format vergiftigde judge-keten + fail-open accept) + 4 WARNINGs — alle gefixt; bevestigingsronde: 0 critical / 0 warning. Aanvullend t.o.v. het voorstel: fail-CLOSED accept zonder judge-oordeel, source-aware dupe-bescherming (library-foto nooit duplicate-verliezer), assetId-provenance, /uploads/-containment, parallelle matcher/prefill met deterministische tie-breakers.
- Golden-set: 0 matches op drempel 0,55 voor de huidige libraries (conservatief zoals ontworpen); drempel-tuning via dry-run zodra libraries groeien. Live-acceptatie: zie changelog #323.
