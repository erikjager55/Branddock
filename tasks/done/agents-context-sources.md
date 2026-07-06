---
id: agents-context-sources
title: Content sources kiezen per agent-run (pariteit met Brand Assistant)
status: done
completed: 2026-07-06
created: 2026-07-06
related-adr: docs/adr/2026-07-05-agents-architectuur.md
branch: feat/agents-research-parity (gestapeld, eigen commits)
---

# Context

User-verzoek 2026-07-06: "Bij de brand assistant kan ik content sources toevoegen/verwijderen. Dit wil ik ook kunnen bij de Agents." De Claw-chat heeft `ContextSelection {modules, entityIds?}` + `ContextSelectorModal`; agent-use-case-runs draaien altijd op de volledige merk-DNA-stack.

# Scope

1. **Backend**: `POST /api/agents/run` accepteert optioneel `contextSelection` (zelfde vorm als de Claw-chat, gevalideerd + gefilterd op bekende modules); `runAgent` → `buildSystemPrompt({workspaceId, contextSelection})`; `buildAgentSystemPrompt` bouwt met selectie dezelfde module-secties als de Brand Assistant (hergebruik `fetchModuleContext`), zonder selectie ongewijzigd de volledige merkcontext.
2. **UI**: UseCaseForm krijgt een inklapbare "Content sources"-kiezer (zelfde modulelijst + labels als de Brand Assistant via de claw-i18n-namespace); default onaangeraakt = geen selectie meesturen (= huidig gedrag); aangepast = selectie meesturen.
3. Out-of-scope: entity-level drilldown per module in de agents-UI (Claw-modal heeft dat; module-niveau dekt toevoegen/verwijderen — deferred note), persistentie van de selectie op de run-rij.

# Acceptatiecriteria

- [x] Run zonder selectie: byte-identiek gedrag (volledige merkcontext).
- [x] Run met selectie: system-prompt bevat alleen de gekozen bronnen (deterministisch aangetoond).
- [x] Onbekende module-waarden worden server-side gefilterd; caps op aantallen.
- [x] UI-kiezer met en/nl-labels, default-gedrag zichtbaar gemaakt.
- [x] Gates: tsc 0, lint 0, smokes 14/14 + 22/22, e2e "Agents UI" 5/5.


# Status 2026-07-06 — GEBOUWD

- Deterministische prompt-test (Zwarthout-workspace): default 20.886 chars zonder selected-sources; personas-only 7.731 chars mét uitsluitingsnotitie + persona-sectie; brand+personas 26.865 chars — 5/5 cases correct.
- Live door de route: run met `{modules:["personas"]}` → COMPLETED; onbekende module gefilterd (200, geen 400).
- UI: ContentSourcesPicker (chips, claw-i18n-labels, "niet aangeraakt = standaard"-semantiek + reset), StartAgentRunBody uitgebreid.
- Gates: tsc 0 · lint 0 errors · smokes 14/14 + 22/22.
- Deferred: entity-level drilldown per module (Claw-modal heeft dit; module-niveau dekt het verzoek), persistentie van de selectie op de run-rij.

## Task-finalize 2026-07-06 — review

Delta-review (T): 0 CRITICAL, 3 WARNINGs gefixt — deselect-all geblokkeerd in de UI (validatie i.p.v. stilzwijgend default), 2 gepurgede hover-classes in de index.css-fallback, outer abort-timer verplaatst naar vlak vóór de harde kill zodat de synthese-gratie ook in het agent-pad geldt. Minors meegefixt: plural-key, entityIds-key-cap, import/comment-plaatsing. Deferred: cross-ns lazy-load kan één render rauwe keys tonen (chips renderen pas na expand); entityIds voor niet-geselecteerde modules zijn dode data; bungelnde taal-instructie bij brand-uitsluiting.
