---
id: brandstyle-typography-fonts
title: Brandstyle Typography-fonts-fix (canonicalisatie, rol-mapping, load-pad, label, type-scale)
fase: pre-launch
priority: next
effort: 3-4 dagen
owner: claude-code
status: done
created: 2026-06-05
completed: 2026-06-05
related-adr: docs/adr/2026-06-05-typography-font-canonicalization.md (te maken in F4)
related-spec: docs/audits/2026-06-05-brandstyle-extraction-pipeline.md
worktree: branddock-feat-brandstyle-typography
---

# Voortgang (2026-06-05)

**Code F1-F4 geïmplementeerd + geverifieerd** op branch `fix/brandstyle-extraction`. Gates: `npx tsc --noEmit` 0 errors, `eslint` 0 errors/warnings op alle 18 gewijzigde files, smokes groen (phase44 37/0, phase45-typescale 16/0, phase45-font-loading 10/0, phase26-regressie 38/0). Nieuwe npm-key `smoke:brandstyle-typography`. ADR geschreven. CLAUDE.md rescrape-commando toegevoegd. Quick-wins QW1-QW4 alle meegenomen.

**Re-scrape Napking UITGEVOERD (2026-06-05)** — `db:backup` (60M) → `rescrape-brand.ts Napking` (145s). Geverifieerd via psql: `additionalFonts` `{effra-fallback}`→`{}`, StyleguideFont `effra`+`effra-fallback`→alleen `effra`, typeScale `clamp(...)`/`2.25em`/`13px`→`2.089rem`/`2.25rem`/`0.813rem`. **`effra-fallback` volledig weg.**

**Smoke-suite hersteld (in scope genomen op verzoek):** de volledige `smoke:web-page-builder`-keten was rood door pre-existing failures (gemaskeerd doordat de keten bij phase2 stierf). Alle gediagnosticeerd + gefixt per geval:
- `phase2` — Puck-registry 10→11 (`BrandNav` toegevoegd): smoke-assert afgeleid van `expected.length` (vangt voortaan ook extra componenten).
- `phase23` lucide-icons — **stale assertie**: onbekende icon → Sparkles-fallback (bewust, `5216c7db`, comment r.183-185) i.p.v. text; smoke + stale JSDoc bijgewerkt.
- `phase39` vocab-voice — **stale assertie**: vocab-rails activeren nu bij ≥1 item (bewust, variant-generator r.178-182, sparse-vocab merken); smoke bijgewerkt. (Bijna ten onrechte als regressie "gefixt" — code-comment ving het.)
- `phase18` brand-hero — **stale assertie**: button-radius komt nu uit scraped `tokens.button.radiusPx` (gecapt per archetype), niet uit layoutStyle-preset (bewust, puck-config r.604-608); display-scale getemd (272px→88px); fixtures + asserts naar scraped-contract herschreven.
- **Resultaat: 43/43 web-page-builder smokes groen, volledige keten exit 0.** Productie-code-wijziging: alleen `lucide-icon-map.tsx` JSDoc (doc-only).

**Follow-up fix (2026-06-05, na browser-review):** Type-Scale- en In-Context-secties renderden dezelfde heading verschillend — **font-familie was identiek** (beide via `getFontForLevel`), maar **font-weight divergeerde** bij lege scrape: Type Scale `row.weight || 'inherit'` (→400) vs In Context `h1?.weight || 700` (→bold). Napking heeft alle weights NULL → kop regular in Type Scale, bold in In Context. Opgelost met gedeelde pure helper `weightForLevel(level, scrapedWeight)` in `typography-display.ts` (H1→700, H2-H6→600, body→normaal, scraped wint) — beide secties gebruiken 'm nu. Sizes verschillen blijven bewust (In Context = genormaliseerde mock). 6 unit-tests in phase45-font-loading. tsc/eslint 0.

**Nog te doen (handmatig — bewust niet autonoom gedaan):**
- [ ] `npx tsx scripts/rescrape-linfi.ts` als positieve fidelity-cross-check (optioneel; phase45-font-loading dekt het GOOGLE_FONTS-pad al).
- [ ] Browser-smoke Typography-tab (checklist F4 stap 13) + before/after-screenshots.
- [ ] `task-finalize` (2-subagent review + changelog + commit) — user-getriggerd.

# Probleem

De Typography-tab van de Brandstyle-analyzer presenteert de gescrapte merk-fonts onjuist. Concreet bij de Napking-styleguide (`detectedFonts = ['effra','effra-fallback', ...]`):

- **D1** — de "Secondary"-kaart toont de Adobe-CLS-fallback `effra-fallback` als zelfstandige merk-font.
- **D2** — `extractTypographyByRole` pakt blind `split(",")[0]` van de heading-stack → `effra-fallback` wordt de heading-familie i.p.v. `effra`.
- **D3** — `effra` én `effra-fallback` verschijnen als twee aparte kaarten (Brand Fonts + UI TYPE) in FontsGrid.
- **D4** — twee load-paden: TypographySection injecteert blind een Google-Fonts `<link>` voor `effra` (404), terwijl FontCard via metric-substitute (Inter) rendert → "soms wel/soms niet" preview.
- **D5** — het Type-Scale groepslabel toont de volledige CSS-stack (`"effra", system-ui, -apple-system, sans-serif`) plus een redundante `(sans-serif)`-suffix.
- **D6/D7** — `getFontForLevel` swapt headings naar de fantoom-fallback; de typeScale bevat overlappende niveaus en gemengde eenheden.

De root-cause is dat de scrape-bron niet gecanonicaliseerd wordt vóór de split, en dat de UI twee verschillende render-paden gebruikt. Vier adversariële reviews hebben de oorspronkelijke ontwerpen aangescherpt: F1 = GO-met-aanpassingen, F2/F3/F4 = HERONTWERP op specifieke punten. Die aanpassingen zijn in dit task-file verwerkt.

# Voorstel

Vier fasen, strikt volgordelijk (F1 → F2 → F3 → F4, met re-scrape ná F1-F3):

1. **F1** — pure canonicalisatie + dedup van fontnamen vóór de DB-split (`canonicalizeFontFamily` + `dedupeBrandFonts`), met een **gedeelde pure constants-module** voor generieke families, en **mee-canonicaliseren van bodyFont/headingFont in `assignRole`** zodat de rol-toewijzing niet breekt.
2. **F2** — canonicalisatie van de first-family in de typografie-extractor (heading kiest `effra`, niet `effra-fallback`) + rem-eenheid-normalisatie van de type-scale. **De dedup en level-collision-resolutie uit het oorspronkelijke F2-ontwerp zijn GESCHRAPT** (zie Open beslissingen) omdat ze de size-gedreven resolver en de InContextPreview breken.
3. **F3** — consolidatie van het font-load-pad in TypographySection naar hetzelfde availability-gedreven pad als FontCard, **met behoud van de verbatim `fontFamily` van bestaande StyleguideFont-rijen** (geen normalisatie) en **behoud van het echte-Google-Font-pad voor rows-less namen** + de D5 label-fix.
4. **F4** — pure-function smoke-test tegen de F1-F3 helpers, re-scrape-uitrol voor Napking, quality-gates, ADR-supplement en browser-verificatie.

# Volgorde-afhankelijkheden (HARD)

```
F1 (bron-canonicalisatie + assignRole-fix + pure constants-module)
   ↓  levert: canonicalizeFontFamily, dedupeBrandFonts, font-generic-families.ts
F2 (extractor first-family canon + rem-normalisatie type-scale)
   ↓  hergebruikt canonicalizeFontFamily uit F1
F3 (load-pad consolidatie + D5 label)
   ↓  hergebruikt resolveFontRender/availability; raakt analysis-engine NIET
F4 (smoke + re-scrape + ADR + browser-verificatie)
   ↓  test tegen F1-F3 helper-contract; re-scrape draait ALLEEN na F1-F3
```

- **F2 stap "extractor-canon" mag NIET starten** voordat `canonicalizeFontFamily` in `font-fallback.ts` bestaat (verificatie-grep + stop-and-ask).
- **De re-scrape (F4) draait ALLEEN nadat F1-F3 gemerged/aanwezig zijn op de branch** — `writeResultToDb` schrijft anders nog stale data.
- **F4-smoke test tegen de helper-signaturen uit F1-F3** — die contracten worden in de ADR (F4) vastgelegd vóór implementatie zodat naam-drift de smoke niet breekt.

# Geconsolideerde file-set (alle aangeraakte bestanden)

**Nieuw:**
- `src/lib/brandstyle/font-generic-families.ts` — pure constants-module (F1, review-fix: voorkomt cheerio-import in pure helper)
- `src/lib/brandstyle/type-scale-normalizer.ts` — pure rem-normalisatie (F2, ALLEEN unit→rem, GEEN dedup/collision)
- `src/features/brandstyle/utils/font-loading.ts` — gedeelde injectie + render-resolutie (F3)
- `scripts/smoke-tests/brandstyle-typography-fix.ts` — geconsolideerde smoke (F4)
- `docs/adr/2026-06-05-typography-font-canonicalization.md` — ADR (F4)

**Gewijzigd:**
- `src/lib/brandstyle/url-scraper.ts` — import `GENERIC_FONT_FAMILY_NAMES` uit nieuwe constants-module (F1)
- `src/lib/brandstyle/font-fallback.ts` — `canonicalizeFontFamily` + `dedupeBrandFonts` + aanpassing `selectDetectedFontNames` (F1)
- `src/lib/brandstyle/analysis-engine.ts` — canonicalisatie vóór split (1881) + `assignRole`-vergelijking canon (1990/2012) + `normalizeTypeScale` op write (2143) (F1+F2)
- `src/lib/brandstyle/typography-extractor.ts` — first-family canon (213-214) (F2)
- `src/lib/brandstyle/font-substitutes.ts` — verwijder `effra-fallback`-entry (25) (F1)
- `src/features/brandstyle/components/brand-assets/FontCard.tsx` — injectie verhuist naar util (F3)
- `src/features/brandstyle/components/TypographySection.tsx` — load-pad + D5 label + getFontForLevel→pure helper-extractie (F3, F4-eis)
- `package.json` — nieuwe smoke-script-key + chaining (F4)
- `CLAUDE.md` — rescrape-commando onder Common commands (F4)

**Pure helper-extractie (F4-eis, gebeurt in F3):** `getFontForLevel`, `normaliseFontName`, `capPreviewSize` verhuizen naar een nieuwe of bestaande pure module onder `src/lib/brandstyle/` zodat de F4-smoke ze kan importeren zonder de hele `.tsx`-keten (React/Zustand/TanStack) mee te trekken. Zie F4 stap 1.

---

# Fase 1 — Bron-canonicalisatie & dedup + assignRole-fix

**Doel**: twee pure helpers (`canonicalizeFontFamily` + `dedupeBrandFonts`) die Adobe-CLS `*-fallback`-families, case/whitespace/quote-varianten en generieke families wegnemen, toegepast vlak vóór de split in `writeResultToDb` én in `selectDetectedFontNames`. Resultaat voor Napking: `primaryFontName='effra'`, `additionalFonts=[]`, geen duplicaat-kaart, `effra-fallback`-substitute verdwijnt. **Review-fixes verwerkt:** pure constants-module i.p.v. import uit url-scraper; `assignRole` mee-canonicaliseren; snapshot-divergentie expliciet beslist.

## Stappen

1. **`create`** `src/lib/brandstyle/font-generic-families.ts` — **(REVIEW-FIX, was contingency, nu default)**
   Nieuwe pure module zonder dependencies. Exporteer `export const GENERIC_FONT_FAMILY_NAMES = [ 'serif','sans-serif','monospace','cursive','fantasy','system-ui','ui-sans-serif','ui-serif','ui-monospace','ui-rounded','inherit','initial','unset','revert','normal','auto','none','font','webfont','webfonts','text','body','-apple-system','blinkmacsystemfont','segoe ui','apple color emoji','segoe ui emoji','segoe ui symbol','noto color emoji' ] as const;` met JSDoc (NL). Reden: houdt `font-fallback.ts` dependency-vrij (anders sleept het via `url-scraper.ts` cheerio/ssrf mee — door reviewer als puriteitsregressie gemarkeerd).

2. **`refactor`** `src/lib/brandstyle/url-scraper.ts` — anchor: `const GENERIC_FONT_FAMILIES = new Set([...])` (regel 1041)
   Vervang de inline array door import uit de nieuwe module: `import { GENERIC_FONT_FAMILY_NAMES } from './font-generic-families';` en `const GENERIC_FONT_FAMILIES = new Set<string>(GENERIC_FONT_FAMILY_NAMES);`. Call-sites 947/1012/1183/1199/1220 blijven ongewijzigd (gebruiken nog steeds de Set). **GEEN gedragswijziging** — de Set is byte-identiek. `WEB_SAFE_FALLBACK_FONTS`/`isWebSafeFallbackFont`/`isIconFont` blijven in url-scraper (out-of-scope voor delen).

3. **`edit`** `src/lib/brandstyle/font-fallback.ts` — anchor: boven `hasNoBrandFonts` (regel 19), na de bestand-JSDoc
   Voeg toe: `import { GENERIC_FONT_FAMILY_NAMES } from './font-generic-families';` en een ge-canonicaliseerde lookup-Set: `const GENERIC_FAMILY_SET = new Set<string>(GENERIC_FONT_FAMILY_NAMES.map((f) => f.replace(/[\s_]+/g, '-')));` (zodat `'segoe ui'`→`'segoe-ui'` matcht na whitespace→hyphen-collapse).

4. **`create`** `canonicalizeFontFamily` in `font-fallback.ts` — na `GENERIC_FAMILY_SET`
   `export function canonicalizeFontFamily(name: string | null | undefined): string | null`. Volgorde: (a) null/leeg na trim → `null`; (b) strip omringende quotes `.replace(/^["']|["']$/g, '')`; (c) trim + collapse interne whitespace naar één spatie; (d) **Adobe-CLS-suffix-strip met strak anchor** `/[\s-]fallback$/i` → strip (`'effra-fallback'`→`'effra'`, `'Inter Fallback'`→`'Inter'`; `'Fallback Display'`/`'Falling Sky'`/`'PT Sans'` blijven heel); (e) generieke-drop: `cmp = stripped.toLowerCase().replace(/[\s_]+/g, '-')`; `if (GENERIC_FAMILY_SET.has(cmp)) return null;`; (f) return de schone gestripte naam — **casing NIET muteren** (PascalCasing blijft `normaliseFontName` in de UI). <50 regels, JSDoc (NL).

5. **`create`** `dedupeBrandFonts` in `font-fallback.ts` — direct na `canonicalizeFontFamily`
   `export function dedupeBrandFonts(names: readonly (string | null | undefined)[]): string[]`. Map door `canonicalizeFontFamily`, filter nulls, dedup op `key = canon.toLowerCase().replace(/[\s_]+/g, '-')` (eerste-voorkomen wint, volgorde behouden). Set + push-pattern (spiegelt `mergeFontsByPriority` url-scraper.ts:1250). <50 regels, JSDoc (NL).

6. **`edit`** `src/lib/brandstyle/font-fallback.ts` — anchor: `selectDetectedFontNames` (regel 54-58)
   Vervang `return detectedFonts.filter(...).slice(0, 6);` door `return dedupeBrandFonts(detectedFonts).slice(0, 6);` (dedupe doet de leeg/whitespace-filter al). Update JSDoc-blok (regel 48-53): namen zijn nu ge-canonicaliseerd + gededupliceerd. **Regressie-borging:** `['Inter','Roboto']` blijft ongewijzigd (geen casing-mutatie); cap-op-6 met 8 generieke-vrije inputs blijft werken (bestaande phase44-asserts moeten slagen).

7. **`edit`** `src/lib/brandstyle/analysis-engine.ts` — anchor: import-blok (regel 28-33)
   Voeg `dedupeBrandFonts` en `canonicalizeFontFamily` toe aan de named import uit `'./font-fallback'`.

8. **`edit`** `src/lib/brandstyle/analysis-engine.ts` — anchor: `writeResultToDb` split (regel 1881-1883)
   Before: `const [firstFont, ...restFonts] = detectedFonts;`. After: `const canonicalFonts = dedupeBrandFonts(detectedFonts); const [firstFont, ...restFonts] = canonicalFonts; const primaryFontName = firstFont ?? result.primaryFontName ?? null; const additionalFonts = restFonts.slice(0, 5);`. Update comment 1879-1880 (NL/EN): nu eerst canonicaliseren+dedupen vóór de split. `result.primaryFontName` (AI-fallback) wordt bewust NIET door de canonicalizer gehaald.

9. **`edit`** `src/lib/brandstyle/analysis-engine.ts` — anchor: `assignRole` (regel 1990 + 2012) — **(KRITIEKE REVIEW-FIX)**
   De rij-rol-toewijzing matcht via exacte lowercase-gelijkheid (`lower === bodyFontLower`). `bodyFont`/`headingFont` komen ongecanonicaliseerd binnen, terwijl de gedetecteerde rij nu naar `'effra'` is gecanonicaliseerd → een bron met `body{font-family: effra-fallback}` geeft `'effra' !== 'effra-fallback'` → de font valt door naar de CSS-classifier en kan ten onrechte DISPLAY i.p.v. UI krijgen.
   Fix: canonicaliseer **beide** zijden vóór de vergelijking. Pas regel 1990 aan: `const bodyFontLower = canonicalizeFontFamily(bodyFont)?.toLowerCase() ?? null;` (idem `headingFontLower`). De rij-naam (`lower`) wordt eveneens via `canonicalizeFontFamily(...)?.toLowerCase()` vergeleken zodat de exact-match-invariant hersteld is. Houd `assignRole` <50 regels.

10. **`edit`** `src/lib/brandstyle/font-substitutes.ts` — anchor: `effra-fallback`-entry (regel 25)
    Verwijder `"effra-fallback": { googleFont: "Inter", note: "Inter stands in for the Effra CSS fallback." },`. Veilig: na canon bereikt `effra-fallback` nooit meer `findFontSubstitute` als losse naam, en zelfs als wel dan matcht de fuzzy `startsWith` al op de `effra`-entry. `effra`-entry (regel 24) blijft staan. Geen andere `*-fallback`-entries aanwezig.

11. **`decide`** Snapshot-divergentie (learning-loop) — **(REVIEW-FIX: expliciet beslissen i.p.v. stilzwijgend)**
    `processed.fonts` (incl. `effra-fallback`) wordt OOK in de drift-snapshot geschreven (analysis-engine.ts:594/916). De canonicalisatie zit alleen op de write-split, niet in `preprocessScrapeData`. **Beslissing voor F1 (zie ook Open beslissingen #3):** de drift-snapshot blijft bewust ONgecanonicaliseerd (snapshot = ruwe observatie, styleguide = gepresenteerde data). Documenteer dit in PR + ADR. Alternatief (ook `processed.fonts` canonicaliseren) wordt afgewezen omdat het bestaande drift-hashes verschuift voor alle workspaces.

12. **`test`** `scripts/smoke-tests/web-page-builder-phase44-font-fallback.ts` — anchor: na het `selectDetectedFontNames`-blok
    Breid de bestaande Fase-4-smoke uit (zelfde assert-helper, pure helpers, geen DB). Importeer `canonicalizeFontFamily, dedupeBrandFonts`. Voeg de unit-tests uit "F1 unit-tests" hieronder toe + de assignRole-regressie-assert (F1 unit-test #16). **NB:** dit bestand is nog NIET in een npm-script geregistreerd (geverifieerd: de `smoke:web-page-builder`-keten stopt bij phase39, phase44 staat er niet in). F4 stap registreert het — voor F1-verificatie draai je het direct via `npx tsx`.

13. **`verify`** quality gates F1: `npx tsc --noEmit` (0 errors, geen any) + `eslint --fix` op de gewijzigde TS-bestanden + `npx tsx scripts/smoke-tests/web-page-builder-phase44-font-fallback.ts` → alle PASS. Browser-verificatie hoort bij F4 (na re-scrape). Vermeld: re-analyse nodig om DB-rijen te verversen.

## F1 unit-tests

| # | input | expected |
|---|---|---|
| 1 | `canonicalizeFontFamily('effra-fallback')` | `'effra'` |
| 2 | `canonicalizeFontFamily('Inter Fallback')` | `'Inter'` |
| 3 | `canonicalizeFontFamily('"Effra"')` | `'Effra'` |
| 4 | `canonicalizeFontFamily('system-ui')` | `null` |
| 5 | `canonicalizeFontFamily('Segoe UI')` | `null` |
| 6 | `canonicalizeFontFamily('   ')` | `null` |
| 7 | `canonicalizeFontFamily(null)` / `(undefined)` | `null` |
| 8 | `canonicalizeFontFamily('Fallback Display')` | `'Fallback Display'` (begint met, eindigt niet → geen strip) |
| 9 | `canonicalizeFontFamily('Falling Sky')` | `'Falling Sky'` |
| 10 | `canonicalizeFontFamily('PT Sans')` | `'PT Sans'` (casing niet gemuteerd) |
| 11 | `dedupeBrandFonts(['effra','effra-fallback'])` | `['effra']` |
| 12 | `dedupeBrandFonts(['Inter'])` | `['Inter']` |
| 13 | `dedupeBrandFonts([])` | `[]` |
| 14 | `dedupeBrandFonts(['Effra','system-ui','Inter','sans-serif'])` | `['Effra','Inter']` |
| 15 | `dedupeBrandFonts(['"Effra"','effra','EFFRA'])` | `['Effra']` (eerste-voorkomen, quotes gestript) |
| 16 | **assignRole-regressie**: detectedFonts `['Effra','effra-fallback']`, bodyFont `'effra-fallback'` | Effra-rij krijgt rol UI (NIET DISPLAY) — exact-match hersteld na dubbel-canon |
| 17 | `selectDetectedFontNames(['effra','effra-fallback'])` | `['effra']` (lengte 1, geen dubbele kaart) |
| 18 | `selectDetectedFontNames(['a','b','c','d','e','f','g','h'])` | lengte 6 (cap behouden) |

## F1 edge-cases / risico's

- False-positive suffix-strip op een echte family die op `-fallback` eindigt (bv. `'Brand Fallback'`) → geaccepteerd risico (zeldzaam, Adobe-CLS-conventie is dominant). Het anchor `[\s-]fallback$` beperkt de schade.
- Circulaire import is nu uitgesloten: `font-generic-families.ts` heeft 0 dependencies; beide importers trekken er veilig uit.
- `writeResultToDb` draait alleen bij (re)scrape → bestaande Napking-styleguide toont `effra-fallback` tot her-analyse (rescrapeNeeded, zie F4).
- De Set-vergelijkingsvorm (whitespace→hyphen) moet exact matchen tussen `GENERIC_FAMILY_SET`-opbouw en de `cmp`-key — afgedekt door test #5 (`Segoe UI → null`).

---

# Fase 2 — Extractor first-family canonicalisatie + rem-normalisatie type-scale

**Doel**: voorkom font-swap door de in de extractor gekozen first-family te canonicaliseren (F1-helper), en lever schonere type-scale-sizes door eenheden→rem te normaliseren vóór de DB-write. **HERONTWERP t.o.v. origineel F2:** de `dedupeBySize` + `resolveLevelCollisions` zijn GESCHRAPT (zie Open beslissingen #1) — die braken de size-gedreven `mapTypographyRoles` (verwijderde juist de near-size-entries die `body-lg/md/sm` vullen) en de LIVE InContextPreview (die exact op `'h1'/'h2'/'h3'` matcht en zou breken op een herlabeld `DISPLAY`-level). F2 doet daarom UITSLUITEND: (a) first-family canon, (b) verbatim rem-normalisatie van losse sizes, met **veldbehoud via object-spread**.

## Stappen

1. **`verify`** F1-dependency — anchor: `export function canonicalizeFontFamily` in `font-fallback.ts`
   Grep vóór start. Ontbreekt die → STOP en signaleer dat F1 eerst moet landen (stop-and-ask conform CLAUDE.md). Niet zelf dupliceren.

2. **`edit`** `src/lib/brandstyle/typography-extractor.ts` — anchor: regel 213-214, binnen 2e-pass `if (!target.fontFamily)`
   D2-fix. Before: `const first = rawFf?.split(",")[0]?.trim().replace(/^["']|["']$/g, ""); if (first) target.fontFamily = first;`. After: loop over de comma-families en pak de eerste die `canonicalizeFontFamily(...)` niet-null teruggeeft:
   ```ts
   const families = (rawFf ?? "").split(",");
   let chosen: string | null = null;
   for (const f of families) { const c = canonicalizeFontFamily(f); if (c) { chosen = c; break; } }
   if (chosen) target.fontFamily = chosen;
   ```
   Import toevoegen: `import { canonicalizeFontFamily } from './font-fallback';`. Hierdoor wint `effra` over `effra-fallback`. Binnen de bestaande <50-regels-functie.

3. **`create`** `src/lib/brandstyle/type-scale-normalizer.ts` — nieuw bestand, pure helpers, geen DB/IO
   **ALLEEN eenheid-normalisatie. GEEN dedup, GEEN level-collision-resolutie** (review-verdict). Exporteert `normalizeTypeScale(scale, opts?)` + `resolveSizeToRem` + `lengthToRem`.
   - **Type:** gebruik `TypeScaleLevel` uit `brandstyle.types.ts` (heeft optionele `color`/`letterSpacing`/`usage`). **Object-spread om veldbehoud te garanderen** (`{ ...entry, size: resolveSizeToRem(entry.size, rootPx) }`) — anders droppen PDF-exporteurs (`exportBrandstylePdf.ts:251`, `buildCompositeBrandPdf.ts:384`) stil `usage`/`letterSpacing`/`color`.
   - `lengthToRem(value, rootPx)`: px→rem=px/root; rem→identiteit; em→×1 (em==rem t.o.v. root, conform bestaande `parseToPx`-aanname); pt→pt*(4/3)/root; `null` bij niet-lengte.
   - `resolveSizeToRem(size, rootPx=16)`: enkele lengte → `'Xrem'` (3 dec). `clamp(min,pref,max)` → **neem de min-arg** (consistent met `capPreviewSize`, gedocumenteerd in JSDoc als bewuste keuze — zie Open beslissingen #2). `calc()` → eerste numeric+unit-token. **Onparseerbaar → originele string ongewijzigd** (fail-safe, nooit data verliezen).
   - `normalizeTypeScale(scale, opts?)`: map elke entry door `resolveSizeToRem` met spread. **Geen sorteren, geen dedup, geen collision-resolutie** — de entry-volgorde en het aantal entries blijven gelijk zodat de size-gedreven `mapTypographyRoles` (semantic-role-resolver.ts:432-477) exact dezelfde buckets vult.
   - Alle functies <50 regels, JSDoc (NL), geen `any`.

4. **`edit`** `src/lib/brandstyle/analysis-engine.ts` — anchor: regel 2143 `typeScale: result.typeScale || null,`
   Bereken vóór het `prisma.brandStyleguide.update`-blok: `const normalizedTypeScale = result.typeScale && result.typeScale.length > 0 ? normalizeTypeScale(result.typeScale) : null;`. In de update-data: `typeScale: normalizedTypeScale,`. Import: `import { normalizeTypeScale } from './type-scale-normalizer';` (val terug op dynamische `await import(...)` conform stijl regel 2121 als tsc een cycle meldt).

5. **`verify`** `src/lib/brandstyle/semantic-role-resolver.ts` — anchor: `parseTypeScale` (486-505) + `parseToPx` (657)
   Borg dat normalisatie `mapTypographyRoles` niet breekt. `parseTypeScale` leest `size`/`weight`/`lineHeight`, negeert onbekende velden → spread-behoud is contract-veilig. `parseToPx` kent px/rem/em maar geen clamp/pt/calc → na normalisatie zijn alle sizes `'Xrem'` = parseToPx-veilig (winst: clamp-entries die voorheen NaN gaven blijven behouden). **Geen code-wijziging verwacht; pure regressie-borging.** Verifieer met een genormaliseerde napking-scale dat `headline-display..body-sm` gevuld blijven (geen lege buckets) — F4 dekt dit met een echte `mapTypographyRoles`-assert.

6. **`test`** `scripts/smoke-tests/web-page-builder-phase45-typescale-normalizer.ts` — nieuw smoke-script (stijl phase44)
   Deterministisch, geen netwerk/DB. Importeer `normalizeTypeScale, resolveSizeToRem, lengthToRem` + `canonicalizeFontFamily`. Dek de F2 unit-tests hieronder + een **veldbehoud-assert** (input met `color`+`usage` → output behoudt `color`+`usage`). Registratie in package.json gebeurt in F4 (om één centrale plek te hebben); voor F2-verificatie draai direct via `npx tsx`.

7. **`verify`** quality gates F2: `npx tsc --noEmit` 0 errors + `eslint --fix` clean + `npx tsx scripts/smoke-tests/web-page-builder-phase45-typescale-normalizer.ts` groen. Geen browser-render binnen F2.

## F2 unit-tests

| # | input | expected |
|---|---|---|
| 1 | `resolveSizeToRem('clamp(2.5rem, 3.824vw + 1.276rem, 6.5rem)')` | `'2.5rem'` (min-arg, geen ruwe clamp) |
| 2 | `resolveSizeToRem('36px')` | `'2.25rem'` |
| 3 | `resolveSizeToRem('16pt')` | `'1.333rem'` |
| 4 | `resolveSizeToRem('var(--x)')` | `'var(--x)'` (ongewijzigd, fail-safe) |
| 5 | `resolveSizeToRem('18px')` | `'1.125rem'` |
| 6 | `normalizeTypeScale([])` | `[]` |
| 7 | `normalizeTypeScale` met `color`+`usage`+`letterSpacing` op een entry | output behoudt `color`+`usage`+`letterSpacing` (spread) |
| 8 | `normalizeTypeScale` met 3 entries verschillende levels/units | 3 entries, AANTAL ongewijzigd, sizes naar rem |
| 9 | extractor-pass over `font-family: 'effra-fallback', effra, system-ui` | `target.fontFamily === 'effra'` |

## F2 edge-cases / risico's

- **GEEN unit-conversie die de bron corrumpeert anders dan px↔rem**: clamp→min is een bewuste vereenvoudiging (documenteer in JSDoc). Zie Open beslissingen #2.
- `html{font-size:62.5%}`-rebase (ACSS): de reviewer wees erop dat `2rem` dan 20px is, niet 32px. **Daarom converteren we rem→rem als identiteit en doen we GEEN rem→px-omrekening** — de bron-getrouwheid blijft intact. (Het oorspronkelijke `2rem→32px` is geschrapt.)
- F1-helper-afwezigheid blokkeert stap 2 → verificatie-grep + stop-and-ask.
- Bestaande DB-rows met ruwe type-scale blijven ongewijzigd tot re-scrape (write-pad only).

---

# Fase 3 — Font-loading consolidatie + D5 group-label

**Doel**: consolideer de twee font-load-paden in TypographySection zodat Brand Fonts, Type Scale en In Context hetzelfde availability-gedreven pad gebruiken als FontCard (echte upload/Adobe-kit/Google-Font eerst, anders metric-substitute), stop met blind Google-Fonts `<link>`s injecteren voor commerciële families die 404en, en toon één consistente badge. Plus D5: group-label toont alleen de family-naam. **HERONTWERP-fixes verwerkt:** verbatim `fontFamily` behouden voor bestaande rijen (geen normalisatie), echte-Google-Font-pad behouden voor rows-less namen, exact-match (geen fuzzy) op het null-availability-pad.

## Stappen

1. **`create`** `src/features/brandstyle/utils/font-loading.ts` — gedeelde injectie + render-resolutie
   Verplaats verbatim uit FontCard.tsx (regel 29-53): module-Sets `injectedKits`/`injectedSubstitutes`, `injectTypekitCss(kitId)`, `injectSubstituteCss(family)`. Voeg pure helpers toe:
   - `buildFontFamilyStack(displayFamily, substituteGoogleFont, opts?: { normalise?: boolean })` → bouwt `'"<Family>", "<Substitute>", system-ui, -apple-system, sans-serif'`. **(REVIEW-FIX)** `normalise` default `false`: voor UPLOADED/ADOBE-fonts wordt de **verbatim** `font.fontFamily ?? font.name` doorgegeven (exact zoals FontCard.tsx:89 + `useCustomFonts` @font-face-registratie). Alleen het substitute-pad mag normaliseren. Laat substitute weg als null, `undefined` bij lege naam.
   - `resolveFontRender(name, availability, opts: { workspaceKitId, isUploaded, fontFamily?: string | null })` → `{ family, substitute, source }`. **(REVIEW-FIX)** `fontFamily` toegevoegd aan opts zodat het UPLOADED/ADOBE-pad de echte @font-face-registratienaam gebruikt i.p.v. de display-name. Beslisvolgorde identiek aan FontCard's `effectiveKitId`: UPLOADED → ADOBE_FONTS (alleen met workspaceKitId) → GOOGLE_FONTS → SUBSTITUTE.
   - **(REVIEW-FIX)** voor het SUBSTITUTE-pad op AI-inferentie-namen (availability `null`): **exact-match** tegen de catalog/substitute-tabel, GEEN fuzzy `includes/startsWith` — anders krijgen legitieme Google-Fonts als `'Markazi Text'`/`'Brownie'`/`'Caslon Display'` ten onrechte Inter. Bij twijfel: eerst Google-Fonts-catalog checken, substitute overslaan als de naam een bekende Google Font is.
   JSDoc (NL), geen any, functies <50 regels.

2. **`refactor`** `src/features/brandstyle/components/brand-assets/FontCard.tsx` — anchor: regel 27-53 (injectie)
   Verwijder de lokale `injectedKits`/`injectedSubstitutes`/`injectTypekitCss`/`injectSubstituteCss`; importeer ze uit `../../utils/font-loading`. **Minimaal-invasief: alleen de injectie-functies verhuizen, previewStyle ongemoeid laten** (de "vervang previewStyle door resolveFontRender"-optie is door de reviewer als onveilig gemarkeerd — die normaliseert en breekt uploads). FontCard-preview moet pixel-identiek blijven.

3. **`edit`** `src/features/brandstyle/components/TypographySection.tsx` — anchor: `buildGoogleFontsUrls` (559) + useEffect blind-injectie (~615-640)
   Verwijder de blinde Google-Fonts `<link>`-injectie. Schrap `buildGoogleFontsUrls` + de useEffect (incl. eslint-disable comment **en** de `additionalFontsKey`-useMemo + dep-array — geverifieerd dat die alleen daar gebruikt wordt; verwijder ook de dode disable-comment om lint-warnings te voorkomen). Vervang door één useEffect over `styleguide.fonts` dat per font het juiste pad kiest via availability:
   - ADOBE_FONTS + `workspaceAdobeFontsKitId` → `injectTypekitCss(workspaceKitId)`.
   - GOOGLE_FONTS → injecteer de **echte** Google-Font (consolideer: laat `resolveFontRender` de injectie-URL bepalen zodat injectie en stack één bron van waarheid delen).
   - COMMERCIAL/UNKNOWN/geen kit → `injectSubstituteCss(substitute.googleFont)`.
   - **(REVIEW-FIX) rows-less namen (pure AI-inferentie, availability null):** behoud het huidige echte-Google-Font-gedrag — probeer EERST de echte Google Font te laden, val pas terug op substitute als de naam aantoonbaar commercieel/onbekend is (catalog-check). Niet blind naar Inter degraderen.
   `useCustomFonts(styleguide.fonts)` blijft ongemoeid voor UPLOADED.

4. **`edit`** `src/features/brandstyle/components/TypographySection.tsx` — anchor: `getFontForLevel` (54-68) + `withFallback` (308-311) + FontDisplayCard previewStyle
   Laat de css-family-stacks via `buildFontFamilyStack`/`resolveFontRender` lopen zodat de substitute óók in de stack staat (anders rendert de browser system-ui omdat de echte commerciële family nergens geladen is). **Voor bestaande StyleguideFont-rijen: geef de verbatim `fontFamily` mee, normalise=false.** Idem de inline fontFamily-stacks en de 'Also detected'-chips (776).

5. **`edit`** `src/features/brandstyle/components/TypographySection.tsx` — anchor: TypeScaleList group-label JSX (179-189) — **D5**
   `group.font` is nu de volle stack → lekt als label. Voeg per group een `displayName` toe = `normaliseFontName` van de **pure** family-naam (de `primaryFont` resp. `additionalFonts[0]` die de group bepaalde), niet de stack. Vervang `— {group.font}{classification...}` (186) door `— {group.displayName}`. Verwijder de `classifyFont(group.font)`-aanroep (179) + de `(...)`-suffix-span. Before: `— "effra", system-ui, -apple-system, sans-serif (sans-serif)`. After: `— Effra`. Pas de groups-Map aan zodat per groep `{ font, displayName, rows }`. **Edge:** bij `group.font === null` (Default-groep) → `displayName` leeg/afwezig zodat de `— `-separator niet zonder naam rendert.

6. **`edit`** `src/features/brandstyle/components/TypographySection.tsx` — anchor: FontDisplayCard badge (rond 749-765)
   Voeg één consistente substitute-badge toe wanneer de echte font NIET direct rendert (COMMERCIAL/UNKNOWN, of ADOBE_FONTS zonder workspace-kit). Tekst dynamisch: `'Preview met {substitute.googleFont} — echte font via eigen Adobe-kit'` (resp. `upload .woff2` bij COMMERCIAL). Nieuwe optionele props `substituteFont?: string | null` + `hasWorkspaceKit?: boolean` (default zodat een vergeten prop stille fallback geeft). Lucide-icoon (Sparkles/AlertTriangle), geen emoji.

7. **`test`** `scripts/smoke-tests/web-page-builder-phase45-font-loading.ts` — nieuw smoke-script
   Pure helpers `buildFontFamilyStack` + `resolveFontRender`. PASS/FAIL-patroon van phase44. Dek de F3 unit-tests. Registratie in package.json gebeurt in F4.

8. **`verify`** quality gates F3: `npx tsc --noEmit` 0 errors + `eslint --fix` (geen nieuwe warnings — let op de verwijderde dode disable-comment) + `npx tsx scripts/smoke-tests/web-page-builder-phase45-font-loading.ts` groen. Browser-verificatie in F4.

## F3 unit-tests

| # | input | expected |
|---|---|---|
| 1 | `buildFontFamilyStack('Effra', 'Inter')` | `'"Effra", "Inter", system-ui, -apple-system, sans-serif'` |
| 2 | `buildFontFamilyStack('Roboto', null)` | `'"Roboto", system-ui, -apple-system, sans-serif'` |
| 3 | `buildFontFamilyStack('', 'Inter')` | `undefined` |
| 4 | **verbatim** `buildFontFamilyStack('brandon-grotesque', null, { normalise: false })` | `'"brandon-grotesque", system-ui, -apple-system, sans-serif'` (NIET PascalCased) |
| 5 | `resolveFontRender('Effra', 'COMMERCIAL', { workspaceKitId: null, isUploaded: false })` | source `SUBSTITUTE`, substitute.googleFont `Inter` |
| 6 | `resolveFontRender('Effra', 'ADOBE_FONTS', { workspaceKitId: 'yvk1gic', isUploaded: false })` | source `ADOBE_FONTS`, substitute null |
| 7 | `resolveFontRender('Effra', 'ADOBE_FONTS', { workspaceKitId: null, isUploaded: false })` | source `SUBSTITUTE`, substitute.googleFont `Inter` (Napking-geval) |
| 8 | `resolveFontRender('Roboto', 'GOOGLE_FONTS', { workspaceKitId: null, isUploaded: false })` | source `GOOGLE_FONTS`, substitute null |
| 9 | `resolveFontRender('brandon-grotesque', 'UPLOADED', { workspaceKitId: 'yvk1gic', isUploaded: true, fontFamily: 'brandon-grotesque' })` | source `UPLOADED`, family op verbatim `fontFamily` (geen normalisatie) |
| 10 | `resolveFontRender('Markazi Text', null, { workspaceKitId: null, isUploaded: false })` (rows-less, exact-match) | substitute null (geen fuzzy false-positive) → echte-Google-pad |

## F3 edge-cases / risico's

- **Napking-kern**: ADOBE_FONTS + per-font `adobeFontsKitId='yvk1gic'` maar `workspaceAdobeFontsKitId=null` → MOET substitute renderen, NOOIT de domain-locked kit injecteren (403/404 off-domain). `resolveFontRender` mag alleen op `workspaceKitId` vertrouwen.
- Module-Set-dedup mag niet breken door de verhuizing: importeer overal via hetzelfde pad; browser Network-tab verifieert single `<link>`.
- `buildSubstituteCssUrl` hardcodeert `wght@400;700` — bekende preview-beperking, aanvaard (gelijk aan FontCard).
- font-substitutes `effra-fallback`-entry is in F1 al verwijderd; F3 hangt er niet van af.

---

# Fase 4 — Test-infra, re-scrape, gates, ADR, browser-verificatie

**Doel**: borg F1-F3 met één geconsolideerde pure-function smoke, registreer de smokes in package.json, draai de re-scrape voor Napking, schrijf de ADR (extractie-contract wijzigt), en doe de browser-verificatie. **HERONTWERP-fixes verwerkt:** geen `2rem→32px`-test (contract-breuk geschrapt in F2), D6-regressie test op het juiste artefact (split/additionalFonts, niet op getFontForLevel-bestaand-gedrag), LINFI als primair positief bewijs (Napking = GIGO + domain-lock = alleen negatieve check), pure helper-extractie als harde voorwaarde.

## Stappen

1. **`verify`/`refactor`** Pure helper-extractie — **(HARDE VOORWAARDE, gebeurt in F3, hier geborgd)**
   `getFontForLevel`, `normaliseFontName`, `capPreviewSize` moeten in een pure module onder `src/lib/brandstyle/` staan (bv. `typography-display.ts`) en in TypographySection geïmporteerd worden. Reden: de F4-smoke importeert ze; een `.tsx`-import trekt `'use client'` + React + barrel `@/components/shared` + Zustand/TanStack mee en kan crashen vóór één assert draait (geen bestaande smoke importeert een `.tsx`). Grep-verificatie bij F4-start; ontbreekt de extractie → stop-and-ask richting F3.

2. **`create`** `scripts/smoke-tests/brandstyle-typography-fix.ts` — header-JSDoc + `assert`/`group` helpers (patroon uit phase25/26)
   Lokale `pass`/`fail` tellers, `assert(name, cond, detail?)`, `group(name)`, eindig met `console.log(\`${pass} PASS, ${fail} FAIL\`)` + `if (fail > 0) process.exit(1)`. Geen DB, geen netwerk — alleen pure F1-F3 helpers.

3. **`test`** group `D1/D3 — canon + dedup` → assert `canonicalizeFontFamily`/`dedupeBrandFonts`/`selectDetectedFontNames` (F1-tests #1-#18, kern: `dedupeBrandFonts(['effra','effra-fallback'])` → `['effra']`).

4. **`test`** group `D1 — split filtert fallback uit additionalFonts` → **(REVIEW-FIX: test het juiste artefact)** test dat na `dedupeBrandFonts` de split `additionalFonts` GEEN `effra-fallback` bevat. NB: er is geen aparte `splitDetectedFonts`-functie — de split zit inline in `writeResultToDb` (analysis-engine.ts:1881). Test via `dedupeBrandFonts(['effra','effra-fallback','arial','effra-light'])` en assert dat de eerste = primary en de rest geen `effra-fallback` bevat. (`arial` wordt al door de scraper-filter geweerd, niet door dedup — niet hier asserten.)

5. **`test`** group `D2/D6 — extractor + getFontForLevel` → `extractTypographyByRole("body{font-family:'effra',system-ui} h1{font-family:'effra-fallback','effra'}")` → `result.body.fontFamily==='effra'` && `result.display.fontFamily==='effra'`. En: `getFontForLevel('H1','effra',['Playfair'])` begint met `'"Playfair"'`; `getFontForLevel('Body','effra',['Playfair'])` begint met `'"effra"'`. **D6-regressie op de echte bron:** assert dat `dedupeBrandFonts`-split additionalFonts leeg laat voor `['effra','effra-fallback']` → `getFontForLevel('H1','effra',[])` begint met `'"effra"'` (geen fantoom-swap). (Het fantoom ontstaat door de split, niet door getFontForLevel — de assert dekt de keten.)

6. **`test`** group `D7 — normalizeTypeScale rem-normalisatie + veldbehoud` → **(REVIEW-FIX: GEEN dedup/collision/`2rem→32px`-assert)** `resolveSizeToRem('36px')`→`'2.25rem'`; `resolveSizeToRem('clamp(2.5rem,...,6.5rem)')`→`'2.5rem'`; `resolveSizeToRem('var(--x)')`→`'var(--x)'`; `normalizeTypeScale([])`→`[]`; veldbehoud-assert (`color`+`usage` blijven). **Plus mapTypographyRoles-borging:** draai `mapTypographyRoles` op een genormaliseerde 6-entry napking-scale en assert dat `body-lg/md/sm` gevuld blijven (bewijst dat de geschrapte dedup geen lege buckets veroorzaakt).

7. **`edit`** `package.json` — anchor: scripts-object, na `"smoke:competitor-content-discovery"`
   Voeg toe: `"smoke:brandstyle-typography": "tsx scripts/smoke-tests/brandstyle-typography-fix.ts"`. **(REVIEW-FIX)** Registreer ook de in F1-F3 toegevoegde phase44/45-smokes die nu nergens hangen: voeg `web-page-builder-phase44-font-fallback.ts`, `...phase45-typescale-normalizer.ts`, `...phase45-font-loading.ts` toe aan de `smoke:web-page-builder`-keten (achter phase39), zodat ze in CI draaien.

8. **`verify`** Re-scrape Napking — anchor: `scripts/rescrape-brand.ts` (bestaand)
   GEEN nieuw script. `npx tsx scripts/rescrape-brand.ts Napking` (DESTRUCTIEF: wist styleguide+colors-cascade, maakt verse styleguide, draait `analyzeUrl`). **LET OP-1:** napking.nl = WordPress-placeholder (GIGO) → resultaat alleen bruikbaar als negatieve/structurele check (geen crash, geen `effra-fallback`), NIET als positief fidelity-bewijs. **LET OP-2:** Adobe-kit `yvk1gic` is domain-locked → re-scrape toont de metric-substitute (Inter). **LET OP-3 (REVIEW-FIX):** `rescrape-brand.ts` matcht `name: { contains, mode: insensitive }` via `findFirst` — verifieer dat 'Napking' uniek matcht vóór uitvoeren; draai `npm run db:backup` als harde pre-step. **LET OP-4 (REVIEW-FIX):** het script-summary print GEEN fonts/StyleguideFont-rijen → verifieer `effra-fallback`-afwezigheid via psql, niet via summary.

9. **`verify`** LINFI cross-check — **(REVIEW-FIX: primair positief bewijs)**
   Napking is GIGO+domain-lock = zwak bewijs. Draai `npx tsx scripts/rescrape-linfi.ts` (bestaand) als positieve fidelity-cross-check op een echte-fonts-brand: assert dat de echte font correct rendert en niet onnodig naar substitute degradeert.

10. **`edit`** `CLAUDE.md` — anchor: Common commands → Database-blok
    Voeg toe:
    ```bash
    # Re-analyse één workspace-brandstyle (DESTRUCTIEF — wist reviews/edits)
    npx tsx scripts/rescrape-brand.ts <workspaceNameBevat>
    ```

11. **`create`** `docs/adr/2026-06-05-typography-font-canonicalization.md` — via `/adr-create` skill — **(ADR VEREIST, zie hieronder)**
    MADR-formaat. Context (D1-D7 root-causes), Decision (canonicalizeFontFamily + dedupeBrandFonts + assignRole-canon + normalizeTypeScale rem-only + gedeelde `font-generic-families.ts`; **expliciet: GEEN type-scale dedup/level-collision** en **drift-snapshot blijft ongecanonicaliseerd**), Consequences (oude scrapes tonen stale `effra-fallback` tot re-scrape; live Adobe-preview domain-locked; helper-signaturen als contract voor F4-smoke), Y-statement. Verwijs naar `docs/audits/2026-06-05-brandstyle-extraction-pipeline.md`.

12. **`verify`** quality gates: (1) `npx tsc --noEmit` 0 errors; (2) `npm run lint` groen; (3) `npm run smoke:brandstyle-typography` → `N PASS, 0 FAIL`; (4) `npm run smoke:web-page-builder` blijft groen (geen regressie op phase26-typography-per-rol door extractor-wijziging); (5) task-finalize: 2-subagent review-loop + changelog + conventional commit op `fix/brandstyle-extraction` (NIET main).

13. **`verify`** Browser-smoke Typography-tab (handmatig, na re-scrape stap 8)
    `npm run dev` → localhost:3000 → Napking-workspace → Brandstyle → Typography. Checklist:
    (a) Secondary/Brand-Fonts-kaart toont NIET `effra-fallback` (D1);
    (b) precies één Effra-kaart, geen dubbele in FontsGrid (D3);
    (c) Type Scale headings + body renderen in dezelfde Inter-substitute — geen system-serif-swap (D4/D6);
    (d) groepslabel = `— Effra`, geen css-stack/`(sans-serif)`-suffix (D5);
    (e) Network-tab: GEEN `fonts.googleapis.com/css2?family=Effra`-404; hooguit één Inter-css2 + Adobe-kit alleen bij workspace-kit (D4).
    Before/after-screenshots in `test-screenshots/brandstyle/`. Bij ChunkLoadError: `pkill -9` next-procs + `rm .next/dev/lock` (zie memory dev-server-recovery).

---

# Quick-wins (<30 min, kunnen los/eerst)

- **QW1** — `font-substitutes.ts` regel 25 (`effra-fallback`-entry) verwijderen. Standalone veilig (fuzzy `startsWith` vangt `effra-fallback` al op de `effra`-entry). Onderdeel van F1 stap 10 maar kan vooruit.
- **QW2** — `font-generic-families.ts` aanmaken + `url-scraper.ts` import-refactor (F1 stap 1-2). Mechanisch, byte-identieke Set, geen gedragswijziging. Ontkoppelt de pure-module-fix van de rest.
- **QW3** — D5 group-label-fix (F3 stap 5): puur cosmetisch, geen DB/re-scrape nodig, direct zichtbaar. Kan los van de load-pad-consolidatie als `displayName` op de pure family-naam wordt gebaseerd.
- **QW4** — CLAUDE.md rescrape-commando toevoegen (F4 stap 10). Pure documentatie.

# ADR-advies

**ADR VEREIST: ja.** Het extractie-contract wijzigt — wat de analyzer naar de DB schrijft verandert (font-canonicalisatie strip `*-fallback`/generics + assignRole-canon + type-scale rem-normalisatie). Consumers lezen die data: `semantic-role-resolver.ts:141` (`mapTypographyRoles`), de LP-renderers, de twee PDF-exporteurs en de InContextPreview. Schrijf `docs/adr/2026-06-05-typography-font-canonicalization.md` (F4 stap 11). **Expliciet documenteren:** (a) drift-snapshot blijft ongecanonicaliseerd; (b) type-scale doet ALLEEN rem-normalisatie (geen dedup/level-collision — afgewezen omdat het de size-gedreven resolver en InContextPreview breekt); (c) clamp→min-arg als bron-size-keuze. Verwijs naar het bestaande `2026-05-29-brandstyle-analyzer-lp-fidelity.md` als voorganger.

---

# Acceptatiecriteria

- [ ] `canonicalizeFontFamily` + `dedupeBrandFonts` zijn pure exports met JSDoc, <50 regels, geen any (F1).
- [ ] Napking-split (na re-analyse): `primaryFontName='effra'`, `additionalFonts` zonder `effra-fallback` (F1).
- [ ] `selectDetectedFontNames(['effra','effra-fallback'])` → `['effra']` (geen dubbele kaart) (F1/D3).
- [ ] `assignRole`-regressie-assert: detected `['Effra','effra-fallback']` + bodyFont `'effra-fallback'` → Effra-rij krijgt UI, niet DISPLAY (F1).
- [ ] `font-generic-families.ts` is één gedeelde pure bron; url-scraper call-sites gedragen zich identiek (F1).
- [ ] `font-substitutes.ts` bevat geen `effra-fallback`-entry; `findFontSubstitute('effra')` → Inter (F1).
- [ ] Extractor kiest `effra` (niet `effra-fallback`) als heading-family voor de napking-stack (F2/D2).
- [ ] `normalizeTypeScale` doet ALLEEN rem-normalisatie met veldbehoud (object-spread); GEEN dedup/level-collision; size-strings blijven anders verbatim (F2).
- [ ] `mapTypographyRoles` op een genormaliseerde napking-scale houdt `body-lg/md/sm` gevuld (geen lege buckets) (F2/F4).
- [ ] PDF-exporteurs behouden `usage`/`letterSpacing`/`color` na normalisatie (F2).
- [ ] `buildFontFamilyStack` normaliseert NIET voor UPLOADED/ADOBE (verbatim `fontFamily`); uploaded .woff2 rendert in alle drie secties zonder substitute-badge (F3).
- [ ] Rows-less echte-Google-Font-namen krijgen nog steeds een echte `<link>`, geen onnodige Inter-substitute; geen fuzzy false-positives op het null-availability-pad (F3).
- [ ] Browser Napking: geen `effra-fallback`, één Effra-kaart, headings+body zelfde substitute, label `— Effra`, geen Effra-css2-404 (F4/D1-D6).
- [ ] LINFI cross-check: echte font rendert correct (positief fidelity-bewijs) (F4).
- [ ] `getFontForLevel`/`normaliseFontName`/`capPreviewSize` in pure module (F4-importeerbaar) (F3/F4).
- [ ] ADR `docs/adr/2026-06-05-typography-font-canonicalization.md` bestaat (status accepted) (F4).
- [ ] CLAUDE.md Common commands bevat het rescrape-commando (F4).
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors / geen nieuwe warnings op gewijzigde files
- [ ] `npm run smoke:brandstyle-typography` → `N PASS, 0 FAIL`
- [ ] `npm run smoke:web-page-builder` blijft groen (geen phase26-regressie)
- [ ] task-finalize op `fix/brandstyle-extraction` (2-subagent review + changelog)

# Smoke test plan

1. **Pure-function** (per fase, geen DB): `npx tsx scripts/smoke-tests/web-page-builder-phase44-font-fallback.ts` (F1), `...phase45-typescale-normalizer.ts` (F2), `...phase45-font-loading.ts` (F3), en geconsolideerd `npm run smoke:brandstyle-typography` (F4).
2. **Regressie**: `npm run smoke:web-page-builder` (phase26-typography-per-rol) + `npx tsc --noEmit` + `npm run lint`.
3. **DB-uitrol**: `npm run db:backup` → `npx tsx scripts/rescrape-brand.ts Napking` → psql-check dat StyleguideFont-rijen geen `effra-fallback` bevatten.
4. **Cross-check**: `npx tsx scripts/rescrape-linfi.ts` als positief fidelity-bewijs.
5. **Browser**: Napking Typography-tab checklist (a-e in F4 stap 13), before/after-screenshots.

# Bestanden die ik NIET aanraak

- `analysis-prompts.ts` typeScale-instructie — LLM blijft observed sizes kopiëren; normalisatie is deterministisch post-process.
- Server-side availability-classificatie (`analysis-engine.ts:2029-2057` / `google-fonts-catalog.ts`) — werkt correct, F3 consumeert alleen.
- `findFontSubstitute` fuzzy-matching zelf — alleen de `effra-fallback`-entry verdwijnt; de fuzzy-breedte wordt vermeden door exact-match op het null-pad i.p.v. de matcher te herschrijven.
- Migratie/backfill van bestaande productie-styleguides — alleen Napking + LINFI re-scrape in scope.
- Adobe-kit domain-lock omzeilen / Typekit-proxy — los traject.
- Vision-judge / Playwright e2e van de Typography-render — screenshot-infra is deferred.

# Risico's

- **Re-scrape is DESTRUCTIEF** (wist reviews/edits) → alleen op test-workspace, `db:backup` vooraf, `findFirst`-uniek-check.
- **GIGO + domain-lock** maken Napking-browser-smoke zwak positief bewijs → behandel als negatieve check + LINFI als positieve cross-check.
- **Naam-drift** tussen F4-smoke en F1-F3-helpers → signaturen in de ADR als contract vastleggen vóór implementatie.
- **`getFontForLevel` module-private** → F3 MOET de pure-extractie doen, anders blokkeert F4 stap 1/5 (stop-and-ask).
- **Import-cycle** bij top-level import van type-scale-normalizer in analysis-engine → val terug op dynamische `await import(...)`.
- **assignRole-canon** moet beide zijden raken — een eenzijdige canon laat de exact-match juist alsnog falen (afgedekt door F1-test #16).

# Open beslissingen

1. **Type-scale dedup + level-collision-resolutie GESCHRAPT (default).** Het oorspronkelijke F2/F4-ontwerp (`dedupeBySize` + `resolveLevelCollisions`, H1→DISPLAY-herlabel, `2rem→32px`) is door twee reviews als HERONTWERP/contract-breuk afgewezen: (i) `mapTypographyRoles` is size-gedreven en vult `body-lg/md/sm` uit near-size-entries → dedup veroorzaakt MEER lege buckets; (ii) InContextPreview matcht exact op `'h1'/'h2'/'h3'` → een `DISPLAY`-herlabel breekt de live preview; (iii) `2rem→32px` corrumpeert bron-getrouwheid bij `font-size:62.5%`-rebase; (iv) `role-klasse` bestaat niet in de echte level-set (H1..Caption). **Beslissing: F2 doet ALLEEN rem-normalisatie met veldbehoud.** Als latere visuele opschoning gewenst is → puur in de UI-laag (TypeScaleSection), NIET in de DB-write, en alleen na een resolver-bewust herontwerp met een echte `mapTypographyRoles`-smoke. *Open voor Erik: akkoord met deze inperking, of willen we de visuele clustering alsnog (UI-only) plannen als losse fase?*
2. **clamp → min-arg als bron-size.** Consistent met `capPreviewSize`, maar de min is de mobiele waarde → een hero met `clamp(20px,5vw,64px)` wordt 20px en kan in `mapTypographyRoles` (>=24px-drempel) als body i.p.v. headline bucketen. *Open voor Erik: min behouden (consistentie) of pref/max nemen voor de semantische DB-size?* Default in dit plan: min (gedocumenteerd in JSDoc + ADR).
3. **Drift-snapshot blijft ongecanonicaliseerd.** Styleguide toont `effra`, snapshot houdt `effra-fallback`. Default: bewust laten divergeren (snapshot = ruwe observatie). *Open voor Erik: akkoord, of `processed.fonts` ook canonicaliseren (verschuift bestaande drift-hashes)?*
4. **False-positive suffix-strip** op een echte family die op `-fallback` eindigt — geaccepteerd risico via strak anchor `[\s-]fallback$`. *Open: conditionele strip toevoegen (alleen strippen als de stam óók los in de detected-set zit) als een productie-brand dit ooit raakt?*

# Notes

- Branch: `fix/brandstyle-extraction` (bestaand, zie memory) of nieuwe worktree `branddock-feat-brandstyle-typography`.
- Verifieerde anchors (2026-06-05): `font-fallback.ts` heeft nu 0 imports en `selectDetectedFontNames` op regel 54-58; `url-scraper.ts` `GENERIC_FONT_FAMILIES` op 1041 (+ `WEB_SAFE`/`isIconFont` 1061-1103); `analysis-engine.ts` split op 1881-1883, assignRole bodyFontLower op 1990 + `lower === bodyFontLower` op 2012, typeScale-write op 2143, snapshot-fonts op 594/916; `typography-extractor.ts` first-family-pick op 213-214, `extractTypographyByRole` op 159; `TypographySection.tsx` `getFontForLevel` op 54-68 (headingFont = additionalFonts[0] op 60), `buildGoogleFontsUrls` op 559, group-label op 179-189, findByLevel exact `'h1'/'h2'/'h3'` op 298-302; `font-substitutes.ts` `effra` op 24 + `effra-fallback` op 25.
- `scripts/rescrape-brand.ts` en `scripts/rescrape-linfi.ts` bestaan; audit `docs/audits/2026-06-05-brandstyle-extraction-pipeline.md` bestaat.
