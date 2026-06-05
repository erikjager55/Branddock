# Audit + verbeterplan — Brandstyle-analyser resultaten (Zwarthout)

> **Datum**: 2026-06-05 · **Bron**: 15 full-page screenshots (`test-screenshots/brandstyle/`, live UI, brand = Zwarthout/zwarthout.com, vers geanalyseerd 12:22) + live-site HTML-probe + 6-stream code-audit (workflow, 7 agents, root-causes cross-checked in live code).
> **Scope**: kwaliteit van wat de brandstyle-analyser oplevert — consistentie, overlap, ontbrekende/overbodige items. Niet de scrape-fidelity-fixes uit `2026-06-05-brandstyle-extraction-pipeline.md` (#277, Fase 1-6) — dit is een vervolg dáárop.
> **Status**: diagnose compleet, geprioriteerd verbeterplan. Implementatie nog niet gestart.

---

## 1. Aanleiding

De analyser toont voor Zwarthout opvallend wéinig componenten (Buttons 5, Form inputs 0, Status chips 0, Product cards 0, Feature icons 0, Top navigation 1, Quote blocks 0). User-hypothese: *de scraping is niet diepgaand genoeg, óf de elementen worden niet als component herkend.* Daarnaast vielen op: een onleesbare primary-font, verzadigde kleuren in de "neutraal"-bak, gebroken spacing/radii-schalen, en cross-tab inconsistenties.

## 2. Methode

1. **Visuele grond**: alle 15 screenshots gelezen, per tab geïnventariseerd.
2. **Live-site grond** (beslissend voor "afwezig vs gemist"): `zwarthout.com` homepage + `/contact/`, `/quote/`, `/products/`, `/products/kyushu/` opgehaald en op statische component-signalen geteld.
3. **Code-audit**: 6 parallelle investigators (component-diepte, component-classificatie, typografie, kleur, spacing/elevation, consistentie) → synthese, met root-causes cross-checked in de live code.

---

## 3. Kernhypothese beantwoord met bewijs

De user heeft gelijk dat het "te ondiep / verkeerd geclassificeerd" is, **maar de oorzaak ligt niet in de DOM-rendering en niet primair in de scrape-diepte — hij ligt in de merge/coverage/classificatie-laag.**

| Mogelijke oorzaak | Verdict | Bewijs (geverifieerd in live code) |
|---|---|---|
| **Rendering (JS-DOM)** | **VERWORPEN** | `.env.local`: `BRANDSTYLE_COMPONENT_SCREENSHOTS=1` + `_VISION=1` → Playwright rendert de live DOM. De form-inputs staan bovendien server-side in de HTML (Gravity Forms). Rendering is niet de bottleneck. |
| **Diepte (te weinig pagina's ontdekt)** | **GEDEELTELIJK** | De scraper ontdekt tot 8 subpagina's incl. /contact, maar de screenshot-set is `[url, ...subpageUrls.slice(0,4)]` (`analysis-engine.ts:638`) = 5 pagina's; `contact` staat op rank 8 in `PRIORITY_ORDER` (`page-classifier.ts`) → buiten de slice → nooit gescreenshot. Dit is **dekking**, niet diepte. |
| **Merge (data weggegooid)** | **BEVESTIGD — primaire oorzaak** | `analysis-engine.ts:625` `finalComponents = scraped.components` (multi-page static merge, bevat /contact-inputs), maar `:664 if (shot.length > 0)` → `:682` **vervangt de hele array wholesale** door de screenshotter-output. Eén gevonden component → de complete static set (incl. form-inputs en cards) wordt weggegooid. Geen per-type backfill. |
| **Classificatie / selector-gap** | **BEVESTIGD — secundaire oorzaak** | WooCommerce-productkaarten zijn `li.product-item` / `.mm-product`; de PRODUCT_CARD-selectors (`component-screenshotter.ts:162-166`: `article.product`, `[class*=product-card]`, …) matchen géén `product-item`. |
| **Confidence-formule** | **BEVESTIGD** | `computeConfidence` (`component-screenshotter.ts:732-737`) = `min(0.5 + props×0.05, 1)` → degenereert naar 1.0 voor élk gerenderd element. Nav is bovendien vrijgesteld van de styling-gate → een generieke zwarte balk (`<nav class="navbar-top bg-black">`) scoort 100% en is het enige niet-button "component". |

---

## 4. Echt afwezig op zwarthout.com vs gemist door de pijplijn

Bewijs uit de live-site-probe (statische HTML, geen JS nodig):

| Element | Status | Grond |
|---|---|---|
| **Form inputs** | **GEMIST** | `/contact/` 21× + `/quote/` 24× `<input>` + `<textarea>` + `<select>` in server-side HTML (`gform_wrapper` 10-12×). Homepage: 0. → buiten de screenshot-slice + wholesale-replace gooit de static-merge weg. |
| **Product cards** | **GEMIST** | WooCommerce-shop (`woocommerce` 29-39×/pagina); kaarten zijn `li.product-item` / `.mm-product` (9×/pagina). `class="card"` = 0. → selector-gap. |
| **Nav** | **AANWEZIG, verkeerd geaggregeerd** | Homepage-nav = `<nav class="navbar-top py-2 bg-black">`. Extractie is feitelijk correct (het ÍS zwart), maar pakt de utility-topbar i.p.v. de hoofd-merknav, en scoort misleidend 100%. |
| **Shadows/elevation** | **AANWEZIG, gescrapt, gemist door resolver** | Rendert op de Spacing-tab (4 tokens) maar telt 0 op Design-System + Visual-System → shape-bug (zie Fase 2). |
| **Gradients** (teal/paars/roze) | **Waarschijnlijk ECHT AFWEZIG, maar VERZONNEN** | Prompt forceert invention (`analysis-prompts.ts:628`), geen provenance-veld. `[RE-SCRAPE]` voor 100%. |
| **Framework-kleuren** ("Bootstrap Blue" e.d.) | **AANWEZIG in CSS, renderen vermoedelijk niet** | Framework-defaults in NEUTRAL-bucket. `[RE-SCRAPE]` om `usageEvidence==='none'` te bevestigen. |
| **System-font-stack als "font"** | **ARTEFACT** | var()-resolutie lekt de hele komma-stack als één "font". |

**Conclusie**: geen van de ontbrekende componenten is "echt afwezig" — form inputs worden gemist door **merge + dekking**, product cards door **classificatie (selector-gap)**.

---

## 5. Werkeenheden (geprioriteerd op leverage × haalbaarheid)

`[DET]` = deterministisch testbaar (fixture/unit → assert). `[RE-SCRAPE]` = vereist live re-scrape van zwarthout.com om volledig te valideren.

### Fase 1 — Component merge + coverage `[hoogste leverage]`
Dekt: Form inputs 0, Product cards 0, lage component-diversiteit, deels Design-System "Components 1".

| Sub | Probleem | Root-cause | Fix-richting | Type | Risico |
|---|---|---|---|---|---|
| 1a | Wholesale-replace gooit static-gemergde inputs/cards weg | `analysis-engine.ts:664,682` | Per-type backfill: voor types waar de screenshotter 0 levert, behoud de static entries uit `scraped.components` (dedup static+shot) | [DET] | Laag — additief |
| 1b | /contact nooit gescreenshot | `analysis-engine.ts:638` (`slice(0,4)`) + `page-classifier.ts` (contact rank 8) | Screenshot-set per page-**type** kiezen i.p.v. naïeve slice; forceer contact + 1 product + pricing; verhoog contact in `PRIORITY_ORDER` | [DET] | Laag-Med — wall-clock ↑ |
| 1c | `product-item`/`mm-product` matcht geen PRODUCT_CARD-selector | `component-screenshotter.ts:162-166` (+ fallback `component-extractor.ts:198-218`) | Voeg `[class*=product-item]` / `[class*=product_item]` toe mét bestaande block-level + size-gate | [DET] | Med — false-positives (`product-title`/`-img` children); size-guard vangt af |
| 1d | products vult de slice met 3 near-identieke detailpagina's | `page-classifier.ts` (3/type) | Verlaag screenshot-`maxPerType` voor products → 1-2 | [DET] | Laag |

**Begin met 1a** (kleinste edit, hoogste user-zichtbare winst — de /contact-inputs zitten al in de static-merge). 1a+1b samen = robuust. `[RE-SCRAPE]` om ≥3 inputs / ≥5 cards te bevestigen.

### Fase 2 — Elevation shape-bug `[hoogste consistentie-winst, kleinste fix]`
Dekt: Design-System "Elevation 0" vs Spacing-tab 4-token Shadow system vs Visual-System "no shadows".

- **Root-cause**: `clusterElevation` (`semantic-role-resolver.ts:572`) doet `if (Array.isArray(shadowSystemJson))`, maar `shadowSystem` is het object `{tokens:[...]}` (`css-visual-heuristics.ts:200-201`) → branch overgeslagen → `resolved.elevation = {}`. Sibling-clusterers gebruiken `collectNumericValues`/`walk` (`:659-672`) die objecten wél verwerken — alleen deze handrolt de array-check fout.
- **Fix**: `const arr = Array.isArray(json) ? json : (json?.tokens ?? [])` vóór de loop.
- **Type**: [DET] — fixture `{tokens:[{value:"0 1px 3px ..."}]}` → non-leeg. **Risico**: zeer laag (1 regel, single source).

### Fase 3 — Typografie-vervuiling
Dekt: Primary = system-stack-string, "WooCommerce", Roboto/Oxygen/Ubuntu-ruis, "Sen Bold", "3 commercial fonts missing".

| Sub | Probleem | Root-cause | Fix-richting | Type |
|---|---|---|---|---|
| 3a | Var-resolutie lekt de hele komma-stack als één font (kaapt de primary-slot) | `url-scraper.ts:996` `([^;}]+)` + `:999` recurse zonder split | Split `defMatch[1]` op komma vóór recursie; neem de eerste niet-generieke familie (consistent met de andere paden) | [DET] |
| 3b | "WooCommerce" icon-font niet gefilterd | `url-scraper.ts` `ICON_FONT_FRAGMENTS` mist `woocommerce` | Voeg `woocommerce` (+ `elementor-icons`) toe | [DET] |
| 3c | Roboto/Oxygen/Ubuntu = fallback-chain-ruis | `url-scraper.ts:939-952` itereert élke familie | Neem alléén de eerste niet-generieke familie per declaratie | [DET]-deel / `[RE-SCRAPE]` of Roboto echt body is |
| 3d | "Sen Bold" weight-suffix niet gestript | geen pad stript weights | Normaliseer trailing `Thin..Black/Italic/300-700` vóór dedup + Google-Fonts-lookup ("Sen" → GOOGLE_FONTS) | [DET] |
| 3e | "3 fonts missing"-banner | `FontsGrid.tsx` (vervuilde input) | Geen aparte fix — verifieer 0 na 3a-d | [DET] |

**Let op (3a)**: na de fix wordt `cssFonts[0]` de eerstvolgende overlevende — **niet automatisch "Sen"**; controleer de primary-volgorde-uitkomst. Sluit aan op de Fase-4-honest-state uit #277.

### Fase 4 — Kleur-classificatie (chroma-gate + framework-default drop)
Dekt: 6 verzadigde kleuren in NEUTRAL-bucket, 11-kleuren-ruis, vervuilde surface/outline-tokens.

| Sub | Probleem | Root-cause | Fix-richting | Type |
|---|---|---|---|---|
| 4a | NEUTRAL heeft geen chroma-filter; verzadigde defaults belanden erin | `analysis-prompts.ts` (rol-gebaseerd, geen saturatie) | Deterministische post-AI gate in `resolveColors`: `NEUTRAL && saturation > ~25-30` → herclassificeer/drop. Saturatie-helper bestaat al (`semantic-role-resolver.ts`), wordt niet in categorisatie gebruikt | [DET] |
| 4b | Framework-gate te smal + downgrade i.p.v. drop | `framework-defaults.ts` (14 hexes) + `analysis-engine.ts:1300` (alleen `confidence:'low'`) | Volledige Bootstrap/Gutenberg-palette of detector-gestuurd; drop-pad bij `usageEvidence==='none'` | [DET] hexes / `[RE-SCRAPE]` usage |
| 4c | Geen usage/saturatie-ondergrens op palet-grootte | `analysis-engine.ts` greedy MAX=12 | Filter `usageEvidence==='none'` + niet-logo/detector-herkomst; behoud detector/logo-kleuren altijd | [DET] filter / `[RE-SCRAPE]` |

**4a is hoogste prio** (NEUTRAL-bucket + downstream surface/outline in één). **Risico**: Med — chroma-drempel kan een legitieme verzadigde accent raken → behoud detector/logo-kleuren expliciet.

### Fase 5 — Spacing/radii rounding + pill-detectie
Dekt: 5.42px/3.75px fractioneel, XL<LG non-monotoon, FULL=4px (geen pill).

| Sub | Probleem | Root-cause | Fix-richting | Type |
|---|---|---|---|---|
| 5a | Computed-style floats ongerond | `bulk-computed-styles.ts:195,248` (geen `Math.round`) | `Math.round(parsePxFirst(...))` op het choke-point | [DET] |
| 5b | Non-monotone volgorde | `css-visual-heuristics.ts:228-237` (geen re-sort na merge) | Re-sort ascending + labels by-construction | fractioneel [DET] / **exacte volgorde `[RE-SCRAPE]`** |
| 5c | FULL niet als pill gedetecteerd | `css-visual-heuristics.ts:43` dropt `%`/`≥100px`; labelt by index | Bewaar `50%`/`9999px` als pill-signaal; bucket-based labeling | [DET] |

**Eerlijkheidsvlag (5b)**: het exacte non-monotone symptoom is mogelijk **stale persisted JSON** van een oudere analyzer-versie — de huidige builder reproduceert het niet zeker. Bevestig met een verse run vóór je veel tijd in een re-sort-guard steekt (de `Math.round` + re-sort is sowieso correct defensief).

### Fase 6 — Confidence-formule + nav-classificatie + gradient-provenance + Components-telling
Dekt: Nav @100% op generieke balk, verzonnen gradients, Design-System "Components 1" vs tab "6".

| Sub | Probleem | Root-cause | Fix-richting | Type |
|---|---|---|---|---|
| 6a | `computeConfidence` = props-count → degenereert naar 1.0 | `component-screenshotter.ts:732-737` | Baseer op `scoreCandidate` (`:456-524`, meet al brand-relevantie) of tel alleen onderscheidende props | [DET] |
| 6b | Nav vrijgesteld van styling-gate | `component-screenshotter.ts` (nav-`return true`) | Onderwerp nav aan minimale merk-styling-eis óf cap confidence; overweeg nav uit de component-telling (layout, geen herbruikbaar component) | [DET] |
| 6c | Vision relabelt zonder confidence te raken | `component-vision-enricher.ts:161-167` | Vision "Unclear" → confidence verlagen | [DET] |
| 6d | Gradients verplicht verzonnen, geen provenance | `analysis-prompts.ts:628` + schema `analysis-engine.ts:153` (geen `source`) | Voeg `source:'observed'\|'recommended'` toe; render "Recommended"-badge; downgrade auto-invention bij lage palette-confidence | [DET] mechanisme / `[RE-SCRAPE]` |
| 6e | Design-System "Components 1" vs tab "6" | `resolver.ts:213` (`Object.keys(props).length>0`-guard) + non-BUTTON-skip | Lijn telling uit op dezelfde array, óf hernoem stat naar "Component variants" | [DET] |

**Risico**: Med — 6a/6b raken de scoring-kern; valideer dat de 5 echte buttons hun confidence behouden. 6e wordt deels vanzelf consistenter na 6b + Fase 1.

---

## 6. Overlap, redundantie & overkoepelende zwakte

- **Eén bug, meerdere tabs**: de elevation shape-bug (Fase 2) veroorzaakt 3 inconsistente tabs — één fix lost alle drie op. Niet 3 werkeenheden.
- **Dubbele data-pijplijn**: ruwe `spacingScale/cornerRadii/shadowSystem` (per tab) vs `resolved.*` (Design-System/Visual-System) zijn niet één bron → de structurele wortel onder Fase 2 + 5 + de consistentie-gaps. **Architectuur-keuze voor later**: maak `resolved.*` single source, óf voeg een consistency-lint toe (`linter.ts` checkt nu WCAG/refs, niet "tab A toont X, tab B toont 0").
- **Verworpen / niet-gegrond**: de statische `component-extractor.ts` confidence/dedup-logica is **dode code** bij de huidige flags (screenshotter actief) — alleen relevant als fallback. De AI-kleurnamen ("Bootstrap Blue") zijn een diagnostisch signaal, geen aparte bug. De exacte "8px-overal"-nav-tokens zijn `[RE-SCRAPE]`, vallen onder 6a/6b.

---

## 7. Aanbevolen volgorde

1. **Fase 2** (elevation shape-bug) — 1 regel, 3 tabs consistent, laagste risico. Quick win.
2. **Fase 1a** (per-type backfill) — lost form-inputs + cards; hoogste user-zichtbare winst.
3. **Fase 3a-d** (typografie-ruis) — regex-fixes, lost primary-font + missing-banner.
4. **Fase 1b-c-d** (coverage + product-item selector) — robuuste component-fix; `[RE-SCRAPE]`-validatie.
5. **Fase 4a** (chroma-gate) — NEUTRAL-bucket + downstream in één.
6. **Fase 5a/5c** (rounding + pill) — 5b eerst op stale-data checken.
7. **Fase 6** (confidence/nav/gradient-provenance + telling) — scoring-kern, zorgvuldig valideren.

**Drie hoogste-leverage [DET]-fixes (alle in live code geverifieerd):** Fase 2 (`semantic-role-resolver.ts:572`), Fase 1a (`analysis-engine.ts:682`), Fase 3a (`url-scraper.ts:999`).

## 8. Validatie-protocol

1. Per fase: `npx tsc --noEmit` + `npm run lint` 0 errors; nieuwe `[DET]`-smoke in `scripts/smoke-tests/`-stijl (fixture → assert).
2. **Na Fase 1+2+3**: een gerichte re-scrape van zwarthout.com — verwacht ≥3 form-inputs, ≥5 product-cards, één leesbare primary-font, en consistente elevation over Spacing/Design-System/Visual-System.
3. Fase 4-6 raffineren de resterende ruis; gradient-provenance + kleur-drop zijn `[RE-SCRAPE]`.
