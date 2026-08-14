---
id: brand-library-consumer-migration
title: Consumer-migratie naar getBrandLibrary + lint-regel tegen directe BrandStyleguide-reads
fase: post-launch
priority: now
effort: 3 dagen
owner: claude-code
status: in-progress
created: 2026-08-14
completed: -
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

- [ ] `getBrandLibrary` levert per sectie `undefined` zodra de bijbehorende gate dicht staat, en
      `gates` benoemt welke dicht stonden
- [ ] Render-tokens komen óók terug bij `published: false` — canvas-context blijft werken op een
      niet-gefinaliseerde styleguide
- [ ] Geen enkele prozawaarde uit de accessor bevat nog `OBSERVED:`/`RECOMMENDED:`
- [ ] `brand-context` honoreert `typographySavedForAi` op `fonts` (gat #1) — bewuste gedragswijziging
- [ ] `visual-fidelity-scorer` krijgt gegate én gestripte imagery (gat #2)
- [ ] `api/brandstyle/ai-context` past de publish-gate toe
- [ ] Baseline-diff toont alleen de benoemde verschillen
- [ ] Lint-regel vlagt aantoonbaar een nieuwe overtreding en staat op `error`
- [ ] De bestaande NL/i18n-lintguards blijven actief (`npx eslint --print-config`)
- [ ] `npx tsc --noEmit` 0 errors · `npm run lint` 0 errors
- [ ] `eval:brand-manifest-golden`, `smoke:styleguide-rules`, `smoke:geo-fidelity`,
      `eval:brandstyle-golden` groen

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

Werk-log en gevonden gotchas komen hier tijdens de uitvoering.
