---
id: brand-library-consumer-migration
title: Consumer-migratie naar getBrandLibrary + lint-regel tegen directe BrandStyleguide-reads
fase: post-launch
priority: now
effort: 3 dagen
owner: claude-code
status: done
created: 2026-08-14
completed: 2026-08-14
related-adr: docs/adr/2026-08-14-brand-library-consumption.md
related-spec: docs/specs/brandstyle-designbibliotheek-verbeterplan.md (W7.1)
worktree: branddock-brand-library-consumer-migration
---

# Probleem

W7.1 vraagt één verplicht consumptiepad voor merkcontext, zodat de gates (`published` + de zes
`*SavedForAi`-vlaggen), de marker-stripping (`OBSERVED:`/`RECOMMENDED:`) en de provenance-filtering
op één plek zitten. Vandaag leest elke consumer zelf `BrandStyleguide`-velden.

De aanleiding uit `gotchas.md` (2026-06-10 — `canvas-context` las `photographyStyle` langs de
imagery-gate om) is inmiddels gefixt; dit is dus structurele preventie, geen openstaande bug. Maar
de inventarisatie laat zien dat de discipline de uitzondering is:

| | |
|---|---|
| `prisma.brandStyleguide`-toegangen | 127 sites in 68 bestanden |
| brandstyle-CRUD + writers + `scripts/**` | ~39 bestanden — mogen direct blijven |
| leespaden mét gates | **5** van de ~24 |
| consumers van `getBrandLibrary` | **0** |

Drie concrete gaten die deze taak sluit:

1. `ai/brand-context.ts:1325` leest `fonts` zonder `typographySavedForAi` — in het hoofd-AI-contextpad.
2. `brand-fidelity/visual-fidelity-scorer.ts:357` zet `JSON.stringify(photographyStyle).slice(0,600)`
   rauw in een vision-judge-prompt: ongegate én met markers (leak-klasse 2026-06-24).
3. `ai/knowledge-context-fetcher.ts:184` en `claw/tools/read-tools.ts:663` leveren ongereviewde
   scrape-data aan prompts respectievelijk de Brand Assistant.

# Voorstel

Drie fasen. **Fase 1**: de accessor groeit van manifest-doorgeefluik naar consumptie-façade met
gesectioneerde, gegate en marker-vrije data + een `gates`-rapportage, met de pure projectielogica
apart zodat de smoke DB-vrij draait. **Fase 2**: de twaalf AI-consumptiepaden migreren (8 lib-modules
+ 4 routes), per groep in een eigen commit met baseline-diff ertussen. **Fase 3**: de lint-regel
(`no-restricted-properties`, severity error) met een `ignores:`-lijst die per migratie krimpt.

Ontwerpbeslissingen D1-D5 staan in de ADR.

# Acceptatiecriteria

- [x] `getBrandLibrary` levert per sectie `undefined` zodra de bijbehorende gate dicht staat, en
      `gates` benoemt welke dicht stonden
- [x] Render-tokens komen óók terug bij `published: false` — canvas-context blijft werken op een
      niet-gefinaliseerde styleguide
- [x] Geen enkele prozawaarde uit de accessor bevat nog `OBSERVED:`/`RECOMMENDED:`
- [x] `brand-context` honoreert `typographySavedForAi` op `fonts` (gat #1) — raakt Linfi + Nobox
- [x] `visual-fidelity-scorer` krijgt gegate én gestripte imagery (gat #2)
- [x] `api/brandstyle/ai-context` past de publish-gate toe
- [x] Baseline-diff toont alleen de benoemde verschillen (zie Notes)
- [x] Lint-regel vlagt aantoonbaar een nieuwe overtreding en staat op `error`
- [x] De bestaande NL/i18n-lintguards blijven actief (`--print-config`: beide rule-keys actief)
- [x] `npx tsc --noEmit` 0 errors · `npm run lint` 0 nieuwe errors (1 pre-existing op main)
- [x] `smoke:brand-library` 36/36 · `smoke:styleguide-rules` 51/51 ·
      `smoke:styleguide-rules-fval` 17/17 · `eval:brand-manifest-golden` 14/14 ·
      `eval:brandstyle-golden` PASS · `smoke:geo-fidelity` 20/20

# Bestanden die ik aanraak

**Nieuw**: `src/lib/brand-library/types.ts` · `src/lib/brand-library/project.ts` ·
`scripts/smoke-tests/brand-library-accessor.ts` · `scripts/dev/brand-context-baseline.ts` ·
`docs/adr/2026-08-14-brand-library-consumption.md`

**Gewijzigd**: `src/lib/brand-library/index.ts` · `src/lib/ai/brand-context.ts` ·
`src/lib/ai/canvas-context.ts` · `src/lib/ai/knowledge-context-fetcher.ts` ·
`src/lib/claw/tools/read-tools.ts` · `src/lib/brand-fidelity/visual-fidelity-scorer.ts` ·
`src/lib/consistent-models/workspace-context-resolver.ts` ·
`src/lib/consistent-models/model-context-resolver.ts` · `src/lib/alignment/data-fetcher.ts` ·
`src/app/api/brandstyle/ai-context/route.ts` ·
`src/app/api/landing-pages/[deliverableId]/visual-brand-fit-check/route.ts` ·
`src/app/api/landing-pages/[deliverableId]/lp-fidelity-check/route.ts` ·
`src/app/api/landing-pages/auto-iterate/route.ts` · `eslint.config.mjs` · `package.json` ·
`docs/changelog.md` · `docs/design-system-export.md`

# Bestanden die ik NIET aanraak

- `src/lib/export/**` + `buildDesignSystemModel` — ongegate export-assembler blijft zoals hij is;
  gating daar verandert de net opgeleverde Brand Kit Bundle
- `api/workspace/export`, `api/export/brand-kit/data`, `api/export/proxy-image`
- `scripts/**`, de brandstyle-CRUD-routes, de editor-UI, `prisma/schema.prisma`
- `get-brand-logo`, `alignment/audit-scoring`, `bug-analysis` — geen promptcontent

# Smoke test plan

1. **Baseline-diff** — `scripts/dev/brand-context-baseline.ts` vóór de migratie draaien (JSON per
   workspace), na afloop opnieuw, diffen. Alleen de benoemde gedragswijzigingen mogen verschijnen.
2. **Pure smoke** — `npm run smoke:brand-library`: gate-matrix (zes vlaggen × open/dicht),
   `published: false`, marker-stripping, view-projectie, `gates`-rapportage. Geen DB.
3. **Lint-discriminatie** — één bestand uit `ignores` halen ⇒ `npm run lint` faalt; terugzetten.
4. **Browser-smoke** — één Canvas-generatie + één LP-render: tokens identiek aan vóór de migratie.

# Risico's

- **Stille contextverandering**: `brand-context` is 1557 regels en voedt alle AI-calls. Mitigatie =
  baseline-diff vóór/na + per groep een eigen commit.
- **Performance**: één brede query i.p.v. smalle selects. Mitigatie = 5-min cache; netto minder
  queries omdat brand-context en canvas-context nu al bijna de hele row ophalen.
- **Flat-config last-wins**: een derde `no-restricted-syntax`-blok zou de NL/i18n-guards
  uitschakelen op overlappende files — daarom `no-restricted-properties`.
- **Lokaal is geen styleguide `published`**, dus gegate secties tonen zich lokaal als leeg; de
  baseline-diff draait daarom ook tegen een scratch-workspace mét publish.

# Out of scope

- Export-paden gaten dichten (design-system/resolver, brand-kit-bundle, workspace/export)
- Taak 3 (reviewstatus-reset) en taak 4 (feedback-loop)

# Notes

## Wat er meetbaar veranderde (baseline-diff, 19 workspaces)

Het "vóór"-beeld komt uit de ongemigreerde taak-1-worktree; het harnas legt
`getBrandContext`, `assembleCanvasContext`, `resolveWorkspaceBrandContext` en de
alignment-BRANDSTYLE-module vast, plus een gepubliceerde scratch-kloon omdat lokaal géén
styleguide `published` is.

1. **`consistent-models` verliest merkcontext bij een niet-gefinaliseerde styleguide.** Kleuren,
   fonts en logo-proza gingen daar ongegate naar image-generatie-prompts; nu gelden dezelfde
   publish- + sectie-gates als in `brand-context`. Lokaal raakt dat 16 van 18 workspaces (niets is
   hier published); op prod alleen workspaces die de brandstyle-review nooit hebben afgerond.
   **Dit is de grootste gedragsconsequentie van deze taak.**
2. **`brand-context.brandFonts` volgt nu `typographySavedForAi`** — Linfi en Nobox zijn published
   mét een gesloten typografie-sectie en stuurden hun fonts dus tóch de prompt in.
3. **Alignment ziet geen analyzer-markers meer.** Per veld gecontroleerd: het verschil is
   uitsluitend weggevallen `OBSERVED:`/`RECOMMENDED:`-prefixen, geen dataverlies. `mode: 'raw'`
   houdt de gates daar bewust open — een audit moet juist zien wat nog niet gereviewd is.
4. **`brandColors` staat nu PRIMARY-eerst** (Gemeente Barneveld) door de deterministische
   `sortOrder`-ordening; voorheen bepaalde de fysieke rij-volgorde de groepering.
5. Canvas-context is byte-identiek voor alle 7 workspaces met een deliverable.

## Bewust overgenomen in plaats van aangescherpt

- De `designLanguage`-gate opent óók op `visualLanguageSavedForAi` — die twee secties delen in de
  UI één "Visual System"-tab en `brand-context` deed dit al zo.
- Componenten blijven ongegate in `render` (de renderer heeft ze nodig), maar de prompt-string
  erover volgt de `designLanguage`-gate.

## Gevonden tijdens de uitvoering

1. **Flat-config `ignores` leest `[token]` als character-class.** De allowlist-entry
   `src/app/api/brandmd/claim/[token]/route.ts` matchte daardoor stil niet en de lint-regel gaf
   een valse error. Cure: `src/app/api/brandmd/claim/**`. Let hierop bij élk pad met Next-brackets.
2. **`as const` op een Prisma-select botst met `Exact<>`** (readonly `orderBy`-tuple). `satisfies
   Prisma.BrandStyleguideSelect` houdt de literals én type-checkt.
3. **De scratch-kloon is niet byte-stabiel tussen runs** wanneer meerdere kleuren dezelfde
   `sortOrder` hebben. Lees een diff op `__scratch_published` dus met die korrel zout; de echte
   workspaces zijn wél stabiel.
4. **`no-restricted-properties` matcht op de objectnaam**, dus `ctx.brandStyleguideMeta` wordt
   niet geraakt door de `tx`-entry — maar een `grep` op `tx\.brandStyleguide` wél. Bij het
   inventariseren gaf dat een vals positief.

## Resterende schuld (staat in de lint-allowlist)

Negen lezers zijn nog niet gemigreerd: de vier export-paden (`design-system/resolver`,
`brand-kit-bundle`, `workspace/export`, `brand-kit/data`), `proxy-image`, `get-brand-logo`,
`alignment/audit-scoring` en `bug-analysis` (geen promptcontent), plus
`brand-fidelity/styleguide-rule-compiler` en `brandstyle/rule-structurer`, die hun eigen gates al
toepassen op hun eigen domein. De export-paden zijn de enige met een echte beslissing eraan vast:
gating daar verandert de Brand Kit Bundle.
