# Component Specificatie Werkwijze
## Van Screenshots naar Code-Ready Specs

**Versie 4.2 — Definitief + Orchestrator Pattern** | 3 februari 2026  
*Allesomvattend plan: Context Library + Boris Cherny Workflow + Tooling + Industry Best Practices + Swarm Orchestratie*

---

## 1. Overzicht

We bouwen Branddock — een complexe SaaS applicatie met meerdere componenten. Dit document is het **enige werkdocument** dat het hele proces beschrijft, van eerste screenshot tot werkende code.

### 1.1 Het Complete Proces

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                       │
│  FASE 0              FASE 1              FASE 2          FASE 3      │
│  Project       ──►   Screenshot    ──►   Component ──►   Spec       │
│  Setup               Inventarisatie      Definitie       Interviews  │
│                                                                       │
│                      FASE 4              FASE 5                      │
│                ──►   Code          ──►   Launch                      │
│                      Implementatie       & Polish                     │
│                                                                       │
│       │                   │                   │              │        │
│       ▼                   ▼                   ▼              ▼        │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │              CONTEXT LIBRARY (context/)                      │     │
│  │  Elke fase leest van en schrijft naar de context library     │     │
│  │  Markdown · Mens + AI leesbaar · Git-tracked                │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Kernprincipes

Gebaseerd op de workflow van Boris Cherny (creator Claude Code):

| Principe | Wat het betekent |
|----------|-----------------|
| **Context Library** | Alle kennis in markdown, doorzoekbaar voor mens én AI |
| **Screenshots First** | Geen aannames — alles komt uit de applicatie zelf |
| **Opus 4.5 + Thinking** | Optimaliseer voor totale task completion time |
| **Planning First** | Measure twice, cut once — altijd planning mode |
| **Verificatie Loops** | Claude valideert altijd zijn eigen werk |
| **CLAUDE.md als geheugen** | Elke fout wordt een preventieregel |
| **Parallelle Orchestratie** | 5+ terminal instances, niet multitasken maar orkesteren |
| **Orchestrator-gestuurd** | Eén orchestrator-agent verdeelt werk, bewaakt afhankelijkheden, escaleert bij conflicten |
| **Scratchpad als werkgeheugen** | Bij sessie-start lezen, bij sessie-einde bijwerken |
| **ADRs voor architectuurkeuzes** | Formele vastlegging van waarom, niet alleen wat |
| **Component Portals** | Eén navigatiepagina per component die alles bij elkaar brengt |

### 1.3 Tech Stack

| Laag | Technologie |
|------|------------|
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Next.js API Routes, Prisma, PostgreSQL |
| Infra | Vercel, Supabase, Redis |
| AI | Claude API (primair), OpenAI (fallback), Nanobanana |
| Betalingen | Stripe (primair), Mollie (NL/BE) |
| Search | Meilisearch |
| Real-time | Socket.io of Supabase Realtime |
| CRDT | Yjs (conflict resolution) |

---

## 2. De Context Library

### 2.1 Waarom Markdown?

| Optie | Geschikt? | Reden |
|-------|-----------|-------|
| Notion | ❌ Als primair | Warp/Claude Code kan er niet bij lezen |
| Custom tool | ❌ | Kost tijd, we bouwen tooling ipv product |
| **Markdown in projectmap** | **✅** | Mens + AI leesbaar, Git-tracked, `@`-refereerbaar |

Optioneel synchroniseren we naar Notion voor overzicht, maar de **bron van waarheid** is altijd `context/`.

### 2.2 Structuur

```
context/
│
├── _index.md                         # Master index (startpunt voor mens + AI)
│
├── screens/                          # FASE 1: Screenshot analyses
│   ├── _overview.md                  #   Sitemap + status per scherm
│   ├── 01-workspace-dashboard.md     #   Per scherm een analyse
│   ├── 02-strategy-overview.md
│   ├── ...
│   └── screenshots/                  #   Originele afbeeldingen
│
├── features/                         # FASE 1→2: Ontdekte functionaliteiten
│   ├── _registry.md                  #   Master lijst alle features (F-001, F-002...)
│   └── unassigned.md                 #   Features nog niet aan component toegewezen
│
├── components/                       # FASE 2: Component definities
│   ├── _overview.md                  #   Alle componenten + scope
│   ├── _relations.md                 #   Afhankelijkheden, events, shared data
│   ├── _build-order.md              #   Bouwvolgorde per laag
│   └── [component-naam].md          #   ★ Component Portal (1 per component)
│
├── specs/                            # FASE 3: Technische specificaties
│   ├── [component-naam]/
│   │   ├── SPEC.md                   #   Volledige specificatie
│   │   ├── decisions.md              #   Beslissingen voor dit component
│   │   └── open-questions.md         #   Nog te beantwoorden (leeg = klaar)
│   └── _cross-validation.md          #   Cross-component checks
│
├── decisions/                        # Doorlopend: Architectuur beslissingen
│   ├── _log.md                       #   Chronologisch (D-001, D-002...)
│   └── DDD-[naam].md                 #   Per grote beslissing een bestand
│
├── adr/                              # Architecture Decision Records (formeel)
│   ├── _index.md                     #   ADR overzicht met status
│   └── ADR-NNN-[naam].md            #   Per architectuurbeslissing
│
├── reference/                        # Achtergrond & bronnen
│   ├── tech-stack.md                 #   Gekozen technologieën + rationale
│   ├── design-system.md              #   UI/UX richtlijnen, tokens, Figma refs
│   ├── user-roles.md                 #   Gebruikersrollen en rechten
│   ├── business-rules.md             #   Bedrijfsregels
│   └── glossary.md                   #   Begrippen en definities
│
└── project/                          # Projectmanagement
    ├── werkwijze.md                  #   DIT DOCUMENT
    ├── progress.md                   #   Voortgang tracker
    ├── scratchpad.md                 #   ★ Agent werkgeheugen (sessie-context)
    └── changelog.md                  #   Wat veranderd en wanneer
```

### 2.3 Kernprincipes Context Library

**1. Eén waarheid per onderwerp**
Elk stuk kennis leeft op precies één plek. Andere bestanden verwijzen met relatieve links.

```markdown
<!-- In een scherm-analyse -->
Upload functie → zie [F-042 in feature register](../features/_registry.md)
Valt onder → [Kennisbibliotheek](../components/_overview.md#kennisbibliotheek)
```

**2. Elke fase vult zijn eigen map**

```
Fase 0 → context/reference/, context/project/
Fase 1 → context/screens/, context/features/
Fase 2 → context/components/
Fase 3 → context/specs/
Fase 4 → CLAUDE.md (gegenereerd uit context/)
```

**3. Index-bestanden als navigatie**
Elk `_overview.md` of `_index.md` is een inhoudsopgave. Dit is het eerste bestand dat een AI agent leest.

**4. Beslissingen worden altijd gelogd**
Elke keuze gaat naar `context/decisions/` met redenering. Dit voorkomt dat we dezelfde discussie opnieuw voeren.

**5. Feature IDs zijn uniek en permanent**
F-001 is altijd F-001, ook als de feature verhuist naar een ander component.

### 2.4 Master Index Template (`context/_index.md`)

```markdown
# Branddock — Context Library

## Status
- Fase 0: Project Setup [DONE]
- Fase 1: Screenshot Inventarisatie [IN PROGRESS]
- Fase 2: Component Definitie [NOT STARTED]
- Fase 3: Spec-Interviews [NOT STARTED]
- Fase 4: Code Implementatie [NOT STARTED]
- Fase 5: Launch & Polish [NOT STARTED]

## Quick Links
- [Scherm overzicht](screens/_overview.md)
- [Feature register](features/_registry.md)
- [Componenten](components/_overview.md)
- [Relaties](components/_relations.md)
- [Specs](specs/)
- [Beslissingen](decisions/_log.md)
- [ADRs — Architectuur](adr/_index.md)
- [Tech stack](reference/tech-stack.md)
- [Voortgang](project/progress.md)
- [Scratchpad](project/scratchpad.md)

## Conventies
- Bestandsnamen: kebab-case
- Scherm-bestanden: genummerd (01-, 02-...)
- Feature IDs: F-001, F-002... (uniek, permanent)
- Decision IDs: D-001, D-002... (chronologisch)
- Component refs: [NAAM] in hoofdletters
```

### 2.5 Hoe Kennis Doorvloeit

```
FASE 1 produceert:
  screens/*.md ──────────────────► FASE 2 leest schermen om features te groeperen
  features/_registry.md ─────────► FASE 2 wijst features toe aan componenten

FASE 2 produceert:
  components/_overview.md ────────► FASE 3 weet de scope per component
  components/_relations.md ───────► FASE 3 weet de afhankelijkheden

FASE 3 produceert:
  specs/*/SPEC.md ────────────────► FASE 4 agents lezen spec en bouwen
  decisions/_log.md ──────────────► FASE 4 agents begrijpen waarom

FASE 4 voegt toe:
  CLAUDE.md updates ──────────────► Compounding kennis per sprint
```

---

## FASE 0: Project Setup (éénmalig)

### 0.1 Context Library Aanmaken

```bash
# Context library structuur
mkdir -p context/{screens/screenshots,features,components,specs,decisions,adr,reference,project}

# Index bestanden aanmaken
touch context/_index.md
touch context/screens/_overview.md
touch context/features/_registry.md
touch context/features/unassigned.md
touch context/components/{_overview.md,_relations.md,_build-order.md}
touch context/specs/_cross-validation.md
touch context/decisions/_log.md
touch context/adr/_index.md
touch context/reference/{tech-stack.md,design-system.md,user-roles.md,business-rules.md,glossary.md}
touch context/project/{progress.md,scratchpad.md,changelog.md}
touch context/project/{dependency-graph.md,contract-registry.md,orchestrator-protocol.md}

# Dit document opslaan
cp werkwijze.md context/project/werkwijze.md
```

### 0.2 Tooling Voorbereiden

```bash
# Claude Code / Warp configuratie
mkdir -p .claude/{commands,agents,hooks}

# Configuratiebestanden
touch .claude/settings.json
touch .claude/agents/orchestrator.md
touch .mcp.json
touch CLAUDE.md
```

### 0.3 Reference Bestanden Invullen

Bij de start vullen we de `context/reference/` map:

- **tech-stack.md** — alle technologiekeuzes + rationale
- **design-system.md** — Figma links, tokens, spacing (4px grid), typografie
- **user-roles.md** — alle rollen (owner, admin, member, viewer, guest)
- **business-rules.md** — plannen (Free, Pro, Enterprise), limieten
- **glossary.md** — begrippen (Workspace, Campaign, Strategy, etc.)

---

## FASE 1: Screenshot Inventarisatie

### 1.1 Doel

Elk scherm van de applicatie doorlopen via screenshots om alle functionaliteiten te ontdekken — ook de onverwachte. We definiëren hier nog geen componenten, alleen wat we zien.

### 1.2 Werkwijze Per Screenshot

```
┌─────────────────────────────────────────────────────────────────────┐
│  PER SCREENSHOT:                                                      │
│                                                                       │
│  STAP 1: Jij deelt screenshot(s)                                     │
│          └── Meerdere per onderdeel (overzicht, detail, modals)      │
│                                                                       │
│  STAP 2: Ik analyseer wat ik zie                                     │
│          └── Elke knop, sectie, label, interactie                    │
│          └── Navigatie: waar leidt het naartoe                       │
│          └── Data: wat wordt getoond, waar komt het vandaan          │
│                                                                       │
│  STAP 3: We bespreken samen                                          │
│          └── Wat moet elke functionaliteit doen?                     │
│          └── Wat ontbreekt er nog?                                   │
│          └── Hoe verhoudt het zich tot andere schermen?              │
│                                                                       │
│  STAP 4: Ik sla op in de context library                             │
│          └── context/screens/XX-naam.md (scherm-analyse)             │
│          └── context/screens/_overview.md (rij toevoegen)            │
│          └── context/features/_registry.md (nieuwe features)         │
│          └── context/decisions/_log.md (eventuele keuzes)            │
│                                                                       │
│  STAP 5: Ik deel de bestanden, jij slaat ze op                       │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 Scherm-Analyse Template (`context/screens/XX-naam.md`)

```markdown
# Scherm: [Naam]

**ID:** SCR-XX
**Sectie:** [Navigatiepad, bijv. "Workspace > Strategy > Detail"]
**Screenshot:** [bestandsnaam]
**Status:** GEANALYSEERD / BESPROKEN / COMPLEET

---

## Beschrijving
[Eén alinea: wat doet dit scherm, voor wie]

## Navigatie
| Element | Type | Leidt naar | Notities |
|---------|------|------------|----------|
| ... | Link/Knop/Tab | SCR-XX | ... |

## Secties & Elementen
| Sectie | Beschrijving | Interactief? | Feature ID |
|--------|-------------|-------------|------------|
| ... | ... | Ja/Nee | F-XXX |

## Acties
| Actie | Type | Wat doet het | Feature ID |
|-------|------|-------------|------------|
| ... | Knop/Form/Drag/Toggle | ... | F-XXX |

## Data
### Getoond
| Data | Type | Bron |
|------|------|------|
| ... | Tekst/Lijst/Tabel/Grafiek | Database/API/Berekend |

### Muteerbaar
| Veld | Type | Validatie | Feature ID |
|------|------|----------|------------|
| ... | Input/Select/Toggle | Required/Max length/etc. | F-XXX |

## Gerelateerde Schermen
- ← Komt van: [SCR-XX](XX-naam.md)
- → Gaat naar: [SCR-XX](XX-naam.md)
- ↔ Modal/overlay: [SCR-XX](XX-naam.md)

## Open Vragen
- [ ] ...

## Notities
...
```

### 1.4 Feature Register Template (`context/features/_registry.md`)

```markdown
# Feature Register

**Totaal:** [X] features
**Toegewezen:** [X] | **Niet toegewezen:** [X]

| ID | Naam | Beschrijving | Scherm(en) | Component | Prioriteit | Status |
|----|------|-------------|-----------|-----------|-----------|--------|
| F-001 | ... | ... | SCR-01 | — | Must | Ontdekt |
| F-002 | ... | ... | SCR-01, SCR-03 | — | Should | Besproken |

## Prioriteit
- **Must**: Zonder dit werkt de app niet (MVP)
- **Should**: Verwacht door gebruikers, workaround mogelijk (V1.1)
- **Could**: Mooi om te hebben (Later)
- **Won't**: Bewust uitgesteld (niet nu)

## Status
- **Ontdekt**: Gezien in screenshot
- **Besproken**: Besproken, scope helder
- **Toegewezen**: Aan component toegewezen (Fase 2)
- **Gespecificeerd**: In SPEC.md opgenomen (Fase 3)
```

### 1.5 Scherm Overzicht Template (`context/screens/_overview.md`)

```markdown
# Scherm Overzicht

## Navigatiestructuur
[Wordt gaandeweg opgebouwd als sitemap]

## Geanalyseerde Schermen
| # | Scherm | Sectie | Status | Features | Open vragen |
|---|--------|--------|--------|----------|-------------|
| 01 | ... | ... | ✅ / 🔄 / ⬜ | X | X |

## Nog Te Analyseren
- [ ] ...
```

### 1.6 Deliverables Fase 1

```
context/screens/_overview.md          ✅ Complete sitemap
context/screens/01-*.md ... NN-*.md   ✅ Analyse per scherm
context/features/_registry.md         ✅ Alle features met uniek ID
context/decisions/_log.md             ✅ Eerste beslissingen
```

---

## FASE 2: Component Definitie

### 2.1 Doel

Op basis van Fase 1 bepalen welke componenten er nodig zijn. Het aantal kan meer of minder zijn dan eerder aangenomen.

### 2.2 Werkwijze

```
STAP 1: Feature register doorlopen
        └── Open context/features/_registry.md
        └── Groepeer alle features op domein/functie/data

STAP 2: Componenten definiëren
        └── Elke groep → component met naam en scope
        └── Grenzen: wat hoort er WEL en NIET bij
        └── Schrijf naar: context/components/_overview.md

STAP 3: Features toewijzen
        └── Update _registry.md: elke feature krijgt een component
        └── unassigned.md moet leeg worden

STAP 4: Relaties uitwerken
        └── Afhankelijkheidsmatrix (◄◄ hard, ◄ zacht, ► levert, ►► bepalend)
        └── Gedeelde database entiteiten
        └── Event-communicatie met payloads
        └── Gedeelde interfaces/contracten
        └── Schrijf naar: context/components/_relations.md

STAP 5: Bouwvolgorde bepalen
        └── Lagen op basis van afhankelijkheden
        └── Wat kan parallel, wat is sequentieel
        └── Schrijf naar: context/components/_build-order.md
```

### 2.3 Relations Template (`context/components/_relations.md`)

```markdown
# Component Relaties

## Afhankelijkheidsmatrix
[Matrix met ◄◄ ◄ ► ►► · symbolen]

## Gedeelde Database Entiteiten
| Entiteit | Eigenaar | Gelezen door | Gemuteerd door | Relatie |
|----------|----------|-------------|----------------|---------|

## Event Communicatie
| Event | Bron | Doel(en) | Payload |
|-------|------|----------|---------|

## Gedeelde Interfaces (Contracten)

### Permission Check (alle → Toegangsbeheer)
[TypeScript interface]

### User Context (alle → Settings)
[TypeScript interface]

### Event Bus
[TypeScript interface met standaard format]

## API Contracts Tussen Componenten
[Interne API specs]
```

### 2.4 Component Portal Template (`context/components/[component-naam].md`)

Elk component krijgt een eigen portalbestand — één pagina die als navigatiehub fungeert naar alle gerelateerde informatie. Dit geeft het beste van twee werelden: de fase-gebaseerde structuur blijft intact, maar je kunt per component alles terugvinden zonder door vijf mappen te zoeken.

```markdown
# Component Portal: [Component Naam]

**Status:** Gedefinieerd / In Spec / In Development / Complete
**Eigenaar agent:** [bijv. backend-dev-1]
**Laag:** [Laag 1/2/3/4 uit _build-order.md]

---

## Scope
[Korte omschrijving: wat dit component doet, wat het NIET doet]

## Gerelateerde Schermen
| Scherm | Status | Link |
|--------|--------|------|
| SCR-03 Dashboard | ✅ | [03-dashboard](../screens/03-dashboard.md) |
| SCR-07 Detail | ✅ | [07-detail](../screens/07-detail.md) |

## Toegewezen Features
| Feature ID | Naam | Prioriteit | Status |
|-----------|------|-----------|--------|
| F-012 | Feature naam | Must | Gespecificeerd |
| F-013 | Feature naam | Should | Ontdekt |

→ Volledige lijst: [filter _registry.md op dit component](../features/_registry.md)

## Specificatie
- [SPEC.md](../specs/[component-naam]/SPEC.md) — Technische spec
- [decisions.md](../specs/[component-naam]/decisions.md) — Component-specifieke keuzes
- [open-questions.md](../specs/[component-naam]/open-questions.md) — Open vragen

## Afhankelijkheden
| Richting | Component | Type | Wat |
|----------|-----------|------|-----|
| ◄◄ Harde dep | Settings | Data | Workspace config, user roles |
| ► Levert | Strategie Generator | Event | content.published |

→ Volledige matrix: [_relations.md](_relations.md)

## Relevante Beslissingen
| ID | Beslissing | Impact |
|----|-----------|--------|
| D-003 | Prisma boven raw SQL | Database laag |
| ADR-002 | Stripe als primair | Betaalflow |

→ Alle beslissingen: [decisions/_log.md](../decisions/_log.md)

## Implementatie Status
| Onderdeel | Status | Branch |
|-----------|--------|--------|
| Database schema | ✅ | feat/component-db |
| API routes | 🔄 | feat/component-api |
| Frontend UI | ⬜ | — |
| Tests | ⬜ | — |
```

### 2.5 Deliverables Fase 2

```
context/components/_overview.md       ✅ Alle componenten + scope + grenzen
context/components/_relations.md      ✅ Matrix, events, shared data, interfaces
context/components/_build-order.md    ✅ Bouwvolgorde per laag
context/components/[naam].md          ✅ Portal per component (linkt alles bij elkaar)
context/features/_registry.md         ✅ Bijgewerkt: alle features toegewezen
```

---

## FASE 3: Spec-Interviews

### 3.1 Doel

Per component een complete, code-ready technische specificatie uitwerken via een gestructureerd interview.

### 3.2 Voorbereiding Per Interview

Voordat het interview begint, lees:

```
1. context/components/_overview.md       → scope van dit component
2. context/features/_registry.md         → filter op dit component
3. context/screens/*.md                  → relevante schermen
4. context/components/_relations.md      → afhankelijkheden
5. context/decisions/_log.md             → eerdere relevante beslissingen
6. context/reference/*                   → tech stack, design system, user roles
```

### 3.3 Interview Protocol

**Ronde 1: Context & Scope** (10 min, 5-10 vragen)

```
- Wat is het kernprobleem dat dit component oplost?
- Welke gebruikersrol heeft hier het meeste baat bij?
- Wat is de minimale versie die waarde levert? (MVP)
- Welke componenten MOETEN werken voordat dit kan functioneren?
- Wat onderscheidt dit van standaard SaaS implementaties?
```

Schrijft naar: `specs/[component]/SPEC.md` §1-2

**Ronde 2: Technische Diepgang** (20 min, 10-15 vragen)

Goede vragen (specifiek, scenario-gebaseerd):
```
- "Wat gebeurt er als de Stripe webhook niet aankomt binnen 30 seconden?"
- "Wil je optimistic UI updates of wacht je op server response?"
- "Hoe handelen we concurrent document edits?"
- "Wat is de maximale response tijd voor de strategie generator?"
- "Moet de zoekfunctie fuzzy matching ondersteunen of exact?"
- "Wat is de fallback als de AI provider een outage heeft?"
- "Hoeveel API calls per minuut verwacht je per gebruiker?"
- "Moeten team-admins individuele feature locks kunnen overschrijven?"
```

Vermijd (te basaal):
```
- "Moet het responsive zijn?" (altijd ja)
- "Wil je error handling?" (altijd ja)
- "Moet er een submit knop zijn?" (te basaal)
```

Schrijft naar: `specs/[component]/SPEC.md` §4-5
Beslissingen naar: `decisions/_log.md`

**Ronde 3: Edge Cases & Failure Modes** (15 min, 5-10 vragen)

```
- "Wat als een gebruiker midden in een betaling de browser sluit?"
- "Wat als twee teamleden tegelijk dezelfde strategie bewerken?"
- "Wat als de document upload halverwege faalt bij 500MB?"
- "Wat als een gebruiker downgraded terwijl hij premium features gebruikt?"
```

Schrijft naar: `specs/[component]/SPEC.md` §6

**Ronde 4: Tradeoffs & Review** (15 min, 3-5 vragen)

```
- "Real-time sync of periodieke sync voor samenwerking?"
- "Eigen zoekindex (Meilisearch) of database full-text search?"
- "Stripe-only of ook Mollie voor NL/BE markt?"
- "Feature flags via LaunchDarkly of custom implementatie?"
```

Schrijft naar: `specs/[component]/decisions.md`

### 3.4 Interview Regels

1. **Één vraag per keer** — geef ruimte om na te denken
2. **Doorvragen op vaag antwoord** — "Kun je dat concreter maken?"
3. **Scenario's schetsen** — "Stel je voor dat gebruiker X dit doet..."
4. **Alternatieven aanbieden** — "Optie A is sneller, Optie B flexibeler..."
5. **Refereer aan screenshots** — "Op SCR-04 zie ik [element], hoe werkt dat?"
6. **Grenzen stellen** — "Dit valt buiten scope, hoort bij [ander component]"

### 3.5 SPEC.md Template

```markdown
# Spec: [Component Naam]

**Versie:** 1.0
**Status:** DRAFT / REVIEW / APPROVED
**Laatste update:** [datum]

## 1. Context
**Waarom:** [Probleem]
**Scope:** [Uit components/_overview.md]
**Gebruikers:** [Rollen uit reference/user-roles.md]
**Schermen:** [Links naar context/screens/]
**Features:** [IDs uit features/_registry.md]

## 2. User Stories
### Primaire flows
- Als [rol] wil ik [actie] zodat [resultaat]
### Secundaire flows
### Admin flows

## 3. Requirements
### Must Have (MVP)
- [ ] ...
### Should Have (V1.1)
- [ ] ...
### Nice to Have (Later)
- [ ] ...

## 4. Technische Specificatie

### 4.1 Database Schema
```sql
-- Tabellen met relaties
```

### 4.2 API Endpoints
| Method | Endpoint | Beschrijving | Auth | Rate Limit |
|--------|----------|--------------|------|-----------|

### 4.3 Business Logic / Services
[Kernlogica, validatieregels, berekeningen]

### 4.4 Integraties met Andere Componenten
| Component | Type | Beschrijving |
|-----------|------|-------------|
| ... | Leest van / Schrijft naar / Event listener / Event emitter | ... |

## 5. UI/UX Specificatie

### 5.1 Schermen & Layouts
[Referenties naar context/screens/ + Figma links]

### 5.2 User Flows
[Stap-voor-stap beschrijving]

### 5.3 States
| State | Beschrijving | UI Gedrag |
|-------|-------------|-----------|
| Loading | | Skeleton / spinner |
| Empty | | Empty state + CTA |
| Error | | Error message + retry |
| Success | | Bevestiging |

### 5.4 Responsive Gedrag
[Breakpoints, aanpassingen]

## 6. Edge Cases & Error Handling

### 6.1 Edge Cases
| Scenario | Handling |
|----------|---------|

### 6.2 Foutscenario's
| Fout | Fallback | Gebruiker ziet |
|------|----------|---------------|

### 6.3 Rate Limits & Performance
[Verwachte load, caching strategie]

## 7. Acceptatie Criteria
- [ ] [Specifieke, testbare criteria]

## 8. Referenties
- Schermen: [links naar context/screens/]
- Gerelateerde specs: [links naar andere specs]
- Beslissingen: [links naar decisions/]
- Figma: [links]
```

### 3.6 Cross-Component Validatie

Na alle interviews: `context/specs/_cross-validation.md`

```markdown
# Cross-Component Validatie

## Checklist
- [ ] Gedeelde database entiteiten consistent gedefinieerd
- [ ] API contracts tussen componenten matchen
- [ ] Event-namen en payloads gestandaardiseerd
- [ ] Toegangsbeheer dekt alle features in alle componenten
- [ ] Error handling consistent (zelfde format, zelfde gedrag)
- [ ] Geen scope overlap tussen componenten
- [ ] Geen gaten — alle user stories gedekt
- [ ] Performance verwachtingen realistisch gezien de chain

## Gevonden Issues
| # | Beschrijving | Component A | Component B | Oplossing | Status |
```

### 3.7 Deliverables Fase 3

```
context/specs/[component]/SPEC.md          ✅ Per component
context/specs/[component]/decisions.md     ✅ Per component
context/specs/[component]/open-questions.md ✅ (leeg = klaar)
context/specs/_cross-validation.md          ✅ Cross-component checks
context/decisions/_log.md                   ✅ Bijgewerkt
```

---

## FASE 4: Code Implementatie

### 4.1 CLAUDE.md Genereren uit Context Library

Bij de start van de code-fase genereren we `CLAUDE.md` (= `WARP.md`) uit de context library:

```markdown
# CLAUDE.md — Branddock

## Project
[Uit context/_index.md]

## Tech Stack
[Uit context/reference/tech-stack.md]

## Architectuur
[Uit context/components/_overview.md + _relations.md]

## Componenten & Specs
[Links naar context/specs/*/SPEC.md]

## Conventies
- Components: PascalCase
- Hooks: camelCase, prefix `use`
- API routes: kebab-case
- Database: snake_case

## ⚠️ FOUTEN & CORRECTIES (Levend Document)

### Database
- ❌ NOOIT raw SQL queries, altijd Prisma
- ❌ GEEN cascade deletes zonder expliciete bevestiging
- ✅ Altijd transactions voor multi-table updates

### API Routes
- ❌ NOOIT credentials loggen
- ✅ Altijd Zod validation op input
- ✅ Consistent error format: { error: string, code: string }

### Frontend
- ❌ GEEN inline styles, gebruik Tailwind
- ❌ NOOIT `any` type
- ✅ Server Components waar mogelijk
- ✅ Suspense boundaries rond async components

### Stripe / Mollie
- ❌ NOOIT webhook zonder signature verification
- ✅ Altijd idempotency keys voor mutations
- ✅ Log alle webhook events

### Testing
- ✅ Mock externe services
- ✅ Factories voor test data

## Current Sprint Focus
[Update wekelijks]
```

### 4.2 Slash Commands

Bestanden in `.claude/commands/`:

**`pr.md`** — Commit, push, PR in één command
```markdown
---
description: Commit, push en maak PR
---
git_status=$(git status --short)
branch=$(git branch --show-current)
diff_stat=$(git diff --stat)

Maak een commit (conventional commits format), push naar origin/$branch,
en open PR met samenvatting, testing, en breaking changes.
```

**`test.md`** — Tests voor gewijzigde bestanden
```markdown
---
description: Run tests voor gewijzigde bestanden
---
changed_files=$(git diff --name-only HEAD~1)
Identificeer relevante tests. Run unit tests + e2e indien UI changes.
Rapporteer failures met fix-suggesties.
```

**`review.md`** — Security & quality review
```markdown
---
description: Security en quality review
---
Check: credentials exposure, SQL injection, XSS, auth correctheid,
TypeScript strict compliance, error handling, performance.
Voeg bevindingen toe aan CLAUDE.md indien nodig.
```

**`verify.md`** — E2E verificatie
```markdown
---
description: Verificatie loop
---
1. Run test suite. 2. Start dev server. 3. Test feature manueel.
4. Check console errors. 5. Rapporteer status.
Als het faalt → fix en herhaal. Pas na succes: PR.
```

**`sync-figma.md`** — Design sync
```markdown
---
description: Sync met Figma design
---
Gebruik Figma MCP om design tokens op te halen.
Vergelijk met implementatie. Update waar nodig.
Documenteer afwijkingen met rationale.
```

**`spec-interview.md`** — Herbruikbaar interview command
```markdown
---
description: Spec interview workflow
---
1. Check bestaande spec in context/specs/[component]/SPEC.md
2. Lees context/components/_relations.md voor context
3. Voer 4-ronde interview uit (context, technisch, edge cases, tradeoffs)
4. Update SPEC.md, verwijder beantwoorde open vragen
5. Final review
```

### 4.3 Subagents

Bestanden in `.claude/agents/`:

**`code-simplifier.md`**
```markdown
---
name: code-simplifier
model: claude-sonnet-4-5-20250929
tools: Read, Edit, Bash
---
Review gegenereerde code. Identificeer onnodige complexiteit,
dubbele code, lange functies. Vereenvoudig ZONDER functionaliteit
te veranderen. Behoud alle tests passing.
```

**`verifier.md`**
```markdown
---
name: verifier
model: claude-haiku-4-5-20251001
tools: Read, Bash
---
Run alle relevante tests. Check dat de app start zonder errors.
Voer test scenario's uit. Rapporteer ✅ passing, ❌ failing, ⚠️ warnings.
NOOIT code wijzigingen — alleen verificatie.
```

**`security-reviewer.md`**
```markdown
---
name: security-reviewer
model: claude-opus-4-5-20251101
tools: Read, Grep, Glob
---
Review code changes voor auth issues, data security, API security.
Output: CRITICAL / HIGH / MEDIUM / LOW.
NOOIT code wijzigingen — alleen review.
```

### 4.4 360° Review Systeem (Persona-Based)

```
┌─────────────────┬───────────────────────────────────────────────┐
│ System Architect │ Focus: Structurele organisatie                │
├─────────────────┼───────────────────────────────────────────────┤
│ Senior Engineer  │ Focus: Implementatie patterns                │
├─────────────────┼───────────────────────────────────────────────┤
│ Integration Spec │ Focus: Interface definitions                 │
├─────────────────┼───────────────────────────────────────────────┤
│ Technical Author │ Focus: Documentatie & helderheid             │
└─────────────────┴───────────────────────────────────────────────┘
Alle agents runnen concurrent → Complete review in seconden
```

### 4.5 PostToolUse Hook

**`.claude/hooks/post-tool-use.sh`**
```bash
#!/bin/bash
if [[ "$TOOL_NAME" == "edit" || "$TOOL_NAME" == "write" ]]; then
  FILE="$TOOL_FILE"
  if [[ "$FILE" == *.ts || "$FILE" == *.tsx ]]; then
    pnpm eslint --fix "$FILE" 2>/dev/null
    pnpm prettier --write "$FILE" 2>/dev/null
  fi
fi
```

### 4.6 Permission Management

**`.claude/settings.json`**
```json
{
  "permissions": {
    "allow": [
      "pnpm test", "pnpm build", "pnpm lint", "pnpm prettier",
      "git status", "git diff", "git log", "git branch",
      "git checkout", "git add", "git commit", "git push",
      "cat *", "ls *", "find *", "grep *"
    ],
    "deny": [
      "rm -rf /", "sudo *", "chmod 777 *"
    ]
  },
  "model": "opus",
  "thinking": true
}
```

### 4.7 MCP Server Configuratie

**`.mcp.json`**
```json
{
  "servers": {
    "slack": {
      "command": "npx",
      "args": ["@anthropic/mcp-server-slack"],
      "env": { "SLACK_BOT_TOKEN": "${SLACK_BOT_TOKEN}" }
    },
    "github": {
      "command": "npx",
      "args": ["@anthropic/mcp-server-github"],
      "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" }
    },
    "postgres": {
      "command": "npx",
      "args": ["@anthropic/mcp-server-postgres"],
      "env": { "DATABASE_URL": "${DATABASE_URL}" }
    },
    "figma": {
      "command": "npx",
      "args": ["@anthropic/mcp-server-figma"]
    }
  }
}
```

| MCP Server | Wat Claude ermee kan |
|------------|---------------------|
| Slack | Berichten zoeken/posten, channels |
| GitHub | Issues, PRs, code search |
| PostgreSQL | Queries, schema inspectie |
| Figma | Designs ophalen, tokens extraheren |

### 4.8 Warp-Specifieke Features

**Agent Profiles** (per taaktype):

| Profiel | Model | Autonomie | Gebruik |
|---------|-------|-----------|---------|
| `spec-writer` | Opus 4.5 | Laag (altijd vragen) | Specs schrijven |
| `frontend-dev` | Sonnet 4.5 | Medium (agent beslist) | UI componenten |
| `backend-dev` | Sonnet 4.5 | Medium | APIs & services |
| `reviewer` | Opus 4.5 | Laag (alleen lezen) | Code review |
| `tester` | Haiku 4.5 | Hoog (autonoom) | Tests schrijven |

**Parallelle Development met Git Worktrees:**

```bash
# Elke agent werkt in een geïsoleerde worktree
cd /project && git worktree add ../project-settings feature/settings
cd /project && git worktree add ../project-payments feature/payments

# Tab 1: Backend Settings
cd ../project-settings && warp agent run \
  "Lees @context/specs/settings/SPEC.md en implementeer database schema" \
  --profile backend-dev

# Tab 2: Frontend Settings (parallel)
# Tab 3: Tests
# Tab 4: Integration
# Tab 5: Review
```

**Warp Planning:**
- `/plan` command voor spec-driven development
- Plannen opslaan en aan PRs koppelen
- `/init` voor project bootstrap met WARP.md

### 4.9 Verificatie Loops (Non-Negotiable)

| Domein | Verificatie Methode |
|--------|---------------------|
| Backend API | Run tests, curl endpoints |
| Frontend UI | Browser test via Chrome extension |
| Database | Query verification |
| Integrations | Mock server responses |
| Full feature | E2E test suite |

```
┌──────────────────────────────────────────────────────────┐
│  1. Claude implementeert feature                          │
│  2. Claude runt verificatie (tests, browser, etc.)        │
│  3. Als het faalt → Claude itereert                       │
│  4. Herhaal tot verificatie slaagt                        │
│  5. Pas dan: PR maken                                     │
│                                                            │
│  Resultaat: 2-3x betere kwaliteit                         │
└──────────────────────────────────────────────────────────┘
```

### 4.10 Van Spec naar Code: Handoff

```
1. SPEC.md status = APPROVED
2. Open Warp/Claude Code, check CLAUDE.md is actueel
3. Planning mode (Shift+Tab+Tab of Warp /plan):
   "Lees @context/specs/[component]/SPEC.md en maak implementatieplan"
4. Review plan, pas aan tot correct
5. Switch naar auto-accept, implementeer
6. Run /verify → itereer tot succes
7. Run /review → security check
8. Run /pr → commit + push + PR
9. Update CLAUDE.md met geleerde lessen
```

### 4.11 Parallelle Development Per Laag

```
Laag 1: Componenten zonder afhankelijkheden → parallel starten
        └── Elke component in eigen git worktree
        └── Backend + frontend per component parallel

Laag 2: Na merge Laag 1 → volgende laag starten
        └── Kan pas starten als afhankelijkheden gemerged zijn

Laag N: Herhaal tot alles gebouwd is
```

### 4.12 Dagelijkse Workflow

```
SESSIE START:
1. Lees context/project/scratchpad.md (waar gebleven?)
2. Lees context/project/progress.md (overall status)
3. Open 5 terminal tabs in Warp

TIJDENS SESSIE:
4. Start agents met juiste profiel per tab
5. Planning mode voor elke nieuwe taak
6. Run /verify voor je PRs maakt
7. Update progress.md bij elke afgeronde taak

SESSIE EINDE:
8. Update scratchpad.md (waar gebleven, open vragen, let-ops)
9. Update CLAUDE.md bij elke fout
10. Context library bijwerken bij scope changes
```

### 4.13 Orchestrator Pattern

Bij 25+ modules met onderlinge afhankelijkheden is handmatige aansturing niet schaalbaar. Het orchestrator-pattern introduceert een coördinatielaag: één orchestrator-agent die het werk verdeelt, afhankelijkheden bewaakt, en alleen escaleert naar de mens bij beslissingen die niet in de specs staan.

```
┌─────────────────────────────────────────────────────────────────┐
│                     ERIK (Product Owner)                         │
│         Beslissingen · Reviews · Escalaties                     │
└────────────────────────────┬────────────────────────────────────┘
                             │ escalaties + status updates
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   ORCHESTRATOR AGENT                             │
│  Model: claude-opus-4-5-20251101 (planning + coördinatie)       │
│                                                                  │
│  Leest:                                                          │
│  ├── context/project/dependency-graph.md                        │
│  ├── context/project/contract-registry.md                       │
│  ├── context/project/progress.md                                │
│  ├── context/project/scratchpad.md                              │
│  └── context/components/_build-order.md                         │
│                                                                  │
│  Doet:                                                           │
│  ├── Taakplanning op basis van dependency graph                 │
│  ├── Worker agents spawnen met geïsoleerde context              │
│  ├── Contract compliance bewaken                                │
│  ├── Voortgang bijhouden in progress.md                         │
│  ├── Conflicten detecteren tussen workers                       │
│  └── Escaleren naar Erik bij architectuurkeuzes                 │
│                                                                  │
│  Doet NIET:                                                      │
│  ├── Zelf code schrijven                                        │
│  ├── API-contracten wijzigen zonder escalatie                   │
│  └── Architectuurkeuzes maken buiten de specs                   │
└──────┬──────────┬──────────┬──────────┬──────────┬──────────────┘
       │          │          │          │          │
       ▼          ▼          ▼          ▼          ▼
┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌──────────┐
│ Worker 1 ││ Worker 2 ││ Worker 3 ││ Worker 4 ││ Worker 5 │
│ Module A ││ Module B ││ Module C ││ Module D ││ Module E │
│          ││          ││          ││          ││          │
│ Leest:   ││ Leest:   ││          ││          ││          │
│ - SPEC.md││ - SPEC.md││   ...    ││   ...    ││   ...    │
│ - Portal ││ - Portal ││          ││          ││          │
│ - Contra-││ - Contra-││          ││          ││          │
│   cten   ││   cten   ││          ││          ││          │
│          ││          ││          ││          ││          │
│ Worktree ││ Worktree ││ Worktree ││ Worktree ││ Worktree │
└──────────┘└──────────┘└──────────┘└──────────┘└──────────┘
     │            │            │           │           │
     └────────────┴────────────┴───────────┴───────────┘
                          │
                    git merge → main
```

**Waarom geen framework (claude-flow)?**

Frameworks als claude-flow bieden swarm-orchestratie met queen agents, distributed memory, en consensus protocols. Maar ze introduceren ook hun eigen complexiteit: installatie, configuratie, debugging van het framework zelf. Ons orchestrator-pattern gebruikt wat we al hebben — CLAUDE.md, context library, scratchpad — aangevuld met drie specifieke bestanden:

1. **Dependency Graph** — welke module wat aanbiedt en nodig heeft
2. **Contract Registry** — gedeelde interfaces die niet mogen wijzigen
3. **Orchestrator Protocol** — spelregels voor taakverdeling en escalatie

### 4.14 Dependency Graph (`context/project/dependency-graph.md`)

De dependency graph is het navigatieinstrument van de orchestrator. Het bepaalt welke modules parallel kunnen, welke moeten wachten, en waar conflicten kunnen ontstaan.

```markdown
# Dependency Graph — Branddock

**Laatste update:** YYYY-MM-DD
**Beheerder:** Orchestrator Agent

---

## Module Overzicht

| Module | Biedt aan (provides) | Heeft nodig (requires) | Laag |
|--------|---------------------|----------------------|------|
| Auth & Users | user-context, permission-check | — | 1 |
| Workspace | workspace-config, tenant-context | user-context | 1 |
| Settings | user-prefs, notification-config | user-context, workspace-config | 2 |
| Kennisbibliotheek | knowledge-items, search-index | workspace-config, permission-check | 2 |
| Strategie Generator | strategy-data, brand-profile | knowledge-items, workspace-config | 3 |
| Betaalmodule | subscription-status, quota-check | user-context, workspace-config | 2 |
| API Koppelingen | external-data, sync-status | workspace-config, subscription-status | 3 |
| Content Generator | generated-content | strategy-data, knowledge-items, quota-check | 4 |
| ... | ... | ... | ... |

## Laag Berekening

Laag = 1 + max(laag van alle requires)

```
Laag 1: Auth & Users, Workspace             ← geen afhankelijkheden, start direct
Laag 2: Settings, Kennis, Betaalmodule       ← wacht op Laag 1
Laag 3: Strategie, API Koppelingen           ← wacht op Laag 2
Laag 4: Content Generator                    ← wacht op Laag 3
Laag 5: ...                                  ← wacht op Laag 4
```

## Kritieke Paden

Het langste pad door de graph bepaalt de minimale doorlooptijd:

```
Auth → Workspace → Kennisbibliotheek → Strategie Generator → Content Generator
  L1       L1              L2                   L3                    L4
```

Modules buiten het kritieke pad (bijv. Betaalmodule, Settings) kunnen vertragen zonder de totale doorlooptijd te beïnvloeden — mits hun interfaces op tijd beschikbaar zijn.

## Circulaire Afhankelijkheden

⚠️ ALS twee modules elkaar nodig hebben, is er een circulaire afhankelijkheid. Oplossing: definieer een interface-contract zodat beide modules onafhankelijk gebouwd kunnen worden tegen het contract.

| Module A | Module B | Opgelost via |
|----------|----------|-------------|
| [indien van toepassing] | | |

## Visualisatie

```
Auth ─────► Workspace ─────► Kennisbibliotheek ─────► Strategie ─────► Content
  │              │                    │                     │
  │              ├────► Settings      │                     │
  │              │                    │                     │
  │              ├────► Betaalmodule ─┤                     │
  │              │         │          │                     │
  │              │         ▼          │                     │
  │              └────► API Koppelingen                     │
  │                                                         │
  └── user-context wordt door ALLES gelezen ───────────────┘
```
```

**Gebruik:** De orchestrator leest dit bestand bij sessie-start en na elke merge naar main. Bij elke nieuwe module of gewijzigde afhankelijkheid wordt de graph bijgewerkt.

### 4.15 Contract Registry (`context/project/contract-registry.md`)

Het contract registry definieert de gedeelde interfaces tussen modules. Deze contracten zijn **immutable tijdens development** — wijzigingen vereisen escalatie naar Erik en een ADR.

```markdown
# Contract Registry — Branddock

**Laatste update:** YYYY-MM-DD
**Beheerder:** Orchestrator Agent
**Regel:** Geen worker mag een contract wijzigen. Wijzigingen alleen via escalatie + ADR.

---

## Overzicht

| Contract ID | Naam | Aanbieder | Afnemers | Status |
|------------|------|-----------|----------|--------|
| CTR-001 | UserContext | Auth & Users | Alle modules | ✅ Definitief |
| CTR-002 | PermissionCheck | Auth & Users | Alle modules | ✅ Definitief |
| CTR-003 | WorkspaceConfig | Workspace | Settings, Kennis, Strategie, ... | ✅ Definitief |
| CTR-004 | SubscriptionStatus | Betaalmodule | API Koppelingen, Content Gen | ✅ Definitief |
| CTR-005 | KnowledgeItems | Kennisbibliotheek | Strategie Generator, Content | 🔄 Draft |
| ... | ... | ... | ... | ... |

---

## Contract Definities

### CTR-001: UserContext

**Aanbieder:** Auth & Users
**Afnemers:** Alle modules
**Type:** Synchrone functie-aanroep

```typescript
interface UserContext {
  userId: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  workspaceId: string;
  permissions: Permission[];
  subscription: {
    plan: 'free' | 'starter' | 'pro' | 'enterprise';
    status: 'active' | 'trialing' | 'past_due' | 'canceled';
  };
}

// Hoe af te nemen:
function getCurrentUser(): Promise<UserContext>;
```

**Validatieregels:**
- userId is altijd een non-empty string (UUID v4)
- workspaceId is altijd aanwezig na onboarding
- permissions array kan leeg zijn (= geen expliciete permissies)

---

### CTR-002: PermissionCheck

**Aanbieder:** Auth & Users
**Afnemers:** Alle modules
**Type:** Synchrone functie-aanroep

```typescript
interface PermissionCheckRequest {
  userId: string;
  resource: string;      // bijv. 'strategy:123', 'knowledge:456'
  action: 'read' | 'write' | 'delete' | 'admin';
}

interface PermissionCheckResponse {
  allowed: boolean;
  reason?: string;       // alleen bij allowed: false
}

function checkPermission(req: PermissionCheckRequest): Promise<PermissionCheckResponse>;
```

---

### CTR-003: WorkspaceConfig
[Analoog uitwerken per module]

### CTR-004: SubscriptionStatus
[Analoog uitwerken per module]

### CTR-NNN: [Volgende contract]
[Template: dezelfde structuur als hierboven]

---

## Wijzigingsproces

```
Worker detecteert dat contract niet past
        │
        ▼
Worker STOPT en rapporteert aan Orchestrator
        │
        ▼
Orchestrator analyseert impact:
├── Hoeveel modules geraakt?
├── Is het een breaking change?
└── Kan het backwards-compatible?
        │
        ▼
Orchestrator escaleert naar Erik met:
├── Huidige contract definitie
├── Voorgestelde wijziging
├── Impact analyse
└── Aanbeveling
        │
        ▼
Erik beslist → ADR wordt aangemaakt
        │
        ▼
Orchestrator update contract + notificeert alle workers
```
```

### 4.16 Orchestrator Protocol (`context/project/orchestrator-protocol.md`)

Het protocol definieert hoe de orchestrator werkt: wanneer taken worden verdeeld, hoe voortgang wordt bewaakt, en wanneer wordt geëscaleerd.

```markdown
# Orchestrator Protocol — Branddock

**Laatste update:** YYYY-MM-DD

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
Workers worden alleen gestart voor modules waarvan ALLE afhankelijkheden (requires) al gemerged zijn naar main. De laag wordt bepaald door de dependency graph.

### Regel 2: Maximaal 5 parallelle workers
Niet meer dan 5 workers tegelijk (= 5 Warp terminal tabs). Bij 25 modules betekent dit 5 rondes van 5.

### Regel 3: Kritiek pad heeft prioriteit
Modules op het kritieke pad krijgen voorrang. Modules buiten het kritieke pad worden ingepland als er workers beschikbaar zijn.

### Regel 4: Contract-first
Voordat een worker begint met een module, controleert de orchestrator of alle benodigde contracten (requires) beschikbaar en definitief zijn.

### Regel 5: Smallest first binnen dezelfde laag
Bij gelijke prioriteit krijgen kleinere modules voorrang — dit maximaliseert de throughput en maakt sneller workers vrij voor grotere modules.

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

### 4. Communicatie Tussen Workers

Workers communiceren NOOIT direct met elkaar. Alle communicatie loopt via:

```
Worker A ──rapport──► Orchestrator ──opdracht──► Worker B
```

Als Worker A ontdekt dat Module B's interface anders is dan verwacht:
1. Worker A STOPT
2. Worker A rapporteert aan Orchestrator
3. Orchestrator checkt contract registry
4. Orchestrator beslist: contract-breuk (→ escalatie) of worker-fout (→ correctie)

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

Na elke worker-output voert de orchestrator een verificatieronde uit:

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
5. Merge Checkpoint (zie §4.18 Rollback Protocol):
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
11. Orchestrator schrijft samenvatting voor Erik:
    - Wat is af
    - Wat loopt
    - Wat is geblokkeerd
    - Aanbevolen focus voor morgen
```
```

### 4.17 Orchestrator Agent Definitie

Bestand: `.claude/agents/orchestrator.md`

```markdown
---
name: orchestrator
model: claude-opus-4-5-20251101
tools: Read, Bash, Grep, Glob
---

Je bent de orchestrator voor Branddock. Je coördineert worker agents
die parallel modules bouwen.

## Jouw bestanden (lees bij sessie-start)
- context/project/dependency-graph.md
- context/project/contract-registry.md  
- context/project/orchestrator-protocol.md
- context/project/progress.md
- context/project/scratchpad.md

## Regels
1. Je schrijft NOOIT zelf code
2. Je wijzigt NOOIT contracten zonder escalatie naar Erik
3. Je start NOOIT een worker voor een module waarvan de requires niet gemerged zijn
4. Je escaleert ALTIJD bij ambigue specs
5. Je update ALTIJD progress.md na elke merge
6. Maximaal 5 workers tegelijk
7. NOOIT een tweede merge als het vorige merge checkpoint nog niet geslaagd is
8. Bij cascade rollback (Niveau 3+): STOP alle workers, escaleer naar Erik

## Bij sessie-start
1. Lees bovenstaande bestanden
2. Bepaal welke modules klaar zijn om te starten (alle requires gemerged)
3. Prioriteer: kritiek pad eerst, dan smallest first
4. Spawn workers met gefocuste context
5. Rapporteer plan aan Erik

## Bij worker-oplevering
1. Run verificatieronde (tests, contract compliance, regressies)
2. Bij succes: merge → merge checkpoint → update graph → check nieuwe modules
3. Bij falen: analyseer oorzaak → terug naar worker of escalatie
4. Bij merge checkpoint fail: STOP, geen volgende merge tot opgelost

## Bij rollback
Volg het rollback protocol (§4.18). Gebruik de beslisboom om het juiste niveau te bepalen.
Niveau 1-2: handel zelfstandig af. Niveau 3-4: escaleer ALTIJD naar Erik.

## Bij escalatie
Gebruik het escalatie-format uit orchestrator-protocol.md.
Wacht op Erik's beslissing. Pauzeer de geblokkeerde worker, ga door met andere workers.
```

### 4.18 Rollback Protocol

Het orchestrator-pattern beschrijft hoe werk vooruit gaat — maar bij 5 parallelle workers die mergen naar main kan een fout pas na meerdere merges ontdekt worden. Dit protocol definieert hoe je gecontroleerd terugdraait.

```markdown
# Rollback Protocol — Branddock

---

## 1. Rollback Niveaus

### Niveau 1: Worker Rollback (lichtst)
**Wanneer:** Een worker levert iets op dat tests faalt of niet contract-compliant is, VOORDAT het gemerged is.
**Actie:** Worker herstelt in eigen worktree. Geen impact op main of andere workers.
**Wie beslist:** Orchestrator (automatisch)

### Niveau 2: Single Merge Rollback
**Wanneer:** Een fout wordt ontdekt in main NA merge van één worker, maar VOORDAT andere workers op deze merge hebben voortgebouwd.
**Actie:**
1. Orchestrator stopt alle workers die afhankelijk zijn van de foutieve module
2. `git revert <merge-commit>` op main
3. Worker krijgt teruggestuurde taak met foutbeschrijving
4. Na fix: opnieuw verificatie → merge
5. Gestopte workers hervatten na succesvolle re-merge
**Wie beslist:** Orchestrator (automatisch)

### Niveau 3: Cascade Rollback
**Wanneer:** Een fout wordt ontdekt NADAT andere workers al verder hebben gebouwd op de foutieve merge. Meerdere merges zijn besmet.
**Actie:**
1. Orchestrator STOPT ALLE workers onmiddellijk
2. Orchestrator identificeert de "besmettingsketen":
   - Welke merge introduceerde de fout?
   - Welke latere merges zijn afhankelijk van die fout?
   - Welke merges zijn NIET geraakt (onafhankelijke modules)?
3. Orchestrator escaleert naar Erik met:
   - Besmettingsketen visualisatie
   - Lijst van reverts nodig
   - Geschatte impact (verloren werk in uren/merges)
   - Aanbeveling: revert-all vs. fix-forward
4. Erik beslist de strategie
5. Na beslissing: orchestrator voert reverts uit en herstart workers
**Wie beslist:** Erik (altijd escalatie)

### Niveau 4: Architecture Rollback (zwaarst)
**Wanneer:** Een fundamentele ontwerpkeuze blijkt fout — bijv. een contract dat niet werkbaar is, een database schema dat niet schaalt, of een dependency die de verkeerde richting op gaat.
**Actie:**
1. Alle workers stoppen
2. ADR aanmaken voor de nieuwe richting
3. Dependency graph en contract registry bijwerken
4. Alle getroffen specs herzien
5. Getroffen worktrees archiveren (niet verwijderen)
6. Verse worktrees aanmaken voor de nieuwe aanpak
**Wie beslist:** Erik (altijd escalatie + ADR)

---

## 2. Rollback Beslisboom

```
Fout ontdekt
    │
    ▼
Is het al gemerged naar main?
├── Nee → Niveau 1 (worker fix in worktree)
└── Ja
    │
    ▼
    Hebben andere modules op deze merge voortgebouwd?
    ├── Nee → Niveau 2 (single revert)
    └── Ja
        │
        ▼
        Is het een code-fout of een architectuur-fout?
        ├── Code-fout → Niveau 3 (cascade revert, escalatie)
        └── Architectuur-fout → Niveau 4 (ADR + herstart)
```

---

## 3. Preventie: Merge Checkpoints

Om cascade rollbacks te minimaliseren, voert de orchestrator na elke merge een checkpoint uit:

```
Na merge van Module X:
1. Run ALLE tests (niet alleen Module X)
2. Check contract compliance voor alle modules die X als dependency hebben
3. Smoke test: start de applicatie, check dat alle routes laden

Checkpoint PASS → ga door met volgende workers
Checkpoint FAIL → STOP, identificeer oorzaak VOORDAT volgende worker merged
```

Regel: er wordt NOOIT een tweede merge gedaan als het vorige checkpoint nog niet geslaagd is. Dit beperkt cascade rollbacks tot maximaal 1 merge diep.

---

## 4. Worktree Hygiëne

- Worktrees worden NOOIT verwijderd tot de module volledig geaccepteerd is
- Bij rollback: worktree blijft bestaan als referentie
- Archief-conventie: `git worktree move` naar `_archived/[module]-[datum]`
- Na succesvolle launch: alle gearchiveerde worktrees mogen opgeruimd worden
```

### 4.19 Toekomstige Overwegingen

De volgende uitbreidingen zijn bewust nog niet toegevoegd, maar worden op een specifiek moment heroverwogen:

| Uitbreiding | Heroverwegen wanneer | Rationale |
|-------------|---------------------|-----------|
| **MCP Server voor Context Library** | Halverwege Fase 2 (als we ~50+ bestanden hebben) | Navigatie via indexes kan dan stroef worden; een MCP tool geeft de orchestrator gerichte file-access |
| **`/check-contracts` Slash Command** | Start Fase 4 (als contracten definitief zijn) | Automatische TypeScript interface-vergelijking na elke worker-oplevering; vult het gat dat de orchestrator nu handmatig controleert |

---

## FASE 5: Launch & Polish

### 5.1 Focus

- E2E testing + load testing
- Security hardening + audit
- Performance optimalisatie
- Documentatie
- Deployment + monitoring

### 5.2 Parallelle Streams

```
Tab 1-2: E2E tests + load tests
Tab 3:   Security hardening
Tab 4:   Documentatie
Tab 5:   Deployment + monitoring
```

---

## 6. Hoe Agents de Context Library Gebruiken

```bash
# === SESSIE START ===
# Lees scratchpad om te weten waar je gebleven bent
"Lees @context/project/scratchpad.md — waar waren we gebleven?"

# === NAVIGATIE VIA PORTALS ===
# Alles over één component vinden via portal
"Lees @context/components/betaalmodule.md — geef me alle context voor dit component"

# === SPECIFICATIES ===
# Spec lezen voor implementatie
"Lees @context/specs/settings/SPEC.md en implementeer het database schema"

# === RELATIES ===
# Relaties checken
"Welke events moet ik afhandelen? Check @context/components/_relations.md"

# === BESLISSINGEN ===
# Beslissing opzoeken
"Waarom gebruiken we Mollie? Check @context/decisions/_log.md"
# Architectuurbeslissing opzoeken
"Lees @context/adr/ADR-002-payment-provider.md voor de rationale"

# === UI ===
# UI requirements vinden
"Hoe moet dit scherm eruitzien? Check @context/screens/04-settings-profile.md"

# === BUSINESS RULES ===
# Business rules checken
"Welke limieten gelden per plan? Check @context/reference/business-rules.md"

# === SESSIE EINDE ===
# Scratchpad bijwerken
"Update @context/project/scratchpad.md met wat we vandaag gedaan hebben"
# Progress bijwerken
"Update @context/project/progress.md — markeer SCR-05 als compleet"

# === ORCHESTRATOR ===
# Dependency graph checken
"Lees @context/project/dependency-graph.md — welke modules kunnen nu starten?"
# Contract opzoeken
"Check @context/project/contract-registry.md — wat is de interface voor CTR-001 UserContext?"
# Escalatie schrijven
"Schrijf escalatie conform format in @context/project/orchestrator-protocol.md"
```

---

## 7. Complete Directory Structuur

```
project/
│
├── CLAUDE.md                          # = WARP.md (gegenereerd uit context/)
│
├── .claude/
│   ├── commands/                      # Slash commands
│   │   ├── pr.md
│   │   ├── test.md
│   │   ├── review.md
│   │   ├── verify.md
│   │   ├── sync-figma.md
│   │   └── spec-interview.md
│   ├── agents/                        # Subagents
│   │   ├── orchestrator.md            # ★ Orchestrator Agent
│   │   ├── code-simplifier.md
│   │   ├── verifier.md
│   │   └── security-reviewer.md
│   ├── hooks/
│   │   └── post-tool-use.sh           # Auto-formatting
│   └── settings.json                  # Permissions
│
├── .mcp.json                          # MCP servers (Slack, GitHub, etc.)
│
├── context/                           # ★ DE CONTEXT LIBRARY ★
│   ├── _index.md
│   ├── screens/                       # Fase 1
│   │   ├── _overview.md
│   │   ├── 01-*.md ... NN-*.md
│   │   └── screenshots/
│   ├── features/                      # Fase 1→2
│   │   ├── _registry.md
│   │   └── unassigned.md
│   ├── components/                    # Fase 2
│   │   ├── _overview.md
│   │   ├── _relations.md
│   │   ├── _build-order.md
│   │   └── [component-naam].md        # ★ Component Portals
│   ├── specs/                         # Fase 3
│   │   ├── [component]/SPEC.md
│   │   ├── [component]/decisions.md
│   │   ├── [component]/open-questions.md
│   │   └── _cross-validation.md
│   ├── decisions/                     # Doorlopend (snelle keuzes)
│   │   ├── _log.md
│   │   └── DDD-[naam].md
│   ├── adr/                           # ★ Architecture Decision Records
│   │   ├── _index.md
│   │   └── ADR-NNN-[naam].md
│   ├── reference/                     # Achtergrond
│   │   ├── tech-stack.md
│   │   ├── design-system.md
│   │   ├── user-roles.md
│   │   ├── business-rules.md
│   │   └── glossary.md
│   └── project/                       # Meta
│       ├── werkwijze.md
│       ├── progress.md                # ★ Progress Tracker (agent-bijgehouden)
│       ├── scratchpad.md              # ★ Agent Werkgeheugen
│       ├── dependency-graph.md        # ★ Module afhankelijkheden (orchestrator)
│       ├── contract-registry.md       # ★ Gedeelde interfaces (immutable)
│       ├── orchestrator-protocol.md   # ★ Spelregels taakverdeling & escalatie
│       └── changelog.md
│
└── src/                               # Broncode (Fase 4)
    ├── app/
    ├── components/
    ├── lib/
    ├── services/
    └── types/
```

---

## 8. Aanvullende Templates

### 8.1 Architecture Decision Record (`context/adr/ADR-NNN-[naam].md`)

Gebaseerd op de Michael Nygard / AWS best practice. ADRs zijn formeler dan de quick decisions in `decisions/_log.md` en worden gebruikt voor architectuur-keuzes die meerdere componenten raken.

```markdown
# ADR-NNN: [Titel van de beslissing]

**Status:** Proposed / Accepted / Deprecated / Superseded by ADR-XXX
**Datum:** YYYY-MM-DD
**Eigenaar:** [Wie is verantwoordelijk]

## Context
[Wat is de situatie? Welk probleem moeten we oplossen?
Welke krachten beïnvloeden deze beslissing? (technisch, business, team)]

## Overwogen Alternatieven
### Optie A: [naam]
- **Voordelen:** ...
- **Nadelen:** ...
- **Geschatte effort:** ...

### Optie B: [naam]
- **Voordelen:** ...
- **Nadelen:** ...
- **Geschatte effort:** ...

## Beslissing
[Welke optie kiezen we en waarom?
Focus op het "waarom" — niet het "hoe"]

## Consequenties
### Positief
- ...
### Negatief
- ...
### Risico's
- ...

## Compliance
[Relevante standaarden, regelgeving, of veiligheidseisen]

## Gerelateerd
- Features: [F-IDs]
- Componenten: [namen]
- Andere ADRs: [ADR-XXX]
```

### 8.2 Scratchpad Template (`context/project/scratchpad.md`)

De scratchpad is het werkgeheugen van de AI agent — geïnspireerd door hoe Manus, Claude Code, en andere agent-systemen context beheren over langere taken. Na elke sessie update de agent de scratchpad met de huidige status, zodat de volgende sessie direct kan beginnen waar de vorige stopte.

```markdown
# Scratchpad — Agent Werkgeheugen

**Laatste update:** YYYY-MM-DD HH:MM
**Huidige fase:** [Fase 1/2/3/4/5]
**Actieve taak:** [Wat wordt er nu gedaan]

---

## Huidige Sessie
### Doel
[Wat willen we deze sessie bereiken]

### Voortgang
- [x] Stap 1 gereed
- [x] Stap 2 gereed
- [ ] Stap 3 — BEZIG
- [ ] Stap 4

### Open Vragen (deze sessie)
- [ ] Vraag 1 → nog bespreken met Erik
- [x] Vraag 2 → opgelost: [antwoord]

### Problemen & Workarounds
- [Probleem]: [Hoe opgelost of waarom uitgesteld]

---

## Context voor Volgende Sessie
### Waar gebleven
[Kort: wat is gedaan, wat is de volgende stap]

### Bestanden gewijzigd
- context/screens/05-knowledge.md — nieuwe analyse
- context/features/_registry.md — F-045 t/m F-052 toegevoegd

### Beslissingen genomen
- D-012: [korte omschrijving]

### Let op
- [Waarschuwingen, gotchas, of dingen die de volgende agent moet weten]
```

**Gebruik:** Bij elke `/clear` of sessie-wissel schrijft de agent de scratchpad bij. Bij elke sessie-start leest de agent `scratchpad.md` + `_index.md` om de huidige context op te pakken.

### 8.3 Progress Tracker (`context/project/progress.md`)

Geïnspireerd door de Manus `todo.md` aanpak — een levend overzicht dat bij elke actie bijgewerkt wordt om goal drift te voorkomen.

```markdown
# Progress Tracker — Branddock

**Laatste update:** YYYY-MM-DD

## Fase Overzicht
| Fase | Status | Voortgang | Deadline |
|------|--------|-----------|----------|
| 0. Setup | ✅ Done | 100% | — |
| 1. Screenshots | 🔄 In Progress | 35% | — |
| 2. Componenten | ⬜ Not Started | 0% | — |
| 3. Specs | ⬜ Not Started | 0% | — |
| 4. Code | ⬜ Not Started | 0% | — |
| 5. Launch | ⬜ Not Started | 0% | — |

## Huidige Sprint / Focus
### Fase 1: Screenshot Inventarisatie
- [x] SCR-01 Workspace Dashboard
- [x] SCR-02 Strategy Overview
- [ ] SCR-03 Knowledge Library ← CURRENT
- [ ] SCR-04 Settings Profile
- [ ] ...

## Blokkades
| # | Blokkade | Impact | Actie nodig |
|---|----------|--------|-------------|
| 1 | Figma export ontbreekt | SCR-07 niet analyseerbaar | Erik levert aan |

## Metrics
- Schermen geanalyseerd: 5/31
- Features ontdekt: 52
- Beslissingen genomen: 7
- Open vragen: 12
```

---

## 9. Bevindingen uit Onderzoek

Op basis van onderzoek naar hoe andere teams complexe applicaties bouwen met AI-agents, zijn de volgende verbeteringen en bevestigingen geïdentificeerd.

### 9.1 Wat We Al Goed Doen ✅

| Practice | Bron | Status in v4 |
|----------|------|-------------|
| **CLAUDE.md als levend document** | Anthropic docs, Claude Code Best Practices | ✅ Volledig |
| **Planning mode voor implementatie** | Addyosmani.com, meerdere bronnen | ✅ Volledig |
| **Subagents met gescheiden context** | Anthropic docs, Claude Code Subagents | ✅ Volledig |
| **Slash commands voor herhaalde taken** | Claude Code docs, community practices | ✅ Volledig |
| **Verificatie loops voor elke PR** | Boris Cherny, Claude Code Best Practices | ✅ Volledig |
| **Spec-first development** | GitHub Spec Kit, Addyosmani, Haberlah | ✅ Volledig |
| **Feature registry met IDs** | Eigen aanpak, bevestigd door PRD-literature | ✅ Volledig |
| **Context library in markdown** | Breed gedragen: Claude Code, Cursor, Windsurf allemaal markdown-gebaseerd | ✅ Volledig |
| **Parallelle development met worktrees** | Boris Cherny, meerdere practitioners | ✅ Volledig |

### 9.2 Wat Toegevoegd Is 🆕

#### A. Architecture Decision Records (ADR)

**Waarom:** Onze `decisions/_log.md` is goed voor snelle keuzes, maar voor grotere architectuurkeuzes die meerdere componenten raken (database keuze, auth strategie, payment provider) is een formeler format nodig. ADRs worden breed gedragen door AWS, Google Cloud, Microsoft Azure en de open-source community.

**Wat het toevoegt:** Gestructureerde vastlegging van alternatieven, rationale, en consequenties. Onmisbaar voor wanneer een ontwikkelaar (of agent) zich afvraagt "waarom is dit zo gebouwd?"

**Gebruik:** `decisions/_log.md` voor dagelijkse keuzes (snelheid over uitgebreidheid). `adr/` voor fundamentele architectuurkeuzes die de komende maanden niet veranderen.

#### B. Component Portal Pages

**Waarom:** De fase-gebaseerde structuur is juist (je kent in Fase 1 de componenten nog niet), maar zodra componenten bestaan wil je als mens of agent snel alles over één component vinden. Het portalsysteem lost dit op zonder bestanden te dupliceren.

**Wat het toevoegt:** Per component één bestand dat linkt naar relevante schermen, features, specs, beslissingen, en implementatiestatus.

#### C. Agent Scratchpad

**Waarom:** Uit onderzoek naar Manus (de `todo.md` techniek), Claude Code's auto-compact, en LangChain's context engineering blijkt dat AI agents die hun plan expliciet opschrijven en bijhouden significant minder goal drift vertonen. Bij langlopende taken is dit essentieel.

**Wat het toevoegt:** Werkgeheugen dat persisteert tussen sessies. Voorkomt dat bij `/clear` of context overflow kennis verloren gaat.

#### D. Progress Tracker met Metrics

**Waarom:** De `todo.md` techniek van Manus — continu bijwerken van een takenlijst — voorkomt dat het model afdwaalt van het doel. Meerdere bronnen bevestigen dat dit de meest effectieve methode is tegen "lost-in-the-middle" problemen.

**Wat het toevoegt:** Concreet voortgangsoverzicht met percentages, blokkades, en metrics dat door de agent zelf bijgehouden wordt.

#### E. Orchestrator Pattern (v4.2)

**Waarom:** Bij 25+ modules met onderlinge afhankelijkheden is handmatige aansturing niet schaalbaar. Oorspronkelijk was dit als "overkill" beoordeeld voor 7 modules en 5 terminals, maar de werkelijke schaal van Branddock (25 modules, complexe dependency chains, puur AI-agents, maximale snelheid gewenst) maakt een coördinatielaag noodzakelijk.

**Wat het toevoegt:** Drie nieuwe bestanden die samen het orchestrator-patroon vormen:
- **Dependency Graph** — welke module wat aanbiedt en nodig heeft, automatische laagberekening, kritiek pad analyse
- **Contract Registry** — gedeelde TypeScript interfaces die immutable zijn tijdens development, wijzigingen alleen via escalatie + ADR
- **Orchestrator Protocol** — taakverdelingsregels, communicatieregels (workers praten nooit direct), escalatieprotocol met gelaagd model

**Bewuste keuze: patroon boven framework.** We gebruiken geen claude-flow of andere swarm-frameworks. In plaats daarvan bouwen we het orchestrator-gedrag in met wat we al hebben (CLAUDE.md, context library, subagents) aangevuld met de drie bovenstaande bestanden. Dit vermijdt framework-overhead en houdt alles in markdown — doorzoekbaar voor mens én AI.

### 9.3 Overwogen maar (nog) Niet Toegevoegd

| Practice | Reden om niet toe te voegen |
|----------|---------------------------|
| **Claude-Flow / External frameworks** | Het orchestrator-*patroon* is toegevoegd (v4.2), maar als intern protocol — niet als extern framework. Claude-flow e.d. introduceren eigen complexiteit (installatie, debugging, versioning) die we vermijden door alles in markdown te houden. |
| **PRD-as-prompt (ChatPRD style)** | Onze SPEC.md is al spec-first en AI-geoptimaliseerd. Een apart PRD-format voegt duplicatie toe. |
| **Progressive disclosure skills** | Relevant als we meer dan 10 skills krijgen. Nu is onze context library klein genoeg voor directe referentie. |
| **MCP server voor context library** | Zou de context library beschikbaar maken als tool voor Claude. Overwegen in Fase 4 als de library groot genoeg is. |
| **RAG over context library** | Bij >100 bestanden nuttig. Nu vindt navigatie via index-bestanden prima werkt. |
| **Separate AGENTS.md + progress.md (AGENTS.md MCP style)** | Dit pattern comprimeert alles naar twee bestanden. Wij hebben meer granulariteit nodig via onze folder-structuur. |

### 9.4 Aangescherpte Principes

Op basis van het onderzoek zijn de volgende principes toegevoegd aan sectie 1.2:

| Principe | Wat het betekent |
|----------|-----------------|
| **Scratchpad als werkgeheugen** | Bij elke sessie-start lezen, bij elke sessie-einde bijwerken. Voorkomt context verlies. |
| **ADRs voor architectuurkeuzes** | Formele vastlegging van waarom, niet alleen wat. Immutable zodra geaccepteerd. |
| **Orchestrator-gestuurd** (v4.2) | Eén orchestrator-agent verdeelt werk over workers, bewaakt afhankelijkheden via dependency graph, handhaaft contracten, en escaleert alleen bij conflicten. Erik wordt niet gestoord voor routinewerk. |

---

## 10. Waar We Nu Staan

```
✅ Fase 0: Context Library structuur gedefinieerd
⬜ Fase 1: Screenshot Inventarisatie  ◄── WE BEGINNEN HIER
⬜ Fase 2: Component Definitie
⬜ Fase 3: Spec-Interviews
⬜ Fase 4: Code Implementatie (met Orchestrator Pattern)
⬜ Fase 5: Launch & Polish
```

### Notitie: Figma Make → Figma Design Pipeline

Alle schermen staan momenteel in Figma Make, dat geen MCP-koppeling heeft. Om de schermen beschikbaar te maken voor geautomatiseerde analyse zijn er twee routes:

**Route A: html.to.design (aanbevolen)**
1. Open Figma Make preview per scherm
2. Capture via html.to.design Chrome extension
3. Importeer in Figma Design via de html.to.design plugin
4. Resultaat: bewerkbare Figma lagen, toegankelijk via Figma MCP

**Route B: Handmatige screenshots**
1. Export per scherm als PNG uit Figma Make (File > Save local copy)
2. Upload in batches naar de analyse-pipeline
3. Minder metadata beschikbaar dan via Route A

Route A is de voorkeur omdat het bewerkbare Figma Design bestanden oplevert die via MCP geautomatiseerd analyseerbaar zijn — essentieel voor het orchestrator-pattern in Fase 4.

**Volgende stap:** Deel het eerste screenshot (of configureer de Figma Make → Design pipeline). Na analyse genereer ik de context library bestanden en we bouwen het stap voor stap op.
