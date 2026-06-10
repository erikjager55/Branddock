# Audit: LP-tekstkwaliteit + brand-fidelity-score (2026-06-10)

> Onderzoek naar twee PO-klachten: (1) landing-page-teksten zijn kwalitatief laag (em-dash-"AI-tells" zoals *"Wij nemen dit hele circus over—zodat jij nooit meer hoeft na te denken"*), en (2) landing pages scoren structureel het laagst op brand fidelity.
> Methode: 5 parallelle onderzoekssporen (copy-pipeline, judge-pijler, FAQ, DB-empirie, voice-injectie), elke root-cause adversarieel geverifieerd door een onafhankelijke agent, afgesloten met completeness-kritiek. 31 agents, alle claims hieronder zijn code- én DB-geverifieerd.

---

## TL;DR

**De lage fidelity-score (composite 63.0, laagste van 13 types) is voor ~13 punten een MEETARTEFACT en voor de rest een echte copy-kwaliteitskloof.** Beide zijn los van elkaar fixbaar:

1. **Meetartefact**: 46 van 47 LP-scores krijgen een ×0.60 "severely short"-strafkorting op de judge-pijler omdat de LP-scoring-routes geen `targetWordCountOverride` meegeven. Het registry-target voor landing-page is 1550 woorden (midden van WEBSITE_DEFAULTS 100–3000), terwijl LP-variant-copy by design ~440–770 woorden is → ratio altijd <0.5 → ×0.6. Ruwe judge-kwaliteit is 75.4 (middenmoot); opgeslagen 46.2. Zonder penalty: composite **76.1** i.p.v. 63.0 — van plek 13/13 naar middenmoot.
2. **Echte copy-kloof**: het LP-generatiepad omzeilt de complete kwaliteits-machinerie die alle andere content-types krijgen — geen HumanVoiceDirective (em-dash = prohibitie #1), geen model-routing, geen silent auto-iterate, geen STRICT-rewrite. Empirisch: 92% van LP-deliverables-met-copy bevat em-dashes (12× blognorm), het "Geen X, geen Y—alleen Z"-drieslagpatroon zit in 73% van de docs, en de prompt seedt beide patronen zelf.
3. **Dubbele blinde vlek**: de ai-tell-detector mist precies de geplakte em-dash-vorm (`woord—woord` zonder spaties) die het LP-model dominant produceert — dus de tell wordt nooit gestraft én nooit herschreven. (De kale hyphen uit het PO-citaat "over-zodat" bestaat niet in de DB: 0 hits; de bron is altijd een em-dash zonder spaties.)
4. **FAQ-dropdown**: geen bug. Step 3 en de published route werken aantoonbaar; Step 2-preview en de fullscreen-editor blokkeren pointer-events bewust (Puck-design). PO heeft bevestigd dat Step 3 werkt → out of scope.

---

## Deel 1 — Empirische basis

### Scores per content-type (ContentFidelityScore, alle workspaces)

| Type | n | Composite | Style | **Judge** | Rules |
|---|---|---|---|---|---|
| **landing-page** | 47 | **63.0** | 77.2 | **46.2** | 75.9 |
| linkedin-post | 43 | 70.0 | 70.1 | 69.8 | 70.5 |
| blog-post | 26 | 76.4 | 70.6 | 80.7 | 88.1 |
| pillar-page | 16 | 84.1 | 87.9 | 82.3 | 81.1 |
| whitepaper | 6 | 85.0 | 78.5 | 89.8 | 85.7 |

### De beslissende meting: raw vs stored judge

| Type | raw judge-composite (uit subCriteriaScores) | stored | implied multiplier |
|---|---|---|---|
| **landing-page** | **75.4** | **46.2** | **0.61** ← enige type < 0.94 |
| blog-post | 86.2 | 80.7 | 0.94 |
| linkedin-post | 73.9 | 69.8 | 0.95 |
| overige 10 types | — | — | 1.00–1.01 |

46/47 LP-rijen hebben multiplier 0.59–0.61 (= de ×0.6 "Severely short"-penalty); de enige uitzondering (judge 97!) werd gescoord via het canvas-orchestrator-pad **mét** override. Raw judge-subdims gem.: strategic 8.47 / audience 8.49 / brand 7.87 / **antiPattern 5.96** / coherence 7.60 / concreteness 8.40 — antiPattern (AI-tells) is de echte zwakste.

### Tijdslijn: mei-GIGO vs juni-artefact

| datum | n | antiPattern raw | judge stored | oorzaak |
|---|---|---|---|---|
| 2026-05-25/28 | 22 | 2.0–3.2 | 32–41 | page-flatten-soup + écht slechte PURE_AI-copy (Linfi-batch, incl. 10× één placeholder-deliverable "Schrijf hier je inhoud.nbvcxz" = 21% van alle LP-scores) |
| 2026-06-03+ | 25 | 8.5–10 | 52–56 | copy aantoonbaar verbeterd; stored gehalveerd door puur de ×0.6-multiplier |

### AI-tells in de daadwerkelijke copy (per 1000 tekens)

| type | docs | em-dash | dash-glue (w—w) | dash+voegwoord (—zodat/—zonder) | drieslag "geen/geen/alleen" |
|---|---|---|---|---|---|
| **landing-page** | 25 | **1.77** (207×, 23/25 docs) | **0.66** (77×, alléén LP) | **0.45** (53×) | 0.28 (19/26 docs) |
| linkedin-post | 14 | 0.76 | 0 | 0 | 0.13 |
| blog-post | 22 | 0.15 | 0.09 | 0.02 | 0.07 |
| pillar-page | 10 | 0.00 | 0 | ~0 | 0.14 |

Letterlijke voorbeelden uit de DB: *"levering op jouw schema—zodat jij je volledig kunt richten op je gasten"* (Napking), *"Natuurlijke patinavorming versterkt zelfs de bescherming—geen achteruitgang, maar verdieping"* (Zwarthout), *"Geen verf, geen chemicaliën—alleen vuur, vakmanschap en tijd"* (Zwarthout). **Kale hyphen-splices ("over-zodat" letterlijk): 0 hits in de hele DB** — het PO-citaat is een geparafraseerde em-dash; er is géén apart render-/conversiepad.

Sluitend natuurlijk experiment: hetzelfde content-type produceert **25% em-dash-prevalentie via het HVD-beschermde orchestrator-pad** (DeliverableComponent.generatedContent) en **92% via het HVD-loze variant-generator-pad** (23/25 deliverables met structured-variant-copy).

---

## Deel 2 — Geverifieerde root causes

### A. Meting (verklaart de lage score)

**A-RC1 — Length-penalty-artefact ×0.60 [HIGH, verified].**
`resolveTargetWordCount('landing-page')` = (100+3000)/2 = **1550** (`fidelity-runner.ts:158-167` + WEBSITE_DEFAULTS `deliverable-types.ts:213,745`). Geflattende LP-copy (`flatten-variant.ts`) is altijd <775 woorden (gemeten 437–769, gem. ~646 over alle 74 gescoorde variants) → ratio <0.5 → multiplier 0.6 (`g-eval-rubric.ts:161`, toegepast op `:336-337`), die volledig in de judge-pijler landt (`composition-engine.ts:405`). De F33-fix (`targetWordCountOverride=actualWordCount`) bestaat al — maar wordt op precies **één** call-site meegegeven (`canvas-orchestrator.ts:1582-1595`). **Vijf LP-paden missen hem**: `score-variant-fidelity/route.ts:110-120`, `auto-iterate-variant/route.ts:111+184`, `landing-pages/auto-iterate/route.ts:305`, `auto-iterate-integration.ts:103`, `studio/.../auto-iterate/trigger/route.ts:136`. De midpoint-heuristiek is bovendien betekenisloos bij een constraint-bereik zo breed als 100–3000.

**A-RC2 — Score-vervuiling [HIGH, verified — minor contributor].**
Één Linfi-placeholder-deliverable = 10/47 scores (judge 29–37; rationales citeren letterlijk "Schrijf hier je inhoud.nbvcxz" = RichText-defaultProp `puck-config.tsx:2274`). Geen placeholder-guard (enige gate: wordCount<50), geen dedupe bij herhaald scoren van identieke content. Effect op gemiddelde: ~4 punten judge — reëel maar geen hoofdoorzaak.

**A-RC3 — Page-flatten-soup (legacy mei-pad) [HIGH, verified — alleen historisch].**
`puck-data-flatten.ts:26-28` EXCLUDED_KEYS mist asset-keys (lek via `heroVisualUrl`-suffix, footer via `label`), serialiseert FAQ {answer,question} in verkeerde volgorde, en nam unfilled component-defaults mee (2× PricingTable "Starter €19/mnd" op een vloerluiken-pagina). Dit raakte alleen de mei-batch (22/47 rijen, vóór structured flatten-variant per PR #14); het actieve juni-pad gebruikt `flatten-variant.ts` en is schoon. **Caveat (critic):** de "dubbele-secties page-generator-bug die ook rendert" is voor het ACTIEVE structured-pad niet onderbouwd — de huidige composer (`landing-page-from-structured.ts:142-144,215,236`) kan die soup niet produceren. Niet fixen zonder reproductie op een juni-puckData.

**A-RC4 — Drempel-mismatch versterkt het rode beeld [MEDIUM, verified].**
`resolveCompositeThreshold` geeft 'Website & Landing Pages' de long-form default 75. Gecombineerd met de ×0.6-penalty zit 46/47 LP-composites onder 75 → `thresholdMet` 1/47, auto-iterate-skip vuurt nooit, FidelityScoreBar permanent rood. Simulatie zonder penalty: gem. 77.3, 57% ≥75, 94% ≥70. `WorkspaceContentTypeThreshold`-model bestaat maar is leeg én wordt door de fidelity-runner niet gelezen (alleen `auto-iterate-integration.ts:74`).

### B. Generatie (verklaart de lage tekstkwaliteit)

**B-RC1 — HumanVoiceDirective ontbreekt in álle LP-prompts [HIGH, verified].**
`src/lib/studio/human-voice-directive.ts:49-59` ("Em-dash (—) — gebruik NIET… dé AI-tell" + contrast-formules + disclaimer-mantra's) wordt uitsluitend geïnjecteerd in `canvas-orchestrator.ts:320-327` (mode-gated, default BASELINE = aan). Géén van de 5 LP-routes heeft HVD óf de toggle-infrastructuur. Bonus: het LP-system-prompt staat zélf vol em-dashes (schema-descripties/hints) en primet het model.

**B-RC2 — De prompt seedt de AI-tells zelf [HIGH, verified].**
RiskReducer-schema-voorbeeld *'bv "Geen creditcard nodig"'* (`variant-generator.ts:313`) → 19/25 gegenereerde riskReducers gebruiken "— geen verplichtingen"-framing; de instructietaal modelleert de drieslag 4+ keer (`:277,:319,:321`; ook `auto-iterate-variant/route.ts:59`). Daarnaast hardcodet `variant-generator.ts:330` LINFI/Better Brands-voorbeelden in élk workspace-prompt (cross-brand contaminatie-risico).

**B-RC3 — Detector-blindheid voor de dominante tell [HIGH, verified].**
`ai-tell-detector.ts:446-453` em_dash_overuse = `/\S\s*—\s+[a-z]/` — vereist whitespace ná de dash. De geplakte vorm (`ligt—zonder`, 44% van alle LP-em-dashes, in 6/16 versies 100%) matcht NIET. Gevolg dubbel: antiPattern-dimensie (gewicht 0.30, zwaarste) mist de tell (variant met 18 splices kreeg TOP_TIER 2/100 + antiPattern 10/10), én STRICT/auto-iterate (volledig detector-gedreven, `g-eval-rubric.ts:91-96` + `strict-mode.ts:50-85`) herschrijft hem nooit.

**B-RC4 — Geen model-routing, geen kwaliteitsloop [HIGH, verified].**
LP draait op default `claude-sonnet-4-5` (`anthropic-client.ts:96`) en omzeilt `canvas-model-routing.ts:41` ('Website & Landing Pages' → sonnet-4-6, benchmark 91). Geen silent auto-iterate (canvas: `canvas-orchestrator.ts:881-914` bij composite<70), geen STRICT-rewrite (enige call-site `canvas-orchestrator.ts:1662`; 4/8 workspaces staan op STRICT en krijgen voor LP nooit de anti-tell-pass). De bestaande LP-iterate is user-triggered met een uitgeklede rewrite-prompt (alleen brandName+ToV+pijler-getallen, `auto-iterate-variant/route.ts:139-151`) — geen voiceguide-fingerprint, geen findings, CHAT-tier i.p.v. Opus. **Caveat bij routing-fix:** sonnet-4-6 dropt `temperature` (`anthropic-client.ts:100`) → de huidige 0.4/0.7-spread voor variant-divergentie wordt no-op; divergentie via angles/axes borgen.

**B-RC5 — Vocab-rails botsen met de detector (interne tegenspraak) [MEDIUM, verified].**
VocabularyDo wordt dubbel geseed (`variant-generator.ts:197` + `:354` via brand-context) en de detector heeft géén brand-vocab-whitelist — hij bevat letterlijk Linfi-seedwoorden ('naadloos' `ai-tell-detector.ts:248`, 'op maat' `:274`). De judge prijst en bestraft dezelfde woorden in één score-rij. Plus data-defect: Linfi heeft 'exclusief'/'luxe' in zowel vocabularyDo als wordsWeAvoid. Verklaart Linfi's judge-deficit (antiPattern 2.2, n=20); Napking/Zwarthout scoren antiPattern 8+ en lijden alleen onder de multiplier.

**B-RC6 — Fabricage + kapot NL wordt beloond [MEDIUM, verified].**
De prompt dwingt een testimonial mét outcome-cijfer af zonder brondata → verzonnen "Nul stock-outs in 18 maanden"/"Jeroen de Vries". Concreteness-judge beloont dit (9/10 "versterkt de tastbaarheid"); brandRecognition prijst zelfs het afgekapte idioom *"Zonder omkijken naar."* als merkstem. Geen enkele F-VAL-laag checkt grammatica of factualiteit.

**B-RC7 — Dode endpoints met latente bugs [verified als tech-debt, geen actieve impact].**
`generate-page` (silent heuristic-fallback "Welkom…"), `strict-rewrite` (vaste 2400 maxTokens = truncatie-bug die auto-iterate al gefixt kreeg; geen TEXT_FIELDS-merge; geen auth), `component-edit` (600 tokens, geen voice) — **geen enkele frontend-caller**. Fix-of-verwijder vóór wiring.

### C. Observability-gaten (critic)

- **LP-generatie is onzichtbaar voor de prompt-registry/learning-loop**: 0 AICallSnapshot/AICallTrace-entries voor variant-generator (DB-geverifieerd; canvas-orchestrator/seo-pipeline/alignment wél). Succes van copy-fixes is met bestaande dashboards niet meetbaar.
- **Golden-set test de verkeerde prompt**: `tests/content-golden-sets/website/landing-page.yaml` evalueert een generieke MECLABS-markdown-prompt, niet productie-`buildLandingPageVariantPrompt`.
- **Style-pijler (35%) is voor 3 van 4 LP-workspaces puur lexicale keyword-coverage** (alleen Better Brands heeft een centroidEmbedding; `style-scorer.ts:186`, embedding-blend `composition-engine.ts:360-377` inactief) → beloont exact het vocab-stuffing dat de judge bestraft. Fix-interactie: vocab-demping kan style drukken; centroid-backfill (W-1 full, staat in open backlog) of scorer-aanpassing nodig voor 80+.
- **Locale hardcoded** `'nl-NL'` in het LP-pad (`generate-structured-variant/route.ts:173`) i.p.v. voiceguide.contentLocale > workspace.contentLanguage.
- judgeCallTraceId=NULL is systeembreed (vrijwel alle types), géén LP-bug — uit dit plan houden.

### D. FAQ-dropdown — geen bug (gesloten)

Component is intact (browser-repro met identieke code: toggle werkt). Step 3 preview-first én published route (`/p/[slug]`, RSC met native `<details>` zonder JS) functioneren. Onklikbaar zijn alléén: (1) fullscreen Puck-editor (`[data-puck-component] * { pointer-events: none }` — by design; Puck 0.21.2 heeft native `previewMode: 'interactive'` als dit ooit gewenst is) en (2) Step 2 "Leesbare preview" (`LandingPageGenerateBlock.tsx:1074` expliciet `pointerEvents:'none'`). PO bevestigde 2026-06-10: Step 3 werkt — out of scope.

---

## Deel 3 — Verbeterplan

> Composite-trajectorie: Fase 1 alleen → ~76 (middenmoot). Fase 1+2+3 → raw judge 75→85+, antiPattern 6→8.5+ → composite **~80–83**. Voor structureel 85+ is daarna de style-pijler-modernisering (Fase 6) nodig.
> **Scope-keuze**: fixes in `variant-generator.ts`/HVD gelden automatisch voor álle PUCK_WEBPAGE_TYPES (product-page, faq-page, comparison-page, microsite — gedeelde generator). Word-targets (Fase 1) per type parameteriseren.
> **Sequencing**: worktree staat op `feat/lp-editor-image-field` (parallelle image-workstream, raakt puck-config/PuckPageBuilder — geen file-overlap met dit plan). Dit plan in eigen branch vanaf main ná (of naast, met file-ownership) die landing.

### Fase 1 — Meting eerlijk maken (~0.5–1d) → grootste hefboom, nul copy-wijziging

1. **LP-realistische word-targets in het registry** (dekt alle 5 score-paden in één keer, robuuster dan per-route overrides): landing-page `minWords ~400 / maxWords ~900` (empirisch gem. 646) in `deliverable-types.ts`, of expliciete per-type target-map in `resolveTargetWordCount` (`fidelity-runner.ts:158-167`). Zelfde oefening voor de overige webpage-types.
2. **Defense-in-depth**: `targetWordCountOverride` à la F33 meegeven in `score-variant-fidelity` en `auto-iterate-variant` (de 2 actieve routes).
3. **Placeholder-guard + dedupe**: bekende default-strings ("Schrijf hier je inhoud") weigeren vóór `runFidelityScoring`; identieke content-hash niet herhaald laten meetellen.
4. **Drempel herijken ná 1–3**: Website-groep naar ~70 óf `WorkspaceContentTypeThreshold` wiren in `resolveCompositeThreshold` (simulatie: 94% ≥70).
5. **Baseline resetten**: oude 47 rijen markeren/heranalyseren zodat dashboards mei-GIGO niet met juni-rijen vermengen.

### Fase 2 — Copy-kwaliteit: prompts (~1–1.5d) → de échte tekst-fix

6. **HVD inwiren** in `buildSystemPrompt` (`variant-generator.ts`) + de auto-iterate-variant rewrite-prompt, mét de bestaande mode-gating (resolveHumanVoiceMode). Em-dashes uit het system-prompt zélf strippen (model-priming).
7. **Anti-patroon-regels LP-specifiek**: drieslag "Geen X, geen Y — alleen Z" max 1×/verbieden; riskReducer-voorbeeld vervangen door niet-"Geen"-formulering; instructietaal die het patroon modelleert herschrijven (`:277,:319,:321` + `auto-iterate-variant/route.ts:59`). Zelfde regel naar de pillar-page-prompt (patroon zit daar ook).
8. **Cross-brand contaminatie weg**: LINFI/Better Brands-voorbeelden op `:330` → dynamisch uit ctx.
9. **Model-routing**: LP door `resolveCanvasModelForContentType` (sonnet-4-6); variant-divergentie borgen via angles/axes (temperature wordt gedropt op 4-6).
10. **Anti-fabricage**: testimonial/stats zonder brondata → expliciet als invulvoorbeeld markeren in schema/UI i.p.v. verplicht verzonnen cijfers; locale uit voiceguide.contentLocale i.p.v. hardcoded nl-NL.

### Fase 3 — Meting eerlijker: detector (~0.5d) → NÁ Fase 2, anders dippen scores eerst

11. **Detector-uitbreiding**: extra pattern `/[a-zà-ü]—[a-zà-ü]/` (glued em-dash) naast het bestaande; optioneel hyphen-splice-variant. Severity SOFT.
12. **Detector↔vocab-verzoening**: geseede vocabularyDo-woorden whitelisten in de detector (óf detector-lexicon-woorden uit seed-lijsten weren) + do/avoid-dedup bij scrape/onboarding (Linfi 'exclusief'/'luxe' in beide). Quick check rules-pijler: GROUP BY ruleViolations om do/avoid-contradicties breed te vinden.

### Fase 4 — Kwaliteitsloop-pariteit (~1d)

13. **Silent iterate na batch-generatie** bij composite < drempel (per variant parallelliseerbaar), hergebruik de auto-iterate-integration-bouwstenen (voiceguide-fingerprint 2500 chars + BrandReviewFindings + Opus-rewrite) in JSON-variant-vorm.
14. **STRICT-pariteit**: variant-JSON-versie van de STRICT anti-tell-rewrite voor humanVoiceMode=STRICT workspaces (nu 4/8).
15. **Rewrite-prompt verrijken** van de bestaande user-triggered iterate (nu alleen brandName+ToV).

### Fase 5 — Meetbaarheid (~0.5d)

16. **AICallSnapshot-capture** voor variant-generator (patroon: canvas-orchestrator `generateTextWithFallback`) → prompt-registry + learning-loop zien LP eindelijk.
17. **Golden-set op de echte prompt**: `buildLandingPageVariantPrompt` exerceren i.p.v. de MECLABS-markdown; em-dash/drieslag-assertions opnemen.
18. **Re-score & vergelijk**: na Fase 1–4 een batch verse scores draaien; doel composite ≥75 gem., antiPattern ≥8.
19. **Flatten-hygiëne** (laag prio, env-gated pad): `puck-data-flatten.ts` suffix-matching voor asset-keys, sectie-labels, FAQ-volgorde.

### Fase 6 — Opt-in vervolg (apart te besluiten)

20. **Style-pijler-modernisering**: centroid-backfill voor de 3 workspaces zonder embedding (W-1 full uit open backlog) of coverage-cap in style-scorer — nodig om >85 betrouwbaar te maken en vocab-stuffing-beloning te stoppen.
21. **Dode endpoints**: generate-page/strict-rewrite/component-edit fixen (schalende maxTokens, TEXT_FIELDS-merge, auth) óf verwijderen.
22. **Taal/factualiteits-check** als aparte F-VAL-dimensie of pre-publish-gate (kapot idioom "Zonder omkijken naar.", EN/NL-mix).

### Niet doen (bewust)

- ~~Twee-fase generatie (skeleton → FAQ)~~ — tells zijn pagina-breed uniform verdeeld (faq 1.52/1k ≈ hero 1.56), attention-smearing is niet de oorzaak; HVD + detector-sweep volstaan.
- ~~Composer-fix voor dubbele secties~~ — alleen het dode mei-pad; eerst reproduceren op juni-puckData, anders dood-pad-fix.
- ~~judgeCallTraceId-wiring als LP-werk~~ — systeembrede observability-gap, hoort in generiek werk.
- ~~Hyphen→em-dash render-zoektocht~~ — kale hyphens bestaan niet in de data (0 hits).

---

## Bijlage: sleutelbestanden

| Gebied | Files |
|---|---|
| LP-prompt | `src/lib/landing-pages/variant-generator.ts` (systemprompt 169-341, vocab 192-201, riskReducer-seed 313, brand-hardcode 330) |
| Scoring | `src/lib/brand-fidelity/fidelity-runner.ts` (target 158-167, threshold 182-194), `g-eval-rubric.ts` (multiplier 154-166, 336-337), `composition-engine.ts:405` |
| Score-routes zonder override | `score-variant-fidelity/route.ts:110`, `auto-iterate-variant/route.ts:111+184`, `landing-pages/auto-iterate/route.ts:305`, `auto-iterate-integration.ts:103`, `studio/.../auto-iterate/trigger/route.ts:136` |
| Guards | `src/lib/studio/human-voice-directive.ts:49-59`, `src/lib/brand-fidelity/ai-tell-detector.ts:446-453`, `strict-mode.ts:50-85` |
| Registry | `src/features/campaigns/lib/deliverable-types.ts:212-213,736-748` (WEBSITE_DEFAULTS) |
| Flatten | `src/lib/landing-pages/flatten-variant.ts` (actief), `puck-data-flatten.ts:26-28` (legacy/env-gated) |
| Model-routing | `src/lib/ai/canvas-model-routing.ts:41`, `anthropic-client.ts:96-100` |
