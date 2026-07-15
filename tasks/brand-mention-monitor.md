---
id: brand-mention-monitor
title: Brand-mention-monitor — merkvermeldingen-waakhond op Exa (10e agent, Fase-0-gated)
fase: post-launch
priority: later
effort: "Fase 0: ~½ dag (validatie, geen code) · bouw na GO: 3-5 dagen"
owner: claude-code
status: open
created: 2026-07-15
completed: -
related-adr: docs/adr/2026-07-05-agents-architectuur.md (D4/D7 dekken curated agent + scheduled)
related-spec: tasks/_drafts/idea-brand-mention-monitor.md
worktree: branddock-brand-mention-monitor (alleen Fase 1+; Fase 0 is code-loos)
---

> ⚠️ **GATE — Fase 0 is een go/no-go, geen formaliteit.** Discovery-verdict was
> `needs-validation-first` (kernonzekerheid: levert Exa genoeg relevante vermeldingen
> voor NL-MKB-merken?). **Geen regel productie-code vóór een gedocumenteerde GO in Notes.**

# Probleem

Branddock bewaakt eigen content (F-VAL) maar ziet niet wat er óver het merk verschijnt.
Losse social-listening-tools kosten $79-199/mnd. Een lichte web-mentions-waakhond op de
bestaande agents-infra maakt het merk-DNA-verhaal rond en is een zichtbare schedulebare
agent. Volledige discovery + Red Team: `tasks/_drafts/idea-brand-mention-monitor.md`.

# Fase 0 — validatie (blocking, ~½ dag, geen code)

1. Handmatige Exa-pulls (script in scratchpad, géén repo-code) op 3-5 échte merknamen
   (BB + NL-MKB-merken), venster 7 én 30 dagen, querystrategie naam + domein-uitsluiting
   + branche-anker.
2. Meet: relevante vermeldingen per merk per maand, ruis-ratio, beste query-vorm.
3. User-signaal: wil de pilot dit wekelijks ontvangen? (één vraag aan Erik/BB).
4. **GO vereist**: ≥1 merk met ≥3 relevante vermeldingen/maand · ruis < 50% ·
   positief usersignaal. Resultaten + besluit in Notes. Bij NO-GO: status → blocked
   met meetdata; heroverwegen bij bredere bron-dekking.

# Voorstel (bouw, ná GO)

10e persona-agent (werknaam "Echo"; naam is productkeuze bij bouw — bestaande namen:
Nova/Vera/Stella/Milo/Marco/Dana/Remi/Iris/Ada) naar het Iris/Ada-patroon:

1. **Scan-tool** `scan_brand_mentions` (registry-native, eigen subdir): Exa-search op
   merknaam(-varianten) uit de workspace (Brand Foundation), domein-uitsluiting eigen
   site, venster clampInt 7-90 default 7; output gefencede mentions
   (bron/datum/titel/snippet) + TABLE-artefact; caps (10 in model-result).
2. **REPORT**: per vermelding bron + context + korte brand-fit-duiding door de agent
   (kwalitatief, géén sentiment-cijfer); eerlijke "geen vermeldingen deze week"-uitkomst.
3. **WEEKLY schedule** als beoogd gebruik (bestaande AgentSchedule-infra, geen nieuw werk).
4. 0-credit (analyse-agent, geen `billable`). Geen opslag van mentions in v1 (on-demand;
   het REPORT ís de historie).

Registratie-touchpoints (zelfde 4 als altijd): `AgentId`-union, `index.ts`
(agent + tools + memory-loop), `AI_FEATURES` (`agent-mention-monitor`), dogfood-spec.
Hergebruik de Exa-bronnen-helper uit `research-stack-trend-radar`/`-marco` als die er is.

# Acceptatiecriteria

- [ ] **Fase-0-gate**: meting + besluit gedocumenteerd in Notes; bouw alleen bij GO.
- [ ] Echte run op een merk mét vermeldingen → REPORT met echte externe bronnen,
      gefenced, TABLE aanwezig; snippet-bron-URLs niet van het eigen domein.
- [ ] Merk zonder vermeldingen → eerlijk "geen vermeldingen"-REPORT (geen valse urgentie).
- [ ] Zonder `EXA_API_KEY` → agent legt uit dat de bron niet geconfigureerd is (degradatie).
- [ ] Scheduled-run-bewijs (patroon Iris-smoke: enqueue → runner → run met
      triggerType='scheduled' + notificatie).
- [ ] Workspace-isolatie (merknaam komt uitsluitend uit de eigen workspace-context).
- [ ] 0 credits per run (geen billable; CreditTransaction-check in smoke).
- [ ] Kosten ≤ $0,15/run.
- [ ] `npx tsc --noEmit` 0 · `npm run lint` 0 · smoke-script · changelog-entry

# Bestanden die ik aanraak (bouwfase)

| Bestand | Wijziging | Risico |
|---|---|---|
| `src/lib/agents/registry/mention-monitor/tools.ts` | **nieuw** — scan-tool | medium |
| `src/lib/agents/registry/definitions/mention-monitor.ts` | **nieuw** — persona + prompt (eerlijke framing: "web mentions", geen social-listening-claim) | laag |
| `types.ts` / `index.ts` / `feature-models.ts` / `agents-dogfood.ts` | de 4 registratie-touchpoints | laag |
| `scripts/dev/agent-mention-monitor-smoke.ts` | nieuw | — |

# Bestanden die ik NIET aanraak

Schema (geen opslag in v1), notificatie-infra, Marco's web-signals-tool (aparte scope:
concurrenten vs eigen merk — wél de gedeelde Exa-helper), Claw-chat-surface.

# Smoke-plan

1. Unit: query-bouw (naam-varianten, domein-uitsluiting, venster-clamp).
2. Directe tool-exec op lokale BB → echte Exa-run.
3. Echte agent-run mét en zonder vermeldingen (tweede merk kiezen dat leeg is).
4. Scheduled-bewijs + workspace-isolatie + 0-credit + keyless-degradatie.

# Risico's

Zie Red Team in de idea-file: dekking (→ Fase 0), naam-ambiguïteit (→ query-anker),
verwachtings-framing (→ prompt/description eerlijk houden), overlap Marco (→ gedeelde helper).

# Out of scope

Zie idea-file (realtime, social-API's, sentiment-scores, backfill, AI-antwoord-monitoring).

# Notes

- **Fase-0-resultaten hier vastleggen** (metingen per merk, ruis-ratio, usersignaal,
  GO/NO-GO + datum).

# Start-instructie voor de uitvoerende sessie

Lees `CLAUDE.md`+`gotchas.md`, dan de idea-file en deze file. Fase 0 éérst (geen worktree
nodig — scratchpad-script + Notes). Bij GO: `scripts/dev/worktree.sh brand-mention-monitor`,
spiegel `definitions/seo-watchdog.ts` + `ads-watchdog/tools.ts`, en volg de vaste cyclus:
gates → smoke → code-reviewer-subagent → PR → merge.
