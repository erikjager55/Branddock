# Ad Quality Validation Layer — Functionele & Technische Spec

> **Status**: Concept · gestart 2026-05-22
> **Architectuur-anker**: [ADR 2026-05-22-ad-quality-validation](../adr/2026-05-22-ad-quality-validation.md). Lees die eerst voor *waarom* — deze spec dekt *wat* en *hoe*.
> **Parent-spec**: [ad-publishing.md](./ad-publishing.md) — deze layer is Fase A.5 binnen het ad-publishing-traject.
> **Lezer**: developer (mezelf of parallel-sessie) die search-ad-first de Quality Validation Layer wil bouwen zonder ADR + parent-spec opnieuw door te nemen.

---

## 1. Scope + non-scope

### In scope

- **L1 — Static rule-engine** per ad-platform/type met deterministic checks (char-overflow, ALL CAPS, banned phrases, structural duplicates, keyword presence, coverage thresholds).
- **L2 — AI-judge laag** met platform/type-specifieke kwaliteits-dimensions, gestructureerde JSON-output, F-VAL judge-architectuur als template.
- **Score aggregation** naar 0-100 + Google-style label (Poor / Average / Good / Excellent).
- **UI**: kleur-gecodeerde badge per variant op Content Canvas Step 2 + expandable breakdown drawer met per-rule + per-dimension uitleg + fix-suggesties.
- **Plugin-registry** voor extensibility (`AD_VALIDATORS_BY_TYPE` + `AD_VALIDATORS_BY_PLATFORM`).
- **`AdQualityScore` Prisma model** voor persistentie van score-history per deliverable + variant.
- **Roll-out volgorde**: search-ad (A.5.1) → display-ad (A.5.2) → facebook-ad (A.5.3) → linkedin-ad (A.5.4).

### Non-scope (later spec / ADR)

- **Hard-gate publish** bij minimum-score threshold — eerst soft-warn vertrouwen opbouwen.
- **L3 Marketing-API ground-truth** (Google Ad Strength via Google Ads API, Meta Relevance via Insights API) — vereist Fase B OAuth-publish live; komt in vervolg-ADR.
- **AI improvement-engine** die lage-score-ads automatisch rewrite — vervolg-ADR, gebruikt scores als signal.
- **Quality check voor video-ad** — Google heeft geen search-equivalent voor video; mogelijk later met YouTube-specific indicators of bij blijven met F-VAL.
- **Per-keyword Quality Score** (Google's Quality Score 1-10 per keyword) — vereist live ad-account + keyword-data; out-of-scope tot Fase B.
- **Cross-variant score-comparison logic** ("Variant A scoort beter dan B, kies A automatisch") — UI toont scores, beslissing blijft bij user.

---

## 2. Bestaande infra die we hergebruiken

| Asset | Pad | Hoe |
|---|---|---|
| F-VAL fidelity-runner | `src/lib/brand-fidelity/fidelity-runner.ts` | Pattern-template voor `runAdQualityValidation()` — fail-soft semantics, brand-context fetching, persistence-via-deliverable-settings approach |
| F-VAL composition-engine | `src/lib/brand-fidelity/composition-engine.ts` | Weighted multi-pillar score-aggregation; adopteer dezelfde formula-shape voor L1+L2 combinatie |
| F-VAL judge-dispatcher | `src/lib/brand-fidelity/judge-dispatcher.ts` | LLM-judge dispatch pattern → blueprint voor per-platform L2-judge dispatch |
| F-VAL g-eval-rubric | `src/lib/brand-fidelity/g-eval-rubric.ts` | Structured-rubric prompting pattern voor LLM-as-judge |
| Brand context fetching | `getBrandContext(workspaceId)` | 5-min cached brand-context, herbruikbaar voor L2 prompts |
| Prisma 7 + adapter-pg | `prisma/schema.prisma` | `AdQualityScore` model toevoegen, geen schema-conflicten verwacht |
| TanStack Query 5 | `src/lib/query/` | Hook `useAdQualityScore(deliverableId, variantIndex)` voor UI consumption |
| Design tokens | `src/lib/constants/design-tokens.ts` | Color tokens voor Poor / Average / Good / Excellent badge — Tailwind 4 inline-style or `@theme` extension |
| Inline-edit groups | `useEditableEntry()` | Source-of-truth voor gegenereerde content die L1 + L2 valideren |
| MediumEnrichment seed | `prisma/seed.ts` | `componentTemplate.maxLength` is bron voor L1 char-overflow check — geen duplicatie van limits |

---

## 3. Data-model

### 3.1 `AdQualityScore` (Prisma)

```prisma
model AdQualityScore {
  id              String   @id @default(cuid())
  deliverableId   String
  deliverable     Deliverable @relation(fields: [deliverableId], references: [id], onDelete: Cascade)

  variantIndex    Int      // 0 = Variant A, 1 = Variant B
  platform        String   // "google" | "meta" | "linkedin"
  contentType     String   // "search-ad" | "display-ad" | "facebook-ad" | "linkedin-ad"

  overallScore    Int      // 0-100
  ratingLabel     String   // "poor" | "average" | "good" | "excellent"

  // L1 deterministic results — array of { ruleId, category, status, message, suggestion? }
  l1Results       Json
  // L2 AI-judge results — { dimensions: { [name]: { score, rationale, suggestion } }, summary }
  l2Results       Json

  // Cache invalidation: bumpt bij elke content-regenerate
  contentHash     String   // hash of all variantGroup contents at scoring-time
  generatedAt     DateTime @default(now())

  @@unique([deliverableId, variantIndex, contentHash])
  @@index([deliverableId])
  @@index([platform, contentType])
}
```

**contentHash compositie** — SHA-256 over een canonical-JSON van:

```ts
// src/lib/ad-validation/content-hash.ts
export function contentHash(ctx: ValidatorContext): string {
  const payload = {
    groups: Object.fromEntries([...ctx.groups.entries()].sort()),  // sorted for determinism
    primaryKeyword: ctx.primaryKeyword ?? null,
    platform: ctx.platform,
    contentType: ctx.contentType,
    ruleVersion: RULE_VERSION,        // bump bij rule-set wijziging
    judgeVersion: JUDGE_VERSION,      // bump bij L2 prompt-schema wijziging
    weightsVersion: WEIGHTS_VERSION,  // bump bij L1_WEIGHT/L2_WEIGHT verandering
  };
  return sha256(JSON.stringify(payload));
}

// Constants live in src/lib/ad-validation/versions.ts — pure semver strings.
// Bumpen vereist code-deploy, niet runtime-config.
```

Drie versie-constanten geven controle over invalidation:
- `RULE_VERSION` bump → alle scores hercomputeren bij volgende variant-render (oude rows blijven voor audit, nieuwe rows worden geschreven)
- `JUDGE_VERSION` bump → idem voor L2 changes
- `WEIGHTS_VERSION` bump → aggregatie-weights gewijzigd, score-betekenis verschoven

Bij regenerate van content verandert `groups` → andere hash → nieuwe row. Oude row blijft staan; query laatste row per deliverable+variantIndex via `orderBy: { generatedAt: 'desc' }`.

**Unique-key garandeert idempotency** — zelfde input geeft nooit twee rows. Bij rule/judge/weights-versie bump is een nieuwe scoring een additieve write, geen update. UI kan tonen "Score is verouderd; rule-set is bijgewerkt" als `latestScore.weightsVersion !== currentWeightsVersion` (out-of-scope voor A.5.1, prepare-veld is genoeg).

**Retention**: geen automatische delete. Disk-cost is verwaarloosbaar (<1KB per row, max ~10 rows per deliverable over levensduur). Vervolg-spec kan retention-policy invoeren als nodig.

### 3.2 Rules-as-code, geen DB-registry

Beslissing: L1-regels en L2-dimensions leven in TypeScript files, niet in een `AdQualityRule` table. Voordelen:
- Type-safety: regel-shape gecontroleerd door TS compiler.
- Versioning via git: regel-wijzigingen zijn diff-baar.
- Geen migratie-overhead bij nieuwe regels.
- Eenvoudiger testen (pure functies).

Nadeel: workspace-specifieke overrides vereist later code-change of `RuleConfig` override-table (out-of-scope nu).

---

## 4. L1 Static Rule-Engine

### 4.1 File-layout

```
src/lib/ad-validation/
├── index.ts                              # public API: runAdQualityValidation()
├── registry.ts                           # AD_VALIDATORS_BY_TYPE + BY_PLATFORM
├── types.ts                              # shared types (RuleResult, ValidatorContext, etc.)
├── aggregation.ts                        # weighted score-aggregation
├── content-hash.ts                       # contentHash() helper
├── rules/
│   ├── shared/                           # rules cross-platform (no platform suffix)
│   │   ├── char-overflow.ts
│   │   ├── all-caps.ts
│   │   ├── banned-superlatives.ts
│   │   └── duplicate-strings.ts
│   ├── google/
│   │   ├── search-ad.ts                  # registers 15 search-ad rules
│   │   └── display-ad.ts                 # registers multi-size rules
│   ├── meta/
│   │   └── facebook-ad.ts
│   └── linkedin/
│       └── linkedin-ad.ts
├── judge/
│   ├── dispatcher.ts                     # LLM-call wrapper, mirror van F-VAL judge-dispatcher
│   ├── google-search-judge.ts            # 4 dimensions: hook-strength, uniqueness, cta-clarity, keyword-relevance
│   ├── google-display-judge.ts           # 3 dimensions: visual-text-fit, scanning-pattern-fit, headline-distinction
│   ├── meta-facebook-judge.ts            # 3 dimensions: hook-stop-power, body-cta-alignment, image-text-synergy
│   └── linkedin-ad-judge.ts              # 3 dimensions: professional-tone, value-prop-clarity, b2b-relevance
└── runner.ts                             # orchestrator: L1 first, then L2, then aggregate
```

### 4.2 Common rule shape

```ts
// src/lib/ad-validation/types.ts
export type RuleStatus = 'pass' | 'warn' | 'fail';
export type RuleCategory = 'mechanical' | 'structural' | 'coverage';

export interface RuleResult {
  ruleId: string;             // 'search-ad.headline-char-overflow.h1'
  category: RuleCategory;
  status: RuleStatus;
  message: string;            // human-readable
  suggestion?: string;        // optional fix-hint
  fieldGroup?: string;        // 'headline-1' — which group triggered (for UI highlighting)
}

export interface ValidatorContext {
  groups: Map<string, string>;          // groupName → content (from useEditableEntries serialized)
  platform: string;
  contentType: string;
  primaryKeyword?: string;              // from seoInput.primaryKeyword
  componentTemplate: ComponentTemplateItem[];  // from MediumEnrichment seed
  brandContext: BrandContext;
}

export type Rule = (ctx: ValidatorContext) => RuleResult[];
```

Elke regel is een pure functie: `ValidatorContext → RuleResult[]` (array omdat één rule meerdere groups kan checken; bv. char-overflow run over alle headline-groups levert 3 results).

### 4.3 Registry-driven dispatch

```ts
// src/lib/ad-validation/registry.ts
import { searchAdRules } from './rules/google/search-ad';
import { displayAdRules } from './rules/google/display-ad';
import { facebookAdRules } from './rules/meta/facebook-ad';
import { linkedinAdRules } from './rules/linkedin/linkedin-ad';
import type { Rule } from './types';

export const AD_VALIDATORS_BY_TYPE: Record<string, Rule[]> = {
  'search-ad': searchAdRules,
  'display-ad': displayAdRules,
  'facebook-ad': facebookAdRules,
  'linkedin-ad': linkedinAdRules,
};

export function getRulesFor(contentType: string): Rule[] {
  return AD_VALIDATORS_BY_TYPE[contentType] ?? [];
}
```

Nieuwe ad-type registreren: nieuw file in `rules/<platform>/<type>.ts`, exporteer rule-array, registreer in `AD_VALIDATORS_BY_TYPE`. Geen framework-wijziging.

### 4.4 Concrete L1 rule-set: search-ad (15 rules)

| Rule ID | Category | Check | Severity bij hit | Suggestion-template |
|---|---|---|---|---|
| `search-ad.char-overflow.h1` | mechanical | `groups.get('headline-1').length > 30` | fail | "Headline 1 is {N} tekens — Google rejecteert >30. Verkort naar {N-overshoot} tekens." |
| `search-ad.char-overflow.h2` | mechanical | idem voor headline-2 | fail | idem |
| `search-ad.char-overflow.h3` | mechanical | idem voor headline-3 | fail | idem |
| `search-ad.char-overflow.d1` | mechanical | `description-1` >90 | fail | "Description 1 is {N} tekens — max 90." |
| `search-ad.char-overflow.d2` | mechanical | `description-2` >90 | fail | idem |
| `search-ad.char-overflow.paths` | mechanical | path-1 of path-2 >15 | fail | "Display path is {N} tekens — max 15." |
| `search-ad.char-overflow.sitelinks` | mechanical | sitelink-N-title >25 OR -description >35 | fail | "Sitelink {N} is te lang." |
| `search-ad.all-caps.headlines` | mechanical | any headline = uppercase | fail | "Headline {N} is ALL CAPS — Google policy schendt, gebruik Title Case." |
| `search-ad.exclamation.headlines` | mechanical | any headline contains `!` | fail | "Headline {N} bevat `!` — Google staat geen exclamation marks in headlines toe." |
| `search-ad.banned-superlatives` | mechanical | regex match `\b(best|#1|top-rated|nummer.?1)\b` zonder proof-marker | warn | "Headline {N} bevat ongesubstantieerde superlatief '{word}'. Voeg specifieke proof toe of vervang." |
| `search-ad.duplicate-headlines` | structural | exact-match dedup over h1/h2/h3 | fail | "Headline {A} en Headline {B} zijn identiek. Google rotation maakt ze inwisselbaar — verspilde slot." |
| `search-ad.duplicate-description` | structural | exact-match dedup d1/d2 | fail | "Descriptions zijn identiek — gebruik tweede slot voor secondary benefit + CTA." |
| `search-ad.sitelink-restating-title` | structural | sitelink-N-description bevat sitelink-N-title als substring of 70%+ overlap | warn | "Sitelink {N} description herhaalt de title. Voeg unieke value toe." |
| `search-ad.keyword-in-h1` | structural | als `primaryKeyword` aanwezig: case-insensitive substring check in headline-1 | warn | "Primary keyword '{keyword}' niet in Headline 1. Quality Score-component 'Ad Relevance' lijdt eronder." |
| `search-ad.keyword-in-d1` | structural | als `primaryKeyword` aanwezig: idem voor description-1 | warn | "Primary keyword '{keyword}' niet in Description 1. Sterkere QS-relevance als het er wel staat." |
| `search-ad.coverage.headline-count` | coverage | <3 niet-lege headlines | fail | "Slechts {N} headline(s) gevuld. Google vereist minimum 3." |
| `search-ad.coverage.description-count` | coverage | <2 niet-lege descriptions | fail | "Slechts {N} description(s). Google vereist minimum 2." |
| `search-ad.coverage.sitelink-count` | coverage | <4 sitelinks met title gevuld | warn | "Slechts {N}/4 sitelinks gevuld. Volle 4 boost Ad Strength." |

> NB: dit zijn 18 regel-IDs maar veel zijn varianten van dezelfde check (char-overflow per groep). Implementatie kan compact via één `charOverflowRule()` factory die over alle relevant groups itereert — daarmee kleiner dan 18 lines code.

### 4.5 L1 rule-sets voor andere ad-types — placeholders

- `display-ad`: char-overflow per-size, distinct-headlines-across-sizes (rectangle ≠ skyscraper), text-on-image warning bij visual-direction die "text overlay" noemt, coverage per-size.
- `facebook-ad`: body ≤125 hard fail, headline ≤40, cta-button match-Meta-presets warning, no-hashtag-in-body, no-link-in-body.
- `linkedin-ad`: headline ≤70, body ≤150, description ≤100, professional-tone warnings (informal contractions).

Detail-rule-sets schrijven we in A.5.2/3/4 implementation-phases — per platform een eigen sub-spec-update.

---

## 5. L2 AI-Judge Laag

### 5.1 Dispatcher architectuur

Spiegel van F-VAL judge-dispatcher (`src/lib/brand-fidelity/judge-dispatcher.ts`):

```ts
// src/lib/ad-validation/judge/dispatcher.ts
import { anthropicClient } from '@/lib/ai/anthropic-client';

export async function runAdJudge(
  ctx: ValidatorContext
): Promise<L2JudgeResult> {
  const judge = getJudgeFor(ctx.contentType);  // returns platform-specific judge
  const prompt = judge.buildPrompt(ctx);
  const response = await anthropicClient.messages.create({
    model: 'claude-haiku-4-5-20251001',          // small + fast judge model
    max_tokens: 2000,
    system: 'You are an ad quality judge. Output ONLY valid JSON matching the schema.',
    messages: [{ role: 'user', content: prompt }],
  });
  return judge.parseResponse(response.content[0].text);
}
```

Judge-model is Haiku 4.5 (snel, goedkoop, voldoende voor scoring-taak). Cost ~$0.001 per ad-generation (per ADR).

### 5.2 Judge JSON output-schema

```ts
export interface L2JudgeResult {
  dimensions: Record<string, {
    score: number;           // 0-100
    rationale: string;       // 1-2 sentence why
    suggestion?: string;     // optional improvement-hint
  }>;
  summary: string;           // 1-2 sentence overall verdict
}
```

Dimensions per platform/type (vast schema, per judge gedefinieerd):

| Platform / Type | Dimensions |
|---|---|
| `google/search-ad` | hook-strength, headline-uniqueness, cta-clarity, keyword-relevance |
| `google/display-ad` | visual-text-fit, scanning-pattern-fit, headline-distinction |
| `meta/facebook-ad` | hook-stop-power, body-cta-alignment, image-text-synergy |
| `linkedin/linkedin-ad` | professional-tone, value-prop-clarity, b2b-relevance |

### 5.2.1 Runner orchestratie (`runner.ts`)

Sequentieel: L1 eerst → L2 daarna → aggregate. L1-errors zijn praktisch onmogelijk (pure functies); L2 kan netwerk-issues hebben. Failure-policy: **L1-only-fallback** — als L2 faalt persisteren we de L1-score met `l2Results: { error, fallback: true }` en de UI toont de badge met aantekening "AI-judge unavailable, mechanical checks only".

```ts
// src/lib/ad-validation/runner.ts (pseudo-code, fail-soft mirror van F-VAL fidelity-runner)
export async function runAdQualityValidation(
  deliverableId: string,
  variantIndex: number,
): Promise<AdQualityScore> {
  const ctx = await buildValidatorContext(deliverableId, variantIndex);
  const hash = contentHash(ctx);

  // Idempotency check
  const existing = await prisma.adQualityScore.findUnique({
    where: { deliverableId_variantIndex_contentHash: { deliverableId, variantIndex, contentHash: hash } }
  });
  if (existing) return existing;

  // L1 — pure functions, always succeed
  const l1Results = runL1Rules(ctx);

  // L2 — LLM call with timeout + retry; fail-soft to L1-only
  let l2Results: L2JudgeResult | { error: string; fallback: true };
  try {
    l2Results = await withRetry(
      () => runAdJudge(ctx),
      { attempts: 2, backoffMs: 500, timeoutMs: 5000 },
    );
  } catch (err) {
    console.warn('[ad-quality] L2 judge failed, using L1-only', err);
    l2Results = { error: (err as Error).message, fallback: true };
  }

  const { overallScore, ratingLabel } = aggregate(ctx, l1Results, l2Results);

  return await prisma.adQualityScore.create({
    data: { deliverableId, variantIndex, platform: ctx.platform, contentType: ctx.contentType,
            overallScore, ratingLabel, l1Results, l2Results, contentHash: hash }
  });
}
```

**Failure-modes mapped**:
| L2 failure type | Behavior |
|---|---|
| Network timeout / 5xx / 429 | Retry once (500ms backoff), if still failing → fallback |
| Malformed JSON parse | Single attempt only (deterministic error) → fallback |
| Anthropic rate-limit (429 with `retry-after`) | Honor `retry-after`, max 1 retry → fallback |
| L1 returned 0 rules (unknown contentType) | Fail loud — return 500 to caller (mis-configuratie, geen graceful degrade) |

Bij `fallback: true` rendert de badge nog steeds de score (L1-only weighted), maar de drawer toont een "L2 judge unavailable" notice ipv dimensions.

### 5.3 Prompt-template structuur (search-ad voorbeeld)

```
SYSTEM: You are a senior Google Ads quality judge with 10+ years auditing Responsive Search Ads against Google's Ad Strength and Quality Score criteria.

For each dimension below, score 0-100 (Poor 0-25, Average 26-50, Good 51-75, Excellent 76-100), give a 1-sentence rationale, and an optional 1-sentence improvement suggestion. Output ONLY valid JSON.

## Ad to judge

[primary keyword]: {primaryKeyword}
[headlines]:
  H1: {headline-1}
  H2: {headline-2}
  H3: {headline-3}
[descriptions]:
  D1: {description-1}
  D2: {description-2}
[paths]: /{path-1}/{path-2}
[sitelinks]:
  S1: {sitelink-1-title} — {sitelink-1-description}
  ... (S2-S4)

## Dimensions to score

1. **hook-strength** (how scroll-stopping is H1 within the SERP context?)
2. **headline-uniqueness** (do H1, H2, H3 each carry distinct meaning, or do they overlap conceptually?)
3. **cta-clarity** (does D2 close with a specific, action-oriented CTA?)
4. **keyword-relevance** (how naturally is the primary keyword integrated into H1 + D1?)

## Output schema

{
  "dimensions": {
    "hook-strength": { "score": N, "rationale": "...", "suggestion": "..." },
    ...
  },
  "summary": "1-2 sentence overall verdict."
}
```

Brand-context (tone, persona, products) wordt geïnjecteerd voor scoring-context — zelfde pattern als F-VAL judge.

**Empty-context fallback**: als `getBrandContext(workspaceId)` een minimaal-gevulde context teruggeeft (geen BrandVoiceguide, geen personas, geen products — alleen workspace.name), schakelt de judge naar **generic-mode**: brand-context wordt omited uit de prompt, dimensions worden gescoord puur op de ad-content zelf zonder brand-fit lens. Dit is correct gedrag voor early-stage workspaces — het systeem mag niet weigeren te scoren omdat brand-setup incomplete is. UI toont in de drawer een notice: "Score is platform-only (workspace heeft nog geen brand voice). Score is meer accuraat na brand-foundation invullen."

Concrete check: `judge.buildPrompt(ctx)` runt een `hasMinimalBrandContext(ctx.brandContext)` precheck. Returnt false → generic prompt-variant zonder `## Brand Context` blok.

---

## 6. Score Aggregation

### 6.1 Formule

```
overallScore = clamp(
  0,
  100,
  (L1_BASE - L1_PENALTIES) * L1_WEIGHT + L2_AVG * L2_WEIGHT
)

L1_BASE       = 100 (start)
L1_PENALTIES  = sum(per-rule penalty based on status):
                  - First fail: -25
                  - Each subsequent fail: -10 (lineair cumulatief, geen cap)
                  - Each warn: -5 (lineair cumulatief)
                  - pass: 0
                  L1_BASE - L1_PENALTIES clamped to [0, 100] vóór weighting

Example: 3 fails + 1 warn = -(25 + 10 + 10 + 5) = -50 penalty → L1 = 50.
         5 fails = -(25 + 10×4) = -65 → L1 = 35.
         10 fails = -(25 + 10×9) = -115 → clamped naar L1 = 0.

Penalty-waarden zijn framework-global (niet per-platform tunable in initiële release). Indien een platform andere severity-curve nodig blijkt, voegt vervolg-spec een `L1_PENALTY_PROFILE` per validator-entry toe. Out-of-scope nu.
L1_WEIGHT     = 0.4   (default; per platform tunable)
L2_AVG        = average(dimensions[*].score)
L2_WEIGHT     = 0.6   (default; per platform tunable)
```

Een ad met 0 L1-failures en gemiddeld L2=80 → score = 100×0.4 + 80×0.6 = 88 → Good.
Een ad met 2 L1-failures, 1 warn, en L2=75 → L1_score = 100-25-10-5 = 60 → 60×0.4 + 75×0.6 = 69 → Good (op grens).
Een ad met 5 L1-failures, L2=50 → L1_score = 100-25-10-10-10-10 = 35 → 35×0.4 + 50×0.6 = 44 → Average.

### 6.2 Per-platform weights

| Platform / Type | L1_WEIGHT | L2_WEIGHT |
|---|---|---|
| `google/search-ad` | 0.45 | 0.55 (mechanical correctness matters extra voor Google policy) |
| `google/display-ad` | 0.35 | 0.65 (semantic visual-text-fit weegt zwaarder) |
| `meta/facebook-ad` | 0.30 | 0.70 (hook-stop-power is primair, mechanical limits laag) |
| `linkedin/linkedin-ad` | 0.40 | 0.60 |

### 6.3 Label-mapping (matcht Google Ad Strength colors)

| Score | Label | Color |
|---|---|---|
| 0-25 | Poor | red (`#DC2626`) |
| 26-50 | Average | orange (`#EA580C`) |
| 51-75 | Good | yellow (`#CA8A04`) |
| 76-100 | Excellent | green (`#16A34A`) |

Color tokens worden toegevoegd aan `src/lib/constants/design-tokens.ts` + `globals.css` `@theme inline` (Tailwind 4 conventie per CLAUDE.md).

---

## 7. UI Design

### 7.1 Badge component

`src/features/campaigns/components/canvas/ads/AdQualityBadge.tsx`

```tsx
<AdQualityBadge
  score={78}
  label="good"
  onClick={() => setDrawerOpen(true)}
/>
```

- Hoogte 28px, breedte ~auto. Geplaatst bovenaan elke variant-preview-card.
- Layout: kleur-cirkel (8×8px) + label + score: `● Good · 78/100`.
- Tailwind 4 utility-classes met inline-style fallback voor color-tokens (cf. Tailwind 4 caveats).
- Clickable → opent drawer voor breakdown.

### 7.2 Breakdown-drawer

`src/features/campaigns/components/canvas/ads/AdQualityDrawer.tsx`

Side-drawer (slide-in from right, `max-width: 480px`) of full-width-collapsible-section onder de variant-card. Twee tabs:

**Tab 1 — Rules** (L1)
- Gegroepeerd per category (Mechanical / Structural / Coverage).
- Per rule: icoon (✓ pass / ⚠ warn / ✕ fail) + message + suggestion (indien aanwezig) + "Go to field" link die de relevante `fieldGroup` highlight in de preview.

**Tab 2 — AI-judge dimensions** (L2)
- Per dimensie: score-bar (0-100 met kleur), rationale tekst, suggestion (indien aanwezig).
- Summary onder de dimensies.

### 7.3 API + UI flow (wanneer wordt gescoord)

**Trigger-flow** (automatic, geen aparte UI-knop):

```
1. User klikt "Regenerate variants" (of opent Step 2 voor het eerst na content-generation)
   ↓
2. canvas-orchestrator finalizet de variant-groups in DB
   ↓
3. Na DB-commit: fire-and-forget POST /api/deliverables/{id}/ad-quality?variantIndex=0
   AND POST /api/deliverables/{id}/ad-quality?variantIndex=1
   ↓
4. API-route runt runAdQualityValidation(deliverableId, variantIndex)
   - Idempotency-check via contentHash — bestaande row? return direct
   - Anders: L1 + L2 + aggregate + persist → return AdQualityScore
   ↓
5. UI gebruikt TanStack Query hook useAdQualityScore(deliverableId, variantIndex)
   - queryKey: ['ad-quality', deliverableId, variantIndex]
   - staleTime: 5min (content rarely changes within that window)
   - Auto-refetch wanneer canvas-orchestrator een 'content_complete' SSE-event fired
   ↓
6. Badge rendert zodra de query resolve't. Skeleton state tijdens loading (~2s).
```

**API contract**:

```ts
// POST /api/deliverables/[id]/ad-quality?variantIndex=N
// Auth: session, workspace-scoped via resolveWorkspaceId
// Body: empty (deliverableId in URL, variantIndex in query)
// Response:
{
  id: string;                    // AdQualityScore.id
  overallScore: number;          // 0-100
  ratingLabel: 'poor' | 'average' | 'good' | 'excellent';
  l1Results: RuleResult[];
  l2Results: L2JudgeResult | { error: string; fallback: true };
  generatedAt: string;           // ISO-8601
  contentHash: string;
}
// 200 = new or existing score returned
// 404 = deliverable not found
// 400 = unknown contentType (no validators registered)
// 500 = unexpected error
```

### 7.4 "Go to field" highlight mechanism

De drawer's "Go to field" link triggert een focus-event op de bijbehorende inline-edit cell in de preview. Implementatie hergebruikt het bestaande `useEditableEntry` mechanisme — de hook exposed al een `focus()` API per group via een `useEditableFocus()` companion-hook (TBD: verifiëren of die bestaat; zo niet, eerste stap van A.5.1 is hem toevoegen aan `InlineEditableSection.tsx`).

Visuele highlight: 2-second pulsing `outline-2 outline-emerald-500` op de target cell + smooth-scroll naar de cell als die buiten viewport is. Implementatie:

```tsx
// In AdQualityDrawer
<button onClick={() => focusGroup(rule.fieldGroup)}>
  Go to field
</button>

// In InlineEditableSection — nieuwe useEditableFocus hook
const { register } = useEditableFocus();
useEffect(() => register(groupName, ref), [groupName]);
// focusGroup(name) → ref.current.focus() + scrollIntoView + pulse-class toggle
```

Als `useEditableFocus` nog niet bestaat in de canvas-codebase: A.5.1 voegt hem toe vóór de drawer-implementatie. Geen blocker, ~30 min toevoegwerk.

### 7.5 Placement op Content Canvas Step 2

```
┌─ Variant A ──────────────────────────────────┐
│ [● Good · 78/100]              [Selected]   │
│                                               │
│ [Preview component for the type]              │
│ ...                                           │
│ [▼ Show quality breakdown]                    │
└──────────────────────────────────────────────┘
```

Drawer-open default-closed. Persistente per-session via Zustand. Geen modal — drawer-in-content zodat user preview én breakdown tegelijk ziet.

---

## 8. Plugin-Registry (Extensibility)

Twee parallelle registries:

```ts
// Lookup by content-type (primary, since content-type is the entry)
export const AD_VALIDATORS_BY_TYPE: Record<string, {
  rules: Rule[];
  judge: AdJudge;
  weights: { l1: number; l2: number };
}> = { ... };

// Lookup by platform (used for sharing rules between types on same platform)
export const SHARED_RULES_BY_PLATFORM: Record<string, Rule[]> = { ... };
```

**Nieuwe ad-type toevoegen — complete checklist** (e.g., `instagram-story-ad`):

| # | Bestand / actie | Doel |
|---|---|---|
| 1 | `src/lib/ad-validation/rules/meta/instagram-story-ad.ts` | Rule-array exporteren |
| 2 | `src/lib/ad-validation/judge/meta-instagram-story-judge.ts` | Dimensions + prompt + parseResponse |
| 3 | `src/lib/ad-validation/registry.ts` | Register in `AD_VALIDATORS_BY_TYPE['instagram-story-ad']` met `{ rules, judge, weights }` |
| 4 | `src/lib/ad-validation/versions.ts` | Bump `RULE_VERSION` (force re-score van bestaande deliverables) |
| 5 | Tests | Unit-tests voor elke regel + snapshot-test L2-judge schema + integration-fixtures |
| 6 | — | **Geen Prisma migration nodig** — `AdQualityScore.contentType` is string, geen enum |
| 7 | — | **Geen API-route wijziging** — `/api/deliverables/[id]/ad-quality` dispatch't generiek op `ctx.contentType` |
| 8 | — | **Geen preview-component vereist** voor scoring — wel voor render in canvas (zie [ad-publishing spec §6](./ad-publishing.md)) |

No core framework-wijziging (runner.ts, aggregation.ts, content-hash.ts, dispatcher.ts blijven onaangeroerd).

**Cross-platform rule-sharing** (e.g., `all-caps` werkt voor alle Meta ad-types): definieer in `rules/shared/all-caps.ts`, import in elke `meta/<type>.ts` file. Geen runtime-magic, expliciete import — code search vindt alle usages.

---

## 9. Implementation Phases binnen Fase A.5

### A.5.1 — Search-ad (eerste implementatie)

**Scope**: 15 L1-regels + 4 L2-dimensions + UI badge + drawer.

**Deliverables**:
- `src/lib/ad-validation/` directory met index, types, registry, aggregation
- `src/lib/ad-validation/rules/shared/` (char-overflow factory, all-caps, banned-superlatives, duplicate-strings)
- `src/lib/ad-validation/rules/google/search-ad.ts` (15 regels registered)
- `src/lib/ad-validation/judge/google-search-judge.ts` (4 dimensions: hook-strength, headline-uniqueness, cta-clarity, keyword-relevance)
- `prisma/schema.prisma` — `AdQualityScore` model + migration
- `src/features/campaigns/components/canvas/ads/AdQualityBadge.tsx`
- `src/features/campaigns/components/canvas/ads/AdQualityDrawer.tsx`
- Canvas Step 2 integratie: hook `useAdQualityScore` met TanStack Query, render badge bovenaan elke variant
- API route `POST /api/deliverables/[id]/ad-quality` die de runner aanroept en `AdQualityScore` row schrijft

**Acceptatiecriteria**:
- [ ] `AdQualityScore` Prisma migration runt zonder conflict
- [ ] Een hand-geschreven "perfecte" search-ad scoort ≥75 (Good)
- [ ] Een hand-geschreven "broken" search-ad (ALL CAPS H1 + char-overflow D1 + duplicate H1/H2) scoort ≤25 (Poor)
- [ ] Badge rendert correcte kleur per ratingLabel
- [ ] Drawer toont alle 15 L1-regels + 4 L2-dimensions met expandable details
- [ ] Score-row geschreven en idempotent bij regenerate (zelfde contentHash → no-op)
- [ ] L2-judge respondtime <2s (Haiku 4.5)
- [ ] Unit-tests voor alle 15 L1-regels met edge-cases (boundary values, lege content, special chars)

### A.5.2 — Display-ad

Multi-size aware rules:
- Char-overflow per-size (leaderboard-headline ≤25, rectangle-headline ≤25, etc.)
- `distinct-headlines-across-sizes` regel (rectangle-headline ≠ skyscraper-headline letterlijk)
- `text-on-image-warning` regex op `*-visual` fields die "text overlay", "logo top", "tagline" noemen
- Coverage per-size (alle 3 sizes hebben hun verplichte velden)

L2-judge dimensions: visual-text-fit, scanning-pattern-fit, headline-distinction-across-sizes.

### A.5.3 — Facebook-ad

L1: body ≤125 (fail), headline ≤40, cta-button match-Meta-presets (warn als custom), no-hashtag-in-body (warn), no-link-in-body (warn), description-redundant-warning.

L2-judge dimensions: hook-stop-power (first-75-chars), body-cta-alignment, image-text-synergy (review the visual-direction prose, not actual image bytes).

### A.5.4 — LinkedIn-ad

L1: headline ≤70, body ≤150 of ≤600 (afhankelijk van extended-body mode), description ≤100, professional-tone warnings (informal contractions, slang).

L2-judge dimensions: professional-tone, value-prop-clarity, b2b-relevance.

---

## 10. Test-strategie

### 10.1 Unit tests (L1)

`src/lib/ad-validation/rules/google/search-ad.test.ts`

Per regel: exhaustive coverage van pass / warn / fail boundaries.

```ts
describe('search-ad.char-overflow.h1', () => {
  it('passes when headline-1 is 30 chars', () => { ... });
  it('passes when headline-1 is empty', () => { ... });  // empty != overflow
  it('fails when headline-1 is 31 chars', () => { ... });
  it('fails when headline-1 is 100 chars', () => { ... });
});

describe('search-ad.all-caps.headlines', () => {
  it('passes Title Case', () => { ... });
  it('passes mixed case with caps acronyms', () => { ... });
  it('fails fully uppercase headline', () => { ... });
});

describe('search-ad.keyword-in-h1', () => {
  it('skips check when primaryKeyword is undefined', () => { ... });
  it('passes when keyword is in headline-1', () => { ... });
  it('warns when keyword is absent', () => { ... });
  it('matches case-insensitive', () => { ... });
});
```

CI runs alle unit tests in `npm run test -- ad-validation` — geen netwerk, deterministisch.

### 10.2 Snapshot tests (L2)

`src/lib/ad-validation/judge/google-search-judge.test.ts`

Mock anthropic-client response → verify parseResponse() produceert juist gevormde L2JudgeResult. Snapshot-test op de gestructureerde output zodat schema-changes opvallen.

### 10.3 Integration tests

Fixture-locatie: `src/lib/ad-validation/__fixtures__/<platform>/<contentType>/` — co-located met de regel-files. Fixture-schema:

```ts
// src/lib/ad-validation/__fixtures__/types.ts
export interface AdQualityFixture {
  name: string;                          // e.g., "known-good-search-ad-1"
  description: string;                   // wat test deze fixture
  ctx: ValidatorContext;                 // input voor de runner
  expected: {
    minScore?: number;                   // bv. ≥80 voor known-good
    maxScore?: number;                   // bv. ≤25 voor known-broken
    label?: 'poor' | 'average' | 'good' | 'excellent';
    mustContainRuleId?: string[];        // bv. ['search-ad.all-caps.headlines'] voor known-broken
    mustNotContainRuleId?: string[];     // bv. alle .fail's voor known-good
  };
}
```

Fixtures per ad-type tellen minimaal:
- 1 known-good (verwachte label: excellent)
- 1 known-broken-all-mechanical (verwachte label: poor, alle mechanical fails triggerd)
- 1 known-broken-semantic (verwachte label: poor/average, mechanical pass maar L2 verwacht laag)
- 1 known-borderline (verwachte label: average, mix van fails + warns)

Integration test runt fixtures door `runAdQualityValidation()` met gemockte LLM-client. Real-LLM nightly test (`npm run test:e2e -- --grep ad-quality-llm`) gebruikt 1-2 fixtures tegen echte Haiku voor regression-detection.

L2-judge in deze tests gebruikt een gemockte client (LLM-call zou anders flakey + duur zijn). Een aparte `e2e-with-real-llm` test runt nightly tegen Haiku voor regression-detection.

### 10.4 Manual exploratory

Pre-merge: developer opent Linfi workspace, genereert search-ad, ziet badge + opent drawer, verifieert dat L1 en L2 results zinvol zijn op real-world content.

---

## 11. Acceptatiecriteria per Phase

### A.5.1 — Search-ad

- [ ] `AdQualityScore` Prisma migration runt zonder conflict op bestaande DB
- [ ] 15 L1-regels geïmplementeerd + unit-tests passing met >95% branch coverage
- [ ] L2-judge prompt rendert juist + parseResponse roundtrip-safe (snapshot-test green)
- [ ] Badge + drawer rendert op Content Canvas Step 2 voor beide varianten
- [ ] Hand-geschreven "perfect" + "broken" fixtures scoren binnen verwachte ranges (≥75 vs ≤25)
- [ ] tsc green, lint clean, no `any` types
- [ ] Idempotency: regenerate met zelfde content → geen nieuwe DB-row
- [ ] L2-call respondtime <2s P95 in development
- [ ] Smoke in Linfi: search-ad scoort, breakdown is lezbaar, suggestions zijn actionable

### A.5.2 — Display-ad

- [ ] Multi-size aware rules + L2-judge implemented per A.5.2 scope hierboven
- [ ] Cross-size distinctness rule werkt voor "headlines verschillen per size" check
- [ ] Smoke in Linfi: display-ad scoort + drawer toont per-size breakdown

### A.5.3 — Facebook-ad

- [ ] Meta-specific L1 + L2 implemented
- [ ] Smoke: facebook-ad scoort + body ≤125 hard-fail werkt zoals verwacht

### A.5.4 — LinkedIn-ad

- [ ] LinkedIn-specific L1 + L2 implemented
- [ ] Smoke: linkedin-ad scoort

---

## 12. Open vragen / TBD

- [ ] **Per-keyword vs per-ad scoring**: Google Quality Score is per-keyword (één ad kan 5 scores hebben voor 5 keywords). Onze huidige design is per-ad (één score). Vervolg-spec kan per-keyword toevoegen na live Google Ads-data beschikbaar is.
- [ ] **History-storage retention**: bewaren we élke `AdQualityScore` row indefinitely, of cap op N rows per deliverable? Voorstel: bewaar alle, dataset is klein. Herzien na 6 maanden gebruik.
- [ ] **Opt-out per workspace**: kan een workspace ad-quality-validation uitzetten? Initiële beslissing: nee (default-aan core feature). Maar als enterprise-klant een eigen quality-systeem heeft, willen we misschien suppress-flag in workspace-settings.
- [ ] **Score-comparison hint** ("Variant A scoort beter, kies die"): mag UI dat surface? Of leg het bij user? Voorstel: subtle hint ("Variant A heeft hogere quality score"), geen auto-select.
- [ ] **L2-judge model swap**: Haiku 4.5 nu, maar als ad-quality echt belangrijk wordt voor klanten, schalen we naar Sonnet voor betere nuance? Wachten op user-feedback van A.5.1.
- [ ] **Live rule-updates zonder deploy**: niet nodig in initial release (rules-as-code, deploy reflects changes). Voor enterprise scenario's later eventueel hot-reload via workspace config-overrides.
- [ ] **A/B-test framework voor scoring**: meten we of de scoring user-gedrag verandert (gebruikers iterereren meer / minder na lage scores)? Out-of-scope nu, mooie analytics-vraag voor latere telemetry-spec.
- [ ] **Multi-language scoring**: huidige L2-judge prompts zijn Engels. Voor NL/DE workspaces kan judge in lokale taal de nuance beter pakken. Vervolg-issue.
- [ ] **Disable single rule per workspace**: als een specifieke regel false-positives geeft (banned-superlative raakt legitieme medische claim), wil je hem kunnen uitzetten. Out-of-scope; eerst data verzamelen welke rules problemen geven.

---

## 13. Cross-references

- ADR: [`2026-05-22-ad-quality-validation`](../adr/2026-05-22-ad-quality-validation.md) — *waarom* deze keuzes
- ADR: [`2026-05-22-ad-publishing-integration`](../adr/2026-05-22-ad-publishing-integration.md) — parent-traject; Fase A.5 wordt hier ingeplugd
- ADR: [`2026-05-05-fval-three-pillar`](../adr/2026-05-05-fval-three-pillar.md) — F-VAL als architectuur-template voor L2-judge
- Parent spec: [`ad-publishing.md`](./ad-publishing.md) — Fase A.5 wordt hier inline gerefereerd
- Memory: `branddock-round1-social-2026-05-20` — context Ronde 1 testronde
- Externe: [Google Ad Strength reference](https://support.google.com/google-ads/answer/9929709), [Google Quality Score components](https://support.google.com/google-ads/answer/6167118), [Meta Quality Ranking](https://www.facebook.com/business/news/relevance-score-replaced-with-quality-rate), [LinkedIn Ad Relevance Score](https://www.linkedin.com/help/lms/answer/a420717)
