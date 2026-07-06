---
id: agents-ui-inbox
title: Agents UI — sidebar-sectie + catalogus + agent-detail (use-cases + Claw-panel-chat) + results-inbox met F-VAL- en confirm-weergave
fase: pre-launch
priority: now
effort: 5-7 dagen
owner: claude-code
status: open
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

- [ ] Given een workspace met volledig merk-DNA, When de user de Agents-sectie opent, Then ziet hij een catalogus van benoemde persona-agents met rolduiding en klikbare use-cases (loading + error + empty states aanwezig).
- [ ] Given de Research Analyst-detailpagina, When de user een use-case-knop klikt en een onderwerp opgeeft, Then start een `AgentRun` met zichtbare voortgangsstatus (polling op `GET /api/agents/runs/[runId]`) en landt het rapport-artefact in de results-inbox.
- [ ] Given een `FINDINGS`-artefact, Then toont de inbox F-VAL-score + findings prominent (hergebruik/patroon `ReviewFindingsCard`); een gevlagde lage score is visueel onderscheiden — nooit stil.
- [ ] Given een run in `AWAITING_CONFIRMATION`, When de user het `PROPOSAL`-artefact opent, Then verschijnt de confirm-weergave (description + before/after-changes) met goedkeuren/afwijzen; goedkeuren voert de mutatie uit en werkt de run-status bij, afwijzen laat de DB onaangeroerd.
- [ ] Chat op agent-detail draait via de Claw panel-mode met agent-scoping (agent-persona in het system-prompt); de bestaande globale Claw-overlay blijft ongewijzigd werken; de UI-copy maakt het onderscheid Claw (assistent) vs Agents (taken → resultaten) expliciet.
- [ ] Failed runs tonen status "failed" met begrijpelijke foutmelding in de inbox; artefact-accept/dismiss vuurt `agent_output_accepted` en invalideert de agents-cache.
- [ ] Tailwind-4-purge-check gedaan op alle nieuwe utility-classes (ontbrekend → append in `src/index.css`, `bg-primary`, of inline style conform CLAUDE.md).
- [ ] Playwright browser-smoke voor de confirm- en modal-flows (gotcha 2026-06-17: state-/modal-bugs zijn alléén met browser-smoke te vangen).
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd
- [ ] Documentatie bijgewerkt indien van toepassing

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
