---
id: agents-research-parity
title: Nova's deep research identiek aan de Knowledge-Library-ingang (user-verzoek)
status: done
created: 2026-07-06
completed: 2026-07-06
related-adr: docs/adr/2026-07-05-agents-architectuur.md
branch: feat/agents-research-parity
---

# Context

User-verzoek 2026-07-06: "Maak de deep research ook identiek aan dezelfde prompt." De prompts wáren identiek (zelfde pipeline-code); het verschil was het budget (agent draaide compact: 3 queries/6 bronnen/verify uit/5-min). Dit maakt de budget-config gelijk aan de Library-ingang (defaults: 6/12/verify aan/480s) en lost de wallclock-problemen op die de compacte config oorspronkelijk motiveerden.

# Wat er is gebouwd

1. **Config-pariteit**: `runDeepResearchTool` geeft géén config-override meer mee — exact `DEFAULT_DEEP_RESEARCH_CONFIG` (6 queries / 12 bronnen / verify aan / 480s interne deadline), identiek aan `POST /api/knowledge-resources/deep-research/run`. Harde kill op deadline+90s (570s) blijft als vangnet — binnen de 600s-route-cap van de Library zelf. Run-guard research-analyst 720s → 740s (clamp-max).
2. **Motor-verbeteringen (gedeeld — helpen de Library-ingang net zo goed)**:
   - Leesfase krijgt een optioneel `deadlineAt` en stopt netjes met een partial (warning) i.p.v. het budget op te eten; orchestrator reserveert 240s voor verify+synthese.
   - Verify wordt geskipt (met warning) wanneer het restbudget de synthese in gevaar brengt.
   - Post-synthese-checks zijn signal-only: een afgeronde synthese wordt nooit meer weggegooid omdat de deadline nét verstreek.
3. **Anti-retry-amplificatie (agent-kant)**: server-afgedwongen once-per-run op `run_deep_research` (`countToolAttempt` in de run-collector — bewezen nodig: het model retryde na een deadline-fout, 2×480s → 967s guard-fail). Deadline-fouten vertalen naar een expliciete no-retry-instructie + advies (topic versmallen / Library-ingang).

# Bewijs (live runs, volle diepte)

- Vóór fixes: run 969s FAILED (2× research van exact 480s — model-retry gestapeld).
- Ná fixes: run **COMPLETED in 544s** — research raakte het gedeelde 480s-plafond (zwaar topic), model retryde niet, raadpleegde read_knowledge en leverde een eerlijk REPORT met advies. Lichtere topics halen de volle pipeline binnen het budget.
- Gates: tsc 0 · eslint 0 · foundation-smoke 14/14 · data-analyst-smoke 22/22.

# Bekende realiteit (gedocumenteerd, geen bug)

Zware topics kunnen het gedeelde 8-min-motorbudget overschrijden — dat geldt exact zo voor de Library-ingang (zelfde "Aborted" op 480s; route-cap 600s). De agent degradeert dan netjes (partial antwoord + advies); structurele verruiming = async runs (`agents-scheduling`, Fase 2).

# Notes

Supersede-note toegevoegd aan de oorspronkelijke afwijking in `tasks/done/agents-motor-wiring.md`. Motor-wijzigingen (orchestrator/read-fase) zijn bewust en additief-optioneel (`deadlineAt?`), gedreven door dit user-verzoek.
