# Task: MCP write-tool `import_brand_data` + Adullam-import

**Status**: done
**Completed**: 2026-07-21 (Adullam-import op de echte DB wacht op lokale run — zie acceptatiecriteria)
**Datum**: 2026-07-21
**Sessie**: Claude Cowork remote (branch `claude/branddock-merkonderdelen-werkbestand-o2tmfs`)

## Scope

1. Schrijf-tool voor de publieke MCP-server zodat de werkbestand-flow
   (`docs/templates/werkbestand-merkonderdelen.md`) merkonderdelen direct in
   een merk kan laden: brand assets, brand voice, personas, producten,
   concurrenten, trends, kennisbronnen.
2. Verwerking van het ingevulde Adullam-werkbestand (21 juli 2026) via
   diezelfde code.

## File-list

- `src/lib/api/public/brand-import.ts` — nieuw: gedeelde import-service
  (`importBrandData`), idempotente upserts op natuurlijke sleutels, skip bij
  `isLocked`, rapport created/updated/skipped, cache-invalidatie
  (module-prefixes + `invalidateBrandContext`).
- `src/lib/api/public/mcp-server.ts` — nieuw tool `import_brand_data`
  (18e publieke tool), zod-schema spiegelt het werkbestand, write-gate via
  bestaand `runTool`/`requireWriteAccess`-pad.
- `scripts/import-merkonderdelen/adullam.ts` — nieuw: Adullam-payload +
  aanroep van de service. Lokaal draaien: `npx tsx scripts/import-merkonderdelen/adullam.ts`.
- `docs/templates/werkbestand-merkonderdelen.md` — correcties: NN/g
  tone-schaal 1-7 (was 0-100), veldnamen gelijkgetrokken met
  `framework.types.ts` (`attributes`, `personalityTraits`-objecten,
  brand-story-keys), verwerkingsroute via `import_brand_data`.

## Acceptatiecriteria

- [x] `npx tsc --noEmit` 0 errors
- [x] Tool registreert onder bestaand write-access-pad (OAuth-viewer krijgt nette error)
- [x] Import is idempotent (herdraaien geeft `updated`, geen duplicaten)
- [x] Vergrendelde records worden overgeslagen en gerapporteerd
- [x] Smoke tegen scratch-Postgres (remote sessie, PG16+pgvector, volledig schema):
      26 onderdelen gevuld; herdraai 0 duplicaten; locked asset geskipt;
      BrandRule-sync 13+6 rules; locale-anker nl-NL; 3 DetectedTrends MANUAL/
      geactiveerd; 27 asset-versiesnapshots (incl. pre-import); persona-create
      incl. AI_EXPLORATION-rij; deep-merge behoudt geneste velden
- [ ] Smoke lokaal (Erik): `npx tsx scripts/import-merkonderdelen/adullam.ts`
      tegen de echte DB en `get_brand_context` toont de Adullam-context

## Test-notitie

Geen unit-tests toegevoegd: het project heeft alleen een Playwright-e2e-runner
(geen vitest/jest); een unit-runner introduceren is een aparte
architectuurbeslissing (ADR). De import-logica is end-to-end geverifieerd via
de scratch-DB-smokes hierboven.

## Out-of-scope

- Brandstyle-import (kleuren/fonts/logo's) — bewust: brandstyle loopt via de
  analyse-flow; handmatige merkstijl-invoer uit het werkbestand vergt eerst een
  check tegen het huisstijlhandboek.
- Verwijderen van records via MCP (tool is upsert-only, niets destructiefs).

## Geaccepteerde afwijkingen (review-rondes 1-4)

- **frameworkData-values ongevalideerd** (alleen top-level key-allowlist):
  bewuste pariteit met `PATCH /api/brand-assets/[id]/framework`, dat ook
  `z.record(z.unknown())` accepteert. Mitigaties: 50KB-cap, prototype-guard,
  fail-closed key-filter, en de personality→BrandRule-sync synct alleen bij
  een échte array (kapotte shapes kunnen geen rules wegvagen).
- **Actor-attributie op het API-key-pad**: `createdById`/versie-auteur valt
  terug op de org-owner (machine-calls hebben geen sessie-user); API-keys
  zijn owner/admin-only aangemaakt, dus geen privilege-verruiming.
- **Adullam toneDimensions.formalCasual = 2** (formule zou 3 geven): bewust
  richting het formele uiteinde afgerond conform de Schrijfwijzer.
- **ESG governance-pillar zonder `impact`-level**: het werkbestand gaf geen
  niveau ("—") — niet verzonnen; aanvullen via de app.

## Notities

- De remote Cowork-omgeving heeft geen DB; de Adullam-import moet dus lokaal
  gedraaid worden (of via de MCP-tool zodra de server met deze code herstart is).
- `[voorstel]`-velden uit het werkbestand (archetype, BrandHouse-mapping
  kernwaarden, persona-leeftijden) zijn meegenomen op verzoek van Erik
  ("verwerk deze gegevens") — validatie kan in de app.
