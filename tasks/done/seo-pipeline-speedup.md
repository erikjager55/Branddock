---
id: seo-pipeline-speedup
title: SEO 8-staps-pipeline versnellen (kwaliteit behouden)
fase: pre-launch
priority: now
owner: claude-code
status: done
created: 2026-07-06
completed: 2026-08-18
worktree: branddock-seo-pipeline-speedup
---

> **Doc-sync 2026-07-12**: alle geplande code is **gemerged op `main`** via PR #83
> (merge `78e802b6`, 2026-07-06) — Fase 0 timings + Fase 1 model-tiering
> (`canvas-seo-research`) + Fase 2 wave-executor — plús een **round 2** die verder
> ging dan dit plan (`3be8f487`: checklist-only stap 8, variant B op het snelle
> model, outline-cap). Er wordt níet meer actief gebouwd; status → `open` omdat de
> rest **meting-gated** is: de deploy-meting (Fase-0-timings + F-VAL-vergelijk, nu
> onderdeel van [`pre-launch-browser-smoke-batch`](pre-launch-browser-smoke-batch.md))
> is de go/no-go voor Fase 3 (context-trim) en Fase 4 (stappen mergen/conditioneel).

## Doel
De SEO-pipeline (~11 min, 8 sequentiële AI-calls) versnellen naar ~5-7 min, met de
**harde randvoorwaarde** dat de draft-kwaliteit niet daalt.

## Kernprincipe (uit de dependency-analyse)
- **Kwaliteit-kritisch** (de prose zélf): stap 6 First Draft + 7 Editorial Review + 8
  Publication Prep → **premium model** (`canvas-text-generate` = Opus 4.7).
- **Mechanisch** (structured research/planning): stap 1-5 → **snel model**.
- **Parallel mogelijk**: alleen stap 2 & 3 (beide hangen enkel aan stap 1). 4-8 strikt
  sequentieel (elk heeft de vorige nodig).

## Geïmplementeerd (deze PR)
- **Fase 0 — Meten**: `SeoPipelineState.timings[]` + per-stap `console.log` (ms + welk
  model). Data leeft in het `SeoGenerationJob.state`-record + de Vercel-logs.
- **Fase 1 — Model-tiering**: nieuwe feature-key `canvas-seo-research` (Sonnet 4.6,
  per-workspace overridebaar). Stap 1-5 draaien hierop; 6-8 op premium. Verwachte
  winst ~-150s zonder kwaliteitsverlies (structured JSON is nauwelijks gevoelig).
- **Fase 2 — Parallellisatie**: de loop is een **wave-executor** geworden
  (`[[1],[2,3],[4],[5],[6],[7],[8]]`); stap 2 & 3 draaien parallel (`Promise.all`).
  Resumable-checkpoint + tiering geïntegreerd; deterministische accumulatie-volgorde.

## Bewust uitgesteld (measurement-gated — na deploy + meten)
- **Fase 3 — Context-trim**: de accumulatedContext groeit elke stap; late calls krijgen
  redundante context (stap 8 krijgt zowel de stap-6-draft als de stap-7-revisie). Trimmen
  is vooral een **kosten-optimalisatie** (input-tokens) met **marginale latency-winst**
  (generatie wordt door output-tokens gedomineerd), en veilig trimmen vraagt per-stap
  context-restructuring wat rond de kwaliteit-kritische late stappen risicovol is.
  → Uitgesteld tot de Fase-0-timing bewijst dat het de moeite/risico waard is.
- **Fase 4 — Stappen mergen/conditioneel**: stap 8→7 samenvoegen of stap 7 overslaan bij
  hoge F-VAL. Raakt de kwaliteit-kritische stappen → **eerst de Fase-0-data van de deploy
  nodig** + een F-VAL-A/B vóór we dit veilig kunnen doen. Niet blind.

## Kwaliteitsborging
- Draft/editorial/prep blijven **non-negotiable op premium**.
- Gegenereerde content krijgt sowieso F-VAL-scoring in de Canvas → dat is de kwaliteitsgate
  bij de smoke (vergelijk score vs een baseline-generatie).
- Tiering is **per-workspace terugdraaibaar** (WorkspaceAiConfig override naar Opus).

## Verificatie (deploy-smoke)
1. Genereer een long-form SEO-deliverable → meet de totale tijd (verwacht ~5-7 min).
2. Check `SeoGenerationJob.state.timings` (of Vercel-logs) → per-stap-latency → bevestig
   dat de research-stappen sneller zijn + waar de resttijd zit (input voor Fase 4).
3. Vergelijk de F-VAL-score + een handmatige lezing vs de ~19K-tekens-baseline van de
   eerdere smoke → kwaliteit moet standhouden.

## Meting (deploy-smoke 2026-07-13 — de go/no-go-gate is gedraaid)

Databronnen: 6 voltooide pilot-runs op prod (6-7 juli, ná de Fase-1/2-deploy) + 1 verse
smoke-run op de actuele deploy (13 juli, smoke-account `erik+claude-smoke-7e@`). Per-stap
uit `SeoGenerationJob.state.timings` (prod-DB), wall-clock uit `startedAt→completedAt`.

**Per-stap (gemiddeld over 6 pilot-runs; verse run vergelijkbaar):**

| Stap | gem. | spreiding | model |
|---|---|---|---|
| 1 kickoff | 16,8s | 12,7-22,9 | snel |
| 2 ‖ 3 (parallel) | 61,6s effectief | — | snel |
| 4 | 43,6s | 35,2-48,3 | snel |
| 5 | 100,4s | 86,2-118,3 | snel |
| 6 first draft | 109,7s | 93,1-123,4 | premium |
| 7 editorial | 102,1s | 82,4-116,4 | premium |
| 8 publication prep | 73,3s | **42,4-130,0** | snel (checklist-only, correctie 4a: stond hier onterecht als premium) |

**Totalen**: wall-clock gem. **10,9 min** (pilot; verse run 12,0 min) vs effectieve
AI-tijd **~7,5-8,5 min** → **2,4-4,5 min niet-AI-overhead** per run (cron-pickup,
checkpoint-persist, context-opbouw, en vermoedelijk de F-VAL-judge ná stap 8 — die valt
búiten de 8 getimede stappen). **Kwaliteit**: F-VAL op de pilot-runs 92,0 en 90,0,
beide threshold-met.

**Verdict (go/no-go per fase):**
- **Doel 5-7 min is nog NIET gehaald** (9-13 min in de praktijk).
- **NIEUW — grootste hefboom: de niet-AI-overhead (2,4-4,5 min).** Eerst uitzoeken waar
  die zit (instrumenteer buiten de stap-calls: context-opbouw, checkpoint-saves,
  F-VAL-judge, queue-gaps) — potentieel gratis winst zonder kwaliteitsrisico. → **Fase 3b
  (overhead-analyse), vóór alles.**
- **Fase 4 (stap 7/8 mergen of conditioneel skippen): GO** — 7+8 kost gem. 2,9 min
  premium-tijd; de stap-8-spreiding (42-130s) suggereert bovendien dat het
  checklist-only-pad niet altijd actief is. Vereist de geplande F-VAL-A/B.
- **Fase 3 (context-trim): NO-GO als latency-maatregel** — de stappen zijn
  output-gedomineerd, precies zoals voorspeld. Hooguit later als kosten-optimalisatie.

**Bijvangst job-queue-smoke (zelfde sessie)**: alle 7 gemigreerde job-types draaiden
end-to-end op de deploy (WEBSITE_SCAN 6m, TREND_RESEARCH 7m, BRANDSTYLE_ANALYZE_URL 3m,
BRANDVOICE_ANALYZE_URL 3m, BUG_REPORT_ANALYZE, CHAT_FEEDBACK_ANALYZE, SEO_GENERATE 12m —
allemaal COMPLETED via de minuut-cron, cross-instance). Kanttekeningen: de
status-GET-routes van brandstyle/brandvoice gaven 404 tegen het smoke-account (jobs
zelf COMPLETED — routegedrag checken bij de eerstvolgende UI-run); DAM auto-tag en
alignment-scan niet gesmoked (vereisen media-upload resp. gevuld merk-DNA).

## Fase 4a uitgevoerd (2026-07-13) — stap 8 ∥ staart

Taak `seo-fase4a-tail-parallel`: stap 8 (checklist-only, snel model) draait nu concurrent
met de variant-B/GEO-staart — beide hingen alleen aan de stap-7-output, de oude volgorde
was pure dependency-graph-verspilling. Verwachte winst: de volledige stap-8-duur
(42-130s) verdwijnt achter de staart. Events/checkpoint/resume-semantiek ongewijzigd
(8-stappen-tracker intact). Bewuste input-delta: variant B ziet de accumulatedContext
zonder het stap-8-checklist-JSON (mechanische ruis over variant A). Samen met de
#388-kick (enqueue→start 2s i.p.v. tot 3 min): verwachte wall-clock ~12 min → ~8 min.
**Validatie-run (2026-07-13, na deploy #388+#389)**: wall-clock **7,5 min** (was 12,0
in de ochtend-run; doel 5-7 vrijwel gehaald). Decompositie sluitend: enqueue→start **0s**
(kick, was 2m53), step:0 setup **0,1s**, stappen 1-7 effectief ~6m0s, concurrent slot
**85,6s** (staart step:10) waarin stap 8 (52,1s) volledig verscholen zit, step:9
restant+persist 33,7s (= 85,6−52,1 + ~0,2s persist — de meting klopt op de seconde).
De run is nu vrijwel pure AI-tijd; outputs gezond (2 varianten 16,7K/17,2K tekens +
checklist met meta-description). Resterende route naar <7 min: **Fase 4b** (stap 7 =
74-102s premium, mergen/skippen) — gegate op de F-VAL-A/B.

**Fase 4b blijft open en gegate op een F-VAL-A/B**: checklist in stap 7 mergen (spaart de
resterende stap-8-call) óf stap 7 conditioneel skippen (~102s premium) — beide raken de
kwaliteit-kritische keten.

## Fase 4b gemeten — verdict: NO-GO, stap 7 blijft (2026-07-14)

Taak `seo-fase4b-editorial-ab`. Gepaard A/B (n=4, BB-prod-workspace, echte pipeline-runs;
arm A = stap-7-`revisedContent`, arm B = stap-6-draft uit exact dezelfde run; scoring
`runFidelityScoring` skipPersist, judge cross-family gpt-5):

| Brief | A (met 7) | B (zonder 7) | Δ | pijler-verschil |
|---|---|---|---|---|
| duurzame merkstrategie (aw) | 79 ✓ | 79 ✓ | 0 | — |
| employer branding (co) | **83 ✓** | **77 ✓** | **+6** | judge 86→77, style 74→70 |
| rebranding (de) | 73 ✗ | 72 ✗ | +1 | — |
| merkarchetypen (aw) | 73 ✗ | 73 ✗ | 0 | — |

Gem. A 77,0 vs B 75,25 (Δ 1,75). **Vooraf geregistreerde regel → NO-GO**: arm B zakt in
2/4 onder de threshold (75) — al doet arm A dat daar óók — en de winst is heterogeen:
meestal 0/+1, maar 1-op-4 een echte **+6** (editorial redt daar aantoonbaar kwaliteit).
Een pass schrappen die soms 6 punten brand-fit levert is pre-launch niet verdedigbaar;
een conditionele gate (mid-pipeline judge ~15s) is met n=4 niet betrouwbaar te bouwen.

**Besluit: stap 7 blijft; de pipeline blijft op ~7,5 min** (t.o.v. 12 vóór #388/#389) —
het restant naar 5-7 min is de kwaliteitsprijs niet waard. Herbezoek alleen met méér
gepaarde data (de harness is herdraaibaar: `scripts/fidelity/fase4b-editorial-ab.ts`).

Bijvangst: 2/4 briefs scoren in béide armen onder de threshold (73) — draft-kwaliteit is
briefing-gevoelig (consistent met de pilot-F-VAL-bevinding), los van de editorial-vraag.

---

# Fase 3 opnieuw beoordeeld (2026-08-18) — geen optimalisatie maar een bug

Fase 3 stond geparkeerd als "context-trim, NO-GO als latency-maatregel, hooguit later
als kosten-optimalisatie". Bij het uitwerken van die kosten-kant bleek de bestaande trim
niet grof maar **omgekeerd**: hij hield precies het verkeerde deel over.

## Wat er misging

`generateAlternativeVariant()` kreeg de volledige `accumulatedContext` met
`.slice(-20000)` erop, onder de kop *"SEO RESEARCH CONTEXT (preserve all SEO elements
from this research)"*. Een tail-slice houdt de **laatste** bytes over, en dat zijn de
prose-stappen — nooit de research.

Blokgroottes over **alle 31 herspeelbare runs** in het archief (4 workspaces),
reproduceerbaar met `npm run fidelity:variant-b -- blocks`:

| Blok in `accumulatedContext` | mediaan | min | max |
|---|---:|---:|---:|
| Stap 1 Project Briefing | 2.631 | 2.250 | 3.429 |
| Stap 2 Keyword Research | 3.194 | 2.688 | 3.639 |
| Stap 3 Competitor Analysis | 5.897 | 4.880 | 7.068 |
| Stap 4 SERP Gaps & E-E-A-T | 4.309 | 3.514 | 5.288 |
| Stap 5 Outline & Internal Links | 9.414 | 7.765 | 11.091 |
| Stap 6 First Draft | 14.549 | 9.808 | 18.229 |
| Stap 7 Editorial Review | 15.404 | 10.735 | 19.532 |

**Het mechanisme**: de prose-staart (stap 6 + 7, mediaan-som **29.953**) is groter dan het
venster van 20.000, dus de slice begon altijd middenin stap 6 of 7 en bereikte de research
(stap 1-5, mediaan-som 25.445) nooit. Uitkomst: **31/31 runs kreeg 0 van de 5
researchstappen door, gemiddeld 0,00.**

⚠️ Een eerdere versie van deze tabel stond op 29 runs. Het meetscript sloeg twee runs stil
over (verwijderde Deliverable-rijen) terwijl het twee ándere skip-redenen wél telde; op het
volledige archief schuift stap 7 met 6,4%. De skip is verplaatst naar de fase die hem écht
nodig heeft, en gemeld.

⚠️ Eerdere versie van deze regel zei "stap 7 is in zijn eentje groter dan de slice". Dat was
fout — stap 7 haalt de 20.000 in geen enkele gemeten run. Het cijfer kwam uit een
parser-bug in mijn eigen meetharnas (zie `gotchas.md` 18-08).

Wat er wél in het venster stond was het artikel — dat één sectie hoger al als
`## ORIGINAL PAGE (Variant A)` in dezelfde prompt zat, nu afgekapt midden in een zin.

Gevolg: **de helft van wat de pipeline oplevert werd geschreven zonder één van de vijf
researchstappen waar hij vijf minuten aan besteedt.** Variant B wordt als
`DeliverableComponent` met `variantIndex: 1` weggeschreven en is gewoon selecteerbaar.

Fase 4a heeft hier langs gekeken: die noteerde als bewuste input-delta dat variant B
"de accumulatedContext zonder het stap-8-checklist-JSON" ziet — een redenering over welk
blok erbíj komt, terwijl de slice er al alles vóór stap 6 uit gooide.

**Bijvangst**: stap 8 (checklist-only) kreeg zowel de stap-6-draft als de stap-7-revisie.
Twee versies van hetzelfde artikel terwijl zijn eigen prompt zegt *"step 7 already
delivered the final prose"*.

Stap 8 schrijft persistent weg (`contentTypeInputs.metaDescription` en
`settings.seoChecklist`, `seo-pipeline.ts:419-455`), dus dit is een gedragswijziging aan
opgeslagen SEO-metadata. Drie reviewers merkten terecht op dat daar alleen de **omvang** van
gemeten was. Inmiddels ook de **output** — zie hieronder.

## Stap 8 gemeten (`npm run fidelity:variant-b -- step8 4`)

Zelfde herspeel-techniek als bij variant B: beide armen krijgen dezelfde gearchiveerde
stap-outputs en hetzelfde voice-directive, alleen de contextselectie verschilt. Tegen de
échte `runStructuredStep`.

⚠️ Nauwkeuriger dan "dezelfde echte state": de armen geven een leeg `brandContext`/
`personaContext`/`productContext`/`briefContext` mee. Dat mag hier, want
`buildPublicationPrepPrompt` gebruikt alléén `accumulatedOutputs` + `voiceDirective` — maar
het is niet de volledige productieprompt, en zodra iemand de brand-context aan stap 8
toevoegt meet dit anders.

| Case | context oud → nieuw | titleTag | metaDescription | overtredingen |
|---|---|---|---|---|
| Linfi | 57.823 → 42.547 | 42 → 42 | 137 → 134 | geen → geen |
| Better brands | 61.431 → 44.709 | 53 → 53 | 150 → 150 | geen → geen |
| Napking | 52.804 → 38.897 | 49 → 49 | 140 → 140 | geen → geen |
| Zwarthout | 65.794 → 47.565 | 46 → 46 | 144 → 144 | geen → geen |

**4/4 cases: geen enkele overtreding in beide armen**, titleTag-lengtes identiek,
metaDescription ruim binnen de 155, `faqSchema` in alle acht armen gevuld, `h1` identiek in
3 van de 4. De weggehaalde 13.907-18.229 tekens kosten de checklist dus niets.

De enige `h1`-afwijking is opvallend genoeg in het voordeel van de nieuwe versie: Zwarthout
gaf OUD *"Shou Sugi Ban **C**harred **W**ood **F**acades: **F**ire-**F**orged …"* en NIEUW
*"Shou Sugi Ban charred wood facades: fire-forged …"* — sentence case, wat de huisregel is
(`seo-prompts.ts:286`, "NEVER use Title Case"). Met n=1 is dat een waarneming, geen claim.

## De fix

Stoppen met een gegroeide blob slicen; selecteren op stapnummer.

- `renderStepBlock(step, rawText)` in `seo-pipeline-utils.ts` — **één** bron voor het
  blokformaat, gebruikt door zowel de accumulatie in `runSeoPipeline` als de selectie.
- `buildStepContext(outputs, steps)` — puur, DB-loos, altijd oplopend op stapnummer.
  Een gevraagde stap die ontbreekt wordt overgeslagen (bewust: deelverzamelingen moeten
  kunnen). Binnen `runSeoPipeline` kan dat niet vóórkomen — de waves garanderen dat stap 1-7
  klaar zijn vóór de twee selectieve aanroepen — maar voor een nieuwe caller is het een
  foot-gun, en dat staat als zodanig in de JSDoc.
- `buildVariantBResearchContext()` + `buildVariantBUserPrompt()` — de pipeline en de smoke
  gebruiken gegarandeerd dezelfde selectie en dezelfde promptopbouw.
- `STEP_CONTEXT_OVERRIDES = { 8: [1,2,3,4,5,7] }` (`Partial<Record<…>>`, want stap 1-7
  hebben bewust geen entry). Stappen zonder override houden exact het oude gedrag.
- De drie `run*Step`-helpers namen `state` maar gebruikten daar alleen
  `accumulatedContext` uit; die krijgen nu de opgeloste string als parameter.
- Vervallen: de gedocumenteerde resume-nuance. Variant B leest niet meer uit de
  groeiende blob maar uit `state.outputs`, dus vers pad en resume-pad zijn identiek.

## Bewijs

- `npm run smoke:seo-context` — **41/41 PASS**, DB- en key-loos. De docstring benoemt per
  sectie wat wél en niet bewaakt wordt; sectie 6 bouwt de variant-B-prompt met exact de
  functies die `runSeoPipeline` aanroept, en sectie 7 leest `seo-pipeline.ts` als tekst om
  te asserten dát de pipeline die functies gebruikt en er nergens nog een tail-slice staat.
  Dat laatste is geen gedragstest, maar het is het enige dat een revert van de fix betrapt.
- **Mutatietesten**, gedraaid tegen de suite zoals die op dat moment was (25 checks in ronde
  1, 31 in ronde 2, 40 nu — de latere checks zijn dus tegen minder mutaties gekalibreerd): RESEARCH_STEPS pakt prose mee (4 checks vallen), sortering weg (1),
  stap-8-override laat de draft weer toe (2), selectiefilter weg (5), blok-separator
  gewijzigd (2-3), variant-B-selectie teruggedraaid (1), research-kop weg (1). De harnas
  zelf is niet gecommit — hij bestaat uit `sed`-mutaties op één bestand, herhaalbaar via de
  opsomming hierboven.
- `npx tsc --noEmit` 0 errors · `npm run lint` 0 errors (964 warnings, ongewijzigd).
- `SMOKE_DB=1 npm run smoke:seo-wiring` — **31/31 PASS**. Draait de échte
  `runSeoPipeline` met een onderschepte `globalThis.fetch` (de Anthropic-SDK pakt zijn
  fetch bij client-constructie uit de global, dus dit vraagt géén productiewijziging;
  module-mocking kán hier niet, esbuild geeft niet-configureerbare getters). Negen
  AI-calls onderschept, nul echte calls, en asserties op de prompts die de pipeline
  daadwerkelijk opbouwt — inclusief drie resume-scenario's: volledig checkpoint, half
  checkpoint (het enige geval waarin de hydratie van `accumulatedContext` zichtbaar is)
  en een checkpoint mét stap 8.
- **Vijf reviewrondes** (10 reviewers), nul bevindingen in de productiecode en zeven in de
  metingen eromheen. Twee reviewers hebben de blokgroottes onafhankelijk her-afgeleid met een
  eigen parser; de tabel hierboven reproduceert op het volledige archief van 31 runs.
- De contextkeuze-check (smoke sectie 7) is empirisch gekalibreerd: drie onschuldige refactors
  (parameter hernoemen, regel afbreken, lokale variabele hernoemen) laten hem groen, en twee
  echte regressies maken hem rood — inclusief `researchContext.slice(-20000)`, de terugkeer
  van dezelfde bug onder een andere variabelenaam.

## Wat hiermee NIET gedekt is

Sectie 7 van de smoke bewaakt de bedrading op broncode-niveau, en de stap-8- en
variant-B-wijzigingen zijn allebei op echte data gemeten. Wat er níét is: een **volledige
pipeline-run van stap 1 tot en met de persist** met de nieuwe code. De gemeten stukken zijn
herspeeld op gearchiveerde state, niet vers gegenereerd.

⚠️ Dat gat wordt níét gedekt door de "Verificatie (deploy-smoke)" bovenaan dit bestand: die
smoke is van 2026-07-13 en kan per definitie niets valideren wat vandaag verandert. Eén verse
long-form-generatie in de Canvas sluit het.

## Buiten scope gelaten

**Prompt-caching**. Er wordt nergens in `src/lib/ai/` `cache_control` gebruikt, terwijl het
Brand-Context-blok **30.032-39.360 tekens** is (live gemeten via `formatBrandContext` over
de 4 workspaces in het archief) en in stap 1, 2 én 6
opnieuw wordt verstuurd. Dat is de grootste resterende kostenhefboom, maar hij raakt élke
AI-call in de app — eigen task + ADR.

## A/B-uitkomst — de fix wint géén kwaliteit, en dat is het antwoord

Gepaarde F-VAL-A/B op herspeelde échte runs (`scripts/fidelity/variant-b-research-ab.ts run 8`),
beide armen dezelfde artikel- en researchinput, judge cross-family, `skipPersist`:

| Case | OUD | NIEUW | Δ | overlap met A |
|---|---:|---:|---:|---|
| Linfi landing-page | 89 | 89 | 0 | 96% → 96% |
| Better brands landing-page | 76 | 75 | −1 | 94% → 96% |
| Napking landing-page | 82 | 82 | 0 | 97% → 95% |
| Zwarthout landing-page | 91 | 91 | 0 | 94% → 97% |
| Linfi landing-page | 87 | 87 | 0 | 97% → 95% |
| Better brands landing-page | 85 | 85 | 0 | 95% → 97% |
| Napking landing-page | 84 | 83 | −1 | 98% → 95% |
| Zwarthout landing-page | 90 | 91 | +1 | 94% → 91% |

**Gemiddelde Δ −0,1 · spreiding −1 tot +1 · n=8 over 4 merken.** Vijf van de acht cases
bewegen niet, drie schuiven één punt. Variant B de volledige research geven verandert zijn F-VAL-score niet.

⚠️ Een eerdere ronde gaf +0,50 (n=4, 2 merken). Die meting was ongeldig: een parser-bug in
het meetscript liet 6.615-9.694 tekens vreemde tekst in het stap-7-blok lekken, die via de
tail-slice **uitsluitend** in de OUD-arm belandde. De bias werkte tegen OUD, dus de schone
meting is vlakker — precies zoals de review voorspelde. Zie `gotchas.md` 18-08.

**Waarom de fix tóch blijft staan** — niet vanwege score, wel vanwege correctheid:
1. De prompt levert nu wat hij belooft. "Preserve all SEO elements from this research" boven
   nul research is een instructie die niet uitvoerbaar is.
2. Stap 8 ziet niet langer twee versies van het artikel.
3. Vers pad en resume-pad geven identieke input; de gedocumenteerde resume-nuance vervalt.
4. Bijvangst uit de review: het opschuiven van het leesmoment naar `executeStep` sluit een
   latente read-after-await in `runCompetitorAnalysisStep`, die `accumulatedContext` eerst
   ná de Gemini-grounding-call las.

Kosten van behouden: nihil. Risico: laag (`tsc`/`lint`/smoke groen, stappen 1-7 aantoonbaar
byte-identiek). Maar het label "quick win voor contentkwaliteit" is het níét.

## De grotere vondst: variant B is geen variant

De A/B mat als bijvangst hoe vér variant B van variant A af staat. Geijkt op de
gearchiveerde artikelen zelf (`variant-b-research-ab.ts calibrate`):

| Vergelijking | woord-overlap |
|---|---:|
| Twee artikelen van verschillende merken | 18,8% (n=320) |
| Twee **verschillende** artikelen (ander onderwerp), zelfde merk | 65,0% (n=145) |
| **Variant B vs variant A** | **90,5-98,3%** (n=16 armen) |

Twee artikelen over totaal verschillende onderwerpen voor hetzelfde merk delen 65% van hun
vocabulaire. Variant B deelt er 90,5-98,3% met variant A — in béide armen, dus het ligt niet aan
de research.

⚠️ Het ijkpunt meet "ander onderwerp, zelfde merk"; er is géén ijkpunt voor "zelfde
onderwerp, andere invalshoek", en dat is precies de vraag. Lees dit als richting, niet als
afgemeten tekort.

Variant B kost per run een volledige generatie (11.484-19.054 tekens output, gemeten over
de 16 armen van de A/B).
Eigen taak: [`seo-variant-b-differentiatie`](../seo-variant-b-differentiatie.md).

## Het bedradingsgat — gevonden en gedicht

Een adversariële review draaide 21 mutaties tegen de toen bestaande suite: alle 6 in
`seo-pipeline-utils.ts` werden gevangen, maar **11 van de 21 in `seo-pipeline.ts` kwamen
langs zowel `tsc` als alle 41 checks** — waaronder een rechtstreekse revert
(`researchContext: state.accumulatedContext`) en het stil weggooien van de stap-8-override.
De pure functies waren goed bewaakt; de aanroepzijde nergens.

`seo-pipeline-wiring.ts` sluit dat. Opnieuw gemeten, tegen dezelfde mutaties:

| Mutatie | vóór | met de bedradings-smoke |
|---|---|---|
| Rechtstreekse revert variant B | 0 FAIL | **1 FAIL** |
| `stepContext` negeert zijn argument (stap-8-override weg) | 0 FAIL | **1 FAIL** |
| Variant B krijgt alleen stap 7 | 0 FAIL | **3 FAIL** |
| Checkpoint-`accumulatedContext` niet gehydrateerd | 0 FAIL | **2 FAIL** |
| Stap-8-hergebruik op resume kapot | 0 FAIL | **1 FAIL** |
| Wave-volgorde `[2,3]` → `[3,2]` | 0 FAIL | 0 FAIL — **terecht** |

Die laatste is geen gat: de `.sort()` in de wave-lus herstelt de volgorde, dus omdraaien
verandert de output niet. De review noemde die sort een no-op die door de WAVES-literal
overbodig werd gemaakt; het is precies andersom — de sort ís het vangnet, en dat is nu
aantoonbaar in plaats van aangenomen.

# Open punten voor Erik (uit de reviewrondes)

1. **De bovengrens op de variant-B-input is weg.** Was hard 20.000 tekens (zij het van het
   verkeerde materiaal), is nu ongebonden — gemeten 22.273-28.442. Stap 3 en 5 groeien mee
   met concurrent-aantal en outline-omvang. Ik heb bewust géén nieuwe cap ingebouwd: elke
   cap moet hele blokken laten vallen (nooit midden in een zin) en welke stap als eerste
   sneuvelt is een productkeuze, geen technische. Zeg het als je die wilt.
2. **Restrisico dat de weggehaalde redundantie afdekte**: valt stap 7 ooit tegen zijn
   24.000-**token**-plafond, dan heeft de checklist geen complete bron meer voor
   `headingStructure`/`imageAltTexts` — stap 6 was die tweede kopie. De gemeten max
   stap-7-output is 19.532 **tekens** (≈5K tokens), dus de marge is ruim ~4×, niet krap.
3. **Deze wijziging gaat als één commit.** Een reviewer stelde voor de stap-8-override
   apart te committen zodat hij los terug te draaien is. Ik doe dat niet omdat de
   wijziging al tot één constante te herleiden is: verwijder de regel `8: [1, 2, 3, 4, 5, 7]`
   uit `STEP_CONTEXT_OVERRIDES` en stap 8 krijgt weer de volledige context. Splitsen zou een
   interleaved diff over drie bestanden vragen voor dezelfde terugdraaibaarheid.
