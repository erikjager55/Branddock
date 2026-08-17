---
id: lp-generative-pattern-choice
title: Generatieve pattern-keuze (C3) — per-sectie layout uit de variant-generatie
fase: pre-launch
priority: next
effort: 1-2 dagen (uitgevoerd in 1 sessie)
owner: claude-code
status: done
created: 2026-08-12
completed: 2026-08-12
related-adr: docs/adr/2026-08-12-generative-pattern-choice.md
related-spec: docs/specs/2026-08-07-webpage-builder-verbeterplan.md (§5 Fase C taak C3 + §7 pattern-spreiding-metriek)
worktree: - (branch claude/puck-editor-improvement-y9ep4x, parallel-engineering sessie)
---

# Probleem

C1 leverde de sectie-patroonregistry en C2 de handmatige "Wissel layout"-
kiezer, maar de generatie koos zelf nog niets: elke variant rendert alle
secties op `'default'`, dus varianten verschillen alleen in copy — de
§1.3-diagnose ("zelfde botten") bleef voor de eerste indruk van elke batch
staan. Het plan (§5 C3) vraagt pattern-keuze ín de generatie zodat varianten
ook in layout verschillen, met §7 als meetdrempel (>80% monocultuur per
sectie-type = bijstellen).

# Voorstel

Additief `layoutPatterns`-veld in de structured output (per type veldnamen op
de sectie-sleutels: LP `features/testimonial/stats/faq/finalCta`, product
`features/faq/finalCta`, faq-page `popularQuestions/categories/closingCta`,
microsite `quote/join`), met `.catch(undefined)`-degradatie zoals imageBrief.
Prompt krijgt per type een compact LAYOUT-PATTERNS-blok (archetype-gefilterd
via `allowedPatternsFor` + 1-regel-betekenis + variatie-directief). Server-side
validatie ná parse (`sanitizeVariantLayoutPatterns`: archetype + minItems;
ongeldig → 'default' + warn, geen fail). Mappers zetten de gevalideerde keys
als `patternKey`-prop (alleen wanneer aanwezig). Meting: `[pattern-choice]`-
console.info per generatie in de route. Volledige rationale + alternatieven in
de ADR.

# Besluiten

- **Eén module** `src/lib/landing-pages/pattern-choice.ts` bundelt slots per
  type, prompt-blok, sanitize, `patternProp` en `variantLayoutPatterns` —
  prompt, validatie en mappers delen zo één bron met de C2-kiezer
  (`allowedPatternsFor`), dus regels kunnen niet driften.
- **Sanitize in `generateLandingPageVariant`** (direct ná parse, met de
  server-side archetype uit de params) zodat JSON- én SSE-pad dezelfde
  gevalideerde variant zien vóór het `variant_complete`-event; het
  tell-rewrite-/silent-iterate-pad (herparse) hervalideert in de route.
- **faq-page `categories` valideert tegen de kléinste categorie** (één key
  stuurt alle categorie-blokken; two-column ≥4 moet voor elk blok kloppen).
- **Trust-strip-FeatureGrid (LP) bewust key-loos**: workaround-grid,
  semantisch geen features-sectie.
- **FeatureSplit-tak negeert de features-key**: alleen FeatureGrid draagt
  patterns in de registry; bij volledige beeld-vulling wint de split zoals
  voorheen.
- **Geen em-dashes in het prompt-blok**: HVD no-priming, bewaakt door de
  page-types-w4-smoke op het OFF-prompt (tijdens bouw gevonden en gefikst).
- **`LP_VARIANT_PROMPT_VERSION` 2.1.0 → 2.2.0** (minor: additieve
  prompt-uitbreiding, zelfde contract).

# Acceptatiecriteria

- [x] Schemas additief: geldig/ongeldig/afwezig `layoutPatterns` parset
      altijd (degradatie per key én op het object); alleen op de 4 types met
      pattern-dragende mapper-componenten (GEO niet)
- [x] Prompt-blok toont uitsluitend archetype-toegestane keys (RULER ziet
      geen bento/stats-cards; null-archetype geen restricted patterns) +
      variatie-directief; leeg blok = prompt byte-identiek
- [x] Server-side validatie: onbekende key / archetype-restrictie / minItems
      → 'default' + console.warn, nooit een fail
- [x] Mappers zetten `patternKey` alleen wanneer aanwezig; zonder
      `layoutPatterns` verschijnt de prop nergens (byte-compat C1)
- [x] `[pattern-choice]` console.info per variant in de generate-route
      (JSON- + SSE-pad, vóór persist)
- [x] ADR geschreven (status accepted)
- [x] `npx tsc --noEmit` 0 errors (repo-breed)
- [x] `npx eslint` op alle geraakte bestanden: 0 errors, 0 warnings
- [x] Smoke `web-page-builder-phase55-generative-patterns.ts` groen (72
      asserts); phase7/phase9/phase54 + page-types-w2-w3/w4 + phase8/39/65/66
      blijven groen

# Bestanden die ik aanraak

- `src/lib/landing-pages/pattern-choice.ts` (nieuw — slots, prompt-blok, sanitize, patternProp)
- `src/lib/landing-pages/variant-schema.ts` (layoutPatternKeySchema + LP-layoutPatterns)
- `src/lib/landing-pages/page-type-schemas.ts` (layoutPatterns op faq/product/microsite)
- `src/lib/landing-pages/variant-generator.ts` (prompt-blok ×4, sanitize ná parse, versie-bump)
- `src/app/api/landing-pages/[deliverableId]/generate-structured-variant/route.ts` (meting-log + archetype in postArgs + hervalidatie na rewrites)
- `src/features/campaigns/components/canvas/medium/puck-templates/landing-page-from-structured.ts`
- `src/features/campaigns/components/canvas/medium/puck-templates/product-page-from-structured.ts`
- `src/features/campaigns/components/canvas/medium/puck-templates/faq-page-from-structured.ts`
- `src/features/campaigns/components/canvas/medium/puck-templates/microsite-from-structured.ts`
- `scripts/smoke-tests/web-page-builder-phase55-generative-patterns.ts` (nieuw)
- `docs/adr/2026-08-12-generative-pattern-choice.md` (nieuw)

# Bestanden die ik NIET aanraak

- `section-patterns.ts` — alleen consumeren (C1-registry is het contract)
- `puck-config.tsx`, `PreviewEditingLayer`/`SectionEditor`/`PuckPageBuilder` — render/editor-laag af (C1/C2/E2)
- `page-render`/`page-data`/`static-compile`, `publish*`/`/f/`/`/t/`-routes, `prisma/**`, `claw/**`
- `package.json` — smoke bewust niet in de suite-chain geregistreerd (aparte registratie-commit)

# Smoke test plan

1. `npx tsx scripts/smoke-tests/web-page-builder-phase55-generative-patterns.ts` → 72/72
2. `npx tsx scripts/smoke-tests/web-page-builder-phase7-variant-schema.ts` → 32/32
3. `npx tsx scripts/smoke-tests/web-page-builder-phase9-structured-mapper.ts` → 34/34
4. `npx tsx scripts/smoke-tests/web-page-builder-phase54-section-patterns.ts` → 98/98
5. Aanpalend (met DATABASE_URL gezet): page-types-w2-w3 53/53, page-types-w4
   20/20, phase8 40/40, phase39 17/17, phase65 9/9, phase66 28/28

# Risico's

- Copy-LLM kiest een visueel matige layout → C2-kiezer is het correctiemiddel
  zonder AI-call; §7-log maakt spreiding meetbaar.
- Rewrite-paden (STRICT tell-rewrite / silent-iterate) herparsen LLM-output en
  zouden het filter kunnen omzeilen → hervalidatie in de route na beide paden.
- Prompt-priming van em-dashes via het nieuwe blok → gefikst (komma's/;),
  page-types-w4 bewaakt het blijvend.

# Out of scope

- Anatomie-componenten (TrustStrip/PainBullets/ImpactStats) in de generatie-
  mapping + starter-templates (C3-vervolg uit de C1-taak).
- Multi-quote testimonial-wand (quotes-array in het schema).
- §7-dashboard voor pattern-spreiding (post-pilot; nu console.info).
- Registratie van phase55 in de `smoke:web-page-builder`-chain (package.json
  is buiten scope van deze sessie).

# Notes

- Sanitize logt met hetzelfde `[pattern-choice]`-prefix als de meting-log in
  de route, zodat één grep beide stromen vindt.
- De phase55-smoke gebruikt het source-image-matcher-patroon (dotenv +
  dynamic import + dummy-DATABASE_URL-fallback) omdat variant-generator
  transitief prisma laadt bij module-load; de smoke raakt de DB nooit.
