# Feature Discovery — gids

Hoe gebruik je de twee planner-subagents om een vaag idee om te zetten naar een uitvoerbare task. Voorkomt premature technical design, scope-creep en echo-chamber-validatie.

## De pipeline in één plaatje

```
[Vaag idee in je hoofd]
        ↓
   Stream Deck "Plan feature"
        ↓
┌──────────────────────────────────────┐
│  feature-planner (PM-mode subagent)  │
│  ─ 6-assen discovery                 │
│  ─ Anti-sycophancy (3 redenen tegen) │
│  ─ Aannames lijst                    │
│  ─ 5-punts stop-conditie             │
│  ─ Red Team Review                   │
└──────────────────────────────────────┘
        ↓
   tasks/_drafts/idea-<id>.md
        ↓
   [Forced commitment: jij beslist]
        ↓ (akkoord)
   Stream Deck "Tech plan"
        ↓
┌──────────────────────────────────────┐
│ technical-planner (Tech-Lead-subagent)│
│  ─ Phase -1 Gates                    │
│  ─ File-list + smoke-test            │
│  ─ Effort + risico's                 │
│  ─ ADR-noodzaak detectie             │
└──────────────────────────────────────┘
        ↓
   tasks/<id>.md  (uitvoerbaar)
        ↓
   Stream Deck "Task start" (bestaande flow)
        ↓
   Werk gestart in plan-mode
```

## Wanneer wel discovery sessie

- **Nieuwe feature** die niet in `roadmap.md` staat
- **Onduidelijke scope** — je kunt het probleem niet in 1 zin formuleren
- **>1 week werk** verwacht
- **Externe stakeholder** input — pilot-klant vroeg om iets

## Wanneer NIET

- **Bugfix <30 min** — gewoon fixen + gotchas update
- **Item al in roadmap** met heldere scope — direct task-file maken via template
- **Refactor zonder design-keuze** — commit-message volstaat
- **Tijdelijke workaround** — TODO in code met datum + reden

## Workflow

### Stap 1 — Trigger feature-planner

Stream Deck knop "Plan feature":
```
Run de feature-planner subagent voor een nieuw feature-idee. Help me met discovery via 6-assen + anti-sycophancy + 5-punts stop-conditie. Schrijf eindrapport naar tasks/_drafts/idea-<id>.md.
```

Of typ direct in chat: "Ik heb een idee voor X. Run feature-planner."

### Stap 2 — Doe de discovery

3 ronden, max 5 vragen per ronde:

| Ronde | Assen | Wat je beantwoordt |
|---|---|---|
| 1 | WHO + WHAT | Wie heeft probleem? Wat is het probleem (niet oplossing)? JTBD-verhaal. |
| 2 | WHY-NOW + SUCCESS | Waarom dit kwartaal? Welke metric meet succes? |
| 3 | CONSTRAINTS + SCOPE-EXIT | Wat zijn harde grenzen? Wat is expliciet NIET in MVP? |

Per ronde komt **anti-sycophancy stap**:
- Subagent geeft 3 redenen waarom dit NIET gebouwd zou moeten worden
- Jij weegt: welke kun je weerleggen, welke is sterk genoeg om te pauzeren?

**Niet ontwijken**. Als subagent een goed tegenargument heeft en je hebt geen weerlegging: misschien moet dit idee op pauze.

### Stap 3 — 5-punts stop-conditie

Aan einde van ronde 3:
- [ ] Probleem in 1 zin formuleerbaar?
- [ ] Eén primaire success-metric?
- [ ] Out-of-Scope > In-Scope?
- [ ] MVP-acceptance-criteria concreet (Given/When/Then)?
- [ ] Eerste taak morgen startbaar?

Alle 5 vinkt → idea-file wordt geschreven, einde sessie.
1+ ontbreekt → max 2 vervolgrondes met gerichte vraag op het ontbrekende punt.

### Stap 4 — Lees Red Team Review

Subagent eindigt met onafhankelijke kritiek + verdict:
- `ready-to-build` — door naar tech-planner
- `needs-validation-first` — onbewezen aanname valideren vóór bouwen
- `probably-don't-build` — Red Team Review onthult zwakte; idee laten vallen of fundamenteel anders

Sla idea-file niet over — als je niet leest, mis je je eigen kritiek.

### Stap 5 — Beslissing: tech-planner of niet?

**JA, doorgaan**: Stream Deck knop "Tech plan":
```
Run technical-planner subagent op tasks/_drafts/idea-<id>.md. Pas Phase -1 Gates toe. Promote naar tasks/<id>.md volgens template. Roep adr-create skill aan voor architectuur-keuzes.
```

**NEE, validatie eerst**: schrijf experiment in `tasks/<id>.md` — bv "interview 3 pilot-klanten over X" — voor je gaat bouwen.

**NEE, parkeren**: idea-file blijft in `tasks/_drafts/` als historische referentie. Status update naar `dropped` met datum en reden.

### Stap 6 — Tech-planner doet zijn werk

Subagent leest idea-file, past:
- **Simplicity Gate**: ≤3 modules, geen future-proofing
- **Anti-Abstraction Gate**: frameworks direct, geen wrappers
- **Integration-First Gate**: contracten vóór implementatie

Output: `tasks/<id>.md` volgens `tasks/_template.md` met:
- File-list
- Smoke-test plan
- Risico's
- Effort range
- ADR-noodzaak (indien van toepassing)

### Stap 7 — Indien ADR nodig

Tech-planner zegt: "ADR vereist voor decision X". Roep `adr-create` skill aan **vóór** uitvoering, niet erna.

### Stap 8 — Trigger executie

Stream Deck knop "Task start":
```
Werk aan tasks/<id>.md volgens regels in CLAUDE.md. Start in plan-mode. Bevestig file-set en acceptatiecriteria voor je begint.
```

## Anti-patterns die we vermijden

| Anti-pattern | Waarom | Hoe voorkomen |
|---|---|---|
| Vague PRD-generatie ("schrijf een PRD voor X") | Generic template-vulling, geen customer-data | feature-planner eist evidence + JTBD-narratief |
| Premature technical design | Tech keuze vóór probleem-helderheid | Twee aparte subagents, splitsing forced |
| Scope-creep tijdens planning | Elke ronde voegt feature toe i.p.v. snijden | Out-of-Scope > In-Scope verplicht |
| Sycophancy ("AI lijkt akkoord") | Echo-chamber bij solo-werk | Anti-sycophancy stappen + Red Team Review |
| Over-documentation | 50 pagina's voor 2-dagen werk | 5-punts stop-conditie dwingt eindigheid |
| One-shot zonder iteratie | Eerste antwoord wordt fixed plan | Max 3 ronden, expliciete iteratie |

## Tijdsindicatie

- Klein idee (1-2 dagen werk): 30-45 min discovery + 15 min tech plan = ~1 uur totaal
- Middelgroot (1 week): 60-90 min discovery + 30 min tech plan = ~2 uur totaal
- Groot (multi-week): split in meerdere features, doe per feature een aparte sessie
- **Time-box**: max 2 dagen plannen voor 1 week implementatie. Anders ben je in escapist-modus.

## Wanneer "good enough" → stop

Stop met plannen wanneer:
- Probleem in 1 zin
- Eén primaire metric
- Out-of-Scope > In-Scope
- Acceptance criteria concreet
- Morgen-startbare taak

Verder plannen is over-engineering. Begin met bouwen, leer onderweg.

## Solo-dev specifieke aandachtspunten

### Echo-chamber risico
Anti-sycophancy stappen + Red Team Review zijn er om dit te tegengaan. **Lees ze serieus** — niet skip naar implementatie omdat AI je idee bevestigde.

### "Ik praat tegen mezelf via AI"
Voorkom: genereer eerst 3-5 eigen ideeën **vóór** je AI introduceert. Daarna pas feature-planner als challenger, niet als first-input.

### Geen team om "nee" te zeggen
Out-of-Scope-lijst is je belangrijkste verdediging. Forceer hem groter dan In-Scope-lijst.

### Forced commitment
Eindig elke sessie met óf "akkoord, naar tech-planner" óf "specifieke open vraag voor volgende sessie". Geen open einde.

## Cross-references

- Subagent: `.claude/agents/feature-planner.md`
- Subagent: `.claude/agents/technical-planner.md`
- Idea template: `tasks/_drafts/_idea-template.md`
- Task template: `tasks/_template.md`
- Spelregels: `docs/playbooks/working-flow.md`
- ADR over deze keuze: `docs/adr/2026-05-07-feature-planner-architecture.md`
