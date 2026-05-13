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

### F13 — Auto-iterate effectiveness (gefixt — split INITIAL/ITERATE)
- **Initial diagnose**: feedback-compiler vond vaak geen BrandReviewFinding rows → generic re-prompt; voice-similarity embedding ceiling op style-pijler; surface-rewrites bewegen judge-score weinig.
- **Fixes split bewust**:

**Phase A (in INITIAL generation — automatisch na Step 1)**:
- A1 — **Voice-anchor in brand-context**: `formatBrandVoiceguide` injecteert nu tot 3 writing-samples (was: 1) als gestructureerd reference-blok. AI ziet meerdere concrete voorbeelden van merk-stijl bij elke generation, kan voice-fingerprint direct matchen i.p.v. pas na iter te herstellen. +200-500 tokens per gen, maar verbetert initial style-pijler score zonder iter-cost.

**Phase B (in ITERATE — alleen bij "Verbeter automatisch")**:
- B1 — **Diagnostic pillar-targeting**: feedback-compiler `buildPillarEmphasis` heeft nu per-pijler concrete rewrite-instructies (style → structurele wijziging + words-we-use injection + opening-imitation; judge → key-message in intro+conclusie + brand-frame consistency; rules → banned-terms schrappen + claims onderbouwen). Threshold verlaagd 15 → 10 zodat meer iters concrete pillar-instructie krijgen.
- B2 — **Aggressive rewrite-mode**: `regenerateWithFeedback` detecteert via promptHint-string-match of style/judge focuspunt is. Bij ja: switcht naar STRATEGIC REWRITE-modus ("je MAG structuur reorganiseren, alinea's splitsen, openingen vervangen"); behoudt feitelijke inhoud + lengte ±20% maar wijzigt voice/structuur agressief. Bij rules-focus: blijft surface-rewrite (lexicale fixes voldoende).
- B3 — Multi-strategy ToT per iter: deferred. Eerst zien of B1+B2 voldoende zijn voor sufficient improvement.

- **Verwacht effect**:
  - Initial F-VAL scores ~5-10pt hoger doordat voice-anchor structureel werkt
  - Auto-iterate winst per iter ~8-12pt voor style-pijler (was: ~0-2pt) door aggressive mode
  - Total quality target: ≥75 binnen 3 iters voor 80% van content-types (was: ~20% met oude prompts)
- **F13-bis (2026-05-13, na pilot-run)**: pilot toonde 55→55 op Napking blog (style 43, judge 51, rules 81). Diagnose: `regenerateWithFeedback` kreeg alleen `brandName + contentLanguage` mee — niet de voiceguide-content zelf. Pillar-instructie "imiteer sample 1 + gebruik words-we-use" was een instructie zonder bron. Fix: voiceguide-text (`stack.brand.brandVoiceguide`, met `voiceBaseline1Pager` als fallback) wordt nu doorgegeven aan `regenerateWithFeedback` en als `# Brand voice fingerprint (MUST MATCH)` block in system-prompt geïnjecteerd. Bij style/judge-focus krijgt user-prompt een fingerprint-cue die expliciet refereert aan Writing samples + Words we use + Anti-patterns. Cap op 2500 chars voor context-budget. Werkt durably voor elke workspace met `BrandVoiceguide` populated; degradeert gracefully wanneer voiceguide ontbreekt.
- **F13-bis pilot resultaat**: 54→61 op Napking blog (+7pt in 5 iters), style-pijler beweegt nu daadwerkelijk. Door naar F18 (score display) en F19 (apply requires refresh).
- **Niet gemeten**: pilot-data zal moeten bewijzen. Smoke 14/14 feedback-compiler pass + TS clean na F13-bis.

### F18 — Drie inconsistente score-getallen rondom auto-iterate (gefixt)
- **Locatie**: `src/features/campaigns/components/canvas/FidelityScoreBar.tsx` SSE-handler voor `auto_iterate_started`.
- **Probleem**: Na auto-iterate completion zag user drie verschillende getallen die niet kloppen:
  - Big-score-display: 47 (canonical canvas-store fidelityScore)
  - Banner-initial: 54 (uit SSE `auto_iterate_started.initialScore`)
  - Banner-final: 61 (uit SSE `auto_iterate_complete.finalScore`)
  - Banner zegt "Verbeterd van 54 naar 61" terwijl big-display 47 toont — onmogelijk uit te leggen.
- **Oorzaak**: Trigger-endpoint doet een fresh re-judge bij start van auto-iterate als baseline voor het iter-loop. Door judge-variance (±2-5pt) wijkt deze af van de originele canvas-displayed score. SSE-event gaf die fresh-score door als `initialScore` → banner toonde de re-judge waarde, niet de user-visible canonical-score.
- **Fix**: in `auto_iterate_started` SSE-handler nu de canvas-store `fidelityScore.compositeScore` als banner-initial gebruikt i.p.v. de SSE-waarde. Trigger-endpoint blijft zijn re-judge doen voor interne iter-loop delta-logic; alleen UI-banner pakt de canonical score. Effect: banner-initial en big-display zijn nu altijd gelijk. Werkt voor elke workspace + content-item.
- **Severity**: P1 (gefixt).

### F19 — "Gebruik verbeterde versie" vereist page refresh (gefixt)
- **Locatie**: `src/features/campaigns/components/canvas/FidelityScoreBar.tsx:handleApply` in `AutoIterateImprovedBlock`.
- **Probleem**: Na klikken "Gebruik verbeterde versie" verving het apply-endpoint de `DeliverableComponent.generatedContent`, maar de frontend kreeg geen signal om te refetchen. User moest pagina refreshen, en omdat Branddock een hybride SPA is (activeSection-state-based routing, niet URL) bracht refresh de user terug naar root → opnieuw navigeren naar het content-item.
- **Fix**: na succesvolle apply nu drie acties in handleApply:
  1. `queryClient.invalidateQueries({ queryKey: canvasKeys.components(deliverableId) })` → TanStack Query refetcht component-rows incl. nieuwe generatedContent.
  2. `useCanvasStore.setState` muteert `fidelityScore.compositeScore` + variant-0 in `fidelityScoresByVariantIndex` direct met `finalScore`, zodat het grote getal-display ook meteen update zonder te wachten op refetch (score-state is apart van component-state).
  3. UI-copy "Toegepast — ververs de pagina om de verbeterde tekst te zien" → "Toegepast — verbeterde tekst is geladen".
- **Niet meegenomen** (volgt later): apply-endpoint persist nog geen nieuwe `ContentFidelityScore` row, dus na een eventuele latere hard-refresh leest de canvas de oude score uit DB. Daarvoor moet apply-endpoint OF re-judgen OF de snapshot-score uit `settings.autoIterate.finalScore` persisteren als nieuw `ContentFidelityScore` record. Pakken we op als score-display na hard-refresh een storing wordt.
- **Severity**: P1 (gefixt voor de UX-loop; persistent score-write is P2 follow-up).

### F23 — InheritanceBanner + "Voiceguide actief" success-badge weg (gefixt)
- **Locatie**: `src/features/campaigns/components/canvas/CanvasPage.tsx` (banner-render), `InheritanceBanner.tsx` (verwijderd), `GenerationFeedbackBanners.tsx:BrandVoiceBanner` (success-state weggehaald).
- **Probleem**: User-feedback dat de twee canvas-banners visuele ruis zijn zonder toegevoegde waarde:
  - "Settings inherited from Pillar Page — Context, Medium, and type-specific inputs were copied." (InheritanceBanner)
  - "Voiceguide actief" emerald-badge (BrandVoiceBanner success-state)
- **Fix**: InheritanceBanner volledig verwijderd (file deleted + import + render-site weggehaald). De onderliggende `inheritedFrom` state in canvas-store en `settings.inheritedFrom` DB-veld blijven bestaan voor andere doeleinden (provenance-tracking in duplicate/bulk-create endpoints). BrandVoiceBanner success-state returnt nu `null`; fallback-warning (amber, "no voiceguide configured") blijft behouden — dat is genuine info die de user wel moet zien.
- **Severity**: P2 (UX-opschoning).
- **Locatie**: `src/lib/ai/feature-models.ts` (model-default), `src/lib/ai/canvas-orchestrator.ts:generateTextWithFallback` + `handleRegeneration` (thinking-config), plus best-of-3 helper (volgt in F22b).
- **Probleem**: F21 prompt-restructure leverde +7pt (47→54). Doel ≥70 nog niet bereikt. Prompt-engineering alleen is uitgeput; verdere lift vraagt om model-upgrade + best-of-N candidate-pick.
- **F22a — Model upgrade (deze commit)**:
  - **Default model** voor `canvas-text-generate` van `google/gemini-2.5-flash` → `anthropic/claude-opus-4-7`. Per-workspace override via `WorkspaceAiConfig` blijft mogelijk.
  - **Extended thinking enabled** wanneer provider=anthropic + model contains "opus": `thinking: { anthropic: { budgetTokens: 5000 } }`. Model redeneert intern over voice-fingerprint match + brand-fidelity vóór output. Anthropic-vereiste: temperature MUST be undefined bij thinking-on (handled in helper).
  - Aangepast in zowel `generateTextWithFallback` (main path) als `handleRegeneration` (regen path).
- **Verwacht effect F22a**: +5-10pt initial composite door hogere model-kwaliteit + thinking-overweging. Eerst meten of dit afdoende is.
- **F22b — Best-of-3 (gefixt in dezelfde sessie)**: 3 parallelle candidates per generation met emphasis-variantie (style/judge/rules), 1 lightweight Haiku ranking-call selecteert beste, full F-VAL alleen op winner. Geïntegreerd in BEIDE paths: per-angle (6 gen + 2 ranking) en legacy (3 gen + 1 ranking). Helpers `generateBestOfNWithFallback` + `pickBestCandidate` toegevoegd aan canvas-orchestrator. Loser-candidates worden weggegooid; alleen winner gaat door post-generation pipeline (F-VAL, persist, etc.). Cost: +3× generation tokens per angle/legacy + ~$0.05 ranking call per pick.
- **Cost-impact F22a**: Opus 4.7 ~5-10× duurder per call dan Gemini Flash. Thinking voegt ~5000 reasoning-tokens toe per call. Total per-generation cost ~$0.15-0.50 (was ~$0.02-0.05).
- **Severity**: P1 (in-progress; F22a gefixt).

### F21 — Initial-score ~50 te laag voor publish-ready output (prompt-restructure)
- **Locatie**: `src/lib/studio/brand-voice-directive.ts` + `src/lib/ai/canvas-orchestrator.ts:buildCanvasPrompt` en `buildRegenerationPrompt`.
- **Probleem**: Pilot-run Napking blog-post toonde initial composite 47 (style 43, judge 51, rules 81). Auto-iterate haalde +7pt (54→61) maar bleef onder threshold 75. Hypothese: AI behandelt voiceguide-block in BVD als achtergrondinfo i.p.v. imitatie-target. Geen self-verification stap forceert AI om voor-output te checken of voice-fingerprint match maakt.
- **Fix (prompt-restructure, geen extra cost/latency)**:
  1. **Stronger voiceguide framing in BVD**: `**Brand voice**: ${voiceguide}` → `**VOICE FINGERPRINT — MUST MATCH BEFORE OUTPUT**:` met inhoud op nieuwe regel. Signaleert dat dit een imitatie-target is, niet algemene context.
  2. **Self-check directive aan EINDE van system-prompt** (`buildVoiceSelfCheckDirective`): nieuwe helper die 4-5 expliciete checks oplevert: (a) voice-fingerprint match met Writing sample [1], (b) Words we use frequentie ≥2 per alinea, (c) geen banned/anti-pattern terms, (d) brand-name expliciet aanwezig, (e) AI-clichés geschrapt. Closing line: "Als één van bovenstaande checks zou falen, herschrijf de tekst VOORDAT je antwoordt." NL/EN copy afhankelijk van contentLanguage.
  3. **Recency-effect**: self-check staat als LAATSTE block in system-prompt (na alle context). LLMs hechten meer waarde aan recente instructies; bracketing met BVD-top + self-check-bottom dwingt voice-discipline.
- **Verwacht effect**: +5-10pt initial composite door imitate-not-summarize framing + +3-7pt door self-check-driven inline-revisions. Total target: initial ~60-65, auto-iterate naar ≥75 (binnen 1-2 iters i.p.v. 5+).
- **Werkt durably**: voor elke workspace met `BrandVoiceguide` populated; degradeert gracefully wanneer voiceguide ontbreekt (alleen brand-name + AI-cliché-check blijven over).
- **Severity**: P1 (gefixt).

### F20 — `# Heading 1` wordt letterlijk gerenderd in body sections (gefixt)
- **Locatie**: `src/features/campaigns/components/canvas/previews/SimpleMarkdown.tsx`.
- **Probleem**: Renderer ondersteunde alleen `##` (h2) en `###` (h3). AI-output met enkele `#` (h1) viel door naar het paragraph-pad en werd letterlijk gerenderd ("# Horecatextiel beheer" toonde de hash + ruimte als platte tekst). Component-types die rijke markdown produceren (blog-post body sections, newsletter, landing-page) raakten dit.
- **Fix**: enkele regex `/^(#{1,6})\s+(.+)$/` dekt nu alle zes heading-niveaus. Per niveau Tailwind-styling die hiërarchisch aflopend is (h1 text-2xl bold, h2 text-lg bold, h3 text-base semibold, h4 text-sm semibold, h5/h6 text-xs uppercase tracking-wide). Werkt voor elke SimpleMarkdown gebruiker (VariantCard, VideoPreview, InstagramCarouselPreview, etc.) zonder dat consumer-componenten iets hoeven aan te passen.
- **Severity**: P1 (gefixt).

### F17 — Auto-iterate score visueel lager dan origineel (best-of + sync regressie)

### F14 — Brand-name-capitalization BLOCK stopt hele generation
- **Locatie**: `src/lib/content-test/property-evals.ts:checkBrandNameCapitalization`
- **Probleem**: Property-eval voor brand-name capitalization fired BLOCK-severity wanneer AI lowercase "napking" produceerde i.p.v. "Napking". Generation stopte met "Content failed Layer 1 quality checks (2 block-violations)" zonder remedie voor user.
- **Twee fixes**:
  1. **Auto-fix in orchestrator** (primary remedie): nieuwe `enforceBrandNameCapitalization` helper in variant-content-sanitizer. Word-boundary regex vervangt non-canonical case-variants door canonical brandName. Runs in canvas-orchestrator vóór property-evals zodat content + downstream checks gelijk de fix krijgen. 8/8 smoke pass (lowercase/ALL-CAPS/mixed/canonical/word-boundary/empty/regex-escape).
  2. **Severity downgrade**: check van BLOCK → WARN. Auto-fix is primary mitigation; check blijft als vangnet voor edge-cases (Title-Case, ALL-CAPS, mixed). Voorheen kreeg user dead-end, nu door-genereert en flagged in trace.
- **Smoke updates**: 31/31 pass voor property-evals (worst-case asserts aangepast — brand-name niet meer in blockCount).
- **Severity**: P0 (gefixt) — was dead-end voor user die brand-name typo's bij AI niet zelf kon herstellen.

### F17 — Auto-iterate score visueel lager dan origineel (best-of + sync regressie)
- **Locatie**: `setAutoIterateIterationComplete` in useCanvasStore + SSE handler in FidelityScoreBar + AutoIterateImprovedBlock copy
- **Drie samenhangende oorzaken**:
  1. **finalScore tracking schreef LATEST i.p.v. BEST** — bij iter 2 met lagere score dan iter 1 zag user "verbeterd van 52 naar 50" terwijl iter 1 wel 58 was. Display reflecteerde laatste iter, niet beste.
  2. **F12-sync op auto_iterate_started**: trigger-endpoint deed fresh F-VAL (judge-variance ±2-3pt). Mijn vorige F12 fix sync'de canvas-score naar deze fresh waarde voordat iters begonnen → user zag al "score zakte van 52 naar 50" voordat enige iteratie was gebeurd.
  3. **Apply-knop bij regressie/stagnatie**: "Gebruik verbeterde versie" was altijd zichtbaar, ook bij geen verbetering — replace zou geen meerwaarde bieden of zelfs regressie introduceren.
- **Drie fixes**:
  1. `setAutoIterateIterationComplete` tracks `Math.max(prevBest, newScore)` zodat finalScore monotoon stijgt tijdens iter-progress.
  2. F12-sync VERWIJDERD uit auto_iterate_started handler. Canvas-score blijft op origineel staan; alleen bij echte verbetering bij complete-event syncen.
  3. AutoIterateImprovedBlock: drie copy-varianten + amber-banner (i.p.v. emerald) bij geen-verbetering. Apply-knop alleen tonen wanneer `delta > 0`. Tip-tekst bij regressie: "maak brief specifieker of pas voiceguide aan".
- **Severity**: P1 (gefixt) — user zag "automatisch verbeteren maakte het slechter" en verloor vertrouwen in feature.

### F16 — Brand Assistant kiest create_deliverable i.p.v. update_deliverable_brief
- **Locatie**: `src/lib/claw/tools/write-tools.ts:create_deliverable` description + `src/lib/claw/context-assembler.ts` page-context
- **Probleem**: User op canvas Step 1 vroeg "vul de velden". AI emit 4× `create_deliverable` voor NIEUWE LinkedIn-posts in andere campaign i.p.v. de huidige blog-post brief te vullen via `update_deliverable_brief`. User zag 4 confirm-cards in queue die niet matched met de invul-velden — frustrerend "kreeg suggesties die niet horen bij dit formulier".
- **Twee fixes**:
  1. `create_deliverable` tool-description versterkt met "NEVER use when pageContext.entityType === 'deliverable'" + concrete phrase-mapping ("vul de velden" / "geef suggesties" = EDIT current, niet create new).
  2. Context-assembler deliverable-instructie met `**CRITICAL RULE**` markdown-bold + expliciete entityId reminder + reasoning "creating new deliverables instead would frustrate the user — they want their CURRENT form filled, not new content created elsewhere".
- **Severity**: P0 (gefixt) — was complete misinterpretation van user-intent.

### F15 — Brand Assistant parallel mutation-proposals overwriten elkaar
- **Locatie**: `useClawStore` + `InputBar.tsx` SSE handler + MutationConfirmCard
- **Probleem**: User vroeg "vul de brief" — AI emit in 1 response drie parallel tool-uses (update_deliverable_brief + update_deliverable_visual_brief + update_deliverable_content_inputs). Backend stuurde 3× mutation_proposal SSE-events. Frontend `setPendingMutation(d)` overwrote vorige → user zag alleen de laatste (meestal visual brief). Voelde alsof AI alleen visual brief vulde.
- **Fix**: nieuwe `pendingMutationQueue: MutationProposal[]` in useClawStore. SSE-handler in InputBar gebruikt nu `enqueuePendingMutation` ipv `setPendingMutation`: eerste proposal activeert direct, volgende komen in queue. Na confirm: `advanceMutationQueue()` popt volgende → MutationConfirmCard rendered de nieuwe automatisch.
- **UX-toevoeging**: badge "+N meer wijzigingen hierna" in confirm-card header zodat user weet dat er nog meer cards volgen.
- **Severity**: P1 (gefixt).

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
