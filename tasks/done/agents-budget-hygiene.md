---
id: agents-budget-hygiene
title: Dogfood-r2 open eindjes — angle-generator thinking-budget, strategist foundation-budget, worktree.sh --done
fase: pre-launch
priority: now
effort: 0,5 dag
owner: claude-code (autonoom, vervolg op agents-dogfood-ronde2)
status: done
created: 2026-07-12
completed: 2026-07-12
related-adr: 2026-07-05-agents-architectuur.md
related-spec: docs/reports/agents-dogfood-2026-07-12.md (bevindingen #2 en #3)
worktree: branddock-agents-budget-hygiene (branch fix/agents-budget-hygiene)
---

# Probleem

Dogfood-ronde 2 liet twee non-fatale maar echte defecten open plus één tooling-bugje:

1. **Angle-generator trunceert nog steeds** (bevinding #2): `generateCreativeAngles` draait op `gemini-2.5-flash`, dat standaard *dynamic thinking* aan heeft; de thinking-tokens tellen mee in `maxOutputTokens` (budget 1800, slechts 214 chars zichtbare output → MAX_TOKENS). De ronde-1-budgetverhoging loste daarom niets op. Elke canvas-generatie verliest zo z'n creative angles (fallback maskeert het).
2. **Strategist-foundation trunceert op 16k** (bevinding #3): `buildStrategyFoundation` (strategy-chain, `budgetWithThinking(16_000, …)`) kapte op fast-tier/Haiku af bij 57.606 chars → de tool faalt en de agent improviseert zónder fundering. `createClaudeStructuredCompletion` **streamt** al (geen SDK-21.333-plafond hier) en `budgetWithThinking` koppelt de timeout automatisch mee (gotcha 2026-05-24) — een outputbudget-verhoging is dus veilig.
3. **`worktree.sh --done <task-id>`** wordt in de eigen afscheidstekst beloofd maar was niet geïmplementeerd (behandelde `--done` als task-id).

# Geleverd

- `src/lib/ai/canvas-angle-generator.ts`: `thinking: { google: { thinkingBudget: 0 } }` (angles zijn "framing decisions, not deep reasoning" — thinking uit is by-design).
- `src/lib/campaigns/strategy-chain.ts`: foundation-outputbudget 16k → 24k (streamende wrapper, timeout schaalt mee via `budgetWithThinking`).
- `scripts/dev/worktree.sh`: `--done <task-id>` geïmplementeerd (worktree verwijderen + safe-delete gemergde branch, weigert dirty tree).
- Opruimwerk START_HERE item 1: 5 gemergde worktrees + lokale branches + remote `fix/agents-dogfood-ronde2` verwijderd.

# Acceptatiecriteria

- [x] Strategist-run: geen `[ai-caller] Claude response truncated`-regel (0×, was 1×); `build_strategy_foundation` slaagt — run AWAITING_CONFIRMATION met REPORT+PROPOSAL, $0,1947, 222,9s, 46.317/3.716 tokens. NB: de gelukte foundation-output stroomt als tool-result terug de loop in → run kost nu ~$0,19 (was ~$0,09-0,12 zonder werkende fundering).
- [x] Angle-generator: directe validatie op het ronde-2-deliverable — 2 volwaardige angles, geen `[gemini-client] Gemini response truncated`-regel.
- [x] `worktree.sh --done` live getest: dirty tree geweigerd (exit 1), schone tree opgeruimd incl. gemergde branch (exit 0).
- [x] `npx tsc --noEmit` 0 errors; eslint 0 errors (6 pre-existing unused-var-warnings in strategy-chain, buiten de diff).
- [x] Gemergde agents-worktrees (`-feature/-ui/-data`), `branddock-brandclaw` en `branddock-agents-dogfood-ronde2` opgeruimd; `e2e-verify-main` bestond al niet meer (lokaal noch remote).

# Smoke-test

Strategist-validatielog bevat een geslaagde foundation-fase ("proceeding with raw data", geen truncatie-throw); directe angle-run retourneert exact 2 gesanitizede angles.

# Out-of-scope (bewust)

- Streaming-refactor van de agent-loop (Fase-2-ontwerp)
- Globale `createClaudeStructuredCompletion`-default wijzigen (raakt alle features)
- F-VAL op rauwe REPORTs (product-keuze, aparte taak)
- Prod-sweep met EXA/S2-keys (user-held)
