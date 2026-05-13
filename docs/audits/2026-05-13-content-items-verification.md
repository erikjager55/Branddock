# Content-items verification — 2026-05-13

Walkthrough van 8 representanten tegen content-test improvements van sprint #5/#6.
Per playbook: `docs/playbooks/content-items-verification.md`.

## P1 findings (pre-launch fix)

### F1 — Property-eval results niet gepersisteerd
- **Locatie**: `src/lib/ai/canvas-orchestrator.ts:678`
- **Probleem**: `runAllPropertyEvals` wordt per variant aangeroepen, maar `tryTrackPropertyEvalResults` (helper bestaat in `src/lib/learning-loop/track-helpers.ts`) wordt nergens aangeroepen vanuit de orchestrator. Warnings worden in-memory berekend maar nooit op `AICallTrace.propertyEvalResults` opgeslagen.
- **Impact**: Sub-sprint #5.A foundation kan claims niet onderbouwen ("we vinden X warnings/run") want data ontbreekt. Auto-iterate-integration en dashboard-panels werken niet correct (eerstgenoemde haalt findings op via aparte tabel — OK; tweede via LearningEvent — OK; maar de raw property-eval-trace ontbreekt voor diepere analyse).
- **Voorgestelde fix**: na line 660 (na property-evals loop) een trace-lookup + `tryTrackPropertyEvalResults` call voor de latest AICallTrace. Patroon mirror van `tryTrackGateWarnings` aan einde van orchestrator (line 1013-1040 area).
- **Effort**: ~30 min code + test.

### F6 — SimpleMarkdown renderer breekt newlines bij heading + bullets
- **Locatie**: `src/features/campaigns/components/canvas/previews/SimpleMarkdown.tsx`
- **Probleem**: Block-split op `\n{2,}` (markdown-spec). AI produceert vaak `## Heading\n- bullet1\n- bullet2` met enkele newlines tussen heading en lijst. Resultaat: hele blok behandeld als één heading, bullets renderen inline (visible in screenshot 2026-05-13: "**Inhoudsopgave - Waarom textielbeheer - De eisen aan...**" als één lange bold-regel).
- **Fix**: pre-processing regexes voor heading→blank-line en bullet/non-bullet transitions. Verzekert dat de AI-output door SimpleMarkdown correct in blocks gesplitst wordt zonder dat we de AI hoeven aan te passen.

### F7 — Derive maakt deliverable maar genereert niet
- **Locatie**: `src/features/campaigns/components/canvas/GenerationFeedbackBanners.tsx` derive-handler
- **Probleem**: "LinkedIn-variant maken" chip suggereert finished output, maar derive-endpoint maakt alleen scaffold. User landt op leeg canvas en moet handmatig Generate klikken.
- **Fix**: nieuwe `pendingAutoGenerate` flag in canvas-store. Derive-handler set flag naar nieuwe deliverableId, navigeert. CanvasPage useEffect detecteert op mount + fires `useCanvasOrchestration.generate()` automatisch. User landt op canvas met generation al actief (SSE streaming zichtbaar).

### F4 — Voiceguide-locale wordt genegeerd, workspace-language wint
- **Locatie**: `src/lib/ai/brand-context.ts:946` — `contentLanguage: workspace?.contentLanguage ?? 'en'`
- **Probleem**: BrandContextBlock leest alleen `Workspace.contentLanguage` (vrije string, default 'en'). `BrandVoiceguide.contentLocale` (BCP-47, bv. 'nl-NL') wordt nergens meegenomen in de prompt-context.
- **Verifieerbaar (Napking)**:
  ```
  Workspace.contentLanguage = "en"
  BrandVoiceguide.contentLocale = "nl-NL"
  ```
  Resultaat: blog-post gegenereerd in Engels terwijl voiceguide expliciet nl-NL aangeeft.
- **Impact**: Pilots met Nederlandstalige voiceguide krijgen Engelse output ondanks dat ze locale-picker correct hebben ingevuld. Dit verklaart ook deels F3 — pijler 1 style-fit is 38 omdat Napking voiceguide-samples nl-NL zijn maar output Engels is, dus geen embedding-match mogelijk.
- **Voorgestelde fix**: in `brand-context.ts:946` introduceer fallback-chain:
  ```ts
  const localePrefix = voiceguide?.contentLocale?.split('-')[0]; // 'nl-NL' -> 'nl'
  contentLanguage: localePrefix ?? workspace?.contentLanguage ?? 'en'
  ```
- **Effort**: ~15 min code + smoke. Plus aanvullen `brand-voice-directive.ts:154` om dezelfde precedence aan te houden.
- **Severity**: P1 — blocking pilot voor elke NL-talige klant.

### F2 — `validateContextCompleteness` gate false-positive bij rijke brief
- **Locatie**: `src/lib/content-test/checkpoint-gates.ts` (gate [2]) + orchestrator line ~205
- **Probleem**: Gate vereist `stack.personas.length > 0` en `stack.products.length > 0`, maar negeert `stack.brief.audience` (vrije-tekst). Workspace Napking heeft rijke brief-audience ("Marketing-managers bij mid-market B2B SaaS scale-ups") maar geen personas/products in workspace-data → gate fired warn.
- **Impact**: gateWarnings reported als context-completeness terwijl content prima context heeft. False-positive vermindert signaal-waarde van de gate.
- **Voorgestelde fix**: gate accepteert ook `brief.audience.length > 20` als persona-substitute. Of: split gate-condities — persona OR brief.audience moet aanwezig zijn.
- **Effort**: ~15 min code + smoke-update.

## P2 findings

(geen nog)

## P3 findings

### F8 — Composite-score < threshold getoond als geldig resultaat (DESIGN-DECISION)
- **Locatie**: F-VAL pipeline + canvas variant-display
- **Probleem**: Bij representant #1 blog-post werd composite 55 (onder drempel 75) getoond als gewoon resultaat. User-feedback: "lijkt me logisch dat dit altijd minimaal 75 is en anders niet getoond kan worden als voorbeeld."
- **Drie design-opties**:
  - **A — Hard-gate**: composite < threshold → blokkeer variant-display, dwing regeneratie. Risk: vertraagt UX bij domein-mismatches (voiceguide hospitality + brief AI = onvermijdelijk lager).
  - **B — Auto-iterate verplicht aanzetten**: FEATURE_AUTO_ITERATE default ON (6B-flag, nu off). Auto-rewrite tot threshold of max 2 attempts. Risk: 2× extra AI-calls per generation = ~$0.05-0.10 extra.
  - **C — Visual warning + opt-in apply**: huidige aanpak via F3 amber-banner; user beslist of varianten zo bruikbaar zijn.
- **Aanbeveling**: opt voor **B met user-zichtbare progress** — set FEATURE_AUTO_ITERATE=true in prod-env, tonen "Auto-iterate liep 1× om score naar 78 te tillen" als positief signaal. Composite < threshold na max-iter = user-keuze om alsnog te tonen.
- **Severity**: P2 (design-decision, niet code-bug). Vereist user-input.

### F9 — F-VAL score gerendeerd op blob, niet per-variant (DESIGN-DECISION)
- **Locatie**: `src/lib/ai/canvas-orchestrator.ts:1052-1055` — `runFidelityScoringPipeline` blob-build
- **Probleem**: Composite score is berekend op `textResult.components.map(c => c.variants[0]?.content).join('\n\n')` — alleen FIRST-VARIANT per component. Variant A en B krijgen IDENTIEKE score (zelfde 55), terwijl het 2 verschillende teksten zijn.
- **Drie design-opties**:
  - **A — Per-variant F-VAL** (2× AI-call cost): elke variant aparte score. Variant A=55, Variant B=72 → user kiest beste. Cost: 2× judge-call (~$0.04-0.10 elk).
  - **B — Per-variant style+rules only, single judge call**: deterministisch deel (style + rules) per-variant berekenen (gratis), maar judge-call eenmaal op blob. Compromis tussen accuracy en cost.
  - **C — Huidige aanpak doc'en**: composite is "team-score voor deze generation", niet per-variant. UI label aanpassen ("score over geselecteerde variant" → "score over generation-batch").
- **Aanbeveling**: opt voor **A** — user-keuze is essentieel; aparte score is dat 2 variants vergelijkbaar zijn. Cost is acceptabel bij pilot-volume (~$0.10/blog).
- **Severity**: P1 (functionele inaccuracy — variants moeten ver discrimineerbaar zijn). Vereist user-input over cost-trade-off.

### F10 — Brand Assistant form-fill: partial success + generic error display
- **Locatie**: drie code-paden
  - `src/lib/claw/tools/write-tools.ts` (`fill_form_fields` tool + `update_deliverable_brief` tool)
  - `src/stores/useFormFillStore.ts` (applyFill key-matching)
  - `src/features/campaigns/components/canvas/CanvasPage.tsx:623` (generic error display)
- **Probleem-bundel**:
  - User vroeg Brand Assistant om brief-velden te vullen voor blog-post
  - AI stelde waarden voor, user accepteerde
  - DB-state na confirm: alleen `toneDirection` gevuld; `objective`, `keyMessage`, `callToAction` bleven leeg-string
  - User klikte Genereren → orchestrate hit gate [1] validateBriefInput → BLOCK
  - UI toonde generieke "Generation failed" zonder de werkelijke reden
- **Twee root-causes**:
  1. **Form-fill key-mismatch of partial-save**: AI gebruikte mogelijk verkeerde keys, of `setBriefField` autosave-PATCH race-condition (server-log toonde "PATCH /api/studio/[id] error: Error: aborted"). Resultaat: alleen 1 van 4 velden gepersisteerd.
  2. **Error message generic**: SSE error.message had de gate-reden ("Geen objective EN geen keyMessage..."), maar CanvasPage rendered hardcoded "Generation failed" zonder de echte message.
- **Fix part 1 (immediate)** — gefixt nu:
  - CanvasPage gebruikt nu `globalErrorMessage` als zichtbare tekst (was: hardcoded "Generation failed")
  - Gate-block message in orchestrator herwoord naar user-actiezone: "Vul minstens een doel (objective) óf een kernboodschap (keyMessage) in vóór generatie."
- **Fix part 2** — gefixt 2026-05-13:
  - `useFormFillStore.FormFillField` uitgebreid met `groupId` + `flush` velden. Velden die dezelfde groupId delen (bv. 'brief') krijgen één flush-handler ná alle setters. Step1Context registreert 4 brief-fields met `groupId: 'brief'` + `flushBrief` handler die direct PATCH'ed (bypasst debounce + autosave-race).
  - `MutationConfirmCard` extra-handler voor `update_deliverable_brief` tool: na server-write sync de params direct naar canvas-store via `setBriefField`. UI updatet instant, geen refresh nodig.
- **Severity**: P1 (gefixt).

### F11 — Brief-gate te strict + Brand Assistant fillt niet alle 4 brief-fields
- **Locatie**:
  - `src/lib/content-test/checkpoint-gates.ts:62` (validateBriefInput)
  - `src/lib/claw/tools/write-tools.ts:807` (update_deliverable_brief tool description)
  - `src/lib/claw/context-assembler.ts:448` (Canvas Step 1 system-prompt section)
- **Twee samenhangende problemen**:
  1. **Gate-strictness mismatch**: UI markeert objective + keyMessage + toneDirection + callToAction NIET als required (alleen content-type-specifieke fields zoals SEO Keyword zijn required). Maar gate [1] validateBriefInput blokt generation wanneer beide objective + keyMessage leeg zijn. User-perspectief: "die velden zijn toch niet verplicht?"
  2. **Brand Assistant partial fill**: User vroeg AI om brief te vullen, maar AI vulde alleen 1-2 van 4 strategic fields. System-prompt instructie was te zwak ("vier strategische textareas" → AI behandelde als optioneel).
- **Fix**:
  - validateBriefInput: severity verlaagd van `block` naar `warn` voor empty-brief + only-tone+cta scenarios. Generation blijft mogelijk; user krijgt warning maar geen blocker. Smoke 41/41 pass.
  - update_deliverable_brief tool-description: explicit "propose values for ALL FOUR fields in a single call unless one is already non-empty". Plus listing van triggers ("vul de velden", "geef suggesties").
  - context-assembler Canvas Step 1 system-prompt: "FOUR strategic textareas: objective, keyMessage, toneDirection, callToAction — always propose ALL FOUR in one call" + repeated in "CRITICAL broadly" instruction.
- **Severity**: P1 (gefixt).

### F12 — Auto-iterate CTA niet re-triggerbaar + score-display inconsistent
- **Locaties**: FidelityScoreBar.AutoIterateOptInCta + CanvasPage mount + SSE-handler
- **Vier samenhangende problemen**:
  1. **OptInCta verborgen na eerste run**: render-conditie eiste `autoIterate.stage === 'idle'`. Na 1× iter is stage='complete' → CTA verdwijnt, user kan niet opnieuw triggeren.
  2. **Chip-click doet niets**: "Score automatisch verbeteren" chip dispatched custom event, maar OptInCta-component was niet meer gemount → niemand luisterde.
  3. **Stale DB-snapshot rendert**: oude `Deliverable.settings.autoIterate` uit pre-overhaul automatische run bleef tonen "Verbeterd van 52 naar 52 in 2 pogingen — pas brief aan" na canvas-reload, ondanks dat er niets nieuws gedaan was.
  4. **Score-discrepancy 50 vs 52**: canvas-score (50) was van originele generation, auto-iterate snapshot (52) was van trigger-endpoint re-judge. Judge-LLM variance is ~2-3pt; deze waardes laten beide kanten zien zonder context.
- **Fixes**:
  - OptInCta render-conditie verlost: tonen wanneer score < threshold + stage !== 'iterating' + NIET threshold-success. Re-try mogelijk na falen.
  - Reset autoIterate-state vóór nieuwe trigger (`useCanvasStore.getState().resetAutoIterate()` in handleClick).
  - Reset autoIterate-state op CanvasPage mount (clear stale DB-snapshot rendering — snapshot blijft in DB voor "Apply"-flow, maar wordt niet auto-getoond).
  - Bij `auto_iterate_started` SSE: sync canvas fidelity-score met trigger-endpoint's re-judge score via `setFidelityCompleteForVariant(0, ...)`. Voorkomt 50/52 discrepancy.
- **Effort**: ~30 min. TS clean.
- **Severity**: P1 (gefixt).

### F13 — Auto-iterate produces 0pt improvements (KNOWN-LIMITATION)
- **Probleem**: User reports "geen verbeteringen doorgevoerd" na auto-iterate. Score blijft staan op initiaal.
- **Root causes geïdentificeerd**:
  - **Findings empty**: `loadFindingsForDeliverable` query op BrandReviewFinding → voor fresh content vaak 0 rows. Feedback-compiler valt terug op generic re-prompt zonder concrete instructies.
  - **Stijl-pijler ceiling**: voice-similarity-embedding tussen content + samples is structureel — gentle rewrite verandert het fingerprint niet.
  - **Judge-LLM stability**: zelfde content scoort consistent middelmatig; surface-rewrites bewegen judge-score weinig.
- **Niet gefixt deze sessie** — vereist diepere refactor:
  - Feedback-compiler uitbreiden om ook style-gap signalen + judge-rationale te integreren (niet alleen BrandReviewFinding)
  - Regenerate-prompt aggressiever maken: strategic-rewrite ipv surface-rewrite. Mogelijk meervoudige rewrite-strategieën (ToT-style) en kiezen op judge-score.
  - Voice-samples uit voiceguide direct als reference-blob in regenerate-prompt embedden (anchor-content)
- **Verbetering volgt** in: aparte taak "auto-iterate-effectiveness" (~1-2 dagen). Pre-launch: documented limitation; user kan na max iters handmatig finetunen.

### F-canvas-open-slow — Derive-navigation duurt lang (PERFORMANCE)
- **Locatie**: derive → navigate → CanvasPage mount → fetch /api/studio/[id] + components + context
- **Probleem**: Tussen klik op chip en zichtbaarheid van nieuwe canvas zit veel laadtijd. CanvasPage mount triggert ~4 sequentiële API calls (deliverable detail, components, context-stack, F-VAL persist).
- **Voorgestelde verbeteringen**:
  - Parallel API calls (Promise.all) in CanvasPage mount-useEffect
  - Optimistic-UI: render canvas-frame meteen, skeleton voor content terwijl data laadt
  - Prefetch source-context bij derive (we hebben de campaignId al)
- **Severity**: P3 (UX-polish). Niet pilot-blocker maar wel friction.

### F3 — F-VAL display-conflict tussen position-bar en composite-score
- **Locatie**: `src/features/campaigns/components/canvas/FidelityScoreBar.tsx`
- **Probleem**: Position-bar toont detector-only signal (humanBaselinePosition, pijler 3) en kan groen tonen ("Klinkt heel menselijk") terwijl composite-score onder drempel zit. De composite is gewogen som van 3 pijlers (style 35% + judge 45% + rules 20%), dus een lage style-fit drukt composite onder drempel zonder dat het in de position-bar zichtbaar is.
- **Voorbeeld**: representant #1 blog-post → position 8% (TOP_TIER groen) + verdict "Klinkt heel menselijk" + composite 55 (onder drempel). User-feedback: "Klopt de score? Position zegt groen, composite zegt onder drempel."
- **Voorgestelde fix**:
  - Visuele scheiding tussen "menselijkheid" (position-bar) en "brand-fit" (composite) — eventueel apart kader of label-tekst die uitlegt dat ze verschillende dingen meten.
  - Of: gecombineerde indicator die secondary-warning toont wanneer position-groen + composite-onder-drempel ("klinkt menselijk maar past nog niet bij merk").
- **Effort**: ~1u UI-tweak + smoke-update.
- **Aangrijpend**: blog-post (Napking) + waarschijnlijk alle gevallen waar voiceguide-domain niet matched met brief-onderwerp.

## Per-representant log

### #1 — blog-post (Napking)

- **deliverableId**: `cmp3tljtq0000qmmsbf5qschg`
- **Generation duur**: ~3 min (text-only, no visual)
- **Banner-status**: voiceguide-control pad (Napking heeft voiceguide). User vond styling te neutraal — adjusted to compact ShieldCheck-badge in commit pending.
- **Headlines**: 2 varianten zichtbaar (Variant A + B). Beide volgen "How to X for Y" / "X for Y: Z" pattern — herkenbaar maar niet evident dat ze verschillende formula-types zijn (allebei resultaat-gericht).
- **Hook**: Variant A "B2B SaaS marketers struggle with content creation. You need to produce high-quality, brand-aligned content consistently, but time and resources are always tight." — concreet probleem-statement, geen generic AI-opener.
- **CTAs**: "Boost Brand Strategy: Get 50% Faster Conversion" + "Unlock 50% Faster Brand Strategy Conversions". Beide bevatten "50% Faster" → SHOULD trigger claim-substantiation maar zijn < 80 chars dus geskipt per current implementation.
- **Iteration-nudges**: ✓ chips zichtbaar (Een sectie herzien / Toon aanpassen / LinkedIn-variant / Nieuwsbrief-variant / Hero-image)
- **Derive-test**: niet uitgevoerd (representant #2 doet dit)
- **DB property-eval warnings**: ZERO — bevestigd via trace-query (`propertyEvalResults` is null). Niet te wijten aan content; de results worden überhaupt niet gepersisteerd (F1).
- **DB gate-warnings**: 1× context-completeness warn (F2).
- **Brand fidelity score**: 55/100 onder drempel (75). Pijler-breakdown: Merkstijl 38 / Strategie 51 / Menselijk 93. Pijler 1 (style-fit) is laag voor blog met voiceguide — zou interessante audit-grond zijn voor sub-sprint #7.A flow-analyse maar buiten scope deze run.

**Findings nieuw**:
- F1 — property-eval persistence gap (P1)
- F2 — context-completeness gate false-positive (P1)
- F3 — F-VAL display-conflict position-bar vs composite (P3)
- F4 — voiceguide-locale genegeerd, workspace-language wint (P1) — pilot-blocker voor NL-klanten

**Additionele observatie**: F4 verklaart deels F3. Pijler 1 (style-fit) = 38 omdat embeddings van Napking voiceguide-samples (nl-NL) niet matchen met output (en). Bij correcte language-selectie zou pijler 1 hoger zijn en composite-score waarschijnlijk wel boven drempel.

**P3 styling-feedback**: banner te neutraal, chip-rij missed visuele hierarchy — gefixt in commit c5d4bc60.

**Open van representant #1**:
- Derive-buttons werken niet (`window.location.href`-hack faalt in SPA) — fix pending
- Banner+nudges verdwijnen na pagina-reload — on-load derive needed — fix pending
