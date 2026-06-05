---
id: 2026-06-05-typography-font-canonicalization
title: Typography font-canonicalisatie — Adobe-CLS-fallback strip + dedup + type-scale rem-normalisatie + geconsolideerd font-load-pad
status: accepted
date: 2026-06-05
supersedes: -
superseded-by: -
---

# Context

De Typography-tab van de Brandstyle-analyzer presenteerde de gescrapte merk-fonts onjuist. Concreet op de Napking-styleguide (Adobe Fonts Effra-kit), waar de scrape `detectedFonts = ['effra', 'effra-fallback', ...]` oplevert. `effra-fallback` is Adobe's auto-gegenereerde CLS-fallback-family (een `@font-face` met `size-adjust`/`ascent-override` om layout-shift te dempen) — **geen tweede merk-font**.

Root-causes (geverifieerd, file:line), zie audit `docs/audits/2026-06-05-brandstyle-extraction-pipeline.md`:

- **D1** — `writeResultToDb` (`analysis-engine.ts:1881`) splitste `detectedFonts` zonder canonicalisatie → `additionalFonts[0] = 'effra-fallback'` = de "Secondary"-kaart.
- **D2** — `typography-extractor.ts:213` pakte `split(',')[0]` verbatim → heading kreeg `effra-fallback`, body `effra`.
- **D3** — geen dedup van `X` vs `X-fallback` → dubbele kaarten (Brand Fonts + UI TYPE in FontsGrid).
- **D4** — twee divergerende font-load-paden: `TypographySection` injecteerde blind een Google-Fonts `<link>` (404 voor commerciële fonts → system-ui) terwijl `FontCard` via metric-substitute (Inter) rendert → inconsistente "soms wel/soms niet" preview.
- **D5** — het Type-Scale groepslabel toonde de volledige CSS-stack + een redundante `(sans-serif)`-suffix.
- **D6/D7** — `getFontForLevel` swapte headings naar de fantoom-fallback; de typeScale bevatte overlappende niveaus + gemengde eenheden (clamp/em/rem/px).

De render-laag had al pleisters die erkenden dat `effra-fallback` nep was, maar repareerde de **data** niet. Een ontwerp-workflow met adversariële review (2026-06-05) toonde aan dat de naïeve fix (type-scale dedup + `2rem→32px` eenheid-omrekening) regressies introduceert.

# Decision

Canonicaliseer fontnamen aan de **bron** (vóór de DB-write) en consolideer het font-load-pad, via gedeelde pure helpers:

1. **`font-generic-families.ts`** — gedeelde, dependency-vrije constante `GENERIC_FONT_FAMILY_NAMES`. Zowel `url-scraper.ts` als `font-fallback.ts` gebruiken deze (één bron-of-truth, geen cheerio-import in de pure helper).

2. **`canonicalizeFontFamily(name)`** + **`dedupeBrandFonts(names)`** in `font-fallback.ts`: strip omringende quotes → collapse whitespace → strip de Adobe-CLS-fallback-suffix met strak anchor `/[\s-]fallback$/i` (zodat legitieme namen als `Fallback Display`/`Falling Sky` heel blijven; casing wordt NIET gemuteerd) → drop generieke families. Toegepast vóór de split in `writeResultToDb` én in `selectDetectedFontNames` (D1/D3).

3. **`assignRole` dubbel-canon** (`analysis-engine.ts`): zowel de gedetecteerde rij-naam als de gescrapte `bodyFont`/`headingFont` worden gecanonicaliseerd vóór de exact-match, anders valt een font door naar DISPLAY i.p.v. UI (D2).

4. **Extractor first-family canon** (`typography-extractor.ts`): kies de eerste *canonicaliseerbare* family uit de stack i.p.v. blind `split(',')[0]` (D2).

5. **`normalizeTypeScale`** (`type-scale-normalizer.ts`): **ALLEEN** eenheid-normalisatie naar `rem` met object-spread (veldbehoud). **GEEN dedup, GEEN level-collision-resolutie, GEEN rem→px-omrekening** (D6/D7, met expliciete uitzonderingen hieronder).

6. **Geconsolideerd font-load-pad** (`font-loading.ts` + `typography-display.ts`): `resolveFontRender` kiest de bron (UPLOADED → ADOBE-met-workspace-kit → GOOGLE_FONTS → metric-substitute). Alle previews (Brand Fonts, Type Scale, In Context) gebruiken hetzelfde pad als `FontCard`; de blinde Google-Fonts-injectie is verwijderd; de substitute zit in de stack zodat commerciële fonts in Inter renderen i.p.v. system-ui (D4). Het Type-Scale label toont alleen de family-naam (D5).

## Expliciet afgewezen / bewust niet gedaan

- **GEEN type-scale dedup of level-collision-resolutie.** `mapTypographyRoles` (`semantic-role-resolver.ts:432`) is size/count-gedreven en vult `body-lg/md/sm` uit near-size-entries → dedup veroorzaakt MEER lege buckets. De live `InContextPreview` matcht exact op `'h1'/'h2'/'h3'` → een `DISPLAY`-herlabel breekt de preview.
- **GEEN rem→px-omrekening** (`2rem→32px`). Corrumpeert bron-getrouwheid bij sites die de root rebasen (`html{font-size:62.5%}` → 2rem = 20px). De prompt-instructie (`analysis-prompts.ts:115`) verbiedt expliciet inferring/rounding van typeScale-waarden; normalisatie blijft rem→rem identiteit.
- **clamp() → min-arg** als bron-size (consistent met de preview-cap `capPreviewSize`). Bewuste keuze; zie open beslissing in het task-file.
- **Drift-snapshot blijft ongecanonicaliseerd.** `processed.fonts` (incl. `effra-fallback`) wordt nog ruw in de drift-snapshot geschreven (`analysis-engine.ts:594/916`). Snapshot = ruwe observatie, styleguide = gepresenteerde data; ook canonicaliseren zou bestaande drift-hashes voor alle workspaces verschuiven.

# Consequences

- **Positief**: `effra-fallback` (en analoge `*-fallback`-families) lekken niet langer als secondary/heading-font; geen dubbele kaarten; consistente previews; nette labels; consistente rem-eenheden.
- **Re-scrape vereist**: bestaande styleguides tonen de stale `effra-fallback` tot her-analyse (`npx tsx scripts/rescrape-brand.ts <workspace>` — DESTRUCTIEF). De code-fix zit op het write-pad, niet op bestaande rijen.
- **Adobe-kit domain-lock blijft**: live Effra-preview vereist een eigen workspace-kit; rows-less previews en domain-locked kits tonen de metric-substitute (Inter).
- **Consumers lezen ander-genormaliseerde data**: `mapTypographyRoles`, de LP-renderers (`brand-tokens.ts`) en de twee PDF-exporteurs. Geborgd dat het aantal/volgorde van type-scale-entries gelijk blijft en alle velden behouden worden (object-spread), zodat de rol-mapping en exporters niet breken.
- **Helper-signaturen als contract**: `canonicalizeFontFamily` / `dedupeBrandFonts` / `normalizeTypeScale` / `resolveFontRender` worden door smoke-tests (phase44/45) bewaakt.

# Y-statement

In de context van de Brandstyle Typography-pijplijn, geconfronteerd met Adobe-CLS-fallback-families die als merk-fonts lekken + twee divergerende font-load-paden + gemengde type-scale-eenheden, kozen we voor **bron-canonicalisatie via gedeelde pure helpers + een geconsolideerd availability-gedreven load-pad + rem-only type-scale-normalisatie**, en bewust NIET voor type-scale dedup/collision of rem→px-omrekening, om correcte font-presentatie te bereiken zonder de size-gedreven rol-mapping, de live preview of bron-getrouwheid te breken, met als consequentie dat een re-scrape nodig is om bestaande styleguides te verversen. Voorganger: [[2026-05-29-brandstyle-analyzer-lp-fidelity]].
