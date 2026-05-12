---
id: content-test-wiring-gates-6A
title: Content-test sub-sprint #6.A — Wiring checkpoint-gates tussen pipeline-stages
fase: pre-launch
priority: now
effort: ~5 dagen
owner: claude-code
status: in-progress
created: 2026-05-12
completed: -
related-adr: -
related-spec: docs/specs/content-test-improvement-plan.md §3.2 + §4 #6.A
worktree: -
---

# Probleem

Branddock content-generation pipeline (`canvas-orchestrator.ts` ~350 regels) heeft 8 transitie-momenten tussen stages (brief-input → assemble-context → directives → angles → variant-gen → sanitize → fidelity → strict-mode → persist). Bij elke transitie zijn natuurlijke checkpoint-momenten voor automated quality-gates, maar bestaand: alleen aan eind via F-VAL composite-score. Tussen-stage failures stromen door naar volgende stage → cascading errors.

# Voorstel

Per stage een **gate-helper functie** die deterministic asserts doet op output van die stage vóór doorgeven naar volgende stage. Block-severity gates throw + SSE error met diagnostic. Warn-severity loggen naar `AICallTrace.gateWarnings` voor monitoring.

**8 checkpoint-gates** (zie plan §3.2):

```
[1] validateBriefInput(brief)
[2] validateContextCompleteness(stack)
[3] validateAngleDiversity(angles)
[4] validateVariantOutput(variant, type)
[5] validateSanitizationResult(variant)
[6] validateFidelityComposite(score, threshold)
[7] validateStrictRewrite(pre, post)
[8] validatePersistenceResult(deliverable)
```

# Acceptatiecriteria

- [ ] `src/lib/content-test/checkpoint-gates.ts` — 8 pure validate-functies
- [ ] Returns `{ pass: boolean, reasons: string[], severity: 'block' | 'warn' }`
- [ ] `canvas-orchestrator.ts` consult gates tussen stages
- [ ] Block-severity → SSE error-event met diagnostic
- [ ] Warn-severity → `AICallTrace.gateWarnings` (JSON field)
- [ ] PostHog dashboard: gate-pass-rate per stage als metric
- [ ] Alert: gate-pass-rate < 95% (degradation signaal)
- [ ] 8 stage-smokes in `scripts/smoke-tests/pipeline-checkpoint-*.ts`
- [ ] `npx tsc --noEmit` + `npm run lint` 0 errors

# Bestanden die ik aanraak (high-level)

**Nieuw**:
- `src/lib/content-test/checkpoint-gates.ts`
- `scripts/smoke-tests/pipeline-checkpoint-<stage>.ts` × 8

**Modify**:
- `src/lib/ai/canvas-orchestrator.ts` — gate-integraties
- `prisma/schema.prisma` — `AICallTrace.gateWarnings Json?` (additief)

# Risico's, scope, notes

Zie plan-doc §3.2. **Sprint-positie**: na #5.B (chain-upgraded prompts moeten eerst werken; daarna gates die output valideren).
