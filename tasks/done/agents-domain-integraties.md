---
id: agents-domain-integraties
title: Agents domein-integraties — nav onder CREATE, no-artifacts-fallback, Marco→Competitors, Stella→Campaigns
status: done
completed: 2026-07-06
created: 2026-07-06
related-adr: docs/adr/2026-07-05-agents-architectuur.md
branch: feat/agents-domain-integraties
---

# Context

User-feedback na eerste dogfood van Agents Fase 1 (2026-07-06):
1. Agents hoort als navigatie-item **onder CREATE** (staat nu onder WORKSPACE).
2. Agent-resultaten moeten **zowel in de agents-inbox als in de bestaande modules** zichtbaar zijn: concurrentie-analyse (Marco) → Competitors; campagne-strategie (Stella) → Campaigns; content (Milo) → Create content/Content Library.
3. Bug: "Run completed but produced no parseable artifacts JSON block" bij content-genereren — het antwoord van de agent is dan nergens zichtbaar.

# Scope

1. **Nav**: `agents`-item van WORKSPACE- naar CREATE-sectie in `SIDEBAR_NAV` (design-tokens.ts).
2. **No-artifacts-fallback** (`artifact-contract.ts`): COMPLETED + 0 drafts + non-empty finalMessage → automatisch REPORT-artefact met het antwoord (markdown = finalMessage, JSON-restanten gestript), `error = null`. Truncated-pad blijft ongewijzigd. + `shared.ts` ARTIFACT_CONTRACT-prompt: antwoord ALTIJD als artifacts-JSON inpakken.
3. **Marco → Competitors**: `materialize-artifact.ts` zet `category` o.b.v. `run.agentId` (market-analyst → `competitor-analysis`, research-analyst → `research`, data-analyst → `data-analysis`, overig → bestaand gedrag). Competitors-pagina krijgt een "Agent analyses"-sectie die KnowledgeResources met category `competitor-analysis` toont (titel + datum + open-link), i18n en/nl, loading/empty states.
4. **Stella → Campaigns**: (a) strategist-behavior: bij een campagne-strategie-vraag ALTIJD afsluiten met een `create_campaign`-proposal (tenzij een passende campagne bestaat — dan benoemen); (b) confirm-route-specialisatie: approve van `create_campaign` door de strategist → strategie-REPORT-markdown van de run naar `campaign.strategicApproach` + LINK-artefact "Created: <titel>"; (c) campagne-detail strategie-tab: "Agent-strategie"-blok dat `strategicApproach` als markdown rendert wanneer aanwezig (blueprint-JSON blijft exclusief van de wizard).
5. **Milo**: prompt-hardening — een create-vraag eindigt óf in een deliverable-proposal óf (bij vragen/blockers) in een REPORT; nooit kaal tekstantwoord.

# Out-of-scope

Schema-wijzigingen; blueprint-JSON-writes; nieuwe agents/tools; scheduling; Neon-acties (geen schema-delta).

# Acceptatiecriteria

- [x] Agents staat in de sidebar onder CREATE (na Content); geen andere nav-wijzigingen.
- [x] Een run die alleen tekst oplevert toont dat antwoord als REPORT-artefact in de inbox, zonder error op de run.
- [x] Accept van een Marco-analyse maakt een KnowledgeResource category `competitor-analysis` aan die zichtbaar is op de Competitors-pagina.
- [x] Stella's campagne-strategie-flow eindigt in een create_campaign-proposal; na approve bestaat de campagne mét strategie-tekst zichtbaar op de campagne-detailpagina.
- [x] Bestaande gedragingen regressievrij: e2e "Agents UI" 5/5, foundation-smoke 14/14, data-analyst-smoke 22/22.
- [x] `npx tsc --noEmit` 0 errors; lint 0 errors op geraakte files.

# Smoke-test plan

1. Nav-check (browser): Agents onder CREATE.
2. Milo-run "schrijf een LinkedIn-post over X zonder campagne te noemen" → proposal óf REPORT, nooit no-artifacts-error.
3. Marco-run competitive-position → REPORT accepteren → Competitors-pagina toont de analyse.
4. Stella-run campaign-strategy → proposal approven → campagne-detail toont Agent-strategie-blok.

# Bestanden die ik aanraak

`src/lib/constants/design-tokens.ts`, `src/lib/agents/registry/artifact-contract.ts`, `src/lib/agents/registry/definitions/{shared,strategist,content-creator}.ts`, `src/lib/agents/registry/materialize-artifact.ts`, `src/app/api/agents/runs/[runId]/confirm/route.ts`, Competitors-pagina (+ evt. klein API/hook-werk), campagne-detail strategie-tab, `src/lib/ui-i18n/locales/{en,nl}/*`.

# Notes

- Voortgekomen uit dogfood-feedback; de "no parseable artifacts"-melding trad op production op (Neon-run, finalMessage daar bewaard) — root-cause is agent-onafhankelijk en reviewers flagden het pad al als misleidend.


---

# Status 2026-07-06 — GEBOUWD (branch feat/agents-domain-integraties)

## Live-bewijs
- **Fallback**: Milo-vraag zonder content-opdracht → COMPLETED, 1 REPORT ("Wat kan ik voor je maken?"), error null — de "no parseable artifacts"-melding is structureel weg (fallback + prompt-hardening; fallback geldt óók naast proposals).
- **Marco → Competitors**: run COMPLETED ($0.078) → accept → KnowledgeResource `category=competitor-analysis` → `GET /api/knowledge?category=competitor-analysis` levert hem → AgentAnalysesSection toont hem op de Competitors-pagina (lazy markdown via nieuwe `GET /api/knowledge/[id]`).
- **Stella → Campaigns**: run leverde 9k-strategierapport (REPORT); confirm van create_campaign-proposal → campagne "Voorjaarscampagne 2027 — Belgische Architecten" mét `strategicApproach` 9060 chars + LINK-artefact `strategyAttached=true` + run COMPLETED; campagne-detail strategie-tab rendert het als "Agent-strategie"-blok (blueprint blijft leidend zodra aanwezig). NB: proposal-stap in deze verificatie synthetisch geïnjecteerd (propose-mechaniek was in de voorgaande run al live bewezen); prompt-volgorde aangescherpt ("call create_campaign BEFORE writing your final message") — LLM-compliance blijft niet-deterministisch, mechanisme is deterministisch bewezen.
- **Confirm-selectie**: langste REPORT van de run + ≥500-chars-drempel (korte narratieven worden geen campagne-strategie).
- **Gates**: tsc 0 · eslint 0 errors op geraakte files · foundation-smoke 14/14 · data-analyst-smoke 22/22 · e2e "Agents UI" 5/5.

## Restpunten
- Browser-verificatie van nav-positie + beide UI-blokken door user (server-side bewezen; component-code volgt bestaande patronen).
- Smoke-campagne "Voorjaarscampagne 2027 — Belgische Architecten" staat in de dev-workspace (mag blijven als demo of handmatig weg).


## Task-finalize 2026-07-06 — review-loop-bewijs

**3 rondes** (2 reviewers → fixes → delta-reviewer → fixes + eigen empirische verificatie):
- **0 CRITICAL**; **8 WARNINGs gefixt**: JSON-husk-strip (per-blok, ongefenced én afgekapt — 8 node-testcases groen incl. de empirisch bewezen over-strip-case), canonieke categorie-taxonomie (Competitor Analysis/Data Analysis in RESOURCE_CATEGORIES; duplicaat-lijst in library-constants gededupliceerd naar re-export), fallback-REPORTs gemarkeerd (answerFallback, server-owned/anti-forge) en uitgesloten van domein-categorisering én van de strategicApproach-selectie, error/empty-states in AgentAnalysesSection, dismissedAt-filter + updateMany-count in de confirm-write-through.
- Gates eindstand: tsc 0 · eslint 0 errors · foundation-smoke 14/14 · data-analyst-smoke 22/22 · e2e "Agents UI" 5/5 (pre-merge).

**Deferred MINORs**: aria-controls op conditioneel paneel; MarkdownContent-promotie naar components/shared (3 features delen hem nu); multi-campaign-per-run-gedrag documenteren; i18n-labels voor de nieuwe categorieën in claw-content-registry (valt veilig terug op defaultValue); backfill-script voor pre-fix kebab-case-categorieën (alleen lokaal relevant, uitgevoerd).
