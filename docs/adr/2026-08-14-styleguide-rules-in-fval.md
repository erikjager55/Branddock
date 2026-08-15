---
id: 2026-08-14-styleguide-rules-in-fval
title: StyleguideRule bereikt F-VAL als derde violation-bron — modaliteit is data, geen gok
status: accepted
date: 2026-08-14
supersedes: -
superseded-by: -
---

# Context

W2 van het designbibliotheek-verbeterplan leverde `StyleguideRule` op als eersteklas datatype
(`kind: DO | DONT | HARD_RULE`, `severity: BLOCKING | ADVISORY`, `constraint Json?`). De beloofde
doorvoer — *"harde regels → W1-manifest → F-VAL rules-pijler (20%) en de Puck-renderers"* — is toen
bewust blijven liggen. De Stap-0-spike mat wat dat kost: conditie A produceerde 4+ overtredingen van
merkboek-regels en scoorde tóch 80+, met `rulesEvaluated: 0` in élke scoring.

De feitelijke stand op 2026-08-14, geverifieerd tegen de lokale DB:

| | |
|---|---|
| `StyleguideRule` | 346 lokaal / 311 prod — **100% `DONT` + `ADVISORY`, `constraint` overal `null`** |
| Secties | uitsluitend `colors` / `logo` / `imagery` / `design-language` — **allemaal visueel** |
| `BrandRule` (wat F-VAL wél leest) | alleen gevuld voor 6 van 18 workspaces, uitsluitend uit `BrandVoiceguide.wordsWeAvoid` + `antiPatterns` |
| DTS Ede | 0 `BrandRule`-records, lege voiceguide → vandaar de nul |
| `BrandVoiceguide.vocabularyDont` | wordt door `brand-rule-sync.ts` **niet** gesynct; 42 termen over 3 workspaces bereiken de scoring nooit |

Twee dingen volgen daaruit. Ten eerste: de doorvoer alléén lost niets op — er zijn geen
tekst-checkbare regels om door te voeren. Ten tweede: de regels die er wél zijn, zijn visueel, en
die mogen niet in de tekst-pijler geperst worden.

# Beslissing

## D1 — Directe compile, geen materialisatie naar BrandRule

`StyleguideRule` wordt een **derde violation-bron** in `mergeRuleResults`, naast `evaluateBrandRules`
(BrandRule) en `evaluateHeuristics` (locale-packs). Synthetische `ruleId`: `styleguide:<id>`.

Het alternatief — een sync die afgeleide `BrandRule`-rijen schrijft, naar het precedent van
`brand-rule-sync.ts` — is afgewogen en afgewezen. Het zou de regels wél in de bestaande RulesTab
zichtbaar maken en `contentTypeFilter`/`isActive` gratis meebrengen, maar het vereist een
sync-trigger op zes mutatiepaden (rules-CRUD, beide analyze-routes, finalize, de donts-migratie,
`rescrape-brand --hard`) en zet een tweede kopie van dezelfde waarheid in de database. Dat is
letterlijk de terugkerende bugklasse uit `gotchas.md`: *twee plekken houden dezelfde waarheid bij,
één loopt achter, geen error* (2026-06-24 twee publish-ketens; 2026-07-22 twee accept-deuren).

De heuristics-lane bewijst dat een tweede bron zonder materialisatie werkt: die voedt dezelfde pijler
al met `heuristic:<locale>:<category>:<term>`-ids zonder ooit een `BrandRule`-rij te schrijven.

## D2 — Modaliteit is data, geen gok

Een regel is tekst-checkbaar dan en slechts dan als zijn `constraint` een `modality: 'text'`-variant
is. Geen inferentie uit sectienaam of regeltitel tijdens de scoring: dat zou een heuristiek zijn die
een deduction veroorzaakt, en een foute deduction is duurder dan een gemiste.

```ts
type RuleConstraint =
  | { modality: 'text'; check: 'forbidden-words'; words: string[]; stemVariants?: boolean }
  | { modality: 'text'; check: 'forbidden-pattern'; pattern: string }
  | { modality: 'text'; check: 'required-phrase'; phrase: string }
  | { modality: 'text'; check: 'no-emoji' }
  | { modality: 'text'; check: 'no-exclamation-marks' }
  | { modality: 'text'; check: 'max-sentence-words'; max: number }
  | { modality: 'visual'; property: string; allowed?: boolean; max?: number; value?: string };
```

Elke variant draagt `derivedBy: 'user' | 'deterministic' | 'ai'`, zodat een foute batch gericht
terug te draaien is zonder schemawijziging.

Het vocabulaire sluit aan op het bestaande `RenderConstraints`
(`src/lib/landing-pages/render-constraints.ts`), dat dezelfde scheiding al maakt — `allowEmoji` en
`allowExclamationMarks` staan daar naast `allowGradients` en `maxRadiusPx`, met
`buildCopyConstraintsFragment` als tekst-projectie. Géén tweede begrippenkader, conform de W2-regel
over `source` en het token-provenance-vocabulaire.

De legacy-vorm uit het schema-comment (`{ property: 'gradient', allowed: false }`, zonder `modality`)
parseert als `visual`. Onparseerbare JSON levert `null` + één warn — nooit stil coercen.

## D3 — Nul is zichtbaar, niet stil

De compiler retourneert naast de violations ook `{ evaluated, skippedVisual, skippedUnconstrained }`.
Een workspace met ≥1 regel maar 0 compileerbare tekstregels logt één warn. Het probleem van de spike
was niet dat de score fout was — het was dat de nul onzichtbaar was. UI-surfacing hoort in het
kalibratie-paneel (fase-2 feedback-loop), niet hier.

## D4 — De AI mag classificeren, nooit auteuren

De structurer-pass krijgt bestaande regelteksten en geeft uitsluitend een `constraint` terug. Hij mag
geen regeltekst schrijven, geen regels toevoegen en geen severity wijzigen. De output is strikt
Zod-gevalideerd; ongeldig → weggegooid. `constraint` is **optioneel** in het outputcontract: een
verplicht veld dwingt het model om iets te verzinnen — precies de mechaniek achter de
GEO-stat-citatie-leak (`gotchas.md` 2026-06-24). `source: 'user'`-regels worden overgeslagen
(override is heilig).

## D5 — Structurer-pass in plaats van zes gewijzigde prompt-contracten

W2 schrijft dat de analyzers "per vage kwalificatie 2-3 concrete, testbare regels" meegenereren. Dat
vergt aanpassing van zes JSON-outputcontracten in `analysis-prompts.ts`, raakt de golden-sets en de
niet-destructieve refresh, en helpt bestaande workspaces pas na her-analyse.

In plaats daarvan draait één structurer-pass ná de analyse, over de al geproduceerde regels. Zelfde
uitkomst, veel kleinere blast radius, en — doorslaggevend — hij draait óók over de 311 bestaande
prod-regels zonder her-analyse.

# Gevolgen

**Goed**

- Merkregels bijten aantoonbaar in de scoring; `rulesEvaluated: 0` op een workspace mét regels is
  voortaan een zichtbare, gelogde toestand in plaats van een stille.
- Eén bron van waarheid per regel; geen backfill, geen drift, geen zesvoudige sync-trigger.
- De modaliteit-scheiding is herbruikbaar: de renderer (fase D) leest straks dezelfde
  `modality: 'visual'`-constraints uit hetzelfde veld.
- De `copy`- en `audio`-view van `getBrandLibrary` stoppen met het meesturen van visuele regels.

**Prijs**

- Styleguide-regels verschijnen niet in de bestaande BrandRule-RulesTab; ze hebben (nog) geen eigen
  UI. Authoring loopt via de CRUD-route en scripts tot fase 2 daar een paneel voor bouwt.
- `contentTypeFilter` (per-content-type scoping) geldt niet voor deze bron — dat veld wordt in de
  bestaande lane trouwens ook geschreven maar nooit gelezen.
- Composietscores van workspaces met regels verschuiven omlaag zodra de regels bijten. Gewenst, maar
  het maakt pre/post-vergelijking van pilotcijfers appels/peren; vastgelegd in de changelog-entry.

**Bewust niet nu**

- De judge-lane: harde regels als expliciete checklist in de judge-prompt. De rules-pijler is
  0,4 × 20% ≈ 8% van de composiet, de judge 45% — de hefboom is daar groter, maar het raakt élke
  F-VAL-call en vraagt een eigen kalibratie. Aparte taak.
- Handhaving van visuele constraints in de Puck-renderers (analyzer-plan fase D).
