# Gotchas

Lessons learned from past mistakes. Read this at the start of every session.

## 2026-05-17: Silent auto-iterate clobbert variants + shrinkt long-form onder F-VAL gate
**What went wrong**: Canvas-orchestrator draait na elke generation een silent auto-iterate pass (`canvas-orchestrator.ts:863-920`) zodra `compositeScore < 70`. Die pakt de langste text-component en vervangt zijn `generatedContent` met `silentResult.finalText`. Twee compounding bugs: (1) de query gebruikte `where: { deliverableId, groupIndex: 0 }` zonder `variantIndex` filter — `groupIndex` defaultt naar 0 en wordt nergens expliciet gezet bij persistence (regel 3030), dus matcht ALLE componenten van het deliverable. Silent-iter kon dus variant B/C/D body clobberen. (2) voor long-form types (blog 500 minWords, landing 100) levert F-VAL meestal een tightening rewrite van ~40 woorden. De totale variant-0 blob viel daardoor onder de hardcoded 50-woorden gate van `auto-iterate/trigger/route.ts:88` → user kreeg `"Niet genoeg content om te verbeteren — genereer eerst content"` terwijl content visueel zichtbaar was. Dezelfde scope-bug bestond in `/auto-iterate/apply` en `/strict-rewrite/apply` longest-pick.
**Rule**: (a) Bij Prisma queries die "variant-0" bedoelen, ALTIJD `variantIndex: 0` expliciet meegeven — leun nooit op een ander veld als proxy. Defense-in-depth: combineer met `groupIndex: 0` + `componentType: { not: 'image' }` + `generatedContent: { not: null }` om silent-clobber van image-rijen of leeg-content edge cases te voorkomen. (b) Wanneer een auto-rewrite een geconfigureerd content-type minWords kan onderschrijden, voeg een don't-shrink guard toe via `getDeliverableTypeById(typeId).constraints.minWords ?? 50`. Reject DB-update onder die floor + log de skip met diagnostic warn. (c) Gate-floors die elders al bestaan (hier: `fidelity-runner.ts:454` heeft eigen 50-woorden floor) niet duplicate hardcoden — herleid uit registry. (d) Op elke silent-return een `console.warn` met gestructureerd payload-object zodat smoke-tests divergence kunnen zien. Zelfde patroon als gotcha 2026-05-08 (view-vs-gate divergentie zonder logging maakt de bug onzichtbaar tot een user het meldt).
**Prior art**: 2026-05-08 ConceptReviewView button silent-disabled — zelfde "twee plekken lezen dezelfde state met verschillende source-of-truth, geen warn". De cure is in beide gevallen consistent diagnostic logging op silent-return paden.

## 2026-05-17: Internal-rubric prompt-jargon lekt naar user-facing output via NL-vertaling
**What went wrong**: `campaign-strategy.ts` prompts gebruikten Effie Award terminologie als intern kwaliteits-rubric ("Effie Award-winning campaigns", "STEP 3: EFFIE TEST", `effieRationale: One paragraph explaining why this concept has Effie Award potential`). De prompt is gedeeld tussen campaign-mode én single-content-mode (alleen via `selectedContentType` parameter onderscheid), dus de Strategy-step in de 6-staps content-flow erft het hele Effie-vocabulaire. Bij NL-output op Napking workspace echo't het model dit jargon letterlijk als "effie-waardig" in de rationale-tekst. Geen sanitization, geen output-guard — model nam de rubric over als kwaliteits-claim. Twee bijkomende leak-vectoren: `formatAngleForPrompt()` en `formatCreativeAnglesForPrompt()` zetten `Effie/Cannes potential: ${value}` letterlijk in de angle-context die naar het model gaat. Ontdekt 2026-05-13 tijdens handmatige test linkedin-post (testplan-content-items.md sectie 5 → P2 [shared-pipeline]); STOP-GATE: 8 representanten waren niet zinvol testbaar tot fix er was want elk type zou dezelfde leak vertonen.
**Rule**: (a) Bij interne kwaliteits-rubrics in prompts: wrap criteria in `<internal_rubric purpose="..." surface_in_output="false">`-tags en voeg een expliciete output-language-guard regel toe in het system-prompt ("Never use the words [X], [Y] in any output field"). Vocabulary die niet user-facing mag zijn, mag ook niet in de prompt staan — model echo't terminologie via paraphrase, zeker in andere talen. (b) Voor angle/context-builder strings die naar prompts gaan: vermijd award-namen in labels (`Effie potential:` → `Award potential:`). De waarden zijn neutraal, de labels niet. (c) Defense-in-depth: post-process output-sanitizer als vangnet (`src/lib/ai/sanitize-strategy-output.ts` met `scrubStrategyLayer()`), word-boundary regex om onschuldige woorden ("effectief", "Jeffie") niet te raken. Toegepast aan de bron — bij StrategyLayer-productie in `strategy-chain.ts` — niet alleen aan de UI-render kant, anders lekt het via downstream `JSON.stringify(synthesizedStrategy)` doorgifte naar nieuwe LLM-calls. (d) Pre-launch shared-pipeline P2-bugs zijn STOP-GATE: niet doorgaan met representanten-testen tot de leak weg is, anders zijn alle vervolg-bugs duplicaten.
**Prior art**: 2026-03-20 AI prompt ↔ TypeScript interface mismatch (Website Scanner) — zelfde patroon "prompt-vocabulaire bepaalt output-vocabulaire, AI-call doet geen runtime-enforce". De cure is in beide gevallen: explicit guardrails in prompt + defense-in-depth output-validatie.

## 2026-05-08: View-prop vs store-state divergentie maakt button silent-disabled
**What went wrong**: In de campaign-wizard `ConceptReviewView` werd de "Approve Concept"-button gegated op `useCampaignWizardStore.allConceptRated()`, dat alleen `state.synthesizedStrategy` las. De view zelf rendeerde de 6 rating-cards op basis van prop `strategy = finalStrategy ?? synthesizedStrategy` (set in `ConceptStep.tsx`). In de campaign-mode multi-variant flow vult `setFinalStrategyResult` `finalStrategy` met meer velden (zoals `effieRationale`) terwijl `synthesizedStrategy` null kan blijven. Resultaat: view toont 6 cards, user rate alle 6, progress-tekst zegt "6 of 6", maar gate ziet `synthesizedStrategy = null` → returns `false` → button blijft disabled. `handleApprove` had dezelfde mismatch en silent-returnde bij click. **Twee plekken, beide stil — geen error, geen feedback.**
**Rule**: Wanneer een view component gegated wordt op een store-selector, moeten **view en gate dezelfde source-of-truth gebruiken**. Bij fallback-chains (`a ?? b`) moet de gate-functie identieke fallback toepassen. Dev-only `console.warn` toevoegen wanneer twee gerelateerde state-velden divergeren waar de UI ze samenvoegt — dat maakt de stille divergentie zichtbaar tijdens manual smoke. Smaak-regel voor bugfix-patches: zoek tweede plek waar dezelfde state gelezen wordt (handlers, selectors, persisters) — silent-returns op één plek hebben vaak een tweelingbroer ergens anders.
**Prior art**: 2026-04-15 createPhaseSSE silent abort + 2026-03-24 React strict mode auto-start abort — beide patroon "silent failure zonder error", de cure is consistent diagnostic logging op elke vorm van early-return.

## 2026-04-21: Losing `TOKEN_ENCRYPTION_KEY` bricks every encrypted OAuth row
**What went wrong**: M10 introduced AES-256-GCM field encryption for OAuth tokens on Account, ConnectedAccount, and WorkspaceIntegration. The master key lives in the `TOKEN_ENCRYPTION_KEY` env var. A `v1:`-prefixed ciphertext is undecryptable without the exact same key — if the key is rotated without first running the rewrap script, every stored OAuth session becomes unrecoverable and affected users must re-authenticate.
**Rule**: (1) Treat `TOKEN_ENCRYPTION_KEY` like `BETTER_AUTH_SECRET`: back it up in your secrets manager, never regenerate it carelessly. (2) To rotate, add `v2` to `token-crypto.ts` first, deploy so both versions decrypt, then run a rewrap migration against the new key, then drop v1 support. (3) Never encrypt with a key that isn't stored durably — if in doubt, use `isEncryptionConfigured()` and fail-closed in prod. (4) The rewrap script (`prisma/scripts/encrypt-existing-tokens.ts`) is idempotent — skips anything already v1-prefixed — so it's safe to re-run.

## 2026-04-21: Prisma Client Extensions miss nested-write relations
**What went wrong (would have, audit caught it)**: The M10 token-encryption extension hooks on `prisma.account`, `prisma.connectedAccount`, and `prisma.workspaceIntegration`. Direct delegate calls (`prisma.account.create(...)`) are intercepted. But nested writes through relations — `prisma.user.create({ data: { accounts: { create: [...] } } })` — run as part of the `user` model's pipeline and do NOT trigger the account model hook. Tokens would land plaintext.
**Rule**: When you extend a model's `query` hooks for encryption or any similar transform, grep for nested writes (`accounts: {`, `connectedAccount: {`, etc.) before shipping. If any exist, either refactor to explicit `prisma.account.create()` calls or extend the parent model too. Current Branddock code uses only direct delegate calls — verified for M10 in auth.ts + settings routes + seed.

## 2026-04-19: Tailwind 4 compiled index.css is incomplete — many teal shades missing
**What went wrong**: Buttons with `bg-teal-600` / `hover:bg-teal-700` had no background (white on white) because `src/index.css` is a committed, pre-compiled Tailwind 4 output — not a source file with `@tailwind` directives. Only `bg-teal-50/100/500` and `text-teal-600/700` were generated; `bg-teal-200/300/400/600/700/800/900` and most `hover:bg-teal-*` variants were missing. 21+ call sites across the codebase rendered transparent.
**Rule**: Treat `src/index.css` as static content. Before using a Tailwind utility class, verify it appears in `src/index.css` via `grep`. If it's missing, either (a) append the rule to the bottom of `src/index.css` using the `--color-teal-*` CSS variables already defined, (b) use inline `style={{ backgroundColor: '#hex' }}`, or (c) swap to `bg-primary` (which uses the `--primary` CSS var and is pre-compiled). The default fix is (a) — one-line addition covers every usage.
**Prior art**: CLAUDE.md "Tailwind purge workaround" entry mentions this for `min-h-0` and custom colors. Same pattern.

## 2026-04-18: Anthropic tool_use without tool_result breaks multi-tool responses
**What went wrong**: The Claw chat route processed multiple tool_use blocks in a single Claude response by pushing one assistant-message + one tool_result per block sequentially. Result: the second pushed assistant-message still contained the first tool_use, but the following user-message only had the second tool_result → Anthropic 400 "tool_use without tool_result".
**Rule**: When the model emits multiple tool_use blocks in one response, append ONE combined user-message with tool_result blocks for ALL of them. Also emit a tool_result for execute() failures and for unknown tools — never leave a tool_use orphaned.

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

## 2026-04-15: createPhaseSSE silent abort leaves wizard in stuck state
**What went wrong**: `createPhaseSSE` in `campaigns.api.ts` has `if (controller.signal.aborted) return;` in its catch block — when the user navigates away from the wizard, the SSE is aborted but `onError` is never called. This leaves `isGenerating=true` and `strategyPhase` in an in-flight value (e.g. `building_foundation`, `elaborating_direct`). When the user returns, the wizard shows a spinner/progress view but nothing is actually running — permanently stuck. Additionally, `skipConceptStep` was missing from the server draft snapshot (`buildServerSnapshot` in `useDraftAutoSave.ts`), so resuming a draft from the DB would reset "skip concept" to false.
**Rule**: Any SSE-based pipeline must handle the case where the component unmounts mid-flight. Either (a) call `onError` even on abort, or (b) add mount-time recovery that detects stale in-flight phases and rolls back. We chose (b) via `recoverStalePhase()` which mirrors `onRehydrateStorage` for in-memory state. Also: every user-facing wizard flag (`skipConceptStep`, `contentTypeInputs`) must be included in both `partialize` (localStorage) AND `buildServerSnapshot` (server draft).

## 2026-04-17: Brandstyle Analyzer color/font extraction inaccuracies
**What went wrong**: Colors didn't match the actual website and typography was wrong. Six root causes: (1) `isNearBlackOrWhite()` threshold avg < 35 / > 225 filtered dark brand colors (navy) and light brand colors (cream). (2) `extractHexFromValue()` only handled hex/rgb/hsl — modern CSS functions (`oklch()`, `color-mix()`, `lch()`) were silently dropped. (3) `buildColorGroups()` skipped CSS variables with `context !== 'root'` — sites defining colors in `.dark`, `[data-theme]`, or component scopes were missed. (4) `TypographySection` applied `fontFamily` CSS but never loaded the actual font file — fonts only rendered if already installed on the user's system. (5) `extractFontSizes()` regex only matched simple values (`36px`, `2rem`) — `clamp()`, `calc()`, and `var()` were skipped, causing empty type scales. (6) Tailwind compiled CSS includes hundreds of utility-class color definitions that aren't actually used — these polluted the frequency analysis.
**Rule**: When extracting CSS data from websites, always handle modern CSS syntax (oklch, color-mix, clamp, calc, var). Filter thresholds for color exclusion should be tight (< 15 / > 245) to preserve dark/light brand colors. Font previews must load fonts dynamically (Google Fonts injection). For framework detection: check for characteristic patterns (--tw-, .bg-\\[) and apply smarter frequency thresholds.

## 2026-04-17: Design Language + Visual Language overlap and lack of visual presentation
**What went wrong**: Brandstyle Styleguide had two overlapping tabs (Design Language and Visual Language) that described the same visual system concepts from different angles. Design Language was mostly AI-hallucinated (no CSS data as input), while Visual Language had real CSS data but displayed it as plain text key-value pairs without visual previews. Spacing/layout, grid system, and gradient presence were duplicated across tabs. Two independent "Save for AI" toggles exported overlapping data to downstream prompts.
**Rule**: When two features describe the same domain (visual identity), merge them into one coherent view. Ground AI output in real data (CSS heuristics) instead of free-form hallucination. Use visual previews (SVG, CSS box-shadow, spacing blocks) for design-related data — key-value text is insufficient for visual concepts. One "Save for AI" toggle per concept, not per data source.

## 2026-04-18: Brandstyle scraper missed real brand tokens on WordPress + page-builder sites
**What went wrong**: Brand Styleguide Analyzer for `linfi.nl` returned a Material-Design-like palette (`#FFD64F`, `#FC5778`, `#11B76B`, …) and Roboto as the primary font — none of which matched the actual brand (LINFI uses `#B59032` gold, `#FBF4BC` cream, Poppins). Five compounding causes: (1) `cssLinks.slice(0, 5)` capped linked-stylesheet fetching at 5; LINFI has 23, so the AutomaticCSS bundle (where `--primary-hex:#B59032` lives) was never fetched. (2) The `:root` regex `/:root\s*\{/` doesn't match compound selectors like `:root,.color-scheme--main{...}` — common in minified ACSS / Squarespace / Shopify CSS. (3) Page-builder default theme palettes (`--bricks-color-primary:#FFD64F`, `--bricks-text-dark:#212121`, `--bricks-bg-info:…`) were treated as brand tokens because their names contain the keyword "color"/"text"/"bg". They outranked the real brand tokens by sheer count. (4) `extractFontsFromCss` returned `var(--ywf--family-poppins)!important` literals as "font names" — no `var()` resolution and no `!important` strip. (5) `<link rel="preload" as="font">` was completely ignored; the strongest signal for the body font (Poppins, explicitly preloaded by linfi.nl) was invisible to the scraper.

**Rules**:
- For multi-stylesheet sites (WordPress, Shopify, Webflow) fetch ≥15 sheets in parallel, ranked by id/href hints (palette/theme/tokens/brand score highest, admin/cookie/icons score lowest).
- Filter page-builder default tokens explicitly: `--bricks-color-*`, `--bricks-text-*`, `--bricks-bg-*`, `--bricks-(button|heading|link|body|background)-*`, in the same `isCmsPresetVariable()` set as `--wp--preset--*` and `--e-global-color-*`. They are theme presets, not brand tokens.
- Recognise framework-canonical brand tokens (ACSS: `--primary-hex` / `--secondary-hex` / `--base-hex` / `--neutral-hex` / `--accent-hex`) and pin them at the front of the authoritative palette regardless of CSS-variable context.
- Resolve `var()` and strip `!important` in `font-family` values; drop entries that can't be resolved instead of persisting `var(--xxx)` strings.
- Treat `<link rel="preload" as="font">` filenames as the strongest body-font signal. Parse the first segment from patterns like `google-fonts-poppins-v23-…` or `Poppins-Regular.woff2` to recover the font name.
- Parse `body { font-family }` and `h1, h2, h3 { font-family }` rules explicitly to derive bodyFont and headingFont — first-found order in CSS is meaningless.

## 2026-04-19: Stale-state cleanup useEffect killed freshly-started mutation
**What went wrong**: `BrandstyleAnalyzerPage.tsx` had a mount-time `useEffect` that called `stopAnalysis()` if `isAnalyzing` was true while the cached styleguide showed `COMPLETE`/`ERROR`. The intent was to clean up stale store-state from a previous session. But when the user clicked Analyze, the mutation's `onSuccess` ran `startAnalysis(newJobId)` (synchronous store update) AND `invalidateQueries(...)` (async refetch). The component re-rendered before the refetch returned, so `data?.styleguide?.analysisStatus` still pointed at the *old* COMPLETE record. The cleanup fired and aborted the just-started analysis — the user had to click twice.
**Rule**: When a useEffect cleans up "stale" state by comparing in-memory store to a TanStack-cached server record, never trust just the server record's status. Compare the **identity** (jobId, version, updatedAt, …) too. If the store identity is newer than the cached server identity, the cache is the stale one — wait for refetch instead of clobbering the store. The pattern: `if (dbId !== storeId) return;` before any cleanup.

## 2026-04-18: URL input rejected bare hostnames
**What went wrong**: `WebsiteUrlInput.handleAnalyze` called `new URL(url)` directly. `new URL("linfi.nl")` throws — users typing a bare hostname (the natural way) saw "Invalid URL" on the first click and had to manually add `https://`. The backend Zod schema (`z.string().url()`) had the same constraint, so even bypassing the frontend would fail.
**Rule**: Normalise user-typed URLs at the input boundary: trim whitespace, prepend `https://` when no protocol is present, then validate. Show the normalised URL back in the field so the user sees what was submitted. Apply the same normalisation everywhere a user types a URL (analyzers, knowledge import, competitor refresh).

## 2026-04-12: Incomplete phase removal broke error paths
**What went wrong**: Removed the `review_insights` render block and its stepProceedOverride, but didn't update the 2 error handlers in `handleGenerateConcepts` that fell back to `review_insights` on failure. Any concept generation error → phase set to a phase with no render → fallback "Something went wrong". Also: `setIsGenerating(false)` before chaining to the next handler created a one-frame render gap where no condition matched.
**Rule**: When removing a strategy phase from the render tree, ALWAYS grep for ALL references to that phase name across the entire file. Update every error handler, guard, and state transition that references it. Test the error path, not just the happy path.

## 2026-05-22: CI `npm ci` faalt op transitive peer-dep conflicts terwijl lokaal `npm install` slaagt
**What went wrong**: Na commit `bad57cb5` (apify-client install + Prisma regenerate) faalde de `CI / check` workflow met "Missing: gcp-metadata@7.0.1 from lock file" + "Missing: @swc/helpers@0.5.21 from lock file". Beide packages zijn TRANSITIVE deps (gcp-metadata: mongodb→mongoose→natural→promptfoo wil ^7.0.1, google-auth-library installed 8.1.2; @swc/helpers: promptfoo→@swc/core wil ≥0.5.17, Next.js installed 0.5.15). Beide werken runtime prima via npm's dedup, maar:
- `npm install` (loose) tolereert peer-mismatches en update lockfile asymmetrisch
- `npm ci` (strict) eist dat lockfile-entries voor alle gerefereerde versions aanwezig zijn, faalt op deze mismatch

Lokaal werkt het dus prima, CI crasht. Asymmetrie geeft "werkt op mijn machine" frustratie.

**Rule**: Voeg `.npmrc` met `legacy-peer-deps=true` toe aan elk Node-project. Geldt voor zowel lokaal `npm install` als CI `npm ci`, dus identical resolution-strategy in alle install-paden. Bij toekomstige peer-conflicts is de keuze: (a) update de conflict-veroorzaker (cleaner), (b) accept als legacy via deze setting (pragmatisch). Geen `.npmrc` = asymmetrisch gedrag bij elk peer-conflict.

Voor diagnose: `npm ls <package>` toont de full dep-tree origin van het conflict. `npm ci --dry-run` simuleert CI's strict-install lokaal.

## 2026-05-22: React hooks-rules violation valt door tsc maar wordt door lint gevangen
**What went wrong**: In `DisplayAdPreview.tsx` riep ik `useEditableEntry(\`short-headline-${n}\`)` aan inside een `.map((n) => ({...}))` callback voor 5 short-headline slots + 5 description slots. React's hooks-rules vereist dat hooks **direct in de component body** worden aangeroepen (constante volgorde tussen renders) — niet in loops/callbacks. `npx tsc --noEmit` rapporteerde 0 errors (het is een ESLint regel, geen type-check). CI's `npm run lint` step crashte met 2 errors van `react-hooks/rules-of-hooks`.

PostToolUse hook (`post-edit-typecheck.sh`) DOES already run `npx eslint --fix` na elke Edit/Write, met output naar stderr — maar `blocking: false` zodat het de flow niet stopt. De error-output landde dus alleen in stderr en werd gemist tijdens iterative editing.

**Rule**:
- Roep hooks NOOIT aan in `.map()`, `.filter()`, `for`/`while`, of conditionals. Voor N gelijksoortige hook-calls: schrijf N expliciete aanroepingen + assemble naar array daarna.
- Vóór elke push naar main: run lokaal `npx eslint <gewijzigde-files>` als laatste check naast `npx tsc --noEmit`. TS-check vangt type-fouten; ESLint vangt React-rules + style-violations die tsc ontgaan.
- Voor toekomst: overweeg `blocking: true` op de post-edit hook voor "error"-level lint-output (niet warnings). Of: pre-push git hook met `npm run lint --silent` die push blokkeert bij errors.

## 2026-05-22: Client component import-chain trekt server-only modules (`tls`/`pg`/`prisma`) in browser bundle
**What went wrong**: Step2ContentVariants (client component, `'use client'`) importeerde `VariantAdQualityIndicator` die `isFallback` haalde uit `@/lib/ad-validation` (barrel `index.ts`). Die barrel re-exports `runner.ts` (server-only — imports `prisma` → `pg` → `tls`). Next.js build crashte met `Module not found: Can't resolve 'tls'` ondanks `npx tsc --noEmit` exit 0 en `npm run lint` 0 errors. Type-check + lint vangen dit NIET — alleen de Next-build bundler-resolve doet dat.

Import-chain trace: client component → barrel `@/lib/ad-validation` → `runner.ts` → `@/lib/prisma` → `pg` → `tls` (Node-only API).

**Rule**:
- Client components mogen NOOIT importen via een barrel die server-only modules re-exports. Voor types + pure-data utilities (type guards zoals `isFallback`, constants, enums): import direct vanuit subpath (`@/lib/X/types`), niet via barrel.
- Library design: split barrel als type/runtime grens niet duidelijk is. Pattern: `lib/X/types.ts` (client-safe) + `lib/X/server.ts` (Node-only) + `lib/X/index.ts` (re-exports beide, alleen voor server-side gebruik).
- Vóór elke push die runner / Prisma / pg / fs / tls / crypto raakt: run lokaal `DATABASE_URL=... BETTER_AUTH_SECRET=... npm run build` — duurt ~1-2 min maar vangt bundler-resolve issues die tsc + eslint missen.
- Pre-existing PostToolUse hook runt geen build (terecht — te duur per-edit). Pre-push hook met `npm run build --silent` is een toekomstige defense-laag voor projecten die client/server-grens-fouten vaak missen.
