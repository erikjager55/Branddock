# Gotchas

Lessons learned from past mistakes. Read this at the start of every session.

## 2026-03-20: AI prompt ↔ TypeScript interface mismatch (Website Scanner)

**What went wrong:** The AI prompts in `website-scanner.ts` defined response keys (`purposeWheel`, `brandHouseValues`) and inner structure (`{ confidence, frameworkData }`) that didn't match the TypeScript interfaces (`purposeStatement`, `coreValues`, `{ data, confidence }`). Since `createClaudeStructuredCompletion` doesn't validate against the TS type at runtime, the data came back with the AI's keys but the mapper tried to read the type's keys → everything was `undefined`.

**Rule:** When writing AI prompts that return structured JSON, always verify the prompt's response schema matches the TypeScript interface field-for-field. Check both key names AND nested structure. The TypeScript type is just a cast — it doesn't enforce anything at runtime.

## 2026-03-20: Spreading raw AI fields into Prisma create() (Website Scanner)

**What went wrong:** AI-generated persona/product/competitor fields were spread directly into `Prisma.create()` via `...persona.fields`. The AI returned fields not on the Prisma model (`companySize`, `targetAudience`, `personality` instead of `personalityType`), causing "Unknown arg" errors.

**Rule:** Never spread AI-generated data directly into Prisma operations. Always sanitize through a field whitelist first.

## 2026-03-20: Dashboard brand asset count based on status instead of completeness

**What went wrong:** The dashboard stats/readiness endpoints used `status = "READY"` to count completed brand assets. Only 1 asset had this status, while 9 were actively filled. The status field is not automatically updated when content changes — it's a manual workflow state.

**Rule:** When the business logic needs "how filled is this asset?", use the field-level completeness calculation (`getAssetCompletenessPercentage` from `src/lib/brand-asset-completeness.ts`), not the workflow status field. Keep completeness logic in a shared pure utility so both server-side (API routes) and client-side (React components) can use it.

## 2026-03-24: validateOrWarn() passes malformed AI data through → UI crashes

**What went wrong:** `validateOrWarn()` in `strategy-chain.ts` validates AI responses against Zod schemas but NEVER throws — on failure it logs a warning and returns `data as T`. When Claude returned `audienceInsights` with missing `personaName`, null `topCasiBarriers`, and invalid `elmRoute`, the raw data passed through to `StrategyFoundationReviewView.tsx`. The component called `.length` and `.map()` on null/undefined arrays → TypeError crash. The user saw the strategy generation "get stuck" because the review screen crashed silently.

**Rule:** Any component that renders data from `validateOrWarn()` (or any AI-validated pipeline) MUST use defensive null guards on ALL array accesses (`(array ?? []).length`, `(array ?? []).map()`) and optional string accesses (`field ?? "fallback"`). Never trust that AI-returned data matches the Zod schema — `validateOrWarn` is warn-only, not enforce. Same pattern was already needed for `BriefingReviewView.tsx`.

## 2026-03-24: AI returns objects where strings are expected → "Objects are not valid as a React child"

**What went wrong:** The Zod schema defines `behavioralBarriers` as `string[]`, but the AI returned `[{barrier: "...", severity: "...", comBComponent: "...", description: "..."}]`. Since `validateOrWarn()` passes raw data through, the array of objects reached the JSX where `{b}` was rendered directly inside `<li>` and `<Badge>` — React cannot render objects as children.

**Rule:** When rendering AI-returned array items, NEVER render `{item}` directly. Always use a `toDisplayString(item)` helper that handles both strings and objects gracefully. The helper should: (1) return strings as-is, (2) for objects, pick the most descriptive field (barrier, name, title, description, etc.), (3) fallback to joining all string values or JSON.stringify. This applies to ALL `string[]` arrays from AI — the AI can and will return objects instead of strings.
