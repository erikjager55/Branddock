---
id: content-test-goldens-5B
title: Content-test sub-sprint #5.B — Chain-of-prompts upgrades + Layer 2 golden sets voor 8 representanten
fase: pre-launch
priority: now
effort: ~10 dagen (7d chain + 4d goldens, overlap)
owner: claude-code
status: done
created: 2026-05-12
completed: 2026-05-12
related-adr: -
related-spec: docs/specs/content-test-improvement-plan.md §3.0 + §3.1 + §4 #5.B
worktree: -
---

# Probleem

Voortbouwend op #5.A (Layer 1 deterministic property evals): nu moeten we Layer 2 (curated golden-sets per content-type, met G-Eval rubrics) bouwen. Tegelijk upgraden we de 8 prompt-templates met chain-of-prompts patronen (Chain-of-Thought, Plan-and-Solve, Tree-of-Thoughts) zodat **golden-sets meten de chain-upgraded baseline, niet de oude single-prompt variant**. Anders meten we twee verbeteringen door elkaar.

# Voorstel — twee samenhangende deliverables

## A. Chain-of-prompts upgrades (~7d)

Per content-type-categorie (8 prompt-template files in `src/lib/studio/prompt-templates/`):

- **Long-form** (blog/whitepaper/case-study/ebook/article/thought-leadership/pillar-page): Plan-and-Solve. Apart plan-stap (outline + word-budgets per sectie) → execute-stap per sectie.
- **Concept generation** (`generateCreativeAngles`): upgrade naar Tree-of-Thoughts — genereer 4-5 angles met evaluator-call → pick top-2.
- **Strategy rationale** (alle 53 types): Chain-of-Thought met `<thinking>` blocks (Anthropic native).
- **Short-form** (social, advertising, email, sales, PR): single-prompt CoT — geen Plan-and-Solve nodig.
- **Canvas inline-edit**: geen chain (directe transform).

Per chain-upgrade: A/B-test tegen baseline. Quality-delta meten via Layer 2 golden-set rubrics.

## B. Layer 2 golden-sets voor 8 representanten (~4d)

Promptfoo YAML-rubrics per representant (8 categorieën). Per type: 3 human-authored + 5 LLM-evolved + 2 adversarial = 10 goldens.

G-Eval rubric per type met 4 universal dimensies (Coherence / Consistency / Fluency / Relevance) + type-specifieke checks.

# Acceptatiecriteria

**Chain-of-prompts upgrades**:
- [ ] 8 prompt-template files: `PROMPT_VERSION` bumped naar `2.0.0` (major: breaking change)
- [ ] Plan-and-Solve geïmplementeerd voor 7 long-form types: separate plan-stage + execute-stage SSE-events
- [ ] Tree-of-Thoughts voor `generateCreativeAngles`: 4 angles + evaluator-call + top-2 selection
- [ ] Chain-of-Thought `<thinking>` blocks in 8 prompt-templates strategy-stage
- [ ] Cost-tracking per type post-upgrade: ≤ +30% van pre-chain baseline
- [ ] Latency: long-form ≤ +5s p95

**Golden-sets**:
- [ ] Promptfoo dependency installed (`npm install promptfoo`)
- [ ] `tests/content-golden-sets/<type>.yaml` × 8 representanten
- [ ] Per type: 10 goldens (3 human + 5 synthetic + 2 adversarial)
- [ ] G-Eval rubric per type (4 universal dimensies + type-specific)
- [ ] CI workflow draait golden-sets bij PR die `src/lib/studio/prompt-templates/**` raakt
- [ ] Baseline pass-rate gemeten + gedocumenteerd in `docs/audits/2026-05-XX-golden-set-baseline.md`

**A/B-test chain vs single-prompt**:
- [ ] Pre-chain baseline run + post-chain run op zelfde golden-set
- [ ] Quality-delta per dimensie gerapporteerd
- [ ] Beslissing per type: chain accepted (Δ > +5%) of rolled back (Δ < -2%)

# Bestanden die ik aanraak (high-level)

**Modify**:
- 8 prompt-template files in `src/lib/studio/prompt-templates/`
- `src/lib/ai/canvas-orchestrator.ts` — extra SSE-events voor plan-stap + execute-stap
- `src/lib/ai/creative-angles-generator.ts` (of equivalent) — ToT integration

**Nieuw**:
- `tests/content-golden-sets/<type>.yaml` × 8
- `tests/content-golden-sets/_rubric-templates/` — herbruikbare rubric-helpers
- `scripts/run-goldens.ts` — CLI runner voor lokaal/CI
- `.github/workflows/golden-sets.yml` (of equivalent) — CI hook
- `docs/audits/2026-05-XX-golden-set-baseline.md` — baseline-rapport

# Smoke test plan

Zie `docs/specs/content-test-improvement-plan.md` §4 #5.B + §3.0 voor full details.

Hoofdcheck na sprint: alle 8 representanten halen ≥ 70% pass-rate op golden-set, A/B chain-delta ≥ +5% op meerderheid dimensies.

# Risico's, scope, notes

Zie plan-doc §3.0 (chain-patterns), §3.1 (prompt-quality), §8 (risico's). Tool: Promptfoo (gratis, YAML, CI-ready) per beslissing 2026-05-12.

**Sprint-positie**: na #5.A property-evals (Layer 1 levert baseline-data over banned-phrases / language-match patterns die in golden-set-evaluation hergebruikt kunnen worden). Parallel mogelijk met testplan-content-items handmatige representant-test (levert seed-content voor goldens).
