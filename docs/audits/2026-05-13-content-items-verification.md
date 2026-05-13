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
