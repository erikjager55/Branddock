---
id: lp-section-pattern-library
title: Sectie-patroonbibliotheek (C1) — layout-varianten per sectie-type + 3 anatomie-componenten
fase: pre-launch
priority: next
effort: 2-3 dagen (uitgevoerd in 1 sessie samen met lp-pattern-swap-ui)
owner: claude-code
status: done
created: 2026-08-12
completed: 2026-08-12
related-adr: -
related-spec: docs/specs/2026-08-07-webpage-builder-verbeterplan.md (§1.3 diagnose + §5 Fase C, C1); docs/specs/web-page-types/landing-page.md (§2 + §4a)
worktree: - (branch claude/puck-editor-improvement-y9ep4x, parallel-engineering sessie)
---

# Probleem

De design-library stuurt styling maar geen structuurvariatie (diagnose §1.3):
elke gegenereerde pagina heeft dezelfde botten. Het hero-pattern-mechanisme
(`HeroPatternKey` + `pickHeroLayout` in brand-render-rules.ts) bewees dat
per-sectie layout-keuzes werken, maar bestond alleen voor de hero. Daarnaast
ontbraken drie anatomie-componenten uit de LP-spec (§4a): TrustStrip,
PainBullets en ImpactStats — tot nu toe FeatureGrid/RichText-workarounds.

# Voorstel

Generaliseer het hero-pattern-idee naar een **sectie-patroonregistry**
(`src/lib/landing-pages/section-patterns.ts`): per sectie-type 2-4 benoemde
layout-patterns, gekozen via de instance-prop `patternKey`. `'default'` =
het bestaande render-gedrag; instanties zonder `patternKey` (alle bestaande
puckData) renderen **byte-gelijk** — dat is het harde acceptatiecriterium.
Archetype-fit is gegrond in de geest van `RENDER_CONSTRAINTS_BY_ARCHETYPE`;
content-eisen (`minItems`) grijzen patterns uit in de kiezer (C2). Plus de
3 anatomie-componenten via het README-5-stappenplan, additief (géén
starter-template-opname — generatie-opname is C3).

# Pattern-catalogus + archetype-rationale (1 regel per pattern)

| Type | Key | Label (NL, registry) | Rationale |
|---|---|---|---|
| FeatureGrid | `default` | Raster | Bestaand gedrag, universeel. |
| FeatureGrid | `alternating` (min 2) | Om-en-om (beeld/tekst) | Editorial A-B-A-B (FeatureSplit-stijl): whitespace + typografie, veilig voor elk archetype; 1 rij is geen ritme. |
| FeatureGrid | `bento` (min 3) | Bento-raster | Asymmetrisch shadow-card-raster — alleen shadow-tolerante archetypen (`allowShadow: 'medium'`: MAGICIAN/LOVER/EXPLORER/HERO/OUTLAW/JESTER + CREATOR via pickCardStyle playful strong-shadow). |
| Testimonial | `default` | Enkel citaat | Bestaand gecentreerd citaat, universeel. |
| Testimonial | `wall` | Citaten-wand | Card-presentatie volgt de brand-tokens → elk archetype; props dragen 1 quote → rendert 1 wall-card (multi-quote wand vraagt quotes-array, C3). |
| Testimonial | `spotlight` | Spotlight-citaat | Oversized editorial pull-quote — klassiek premium-editorial middel, alleen typografie-schaal → elk archetype. |
| BrandCTA | `default` | Banner | Bestaande contained panel, universeel. |
| BrandCTA | `split` | Gesplitst (tekst \| knop) | Layout-only herschikking (tekst links, knop rechts), geen extra decoratie → elk archetype. |
| BrandCTA | `card` | Kaart (omkaderd) | Border-only surface-kaart i.p.v. brand-tint-panel — past ook flat-esthetiek (RULER). |
| FAQ | `default` | Accordeon | Bestaand gedrag, universeel. |
| FAQ | `two-column` (min 4) | Twee kolommen | Zelfde accordeon-items in 2-koloms grid, layout-only → elk archetype; <4 items laat een kolom halfleeg. |
| StatsBlock | `default` | Rij | Bestaande rij met scheidingslijnen, universeel. |
| StatsBlock | `cards` (min 2) | Kaarten | Elk cijfer in eigen omkaderde kaart — uitgesloten voor RULER (`allowShadow: 'none'` + `forceFlatCards`: vlakke typografie, geen kaartjes). |

Null-archetype (niet geclassificeerd merk) krijgt alleen ongerestricteerde
patterns — restricties vragen positieve evidence (conservatief, spiegel van
`DEFAULT_RENDER_CONSTRAINTS`).

# Besluiten

- **`patternKey` als instance-prop + select-veld in de fields-metadata**:
  daarmee verschijnt de kiezer gratis in het E2-props-paneel én blijft de
  data een platte JSON-prop (geen schema-migratie; onbekende keys renderen
  als default — forward-compat, zelfde filosofie als validatePageDataShape).
- **Byte-compat geverifieerd tegen de OUDE code**: pre-change snapshot van
  20 sectie-renders (4 token-varianten × 5 types) + 5 template-trees,
  post-change diff = identiek (trees na normalisatie van de random
  instance-id's). Plus phase54-asserts: zonder patternKey === 'default' ===
  onbekende key.
- **`allowedPatternsFor` filtert hard (archetype + minItems)** voor
  programmatisch gebruik (C3-generatie); **`listPatternOptions`** is de
  kiezer-variant: archetype hard, minItems zacht (zichtbaar-maar-disabled
  mét reden) — zo weet de user dat méér items het pattern ontgrendelen.
- **BrandCTA-knop geëxtraheerd** naar gedeelde `renderCtaButton`-closure
  (was inline IIFE) zodat banner/split/card één knop-bron delen; JSX
  verbatim verplaatst, output byte-identiek (snapshot-bewijs).
- **`patternKey` uitgesloten** van judge-/gate-flatten (puck-data-flatten
  EXCLUDED_KEYS), sectie-lijst-preview (PREVIEW_SKIP_KEYS) en bewust NIET in
  COPY_KEYS (config, geen copy). `metric` + `bridge` wél in COPY_KEYS
  (inline-edit op de nieuwe componenten).
- **Anatomie-factories zonder FilledFields-arg**: FilledFields draagt nog
  geen trust-/pain-/impact-velden (C3 voegt de generatie-mapping toe);
  placeholder-copy bevat bewust het woord "placeholder" (publish-gate
  anti-fabricatie-scan blokkeert publiceren tot de copy echt is).
- **TEXT_FIELDS_BY_TYPE**: alleen top-level string-copy per route-contract
  (TrustStrip `metric`; PainBullets `heading`+`bridge`; ImpactStats
  `heading`) — array-items vallen buiten dat contract.

# Acceptatiecriteria

- [x] `section-patterns.ts` met contract uit de opdracht (SectionPatternKey,
      SectionPatternDefinition, SECTION_PATTERNS, allowedPatternsFor,
      SECTION_PATTERN_PROP) + kiezer-helpers
- [x] 5 sectie-types renderen 2-4 patterns; default = byte-gelijk aan
      pre-change render (snapshot-diff + phase54)
- [x] TrustStrip/PainBullets/ImpactStats volgens README-5-stappenplan
      (props-type, component, registratie, SECTION_TYPE_IDS,
      TEXT_FIELDS_BY_TYPE, default-factories) — NIET in starter-templates
- [x] Smoke `web-page-builder-phase54-section-patterns.ts` groen (98 asserts)
- [x] `npx tsc --noEmit` 0 errors
- [x] `npx eslint` op alle geraakte bestanden: 0 errors, 0 warnings
- [x] phase2 (expected → 22 componenten), phase46 (registry-sync), phase47,
      phase48, phase53 groen

# Bestanden die ik aanraak

- `src/lib/landing-pages/section-patterns.ts` (nieuw — registry + helpers)
- `src/features/campaigns/components/canvas/medium/puck-config.tsx` (patternKey-velden + pattern-renders + 3 nieuwe componenten)
- `src/lib/landing-pages/page-data.ts` (SECTION_TYPE_IDS +3)
- `src/features/campaigns/components/canvas/medium/puck-templates/template-helpers.ts` (3 default-factories)
- `src/features/campaigns/components/canvas/medium/section-editor-model.ts` (factory-dispatch, label-preferentie, PREVIEW_SKIP_KEYS)
- `src/app/api/landing-pages/component-edit/route.ts` (TEXT_FIELDS_BY_TYPE +3)
- `src/lib/landing-pages/puck-text-fields.ts` (COPY_KEYS: metric, bridge)
- `src/lib/landing-pages/puck-data-flatten.ts` (EXCLUDED_KEYS: patternKey)
- `scripts/smoke-tests/web-page-builder-phase54-section-patterns.ts` (nieuw)
- `scripts/smoke-tests/web-page-builder-phase2.ts` (expected-lijst → 22)

# Bestanden die ik NIET aanraak

- `variant-generator.ts`, `page-type-schemas.ts`, `puck-templates/*-from-structured.ts` — C3-terrein (pattern-keuze ín de generatie)
- `publish*`/`/f/`/`/t/`-routes, `static-compile.ts`, `claw/**`, `prisma/**`, `package.json` (smoke bewust niet geregistreerd)
- Starter-templates (`puck-templates/landing-page.ts` e.a.) — additieve componenten, geen template-opname

# Smoke test plan

1. `npx tsx scripts/smoke-tests/web-page-builder-phase54-section-patterns.ts` → 98/98
2. `npx tsx scripts/smoke-tests/web-page-builder-phase2.ts` → 77/77 (22 componenten)
3. `npx tsx scripts/smoke-tests/web-page-builder-phase46-pagerender-parity.ts` → registry-sync 27/27
4. Volledige phase-suite: 74/81 groen; 7 rood = pre-existing environmental (DATABASE_URL ontbreekt in deze sandbox, allen variant-generator-importerend)

# Risico's

- Nieuwe patterns breken publieke route/screenshotter → gemitigeerd: RSC-safe
  (geen hooks/'use client' in puck-config), phase-smoke per pattern, tokens
  via bestaande helpers (sectionBandBg/resolveOnColor/elevation) — geen
  nieuwe kleuren.
- Byte-drift op het default-pad → gemitigeerd met pre/post-snapshot-diff
  tegen de oude code + blijvende phase54-asserts.
- `patternKey` lekt als copy naar judges/gates → gemitigeerd via
  EXCLUDED_KEYS/PREVIEW_SKIP_KEYS-exclusies.

# Out of scope

- C3: pattern-keuze ín de generatie (structured-output-veld) + opname van de
  3 anatomie-componenten in variant→puckData-mapping en starter-templates.
- Testimonial multi-quote wand (quotes-array) — wall rendert nu 1 card.
- Logo-beeldrij in TrustStrip (nu tekst-labels).
- Pattern-thumbnails in de kiezer (spec noemt thumbnails; nu tekst-lijst).

# Notes

- README (`canvas/medium/README.md`) telt nog "11 componenten" — die
  doc-sync is het bestaande Fase 0-hygiëne-item uit het verbeterplan en is
  hier bewust niet meegenomen (nu feitelijk 22).
