---
id: content-test-foundation-5A
title: Content-test sub-sprint #5.A — Layer 1 generic property evals + prompt versioning + Registry UI
fase: pre-launch
priority: now
effort: ~3 dagen
owner: claude-code
status: open
created: 2026-05-12
completed: -
related-adr: -
related-spec: docs/specs/content-test-improvement-plan.md
worktree: -
---

# Probleem

Content-generation pipeline (53 types × 6-staps flow) heeft geen automated content-quality assertions. Bestaande pass-criteria in `docs/playbooks/testplan-content-items.md` checken UI-flow + structurele constraints, niet output-kwaliteit. F-VAL geeft composite-score maar geen deterministic property-eval-layer voor "schema-valid", "language-match", "no-placeholders", "brand-name capitalization", etc.

Prompt-templates zijn git-tracked maar zonder `promptVersion` field op AICallSnapshot — onmogelijk om te traceren welke prompt-versie variant X produceerde wanneer iemand een issue rapporteert. Prompt Registry backend-API bestaat (`/api/admin/prompt-registry`) maar frontend ontbreekt.

Dit is **sub-sprint #5.A** van het content-test verbeterplan (Optie B Full geaccepteerd 2026-05-12). Foundation voor alle volgende sub-sprints — moet eerst landen.

# Voorstel

Drie samenhangende deliverables, in dezelfde sprint omdat ze share dezelfde infra (AICallSnapshot + prompt-templates):

## A. Layer 1 — 10-15 generic property evals (deterministisch, 100% traffic)

Voor elke gegenereerde variant runs een snelle deterministische check-suite. Geen LLM-calls, alleen string/regex/schema-checks. Runtime < 100ms cumulatief per variant.

**De 15 checks**:

1. **Schema-valid** — variant.content matched het verwachte structure-pattern voor zijn `groupType` (e.g. markdown-headings voor blog, plain-text voor tweet, JSON-array voor carousel)
2. **Language-match** — `franc-min` detecteert taal van content; moet matchen met `workspace.contentLanguage` (NL/EN/DE). Hergebruik `detectBrandLanguage` helper.
3. **Length-bounds** — woordaantal binnen min/max uit `deliverable-types.ts` (e.g. blog 800-2000, tweet ≤ 280 chars).
4. **Banned-phrase list** — corporate jargon ("synergy", "leverage", "best-of-breed") + AI-tells ("In conclusion", "Let me explain"). Lijst in `src/lib/content-test/banned-phrases.ts`.
5. **Brand-name capitalization** — workspace brand-name moet correct gecapitaliseerd zijn in elke vermelding (LINFI niet linfi/Linfi).
6. **Placeholder detection** — regex `\[PRICE\]|\bTBD\b|€XX|\$\{.+?\}` → fail.
7. **PII/safety** — geen e-mailadressen, telefoonnummers, BSN-patronen in output.
8. **Heading hierarchy** — H1 vóór H2 vóór H3, geen sprongen. Markdown-parser.
9. **CTA presence** — types met `requiresCTA: true` (search-ad, landing-page, email) moeten een action-verb-pattern bevatten.
10. **Hallucination flag op named entities** — extract genoemde brand/product-namen; zijn ze in workspace-context aanwezig? Anders flag als potentiële hallucinatie.
11. **Sentence case in koppen** — H1/H2/H3 mogen geen Title Case zijn (anti-AI-pattern in NL).
12. **Minimum heading count** — long-form types eisen ≥ 3 H2's; structurele minimum.
13. **Markdown-leakage in plain text** — plain-text groups mogen geen `*`/`**`/`#` characters bevatten.
14. **Brand-language directive consistency** — als systemPrompt taal-instructie bevat ("Write in Dutch"), check dat content erin matcht.
15. **Duplicate-content check** — variant-A en variant-B moeten ≥ 30% verschillen (Jaccard-distance op tokens).

**Output-shape** per check:

```typescript
interface PropertyEvalResult {
  check: string;       // e.g. "language-match"
  pass: boolean;
  severity: 'block' | 'warn' | 'info';
  reason: string;      // human-readable
  evidence?: string;   // citation from content if applicable
}
```

**Integration**: hook in `canvas-orchestrator.ts` na `sanitizeVariantContent`, vóór `runFidelityScoring`. Block-severity fails throw + SSE error-event. Warn/info-severity loggen naar `AICallTrace.propertyEvalResults` (nieuwe JSON-field).

## B. Prompt versioning infrastructure

**DB-wijziging** — `AICallSnapshot.promptVersion` (String, optional) toevoegen via additieve migration.

**Prompt-template versioning convention**:
- Elk file in `src/lib/studio/prompt-templates/` krijgt een `export const PROMPT_VERSION = "1.0.0"`-constant
- Semver: major bump bij breaking-change in output-format, minor bij content-tuning, patch bij typo/wording
- Bij elke AI-call: orchestrator pakt `PROMPT_VERSION` op + zet in snapshot

**Helper utility** — `src/lib/ai/prompt-version-registry.ts` (nieuw):

```typescript
export const PROMPT_VERSIONS = {
  'long-form': '1.0.0',
  'social-media': '1.0.0',
  'advertising': '1.0.0',
  // ... 8 categories
} as const;

export function getPromptVersion(category: PromptCategory): string {
  return PROMPT_VERSIONS[category];
}
```

## C. Prompt Registry UI v1

**Locatie**: Settings → Developer → AI Prompts (tab nieuw)

**Functionaliteit**:
- Lijst van prompt-categories met versie + last-modified + call-count laatste 7d
- Click op een category → drill-in panel:
  - Diff-view tussen versies (git-style)
  - Recent 10 AICallSnapshot records (timestamp, deliverable, contentType, fidelity-score)
  - Property-eval pass-rate aggregaat (uit `AICallTrace.propertyEvalResults`)
- Geen edit-functionaliteit pre-launch (alleen view)

# Acceptatiecriteria

**Layer 1 property evals**:
- [ ] `src/lib/content-test/property-evals.ts` (nieuw) — 15 pure check-functies + `runAllPropertyEvals(variant, context)` orchestrator
- [ ] `src/lib/content-test/banned-phrases.ts` (nieuw) — NL + EN lijst, eenvoudig uit te breiden
- [ ] Block-severity (5/15: placeholder, PII, hallucination-flag, banned-phrase, brand-mismatch) throws + SSE error
- [ ] Warn-severity logged to `AICallTrace.propertyEvalResults`
- [ ] `canvas-orchestrator.ts` consults `runAllPropertyEvals` post-sanitize, pre-fidelity-scoring
- [ ] Smoke-test `scripts/smoke-tests/property-evals.ts` — synthetic-input → expected pass/fail per check (15 scenarios)
- [ ] Total runtime check-suite < 100ms cumulatief per variant op test-fixtures
- [ ] Property-eval-results zichtbaar in Studio UI BrandReviewFinding-panel (re-use bestaande surface)

**Prompt versioning**:
- [ ] DB migration: `AICallSnapshot.promptVersion String?` (additief, nullable voor backwards-compat)
- [ ] 8 prompt-template files in `src/lib/studio/prompt-templates/` krijgen `PROMPT_VERSION` constant op `1.0.0`
- [ ] `src/lib/ai/prompt-version-registry.ts` (nieuw) — type-safe lookup helper
- [ ] `canvas-orchestrator.ts` zet `promptVersion` in AICallSnapshot bij elke call
- [ ] Smoke-test: run één generation, verify snapshot.promptVersion = "1.0.0"

**Prompt Registry UI**:
- [ ] `src/features/settings/pages/PromptRegistryPage.tsx` (nieuw) — Settings tab
- [ ] Backend route `/api/admin/prompt-registry` verifieer + extend (returns versions + call-counts + diffs)
- [ ] Hook `useDevPrompts()` voor data-fetch
- [ ] Diff-view component (gebruikt `diff` npm package of gelijkwaardig)
- [ ] Property-eval pass-rate aggregate per category (uit AICallTrace JSON-field)
- [ ] Access-control: alleen workspace owners + developer-emails (uit `DEVELOPER_EMAILS` env)

**Quality gates**:
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Unit-tests property-evals (15 checks × ≥3 cases each = ≥45 test-cases) — pure functions, fast
- [ ] Integration-smoke: generate content op Napking workspace, verify alle 15 checks runnen + results in snapshot/trace
- [ ] UI-smoke: open Settings → AI Prompts, drill into long-form, zie versie + recent-calls + pass-rate

# Bestanden die ik aanraak

**Nieuw**:
- `src/lib/content-test/property-evals.ts` — 15 check-functies + orchestrator
- `src/lib/content-test/banned-phrases.ts` — vocab-list (NL + EN)
- `src/lib/content-test/types.ts` — `PropertyEvalResult` + helper types
- `src/lib/ai/prompt-version-registry.ts` — type-safe lookup
- `scripts/smoke-tests/property-evals.ts` — 15-scenarios fixture-test
- `src/features/settings/pages/PromptRegistryPage.tsx` — UI
- `src/features/settings/components/PromptRegistryDiffView.tsx` — diff-component
- `src/features/settings/hooks/useDevPrompts.ts` — data-hook
- `prisma/migrations/<timestamp>_add_prompt_version/migration.sql`

**Modify**:
- `prisma/schema.prisma` — `AICallSnapshot.promptVersion String?` + `AICallTrace.propertyEvalResults Json?` velden
- `src/lib/ai/canvas-orchestrator.ts` — wire property-evals + prompt-version snapshot
- 8 prompt-template files in `src/lib/studio/prompt-templates/` — `PROMPT_VERSION` constant toevoegen
- `src/app/api/admin/prompt-registry/route.ts` — verifieer/extend voor diff-data
- Settings navigation: voeg "AI Prompts" tab toe aan Developer-section

# Bestanden die ik NIET aanraak

- F-VAL judge-pijler — apart sub-sprint #6.B
- Golden-sets infrastructure — apart sub-sprint #5.B
- Auto-iterate orchestrator — apart sub-sprint #6.B
- Chain-of-prompts upgrades — apart in #5.B
- Andere routes buiten content-generation pipeline

# Smoke test plan

**Unit-level** (na implementatie):
1. `npx tsx scripts/smoke-tests/property-evals.ts` — 15 checks × ≥3 fixtures elk pass

**Integration-level**:
2. Generate één blog-post op Napking workspace → verify:
   - AICallSnapshot.promptVersion = "1.0.0"
   - AICallTrace.propertyEvalResults bevat 15 check-results
   - Block-severity violations (zoals placeholder-detect) zouden generation laten falen — test met malformed input

**UI-level**:
3. Open Settings → Developer → AI Prompts
4. Click long-form → verify versie + last-modified + call-count tonen
5. Property-eval pass-rate aggregaat tonen

**Edge-cases**:
- Property-eval runtime > 100ms moet warning loggen (geen failure)
- AICallSnapshot zonder promptVersion (legacy records) moeten gracefully renderen in UI

# Risico's

- **Runtime overhead** > 100ms per variant kan SSE latency-impact veroorzaken. **Mitigatie**: alle checks pure-functions, eager-fail bij eerste block; meten met perf-test
- **False-positive banned-phrases** — legitieme uses van "leverage" of "synergy" in technical context. **Mitigatie**: severity warn (geen block), pilot-feedback → tunen
- **Hallucination-flag false-positives** — content noemt brand-asset dat WEL bestaat maar niet in stack-injection zat. **Mitigatie**: severity warn, en flag bij naam matching < 80%
- **Prompt-registry route security** — moet workspace-owner-only zijn (geen leak van prompts naar non-admin users). **Mitigatie**: bestaande `requireDeveloperRole()` middleware hergebruiken
- **Diff-view performance** bij grote prompts. **Mitigatie**: lazy-load + truncate-with-expand voor diffs > 500 regels

# Out of scope

- Edit-functionaliteit voor prompts via UI (read-only pre-launch)
- Prompt-rollback button (post-launch)
- A/B-testing van prompt-versies (sub-sprint #5.B golden-sets dekt dit)
- Property-eval check 16+ — uitbreiding na pilot-feedback
- LLM-as-judge metrics — Layer 2 in #5.B
- Multi-language banned-phrase libraries — alleen NL + EN pre-launch (DE in volgende sprint indien Goed-Bouw vraag triggert)

# Notes

**Sprint-positie**: eerste sub-sprint van #5. Geen blocker maar wel foundation voor #5.B (golden sets need property-eval baseline) en #6.B (auto-iterate consumes property-eval-results als feedback-signaal).

**Tool-keuze rationale** (uit plan §7 beslissing 2): eigen lightweight implementatie ipv externe libs. Houdt stack TypeScript + maakt customization makkelijker voor brand-specifieke checks (e.g. "Napking moet altijd capital N hebben" is brand-tuned, niet generic).

**Cost-impact**: 0 — alle 15 checks zijn deterministisch, geen AI-calls. Runtime-impact ≤ 100ms per generation.

**Cross-references**:
- Plan: `docs/specs/content-test-improvement-plan.md` §2 Layer 1 + §3.1 sub-plan A
- Bestaand: `detectBrandLanguage` in `src/lib/i18n/detect-brand-language.ts` (hergebruik voor check #2)
- Bestaand: `franc-min` v6.2.0 dependency
- Volgende: sub-sprint #5.B `content-test-goldens-5B` (Layer 2 golden sets + chain-of-prompts upgrades)
