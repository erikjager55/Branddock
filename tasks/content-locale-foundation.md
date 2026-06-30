---
id: content-locale-foundation
title: Content-language selector (per workspace) + forward-compatible multi-markt datamodel (Brand + BrandLocaleProfile)
fase: pre-launch
priority: now
effort: 2-3 weken
owner: claude-code
status: open
created: 2026-06-28
completed: -
related-adr: docs/adr/2026-06-28-multilingual-i18n-and-multi-market-content.md
related-spec: -
worktree: -
---

# Probleem

Content-locale is vandaag een single-scalar per workspace/merk (`Workspace.contentLanguage` + `BrandVoiceguide.contentLocale`, gecollapst tot één `ctx.contentLanguage`). Er is geen levende per-workspace content-taalselector (de schermen zijn dode code), en geen enkel content-model draagt een locale-dimensie. Om multinationale markten later mogelijk te maken zonder een dure live-migratie, moeten nu een paar niet-brekende datamodel-keuzes landen — pre-launch met ~0 productie-landingspagina's is dat gratis.

# Voorstel

Bouw de **Content-language**-selector in de levende Workspaces-tab (schrijft `Workspace.contentLanguage` via bestaande PATCH, maar door het nieuwe default-profiel) en behoud de per-merk override in `VoiceDnaSection`. Introduceer additief/nullable `Brand` (1:1 met Workspace) + `BrandLocaleProfile` (één rij per markt, JSON-delta), backfill exact één `isDefault`-profiel per bestaande workspace, voeg nullable `localeProfileId` toe aan output-modellen, migreer de LandingPage unique-key, en maak `getBrandContext(workspaceId, localeProfileId?)` + de resolver locale-aware met de cache-key-wijziging in dezelfde commit. **Geen** multi-markt-gedrag; het default-pad reproduceert vandaag byte-identiek.

# Acceptatiecriteria

- [ ] Schema (additief, `db push`): `Brand(workspaceId @unique)`, `BrandLocaleProfile(@@unique([workspaceId, locale]))`, nullable `localeProfileId` op `Deliverable`/`Persona`, `localeProfileId`+`locale` op `LandingPage`; `LandingPage @@unique([workspaceId, slug])` → `([workspaceId, locale, slug])` backfilled naar default.
- [ ] Backfill-script: 1 `Brand` + 1 `isDefault` `BrandLocaleProfile` per bestaande workspace uit `resolveLocaleForBrand(workspaceId)`; bestaande Deliverable/Persona/LandingPage krijgen het default-`localeProfileId`.
- [ ] **Beide locale-paden** krijgen profiel-precedentie (review-bevinding: `getBrandContext` roept de resolver NIET aan): de inline `contentLanguage`-berekening in `getBrandContext` (`brand-context.ts:1002-1005`, fallback `'en'`) én `resolveLocaleForBrand` (`locale-resolver.ts:56`, fallback `'en-GB'`). Default-branch reproduceert béide byte-identiek. Cache-key `Map` `workspaceId` → `${workspaceId}:${localeProfileId}`; `invalidateBrandContext` wist álle `${workspaceId}:`-entries.
- [ ] `resolveLocaleForBrand(workspaceId, requestedLocale?)` met profiel-precedentie vóór de bestaande 3-laags fallback; voiceguide-`findUnique` blijft als fallback-laag (geen `@unique`-wijziging).
- [ ] Verse `prisma/seed.ts`-DB levert workspaces mét `Brand` + default-profiel (geen broken pad bij reseed/E2E).
- [ ] E2E: workspace-create/switch-specs + settings-flow aangepast; nieuwe spec bewijst de separation-invariant (Display-language wijzigen verandert generatie-output niet).
- [ ] Content-language-control in `WorkspacesTab` (rij + create-form) schrijft het default-profiel + mirror naar `Workspace.contentLanguage`; per-merk override blijft in `VoiceDnaSection`. Labels/badges per ADR (anti-verwarring vs Display language).
- [ ] Generatie-output voor elke bestaande workspace is byte-identiek vóór/na (default-profiel-pad geverifieerd).
- [ ] Elke nieuwe mutatie-route roept `invalidateCache(cacheKeys.prefixes.MODULE(workspaceId))` aan.
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd
- [ ] Documentatie bijgewerkt indien van toepassing

# Bestanden die ik aanraak

- `prisma/schema.prisma` (Brand, BrandLocaleProfile, nullable locale-velden, LandingPage unique-key)
- `prisma/scripts/backfill-brand-locale-profiles.ts` (nieuw) + `prisma/seed.ts` — verse dev/test-workspaces moeten óók `Brand` + 1 `isDefault`-profiel krijgen, anders breekt het default-pad bij elke reseed/E2E
- `src/lib/ai/brand-context.ts` — locale-aware `getBrandContext` (patch BEIDE: de inline `contentLanguage`-berekening op :1002-1005 + de cache-key `Map` :37) en `invalidateBrandContext` (:60-61) herschrijven zodat álle `${workspaceId}:`-keys gewist worden, niet één
- `src/lib/brand-fidelity/heuristics/locale-resolver.ts` (`requestedLocale`-param + profiel-precedentie) + `prisma/schema.prisma` `BrandVoiceguide.contentLocale`-docstring (verwijst nog naar `getHeuristicsForBrand()`; bijwerken naar de nieuwe precedentie)
- `src/app/p/[slug]/page.tsx` (:54,:110) + `src/lib/landing-pages/publish-page.ts` (upsert :93 / findUnique :141 / type-shims :21,:27) — LandingPage compound-key accessor `workspaceId_slug` → `workspaceId_locale_slug` (de unique-key-wijziging is een compile-break, geen no-op)
- `src/features/settings/components/workspaces/WorkspacesTab.tsx` (content-language control)
- `src/app/api/workspaces/route.ts` (PATCH schrijft default-profiel + mirror)
- `src/features/brandvoice/components/sections/VoiceDnaSection.tsx` (per-merk override behouden; option-set lockstep met F-VAL-packs)
- `e2e/tests/workspace/*` (create/switch-specs aanpassen aan de control) + nieuwe separation-invariant-spec
- `src/lib/api/cache-keys.ts` (indien profiel-scoped keys nodig)

# Bestanden die ik NIET aanraak

- `BrandVoiceguide`/`BrandStyleguide` `@unique`-constraints — blijven intact; markten zijn JSON-deltas, geen extra rijen.
- UI-locale-laag (`src/lib/ui-i18n/`, `AppearancePreference`) — andere as, niet hier.
- De transcreatie-runtime / per-locale F-VAL → `[[multi-market-transcreation-enterprise]]`.
- `p/[slug]` **hreflang-EMISSIE** (alternate-language tags) — LATER. NB: de unique-KEY-wijziging dwingt wél code-edits af in `p/[slug]/page.tsx` + `publish-page.ts` (zie 'aanraak'); alleen de hreflang-output is uitgesteld.

# Smoke test plan

1. `npx prisma db push` + backfill → elke workspace heeft 1 default-profiel; `localeProfileId` gezet op bestaande rijen.
2. Genereer een deliverable in 3 bestaande workspaces → output byte-identiek aan een pre-migratie-baseline (zelfde taal, zelfde F-VAL-resolutie).
3. Zet workspace content-language om in WorkspacesTab → default-profiel én `Workspace.contentLanguage`-mirror geüpdatet; resolver levert dezelfde enkele locale.
4. `/p/<slug>` blijft resolven na de unique-key-migratie; `tsc` groen.

# Risico's

- **Cache-key-wijziging is de riskantste edit**: locale-aware `getBrandContext` zonder de key-wijziging in dezelfde commit = cross-locale context-bleed in élke prompt. Samen committen.
- Merge-precedentie-bug op de chokepoint corrumpeert stil prompts → default-profiel-pad expliciet byte-identiek testen.
- Drie locale-scalars na migratie → profiel is single source-of-truth; elk schrijfpad dat de sync omzeilt veroorzaakt drift.
- LandingPage unique-key + `/p/[slug]` host-resolutie is een data+URL-migratie — nu gratis (~0 live pages), later pijnlijk. Backfill MOET `LandingPage.locale` zetten **vóór** de key flipt, anders insert de `publish-page.ts:93`-upsert (conflict-target bevat nu `locale`) duplicaten.

# Out of scope

- Multi-select "primary + additional markets" content-taal — v1 is single-select default + per-merk override; multiselect komt met de markt-dimensie in Fase 4.
- `voiceOverrides`/`localizedAssets` daadwerkelijk consumeren in prompts → `[[multi-market-transcreation-enterprise]]`.
- `MarketClaim` / persona-markt-tagging — vorm gereserveerd in de ADR, niet bouwen.

# Notes

- Splits de taal-gebonden tekst die nu in de globale `BrandStyleguide` zit (`designPhilosophy`, `fixtureSamples`, `archetypeReasoning`) conceptueel naar de overlay (`localizedAssets`) met default op de kern, zodat de "globale kern" geen markt-taal lekt zodra overlays landen.
- Vervolg: `[[content-locale-target-picker]]`.
