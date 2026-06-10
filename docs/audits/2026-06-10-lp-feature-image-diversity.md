# LP feature-images: diversiteit + tekst-relevantie — diagnose & verbeterplan

> **Datum**: 2026-06-10
> **Aanleiding**: Napking landing page (deliverable `cmq48xfjx00000ymscq5ro7eh`) toont 4 vrijwel identieke feature-foto's (chef, gekruiste armen, frontaal, keuken) die niet passen bij de sectieteksten (HACCP-reiniging / voorraadbeheer / duurzaam textiel / elektrische levering).
> **Methode**: 3 multi-agent workflows — 6 recon-agents (code + DB-empirie + disk + visuele verificatie thumbnails), 3 onafhankelijke plan-ontwerpen + 2-koppige jury, 4 adversariële verifiers op de integratiepunten van de synthese. Alle file:line-claims hieronder zijn tegen de code geverifieerd.
> **Status plan**: goedgekeurd ontwerp, implementatie nog niet gestart. Task-file: `tasks/lp-feature-image-diversity.md`.

---

## 1. Symptoom

- 4 feature-beelden per pagina, allemaal "man in koksbuis met gekruiste armen, frontaal, in keuken" (visueel geverifieerd op de actieve 10-jun-batch).
- Beelden matchen de sectie-copy niet; alleen foto 4 heeft toevallig een bus (de feature-body noemde "elektrische vloot" expliciet).
- Hero is WÉL passend — maar dat is geen AI-gen: het is een handmatig gekozen library-foto (`pexels-rene-terp`, `imageSource='library:…'`).
- Patroon herhaalde zich over 6 generatie-batches (7/8/10 jun) en 2 deliverables → structureel, geen toeval.

## 2. Diagnose — 9 root-causes (gerangschikt)

### R1 — Scrape-beschrijving van één foto wordt prescriptieve stijl-laag (smoking gun)
`BrandStyleguide.photographyStyle` (Napking) bevat letterlijk: mood = *"OBSERVED: …The hero image shows a confident chef in a real kitchen environment…"* en composition = *"OBSERVED: Subject centered with arms crossed in confident pose, shallow depth of field with kitchen equipment…"*. Dit is een **beschrijving van Napkings ene bron-hero-foto**. `mapPhotographyTokens` (`src/lib/landing-pages/brand-tokens-v4-mappers.ts:464-488`) plakt mood+composition+subjects als `promptFragment` in **elke** hero- én feature-prompt via `buildFeatureVisualInstruction` (`src/features/campaigns/lib/landing-page-visual-prompts.ts:69-90`). Descriptief scrape-resultaat → prescriptief generatie-commando; geen scheiding tussen stijl-dimensies (licht/mood/kleur — veilig deelbaar) en onderwerp/compositie (per-beeld).

### R2 — `slice(0,500)` kapt exact het diverse "Subjects:"-deel af
Voor Napking consumeren mood (~258ch) + composition (~360ch) de hele cap; het `Subjects:`-deel — *"close-ups of pristine textiles (folded napkins, pressed chef jackets), behind-the-scenes laundry operations, hands interacting with textiles"*, precies de diverse onderwerp-pool die bij de 4 features past — valt **volledig** weg (empirisch gereproduceerd: cut op "…environmental portraits that show context"). Comment zegt "max 200 chars", code doet 500; truncatie soms mid-woord ("with or" in een gepersisteerde hero-prompt). `stripObservedPrefix` stript alleen het leading prefix; mid-string `RECOMMENDED:` blijft staan.

### R3 — Feature-pad omzeilt de complete kwaliteitsmachinerie (die al gebouwd is)
`POST /api/studio/[id]/generate-feature-visuals` (header r8: *"Lean: … géén fidelity-scoring/logo-overlay/picker-persist"*) accepteert client-prompts **verbatim**: geen `buildVisualBriefImagePrompts`-basis, geen ANGLE_SETS (de hero krijgt wél *"NO portrait pose facing camera"*), geen subject-seed, `numImages:1` (hero: multi-candidate 3), geen copy-image-coherence-judge (G4 bestaat: `src/lib/brand-fidelity/copy-image-coherence-judge.ts`, Haiku ~$0.001), geen refine-loop, geen OCR. Geen persist: geen `DeliverableComponent`, geen `imagePromptUsed`, geen `AICallTrace` → auditability-gat (de letterlijke prompts moesten voor deze diagnose gereconstrueerd worden). Vrijwel alles uit §3.0.5/§3.0.6 (`tasks/done/image-quality-chain.md`, #253, 2026-05-17) is gebouwd maar niet op dit pad aangesloten. **Het plan is dus vooral wiring-werk, geen nieuwbouw.**

### R4 — Cross-image (set-niveau) diversiteit bestaat nergens als concept
4 parallelle calls, ~600 chars identieke staart vs ~150-250 chars feature-specifiek, geen seed-variatie, geen "must differ"-instructie, geen post-gen similarity-check. De enige diversiteits-gates in de codebase zijn tekstueel (`validateAngleDiversity`, ad asset-diversity).

### R5 — Governance-bypass: ongereviewde scrape stuurt, gereviewde donts geblokkeerd
`canvas-context.ts:519-556` leest `photographyStyle` **zonder** published/imagerySavedForAi-gate (Napking: beide false), terwijl `brand-context.ts` (`published`-blok r1239 met daarbinnen de imagery-gate r1327) `brandImageryStyle`/`imageryDonts` wél gate-t. Napkings 6 gecureerde donts (o.a. *"Don't use stock photos of generic 'happy restaurant workers'"*) bereiken **geen enkel kanaal**; de ongereviewde scrape lekt via de brandTokens-zijdeur.

### R6 — Negative-prompts zijn op het LP-pad effectief no-op
Het LP-default-model `fal-ai/nano-banana-pro` heeft geen native `negative_prompt`-param (fal fail-soft negeert hem); de tekst-fallback `formatNegativeAsPromptDirective` (`negative-prompts.ts:155`) wordt in het fal-pad nooit aangeroepen. De feature-route geeft `brandImageryDonts` sowieso niet door (`buildNegativePrompt()` zonder args, route r75).

### R7 — Geen LLM-image-brief per sectie
`structuredVariant.features.items` = `{icon, heading, body[, imageUrl]}` — geen brief-veld; de copy-LLM (`variant-generator.ts`, volledige brand/persona-context) produceert nul visuele richting; prompts worden post-hoc mechanisch uit copy-strings gebouwd. Een abstract onderwerp ("automatisch voorraadbeheer") wordt zo nooit vertaald naar een concreet, onderscheidend beeld. Precedent: het video-pad lost dit al op met per-scene `[VISUAL:]`-blokken.

### R8 — Bron-laag dood/incompleet
`BrandStyleguide.brandImages` = JsonNull voor alle scrapes sinds `a3c49ecf` (2026-04-10; `analysis-engine.ts:2404` cleart het veld, beelden gaan naar Media Library mét categorie via `CONTEXT_TO_CATEGORY`) → `assignBrandImagesToVariant` is dode code behalve voor Adullam, en zelfs daar blind sequentieel (alt/context geparsed maar genegeerd). LibraryAssetPicker-picks 2-3 zijn orphaned by design. `ImageSourcePanel.target = z.enum(['hero'])` — geen feature-target. Napkings 10 `brandStyleAnchorIds` zijn **alle orphaned** (assets verwijderd) → silent `[]` zonder warning. Embedding-dekking workspace-breed: 0/521 image-embeddings, 1/521 aiDescriptions → library-matching heeft vandaag niets om tegen te matchen (cold-start is de universele toestand, geen randgeval).

### R9 — Feature-imageUrls hebben geen clobber-guard
Hero heeft een dubbele guard (`preserveHeroVisual` client + `preserveHeroOnSettings` server); feature-beelden kunnen door een wholesale settings-replace stil gewist worden — zelfde bug-klasse als de hero-clobber van 2026-06-08/09.

## 3. Ontwerp-proces

Drie onafhankelijke plannen (brief-first / pipeline-first / source-first) + 2-koppige jury. Uitslag: verdeeld (jurylid 1 → pipeline-first 42 pt, jurylid 2 → brief-first 41 pt), maar de grafts convergeerden eenduidig naar een **merge van brief-first + pipeline-first**, met source-first gereduceerd tot tooling-opstap. Doorslaggevende jury-bevindingen:

- **Source-first als hoofdas afgewezen**: cold-start is universeel (0/521 embeddings; Napking heeft maar 2 library-assets), grootste footprint op beschermde workstream-files, en "echt-maar-fout beeld is erger dan goed AI-beeld".
- **pgvector-pairwise op verse beelden kan niet** (G2 embedt aiDescription-TEKST, geen pixels) → set-diversiteit via één multi-image Haiku-judge + runner-up-swap.
- **Blind multi-candidate (2-3×) afgewezen als default**: verdubbelt paginakosten ($1.05+) vóór er een budget-hedge is; gerichte judge+retry ($0.53-0.79) corrigeert preciezer.
- **Hero-nuance**: de observed compositie kwam van een échte hero-foto en is dáár legitiem — hero behoudt `compositionFragment`, features niet.

Daarna zijn 20 integratiepunt-claims adversarieel geverifieerd (4 agents): 11× klopt, 9× klopt-deels met correcties (verwerkt in §4), 0× fout. Open empirische vragen: honoreert nano-banana-pro `seed`/`num_images>1`? (nul evidence in code/experiments — pre-check in Fase 3).

## 4. Verbeterplan — 6 fasen (~8,5-9,5 dagen, elk zelfstandig shipbaar)

### Fase 0 — Quick-wins: truncatie, governance-gate, werkende negatives, doc-sync (1 dag)
**Dekt R2, R5, R6 + R8-mini.** Direct zichtbaar resultaat: de chef-pose verdwijnt uit elke Napking-prompt.

| File | Wijziging |
|---|---|
| `src/lib/landing-pages/brand-tokens-v4-mappers.ts` | Per-segment word-safe budget (mood ~160 / composition ~160 / subjects ~180 chars) i.p.v. join+`slice(0,500)` — Subjects-pool overleeft altijd; comment ("max 200") in sync met code; `stripObservedPrefix` → globale strip van mid-string `OBSERVED:`/`RECOMMENDED:`/`NOTE:`-markers. |
| `src/lib/ai/canvas-context.ts` | Styleguide-select (r519-556) + `published`/`imagerySavedForAi`; `photographyStyle` nullen wanneer **niet** (published && imagerySavedForAi) — exact de brand-context-semantiek (gate zit dáár bínnen het published-blok, r1239→1327). NB: bij gate-dicht worden photography-tokens leeg; de archetype-fallback zit op prompt-builder-niveau (`pickHeroImagePromptFragment`, tier-2 in `landing-page-visual-prompts.ts:49-51/83-84`) — niet in de mapper. |
| `src/lib/integrations/fal/fal-providers.ts` | Optioneel veld `supportsNegativePrompt` op `FalProvider` in `ALL_FAL_PROVIDERS` (false voor nano-banana-familie). NB: `MODEL_META` (image-suggestion) en `ALL_FAL_PROVIDERS` zijn gescheiden registries; `getFalProviderById` returnt null voor onbekende ids → expliciet default-gedrag: onbekend model = huidige fail-soft (native param meesturen). |
| `src/lib/integrations/fal/fal-client.ts` | Consumptie op r409-410: geen native support → `formatNegativeAsPromptDirective` aan de prompt-tekst appenden, **vóór/inclusief her-toepassing van `truncatePromptForModel`** (cap 3000 default; directive cappen op ~15 segmenten). |
| `src/app/api/studio/[deliverableId]/generate-feature-visuals/route.ts` | r75: `buildNegativePrompt({ brandImageryDonts: stack.brand?.brandImageryDonts ?? [] })`. |
| `src/lib/ai/brand-style-anchors.ts` | `console.warn` bij geconfigureerde anchor-ids die naar 0 levende assets resolven (Napking: 10 orphaned, nu silent). |
| Docs | `roadmap.md` r83 (image-quality-chain → done #253); `tasks/web-page-builder-canvas-step-mvp.md` remaining de-stale-en; `gotchas.md` 2 lessen (descriptieve scrape-output lekt prescriptief; comment-vs-code-drift bij truncatie-limieten). |

**Vooraf**: SQL-inventaris welke actieve workspaces `imagerySavedForAi=false` hebben (`psql … -c 'SELECT w.name, b.published, b."imagerySavedForAi" FROM "BrandStyleguide" b JOIN "Workspace" w ON w.id=b."workspaceId"'`) + changelog/release-note — de gate verandert zichtbaar prompt-gedrag van bestaande workspaces.
**Smoke**: nieuw `scripts/smoke-tests/photography-token-truncation.ts` met Napkings echte photographyStyle als fixture (Subjects aanwezig, geen mid-woord cut, geen RECOMMENDED-residu, gate-dicht → leeg fragment); fal-client unit (nano-banana → directive, flux → native param); bestaande web-page-builder-suite groen.

### Fase 1 — Stijl/onderwerp-splitsing in PhotographyTokens (1 dag)
**Dekt R1.**

| File | Wijziging |
|---|---|
| `src/lib/landing-pages/brand-tokens.ts` | `PhotographyTokens`: `promptFragment` wordt stijl-only (mood); nieuw `subjectPool: string[]` (geparsede onderwerpen) en `compositionFragment: string\|null`. |
| `src/lib/landing-pages/brand-tokens-v4-mappers.ts` | Splitsing: mood → gedeeld fragment; subjects → subjectPool (split op komma/punt-komma); composition → apart `compositionFragment`, NIET in het gedeelde fragment. |
| `src/features/campaigns/lib/landing-page-visual-prompts.ts` | `buildHeroVisualInstruction` gebruikt stijl-fragment + `compositionFragment` (hero = 1 beeld; observed compositie van een echte hero-foto is daar legitiem). `buildFeatureVisualInstruction` alléén stijl-fragment — interim tot Fase 3. |

**Smoke**: Napking-fixture → feature-prompt bevat geen "chef"/"arms crossed"/"subject centered"; hero behoudt mood + compositie; subjectPool bevat textiel/wasserij/handen-items.

### Fase 2 — imageBrief als first-class output van de copy-LLM (1,5-2 dagen)
**Dekt R7 + R4 (brief-niveau).** Het `[VISUAL:]`-precedent van het video-pad, gestructureerd.

| File | Wijziging |
|---|---|
| `src/lib/landing-pages/variant-schema.ts` | Nieuw `imageBriefSchema`: `{ subject: string, sceneType: z.enum(['object','process','location','detail','person']), composition: string, avoid: string optional }` — als `.nullable().optional()` op `featureItemSchema` én `heroSchema` (bestaande persisted variants parsen ongewijzigd). |
| `src/lib/landing-pages/variant-generator.ts` | imageBrief-velddefinitie in het OUTPUT-SCHEMA JSON-shape-blok (r282-299); nieuwe regel in het `# KRITISCHE REGELS`-blok (r318-332, wordt nr 15): *"elke feature-imageBrief visualiseert HET BEWIJS van DIE feature; de briefs moeten onderling verschillende sceneTypes óf duidelijk verschillende subjects hebben; max 1 person-scene per pagina; geen frontale portret-pose"*. `maxTokens` 3500→4500 (r523). |

**Let op (geverifieerd)**: er bestaat géén validation-feedback-retry in `generateLandingPageVariant` — alleen batch-level temperature-retry. De optionaliteit van het veld is de vangrails; eerste live-runs monitoren op parse-failures/afgekapte responses.
**Smoke**: phase7-schema-fixtures (mét/zónder brief, ongeldige sceneType faalt); live run Napking + Better Brands: 4 briefs met ≥3 verschillende sceneTypes, 0 identieke subjects.

### Fase 3 — Server-side brief-gedreven prompt-bouw + persist (2 dagen)
**Dekt R3 (prompt-bypass + audit) + R4 (prompt-laag).** De route wordt dé seam waar stijl, briefs, seeds, negatives en straks judges samenkomen.

| File | Wijziging |
|---|---|
| `src/lib/landing-pages/feature-visual-prompts.ts` (NIEUW) | `buildFeatureVisualPrompts(features, pageHeadline, stack)`: subject = `imageBrief ?? heading+body`-fallback; sceneType-templates (object→product-still / process→handen-in-actie / detail→macro-textuur / location→omgeving / person→niet-frontale candid); `FEATURE_ANGLE_SETS`-rotatie per index (patroon `ANGLE_SETS`, incl. "NO frontal posed portrait"); `subjectPool` als inspiratiepool; sibling-differentiatie-regel (*"image i of N — depict a clearly different subject and camera distance than: [sibling-subjects]"*); essentials-eerst-ordening i.v.m. de 3000-char modelcap. |
| `generate-feature-visuals/route.ts` | Request-contract v2: `{ features: [{index, heading, body, imageBrief?}], pageHeadline }` naast legacy `prompts` (één release deprecated). Bestaande `findFirst` (r46-49) uitbreiden met `select: { id: true, settings: true }` → structuredVariant server-side lezen. Per-index `seed` doorgeven (zod is `.strict()` — schema-uitbreiding nodig). **Pre-check**: empirisch verifiëren of nano-banana-pro seed/num_images honoreert (mini-script in `scripts/experiments/`); zo niet → diversiteit leunt op prompt + judge (Fase 4 is dan geen optionele extra). Persist: `DeliverableComponent` per beeld, `variantGroup 'feature-visual:<index>'` (encoding-conform `'visual:<sceneId>'`), velden `imageUrl/imageSource/imagePromptUsed/aiProvider/aiModel/generationDuration/iterationCount` (alle geverifieerd in schema), fail-soft patroon van generate-visual r496-538 + `invalidateCache`. Route-header-comment actualiseren. |
| `src/features/campaigns/api/canvas.api.ts` | **[RAAKVLAK]** additieve v2-payload naast legacy signatuur. |
| `LandingPageGenerateBlock.tsx` | **[GEDEELDE HOTSPOT]** needIdx-blok (r461-488): payload-swap naar features+pageHeadline; Promise.race-ceiling 60s→120s. |
| `PuckPageBuilder.tsx` | **[GEDEELDE HOTSPOT]** `fillFeatureImages` (r247-290): zelfde swap + timeout-race toevoegen (gap-fill heeft er nu géén). **Valkuil (geverifieerd)**: `featureGaps` scant alle FeatureGrid-componenten en de TrustStrip rendert óók als FeatureGrid — trust-logo-items uitsluiten van gap-detectie. |

NB: `DeliverableComponent`-rows dienen audit/refine/scoring — de Puck-renderer blijft puckData lezen (anders reproduceer je de orphaned-rows-val van R8). Optionele follow-up: `AICallTrace`-koppeling via bestaand `primaryCallTraceId`-veld.
**Smoke**: prompt-lib unit (4 features → 4 onderling verschillende prompts, brief wint van heading/body, geen stijl-staart-leak); route-contract v2 + legacy; persist-rows; tsc/lint 0.

### Fase 4 — Kwaliteitspoort: paired coherence + set-diversity + budget-capped retry (2 dagen)
**Dekt R3 (gates) + R4 (verificatie).** Default = single-candidate + gerichte retry (~$0,53-0,79/pagina vs $0,52 huidige ongecontroleerde baseline).

| File | Wijziging |
|---|---|
| `generate-feature-visuals/route.ts` | Per beeld `runCopyImageCoherenceJudge(imageInput, contentText)` met **uitsluitend de eigen feature-copy** (heading+body+brief) als contentText → paar-i-vs-paar-i zonder de judge-file te wijzigen (signatuur geverifieerd; null-faalveilig). Lokale `/uploads`-beelden als **base64 via disk-read** (`public/` + pad, patroon `visual-fidelity-scorer.ts:290-301`) — Anthropic url-source werkt niet op localhost. |
| `src/lib/brand-fidelity/feature-set-diversity-judge.ts` (NIEUW) | Eén multi-image Haiku-call met de 4 beelden → near-duplicate paren. Vehikel: `createClaudeStructuredCompletion` (`src/lib/ai/exploration/ai-caller.ts`, `options.images` = buffers) — **niet** `anthropicClient` (die dropt image-content; geverifieerd). ~$0,005/pagina. |
| `src/lib/landing-pages/feature-visual-gate.ts` (NIEUW) | `decideFeatureRegenerations(coherenceScores, dupePairs, budget)` — deterministisch + geëxporteerd (unit-smokebaar): coherence < 50 óf dupe-flag → kandidaat; hard cap 2 regeneraties/pagina (worst-case +$0,26). |
| Retry-bouw | `REFINE_TRIGGER_THRESHOLD` + `buildRefinePromptModification` uit `refine-loop.ts` hergebruiken; **let op (geverifieerd)**: de coherence-dimensie heeft géén template in `DIMENSION_REFINE_HINTS` (`extractRefineHint` skipt hem) → eigen hint-instructie bouwen uit brief.subject + judge-rationale; nieuwe seed + aangescherpt `brief.avoid`. |
| Telemetrie | Kosten-logregel per page-run; `FEATURE_CANDIDATE_COUNT`-constante (default 1) voorbereid op `WorkspaceAiConfig` (quality-mode 2-3 kandidaten + gratis runner-up-swap bij dupes). |

**Smoke**: gate-unit (score/dupe-matrices → verwachte indices, cap gerespecteerd); route-smoke met gemockte fal/judges; **acceptatie = Napking-herrun: 4 onderscheidende beelden die elk hun sectietekst visualiseren, coherence-scores in de log.**

### Fase 5 — Clobber-guard, hero-brief, bron-opstap + ADR (1-1,5 dagen)
**Dekt R9 + R8-opstap.**

| File | Wijziging |
|---|---|
| `src/features/campaigns/lib/feature-visual-preserve.ts` (NIEUW) | `preserveFeatureVisualsOnSettings` naar het patroon van `hero-visual-preserve.ts` (die file zelf níet aanraken): non-lege `features.items[].imageUrl` (structuredVariant + puckData FeatureGrid/FeatureSplit) overleven een settings-replace; nieuwe URL en bewuste clear passeren. |
| `src/app/api/studio/[deliverableId]/route.ts` | **[RAAKVLAK, 2 regels]** call naast `preserveHeroOnSettings` (r174-176). |
| `landing-page-visual-prompts.ts` | `buildHeroVisualInstruction`: `hero.imageBrief` gebruiken indien aanwezig (subject/composition/avoid uit de brief i.p.v. alleen headline/subhead). |
| `scripts/dev/backfill-media-embeddings.ts` (NIEUW) | Idempotent, rate-limited: IMAGE-assets zonder embedding → auto-tag + `generateAndStoreMediaAssetEmbedding`. Voorwaarde voor élke toekomstige library-matching (huidige dekking 0/521). |
| `scripts/dev/lp-feature-image-dryrun.ts` (NIEUW) | Golden-set dry-run over Napking/Zwarthout/Better Brands: per slot → gebouwde prompt + coherence-score (+later match-source) — maakt threshold/judge-tuning meetbaar. |
| Route-response | `sources`-veld (`'generated'` per slot; later `'library'`) — opstap naar bron-badge in de variant-editor (UI-follow-up). |
| `docs/adr/2026-06-10-feature-visual-pipeline.md` (NIEUW) | MADR: photographyStyle-split, brief-first, paired-G4 + multi-image-diversity-judge i.p.v. pgvector, single-candidate + gerichte retry i.p.v. blind multi-candidate, persist-als-audit-niet-als-renderbron. |

**Smoke**: preserve-unit (replace mét/zónder imageUrls, partials); dry-run op de 3 workspaces; browser-check: settings-PATCH na feature-gen wist geen beelden.

## 5. Kosten

| Pad | Per pagina (4 features) |
|---|---|
| Huidig (ongecontroleerd) | 4 × $0,13 = **$0,52** |
| Plan-default (judges + worst-case 2 retries) | $0,52 + 4×$0,001 + $0,005 + max 2×$0,13 ≈ **$0,53-0,79** |
| Quality-mode (2 kandidaten, optioneel later) | ≈ $1,05 |

## 6. Out-of-scope (bewust)

- **Library-first matching + feature-target in de source-UI** (`ImageSourcePanel`/`LibraryAssetPicker` target='feature'): wacht op (a) embedding-backfill gedraaid, (b) browser-verificatie van de parallelle `lp-image-source-wiring`-workstream. Fase 5 legt de opstap (backfill + sources-veld + dry-run); eigen vervolg-task.
- **Upstream scrape-fix** van photographyStyle (multi-image sampling, OBSERVED/RECOMMENDED structureel scheiden op scrape-moment): hoort bij het brandstyle-result-audit-plan (`docs/audits/2026-06-05-brandstyle-result-audit.md`); dit plan saneert de consumptie-kant zodat beide niet conflicteren.
- **F-VAL vision-judge dim-8** uitbreiden naar per-sectie relevantie; **OCR** op feature-beelden; **multi-candidate 3 als default** (hero behoudt zijn bestaande multi-candidate ongewijzigd).
- **Re-scrape Napking**: napking.nl is een WordPress-placeholder (audit 2026-06-04); user regelt eerst de echte site.

## 7. Raakvlak parallelle workstream + sequencing

Gedeelde hotspots: `LandingPageGenerateBlock.tsx`, `PuckPageBuilder.tsx`, `canvas.api.ts`, `studio/[deliverableId]/route.ts`. Edits daar zijn bewust beperkt tot payload-swaps en een 2-regel guard-call; alle nieuwe logica leeft in nieuwe files. Vóór Fase 3/5: `git rev-list origin/main..main` checken (silent-divergence-patroon), raakvlak melden in `tasks/lp-image-source-wiring.md`, en na merge hun hero-browser-recept herdraaien. De `lp-image-source-wiring`-code blijkt overigens al volledig gemerged op main (PR #43/#44/#45 + `40e300ab`/`caaea4c6`) — alleen browser-verificatie + task-file-administratie staan daar nog open.

## 8. Openstaande empirische vragen

1. Honoreert `fal-ai/nano-banana-pro` de `seed`-param? (Fase 3 pre-check; zo niet → judge-laag is verplicht, niet optioneel.)
2. Honoreert het `num_images > 1`? (Alleen relevant voor de latere quality-mode.)
3. Hoe vaak produceert de copy-LLM degenerate briefs (te vaag / te uniform)? (Fase 2 live-monitoring; de Fase-4-poort is de dubbele bodem.)

## 9. Bekende beperkingen (review-2, 2026-06-10)

- **Bewuste clear van een feature-beeld** via het editbare imageUrl-veld wordt door de R9-guard hersteld zolang de titel gelijk blijft (zelfde trade-off als de hero-guard — een stil-wissende race is destructiever dan een herstelde clear). Workaround: URL vervangen. Expliciet clear-pad = UI-follow-up.
- **Server-side spend bij client-timeout**: de 120s-abort stopt de fetch, maar de route genereert/persisteert door (Next.js cancelt route-handlers niet op disconnect). Dubbele spend bij her-klik is beperkt tot één extra page-run.
- **Afwijking van het oorspronkelijke fase-3-ontwerp**: de route leest structuredVariant níet server-side; heading/body/brief komen uit de (gevalideerde, getrunceerde) client-payload. Reden: in de Step-2 confirm-flow is de gekozen variant op generatie-moment nog niet gepersisteerd — een server-read zou stale data zien. Functioneel equivalent; legacy accepteerde al verbatim prompts.
- **Gap-fill audit-namespace bij user-toegevoegde feature-secties**: de cumulatieve slotIndex is alleen in het standaard 1-component-geval gelijk aan de structuredVariant-index; een extra feature-sectie vóór de variant-sectie verschuift de namespace waardoor gap-fill een `feature-visual:<i>`-audit-row van een andere feature kan vervangen. Audit-only (de renderer leest puckData); volledige fix = gap-fill een eigen namespace geven, follow-up bij de bron-badge-UI.
