# Orchestrator Protocol — Branddock

**Laatste update:** 2026-02-03

---

## 1. Rol & Verantwoordelijkheden

### De Orchestrator
- Plant taken op basis van dependency graph en beschikbare workers
- Spawnt worker agents met geïsoleerde context (alleen hun module)
- Bewaakt contract compliance na elke worker-output
- Houdt progress.md en scratchpad.md bij
- Escaleert naar Erik bij conflicten of ontbrekende specs
- Draait NOOIT zelf code — alleen coördinatie en verificatie

### Workers
- Ontvangen één module-opdracht met bijbehorende context
- Lezen alleen: hun SPEC.md, component portal, relevante contracten
- Schrijven code in eigen git worktree
- Rapporteren klaar/geblokkeerd aan orchestrator
- Wijzigen NOOIT contracten of specs van andere modules

### Erik (Product Owner)
- Beslist bij contract conflicten
- Reviewt escalaties van de orchestrator
- Keurt ADRs goed
- Wordt NIET gestoord voor routinewerk

---

## 2. Taakverdelingsregels

### Regel 1: Laag-gebaseerde planning
Workers worden alleen gestart voor modules waarvan ALLE afhankelijkheden (requires) al gemerged zijn naar main.

### Regel 2: Maximaal 5 parallelle workers
Niet meer dan 5 workers tegelijk (= 5 Warp terminal tabs).

### Regel 3: Kritiek pad heeft prioriteit
Modules op het kritieke pad krijgen voorrang.

### Regel 4: Contract-first
Voordat een worker begint, controleert de orchestrator of alle benodigde contracten beschikbaar en definitief zijn.

### Regel 5: Smallest first binnen dezelfde laag
Bij gelijke prioriteit krijgen kleinere modules voorrang — maximaliseert throughput.

---

## 3. Worker Context Loading

Elke worker krijgt een minimale, gefocuste context:

```
Worker context voor [Module X]:
├── CLAUDE.md (project-brede regels en fouten)
├── context/specs/[module-x]/SPEC.md
├── context/components/[module-x].md (portal)
├── Relevante contracten uit contract-registry.md
├── context/reference/tech-stack.md
└── context/reference/design-system.md
```

De worker krijgt NIET:
- Specs van andere modules
- De volledige dependency graph
- De scratchpad van andere workers
- Directe toegang tot de code van andere modules

---

## 4. Communicatie Tussen Workers

Workers communiceren NOOIT direct met elkaar. Alle communicatie loopt via:

```
Worker A ──rapport──► Orchestrator ──opdracht──► Worker B
```

---

## 5. Escalatieprotocol

### Automatisch afgehandeld (geen escalatie naar Erik)
- ✅ Taakplanning en volgorde bepalen
- ✅ Worker starten/stoppen
- ✅ Standaard tests en linting uitvoeren
- ✅ Voortgang bijwerken
- ✅ Worker herstarten na een crash
- ✅ Merge conflicts in code (als de fix eenduidig is)
- ✅ Minor code issues die de verifier vindt

### Escalatie naar Erik
- 🔺 Contract wijziging nodig (altijd → ADR)
- 🔺 Twee workers produceren incompatibele implementaties
- 🔺 Spec is ambigu of incompleet voor een module
- 🔺 Architectuurkeuze die niet in specs/ADRs staat
- 🔺 Performance issue dat architectuurwijziging vereist
- 🔺 Security concern gevonden tijdens review
- 🔺 Meer dan 3 failed attempts op dezelfde taak

### Escalatie Format
```
🔺 ESCALATIE — [korte titel]

**Module:** [naam]
**Worker:** [worker-id]
**Type:** Contract conflict / Ambigue spec / Architectuurkeuze / Security

**Situatie:**
[Wat is er aan de hand — max 5 regels]

**Opties:**
A. [Optie + voor/nadelen]
B. [Optie + voor/nadelen]

**Mijn aanbeveling:** [A of B + waarom]

**Impact als we wachten:** [Welke workers zijn geblokkeerd]
```

---

## 6. Verificatie Na Elke Worker

```
Worker levert op
      │
      ▼
1. Tests passing? ──── Nee → Terug naar worker
      │ Ja
      ▼
2. Contract compliant? ──── Nee → Check: worker-fout of contract-issue?
      │ Ja                              ├── Worker-fout → terug naar worker
      ▼                                 └── Contract-issue → escalatie
3. Geen regressies in andere modules?
      │ Ja                  │ Nee → Identificeer conflict → escalatie
      ▼
4. Merge naar main
      │
      ▼
5. Merge Checkpoint:
   - Run ALLE tests (niet alleen deze module)
   - Contract compliance check voor afhankelijke modules
   - Smoke test: applicatie start, routes laden
   - NOOIT een volgende merge tot checkpoint geslaagd is
      │ Pass
      ▼
6. Update dependency graph (nieuwe provides beschikbaar)
      │
      ▼
7. Check: zijn er modules die nu gestart kunnen worden?
      │ Ja → Spawn nieuwe workers
      │ Nee → Wacht op huidige workers
```

---

## 7. Dagelijkse Workflow (met Orchestrator)

```
SESSIE START:
1. Orchestrator leest scratchpad.md + progress.md + dependency-graph.md
2. Orchestrator bepaalt welke modules klaar zijn om te starten
3. Orchestrator spawnt workers (max 5 parallel)

TIJDENS SESSIE:
4. Workers bouwen in eigen worktrees
5. Orchestrator bewaakt voortgang en contracten
6. Bij oplevering: verificatieronde → merge of terugsturen
7. Na merge: check of nieuwe modules gestart kunnen worden
8. Bij conflicten: escalatie naar Erik

SESSIE EINDE:
9. Orchestrator stopt alle workers
10. Orchestrator update: scratchpad.md, progress.md, dependency-graph.md
11. Orchestrator schrijft samenvatting voor Erik
```
