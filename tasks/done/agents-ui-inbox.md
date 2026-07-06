---
id: agents-ui-inbox
title: Agents UI — sidebar-sectie + catalogus + agent-detail (use-cases + Claw-panel-chat) + results-inbox met F-VAL- en confirm-weergave
fase: pre-launch
priority: now
effort: 5-7 dagen
owner: claude-code
status: done
completed: 2026-07-06
created: 2026-07-05
completed: -
related-adr: docs/adr/2026-07-05-agents-architectuur.md
related-spec: tasks/_drafts/idea-agents-feature.md
worktree: branddock-feat-agents-feature
---

# Probleem

De agents bestaan na `agents-foundation`/`agents-motor-wiring` alleen als API. De kern van de feature — de taakgerichte "geef opdracht, keur resultaat goed"-ingang — is UI: een catalogus van benoemde persona-agents, een agent-detail met use-case-knoppen en chat, en één results-inbox waar runs, artefacten, F-VAL-scores en confirm-voorstellen landen. Zonder deze surface blijft Branddock-capaciteit achter navigatie-drempels verstopt (het discovery-probleem uit het idea-doc).

# Voorstel

Nieuwe top-level sectie via het ingesleten patroon: `SIDEBAR_NAV`-entry (Lucide `Bot`-icon o.i.d.) + App.tsx-cases (`agents`, `agent-detail`, `agents-inbox`) + `src/features/agents/` met `PageShell`/`PageHeader`. Catalogus rendert `listAgents()` uit de code-registry (persona-kaarten: naam, rol, use-cases; expliciete afbakenings-copy Claw ↔ Agents per ADR D6). Agent-detail: use-case-knoppen → input-formulier → `POST /api/agents/run` met run-status-polling; chat via de bestáánde Claw panel-mode (`useClawStore.viewMode='panel'` + `ClawOverlay`) uitgebreid met per-agent scoping (optioneel `agentId` in het chat-request → `assembleSystemPrompt` injecteert de agent-persona). Results-inbox: runs-lijst + artefact-detail (REPORT markdown-render, FINDINGS met F-VAL-score, LINK-navigatie, PROPOSAL met confirm/afwijs via `MutationConfirmCard`-hergebruik). Loading + error states overal.

# Acceptatiecriteria

- [x] Given een workspace met volledig merk-DNA, When de user de Agents-sectie opent, Then ziet hij een catalogus van benoemde persona-agents met rolduiding en klikbare use-cases (loading + error + empty states aanwezig). *(UI-kant aantoonbaar: empty-state op lege registry + kaarten/detail via gemockte catalogus-response; e2e met de 5 échte motor-agents open tot motor-wiring merged.)*
- [x] Given de Research Analyst-detailpagina, When de user een use-case-knop klikt en een onderwerp opgeeft, Then start een `AgentRun` met zichtbare voortgangsstatus (polling op `GET /api/agents/runs/[runId]`) en landt het rapport-artefact in de results-inbox. *(Aantoonbaar met echo-test-agent: use-case → run → result-card → inbox-focus met gerenderd REPORT; Research Analyst zelf volgt uit motor-wiring.)*
- [x] Given een `FINDINGS`-artefact, Then toont de inbox F-VAL-score + findings prominent (hergebruik/patroon `ReviewFindingsCard`); een gevlagde lage score is visueel onderscheiden — nooit stil. *(Renderer gebouwd + defensief geparsed; nog niet met een échte F-VAL-payload gedraaid — fval-gate komt uit motor-wiring.)*
- [x] Given een run in `AWAITING_CONFIRMATION`, When de user het `PROPOSAL`-artefact opent, Then verschijnt de confirm-weergave (description + before/after-changes) met goedkeuren/afwijzen; goedkeuren voert de mutatie uit en werkt de run-status bij, afwijzen laat de DB onaangeroerd. *(UI + confirm-request `POST /api/agents/runs/[runId]/confirm {artifactId, approved}` conform contract-afspraak 2026-07-06; e2e-gemockt groen — de route zelf is motor-wiring-ownership en bestond nog niet op deze branch.)*
- [x] Chat op agent-detail draait via de Claw panel-mode met agent-scoping (agent-persona in het system-prompt); de bestaande globale Claw-overlay blijft ongewijzigd werken; de UI-copy maakt het onderscheid Claw (assistent) vs Agents (taken → resultaten) expliciet. *(Live geverifieerd: scoped chat antwoordde "I am Echo, the Test Agent"; globale overlay daarna ongescoped.)*
- [x] Failed runs tonen status "failed" met begrijpelijke foutmelding in de inbox; artefact-accept/dismiss vuurt `agent_output_accepted` en invalideert de agents-cache. *(Event + server-invalidatie zitten in de foundation-PATCH-route; UI-kant accept/dismiss + client-invalidatie live geverifieerd.)*
- [x] Tailwind-4-purge-check gedaan op alle nieuwe utility-classes (ontbrekend → append in `src/index.css`, `bg-primary`, of inline style conform CLAUDE.md). *(3 swaps naar bestaande klassen + fallback-blok onderaan `src/index.css`.)*
- [x] Playwright browser-smoke voor de confirm- en modal-flows (gotcha 2026-06-17: state-/modal-bugs zijn alléén met browser-smoke te vangen). *(`e2e/tests/agents/agents-smoke.spec.ts` — 5/5 groen incl. proposal-approve → kaart weg; plus 13 live browser-checks op poort 3003.)*
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` 0 errors
- [x] Smoke-test uitgevoerd
- [ ] Documentatie bijgewerkt indien van toepassing *(volgt bij task-finalize / na merge met motor-wiring)*

# Bestanden die ik aanraak

- `src/lib/constants/design-tokens.ts` — `SIDEBAR_NAV`: Agents-entry (sectie WORKSPACE of CREATE; Lucide-icon, geen emoji) (regels: ~5, risico: laag)
- `src/App.tsx` — cases `agents` / `agent-detail` / `agents-inbox` in `renderContent()` (regels: ~15, risico: laag)
- `src/features/agents/` (nieuw): `AgentsCatalogPage.tsx`, `AgentDetailPage.tsx`, `AgentsInboxPage.tsx`, `components/AgentCard.tsx`, `components/UseCaseForm.tsx`, `components/RunStatusBadge.tsx`, `components/ArtifactViewer.tsx` (report/markdown + findings + link + proposal), `components/ProposalConfirmCard.tsx` (hergebruik-patroon `MutationConfirmCard`), `lib/agents.api.ts` (fetch-laag + polling-hook)
- `src/stores/useClawStore.ts` — optionele `agentScope` (agentId) op open/panel-state (regels: ~10, risico: medium — regressie-gevoelig voor bestaande overlay)
- `src/features/claw/components/ClawOverlay.tsx` — agent-scope doorsluizen naar het chat-request (regels: ~10-20, risico: medium)
- `src/app/api/claw/chat/route.ts` + `src/lib/claw/context-assembler.ts` — optioneel `agentId` in requestSchema → persona-sectie in `assembleSystemPrompt` (regels: ~20-30, risico: medium — nullish default = huidig gedrag)
- `e2e/tests/agents/` (nieuw) — browser-smoke catalogus → run → inbox → confirm

# Bestanden die ik NIET aanraak

- `src/lib/brandclaw/orchestrator/**`, `src/lib/agents/registry/**` behalve read (`listAgents`) — motor + definities zijn foundation/motor-wiring-ownership.
- `prisma/schema.prisma` — geen schema-wijzigingen in deze taak.
- `src/features/claw/components/MutationConfirmCard.tsx` — patroon hergebruiken; alleen aanpassen als props-generalisatie <10 regels blijft, anders eigen component.
- Bestaande Claw-tools en confirm-route.

# Smoke test plan

1. Browser: sidebar toont "Agents" → catalogus rendert alle geregistreerde agents met persona + use-cases; lege registry → nette empty state.
2. Research Analyst → use-case-knop → onderwerp invullen → run start, statusbadge RUNNING → COMPLETED; inbox toont rapport, markdown gerenderd, citaties klikbaar.
3. Content Creator → run → `AWAITING_CONFIRMATION`-kaart; Playwright-assert: na "Approve" is de confirm-overlay wég (double-toggle-gotcha), deliverable bestaat, F-VAL-score zichtbaar; na "Dismiss" in tweede run: geen deliverable.
4. Error-state: run-API 500 (dev-forceren) → inline foutmelding + retry, geen witte pagina; failed run in inbox met leesbare fout.
5. Chat-panel op agent-detail: vraag stellen → antwoord in agent-persona; daarna globale Claw-overlay openen → gedraagt zich als vanouds (geen agent-scope-lek).
6. Workspace-switch → catalogus blijft (registry is code), maar runs/inbox tonen uitsluitend de actieve workspace.

# Risico's

- **Claw-store/overlay-regressie** (waarschijnlijkheid: middel): `useClawStore` wordt overal gebruikt; agent-scope moet strikt additief-optioneel zijn. Mitigatie: default-pad byte-identiek + regressie-smoke op de globale overlay.
- **Polling-belasting**: naive 1s-polling per open run → interval ≥3s, stop bij terminal status, TanStack Query met `refetchInterval`-conditie.
- Tailwind-4-purge: nieuwe classes in constants/TS-strings worden gepurged (memory-gotcha) → shared `<Button>`/`bg-primary` en purge-check in de criteria.
- Twee-AI-ingangen-verwarring (aanname A6) → afbakenings-copy is een acceptatiecriterium, geen nice-to-have; pilot-observatie volgt.

# Out of scope

- `TABLE`-artefact-renderer → `agents-data-analyst` (bewust daar, zodat de drop-kandidaat zijn eigen render meeneemt).
- Scheduling-UI ("elke maandag"), notificaties → `agents-scheduling` (Fase 2).
- Definitieve persona-illustraties — Lucide-icon-placeholder volstaat voor MVP; illustraties zijn design-polish.
- Volledige "chat met agent X"-merge in de globale overlay (agent-picker in Claw zelf) — ADR D6 stelt dit expliciet uit.
- Mobile/PWA-optimalisatie — desktop-first.

# Notes

- **Phase -1 gates**: Simplicity — 1 nieuwe feature-dir + 1 e2e-dir; UI-primitives (`PageShell`, `PageHeader`, shared `Button`, Lucide) hergebruikt, geen nieuw design-systeem. Anti-Abstraction — geen generieke "artifact-renderer-framework": één `ArtifactViewer` met een switch op 4 types (5e type komt in de data-analyst-taak erbij). Integration-First — bouwt uitsluitend op de API-contracten uit `agents-foundation`; wijziging aan die contracten = stop-and-ask richting foundation-task.
- Dependencies: **`agents-foundation` done** (API-contract); voor de end-to-end-smoke is **≥1 agent uit `agents-motor-wiring`** nodig (Research Analyst of Brand Guardian volstaat) — UI-bouw kan eerder starten tegen de contract-shapes.
- File-ownership-conflictpunt met motor-wiring: geen — motor-wiring raakt `src/lib/`, deze taak `src/features/` + de 3 kleine Claw-scoping-edits.

## Aanvullende eisen (user-directive 2026-07-06, vastgelegd vanuit agents-foundation)

- **Artifact-deep-links (domain-first write-through)**: elk `LINK`-artefact (`content: {entityType, entityId, label?}`) rendert als klikbare navigatie naar de module-pagina van de entiteit (deliverable → Canvas, campaign → campagne-detail, knowledgeResource → Knowledge Library, competitor → competitor-detail, observationRun → Brand Alignment Tab 5). Gebruik de bestaande `activeSection`-navigatie (zelfde section-ids als Claw's `navigate_to_page`). Een geaccepteerd REPORT/TABLE-artefact toont de "opgeslagen in Knowledge Library"-referentie via `content.knowledgeResourceId` (gezet door `materializeArtifactOnAccept`).
- **i18next-eis (hard — CI-guard actief sinds i18n Fase 1-3 merge)**: álle nieuwe UI-strings via i18next met en/nl-keys; geen hardcoded copy. Server-errors uit de API blijven Engels (code-conventie) — de UI vertaalt status-labels (COMPLETED/FAILED/AWAITING_CONFIRMATION) zelf.
- **Run-response-contract** (foundation live per 2026-07-06): `POST /api/agents/run` → `{runId, status, artifactIds, totalCostUsd, latencyMs, truncated, error}`; een gefaalde run komt als **200 met status FAILED** terug (toon hem in de inbox met de error-string — geen error-toast-only). `GET /api/agents/runs` → `{runs: [...]}` (50, met artifacts-summary); detail → `{run}` incl. volledige artifacts. `PATCH /api/agents/artifacts/[id]` `{action}` → `{artifact, materialized}`.
- **Stale-RUNNING-weergave (review-finding 2026-07-06)**: een proces-crash/deploy mid-run kan een `AgentRun` eeuwig op `RUNNING` laten staan (reaper is Fase 2). De inbox moet dit aankunnen: toon runs met status RUNNING ouder dan ~15 min als "mogelijk vastgelopen" (client-side heuristiek op `createdAt`), niet als eeuwige spinner.

## Status 2026-07-06 (agents-ui-inbox — UI-taak, branch feat/agents-ui-inbox)

**Af (met bewijs):**
- Sidebar-sectie `agents` (WORKSPACE, Lucide Bot) + App.tsx-cases `agents`/`agent-detail`/`agents-inbox` (lazy-loaded) + redirect-guard.
- `src/features/agents/`: catalogus (empty/loading/error + D6-afbakenings-copy), agent-detail (persona-header, use-case-SelectionCards → UseCaseForm → run, recente runs, chat-knop), results-inbox (run-cards met status/kosten/duur, uitklap → volledige artefacten), ArtifactViewer (REPORT-markdown, FINDINGS met flag-banner + severity-chips, LINK-deep-links via `entity-navigation.ts`, PROPOSAL-confirm, TABLE-placeholder), accept/dismiss met Knowledge-Library-referentie, stale-RUNNING-heuristiek (>15 min → "mogelijk vastgelopen").
- Claw-scoping additief-optioneel: `useClawStore.agentScope`+`openClawForAgent`, InputBar stuurt `agentId`, chat-route `agentId` (Zod-optioneel) → persona-sectie in `assembleSystemPrompt` (plat object, geen registry-import in claw-lib). Default-pad byte-identiek; live geverifieerd dat de globale overlay ongescoped blijft.
- i18next: nieuwe namespace `agents` (en+nl), `navigation`-keys, `claw.overlay.agentBadge`; `src/features/agents/**/*.tsx` toegevoegd aan de eslint-i18n-guard-allowlist.
- Tailwind-4-purge: fallback-blok in `src/index.css` + 3 class-swaps.
- Bewijs: `npx tsc --noEmit` 0 errors; `npm run lint` 0 errors; `npm run test:e2e -- --grep "Agents UI"` 5/5 groen (E2E_DATABASE_URL met expliciete user); 13/13 live browser-checks op poort 3003 met echte echo-runs (run → inbox → markdown → accept/materialisatie → dismiss → failed-error → stale → scoped chat met persona-antwoord). Screenshots in sessie-scratchpad.

**Open / bewust doorgeschoven:**
- E2e/smoke met de échte 5 motor-agenten (Research Analyst e.a.) — wacht op merge van `agents-motor-wiring`; catalogus-fetch pint al op hun `GET /api/agents`-contract (404 → nette empty-state tot die merge).
- PROPOSAL-approve tegen de échte confirm-route (`/api/agents/runs/[runId]/confirm` — motor-wiring-ownership) en FINDINGS met échte F-VAL-payload: UI-kant staat, e2e-gemockt groen.
- `MODULE_META`-phase-label ("Phase 13") is placeholder; documentatie-vinkje volgt bij task-finalize.

### Review-round 2026-07-06 (2 onafhankelijke reviews → 0 CRITICAL, 5 WARNINGs gefixt)

Gefixt in follow-up-commit: (1) ProposalConfirmCard resolved-state uit server-truth (`acceptedAt`/`dismissedAt`) met optimistic layer + 409-"al afgehandeld"-afhandeling incl. refetch; (2) link-scheme-allowlist (http/https/mailto/relatief) in `MarkdownContent.parseInline`; (3) stream-abort-registry (`useClawStore.activeStreamAbort`, gezet door InputBar, aangeroepen bij scope-clear-paden — geen oud antwoord in verse conversatie, `isStreaming` hangt niet); (4) `setActiveConversation` cleart `agentScope` (+ expliciete comment dat `startNewConversation` de scope bewust behoudt); (5) `aria-expanded`/`aria-controls`+`id` op de run-card-toggle. MINORs meegefixt: change-key `field+index`, default-tak in RunResultCard-switch, `agentId: z.string().max(64)`.

**Deferred (bewust, coordinator-besluit):**
- Hidden-agent-guard in `claw/chat/route.ts` → post-merge via `getVisibleAgentDefinition` (helper leeft op motor-wiring-branch); TODO(merge)-comment staat op de lookup-plek.
- Deferred MINORs: 404→lege-catalogus-mapping expliciet TODO'en/opruimen na motor-wiring-merge; `['knowledge-resources']`-querykey-literal delen met knowledge-library-hooks; `openInLibrary`-i18n-key ongebruikt (savedToLibrary dubbelt als button-label); LINK-deep-link zonder entity-focus voor knowledge/content-library (navigeert naar de module, nog niet naar het item); `openClawForAgent` sluit de assistant-forms (bug/feature/feedback) niet expliciet.


---

# Task-finalize 2026-07-06 — review-loop-bewijs

**3 review-rondes** (2 onafhankelijke reviewers rondes 1-2, focused delta-reviewer ronde 3):
- **0 CRITICAL**; **6 WARNINGs gefixt**: ProposalConfirmCard server-truth (acceptedAt/dismissedAt + optimistic layer + 409→"al afgehandeld"-notice), link-scheme-allowlist in MarkdownContent incl. control-char-strip tegen tab-in-scheme-bypass (runtime-geverifieerd, WHATWG-superset), stream-abort bij scope-wissel (activeStreamAbort met identity-guarded cleanup), setActiveConversation cleart agentScope, aria-expanded/controls op run-card-toggle.
- Ronde 3 (delta): **clean** — 0 CRITICAL / 0 WARNING; strip bewezen fail-closed, gerenderde hrefs onaangetast.

**Gates**: tsc 0 · lint 0 · e2e "Agents UI" 5/5 · browser-regressie scope-leak 2/2 · 13/13 live browser-smoke (ronde 1).

**Bijvangst**: pre-existing `.z-20`-purge-bug (Claw history-popover onder eigen scrim, rows onklikbaar) gevonden + gefixt via index.css-fallback.

**Deferred MINORs** (bewust): hidden-agent-guard chat-route → post-merge-integratie (TODO(merge) staat op de lookup); 404→lege-catalogus-mapping opruimen post-merge; knowledge-resources-key-literal → resourceKeys.all; openInLibrary-key ongebruikt; LINK zonder item-focus voor knowledge/content-library; openClawForAgent sluit assistant-forms niet; domein-invalidatie na confirm o.b.v. toolName; campaign-filter zonder reset-pad; AgentIcon import * lucide; SEVERITY_STYLES uppercase-only; protocol-relatieve links doc-nit; aria-controls conditioneel id.
