# Gotchas

Lessons learned from past mistakes. Read this at the start of every session.

## 2026-04-07: Next.js wizard vs [id] route conflict
**What went wrong**: `/api/campaigns/wizard/strategy/validate-briefing` was silently intercepted by `/api/campaigns/[id]/strategy/validate-briefing` (Next.js matched "wizard" as the `[id]` param). The wrong route was executed.
**Rule**: Never create overlapping static (`/wizard/`) and dynamic (`/[id]/`) route segments at the same level. If both exist, the dynamic route can swallow the static one.

## 2026-04-07: React 19 dev-mode double-invoke aborts SSE fetches
**What went wrong**: `useEffect` cleanup called `abortRef.current?.abort()` which killed the SSE fetch during React 19's `doubleInvokeEffectsInDEV` (mount→cleanup→mount cycle). The fetch was aborted before the server could respond.
**Rule**: For long-lived requests (SSE, WebSocket), don't abort in useEffect cleanup directly. Use a deferred abort (`setTimeout` + `isMountedRef` check) to survive React 19 dev-mode double-invoke.

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

## 2026-03-24: React strict mode double-mount aborts SSE auto-start connections

**What went wrong:** `ConceptStep.tsx` used a `useEffect` with `autoStartedRef` to auto-start an SSE connection (creative hooks generation) on mount. A separate cleanup `useEffect` called `abortRef.current?.abort()` on unmount. In development, React strict mode simulates unmount→remount: (1) mount → auto-start fires → SSE starts, (2) strict mode unmount → cleanup aborts SSE, (3) strict mode remount → `autoStartedRef.current` is still `true` (refs persist across strict mode) → no restart. The SSE `createPhaseSSE` silently swallows aborts (`if (controller.signal.aborted) return`), so no error appeared. The UI stayed stuck at "0 of 2 steps completed" indefinitely. The server log showed 0 incoming requests — the fetch was aborted before reaching the server.

**Rule:** When using auto-start patterns (`autoStartedRef` + `useEffect`) that trigger SSE/fetch connections, the cleanup function MUST reset the auto-start ref: `autoStartedRef.current = false`. This allows the second mount in React strict mode to detect `false` and restart the connection. General pattern:
```tsx
useEffect(() => {
  return () => {
    abortRef.current?.abort();
    autoStartedRef.current = false; // Allow strict mode remount to restart
  };
}, []);
```

## 2026-03-24: resetWizard() on mount destroys in-progress wizard state on remount

**What went wrong:** `CampaignWizardPage.tsx` called `resetWizard()` in the mount body of a `useEffect(() => { resetWizard(); return () => resetWizard(); }, [])`. This resets `currentStep` to 1 on every mount. During creative concept generation (step 4), the component remounted (React strict mode, ErrorBoundary recovery, or Suspense re-trigger), firing `resetWizard()` again and sending the user back to step 1. The user saw the stepper "jump back" to setup.

**Rule:** Never call state-destroying resets (like `resetWizard()`) on mount. Only reset in the cleanup function (unmount). Zustand stores already initialize with `INITIAL_STATE`, so the mount reset is a no-op on first visit and destructive on remounts. Pattern: `useEffect(() => { return () => { resetWizard(); }; }, [])` — cleanup only.

## 2026-03-24: Context registry titleField must match Prisma model field name

**What went wrong:** `registry.ts` had `titleField: 'title'` for the `business_strategy` entry, but the Prisma `BusinessStrategy` model uses field `name`, not `title`. The generic fetcher in `fetcher.ts` dynamically builds `orderBy: { [titleField]: 'asc' }`, causing a Prisma error `Unknown argument 'title'`. The error was caught by try-catch so the endpoint returned 200, but business strategies were silently excluded from results.

**Rule:** When adding entries to `CONTEXT_REGISTRY`, verify `titleField`, `descriptionField`, and `statusField` against the actual Prisma model field names. These are used dynamically at runtime — TypeScript cannot catch mismatches since `prismaModel` and field names are strings.

## 2026-03-24: AI returns numeric scores as strings → typeof check fails silently

**What went wrong:** `normalizePersonaValidation()` in `strategy-chain.ts` used `typeof p.overallScore === 'number'` to validate scores. AI models sometimes return scores as strings (e.g. `"7"` instead of `7`). The `typeof` check fails for string numbers → all scores defaulted to 5, making every persona appear equally lukewarm.

**Rule:** When normalizing AI-returned numeric fields, always coerce with `Number()` before checking. Pattern: `const n = Number(value); return (!isNaN(n) && n >= 1) ? clamp(n) : defaultValue;`. Never use `typeof x === 'number'` alone — AI outputs are JSON-parsed but the model may wrap numbers in quotes.

## 2026-03-24: Space bar intercepted in textarea nested inside radio card

**What went wrong:** `HookCard` had an `onKeyDown` handler on the outer div that called `e.preventDefault()` on space key for radio button accessibility. A `<textarea>` nested inside this div had its space key events bubble up to the card handler, preventing users from typing spaces.

**Rule:** When nesting interactive elements (textarea, input) inside keyboard-accessible containers (role="radio", role="button"), add `onKeyDown={(e) => e.stopPropagation()}` on the nested element to prevent event bubbling.
