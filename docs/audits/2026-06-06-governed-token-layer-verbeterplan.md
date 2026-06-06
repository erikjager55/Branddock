# Governed Token Layer — verbeterplan

> **Datum**: 2026-06-06
> **Branch context**: `feat/lp-verbeterplan`
> **Aanleiding**: Anthropic-blog _"How Anthropic enables self-service data analytics with Claude"_ (claude.com/blog). De drie failure-modes uit dat artikel (concept-to-entity ambiguity, data staleness, retrieval failure) zijn één-op-één de problemen uit onze eigen brandstyle-audits (`2026-06-05-brandstyle-extraction-pipeline.md`, `2026-06-05-brandstyle-result-audit.md`, `2026-06-06-lp-render-zwarthout.md`).
> **Status**: ✅ GEÏMPLEMENTEERD 2026-06-06 (V1–V5) op `feat/lp-verbeterplan`. Zie "Implementatiestatus" onderaan voor afwijkingen t.o.v. dit plan.

---

## Kerninzicht (waarom dit doc bestaat)

Het Anthropic-team ging van **21% → 95%** accuraatheid in self-service analytics. De sprong kwam **niet** van slimmer data ophalen, maar van een **governed semantische laag**: één gecureerde bron per begrip, waar de agent verplicht éérst naar kijkt; rauwe data is alleen fallback. Bijbehorende lessen:

1. **Mens-gecureerde definities** > LLM-gegenereerde (auto-genereren "encodeerde juist de ambiguïteit die we wilden wegnemen").
2. **Provenance bij elk antwoord** (waar komt de waarde vandaan + data-quality check) vóórdat de gebruiker het ziet.
3. **Skills/regels als engineering**: in dezelfde repo als de transform-code, met CI die downstream-breakage flagt en een eval-drempel (~90%) vóór uitrol.

Branddock heeft deze stukken **gefragmenteerd al**, maar ze zijn niet verbonden. Dit plan verbindt ze tot één governed token-laag.

### Mapping artikel → Branddock (huidige stand, geverifieerd op code)

| Failure-mode (artikel) | Branddock-equivalent | Bewijs in code |
|---|---|---|
| Concept-to-entity ambiguity | "welke scraped waarde is de échte primary/font?" | `analysis-engine.ts:1143` logo-extractie geskipt zodra framework `--bs-primary` levert → Bootstrap-blauw wint; typografie-extractor krijgt geen `cssVariables` map (`typography-extractor.ts`) |
| Data staleness | re-scrape clobbert user-edits; geen vers-markering | override-flags bestaan (`BrandStyleguide.*Override`) maar wizard zet ze niet |
| Retrieval failure | "components leeg = GEMIST niet afwezig" | confidence/`detectorSource` zit per kleur in DB maar bereikt `BrandTokens` of renderer nooit |

---

## Architectuur-frame: vier lagen (artikel → Branddock)

| Laag (artikel) | Branddock-equivalent | Bestaat? |
|---|---|---|
| Data Foundations | `BrandStyleguide` + `StyleguideColor/Font/Component` (Prisma) | ✅ |
| Sources of Truth (semantische laag) | `BrandTokens` (`brand-tokens.ts`) + `semanticTokens` JSON (`semantic-role-resolver.ts`) | ✅ maar **draagt geen provenance** |
| Skills / routing-regels | v4-mappers presets + `puck-config.tsx` archetype-regels | ✅ maar **presets winnen óver scraped** (omgekeerd van artikel) |
| Validation | E2E UI-tests (gemockt) | ❌ geen extractie-eval / golden-set |

De rode draad: **provenance ontbreekt als first-class concept**, en zonder provenance kun je (a) presets niet correct degraderen tot fallback, (b) niet tonen waar een waarde vandaan komt, (c) de curatie-surface niet op onzekerheid focussen, en (d) geen accuraatheid meten. Daarom is **Verbetering 1 de keystone**; 2/3/4 hangen eraan, 5 staat los.

---

## Verbetering 1 — Provenance als first-class veld door de token-laag *(keystone)*

**Probleem.** `BrandTokens` (`src/lib/landing-pages/brand-tokens.ts:47`) is een platte bag van ~40 string-velden zonder herkomst. De resolve-functies wéten welke tier ze namen (Tier-1 scraped tag, Tier-2 category-default, Tier-3 `DEFAULT_BRAND_TOKENS`), maar gooien dat weg. Confidence leeft geïsoleerd op `StyleguideColor.confidence`/`detectorSource` (schema.prisma:1798) en in `SemanticTokensDiagnostics.source` (`semantic-role-resolver.ts`), en bereikt de renderer nooit.

**Ontwerp.** Een **provenance-sidecar** naast `BrandTokens`, niet erin (houdt backward-compat van de platte velden):

```ts
// src/lib/landing-pages/token-provenance.ts (nieuw)
export type TokenSource =
  | 'scraped'    // directe meting van de site
  | 'logo'       // uit logo-kleurextractie (hoge merk-fidelity)
  | 'override'   // user-curated edit — heilig, nooit overschrijven
  | 'archetype'  // afgeleid uit archetype-heuristiek
  | 'preset'     // designSystem/layoutStyle preset
  | 'fallback';  // DEFAULT_BRAND_TOKENS — niets gevonden

export type Confidence = 'high' | 'medium' | 'low';

export interface TokenOrigin {
  source: TokenSource;
  confidence: Confidence;
  detector?: string;   // 'logo', 'css-variable', 'frequency', 'wp-block-button', …
  evidence?: string;   // "button-bg 3x" / "var(--bs-primary)" — voor de footer
}

/** Keyed op token-pad: 'brand', 'surface', 'button.background', 'typographyByRole.display.fontFamily' … */
export type TokenProvenance = Record<string, TokenOrigin>;
```

`extractBrandTokensFromStyleguide()` retourneert voortaan `{ tokens, provenance }` (of een tweede out-param). De `pick*`-functies (`pickBrand` :681, `pickSurface` :591, `pickOnSurface` :619, `pickAccent` :711) en de v4-mappers (`mapButtonTokens` :162, `mapSectionRhythmTokens` :344, etc.) stempelen hun tier terwijl ze resolven — de informatie is er al, hij wordt nu alleen bewaard.

**Concreet (files):**
- **Nieuw** `src/lib/landing-pages/token-provenance.ts` — types + `recordOrigin(prov, path, origin)` helper.
- `src/lib/landing-pages/brand-tokens.ts` — `extractBrandTokensFromStyleguide` + `…FromContext` schrijven provenance; `pick*` geven `{value, origin}` terug.
- `src/lib/landing-pages/brand-tokens-v4-mappers.ts` — elke mapper retourneert tier-stempel (Tier-1 scraped vs Tier-2 preset vs Tier-3 fallback is al expliciet in de code, bv. :362).
- Persisteer in `semanticTokens` JSON als `diagnostics.provenance` (al een uitbreidbaar JSON-veld; `semantic-role-resolver.ts` `SemanticTokensDiagnostics`).

**Acceptatie.** Voor één gescrapte brand levert `extractBrandTokensFromStyleguide` een `provenance` waarin elke kern-rol (`brand/surface/onSurface/action/headingFont/bodyFont`) een `source` + `confidence` heeft die klopt met de gekozen tier.

---

## Verbetering 2 — Semantische laag eerst: presets degraderen tot échte fallback

**Probleem.** Het artikel: _"Claude is structurally required to consult managed metrics first; raw SQL becomes fallback only."_ Bij ons is het **omgekeerd** op meerdere plekken: presets/archetype-regels overschrijven gescrapte waarden.

Geverifieerde voorbeelden:
- `mapSectionRhythmTokens` (`brand-tokens-v4-mappers.ts:344`) clampt — correct — alléén de preset-fallback naar [40,56] en laat een echte `section.typical` ongeclampt door (:362-369). Dit is precies het juiste patroon. **Maar** het is ad-hoc per mapper, niet een gedeelde regel.
- `puck-config.tsx` past MINIMAL/EDITORIAL presets toe (128px hero-gap :416, `forceFlatCards` :1003, icon-size override in `mapIconographyTokens` :302) die in de Zwarthout/Napking-audits gescrapte waarden overschreven (giant button, uppercase, lege witruimte).

**Ontwerp.** Met provenance (V1) wordt de regel uniform en afdwingbaar:

> Een `preset`/`archetype`-waarde mag een token alleen vullen of overschrijven als de provenance van dat token `fallback` is (= scrape vond niets). Tokens met source `scraped`/`logo`/`override` zijn immuun voor presets.

Eén helper centraliseert dit:

```ts
// src/lib/landing-pages/brand-tokens-v4-mappers.ts (of token-provenance.ts)
/** Geef preset alleen toe als de scrape niets opleverde voor dit pad. */
export function preferScraped<T>(
  scraped: { value: T | null; origin: TokenOrigin } | null,
  presetValue: T,
  prov: TokenProvenance,
  path: string,
): T {
  if (scraped?.value != null) { recordOrigin(prov, path, scraped.origin); return scraped.value; }
  recordOrigin(prov, path, { source: 'preset', confidence: 'low' });
  return presetValue;
}
```

De bestaande Tier-1/Tier-2 structuur in de mappers wordt hierdoor consistent i.p.v. per-mapper handmatig. De `puck-config.tsx` preset-branches (:416, :1003, etc.) gaten gaan vóór toepassing checken op `prov[path].source === 'fallback'`.

**Let op — niet alles is degradeerbaar.** Sommige presets zijn legitieme *normalisatie*, geen overschrijving (bv. de [40,56] clamp voorkomt 128px-band ook bij een echt-maar-extreem gescrapte waarde). Per preset-branch expliciet labelen: `NORMALIZE` (mag altijd, clamp/cap) vs `FILL` (alleen bij `fallback`). Documenteer dit in de mapper-comments zoals nu al bij :357.

**Acceptatie.** Re-render Zwarthout + Napking-fixture: tokens met `source: scraped/logo/override` verschijnen ongewijzigd in de output; alleen `fallback`-tokens dragen preset-waarden. Geen visuele regressie t.o.v. de reeds-gemergede Track 1/3/4 fixes (PR #20).

---

## Verbetering 3 — Provenance-footer in de output *(kleinste bouw, hoogste diagnostische winst)*

**Probleem.** GIGO is nu pas zichtbaar in een handmatige audit ná render (napking = WordPress-placeholder → garbage tokens, maar de renderer toont fier een LP). Het artikel toont bij elk antwoord een **provenance-footer + data-quality check** zodat een slecht antwoord opvalt vóórdat de gebruiker erop bouwt.

**Ontwerp.** Twee oppervlakken, beide gevoed door V1:

1. **Dev/debug-overlay op de LP-preview** (`LandingPagePreview.tsx`, dispatch via `preview-map.ts:72`): toggle die per gerenderd token een badge toont — kleur/font/spacing → `source` + `confidence` + `evidence`. Achter een developer-only flag (`DEVELOPER_EMAILS`, bestaat al).
2. **Data-quality samenvatting in de styleguide** (StyleguideHeader, naast de bestaande "X/Y sections approved" :133): "N van M tokens laag-vertrouwen of fallback" met deep-link naar de wizard (V4). Hergebruikt `SemanticTokensDiagnostics.unresolvedRoles` + `wcagWarnings` die er al zijn.

Geen nieuwe data nodig — puur rendering van `provenance` uit V1. Daarom expliciet als eerste bouwen ná V1: het maakt V2 en V4 ook meteen **debugbaar**.

**Acceptatie.** Voor napking toont de header "≥X tokens fallback/low" en de overlay markeert de placeholder-afgeleide waarden rood; voor een sterke brand (bv. charthop) overwegend "high/scraped".

---

## Verbetering 4 — Curatie-surface = de accuraatheidssprong

**Probleem.** Het artikel: mens-gecureerde definities zijn waar 21%→95% gebeurt. Onze `BrandOnboardingWizard` (`BrandOnboardingWizard.tsx:47`) is **read-only**: het toont top-6 kleuren + fonts en linkt naar tabs (`onJumpToTab`). De override-tabs (ColorsSection/TypographySection) bestaan en persisteren correct (`useUpdateSection`), maar:
- de wizard stuurt de gebruiker **niet** naar wat onzeker is — hij toont gewoon de top-N;
- de **lock/override-flags** (`buttonProfileOverride` etc., schema.prisma) worden door de wizard niet gezet, dus een re-scrape (`scripts/rescrape-brand.ts`, DESTRUCTIEF) clobbert curatie.

**Ontwerp.** Maak de wizard onzekerheid-gedreven (gevoed door V1-provenance):

1. **Confidence-first volgorde.** Stap "Kleuren"/"Typografie" tonen **eerst** de tokens met `source ∈ {fallback, preset}` of `confidence: low`, met een expliciete vraag: _"Dit konden we niet zeker bepalen — klopt dit of pas aan."_ De rest collapsed.
2. **Inline edit in de wizard** (niet alleen jump-to-tab) voor die onzekere tokens — hergebruik de bestaande mutatie-hooks (`useAddColor`/`useUpdateSection`), zodat de wizard de daadwerkelijke curatie-stap wordt i.p.v. een doorverwijzer.
3. **Lock = override-flag zetten.** Bij bevestiging/bewerking de relevante `*Override` flag op `true` zetten (de protectie bestaat al in `analyzeUrl`-merge; alleen de schrijf-actie ontbreekt). Stap "Klaar" toont expliciet wat gelocked is.

**Bewuste keuze (artikel-les).** We **genereren geen** definities met de LLM en presenteren ze als waarheid. De LLM mag de *toelichting* genereren ("we denken dat dit je primary is omdat het 3× als button-bg voorkwam") maar de **beslissing** is van de gebruiker. Dat is exact `evidence` uit `TokenOrigin` (V1) als wizard-copy.

**Concreet (files):** `BrandOnboardingWizard.tsx` (volgorde + inline edit), `StyleguideHeader.tsx` (lock-indicatie), nieuwe `PATCH` op `/api/brandstyle` om `*Override` flags te zetten (route bestaat, :147 merge-logica uitbreiden).

**Acceptatie.** Wizard toont voor napking de fallback-tokens bovenaan met "onzeker"-label; een edit + bevestig zet `*Override=true`; een daaropvolgende `rescrape-brand.ts` laat de gelockte waarden staan.

---

## Verbetering 5 — Golden-set eval + ablation-per-PR *(staat los van 1–4)*

**Probleem.** Het artikel gate uitrol op een **offline eval-drempel (~90%)** en draait **ablation per PR** zodat een regel-wijziging die accuraatheid verlaagt zichtbaar is vóór merge. Wij hebben voor extractie **niets** — alleen UI-gedrag-E2E met gemockte responses (`e2e/tests/brandstyle/analyzer.spec.ts`). De extractie-audit stelt `[DET]` fixture-tests voor maar die zijn niet gebouwd.

**Ontwerp — twee niveaus:**

1. **`[DET]` deterministische fixture-suite** (snel, geen netwerk). Fixture-CSS/HTML → assert op resolved `BrandTokens` + provenance. Bv.:
   ```
   :root{--bs-primary:#e8521f} .btn-primary{background:var(--bs-primary)}
   → verwacht: brand === '#e8521f', provenance.brand.source === 'scraped'
   ```
   Dekt expliciet de bekende bug-klassen: var-resolutie, framework-default-penalty, logo-redding. Leeft náást de extractors (`src/lib/brandstyle/__fixtures__/` + `*.test.ts`).

2. **Golden-set van echte brands** (offline eval). N brands met **bevroren verwachte resolved tokens** (de snapshot = gecureerde ground truth, niet auto-gegenereerd — artikel-les). Re-scrape draait tegen opgeslagen HTML-snapshots (deterministisch), niet live. Accuraatheid = % tokens dat matcht. Hergebruik het `BrandstyleSnapshot`-model dat al bestaat (schema.prisma).

3. **CI-hook (ablation per PR).** Mirror de bestaande **Content Golden-Sets** GitHub workflow: draai de `[DET]`-suite + golden-set op elke PR die `src/lib/brandstyle/**` of `src/lib/landing-pages/**` raakt, en rapporteer de accuraatheid-delta. Een PR die de score verlaagt = rode check (zoals het artikel's "CI flags modeling changes that break downstream dashboards").

**Acceptatie.** `npm run test:brandstyle-eval` draait offline, groen op de huidige `main`-baseline; een bewust geïntroduceerde regressie (bv. framework-penalty uitzetten) laat de score meetbaar zakken.

---

## Verbetering 6 — Self-service analytics als product-feature *(expliciet uitgesteld)*

De meest letterlijke vertaling van het artikel: laat brand-owners zélf vragen stellen aan hun competitive-intel data (`CompetitorContentItem`, activities, snapshots) via Claude, met een semantische laag erbovenop. Past op de continuous-learning-loop werkstroom (`branddock-learning-loop-decisions.md`), maar is een grotere bouw met eigen governance-vraagstukken. **Post-launch.** Hier alleen genoteerd zodat 1–5 (die de interne token-governance leggen) bewust het fundament vormen waar 6 later op kan staan.

---

## Volgorde & afhankelijkheden

```
V1 (provenance)  ──┬──▶ V2 (presets→fallback)
   keystone        ├──▶ V3 (provenance-footer)   ← kleinste, bouw direct na V1
                   └──▶ V4 (curatie-surface)
V5 (eval/CI)  ── onafhankelijk, kan parallel
V6  ── post-launch
```

**Aanbevolen eerste sprint:** V1 + V3. V1 is structureel maar bestaat grotendeels al verspreid (alleen verbinden + bewaren). V3 maakt V1 meteen zichtbaar/debugbaar en levert de grootste diagnostische winst voor de kleinste bouw — het maakt GIGO zichtbaar vóór render. Daarna V2 (lost de Zwarthout/Napking preset-bug-klasse structureel op) en V4 (de eigenlijke accuraatheidssprong). V5 parallel oppakken zodra V1 een stabiel provenance-contract heeft om tegen te asserten.

## Out of scope

- Geen wijziging aan de scrape/extractor-logica zelf (dat is de aparte `2026-06-05-brandstyle-extraction-pipeline.md` track) — dit plan gaat over **wat we met de geëxtraheerde signalen doen**: bewaren (V1), respecteren (V2), tonen (V3), cureren (V4), meten (V5).
- Geen LLM-auto-generatie van token-definities (bewuste artikel-les: dat encodeert ambiguïteit).
- V6 product-feature.

---

## Implementatiestatus (2026-06-06)

Alle vijf gebouwd op `feat/lp-verbeterplan`. `tsc` schoon, geen nieuwe lint-errors, DET-suite 24/24.

**V1 — provenance (keystone).** Nieuw `src/lib/landing-pages/token-provenance.ts` (TokenSource/TokenOrigin/TokenProvenance + helpers). `extractBrandTokensFromStyleguide` gesplitst in een backward-compatible wrapper + `extractBrandTokensWithProvenance` die per kern-token de origin stempelt tijdens het resolven. Doorgethread via `CanvasContextStack.brandProvenance` (`canvas-context.ts`).
- **Afwijking**: provenance wordt **in-memory** teruggegeven, niet in `semanticTokens.diagnostics.provenance` gepersisteerd. Reden: dat zou de twee resolve-systemen (LP-brand-tokens vs styleguide semantic-role-resolver) conflateren en een DB-migratie vragen. Provenance is deterministisch uit de styleguide, dus persistentie is overbodig.
- Toegevoegde source `derived` (onBrand/brandSubtle/accent-recycle) bovenop de zes uit het plan — eerlijker voor de footer.

**V2 — presets → fallback.** `isScrapedOrigin(provenance, path)` helper; `forceFlatCards` in `puck-config.tsx` gegated: archetype mag de scraped card-elevation alléén platslaan als die NIET gescraped is.
- **Afwijking / bevinding**: de renderer deed al grotendeels scraped-first (talloze "Tier-1 scraped > Tier-2 archetype" comments + de rhythm-clamp). De enige resterende echte preset-over-scraped override was `forceFlatCards`. V2 was dus kleiner dan het plan suggereerde. De `preferScraped`-helper uit het plan paste niet (tokens zijn al plat geresolveerd in de renderer) → vervangen door de boolean-gate `isScrapedOrigin`.

**V3 — provenance-footer.** Twee surfaces: (a) user-facing data-quality-badge in `StyleguideHeader` ("N onzeker") via nieuwe `src/features/brandstyle/utils/data-quality.ts`; (b) developer-only `TokenProvenancePanel` in `PuckPageBuilder` (gegate op `useDeveloperAccess`).
- **Afwijking**: badge gebruikt de **unified brand-tokens provenance** (V1), niet `SemanticTokensDiagnostics` zoals het plan opperde — houdt één governed provenance-notie i.p.v. twee.

**V4 — curatie-surface.** `BrandOnboardingWizard` is onzekerheid-first: welkomstap toont attention-overzicht, Kleuren/Typografie-stappen tonen een `UncertaintyPanel` met de fallback/low-confidence tokens bovenaan + gerichte jump-CTA. Gevoed door `computeDataQuality`.
- **Bewust gedescoped**: (1) inline-edit in de wizard — dupliceert de bestaande tab-editors (ColorsSection/TypographySection) met hoog regressie-risico voor marginale winst boven de bestaande jump-to-tab; (2) color-lock via `*Override`-flags — die flags beschermen render-**profielen** (button/spacing/elevation), niet kleuren/fonts; een mismatch in het oorspronkelijke plan. De styleguide-brede lock bestaat al los in de header.

**V5 — golden-set eval + CI.** `[DET]` suite `scripts/smoke-tests/brandstyle-provenance.ts` (4 fixtures: sterk merk / logo-extractie / GIGO-leeg / framework-default; 24 asserts) + `npm run test:brandstyle-eval` + CI-workflow `.github/workflows/brandstyle-eval.yml` (mirror van Content Golden-Sets, draait op PRs die `src/lib/brandstyle/**` of `src/lib/landing-pages/**` raken; deterministisch, geen API-keys).
- **Scope**: de bevroren golden-set van échte brands (re-scrape tegen opgeslagen HTML-snapshots) is nog niet gebouwd — de DET-fixture-suite dekt de resolve-logica; de live-brand golden-set is een vervolgstap.

**Review-loop (2026-06-06, na merge).** 2 ronden 2-subagent review op de gemergede code. Ronde 1: 1 CRITICAL (elevation-provenance volgde `elevationProfile || radiusProfile` terwijl de V2-gate-waarde `cardElevationCategory` alléén uit `elevationProfile` komt → radius-only merk beschermde een preset-waarde als scraped) + WARNINGs (provenance vóór WCAG-gate, accent-fallback-onderrapportage, CI-paths missen consumers, DET dekte de gate-beslissing niet). Ronde 2: alle production-issues clean; alleen test-fixture-fixes resteerden. Alles gefixt in commit `55eb175b`; DET-suite uitgebreid 24→31 asserts (gate-contract + WCAG-correctie + RADIUS_ONLY-regressie).

**V5 deel 2 — golden-set scaffold (gebouwd).** `scripts/eval/brandstyle-golden-set/` met runner + 3 merk-fixtures (strong-orange / charcoal-minimal / gigo-placeholder) + `_schema.json` + README; `npm run eval:brandstyle-golden` (accuraatheid-drempel 90%, nu 100%); gewired in CI. **Bewuste scope**: resolver-niveau, niet full-scrape — `scrapeUrl` heeft geen offline HTML-seam, dus een snapshot-golden-set vereist eerst een `scrapeHtml()`-refactor (gedocumenteerd in de README).

**Bewust uitgesteld:**
- **Per-veld v4-provenance** (i.p.v. groep-granulariteit) — lage waarde: beïnvloedt alléén het developer-only `TokenProvenancePanel` (de v4-groep-paden zitten NIET in de user-facing `CURATABLE_PATHS`). In productie is `present(profile)` een degelijk signaal (profielen zijn óf afwezig óf bevatten echte data); de gate-kritische `elevation` is nu correct op `elevationProfile`-presentie. Echte per-veld vereist coöperatie van alle 6 v4-mappers (return van een scraped-vlag per veld) voor marginale dev-footer-precisie.
- **Browser-verificatie wizard + LP-overlay** — auth'd app-flow; in dit project een gebruikers-verificatiestap (zoals #26/#290 hero-gen). Checklist: (1) styleguide met deels-onzekere scrape → header toont amber "N onzeker"-badge; (2) Onboarding-wizard welkomstap toont attention-overzicht, Kleuren/Typografie-stappen tonen de onzekere tokens bovenaan; (3) als developer ingelogd: LP-render (Puck Step 3) toont het uitklapbare token-provenance-paneel; (4) een sterk merk → header groen "Data-kwaliteit OK".
- **V6** product self-service analytics — post-launch.
