# Branddock Changelog

Chronologisch overzicht van wat is gebouwd. Wordt automatisch bijgewerkt door de `task-finalize` skill na elke afgeronde task.

## Hoe te navigeren

| Periode | Plek | Format |
|---|---|---|
| **Entry #1 t/m #221** (R0.1 → BSTY-FONTS, dec 2025 - mei 2026) | `docs/archive/old-lists/CLAUDE-original-2026-05-07.md` "ACTIELIJST" sectie | Originele oude format, niet gemigreerd om tijd te besparen — volledig grep-baar |
| **Entry #222+** (vanaf 2026-05-07) | dit bestand, h2 per maand | Nieuw gestandaardiseerd format (zie hieronder) |

**Waarom niet alles gemigreerd?** De 221 historische entries vertegenwoordigen ~6 maanden zwaar werk en zijn perfect doorzoekbaar in het archief. Manueel reformatteren zou een dag werk kosten zonder substantiële winst — een grep door het archief geeft hetzelfde resultaat.

**Voor zoekvragen** "wanneer was X gebouwd?" of "wat deden we met Y?":
```bash
grep -n "<zoekterm>" docs/archive/old-lists/CLAUDE-original-2026-05-07.md
```

---

## Format per entry (vanaf #222)

```markdown
### <number>. <Task title>

<1-2 zin samenvatting van wat gebouwd werd en hoe het werkt.>

- Task: [tasks/done/<id>.md](tasks/done/<id>.md)
- ADR: <link of `-`>
- Spec: <link of `-`>
- Commit: <short hash>
```

Numbering wordt auto-incremented door `task-finalize` skill, doorgaand vanaf #222.

---

## 2026-05

### 222. Documentatie-architectuur migratie (week 1)

CLAUDE.md teruggebracht van 2323 → 270 regels, repo root van 37 → 5 .md bestanden. Nieuwe `docs/` structuur (adr/playbooks/specs/archive), `tasks/<id>.md` pattern, `roadmap.md` met Now/Next/Later, `START_HERE.md` als entry point, 8 retroactieve ADRs en `docs/changelog.md` als doorgaand register.

- Task: [tasks/done/docs-migration-week-1.md](../tasks/done/docs-migration-week-1.md)
- ADR: [adr/2026-05-07-claude-md-restructure.md](adr/2026-05-07-claude-md-restructure.md), [adr/2026-05-07-tasks-as-files.md](adr/2026-05-07-tasks-as-files.md)
- Spec: -
- Commit: `47cf1aa` (week 1) + `0abd656` (afronding)

### 223. Backlog herstructurering — open plans + roadmap items naar tasks/

13 NOW + Next-bucket roadmap-items gedistilleerd naar `tasks/<id>.md` files volgens template (campaign-drafts, claw-page-awareness, power-user-shortcuts, hooks-routines-week-3, stripe-billing-live, vercel-deployment, pilot-onboarding-better-brands, posthog-sentry-browser, canvas-inline-edit-overlays, bv-wire-w1-full-centroid, content-styling-migratie, tech-debt-any-types, auto-trigger-fidelity-scoring). Roadmap-links bijgewerkt, originele plan-docs in archive gemarkeerd als gedistilleerd.

- Task: [tasks/done/tasks-migration-week-2.md](../tasks/done/tasks-migration-week-2.md)
- ADR: [adr/2026-05-07-tasks-as-files.md](adr/2026-05-07-tasks-as-files.md)
- Spec: -
- Commit: `0abd656`

### 224. Hooks + skills + subagents + eerste autonome routine (week 3)

`.claude/settings.json` met PostToolUse Edit hook (tsc + eslint via `post-edit-typecheck.sh`), PreToolUse Bash hook (`check-dangerous-bash.sh`), Stop hook (`session-summary.sh`). Skills `pre-commit` en `adr-create` toegevoegd naast bestaande `task-finalize`. Subagents `code-reviewer`, `regression-detector`, `doc-keeper`. Eerste autonome routine `nightly-doc-sync.yml` (02:00 NL, max 50K tokens) — eerste handmatige run + cost-monitoring blijven handover-items voor user.

- Task: [tasks/done/hooks-routines-week-3.md](../tasks/done/hooks-routines-week-3.md)
- ADR: -
- Spec: [playbooks/working-flow.md](playbooks/working-flow.md)
- Commit: `0abd656`

### 225. Feature-planner sparring-partner (PM + Tech-Lead subagents)

Twee gescheiden subagents voor feature-discovery vóór code wordt geschreven. `feature-planner` (PM-mode) doet 6-assen discovery + anti-sycophancy (3 redenen om NIET te bouwen) + 5-punts stop-conditie + Red Team Review, output naar `tasks/_drafts/idea-<id>.md`. `technical-planner` (Tech-Lead-mode) past Phase -1 Gates (Simplicity/Anti-Abstraction/Integration-First) toe en promoot idea-file naar uitvoerbare `tasks/<id>.md`. Forced commitment moment tussen fases voorkomt premature technical design — onderzoek wees dit aan als #1 valkuil voor solo-devs. Plus: 2 nieuwe Stream Deck triggers (Plan feature, Tech plan), staging area `tasks/_drafts/`, gids `docs/playbooks/feature-discovery.md`. Smoke-test handover voor user.

- Task: [tasks/done/feature-planner-setup.md](../tasks/done/feature-planner-setup.md)
- ADR: [adr/2026-05-07-feature-planner-architecture.md](adr/2026-05-07-feature-planner-architecture.md)
- Spec: [playbooks/feature-discovery.md](playbooks/feature-discovery.md)
- Commit: `5bd7886`

### 226. Studio component generation — echte AI in 3 routes (P0)

TODO-stubs in `generate`/`regenerate`/`generate-all` routes vervangen door echte AI-calls via nieuwe `dispatchTextCompletion` (multi-provider: Anthropic/OpenAI/Google). Cascading-context werkt nu in generate-all (component N ziet output van 1..N-1 via uitgebreide `buildCascadingComponentContext` met `includeStatuses` parameter), feedback wordt eerlijk gehonoreerd in regenerate (bug-fix: oude versie las stale feedbackText), en NEEDS_REVISION rijen in generate-all gebruiken hun bestaande feedback (compileComponentFeedback). Observability via `aiProvider`/`generationDuration`/`promptUsed` op DeliverableComponent. Concurrency-guards via `updateMany` met status-filters voorkomen double-spend op parallelle calls; metadata pas op success-path. Cache invalidation per `prefixes.{studio,campaigns,dashboard}`. Long-form components (body_text/article/blog_body etc.) krijgen 8192 tokens + 180s timeout via per-componentType helper. Prompt-injection via `additionalInstructions`/`feedback` afgevangen (strip leading `#`, length cap). 6 nieuwe helpers: `anthropicClient` singleton, `dispatchTextCompletion`, `buildComponentPrompt`, `extractPersonaIdsFromSettings` (canonical `targetPersonas` key), `getMaxTokensForComponent`, `sanitizeUserInput`. Plus `npm run smoke:studio` integratie-test (`scripts/smoke-tests/studio-generation.ts`) die de routes-logica direct aanroept tegen real-DB + real-AI. 5 review-rounds (2-subagent loop) liepen tot 0 CRITICAL/WARNING.

- Task: [tasks/done/studio-content-generation-real-ai.md](../tasks/done/studio-content-generation-real-ai.md)
- ADR: -
- Spec: -
- Commit: `4a54fad` (initial) + `fbc44d7` (hardening)

### 227. ContentVersion CRUD + studio hooks + version-history sidebar

Server-side: 4 CRUD-routes onder `/api/content/[deliverableId]/versions/` (list/detail/create-USER/restore). Helper `src/lib/learning-loop/content-version.ts` met `createContentVersion` (auto-versionNumber met retry-on-P2002 race-protection, USER-edits krijgen automatisch diff via bestaande buildDiff/classifyEdit), `restoreContentVersion` (transactioneel revert van deliverable + componenten met P2025 graceful skip voor verwijderde componenten, schrijft nieuwe USER-version voor audit-trail), `buildDeliverableSnapshot`. ContentVersion is per-deliverable (Cat 4 design uit `branddock-learning-loop-decisions.md` beslissing 4): full deliverable + alle componenten in 1 snapshot, restore reverteert hele bundle. AI-versies krijgen `createdBy='AI'`, alle 4 diff-velden NULL; USER-versies krijgen `editorUserId` + `diffFromPrevious` + `diffSummary` + `editType`. Hooks in 3 studio-routes (generate/regenerate/generate-all) creëren automatisch AI-versions na success én vuren async `scoreContentFidelity` af (absorbeert `auto-trigger-fidelity-scoring` task). Cache: nieuwe `prefixes.contentVersions(deliverableId)`. Client-side: API-client + 4 TanStack hooks (`useContentVersions` met staleTime=0 voor refetch-on-focus, `useContentVersion` met staleTime=Infinity want immutable, `useCreateUserContentVersion`, `useRestoreContentVersion`) + `VersionHistorySidebar.tsx` component met loading/error/empty states + restore-confirmatie. UI-integratie in CanvasPage als handover (drop-in: `<VersionHistorySidebar deliverableId={...} />`). 2 review-rounds tot 0 CRITICAL/WARNING. Smoke-test (Test 4 in `npm run smoke:studio`) verifieert end-to-end: AI-version → USER-version met editType=expand → restore creëert nieuwe version en reverteert component-content.

- Task: [tasks/done/content-versioning-crud.md](../tasks/done/content-versioning-crud.md)
- ADR: -
- Spec: -
- Commit: `58355cf` (iter 1+2 server) + `9dc5e2a` (iter 3+4 UI)

### 228. Auto-trigger fidelity-scoring (absorbed in #227)

`scoreContentFidelity()` wordt nu async fire-and-forget aangeroepen na elke AI ContentVersion-creatie in generate/regenerate/generate-all. Was geblokkeerd op ContentVersion-routes; afgerond als deel van #227.

- Task: [tasks/done/auto-trigger-fidelity-scoring.md](../tasks/done/auto-trigger-fidelity-scoring.md)
- ADR: [adr/2026-05-05-fval-three-pillar.md](adr/2026-05-05-fval-three-pillar.md)
- Spec: -
- Commit: `58355cf`

### 229. Brand-voice content integration (absorbed by 3 eerdere werkstromen)

Task gesloten zonder nieuwe code: de scope was BrandVoiceguide injectie in generation-prompts + voice-consistency score, maar drie eerdere werkstromen leveren dit samen al. **(1) BV-1 (sessie 2026-05-06)** voegt `brandVoiceguide` veld aan `BrandContextBlock` en rendert via `formatBrandVoiceguide()` in alle drie tier-renders van `formatBrandContext()` — dus elke AI-call die `getBrandContext()` gebruikt krijgt voice automatisch. **(2) Sessie 3j fidelity-scorer (2026-05-06)** definieert `brand-fidelity` als universal core criterion in elke content-category met description "Voice consistency, value-message alignment, positioning reinforcement" — `source: 'ai-judge'` zodat de AI-judge call de voice-fit beoordeelt. **(3) Entry #227 content-versioning-crud (2026-05-07)** bedraadt `void scoreContentFidelity()` na elke AI ContentVersion in generate/regenerate/generate-all routes. Resultaat: voice gaat automatisch de prompt in én wordt automatisch achteraf gescoord. Aparte voice-check route + dedicated voice-score badge in canvas blijven open als follow-up indien gewenst, maar zijn UI-keuzes — geen integratie-werk meer nodig.

- Task: [tasks/done/brand-voice-content-integration.md](../tasks/done/brand-voice-content-integration.md)
- ADR: [adr/2026-05-06-brand-voice-extraction.md](adr/2026-05-06-brand-voice-extraction.md)
- Spec: -
- Commit: -

### 230. Content publish QA-gate (fidelity-score blokkeert bij sub-threshold)

Server-side: helper `src/lib/learning-loop/content-readiness.ts` `getContentReadiness(deliverableId, workspaceId)` haalt de meest recente `ContentFidelityScore` op over alle versies van de deliverable (niet alleen latest version, dat zou bij user-edits silent failsafe-open triggeren). Drie nieuwe API-routes: `GET /api/studio/[deliverableId]/readiness` (status-check voor UI), `POST /api/studio/[deliverableId]/publish-with-override` (override-pad met `reason: string min 10 max 500`, emit `content.published` met `reason="override (score N): <text>"` voor analytics). Bestaande `POST /api/studio/[deliverableId]/publish` route blokkeert nu met 422 bij `!canPublish` met details + override-endpoint URL. **Channel-publish gate**: `POST /api/studio/[deliverableId]/publish-to-channel` (de route die naar LinkedIn/email/WordPress pushed) heeft dezelfde gate gekregen — accepteert `overrideReason` body-veld als bypass, emit override-event bij gebruik. Failsafe-open bij no-version/no-score zodat infrastructuur-outage publish niet brickt. Threshold per content-type uit bestaande `fidelity-criteria.ts compositeThreshold` (70 default, 65 voor social, etc.). Client-side: API-client + 2 TanStack hooks + drop-in `PublishGate.tsx` component (badge groen/geel/rood + disabled publish-knop met tooltip + override-modal met escape-to-close, role=dialog, focus-trap-baseline + verplicht reden-veld). 3 review-rounds; round-2 vond gat in `/publish-to-channel`, round-3 verifieerde fix. Smoke-test Test 5 in `npm run smoke:studio` valideert end-to-end: composite=42 blocks, =78 allows, no-score failsafe-open. **Handover**: PublishGate UI is drop-in maar nog niet gewired in CanvasPage (zelfde patroon als VersionHistorySidebar uit #227); server-side gate werkt zonder UI-integratie, integratie is een aparte UI-task.

- Task: [tasks/done/content-item-qa-gating.md](../tasks/done/content-item-qa-gating.md)
- ADR: -
- Spec: -
- Commit: `817b586`

### 231. PostHog browser + Sentry frontend observability

Browser-side observability vóór de eerste pilot. PostHog: `posthog-js` package + `src/lib/analytics/posthog-browser.ts` (singleton met failsafe no-op zonder `NEXT_PUBLIC_POSTHOG_KEY`, mirror van bestaande `src/lib/analytics/posthog.ts` server-pattern uit sessie 4.5) + `src/components/analytics/PostHogProvider.tsx` (root-level client component, `useSession()`-driven identify/reset, group analytics op workspace + organization, default `https://eu.i.posthog.com`). Auto-pageview + auto-capture aan, session-recording uit (privacy + bundle). Sentry: `@sentry/nextjs` v10 modern pattern via `instrumentation.ts` (server + edge runtime) + `instrumentation-client.ts` (browser, met `browserTracingIntegration` voor history-API pageviews die de hybride-SPA nodig heeft). `next.config.ts` voorwaardelijk wrap met `withSentryConfig` — alleen actief wanneer `NEXT_PUBLIC_SENTRY_DSN` gezet (geen build-tijd source-map upload tenzij `SENTRY_AUTH_TOKEN` ook gezet, dus dev/CI veilig). Tunnel via `/monitoring` om ad-blockers te bypassen. **5 events live**: `login_succeeded` + `signup_completed` (AuthPage), `content_qa_gate_blocked` (1× per below-threshold transition via fingerprint-ref dedup), `content_qa_override_modal_opened`, `content_qa_override_fired` (alle 3 in PublishGate uit #230). **Deferred** (out-of-scope follow-up): `content_generated`, `content_published`, `campaign_created`, `campaign_briefing_completed` — vereisen edits in canvas-orchestratie en wizard-flow buiten deze 1u-scope. Env-vars vereist voor productie: `NEXT_PUBLIC_POSTHOG_KEY` + `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` (+ `SENTRY_ORG` + `SENTRY_PROJECT` + `SENTRY_AUTH_TOKEN` voor source-maps). tsc + eslint clean op alle 8 nieuwe/gewijzigde files.

- Task: [tasks/done/posthog-sentry-browser.md](../tasks/done/posthog-sentry-browser.md)
- ADR: -
- Spec: -
- Commit: `3eb5b4d`

### 232. Campaign drafts DB-backed (absorbed by 3 eerdere sessies)

Task gesloten zonder nieuwe code: scope was DB-backed campaign drafts met multi-device persistence + max-5 limit + naadloze launch. Drie eerdere commits leveren dit samen al volledig:

1. **`a6204bc` (Sessie 1)** — `feat: DB-backed campaign drafts — schema + API endpoints` toegevoegd: `CampaignStatus.DRAFT` enum + `Campaign.wizardState`/`wizardOwnerId`/`wizardStep`/`wizardLastSavedAt` columns + dedicated draft-lookup index `[workspaceId, status, wizardOwnerId, isArchived, wizardLastSavedAt]`. Routes `POST/GET /api/campaigns/wizard/drafts` met `MAX_DRAFTS_PER_USER = 5` enforced + `PATCH/DELETE /api/campaigns/wizard/drafts/[id]`.
2. **`e55fc3c` (Sessie 2)** — `feat: campaign wizard auto-save to DB drafts`: `useDraftAutoSave` hook met `buildServerSnapshot` (263 regels). Auto-save op stap-transities, niet field-changes. `useCampaignWizardStore` wired voor draft-linkage.
3. **`dfc81ac` (Sessie 3)** — `feat: drafts picker UI + resume flow`: `DraftCampaignsList` + `DraftPickerModal` componenten + `loadDraftForResume` helper. ActiveCampaignsPage toont drafts in eigen sectie (vervuilen Active lijst niet).

Plus `19ea44d` route-fix (CONTENT-drafts naar Content Library i.p.v. Campaigns page) maakt het type-onderscheid robuust. Launch-route `wizard/launch/route.ts` doet nu conditional UPDATE (regel 92, draftId → ACTIVE) of INSERT (regel 113, geen draft).

Alle 11 acceptatiecriteria uit task-file: 11/11 satisfied. Smoke-test plan kan uitgevoerd worden zodra je echt drafts wilt testen — implementatie staat klaar.

- Task: [tasks/done/campaign-drafts-db-backed.md](../tasks/done/campaign-drafts-db-backed.md)
- ADR: -
- Spec: [archive/plans-pending-task-migration/IMPLEMENTATIEPLAN-CAMPAIGN-DRAFTS.md](archive/plans-pending-task-migration/IMPLEMENTATIEPLAN-CAMPAIGN-DRAFTS.md)
- Commit: `a6204bc` + `e55fc3c` + `dfc81ac` + `19ea44d`

### 233. Pre-pilot UI-wiring — VersionHistorySidebar + PublishGate in Step4Timeline

Handover-werk uit #227 + #230 afgemaakt. Beide drop-in componenten leefden nog niet in de actieve UI; pilot-users zouden ze niet zien zonder deze wiring. Integratie minimaal-invasief in `Step4Timeline.tsx` (de "review + publish" stap van canvas-accordion):

1. `<PublishGate>` als banner-rij bovenaan (toont fidelity-score badge groen/geel/rood + override-modal-pad). Pad voor de existing schedule/approve buttons blijft intact zodat channel-publish + email-send flows werken; gate-knop is een extra publish-pad mét score-validatie.
2. `<VersionHistorySidebar>` als slide-over panel rechts (`fixed inset-y-0 right-0 z-40`), togglable via "Toon versies" / "Verberg versies" link in de readiness-rij.

Geen layout-restructure van CanvasPage nodig — beide secties hangen aan de bestaande Step4Timeline render-tree. tsc + eslint clean op de gewijzigde file (2 pre-existing warnings ongewijzigd).

- Task: handover van #227 + #230, geen aparte task-file
- ADR: -
- Spec: -
- Commit: `1f782c3`

### 234. Content-styling migratie volledig afgerond — 9 categorieën

Laatste open NOW-task uit pre-launch. **Validator-driven afgerond**: validator-script `scripts/validate-content-styling-migration.ts` (commit `e815861`) leest 3 source-files (canvas-orchestrator.ts + content-type-inputs.ts + medium-config-registry.ts) en checkt per categorie of de migratie compleet is op 4 plekken (field-builder, MEDIUM_CONFIG_HANDLED_KEYS Set, rich format-case, legacy-cleanup). Eerste run toonde 35 issues — na filteren van validator-false-positives (shared-helper functions zoals `socialContentStyleFields`) bleven er 9 echte gaps over. Alle 9 gefixt:

**MEDIUM_CONFIG_HANDLED_KEYS uitgebreid** (9 keys): sales `salesAngle`/`includePricing`, pr-hr `structure`/`quoteCount`/`includeBoilerplate`/`includeContactBlock`, carousel `transitionStyle`, video `colorGrade`/`quality`.

**Rich-format cases toegevoegd in `formatMediumConfig`**: sales (angle-mapping + pricing-toggle), pr-hr (structure + quote-count + boilerplate + contact-block), carousel (transition-style mapping), video (color-grade mapping + quality target).

**Field-builder toegevoegd**: `colorGrade()` in content-type-inputs.ts (warm/cool/vibrant/natural opties + helpText), opgenomen in `videoContentStyleFields()`.

**Legacy-cleanup**: `colorGrade` field verwijderd uit `medium-config-registry.ts` Step 3 Medium-sectie. Step 3 toont nu alleen platform-rendering (duration, aspectRatio, quality).

**Twee bewuste niet-migraties bevestigd**: `hasEmbargo` (gedropt 2026-04-28 als irrelevant voor HR/internal/career) en `proofPointDensity` (gedropt 2026-04-28 als 1-5 numeric te granular). Validator-expectations bijgewerkt om deze niet als gap te tellen. `ctaType` blijft semantisch gedeeld web-page rendering ↔ advertising migratie (1 veld, 2 use-cases).

Final validator: 10 categorieën, 0 issues. tsc + eslint clean op alle gewijzigde files (1 pre-existing warning in canvas-orchestrator.ts:144 niet door deze task).

- Task: [tasks/done/content-styling-migratie.md](../tasks/done/content-styling-migratie.md)
- ADR: -
- Spec: -
- Commit: `e815861` (validator) + `c331df8` (migratie-fixes)

### 234. Campaign-wizard concept-approval bug-fix + UX-redesign

Bug-fix + UX rework op de "Review Creative Concept" wizard-stap. **Bug**: button bleef disabled bij 6/6 ratings omdat de view rendeerde uit `finalStrategy ?? synthesizedStrategy` maar gate `allConceptRated()` en handler `handleApprove` lazen alleen `synthesizedStrategy`. In campaign-mode multi-variant flow vult `setFinalStrategyResult` `finalStrategy` met o.a. `effieRationale` terwijl `synthesizedStrategy` null kan blijven → silent gate-mismatch + silent handleApprove early-return. **Fix**: gate én handler dezelfde fallback-keten (`finalStrategy ?? synthesizedStrategy`) + dev-only `console.warn` (signature-deduped via module-level Set) wanneer beide bestaan en op concept-velden divergeren — diagnostiek voor follow-up investigation. **UX-redesign**: button altijd-klikbaar met `sonner` toast + smooth-scroll naar eerste ongeraten card bij `!allRated`; per-card status-dot (emerald/amber via inline-style ivm Tailwind 4 purge); "Mark all as approved" `<Button variant="ghost">` shortcut; "Refine Concept" ontkoppeld van `allRated` zodat refinement ook kan met partial input; progress-tekst kleurlogica (groen=compleet, amber=partial, leeg=0); optional feedback verplaatst naar `<details>` accordion met `useState`-driven open-state (lazy initializer leest `conceptFeedback`, daarna user-controlled via `onToggle`); ELEMENTS constant dedupliceert 6 inline cards. Twee parallelle code-reviewer rondes: round 1 ving sticky-footer-clash met de wizard's eigen Continue-button + 6 ontbrekende Tailwind utilities (`scroll-mt-24`, `pb-24`, `bg-emerald-500`, etc.) — beide opgelost door sticky te droppen en inline-styles waar nodig; round 2 ving `<details open={...}>` controlled/uncontrolled hybrid + scrollMarginTop overkill — opgelost via `useState` desync en verwijdering. Tests deferred (geen vitest/jest infra in repo — apart `vitest-setup` task aangeraden); E2E deferred (bestaande wizard-spec test alleen stepper-rendering, geen AI-flow precedent). gotchas-entry geschreven: "view-prop vs store-state divergentie maakt button silent-disabled" met prior art naar twee silent-failure incidenten uit april 2026.

- Task: [tasks/done/concept-approval-ux-fix.md](../tasks/done/concept-approval-ux-fix.md)
- ADR: -
- Spec: -
- Commit: `aee6d91`

### 235. Tech-debt any-types fully cleared — 0 real `: any` left in src/

Multi-cluster TypeScript-strictening voltooid: alle 146 `: any` annotations uit src/ vervangen door proper Prisma-types, generics, of `unknown`. Tegelijk Phase 0 voorloper voor Brand Control Program — schema-extensie van Δ-1/2/3/4 en Strategy Analyst-stub kan veilig op deze laag bouwen.

**Deze sessie (62 fixes in 6 refactor-commits + 1 docs-commit)**:
- `fcf4002` — knowledge-resources + personas API mappers (`Pick<KnowledgeResource>`, `Prisma.WhereInput`/`UpdateInput`, `GeminiImagePart`, full `Persona`)
- `4598dde` — strategies/route.ts mappers (`Prisma.BusinessStrategyGetPayload<{include}>` + optional `lockedBy` intersection voor 4 callers)
- `2b035e4` — component wrappers (`React.ComponentProps<typeof Updated>`) + `LucideIcon` op 11 icon-fields. Edge-case `CanvasWorkspaceShared.icon?: string` (key in iconMap, géén component)
- `804b385` — 4 brand asset canvases krijgen per-canvas data shape types (Mission/Golden/Archetype met `Archetype`-record/Values met `BrandValueItem`); spread-merge fix in MissionStatement zodat partial sessionContent fallt-back op defaultData
- `71302b9` — `cache.ts RouteHandler args: unknown[]` (HOC pattern), `validation-methods icon: LucideIcon`, 5 canvas state-updaters `value: unknown` met polymorphism-comments
- `5346c1e` — `ResearchPlanConfiguration` (export uit ResearchPlanContext, dekt tool-flow + bundle-flow union), lokale `ResearchItem` interface, `ChangeImpactService.activeCampaigns` minimal contract
- `3c25a07` — separate Brand Control Program plan + ADR-1 + ADR-3 (niet onderdeel van deze task maar wel onderbouwing voor de Phase 0 promotion)

**Latent bug surfaced + fixed**: `ResearchDashboard` las `researchPlanConfig.numberOfInterviews/numberOfQuestionnaires` direct, maar die velden zitten in `.configuration.numberOfInterviews/...` (geneste). Het oude `: any` maskeerde dit. Gefixt naar nested access; runtime-gedrag identiek dankzij bestaande `|| 3` fallback.

**Eind-staat**: 29 ruwe matches in `grep -rn ": any" src/`, waarvan 25 in `src/generated/prisma` (NIET aanraak per task-file) en 4 false-positives in comments/string-literals (AMBER-comment, `anyAlpha` varname, "Optional: any notes" string, Adobe-Fonts-detection comment). **0 echte `: any` annotations** in handgeschreven src/.

Two-subagent code-review: 0 CRITICAL, 3 WARNINGS — alle 3 gemarkeerd als acceptable/out-of-scope/pre-existing (deferred MINOR list). tsc + lint groen (0 errors, 960 warnings). E2E-smoke deferred wegens missing `branddock_test` database in env (niet code-gerelateerd; type-only refactor met identiek runtime-gedrag).

- Task: [tasks/done/tech-debt-any-types.md](../tasks/done/tech-debt-any-types.md)
- ADR: -
- Spec: [tasks/_drafts/idea-brand-control-program.md](../tasks/_drafts/idea-brand-control-program.md) (Phase 0 voorloper context)
- Commit: `fcf4002` + `4598dde` + `2b035e4` + `804b385` + `71302b9` + `5346c1e` + `33ea121` (finalize)

### 236. BV-WIRE W-1 full centroid — task closure

Implementation already landed in commit `323ba39` (2026-05-06): voice-similarity helpers (`cosineSimilarity` / `projectSimilarityToScore` / `fetchVoiceguideCentroid` / `embedContentForVoiceMatch` / `scoreVoiceSimilarity`), composition-engine 50/50 blend wiring (`voiceguideCentroid?: number[] | null` field, `pillar1EffectiveScore` combine), fidelity-runner parallel centroid-fetch alongside personality + config. `scorerVersion` krijgt `+voice-emb-1.0` suffix wanneer semantic actief was. style-scorer.ts blijft pure string-match — backwards compat. Empirical regression Better Brands: +24 punten Δ pre/post W-1-full (BB content thematisch verwant aan voiceguide samples maar gebruikt weinig van declared `wordsWeUse` — semantic match corrigeert deze underrepresentation).

Task formal closure 2026-05-08: implementation reviewed in scope of Brand Control Program Phase 1. Multi-workspace centroid seeding (Linfi / Nobox / WRA Juristen via `scripts/fidelity/seed-voiceguide-centroids.ts`) is operational follow-up — no further code-change needed. Demo workspace re-test deferred to runtime-environment (vereist DB + OPENAI_API_KEY).

- Task: [tasks/done/bv-wire-w1-full-centroid.md](../tasks/done/bv-wire-w1-full-centroid.md)
- ADR: -
- Spec: [tasks/_drafts/idea-brand-control-program.md](../tasks/_drafts/idea-brand-control-program.md) (Phase 1 #1)
- Commit: `323ba39` (implementation, 2026-05-06) + closure-commit `5489675`

### 237. Brand Assistant fill_form_fields foundation — Phase 0.2.A claw-page-awareness

Generic write-tool infrastructure waarmee de AI editable form-fields op elke page kan invullen via `fill_form_fields([{key, value}, ...])` — bracket-notation ondersteund. Mirror van bestaand `update_campaign_wizard` pattern: server-execute returnt `clientAction: 'form_fill'` met assignments; `MutationConfirmCard` routes naar `useFormFillStore.applyFill()` na user-confirm.

**Foundation geleverd (8 files, commit `f5b9090` + finalize-fixes):**
- `src/stores/useFormFillStore.ts` (new) — Zustand store met `registerFields` / `clearFields` / `applyFill` API; returns `{applied, missing}` zodat de client kan tonen welke keys de active page niet exposeert
- `src/lib/claw/claw.types.ts` — `formFillFields` array op `ClawPageContext`
- `src/app/api/claw/chat/route.ts` — Zod schema-extension
- `src/lib/claw/tools/write-tools.ts` — nieuw `fill_form_fields` tool met Zod input + `clientAction: 'form_fill'` op execute
- `src/lib/claw/context-assembler.ts` — `formatFormFillFields()` surfaces velden + tool-instructies in system prompt; instrueert preferring dedicated tools
- `src/features/claw/components/InputBar.tsx` — leest `useFormFillStore.fields` + includes in pageContext
- `src/features/claw/components/MutationConfirmCard.tsx` — `clientAction === 'form_fill'` handler + label-overlay (registered label i.p.v. raw key) + conditional footer text voor client-only tools ("Save manually to persist" vs DB-snapshot-message) + defensive type-predicate filter op assignments

**Deferred follow-ups** (eigen sub-cluster, niet langer in deze task-file):
- Page-wiring voor PersonaDetail/BrandAssetDetail/Step1Context — alle 3 hebben dedicated tools (update_persona, update_asset_*, update_deliverable_*); `fill_form_fields` is bedoeld voor pages zonder dedicated tool. Wiring pagina-specifiek edit-state-refactor zinnig zodra die pages er zijn.
- Δ-1 chat-integratie compat-criteria 1-3 (sectionPath voor Canvas Step 4 + content-text returns + chat-card pattern) — landen natuurlijk binnen Δ-1 implementation in Phase 2 van Brand Control Program.

**Two-subagent review**: 3 iteraties tot 0 CRITICAL/WARNING. Round 1: misleading footer text + defensive cast — beide gefixt. Round 2: type predicate value-property check — gefixt. Round 3: clean (1 soft-MINOR over string-literal coupling — established codebase pattern, deferred).

tsc + lint clean (0 errors, 960 warnings, declining trend). Smoke-test deferred — vereist gewired page; foundation is non-regression (AI ziet `formFillFields = []` tot page registreert, valt terug op dedicated tools).

Phase 0 voorloper #2 Brand Control Program — foundation klaar.

- Task: [tasks/done/claw-page-awareness.md](../tasks/done/claw-page-awareness.md)
- ADR: -
- Spec: [tasks/_drafts/idea-brand-control-program.md](../tasks/_drafts/idea-brand-control-program.md) (Phase 0.2.A)
- Commit: `f5b9090` (foundation) + `f709329` (finalize)

### 238. Competitor historie data-laag — Snapshot/Activity/ContentItem (Competitive-intel Fase 1)

Foundation voor de Competitive Intelligence Loop: drie nieuwe Prisma-modellen (`CompetitorSnapshot`, `CompetitorActivity`, `CompetitorContentItem`) met hash-based no-op detection (analoog aan `BrandstyleSnapshot`-pattern), 7 deterministische diff-rules (TAGLINE / VALUE_PROP / PRICING / NEW_PRODUCT / PRODUCT_REMOVED / STATUS / TIER), en refresh-route herschreven naar dual-write transactie via `applyCompetitorRefreshDualWrite` helper die ook door smoke-tests wordt hergebruikt.

**Geleverd (3 PRs, ~2300 regels):**
- **PR-1 schema** (`fd2738c`) — 3 modellen, 6 enums, 5 nieuwe Competitor-velden (monitoring + aggregaten), 1 unique constraint `(competitorId, contentHash)`, pgvector embedding-veld op ContentItem. Backwards-compat: 25 bestaande competitors krijgen defaults zonder NULL-issues.
- **PR-2 hash + diff + backfill** (`99df752`) — `snapshot-hash.ts` (sha256 + canonical sort + whitespace-normalize), `diff-engine.ts` (Jaccard word-set distance voor PRICING met min-length guard, set-diff met case-insensitive membership maar case-preserved values), `backfill-competitor-snapshots.ts` (idempotent per-row tx, 7 retroactive snapshots geschreven, 2e run schrijft 0).
- **PR-3 refresh dual-write** (`5d16834`) — route schrijft snapshot bij hash-mismatch, hergebruikt `applyCompetitorRefreshDualWrite` helper voor de transactie-body. Workflow events (STATUS_CHANGED, TIER_CHANGED) draaien ook op no-op pad. Defensive `isCanonicalShape` shape-guard op historic snapshot-JSON.

**Smoke-tests (totaal 67 asserts):** `competitor-diff-engine.ts` 46/46 (3 lagen: hash determinisme / 7 rules / no-op + edges), `competitor-refresh-dual-write.ts` 21/21 (3 scenarios: no-op-met-workflow-event, hash-miss content, idempotency). Beide gebruiken `tsx` runner volgens project-conventie.

**Two-subagent review**: 3 iteraties. Round 1: 2 CRITICAL (data-loss op hash-match, race condition zonder unique constraint) + 8 WARNING. Round 2: P2002 try/catch was unsafe wegens Prisma `$transaction(fn)` ontbreekt savepoints — verwijderd, race-tradeoff gedocumenteerd voor MVP. Round 3: 0 CRITICAL, alle resterende WARNINGs zijn edge-cases / MVP-tradeoffs (gedocumenteerd).

**Out-of-scope** (vervolg-tasks): AI-classified events (NEW_FORMAT_EMERGING, CATEGORY_REPOSITIONING, etc.), ContentItem auto-discovery, embedding-pipeline, Brandclaw monitoring (Fase 4 post-launch), positioning-frameworks UI (Fase 2), production-grade race-protection via raw SQL `INSERT ON CONFLICT`.

**Documentatie**: idea-doc, ADR, en `prisma/migrations-pending-bootstrap/2026-05-08_competitor_snapshot_models.sql` (voor toekomstige Vercel/Neon migration-bootstrap — project gebruikt sinds februari 2026 `db push` ipv migrations).

- Task: [tasks/done/competitor-snapshot-historie.md](../tasks/done/competitor-snapshot-historie.md)
- ADR: [adr/2026-05-08-competitor-snapshot-historie.md](adr/2026-05-08-competitor-snapshot-historie.md)
- Spec: [tasks/_drafts/idea-competitive-intelligence-loop.md](../tasks/_drafts/idea-competitive-intelligence-loop.md)
- Commit: `fd2738c` (PR-1 schema) + `99df752` (PR-2 hash+diff+backfill) + `5d16834` (PR-3 refresh) + `89b15f9` (finalize)

### 239. Δ-1 Content Review — foundation + engine + API v1 (Brand Control Program Phase 2 #1)

Foundation voor de drie review-surfaces (Brand Alignment Tab 3, Brand Assistant `review_content` chat-tool, PublishGate uitbreiding) — één engine, één endpoint, drie consumers. Schema-additions: `BrandReviewFinding` (XOR FK naar ContentFidelityScore OF ContentReviewLog, afgedwongen via raw Postgres CHECK constraint), `ContentReviewLog` (extern-content audit-rij met 90-dagen `retainUntil`), 2 enums (`BrandReviewSeverity`, `FindingCategory`). Engine `runFidelityForExternalContent` orchestreert F-VAL run zonder canvas-stack/persona/strategy summaries; mappt RuleViolations → BrandReviewFinding via heuristic-prefix-parsing (`heuristic:<locale>:<category>:*` → VOICE/CLAIMS/STYLE/AI_TELL, BrandRule fallback → TERMINOLOGY). API `POST /api/alignment/review-external` accepteert paste/url/file (file deferred naar B-2) met SSRF-hardened URL-ingest: scheme allowlist (http/https), DNS-resolve elke redirect-hop met private/loopback/link-local IP-block (RFC1918 + cloud-metadata + IPv6 ULA/link-local), manual redirect-follow (max 3 hops), byte-cap streaming reader (5 MB ceiling), Content-Length pre-check, opaqueredirect-guard, en backtracking-vrij stripHtml via 2-pass indexOf-scan. Status-mapping: 400/403/413/504/501/422 per IngestError code. Char-offsets in findings 1:1 consistent met `sourceContent` storage (pure slice voor compute, marker alleen in storage).

**Live smoke** (`scripts/heuristics/smoke-external-review.ts`): 1733ms run via Better Brands workspace, 5 findings persisted, XOR FK constraint geverifieerd, scorerVersion `composition-engine-v1.0+voice-emb-1.0` (W-1-full centroid actief), cascade-delete cleanup geverifieerd.

**Two-subagent review**: 4 iteraties. Round 1+2: meerdere CRITICAL (SSRF, char-offset/storage mismatch, type-only enum imports met casts, cache invalidation ontbreekt, payload size niet gecapped). Round 3+4: 0 CRITICAL / 0 WARNING — convergentie. Deferred-by-design: DNS-rebind TOCTOU (vereist custom dispatcher), `language` parameter als v1 audit-metadata only, `findingsCount` op ContentReviewLog (follow-up bij UI).

**Out-of-scope** (sub-clusters voor follow-up): B-2 file-upload (PDF via unpdf, DOCX via mammoth), C Surface 1 Brand Alignment Tab 3 UI, D Surface 2 Brand Assistant `review_content` chat-tool, E Surface 3 PublishGate uitbreiding (bevindingen-tabel render).

- Task: [tasks/done/content-review-multi-surface.md](../tasks/done/content-review-multi-surface.md)
- ADR: [adr/2026-05-08-fval-output-schema-bevindingen.md](adr/2026-05-08-fval-output-schema-bevindingen.md), [adr/2026-05-08-locale-routing-brand-voice.md](adr/2026-05-08-locale-routing-brand-voice.md), [adr/2026-05-08-brandclaw-agent-architectuur.md](adr/2026-05-08-brandclaw-agent-architectuur.md)
- Spec: [tasks/_drafts/idea-brand-control-program.md](../tasks/_drafts/idea-brand-control-program.md)
- Commit: `<finalize-commit>` (filled after commit)
