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

### 252. Tone of Voice tab consolidatie — BrandStyleguide → BrandVoiceguide

Schema-consolidatie van 3 velden (`contentGuidelines`, `writingGuidelines`, `examplePhrases`) plus de save-for-AI toggle (`toneSavedForAi` gesplitst in `guidelinesSavedForAi` + `examplePhrasesSavedForAi`) van `BrandStyleguide` naar `BrandVoiceguide`. Voice DNA tab in Brand Voice toont nu Content + Writing Guidelines (met OBSERVED/RECOMMENDED prefix-parsing), Vocabulary tab krijgt Do/Don't examples. Brand Styleguide "Tone of Voice" tab + `/api/brandstyle/tone-of-voice/` route + `ToneOfVoiceSection.tsx` zijn verwijderd. De migratie-banner "Voice, Tone & Communication Style — moved" in BrandPersonalitySection is opgeruimd.

**Migratie-pad** (additief eerst, data-loss laatst):
1. Prisma schema: ADD nieuwe kolommen op `BrandVoiceguide`
2. Data-migratie: idempotent script kopieerde 13 workspaces (10 nieuwe voiceguides, 3 updates) — script zelf na uitvoering verwijderd voor lint-conformiteit, ADR documenteert het pad
3. ~25 lees-sites omgeschakeld: AI-context-builders (`brand-context.ts`, `knowledge-context-fetcher.ts`), F-VAL alignment (`audit-scoring`, `data-fetcher`, `fix-generator`), claw read-tools, campaign-strategy-chain, snapshot-builders, consistent-models resolvers, design-system resolver/emitters, brand-kit composite PDF, Studio tone-check, brandstyle/ai-context route, workspace export route
4. UI: Voice DNA + Vocabulary section components uitgebreid; brandvoice API routes accepteren nieuwe velden via Zod
5. Cleanup: Tone of Voice tab/section/route weg, moved-banner weg, types opgeruimd
6. Prisma schema: REMOVE oude kolommen + `db push --accept-data-loss`
7. Formele Prisma migration toegevoegd (`20260515140000_consolidate_tone_of_voice_to_voiceguide`) voor reproducibility

**Alignment fix-generator reroute** — wanneer een Brand Alignment-fix `contentGuidelines` / `writingGuidelines` op een Brandstyle entity wil schrijven, routeren we de update transactioneel naar BrandVoiceguide. Lock-check op de Brandstyleguide entity behoudt governance-parity; best-effort version-snapshot van de voiceguide-state.

**Finalize review-loop** — 3 iteraties:
- Round 1: 2 CRITICAL gefixt (analysis-engine partial upsert preserve user-edits; fix-generator Brandstyle→Voiceguide reroute), 4 WARNING gefixt (legacy StyleguideTab union, snapshot-comment, brand-context gate-semantics, onNavigate dead-prop)
- Round 2: 1 CRITICAL gefixt (formele Prisma migration toegevoegd zodat andere environments kunnen reproduceren), 1 CRITICAL gefixt (fix-generator reroute toegevoegd met lock-check + version-snapshot)
- Round 3: 1 CRITICAL gefixt (e2e tests verwijderd voor tone_of_voice tab + section), 1 WARNING geaccepteerd met comment (ResourceVersion gebruikt STYLEGUIDE enum voor voiceguide-payload — geen VOICEGUIDE enum yet, follow-up)

**Files**:
- Task: [tasks/done/tone-of-voice-merge-into-brand-voice.md](tasks/done/tone-of-voice-merge-into-brand-voice.md)
- ADR: [adr/2026-05-15-tone-of-voice-consolidation.md](adr/2026-05-15-tone-of-voice-consolidation.md)
- Spec: -
- Commit: COMMIT_HASH

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
- Commit: `4c3cc99` (schema+migration) + `4232625` (engine) + `b3f3c20` (API+ingest v1) + `110e9fa` (smoke) + `8294350` (Prisma 7 import-fix scripts) + `f755ccb` (finalize)

### 240. Competitive-intel discovery cluster — cost-model + 2 vervolg-idea-docs ready-to-build

Pre-build discovery-werk voor de Competitive Intelligence Loop, vervolg op #238 Fase 1 data-laag. Drie validatie-probes uitgevoerd, 4 audit-docs geleverd, 2 vervolg-idea-docs van `pending-tech` naar `ready-to-build` gepromoot via evidence.

**Cost-model Fase 4 brandclaw-monitoring** (`docs/audits/2026-05-08-competitor-monitoring-cost-model.md`): pilot-tier ~$11/maand effectief, tier 1 (50 ws) ~$55/maand, tier 2 (100 ws) ~$110/maand. Worst-case (100 ws × 15 concurrenten × weekly-deep zonder hash-skip) ~$1100/maand. Hard-cap aanbevelingen per plan-tier (free 4 / pro 8 / ent 25 concurrenten), prompt-caching verplicht vóór cron actief, `WorkspaceMonitoringMetrics` model nodig in Fase 4 task. Validatie-blokker §1 voor Fase 2 promotion afgerond.

**Idea-doc `competitor-content-item-discovery`** (`tasks/_drafts/idea-competitor-content-item-discovery.md`): producer voor de lege `CompetitorContentItem`-tabel. Drie probes uitgevoerd: A1 RSS hit-rate 42.9% (verworpen, scope-cut), A2 sitemap-coverage 71.4% (boven 70% target), A3 URL-classifier accuracy 100% met Haiku 4.5 op 25 hand-gelabelde URLs. Definitieve MVP-scope: sitemap-first met robots.txt + 4 paden + recursie sub-sitemaps, RSS als secundaire fallback, AI-classifier voor format+themes, geen HTML-fallback (0% in sample), graceful skip voor competitors zonder bron (~28%). Effort 5-6 dagen.

**Idea-doc `competitor-ai-event-classifier`** (`tasks/_drafts/idea-competitor-ai-event-classifier.md`): pattern-detection bovenop deterministische diff-rules voor 2 strategische events (CATEGORY_REPOSITIONING + TARGET_AUDIENCE_CHANGED). A1 probe: 96.7% accuracy op 30 synthetische prev/next paren met Haiku 4.5 — CATEGORY 100%, TARGET_AUDIENCE 90% (1 borderline dual-event miss), NONE 100% (0 false-positives). Strikte JSON-only prompt verplicht (eerste run gaf 33% parse-errors zonder). MVP-scope strak: 2 events deze task; visual-rebrand/funding/leadership/format-emerging defereren naar vervolg-tasks die andere data-sources binnenhalen. Effort 3-4 dagen.

**Probe-infrastructuur**: 4 nieuwe scripts in `scripts/probes/` (`competitor-rss-hit-rate.ts`, `competitor-content-source-availability.ts`, `competitor-classifier-accuracy.ts`, `competitor-classifier-events-accuracy.ts`) — herbruikbare feature-feasibility-validatie pattern voor toekomstige idea-docs.

Beide vervolg-idea-docs zijn klaar voor technical-planner promotion zodra effort-window beschikbaar is. Validatie-blokker §2 (pilot-priority-check 3 leads) blijft open user-action.

- Task: -  (discovery-cluster, geen single task)
- ADR: [adr/2026-05-08-competitor-snapshot-historie.md](adr/2026-05-08-competitor-snapshot-historie.md) (parent)
- Spec: [tasks/_drafts/idea-competitive-intelligence-loop.md](../tasks/_drafts/idea-competitive-intelligence-loop.md), [tasks/_drafts/idea-competitor-content-item-discovery.md](../tasks/_drafts/idea-competitor-content-item-discovery.md), [tasks/_drafts/idea-competitor-ai-event-classifier.md](../tasks/_drafts/idea-competitor-ai-event-classifier.md)
- Commit: `41a7c90` (cost-model) + `bc6dc6f` (idea content-discovery) + `46d3b0a` (A1 RSS) + `d7f81ba` (A2 sitemap) + `583f384` (A3 classifier) + `6e3c7ed` (idea ai-event) + `7355f44` (A1 classifier-events) + `edd2e4b` (finalize)


### 241. Canvas+Studio audit + per-item tweaks 3-cluster + image-track 3-cluster + locale-fix (12-task pre-launch sprint)

Eén-sessie pre-launch sprint die de meeste open Canvas/Studio-werk afrondt. Discovery + 3 per-item-tweak-clusters (36 content-types met item-specifieke inputvelden + Asset Planner pre-fill + canvas-orchestrator rich-renders) + 3 image-flow-clusters (defaults / content-coupling / briefing-textarea + Claude Haiku suggest-route) + locale-bug-fix die mixed-language output structureel oplost. **254/254 smoke-checks groen** over 11 nieuwe `npm run smoke:*` scripts.

Per-item tweaks (3 builders → 36 types):
- `conversionContentStyleFields()` — 13 types (4 social + 7 ads + 2 email) met hookFormat/payoffPromise/targetObjection/proofPoint + per-hookFormat-value rich-renders in canvas-orchestrator
- `authorityContentFields()` + `narrativeAnchorFields()` — 10 types (6 long-form + 4 PR/case) met THESIS/ANTI-THESIS/PIVOT framing
- `skeletonInputFields(kind)` — 13 types met "USE EXACTLY — do NOT modify" skeleton instructie

Image-flow (3 layers):
- 25 type-defaults + suggestie-strook in `VisualBriefSection`
- `buildSubjectByChip()` injecteert persona+product+CTA+platform in image-prompts (4 routes)
- `briefingText` veld op VisualBrief + textarea + Claude Haiku `/suggest-visual-briefing` route

Locale-fix:
- `buildLocaleInstruction()` helper centraal in `prompt-templates.ts` (alle 4 tiers) + `buildBrandVoiceDirective` versterkt voor élke taal met "translate source material" clause

Bonus closures op latente werk in BCP Phase 1+2 + Cowork-pariteit:
- `heuristics-packages-multilingual` — en-GB/nl-BE/de-DE pakketten + ai-tells/Denglisch toegevoegd, registry compleet
- `voice-baseline-1pager` — derivation + format-helper + UI + judge-embed end-to-end gevalideerd
- `campaign-brief-output-mapper` — Cowork-pariteit Fase A: 10-sectie brief-render met week-thema AI-call + B2/B3/B4 placeholders
- `canvas-inline-edit-overlays` — 13 preview-consumers + ContentSectionsEditor cleanup
- `canvas-studio-audit` + 2 plan-tasks (per-item tweaks + image-briefing) — 3 audit-docs gespawnd

12 tasks afgerond, 13 task-files naar `tasks/done/`.

- Task: [tasks/done/canvas-studio-audit.md](../tasks/done/canvas-studio-audit.md), [tasks/done/canvas-per-item-tweaks-plan.md](../tasks/done/canvas-per-item-tweaks-plan.md), [tasks/done/canvas-image-briefing-plan.md](../tasks/done/canvas-image-briefing-plan.md), [tasks/done/content-locale-enforcement-fix.md](../tasks/done/content-locale-enforcement-fix.md), [tasks/done/canvas-tweaks-conversion-shortform.md](../tasks/done/canvas-tweaks-conversion-shortform.md), [tasks/done/canvas-tweaks-longform-authority.md](../tasks/done/canvas-tweaks-longform-authority.md), [tasks/done/canvas-tweaks-structured-skeleton.md](../tasks/done/canvas-tweaks-structured-skeleton.md), [tasks/done/canvas-image-briefing-defaults.md](../tasks/done/canvas-image-briefing-defaults.md), [tasks/done/canvas-image-content-coupling.md](../tasks/done/canvas-image-content-coupling.md), [tasks/done/canvas-image-briefing-textarea.md](../tasks/done/canvas-image-briefing-textarea.md), [tasks/done/heuristics-packages-multilingual.md](../tasks/done/heuristics-packages-multilingual.md), [tasks/done/voice-baseline-1pager.md](../tasks/done/voice-baseline-1pager.md), [tasks/done/campaign-brief-output-mapper.md](../tasks/done/campaign-brief-output-mapper.md), [tasks/done/canvas-inline-edit-overlays.md](../tasks/done/canvas-inline-edit-overlays.md)
- ADR: -
- Spec: [audits/2026-05-08-canvas-studio-state.md](audits/2026-05-08-canvas-studio-state.md), [audits/2026-05-08-canvas-per-item-tweaks-plan.md](audits/2026-05-08-canvas-per-item-tweaks-plan.md), [audits/2026-05-08-canvas-image-briefing-plan.md](audits/2026-05-08-canvas-image-briefing-plan.md)
- Commit: `a8363c0`

### 242. Campaign brief output-mapper — Fase A Cowork-pariteit (finalize + review-loop)

Render-laag bovenop bestaande `CampaignBlueprint` die wizard-output transformeert naar 10-secties Linfi-stijl markdown-brief: pure data-mapper (`brief-data-mapper.ts`) + markdown-renderer (`brief-renderer.ts`) + on-render Anthropic-call voor sectie 5 week-thema's + GET/POST routes onder `/api/campaigns/[id]/brief/{render,mark-ready}` + `BriefRenderView` modal in ContentLibraryCampaignMode. Secties 7/8/9 tonen expliciete "Not available — requires <follow-up-feature>" placeholders met links naar `campaign-kpi-structure` / `campaign-budget-table` / `campaign-risk-assessment`. Geen schema-wijzigingen.

**Implementation** (productie-commit `855f8a3`): 9 nieuwe files (~1688 regels) + ContentLibraryCampaignMode extension. Workspace-isolation via `resolveWorkspaceId()` + `findFirst({ where: { id, workspaceId } })` op beide routes. PostHog event `campaign_brief_marked_ready` op "Klaar voor klant"-knop. AI-call via `anthropicClient.createChatCompletion` met 6s timeout + Zod-schema voor week-theme response.

**Finalize review-loop** — 4 iteraties tot 0 CRITICAL/0 WARNING:
- Round 1: 0 CRITICAL + 14 WARNING (timeout 10s vs spec 6s, hardcoded sectionsRenderedCount, escape() newline corruption, Zod onbegrensd, mediumEnrichment unbounded, `new Date()` in mapper, etc.)
- Round 2: 0 CRITICAL + 4 WARNING (orderBy non-deterministic, sectionsRenderedCount counts flags niet sections, staleTime UX trap, unknownPriorities severity)
- Round 3: 1 CRITICAL (PG NULLS-sorting bug zelf-geintroduceerd in R2: `ORDER BY DESC` defaultt naar NULLS FIRST → workspace-overrides afgekapt bij 200-cap) + 1 WARNING (`<missing>` sentinel lekt naar user-message)
- Round 4: convergentie 0 CRITICAL / 0 WARNING

**Fixes geleverd**: timeout 10s→6s; `new Date()` injectable via `now?: Date` parameter; escape() strip newlines; Zod `.max(20)` op sectionsRenderedCount; sectionsRenderedCount via unique-section Set; staleTime 60_000 + Regenerate-knop; mediumEnrichment `take: 200` + `orderBy: [{ workspaceId: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }]`; `${ch.priority}` defensive; `unknownPriorities` MissingDataFlag met `(empty)` sentinel.

**Quality gates**: tsc 0 errors, lint 0 errors (0 warnings in nieuwe files). Manual smoke-test (9 stappen UI-werk uit task-file) is user-action vóór live productie-gebruik.

**Out-of-scope** (B-cluster follow-ups): `campaign-kpi-structure` (sectie 7), `campaign-budget-table` (sectie 8), `campaign-risk-assessment` (sectie 9), brief-versioning, PDF/Notion/Word export.

- Task: [tasks/done/campaign-brief-output-mapper.md](../tasks/done/campaign-brief-output-mapper.md)
- ADR: -
- Spec: [tasks/_drafts/idea-campaign-brief-cowork-parity.md](../tasks/_drafts/idea-campaign-brief-cowork-parity.md) + [tasks/_drafts/idea-campaign-brief-cowork-parity-validation.md](../tasks/_drafts/idea-campaign-brief-cowork-parity-validation.md)
- Commit: `855f8a3` (initial implementation, parallel session) + `4b0cffe` (finalize)

### 243. Δ-1 Surface C — Brand Alignment "Content Review" tab UI

Eerste pilot-zichtbare review-surface bovenop bestaande Δ-1 API. Derde tab "Content Review" naast Alignment + Audit op `BrandAlignmentPage`. Paste-textarea (50-50000 chars getrimd) of URL-input + submit triggert POST `/api/alignment/review-external`, waarna nieuwe GET `/[reviewLogId]` route findings ophaalt voor render. Score-gauge (3-color emerald/amber/red) + threshold-badge + filterable findings-tabel met severity + category pills (counts per group) + before/after blocks voor top-issues.

**Geleverd** (productie-commit `994e772`, ~786 regels): nieuwe GET `/api/alignment/review-external/[reviewLogId]/route.ts` (workspace-isolated, expliciete severity-rank sort post-fetch wegens alfabetisch enum-sort default), `useReviewContent` hook (mutation + query met staleTime Infinity per ADR-2 immutability), `ContentReviewTab` (input UI met paste/url toggle), `ContentReviewResult` (score + filters + findings-table), `useBrandAlignmentStore` AlignmentTab union extend ("alignment" | "audit" | "review"), `BrandAlignmentPage` 3rd tab integratie. Severity-mapping HIGH→CRITICAL/MEDIUM→WARNING/LOW→SUGGESTION hergebruikt bestaande `SeverityBadge`.

**Architectuur-keuzes**: Optie B uit task-Notes (nieuwe GET-route ipv POST-extending — respecteert "POST niet aanraken"); filter-state lokaal in ContentReviewResult (geen Zustand); React text-children only render (geen `dangerouslySetInnerHTML`, XSS-mitigatie); `DEFAULT_COMPOSITE_THRESHOLD` geïmporteerd uit composition-engine ipv hardcoded magic-number.

**Finalize review-loop** — 3 iteraties tot 0 CRITICAL/0 WARNING:
- Round 1: 0 CRITICAL + 6 WARNING (severity-sort alfabetisch, trim min/max inconsistent, thresholdMet alleen op mutation, geen aria-pressed/role=alert, long-text overflow)
- Round 2: 0 CRITICAL + 3 WARNING (magic-number drift, incomplete tab-ARIA, char-counter untrimmed)
- Round 3: 0 CRITICAL + 0 WARNING (één future-proofing concern over latent threshold-divergence — defer als design-coupling, geen actuele bug)

**Quality gates**: tsc 0 errors, lint 0 errors (0 warnings in nieuwe files; 969 totaal pre-existing).

**Out-of-scope** (Δ-1 v2 follow-ups): file-upload UI (B-2 PDF/DOCX), tone-suggestions inline-edit, Surface D (Brand Assistant chat-tool), Surface E (PublishGate findings-block), history-list earlier reviews, auto-export PDF/CSV.

- Task: [tasks/done/content-review-tab-3-ui.md](../tasks/done/content-review-tab-3-ui.md)
- ADR: [adr/2026-05-08-fval-output-schema-bevindingen.md](adr/2026-05-08-fval-output-schema-bevindingen.md), [adr/2026-05-08-locale-routing-brand-voice.md](adr/2026-05-08-locale-routing-brand-voice.md)
- Spec: [tasks/_drafts/idea-brand-control-program.md](../tasks/_drafts/idea-brand-control-program.md)
- Commit: `994e772` (initial implementation) + `cf030f1` (finalize)

### 244. Δ-1 Surface D — Brand Assistant `review_content` chat-tool (finalize)

Δ-1 Surface D maakt F-VAL fidelity-review beschikbaar als chat-native tool in de Brand Assistant. User plakt content of URL in chat → tool draait F-VAL → `ReviewFindingsCard` rendert inline met composite-score, threshold-status en top-3 findings. Initial build was commit `534d60c`; finalize-cyclus voegt 5 review-rondes hardening toe.

**Geleverd** (initial `534d60c`, ~485 regels): nieuwe `review_content` analyze-tool in `analyze-tools.ts` (Zod discriminated-union paste/url, hergebruikt `runFidelityForExternalContent` engine + `ingestPaste`/`ingestUrl` met SSRF-mitigatie), `ReviewFindingsCard` met error-variant en `role="status"`, ChatArea `clientAction === 'review_findings_card'` routing, system-prompt anti-over-trigger contract, server-side smoke-test met 4 scenarios.

**Finalize review-loop** — 5 iteraties (skill hard-limit) tot 0 CRITICAL en alleen design-trade-off WARNINGs over:
- Round 1: 1 CRITICAL (broken Tab 3 deep-link) + 5 WARNINGs (Zod safeParse defense-in-depth, `take: 50` silent correctness, anti-over-trigger soft spot, top-findings text round-trip naar Anthropic, smoke-test 3 tautologie)
- Round 2: 0 CRITICAL + 3 WARNINGs (smoke-test silent-skip, vacuous-true op empty array, Zod issues join voor LLM-feedback)
- Round 3: 0 CRITICAL + 4 WARNINGs (deterministic test-ordering, andere fixture-string voor isolation-run, take=200 runaway-guard, Zod multi-issue join)
- Round 4: 0 CRITICAL + 1 WARNING (`failureReason: 'invalid_input'` semantisch correct voor Zod-fail, type-union uitgebreid)
- Round 5: 0 CRITICAL + 3 design-trade-off WARNINGs (alle expliciet als acceptable geframed door reviewers)

**Architectuur-keuzes**: defense-in-depth `safeParse` op tool-execute entry (chat-route trust Anthropic SDK; redundant guard hier voorkomt malformed-input slip), `take: 200` runaway-guard (Prisma's enum-orderBy is alfabetisch HIGH<LOW<MEDIUM, dus client-side severity-sort vereist), `TOP_FINDINGS_TEXT_CAP=280` (gestringified findings round-trippen naar Anthropic in elke vervolg-turn), Tab-3 deep-link verwijderd (URL-param parser is separate task wanneer pilot-feedback dit prioriteert), `failureReason: 'ingest_failed' | 'invalid_input'` discriminated zodat FE differentiated copy kan tonen (placeholder voor toekomst).

**Quality gates**: tsc 0 errors, lint 0 errors in nieuwe files (969 pre-existing warnings).

**Out-of-scope** (gedocumenteerd in task-Notes): URL-param parser voor Tab 3 deep-link, ReviewErrorCard differentiated copy per failureReason, Surface E PublishGate findings-block, severity-visual unification Surface C+D.

- Task: [tasks/done/content-review-chat-tool.md](../tasks/done/content-review-chat-tool.md)
- ADR: [adr/2026-05-08-fval-output-schema-bevindingen.md](adr/2026-05-08-fval-output-schema-bevindingen.md), [adr/2026-05-08-locale-routing-brand-voice.md](adr/2026-05-08-locale-routing-brand-voice.md)
- Spec: [tasks/_drafts/idea-content-review-chat-tool.md](../tasks/_drafts/idea-content-review-chat-tool.md)
- Commit: `534d60c` (initial implementation) + `f2f0455` (5-round hardening)

### 245. Δ-1 Surface E — PublishGate findings-block voor interne content (finalize)

Sluit de Δ-1 trifecta: Surface C (Tab 3 paste/url review-UI) en Surface D (Brand Assistant chat-tool) waren live op `main`; Surface E haakt structured findings nu ook in PublishGate voor INTERN gegenereerde canvas-content. Bij sub-threshold score toont PublishGate een uitvouwbaar amber-block met top-3 HIGH-severity findings (severity-pill + category + description + suggestion), zodat user concrete issues ziet vóór de override-modal-keuze. Schema staat al voor: `BrandReviewFinding.fidelityScoreId` is een nullable FK in XOR-relatie met `contentReviewLogId` (ADR-1) — geen migratie nodig.

**Geleverd** (initial `0b27fe0`, ~850 regels): shared util `src/lib/brand-fidelity/violation-to-finding.ts` (extract `mapViolationToFindingInput` + `mapSeverity` + `inferCategory` uit external runner; beide runners delen nu één mapper), `persistContentFidelityScoreIfPossible` extend met `BrandReviewFinding` nested-create via `fidelityScoreId` (atomic 1-roundtrip), nieuwe GET `/api/alignment/internal-findings/[fidelityScoreId]/route.ts` mirror van Surface C, `useInternalFindings` TanStack hook met `staleTime: Infinity` (scores immutable per ADR-2), `FindingsBlock` sub-component in `PublishGate.tsx` met expand/collapse + `key={fidelityScoreId}` voor state-reset bij regenerate. Smoke-test 16/16 + manual UX-smoke uitgevoerd op LINFI deliverable via dev-helper inject-fixture script.

**Finalize review-loop** — 5 iteraties (skill hard-limit) tot 0 CRITICAL/0 WARNING:
- Round 1: 2 CRITICAL (`findingsCount` aggregate ontbrak op create — ADR-1 join-free counter; `inject-fixture` geen NODE_ENV/localhost guard) + 1 WARNING (smoke-test 4 deels tautologisch zoals Surface D round 2)
- Round 2: 0 CRITICAL + 2 WARNINGs (`as string` cast violates "no any types" — revert naar runtime throw als defense-in-depth tegen `refetch()`; smoke-test 4 hard-fail breekt single-workspace seeds — back to soft-skip met luide warn)
- Round 3-4: 1 WARNING ronde 3 (`findingsCount` ook missend op fixture/smoke synthetic creates), 1 WARNING ronde 4 (`SMOKE_FINDINGS_COUNT` magic number — derive uit `smokeFindings.length`)
- Round 5: 0 CRITICAL + 0 WARNING — beide reviewers approve, MINORs als "bewuste keuze" gemarkeerd

**Architectuur-keuzes**: nested-create voor atomic findings+score persist (1 round-trip), aggregate-counter pattern (`findingsCount: findings.length`) gerold mirror op runner én fixture-injector én smoke-test, drift-detection assert in smoke (`findingsCount === persisted.length`), typed `Record<BrandReviewSeverity, …>` voor compile-time exhaustiveness, `key={fidelityScoreId}` voor state-reset bij regenerate, runtime throw in `useInternalFindings.queryFn` als defense-in-depth tegen `refetch()` (die `enabled: false` bypassed).

**Quality gates**: tsc 0 errors, lint 0 errors in nieuwe files (969 pre-existing warnings totaal), smoke `internal-findings.ts` 16/16 pass.

**Dev-helper toegevoegd**: `scripts/inject-publishgate-findings-fixture.ts` — synthetic ContentVersion + sub-threshold ContentFidelityScore + 5 findings injecteren op een gekozen deliverable, met NODE_ENV-prod refusal + localhost-DATABASE_URL guard + `--cleanup` flag. Voor toekomstige UX-smoke van Surface E zonder live F-VAL run te hoeven triggeren.

**Out-of-scope** (gedocumenteerd in task-Notes): `getContentReadiness` filtert niet op `judgeIdentifier` (bestaand readiness-query, niet door deze task geïntroduceerd), STRICT re-score path duplicate-rij-accumulation (bestaand pattern), `mapViolationToFindingInput` populeert `suggestion` nooit (productie heuristics emit geen replacement-text — render is conditioneel), `inferCategory` BrandRule→TERMINOLOGY route (ADR-1 ontwerpkeuze), `SEVERITY_RANK` triplicaat Surface C/D/E (extract naar shared util — separate cleanup-task), `ReviewFinding` type cross-import (extract naar `types/findings.ts` — separate cleanup-task), URL-param parser voor `?fidelityScoreId=` deep-link in BrandAlignmentPage, stale-findings race van 10s `useContentReadiness` staleTime + fire-and-forget persist (acceptable MVP window).

- Task: [tasks/done/publishgate-findings-block.md](../tasks/done/publishgate-findings-block.md)
- ADR: [adr/2026-05-08-fval-output-schema-bevindingen.md](adr/2026-05-08-fval-output-schema-bevindingen.md)
- Spec: -
- Commit: `0b27fe0` (initial implementation) + `9a86e6f` (5-round hardening)

### 246. Δ-1 cleanup-pack — shared SEVERITY_RANK + ReviewFinding types + SPA deep-link + InputBar tool_result fix

Drie cleanup-items uit de Surface D + E finalize-loops als 'separate task' geflagged zijn nu samen geadresseerd, plus een latente productie-bug die tijdens visual smoke aan het licht kwam:

**1. SEVERITY_RANK shared util**: nieuwe `src/lib/brand-fidelity/severity-rank.ts` met `Record<ReviewSeverity, number>` (compile-time exhaustiveness) + `severityRank()` helper met `?? 99` fallback. Drie call-sites (Surface C external GET route, Surface D analyze-tool, Surface E internal GET route) importeren ervan i.p.v. eigen inline-declaratie. Drift-risico bij toekomstige severity-uitbreiding (bijv. `CRITICAL`) weg.

**2. ReviewFinding types extract**: nieuwe `src/types/brand-review-finding.ts` met `ReviewSeverity` / `ReviewCategory` / `ReviewFinding` string-union types. `useReviewContent` (Surface C) en `useInternalFindings` (Surface E) importeren beide uit deze neutrale plek; de hooks-cross-import van Surface E naar Surface C is weg. `useReviewContent` re-exporteert types voor backwards-compat met bestaande consumers.

**3. SPA deep-link voor "View all findings"**: hybrid-SPA architectuur ondersteunt geen URL-params voor pagina-routing (browser-URL blijft constant; `<a href>` zou full reload veroorzaken), dus implementatie via Zustand-store preload-state:
- `useBrandAlignmentStore` extended met `preloadReviewLogId` / `preloadFidelityScoreId` + `openReviewByLogId(id)` / `openReviewByFidelityScoreId(id)` / `clearPreload()` actions (XOR via action-pattern: actie clears tegen-overgestelde field)
- `ContentReviewTab` leest preload-state op mount; bij aanwezigheid skip het paste/url input-form en render direct `ContentReviewResult` met pre-loaded findings via de juiste hook (`useReviewFindings` voor extern, `useInternalFindings` voor intern); synthetisch `ReviewSubmitResponse`-shape voor uniforme render. `clearPreload()` op submit-fire en op handleReset zodat fresh review altijd voorrang krijgt
- Surface D `ReviewFindingsCard`: button met `openReviewByLogId` + `setActiveSection('brand-alignment')` + `closeClaw()` (chat-overlay sluit, content-review tab opent)
- Surface E PublishGate `FindingsBlock`: button met `openReviewByFidelityScoreId` + `setActiveSection` (Canvas wordt verlaten, acceptable trade-off voor deep-link UX)

**4. Latente productie-bug ontdekt en gefixt** (`InputBar.tsx`): `tool_result` SSE event was sinds initial Surface D commit (534d60c) alleen een activity-status setter — `message.toolResults` werd NOOIT gepopuleerd. ChatArea iterates `message.toolResults?.map(...)` om de juiste card te dispatchen, maar door lege array viel het altijd door naar de generic "Data retrieved" badge — of niets. De assistent-text-output gaf zoveel detail (score, threshold, top-3 issues in markdown) dat het op een card leek; pas bij deze cleanup-pack visual smoke (waar de "View all findings" button moest verschijnen) viel op dat de card zelf nooit rendered. Fix: accumuleer SSE `tool_result` events in lokale array tijdens streaming, plak op assistant message bij `done` event. Generic `analyze` tools renderen nu de Wrench-badge (gewenst); `review_content` dispatcht naar ReviewFindingsCard zoals altijd bedoeld.

**Aanvullende cleanups uit finalize-loop**: `durationMs` optional gemaakt in `ReviewSubmitResponse` (preload-internal heeft geen duration; ScorePanel rendert "run took Xs" conditioneel pas vanaf > 0); useEffect-cleanup op ContentReviewTab unmount **verwijderd** (BrandAlignmentPage conditioneel rendert via `{activeTab === 'review' && ...}`, dus tab-switch zou preload wissen — handleSubmit + handleReset volstaan).

**Quality gates**: tsc 0 errors, lint 0 errors in nieuwe/aangeraakte files, smoke `internal-findings.ts` 16/16 pass, manual UX-smoke (Surface D card "View all" + Surface E "+ N more" deep-links beide bevestigd live).

- Task: [tasks/done/delta-1-cleanup-pack.md](../tasks/done/delta-1-cleanup-pack.md)
- ADR: -
- Spec: -
- Commit: `1008918` (initial cleanup-pack) + `4470717` (InputBar tool_result fix) + `bc3b69b` (3-round hardening)

### 247. Brand Alignment Insights tab — pilot-feedback dashboard voor Δ-1 surfaces

Brengt een 4e tab "Insights" naast Alignment / Audit / Content Review met 30d aggregaten over de Δ-1 trifecta — extern (Surface C+D paste/url, gecombineerd) plus intern (Surface E canvas-content). User-visible per workspace, geen org-overview. Geeft data om over 30 dagen pivot-vs-wasted-effort verdict per surface te kunnen geven.

**Geleverd** (initial `c0f274e`, ~790 regels):
- Nieuwe GET `/api/brand-alignment/insights/route.ts` — workspace-scoped 30d aggregate. Returnt KPI-totalen (reviews, findings, threshold-pass-rate, blocked-published-rate proxy via `Deliverable.publishedAt + thresholdMet=false`), top-5 finding-categories via Prisma `groupBy` met stabiele tie-break `[count desc, category asc]`, 7d day-bucket pass-rate trend voor sparkline, 5 meest recente reviews (extern + intern gemixt op scoredAt). `truncated` response-flag wanneer 5000+ records de runaway-cap raken.
- `useAlignmentInsights` TanStack hook met `staleTime: 60s`, `gcTime: 5min` expliciet, queryKey gepostfixed met workspaceId voor cross-workspace cache-isolation.
- `InsightsTab` component met KPI-tiles pattern (cf. `PromptUsageDashboard`), `SparklineChart` 7d trend (hergebruik van business-strategy SparklineChart, nu met `useId()` voor unique gradient-id ipv hardcoded `sparkline-fill`), top-5 categories ranking, recent-reviews lijst met source-pill (Paste / URL / Canvas) + score-color + relative-time. Empty-state placeholder bij 0 reviews; truncated-banner bij >=5000 records met expliciete sampling-methode-uitleg; "Workspace context niet beschikbaar" fallback bij failed useWorkspace.
- `useBrandAlignmentStore.AlignmentTab` union extend met `'insights'`; `BrandAlignmentPage` 4e tab-button + conditional render.

**Cross-task scope-creep**: SparklineChart hardcoded gradient-id collision was een latente bug die door de nieuwe InsightsTab consumer relevanter werd — `useId()` fix in dezelfde PR (geen API-change, backwards-compatible voor bestaande StrategyProgress consumer).

**Finalize review-loop** — 5 iteraties (skill hard-limit + 1 met user-akkoord) tot 0 CRITICAL en alleen acceptabele truncation-edge-case MINORs over:
- Round 1: 3 CRITICAL (Tailwind class overlap, workspace-isolation defense gap, SparklineChart gradient-id) + 6 WARNINGs (DEFAULT_COMPOSITE_THRESHOLD import, take cap + N+1 fold, override-rate label rename, role=alert, _count consistent, queryKey workspaceId)
- Round 2: 0 CRITICAL + 3 WARNINGs (workspace error fallback, gcTime expliciet, truncated flag)
- Round 3: 0 CRITICAL + 4 WARNINGs (`_count.findings` ipv relation-load tegen memory-spike, stable tie-break, isPending ipv isLoading, mixed-threshold semantics comment)
- Round 4: 0 CRITICAL + 2 WARNINGs (banner-text trend distortion, no-workspace copy)
- Round 5 (hard-limit + 1): 0 CRITICAL + 2 WARNINGs gefixt + corner-case truncation behaviour gedocumenteerd

**Quality gates**: tsc 0 errors, lint 0 errors in nieuwe files, manual UX-smoke pass op LINFI workspace (10 reviews, 16 findings, 20% pass-rate, 0% blocked-published — actionable productie-data).

**Out-of-scope** (gedocumenteerd in task-Notes): formatRelative NL drift met dashboard formatLastScan EN, empty-state CTA inert, trend-arrow ignores reviewCount, color-token drift, A11y debt (KPI-tiles geen role/aria-label, sparkline no role=img), tab-state geen URL-sync, denormalized findingsCount legacy-undercount, blockedPublishedRate proxy-overcounting, micro-race already covered.

- Task: [tasks/done/brand-alignment-insights-tab.md](../tasks/done/brand-alignment-insights-tab.md)
- ADR: -
- Spec: -
- Commit: `c0f274e` (initial implementation) + `64f7f95` (5-round hardening)

### 248. F-VAL rules-pijler audit — mapper categories + NL-NL packs + stem-variants

Drie incrementele wijzigingen op de F-VAL rules-pijler na visual-smoke ontdekking dat fluff-NL-tekst met "passie/kwaliteit/innovatie" 0 findings opleverde voor LINFI. Insights tab toonde 16/16 findings allemaal in TERMINOLOGY-categorie (mapper-quirk). Resultaat: rijkere category-spread + meer signal-coverage voor alle drie Δ-1 surfaces.

**Geleverd** (initial `accd88c`, ~415 regels):

- `inferCategory` in `violation-to-finding.ts` extended met `ruleType?: BrandRuleType` parameter. BrandRule violations routen nu via `v.ruleType`: REQUIRED_PHRASE → `BUSINESS`, STYLE_LIMIT → `STYLE`, PILLAR_REFERENCE → `BUSINESS`, FORBIDDEN_WORD blijft `TERMINOLOGY` (geen eenduidig pad zonder schema-extension). Insights tab krijgt category-spread i.p.v. 100% TERMINOLOGY voor alle BrandRule findings.

- NL-NL heuristic-pack uitbreiding: `vague-quality.ts` krijgt "passie" (always-flag) en "kwaliteit" (context-flag, requires-substantiation). `corporate-fluff.ts` krijgt "innovatie" en "innovaties" als stem-varianten van "innovatief". Vangt veelvoorkomende NL-cliché-buzzwords die voorheen door beide pillars heen vielen.

- `expandStemVariants(word)` helper in `brand-rule-sync.ts` — pure-functie, deterministische NL suffix-rules zonder linguistic library. `wordsWeAvoid` entries krijgen automatisch flexed/plural varianten als FORBIDDEN_WORD BrandRules. Beide sync-functies (`syncWordsAvoidToRules` legacy + `syncVoiceguideToRules`) gebruiken het. AntiPatterns blijven 1-op-1 (phrases). LINFI verified: 14 input wordsWeAvoid → 44 BrandRules; "innovatief" matcht nu ook "innovatie" in tekst → 1 FORBIDDEN_WORD violation (was 0).

**Suffix-rules (precision boven recall — false-positives in user-facing patterns/messages zijn schadelijker dan gemiste plurals)**:
- `-ief` (innovatief → innovatie/innovatieve/innovaties)
- `-eel` (passioneel → passionele) — geen plural (-en) want non-NL-noun risk
- `-iek` (uniek → unieke) — geen `+ en` want "unieken" geen NL-noun
- `-isch` (automatisch → automatische) — geen `-isme` want "logisme/basisme" non-words
- Default: `endsWith('e')` → `+ s` (luxe → luxes); else → `+ en` (kwaliteit → kwaliteiten)

**Gemist (deliberate trade-off, gedocumenteerd in helper-JSDoc)**: `materieel → materialen`, `techniek → technieken`, `fabriek → fabrieken`, `automatisch → automatisme`. User moet zulke plural-vormen handmatig in wordsWeAvoid invoeren als die actively unwanted zijn.

**Smoke-test** `heuristic-stem-variants.ts` 25/25 pass: 5 suffix-rules + edge cases (multi-word skip, korte input, empty=`[]`, whitespace, dedup).

**Finalize review-loop** — 4 iteraties tot Reviewer A clean (Reviewer B's WARNINGs blijven doc-clarity-claims op already-verified behavior):
- Round 1: 2 CRITICAL (`-isch + 'isme'` non-words; default-pad "luxee/kwaliteite") + 5 WARNINGs
- Round 2: 0 CRITICAL + 3 trade-off-WARNINGs gefixt naar conservatief
- Round 3: 5 WARNINGs over gemiste legitime plurals → resolved via uitgebreide JSDoc trade-off-block
- Round 4: Reviewer A clean ✓

**Quality gates**: tsc 0 errors, lint 0 errors, smoke 25/25 pass.

**LINFI productie-side-effect bevestigd**: na resync 14 → 44 wordsWeAvoid BrandRules. Heuristics blijven echter 0 violations: LINFI's `Workspace.contentLanguage='en'` → EN-GB pack i.p.v. NL-NL. **Separate user-action vereist** in workspace settings om naar 'nl' te switchen voor NL-NL heuristic-pack activatie.

**Out-of-scope** (gedocumenteerd in task-Notes): locale-guard op helper (NL-only morfologie), dubbele findings risk heuristic+BrandRule, BrandRule.category schema-field voor eenduidige FORBIDDEN_WORD-categorisatie, multi-locale heuristic-pack expansion (en-GB / nl-BE / de-DE), lemmatizer-library voor preciezere morfologie, deploy-time backfill-cron voor bestaande workspaces.

- Task: [tasks/done/fval-rules-pillar-audit.md](../tasks/done/fval-rules-pillar-audit.md)
- ADR: -
- Spec: -
- Commit: `accd88c` (initial implementation) + `82eca9c` (4-round hardening)

### 251. Brand Assistant page-wiring — Step1Context + PersonaDetail + BrandAssetDetail

Sluit BCP Phase 2 Phase 0.2.A vervolg-cluster af. Foundation (`useFormFillStore` + `fill_form_fields` tool + system-prompt surfacing + MutationConfirmCard handler) was 2026-05-08 gemerged maar geen enkele page registreerde nog velden — AI zag overal `formFillFields = []`. Resultaat na deze entry: Brand Assistant kan op de 3 hoogvolume-pages "vul X met Y" begrijpen, confirm-card tonen, en het veld via de bestaande mutation-paden persisteren.

**Geleverd** (`f4ee9ac` scaffold pad reused; eigen commit volgt):

- `src/features/campaigns/components/canvas/accordion/Step1Context.tsx` (modify) — `useEffect` registreert `objective` / `keyMessage` / `toneDirection` / `callToAction` + content-type-specifieke velden bij `useFormFillStore`. Setters routen direct via bestaande `useCanvasStore.setBriefField` + `setContentTypeInput` (geen refactor). `formatCurrentValue` helper voor string/array/boolean preview.
- `src/features/personas/components/detail/PersonaDetailPage.tsx` (modify) — page-level adapter expose 23 velden (13 strings + 10 string-arrays). Batched-mutate via `queueMicrotask` + ref accumulator: N synchrone setter-calls in `fill_form_fields.applyFill` loop worden in 1 `updatePersona.mutate(...)` gemerged ipv N parallelle PATCH-calls. `null → ''` coercion voor non-nullable string-fields (PATCH-schema accepteert null niet); null behouden voor nullable `quote` / `bio` zodat "clear" semantisch correct landt. Locked = geen velden exposeren.
- `src/features/brand-asset-detail/components/BrandAssetDetailPage.tsx` (modify) — polymorphic frameworkData adapter exposeert top-level keys ongeacht frameworkType (BRAND_ESSENCE / PURPOSE_WHEEL / etc.). Server-side shallow merge in `/api/brand-assets/[id]/framework` PATCH route betekent dat we alleen gewijzigde keys hoeven te sturen — elimineert stale-baseData race wanneer meerdere fills snel achter elkaar gebeuren. `humanizeKey` voor labels, `formatFrameworkPreview` voor previews (string/number/array → tekst, object → `<N fields>` hint).

**Trade-offs gedocumenteerd**:
- Geen bracket-notatie support in v1 — AI moet hele nested objecten/arrays meesturen wanneer het sub-keys wil wijzigen. Server merget shallow op top-level, dus partiële nested objecten verliezen niet-genoemde sub-keys. Acceptabel omdat de AI de structuur sowieso moet kennen voor consistente updates.
- Step1Context heeft geen lock-state check — content briefs zijn niet locked in huidige model. Persona/Asset wel.
- Browser-smoke (5 stappen Step1/Persona/Asset/Δ-1 compat/edge-case) uitgesteld naar pre-launch sprint #4 batch — consistent met de pre-launch-smoke-batch deferral (zie eerdere entry). Code passes tsc + lint clean, 2 review-rondes 0 CRITICAL.

**Δ-1 compat (uit done task acceptance-criteria)**:
- `pageContext.sectionPath` voor Canvas Step 4 — sinds Surface D shipped impliciet voldaan
- `inspect_current_entity` op Canvas Step 4 — Surface D gebruikt eigen `review_content` tool, niet inspect; criterium achterhaald
- Read-tool chat-card pattern — `BrandReviewResultCard` werkt via Surface D-pattern; geen nieuwe verificatie nodig

**Finalize review-loop** — 2 iteraties (clean op round 2):
- Round 1: 1 CRITICAL gefixt (BrandAssetDetailPage stale-baseData race; server merge betekent geen full-frameworkData spread nodig), 1 WARNING gefixt (PersonaDetailPage string null-coercion via `nullable` flag per veld)
- Round 2: Reviewer A clean, Reviewer B residual WARNINGs zijn "Pattern is safe, no action" — geen actionable changes

**Files modified**:
- `src/features/campaigns/components/canvas/accordion/Step1Context.tsx`
- `src/features/personas/components/detail/PersonaDetailPage.tsx`
- `src/features/brand-asset-detail/components/BrandAssetDetailPage.tsx`

**Documenten**:
- Task: [tasks/done/claw-page-awareness-vervolg.md](tasks/done/claw-page-awareness-vervolg.md)
- Parent task: [tasks/done/claw-page-awareness.md](tasks/done/claw-page-awareness.md) — Phase 0.2.A foundation

- Task: [tasks/done/claw-page-awareness-vervolg.md](tasks/done/claw-page-awareness-vervolg.md)
- ADR: -
- Spec: -
- Commit: `9240030`

### 250. BrandVoiceguide.contentLocale picker UI (Voice DNA tab)

Follow-up uit #249 deferred-list. Gaf user geen UI om `BrandVoiceguide.contentLocale` te overriden — voorheen alleen DB-script via backfill. Pilot start binnenkort en multi-locale brands (nl-BE, multi-merk agencies) hadden geen pad om handmatig te corrigeren wanneer auto-detect verkeerd zit of bewust afwijkende keuze nodig is.

**Geleverd** (scaffold `f4ee9ac` + finalize-iteratie):

- `src/app/api/i18n/detect-suggested-locale/route.ts` (nieuw) — GET endpoint wrapper rond `detectBrandLanguage(workspaceId)` PLUS `resolveLocaleForBrandWithSource(workspaceId)`. Twee onafhankelijke try/catch-blokken zodat een failure in detectie de active-locale niet onbruikbaar maakt (en omgekeerd). Auth-resolutie heeft eigen catch.
- `src/hooks/useSuggestedLocale.ts` (nieuw) — TanStack hook met `staleTime: Infinity` + workspaceId-scoped queryKey; types via canonical `Locale` + `LocaleSource` re-export uit locale-resolver.
- `src/lib/brand-fidelity/heuristics/locale-resolver.ts` — toegevoegd `resolveLocaleForBrandWithSource` (parallel queries, voor UI-indicator) naast bestaande `resolveLocaleForBrand` (hot-path, sequentieel met short-circuit). Exports `SUPPORTED_LOCALES`, `DEFAULT_LOCALE_BY_LANG`, `LocaleSource` als single source of truth.
- `src/app/api/brandvoiceguide/route.ts` — updateSchema accepteert `contentLocale: z.enum(SUPPORTED_LOCALES).nullable().optional()`. Import direct uit locale-resolver (geen lokale duplicatie).
- `src/features/brandvoice/components/sections/VoiceDnaSection.tsx` — Content-locale card met: "Currently active" pill (laat zien wat F-VAL gebruikt + source-label: voiceguide override / workspace default / fallback), aparte unsaved-cue, BCP-47 dropdown (4 locales), informatieve auto-detected regel met confidence-badge. `aria-label` op select.
- `src/features/brandvoice/hooks/index.ts` — `useUpdateVoiceguide` invalidates `['suggested-locale', workspaceId]` zodat de "Currently active" pill refresht na save.
- `scripts/smoke-tests/locale-picker-api.ts` (nieuw) — DB-laag + HTTP-laag tests met try/finally cleanup (restoreert LINFI's originele contentLocale ook bij mid-run crash).

**UX-iteratie** (gedreven door pilot-user testronde):
- Initiele "Use suggested" knop verwarrend (gebruiker dacht het was een bevestig-knop voor dropdown-keuze) → knop verwijderd, auto-detected blijft alleen als info-regel
- Geen indicatie welke locale F-VAL daadwerkelijk gebruikt → "Currently active" pill toegevoegd (los van unsaved dropdown-state)
- Save-actie refreshte niet de active-locale → cache-invalidation toegevoegd aan voiceguide-mutation

**Finalize review-loop** — 5 iteraties (hard limit; round 5 reviewer A clean, B 2 defensive WARNINGs over documented v1 trade-offs):
- Round 1: 2 CRITICAL gefixt (`DEFAULT_LOCALE_BY_LANG` + `SUPPORTED_LOCALE_VALUES` duplicaten — imports uit canonical resolver)
- Round 2: catch-block fabriceerde gefakede en-GB activeLocale (corrupted UI-truth) → returnt null bij resolver-fail; `<select>` aria-label toegevoegd; `key={contentLocale}` weggehaald (niet langer nodig na verwijderen "Use suggested"); non-null `!` weg
- Round 3: Zod-enum readonly-tuple fix; smoke-test in try/finally; workspaceId in invalidation
- Round 4: hot-path `resolveLocaleForBrand` terug naar sequential short-circuit (perf-regressie vermeden door behoud van parallel-variant alleen in WithSource); invalidation skipt expliciet als workspaceId falsy
- Round 5: clean op A, B's residuals zijn documented v1 limitaties (staleTime+detection-refresh)

**Whitelist consistency** nu via één bron: `SUPPORTED_LOCALES` in locale-resolver wordt gebruikt door Zod-enum (route), TS-type (`Locale`), en LOCALE_OPTIONS-codes (UI). `LocaleSource` type idem voor activeSource.

**Documenten**:
- Task `tasks/done/brandvoiceguide-locale-picker.md`
- ADR (referentie): `docs/adr/2026-05-08-locale-routing-brand-voice.md`, `docs/adr/2026-05-10-brand-language-auto-detect.md`

- Task: [tasks/done/brandvoiceguide-locale-picker.md](tasks/done/brandvoiceguide-locale-picker.md)
- ADR: -
- Spec: -
- Commits: scaffold `f4ee9ac`, finalize `0538a8d`

### 249. Brand-language auto-detect + backfill + runtime mismatch-guard

F-VAL rules-audit van vandaag onthulde dat 5 van 15 workspaces (incl. LINFI) verkeerd geconfigureerde `Workspace.contentLanguage` hadden — content was duidelijk NL maar veld stond op default 'en'. Resultaat: F-VAL Pijler 3 gebruikte EN-GB heuristic-pack ipv NL-NL, canvas-orchestrator injecteerde "Write in English" in elke generate-prompt. Auto-detect mechanism corrigeert alle workspaces tegelijk plus runtime-guard maakt toekomstige mismatches zichtbaar zonder user-flow te onderbreken.

**Geleverd** (initial `e5d2818`, ~950 regels):

- `franc-min` v6.2.0 dependency (42KB pure-JS, geen native bindings, ISO 639-3 trigram-detectie, 150+ talen)
- `src/lib/i18n/detect-brand-language.ts` (nieuw) — `detectBrandLanguage(workspaceId)` consolideert voiceguide.voiceDescription + writingSamples + brandAssets via flatten-helper (depth-cap 10 + WeakSet voor circular safety), runt franc, mapt naar 3 ondersteunde locales (nl-NL / en-GB / de-DE — FR detecteert maar mapt naar null tot heuristic-pack bestaat). Confidence-thresholds: `high` ≥2 sources én ≥300 chars; `medium` ≥1 source én ≥150 chars; `low` anders.
- `logBrandLanguageMismatchIfAny()` fire-and-forget runtime-guard met optimistic cache-set vóór await (concurrent-call dedup), MAX_CACHE_SIZE=500 + drop-oldest eviction, cache-clear in catch-branch (geen 5-min stilte na transient DB-error)
- `scripts/backfill-brand-language.ts` (nieuw) — workspace-iteratie audit/apply met productie-guard, `--apply` flag, `--workspace-slug` filter, idempotent. Workspaces zonder voiceguide-row krijgen alleen workspace.contentLanguage correctie (voiceguide.contentLocale blijft NULL). Action-enum: `update-ws` / `update-locale` / `update-both` / `skip-match` / `skip-no-signal` / `skip-low-conf` / `skip-medium-conf`.
- `src/lib/ai/canvas-orchestrator.ts` — fire-and-forget mismatch-guard call vóór BVD-build, try/catch defense-in-depth
- `scripts/smoke-tests/brand-language-detect.ts` — 11 fixture-tests (NL/EN/DE/FR/mixed/short/empty/code-blob)
- `docs/adr/2026-05-10-brand-language-auto-detect.md` — precedence-policy (voiceguide.contentLocale → workspace.contentLanguage → detection → en-GB), confidence-thresholds, override-policy (auto-detect is NIET runtime-override; backfill-tool + warn-log only), franc-min library-rationale vs alternatives

**Productie-data effect** na `--apply` op alle workspaces:
- 4 NL-correcties: linfi, better-brands, wra-juristen, goed-bouw (en → nl)
- 1 inverse: napking (nl → en, content was EN)
- 9 voiceguide.contentLocale fills waar voiceguide-row bestond
- 2 skipped voor no-signal: wassink-groep, techcorp-brand (geen tekstuele content)
- Verified idempotent: 2e run is no-op

**Finalize review-loop** — 4 iteraties (Reviewer A clean op iter 3; iter-4 WARNINGs zijn cache-race-nuances van bewust gedocumenteerd ontwerp):
- Round 1: 3 CRITICAL gefixt (FR-mapping drop, `!= null` undefined fix, francScore drop), 4 WARNINGs
- Round 2: action-enum `skip-medium-conf` toegevoegd, orderBy take:20 brandAssets, depth-cap + WeakSet, MAX_CACHE_SIZE 500, try/catch orchestrator
- Round 3: cache-clear in catch-branch, smoke FR-test comment expliciet, summary toont medium-conf count
- Round 4: 0 CRITICAL, 3 WARNINGs allemaal acceptable trade-offs rondom optimistic-cache-set design

**Quality gates**: tsc 0 errors, lint 0 errors, smoke 11/11 pass, backfill verified idempotent.

**Out-of-scope** (gedocumenteerd in task-Notes): helper-level unit tests (smoke draait franc-lib direct, helper integration is via backfill --apply live), franc-min margin gating, telemetry hook bij detection-failure, ES/PT/IT detection (geen heuristic-packs; UI accepteert wel manual-set), LRU eviction ipv insertion-order, BrandVoiceguide.contentLocale picker UI (separate task), auto-detect bij workspace-creation (chicken-and-egg met onboarding), multi-locale workspace support (post-launch).

- Task: [tasks/done/brand-language-auto-detect.md](../tasks/done/brand-language-auto-detect.md)
- ADR: [adr/2026-05-10-brand-language-auto-detect.md](adr/2026-05-10-brand-language-auto-detect.md)
- Spec: -
- Commit: `e5d2818` (initial implementation) + `021f262` (4-round hardening)
