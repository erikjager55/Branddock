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

### F2 — `validateContextCompleteness` gate false-positive bij rijke brief
- **Locatie**: `src/lib/content-test/checkpoint-gates.ts` (gate [2]) + orchestrator line ~205
- **Probleem**: Gate vereist `stack.personas.length > 0` en `stack.products.length > 0`, maar negeert `stack.brief.audience` (vrije-tekst). Workspace Napking heeft rijke brief-audience ("Marketing-managers bij mid-market B2B SaaS scale-ups") maar geen personas/products in workspace-data → gate fired warn.
- **Impact**: gateWarnings reported als context-completeness terwijl content prima context heeft. False-positive vermindert signaal-waarde van de gate.
- **Voorgestelde fix**: gate accepteert ook `brief.audience.length > 20` als persona-substitute. Of: split gate-condities — persona OR brief.audience moet aanwezig zijn.
- **Effort**: ~15 min code + smoke-update.

## P2 findings

(geen nog)

## P3 findings

(geen nog)

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
- F1 (property-eval persistence gap)
- F2 (context-completeness gate false-positive)

**P3 styling-feedback**: banner te neutraal, chip-rij missed visuele hierarchy — gefixt in commit pending.
