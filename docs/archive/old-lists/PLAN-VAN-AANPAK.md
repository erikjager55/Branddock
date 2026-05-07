# Branddock — Plan van Aanpak

**Datum**: 2026-05-07
**Doel**: een gestructureerde, toekomstbestendige werkwijze waarin Claude Code autonoom hoogwaardig werk levert, sessies elkaar niet overschrijven, en jij beperkt hoeft te reviewen.
**Format**: leesbaar in één zit (~30 min). Niet bedoeld als TODO maar als operating manual.

---

## 0. Samenvatting in 1 pagina

**Diagnose**: 34 markdown-bestanden in repo, CLAUDE.md is 200K+ tokens (te groot), `TODO.md` bevat 9 fases die deels af zijn maar niet als zodanig gemarkeerd, `IMPLEMENTATIEPLAN-*.md` bestanden hebben statussen die niet matchen met de werkelijkheid, parallelle sessies hebben race conditions veroorzaakt (commit `5064015`), geen formele autonomie-flow.

**Onderzoek (mei 2026)**: 7 cruciale praktijken zijn industrie-mainstream geworden — AGENTS.md als single source-of-truth (max ~200 regels), Now-Next-Later met one-file-per-task in `tasks/`, git worktrees voor parallel werk (één per agent), hooks voor automated quality gates, ADRs voor beslissingen, spec-driven development voor grotere features, Claude Code Routines voor nightly werk.

**Plan**:
1. **Documentatie-architectuur reorganiseren** — `AGENTS.md` (~200 regels) + `START_HERE.md` (entry point) + per-directory CLAUDE.md voor scoping + huidige CLAUDE.md naar `docs/history/` als changelog
2. **Werklijst hervormen** — `roadmap.md` (Now-Next-Later) + `tasks/<task-id>.md` per taak (klein, gestandaardiseerd format)
3. **3-fase indeling** — pre-launch (must-haves) / launch (gates) / post-launch (continu) — gemapt op MoSCoW
4. **Spelregels vastleggen** — planning (TaskCreate verplicht voor 3+ stappen), uitvoering (worktrees voor parallel, hooks voor quality), evaluatie (review-checklist + done-definition)
5. **Quality gates** — type-check + lint + tests + (later) mutation tests + evals als verplicht voor merge
6. **Autonomie-flow** — Routines voor nightly triage, plan-mode default voor multi-file changes, checkpoints, scope-classifier voor stop-and-ask
7. **Migratie in 3 weken** — week 1 documentatie, week 2 backlog herstructurering, week 3 hooks + worktrees + eerste autonome routine

**Wat de user vandaag moet beslissen** staat in sectie 10.

---

## 1. Diagnose huidige situatie

### 1.1 Wat werkt
- Memory-systeem in `~/.claude/projects/` werkt goed (audit trail, beslissingen per sessie)
- CLAUDE.md is een uitgebreid changelog dat bewijst dat 217 features werkelijk gebouwd zijn — dat is feitelijk ADR-werk avant la lettre
- Plan-docs per groot werkstuk (IMPLEMENTATIEPLAN-*) is op zich een goed patroon
- Patterns.md + design tokens single source of truth voor UI

### 1.2 Wat wringt
| Symptoom | Oorzaak |
|---|---|
| Claude vraagt soms naar dingen die in CLAUDE.md staan | CLAUDE.md is te groot, info wordt geweerd door auto-compaction |
| Gemixte commits (bv `5064015`) | Twee parallelle sessies in dezelfde werkboom zonder coördinatie |
| Plan-docs zijn deels al af maar status niet bijgewerkt | Geen automatische sync tussen plan-doc-status en CLAUDE.md changelog |
| Veel duplicated info (TODO.md ~ BRANDCLAW-ROADMAP.md ~ STRATEGISCHE-VERVOLGSTAPPEN.md) | Drie documenten zonder duidelijke scheiding |
| Onduidelijk welke `IMPLEMENTATIEPLAN-*` nog open is | Statussen in headers wijken af van werkelijkheid |
| Geen formele evaluatie/done-criteria | "0 TS errors" is enige consistente gate; geen evals, geen mutation tests, geen UX-validatie |
| Geen autonomy-runs ingericht | Nightly werk gebeurt nu niet — gemiste leverage |
| Solo-dev houdt alle context in hoofd | Bij 6 maanden pauze ben je je eigen mate over 3 maanden — geen ADRs |

### 1.3 De vier echte hoofdvragen
Het onderliggende doel verklaard:
- **Q1**: hoe houd ik het overzicht over wat te doen / wat af is?
- **Q2**: hoe voorkom ik dat parallelle sessies elkaar slopen?
- **Q3**: hoe laat ik werk lang (uren, nachten) draaien zonder te ontsporen?
- **Q4**: hoe beperk ik manuele review zonder kwaliteit op te offeren?

De volgende secties beantwoorden deze vier in volgorde.

---

## 2. Onderzoeksbevindingen (mei 2026)

Twee parallelle agents hebben Anthropic docs + GitHub Spec Kit + dev.to + community guides gelezen. Korte samenvatting; volledige bronnen in [Appendix A](#appendix-a-bronnen).

### 2.1 Convergentie over instructie-bestanden
- **AGENTS.md** is sinds dec 2025 de Linux Foundation-gesteunde standaard (Anthropic + OpenAI + Google + AWS), 60.000+ repos. Werkt native met Claude Code als fallback wanneer geen `CLAUDE.md`
- **Aanbevolen omvang**: <200-300 regels (HumanLayer's eigen CLAUDE.md is <60 regels). Boven 300 wordt context-instructie onbetrouwbaar
- **Hierarchisch**: root + per-directory CLAUDE.md/AGENTS.md (Claude Code laadt parent + active automatisch)
- **Wat erin**: bash-commands die agent niet kan raden, code-style afwijkend van defaults, repo etiquette, env-vars, gotchas
- **Wat eruit**: API-documentatie (link), zelfevidente regels, dingen uit code afleidbaar

### 2.2 Backlog/todo structuur
- Single `TODO.md` is in 2026 niet meer mainstream. Vervangen door:
  - `START_HERE.md` (entry point voor mens + agent)
  - `roadmap.md` met **Now-Next-Later** (RICE binnen Next, MoSCoW rond launch)
  - `tasks/<task-id>.md` — één markdown-file per taak, gestandaardiseerd format
- Update-cadans: Now continu, Next 2-4 weken, Later kwartaal

### 2.3 Parallelle sessies — git worktrees
- Anthropic-officieel: één worktree per agent. "Isolation moet op filesystem-niveau, niet branch-niveau"
- Conventie: `branddock-feat-<name>` directory naast main
- File-ownership *vooraf* mappen — geen overlap tussen tasks (voorkomt conflicten beter dan post-hoc tooling)
- Realistische schaal: 2-3 agents comfortabel, 4-6 maximum solo, daarboven orchestrator-agent nodig
- Case-study (30 engineers): 3.13× speedup, **nul merge-conflicten** met worktree-isolatie

### 2.4 Skills, subagents, hooks
- **Skills** voor herhaalde workflows (planning, code review, doc sync, smoke tests). On-demand geladen, ~100 tokens/skill in context tot ze worden gebruikt
- **Subagents** voor zware exploratie (read 100+ files) — eigen context, retourneert samenvatting (50KB exploratie → ~5KB samenvatting)
- **Hooks**: PostToolUse `tsc + eslint` na elke Edit, PreToolUse permission gates, Stop voor session summaries

### 2.5 Quality gates (vertrouwbaarheid-volgorde)
1. Type-check + linter (deterministisch, snel) — hooks na elke edit
2. Unit tests >80% coverage (necessary, niet sufficient)
3. **Mutation testing** (Stryker TS / mutmut) — onthult of tests werkelijk iets afdwingen — *dé moderne gate voor AI-code*
4. Contract tests (Pact-style) tussen services
5. Property-based tests voor data-transforms
6. Screenshot-diff voor UI (Playwright + reg-suit)
7. **Evals in CI** — promptfoo-style, 90% pass-rate als merge-gate

### 2.6 Spec-driven development
- **GitHub Spec Kit** (`specify init`): 4 fasen — Specify → Plan → Tasks → Implement
- Werkt native met Claude Code
- Gebruik selectief: grotere features met onzekere scope, niet voor bugfixes
- Lichte alternatieven: `cc-sdd`, `gsd-build`

### 2.7 Autonome / langdraaiende sessies
- Sweet spot voor solo-werk: **1-4 uur per pakket**. Daarboven verdunt context
- Claude Code Routines (april 2026): bundelt prompt + repo + connectors, runt op cron of GitHub event
- Cost: nightly routine $0.10-0.30 per run, $3-9/mnd
- **Checkpoints** sinds 2026 automatisch — `Esc Esc` of `/rewind`
- Auto-mode: classifier blokkeert risk (scope-escalatie, onbekende infra)
- Heuristiek: scope-helder + diff <1 zin = keep-going; onzeker + multi-file = plan-mode + interview

### 2.8 ADRs (Architecture Decision Records)
- MADR format is 2026-standaard
- `docs/adr/<datum>-<beslissing>.md` per beslissing — 1 pagina
- AgDR (Agent Decision Record) is een 2026-extensie specifiek voor agent-keuzes
- Y-statement: "In context [X], facing [Y], I decided [Z] to achieve [W], accepting tradeoff [V]"

### 2.9 Phase-gating pre-launch / launch / post-launch
- 3-fase 4-6 maanden structuur is mainstream voor SaaS startups
- Pre-launch must-haves (MoSCoW Must): auth, core workflow, billing, legal/compliance, infra+backups, support kanaal+SLA, KPI-dashboards, beta met 20-50 users
- **Empirisch**: minder polished features → 40% betere retention dan bloated launch
- Launch readiness gate: 10-step checklist convergeert (product/legal/infra/inventory/support/marketing/event/metrics-defined/post-launch-plan)
- Post-launch metrics: ARR growth, NRR, CAC payback, gross margin, Rule of 40

---

## 3. Nieuwe document-architectuur

### 3.1 Doelstructuur
```
branddock-app/
├── AGENTS.md                  # ⭐ Single source-of-truth, <200 regels
├── START_HERE.md              # Entry point — wat ben ik, wat te doen vandaag
├── README.md                  # Public-facing project intro
├── roadmap.md                 # Now-Next-Later, 3 fases (pre/launch/post)
│
├── tasks/                     # Open werk — één file per taak
│   ├── _template.md           # Task template (zie 3.4)
│   ├── auth-stripe-billing.md
│   ├── canvas-inline-edit-overlays.md
│   └── ...
│
├── docs/
│   ├── adr/                   # Architecture Decision Records
│   │   ├── _template.md
│   │   ├── 2026-02-10-prisma7-pg-adapter.md
│   │   ├── 2026-04-21-token-encryption-aes-gcm.md
│   │   └── ...
│   ├── specs/                 # Feature specs (CONTENT-CANVAS, CONTENT-STUDIO huidige)
│   ├── playbooks/             # Hoe-doe-je-X (PATTERNS.md, ai-playbook.md)
│   ├── archive/               # Afgeronde plan-docs + oude handovers
│   │   ├── implementatieplannen/
│   │   ├── handovers/
│   │   └── plans-superseded/
│   └── changelog.md           # Concrete feature-history (van CLAUDE.md afgesplitst)
│
├── .claude/
│   ├── settings.json          # Hooks, permissions
│   ├── skills/                # Project-specifieke skills
│   │   ├── smoke-test/SKILL.md
│   │   ├── pre-commit/SKILL.md
│   │   ├── adr-create/SKILL.md
│   │   └── task-finalize/SKILL.md
│   ├── agents/                # Subagent definities
│   │   ├── code-reviewer.md
│   │   ├── regression-detector.md
│   │   └── doc-keeper.md
│   └── hooks/                 # Hook scripts
│       ├── post-edit-typecheck.sh
│       └── pre-commit-gates.sh
│
├── src/.../CLAUDE.md          # Per-directory scoping (alleen waar nodig)
├── prisma/CLAUDE.md           # Prisma 7 quirks
└── e2e/CLAUDE.md              # Playwright conventies
```

### 3.2 Wat elk bestand bevat

**`AGENTS.md`** (max 200 regels) — minimale agent-context:
- 5 regels project-positie
- Tech stack one-liners (links naar docs)
- Repo etiquette (commit-stijl, branch-namen)
- Verboden patronen (max 10)
- Directory-map (waar wat staat)
- Pointer naar `START_HERE.md` voor actief werk

**`START_HERE.md`** — dagelijkse entry point:
- Huidige fase (pre-launch / launch / post-launch)
- Top 3 actieve tasks (links naar `tasks/*.md`)
- Open beslissingen die werk blokkeren
- Pointer naar `roadmap.md` voor backlog

**`roadmap.md`** — strategische werklijst:
- Now (1-4 weken): max 5 items
- Next (1-3 maanden): RICE-gerangschikt
- Later (3-12 maanden): visie-niveau
- Per item: titel, fase (pre/launch/post), geschatte effort, link naar `tasks/<id>.md` (als gestart)

**`tasks/<id>.md`** — één file per concrete taak (zie 3.4)

**`docs/adr/<datum>-<id>.md`** — beslissingen die je wil onthouden

**`docs/changelog.md`** — afgesplitst van CLAUDE.md, chronologisch wat-is-gebouwd

### 3.3 Wat doen we met huidige bestanden?

| Bestand | Bestemming |
|---|---|
| `CLAUDE.md` (huidige reusachtige) | Splitsen: kerninstructies → `AGENTS.md`, changelog → `docs/changelog.md`, gotchas blijven `gotchas.md`, patterns blijven `PATTERNS.md` |
| `TODO.md` | Items distilleren naar `roadmap.md` + `tasks/*.md`. Origineel naar `docs/archive/` |
| `BRANDCLAW-ROADMAP.md` | Strategie naar `roadmap.md` Later-kolom + visiedeel naar `docs/specs/brandclaw-vision.md` |
| `STRATEGISCHE-VERVOLGSTAPPEN.md` | Verwerkt in `roadmap.md`. Origineel naar `docs/archive/` |
| `IMPLEMENTATIEPLAN-BRAND-VOICE.md` | ✅ Done — naar `docs/archive/implementatieplannen/` |
| `IMPLEMENTATIEPLAN-BV-WIRE.md` | ✅ Done — archiveren |
| `IMPLEMENTATIEPLAN-FIDELITY-CRITERIA.md` | ✅ Done — archiveren |
| `IMPLEMENTATIEPLAN-LEARNING-LOOP.md` | ✅ Done — archiveren |
| `IMPLEMENTATIEPLAN-CONTENT-ITEM-CANVAS.md` | ✅ Done — archiveren |
| `IMPLEMENTATIEPLAN-FASE-I4.md` | ✅ Done — archiveren |
| `IMPLEMENTATIEPLAN-BRANDSTYLE-V2.md` | Initiële plan superseded door BSR (#208-211) — archiveren als "superseded" |
| `IMPLEMENTATIEPLAN-MULTI-AGENT-STRATEGY.md` | Vervangen door CQP — archiveren als "superseded" |
| `IMPLEMENTATIEPLAN-STUDIO-OVERHAUL.md` | Studio is verwijderd t.b.v. Canvas — archiveren als "obsolete" |
| `PLAN-3-VARIANT-DEEP-THINKING.md` | Done daarna verwijderd in legacy cleanup — archiveren als "historical" |
| `IMPLEMENTATIEPLAN-CAMPAIGN-DRAFTS.md` | Open → distilleer naar `tasks/campaign-drafts-db-backed.md` |
| `IMPLEMENTATIEPLAN-CLAW-PAGE-AWARENESS.md` | Open → distilleer naar `tasks/claw-page-awareness.md` |
| `IMPLEMENTATIEPLAN-POWER-USER-SHORTCUTS.md` | Open → distilleer naar `tasks/power-user-shortcuts.md` |
| `TESTPLAN-CONTENT-ITEMS.md` | Houden — verplaatsen naar `docs/playbooks/` |
| `HANDOVER-17-FEB-2026.md` | Naar `docs/archive/handovers/` |
| `OVERDRACHT-AI-EXPLORATION-CONFIG-2026-03-03.md` | Naar `docs/archive/handovers/` |
| `CONTENT-CANVAS-SPEC.md`, `CONTENT-STUDIO-SPEC.md` | Naar `docs/specs/` |
| `DYNAMISCH-CONTEXT-SYSTEEM.md` | Naar `docs/specs/` |
| `FASERING-LOCK-UNLOCK.md`, `FEATURE-PERSONA-ENRICHMENT.md` | Naar `docs/specs/built-features/` (referentie) |
| `FIDELITY-CRITERIA-AUDIT.md` | Naar `docs/specs/` (audit-input) |
| `versioning-system-design.md` | Naar `docs/specs/built-features/` |
| `PERFORMANCE.md`, `PERFORMANCE-REPORT.md` | Naar `docs/playbooks/` |
| `SESSION-STARTER.md` | Vervangen door `START_HERE.md` |
| `ai-playbook.md` | Naar `docs/playbooks/` |
| `gotchas.md` | Blijft op root (Claude Code's session start leest 'm) |
| `PATTERNS.md` | Blijft op root |

**Resultaat**: van 34 root-md naar ~5 root-md (`AGENTS.md`, `START_HERE.md`, `README.md`, `roadmap.md`, `gotchas.md`, `PATTERNS.md`).

### 3.4 Task-template

```markdown
---
id: canvas-inline-edit-overlays
title: Per-preview inline-edit overlays in Content Canvas
fase: post-launch
priority: next
effort: 2-3 dagen
owner: claude-code
status: open
created: 2026-05-07
related-adr: -
related-spec: docs/specs/content-canvas.md
---

# Probleem
ContentSectionsEditor toont sectie-tekst onder de preview maar gebruikers willen direct in de preview kunnen klikken om te bewerken (zoals WebPageLayout's EditableArticleSection al doet).

# Voorstel
Shared `<InlineEditableSection group componentId>` component bouwen op basis van EditableArticleSection-patroon. Toepassen op alle 13 preview componenten in `src/features/campaigns/components/canvas/previews/`.

# Acceptatiecriteria
- [ ] Klik op een sectie in elke preview → inline editable
- [ ] Save persisteert via component PATCH endpoint
- [ ] Markdown rendering blijft werken in body groups
- [ ] Plain-text groups blijven gestript bij render
- [ ] ContentSectionsEditor verwijderd
- [ ] Geen regressies in approval/publish flow
- [ ] 0 TypeScript errors
- [ ] Smoke-test: edit + save + reload → tekst persisteert

# Bestanden die ik aanraak
- `src/features/campaigns/components/canvas/previews/*.tsx` (13 files)
- `src/features/campaigns/components/canvas/MediumConfigLayout.tsx`
- (verwijderen) `ContentSectionsEditor.tsx`

# Bestanden die ik NIET aanraak
- `src/features/campaigns/api/canvas.api.ts` (al af)
- `src/features/campaigns/components/canvas/medium/WebPageLayout.tsx` (referentie)

# Worktree
`branddock-feat-canvas-inline-edit`

# Risico's
- Regressie in publish flow als sectie-IDs veranderen
- Markdown vs plain-text branching kan complex zijn voor bv X-post (280 char limit)

# Smoke test plan
1. Maak nieuw blog-post deliverable
2. Genereer content
3. Klik op title → edit → save
4. Klik op body → edit → save
5. Reload page → check persistentie
6. Approval → publish → check geen errors

# Out of scope
- Multi-component re-ordering
- Drag & drop reorder
```

### 3.5 ADR-template

```markdown
---
id: 2026-05-07-tasks-as-files
title: Eén markdown-file per task in tasks/
status: accepted
date: 2026-05-07
---

# Context
Single TODO.md groeide naar 790 regels en maakte parallel werk lastig (merge conflicts), prioritering onleesbaar, en agents misten focus.

# Decision
Adopteer one-file-per-task patroon uit Task Master / Now-Next-Later combinatie. Elke open taak krijgt eigen `tasks/<id>.md` met gestandaardiseerd frontmatter + acceptatiecriteria.

# Consequences
+ Parallelle agents kunnen ieder hun eigen task-file bewerken zonder merge conflict
+ Status per taak in frontmatter is queryable (grep)
+ Overzicht via `roadmap.md` blijft kort
- Initiële migratie van TODO.md kost 1-2 uur
- Vereist discipline: nieuwe taken altijd via template

# Y-statement
In context van solo-dev met parallelle Claude Code sessies en groeiende backlog, facing race conditions en onoverzichtelijke prioritering, decided I one-file-per-task in `tasks/`-directory te gebruiken to achieve isolatie + standaardisatie, accepting initiële migratie-overhead.
```

---

## 4. Werklijst & prioritering: Now-Next-Later × pre/launch/post

### 4.1 Het 3-fasen kader
**Pre-launch** (Must-haves vóór eerste betalende klant):
- Stripe billing live
- Vercel deployment + Neon DB
- Sentry error tracking
- Custom domain
- 1 pilot-klant onboarded en betalend
- Legal/privacy compliance (Privacy Policy, Terms, DPA)
- Backup-strategie geverifieerd
- Support-kanaal (email + response SLA)
- Defined launch-KPI's (activation rate, week-1 retention, NPS)

**Launch** (gates die moeten kloppen op launch-dag):
- 5 betalende klanten
- 0 P0/P1 bugs in core flows (auth, billing, content generation)
- Lighthouse perf score ≥80 op kritieke pagina's
- E2E test suite groen
- Onboarding-flow getest met 3+ externe gebruikers
- Marketing site + pricing pagina
- Activatie-funnel meetbaar in PostHog

**Post-launch** (continu, eerste 6 maanden):
- Brandclaw transformatie (Fase 6+7+8)
- Channel activation (Google Ads, Meta, Ayrshare)
- HubSpot CRM loop
- Cross-workspace benchmarks
- Externe integraties Tier 1+2
- Tech debt afbouw (`as any`, adapter pattern, dual versioning)
- F-VAL iteratie 3 op productie-data

### 4.2 Now-Next-Later ingedeeld

**Now (komende 2-4 weken)**: max 5 items, in volgorde
1. **Documentatie-architectuur migratie** — dit plan uitvoeren (zie sectie 9)
2. **Stripe billing integratie** — pre-launch must-have
3. **Vercel deployment basis** — pre-launch must-have
4. **1 pilot-klant draaiend krijgen** — Better Brands of Linfi (al voorbereid)
5. **Sentry + PostHog browser** — observability vóór klanten

**Next (1-3 maanden)**: RICE-gerangschikt, max 10 items
- Open `IMPLEMENTATIEPLAN-CAMPAIGN-DRAFTS.md` uitvoeren (multi-device draft persistence)
- Open `IMPLEMENTATIEPLAN-CLAW-PAGE-AWARENESS.md` uitvoeren (Brand Assistant)
- Content Canvas inline-edit overlays
- Brandfetch integratie (Tier 1)
- Content-styling velden migreren naar Content Brief (8 categorieën)
- Auto-trigger fidelity-scoring zodra ContentVersion-routes terugkomen
- BV-WIRE W-1 full centroid switch
- Learning Loop dashboard usage layer
- Tech debt: `: any` opruimen (146 → 0)
- Resend wired voor weekly reports

**Later (3-12 maanden)**: visie-niveau
- Brandclaw Marketing Loop (LangGraph)
- Channel Activation (Google Ads, Meta, Ayrshare)
- HubSpot CRM loop
- Cross-workspace benchmarks
- Tier 2 integraties
- Multi-agent orchestrator agent
- Privacy/DPA hooks

### 4.3 Prioriteringskader
**Voor "Now"-keuzes**: pre-launch > launch-blocker > klant-impact > strategie > tech-debt
**Voor "Next"-keuzes**: RICE (Reach × Impact × Confidence / Effort)
**Voor "Later"-keuzes**: strategische directie (Brandclaw differentiatie)

### 4.4 Update-cadans
- **Now**: dagelijks (na elke werksessie)
- **Next**: wekelijks (vrijdagmiddag)
- **Later**: maandelijks (eerste maandag)

---

## 5. Spelregels — planning, uitvoering, evaluatie

### 5.1 Voor planning (vóór werk start)
**Regel 1 — Plan-mode is default voor 3+ stappen**
- Elke taak met >2 file-changes of architecturale impact begint met plan-mode
- Plan moet bevatten: scope, file-list, acceptatiecriteria, smoke-test, out-of-scope
- User approval vóór uitvoering

**Regel 2 — Eén taak = één task-file**
- Open `tasks/<id>.md` met template ingevuld
- Geen werk zonder task-file (uitzondering: bugfixes <30 min)
- Status in frontmatter: open / in-progress / blocked / done

**Regel 3 — Worktree voor parallel werk**
- 2+ sessies tegelijk = worktrees verplicht
- Naming: `branddock-feat-<task-id>` of `branddock-fix-<task-id>`
- File-ownership *vooraf* in task-file specificeren (sectie "Bestanden die ik aanraak")

**Regel 4 — ADR voor non-triviale beslissingen**
- Bij architectuur, library-keuze, of patroon-wijziging: schrijf ADR vóór uitvoering
- Y-statement format
- Link vanuit task-file naar ADR

**Regel 5 — Spec-Kit voor grote ongedefinieerde features**
- Features groter dan 1 week: `/specify` flow gebruiken
- Specs naar `docs/specs/<feature>/` (Spec Kit-conventie)
- Bugfixes en kleine features: niet nodig

### 5.2 Voor uitvoering (tijdens werk)
**Regel 6 — Hooks bewaken kwaliteit per stap**
- PostToolUse Edit → `tsc --noEmit` (gefaald = retry)
- PostToolUse Edit → `eslint --fix`
- PreToolUse Bash gevaarlijke commando's → user-confirm
- Stop → session summary in `~/.claude/sessions/<date>.md`

**Regel 7 — Subagent voor zware exploratie**
- 100+ files te lezen → Explore subagent (geen main loop)
- Code review op groot diff → code-reviewer subagent
- Doc consistency check → doc-keeper subagent

**Regel 8 — Checkpoints elke ~30 min**
- Auto-checkpoint in Claude Code (`/rewind` werkt)
- Plus: git commit elke logische eenheid (~30 min werk)
- Lange sessie (>2u) zonder commit = red flag

**Regel 9 — Memory voor cross-sessie context**
- Beslissingen + non-triviale leerpunten → `~/.claude/projects/.../memory/`
- Plan-doc updates direct in `tasks/<id>.md`

**Regel 10 — Stop-and-ask conditions**
- Onbekende infra → vraag
- Scope-escalatie buiten task-file → vraag
- Test fail die niet door 1 retry oplost → vraag
- Externe service down → vraag
- Anders: keep-going

### 5.3 Voor evaluatie (taak-afronding)
**Regel 11 — Done-definitie verplicht**
Elke task is "done" alleen als:
- [ ] Alle acceptatiecriteria afgevinkt
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd (manual of automated)
- [ ] Commit + descriptive message
- [ ] `tasks/<id>.md` status → done
- [ ] Indien architectuur-wijziging: ADR aangemaakt
- [ ] Indien spec-doc bestaat: spec bijgewerkt

**Regel 12 — Self-review vóór user-review**
- Code-reviewer subagent draait op de diff
- Subagent stelt vragen die ik moet beantwoorden voor handover
- Bij issues: fix eerst, dan handover

**Regel 13 — Wekelijkse retro**
- Vrijdagmiddag 30 min: `tasks/done` doorlopen
- Wat was hard? Wat ging vlot? Welke ADR moet erbij?
- `START_HERE.md` updaten

**Regel 14 — Geen opheldering = geen merge**
- Test failures, mysterieuze workarounds, "het werkt op mijn machine" → niet mergen
- Liever rollback dan technical debt

---

## 6. Quality gates (geautomatiseerd)

### 6.1 Stack van vertrouwbaarheid
| Niveau | Gate | Wanneer | Hoe |
|---|---|---|---|
| L1 | Type-check | PostToolUse Edit | `tsc --noEmit` hook |
| L1 | Lint | PostToolUse Edit | `eslint --fix` hook |
| L1 | Format | PostToolUse Edit | `prettier --write` hook |
| L2 | Unit tests | Pre-commit | `npm test` (vitest) |
| L2 | E2E smoke | Pre-merge | `npm run test:e2e -- --grep critical-flow` |
| L3 | Mutation testing | Wekelijks | Stryker TypeScript |
| L3 | Evals (AI flows) | Pre-merge bij AI-changes | promptfoo CI |
| L3 | Lighthouse | Pre-deploy | `npm run lighthouse:ci` |

### 6.2 Hooks die je nu instelt
**`.claude/settings.json`** (skeleton):
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{
          "type": "command",
          "command": "cd $CLAUDE_PROJECT_DIR && npx tsc --noEmit 2>&1 | head -50",
          "blocking": false
        }]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{
          "type": "command",
          "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/check-dangerous-bash.sh"
        }]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [{
          "type": "command",
          "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/session-summary.sh"
        }]
      }
    ]
  },
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(npx prisma *)",
      "Bash(npx tsc *)",
      "Bash(git status)",
      "Bash(git diff *)"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(git push --force *)",
      "Bash(git reset --hard *)"
    ]
  }
}
```

### 6.3 Skills die je nu maakt
- **`smoke-test`** — task-id meegeven → draait smoke-test plan uit task-file
- **`pre-commit`** — type-check + lint + tests + commit-message validatie
- **`adr-create`** — vraag context, schrijf ADR-file
- **`task-finalize`** — alle done-criteria afvinken, status updaten, commit
- **`ultrareview`** (al beschikbaar) — pre-merge review

### 6.4 Subagents die je nu definieert
- **`.claude/agents/code-reviewer.md`** — diff-review met security + correctness focus
- **`.claude/agents/regression-detector.md`** — vergelijkt diff tegen recent commits, vlagt mogelijke regressies
- **`.claude/agents/doc-keeper.md`** — bewaakt sync tussen `docs/changelog.md` + task-files + ADRs

---

## 7. Parallelle sessies — worktree workflow

### 7.1 Setup (eenmalig)
```bash
# In repo root
cd ~/Projects/branddock-app

# Een worktree aanmaken voor task X
git worktree add ../branddock-feat-canvas-inline-edit -b feat/canvas-inline-edit
cd ../branddock-feat-canvas-inline-edit

# Eigen .env (kopieer + pas DB-naam aan zodat sessies elkaar's data niet raken)
cp ~/Projects/branddock-app/.env.local .env.local
# DATABASE_URL aanpassen naar branddock_canvas_inline (lokale dev DB)

# Eigen port
echo "PORT=3001" >> .env.local

# Claude Code openen in deze directory
claude
```

### 7.2 Werkflow
1. **Voor je een sessie start**: open `tasks/<id>.md`, lees "Bestanden die ik aanraak"
2. **Vóór parallel werk**: check andere actieve worktrees (`git worktree list`). Geen file-overlap = OK
3. **Tijdens werk**: blijf binnen je file-set. Buiten gaan = scope-escalatie = stop-and-ask
4. **Na werk**: PR maken in feature branch, code-reviewer subagent draaien, mergen naar main
5. **Cleanup**: `git worktree remove ../branddock-feat-<id>`

### 7.3 Conventies
- Max 3 worktrees tegelijk actief (review-bandbreedte beperkt)
- Eén `AGENTS.md` + `roadmap.md` als shared-read maar **frozen during run** — wijzigen via separate commits
- DB-isolatie: per worktree eigen lokale DB-instance (`branddock_<task-id>`)
- Port-isolatie: 3000, 3001, 3002

### 7.4 Wanneer geen worktree
- Bugfixes <30 min: gewoon main branch
- Documentation-only changes: gewoon main branch
- Eén-sessie werk dat sequentieel kan: gewoon main branch

---

## 8. Autonomie-framework

### 8.1 Drie niveaus van autonomie
| Niveau | Use case | Setup |
|---|---|---|
| **L1: assistive** | Plan-mode + step-by-step approval | Default mode |
| **L2: supervised auto** | Auto-mode tijdens jouw werkdag, jij houdt oog | `claude --permission-mode auto` |
| **L3: routines** | Cron-based nightly werk | Claude Code Routines |

### 8.2 L1 — Assistive (jouw werkdag, complexe taken)
- Plan-mode default (sectie 5.1 regel 1)
- Hooks bewaken kwaliteit
- Subagents voor exploratie
- Checkpoints automatisch

### 8.3 L2 — Supervised auto (jouw werkdag, routine taken)
- `claude --permission-mode auto` voor:
  - Type-fix campagnes (146 `any`-types opruimen)
  - Test-coverage uitbreiden
  - Doc-sync werk
- Classifier blokkeert risico (scope-escalatie, onbekende infra)
- Jij doet andere dingen, kijkt elke 30 min naar voortgang

### 8.4 L3 — Routines (nachten, weekenden)
**Wat geschikt is**:
- Nightly issue-triage (prioriteer GitHub issues)
- Daily PR-review pre-pass (subagent op alle open PRs)
- Wekelijkse mutation-testing run + rapport
- Wekelijkse "documentation drift" check (ADRs vs code consistency)
- Maandelijkse dependency-update PRs

**Wat NIET geschikt is**:
- Nieuwe features (té veel scope-onzekerheid)
- Multi-file refactors zonder duidelijke spec
- Werk dat externe services nodig heeft die op kunnen vallen

**Setup voor eerste routine**:
```yaml
# .claude/routines/nightly-triage.yml
name: Nightly Issue Triage
schedule: "0 2 * * *"  # 2:00 NL tijd
prompt: |
  Lees alle open GitHub issues met label "bug".
  Voor elke issue:
  1. Beoordeel severity (P0/P1/P2/P3)
  2. Stel reproductie-stappen op als die ontbreken
  3. Schrijf bevindingen naar tasks/triage-<datum>.md
  4. NIET fixen — alleen triagen
budget:
  max_tokens: 50000
  max_runtime_minutes: 30
```

### 8.5 Cost controls
- `max_tokens` per routine
- Sonnet i.p.v. Opus voor routine-werk
- Off-peak schedules
- Daily caps op routines
- Wekelijkse cost-review

### 8.6 Stop-and-ask vs keep-going beslissingsboom
```
Is het nieuwe scope?
  Ja → STOP, vraag user
  Nee ↓
Is het multi-file?
  Ja → check task-file file-list
    Op de lijst → keep-going
    Niet op de lijst → STOP, vraag user
  Nee ↓
Is er onbekende infra/service?
  Ja → STOP, vraag user
  Nee → keep-going
```

---

## 9. Migratie-roadmap (3 weken)

### Week 1: Documentatie-architectuur
**Doel**: nieuwe structuur staat, oude bestanden gearchiveerd

**Dag 1-2**:
- [ ] `AGENTS.md` schrijven (max 200 regels, distillatie van CLAUDE.md essentials)
- [ ] `START_HERE.md` schrijven (entry point, top 3 actieve tasks)
- [ ] `docs/` directory structuur aanmaken
- [ ] `docs/archive/` directory aanmaken

**Dag 3**:
- [ ] CLAUDE.md splitsen → `docs/changelog.md` (chronologie) + `AGENTS.md` (kerninstructies)
- [ ] CLAUDE.md gereduceerd tot symlink/pointer naar `AGENTS.md` voor backwards compat

**Dag 4**:
- [ ] Afgeronde IMPLEMENTATIEPLAN-* naar `docs/archive/implementatieplannen/`
- [ ] HANDOVER + OVERDRACHT naar `docs/archive/handovers/`
- [ ] CONTENT-CANVAS-SPEC + CONTENT-STUDIO-SPEC + DYNAMISCH-CONTEXT-SYSTEEM naar `docs/specs/`
- [ ] FEATURE-PERSONA-ENRICHMENT + FASERING-LOCK-UNLOCK + versioning-system-design naar `docs/specs/built-features/`
- [ ] PERFORMANCE + ai-playbook + TESTPLAN-CONTENT-ITEMS naar `docs/playbooks/`

**Dag 5**:
- [ ] `roadmap.md` schrijven (Now-Next-Later × pre/launch/post)
- [ ] Distilleer huidige `TODO.md` items naar roadmap
- [ ] TODO.md naar `docs/archive/`
- [ ] BRANDCLAW-ROADMAP.md visie-deel naar `docs/specs/brandclaw-vision.md`, rest weg
- [ ] STRATEGISCHE-VERVOLGSTAPPEN.md naar `docs/archive/` (verwerkt in roadmap.md)

**Dag 6-7**: ADRs schrijven voor 5-10 belangrijke historische beslissingen
- Prisma 7 + pg adapter keuze
- Better Auth + organization plugin keuze
- Hybrid Next.js SPA architectuur (geen App Router routing)
- F-VAL 3-pijler scoring
- AGENTS.md migratie zelf

**Done-criteria week 1**: 5 root .md bestanden, alle archieven verplaatst, roadmap.md compleet

### Week 2: Backlog herstructurering
**Doel**: alle open werk in `tasks/` als individuele files

**Dag 1**:
- [ ] `tasks/_template.md` definiëren
- [ ] Eerste 3 task-files distilleren uit huidige plan-docs:
  - `tasks/campaign-drafts-db-backed.md`
  - `tasks/claw-page-awareness.md`
  - `tasks/power-user-shortcuts.md`

**Dag 2-3**:
- [ ] TODO.md fase 3 (Production Launch) → ~5 task-files
- [ ] TODO.md fase 9 open items → ~6 task-files (canvas inline-edit, content-styling migratie 8 cats, etc.)

**Dag 4**:
- [ ] TODO.md fase 6 (Brandclaw Core) → 4 task-files in Later-fase
- [ ] TODO.md fase 7+8 → groep task-files in Later-fase

**Dag 5**:
- [ ] roadmap.md kolom Now/Next/Later vullen met links naar tasks
- [ ] Top 5 Now-tasks reviewen op compleetheid (acceptatiecriteria + smoke test)

**Dag 6-7**: documentatie van werkwijze
- [ ] `docs/playbooks/working-flow.md` — distillatie van sectie 5+6+7 hier
- [ ] `tasks/_README.md` — hoe schrijf je een task-file
- [ ] `docs/adr/_template.md` + `docs/adr/_README.md`

**Done-criteria week 2**: alle open werk heeft een task-file, roadmap is bijgewerkt

### Week 3: Hooks, worktrees, eerste autonome routine
**Doel**: technische infrastructuur staat, eerste nightly routine draait

**Dag 1-2**:
- [ ] `.claude/settings.json` configureren (hooks + permissions)
- [ ] `.claude/hooks/post-edit-typecheck.sh` schrijven en testen
- [ ] `.claude/hooks/check-dangerous-bash.sh` schrijven
- [ ] `.claude/hooks/session-summary.sh` schrijven

**Dag 3**:
- [ ] Eerste skill: `.claude/skills/pre-commit/` (type-check + lint + tests)
- [ ] Tweede skill: `.claude/skills/task-finalize/` (alle done-criteria + status update)

**Dag 4**:
- [ ] Eerste subagent: `.claude/agents/code-reviewer.md`
- [ ] Tweede subagent: `.claude/agents/doc-keeper.md`

**Dag 5**:
- [ ] Worktree-conventie testen: maak een worktree voor de eerste task-file
- [ ] DB-isolatie verifiëren (lokale Postgres `branddock_<task>`)
- [ ] Port-isolatie verifiëren

**Dag 6**:
- [ ] Eerste routine instellen: nightly issue-triage (zie 8.4 voorbeeld)
- [ ] Cost-budget zetten
- [ ] Eerste run handmatig triggeren, output reviewen

**Dag 7**: retro
- [ ] Wat van week 1-2-3 werkt? Wat niet?
- [ ] ADR voor afwijkingen van dit plan

**Done-criteria week 3**: hooks + skills + subagents + 1 routine actief, eerste worktree-taak afgerond met nieuwe flow

---

## 10. Open beslissingen voor jou

Deze beslissingen kan ik niet voor je nemen — sturen het hele framework:

### 10.1 Document-architectuur
- **CLAUDE.md fully replace door AGENTS.md, of co-existeren?** *(Voorkeur: AGENTS.md primair, CLAUDE.md symlink, zodat je de Linux Foundation standaard volgt + Claude Code's eigen voorkeuren respecteert)*
- **Per-directory CLAUDE.md/AGENTS.md, of alles in root?** *(Voorkeur: root + alleen `prisma/`, `src/features/campaigns/`, `e2e/` per-directory voor tooling-specifieke quirks)*
- **changelog.md één bestand of per-jaar gesplitst?** *(Voorkeur: één bestand met h2 per jaar)*

### 10.2 Werkwijze
- **Plan-mode altijd of alleen >2 file-changes?** *(Voorkeur: >2 file-changes — kleine fixes worden anders bureaucratisch)*
- **Worktrees voor alle taken of alleen parallel?** *(Voorkeur: alleen parallel — overhead anders te groot voor solo-dev)*
- **ADRs alleen voor architectuur of ook voor library-keuzes?** *(Voorkeur: beide, mits non-trivieel)*

### 10.3 Quality gates
- **Welke gates blokkeren echt een merge?** *(Suggestie: type-check + lint + unit tests verplicht. Mutation tests + evals informatief eerste 4 weken, dan blokkerend)*
- **Smoke-test verplicht voor elk task, of alleen bij UI-changes?** *(Voorkeur: alle UI/data-changes verplicht, pure backend-logic optioneel als unit tests dekkend zijn)*

### 10.4 Autonomie
- **Eerste autonome routine: triage of doc-sync?** *(Suggestie: doc-sync — minder risico, leert je waar autonome cadans wel/niet werkt)*
- **Auto-mode alleen voor type-fixes, of ook voor doc-werk?** *(Voorkeur: beide, mits in eigen worktree)*
- **Cost-budget per maand voor routines?** *(Suggestie: $20/mnd ceiling eerste 3 maanden, evalueren)*

### 10.5 Fasering
- **Wanneer is "pre-launch" voorbij?** *(Hard criterium: 5 betalende klanten 4 weken aaneengesloten)*
- **Brandclaw transformatie: post-launch must of nice-to-have?** *(Strategisch: must-have voor differentiatie, maar kan in stappen — eerste node Strategy Analyst kan 2 maanden na launch)*

---

## Appendix A: Bronnen

### Claude Code & Anthropic
- [Claude Code Best Practices](https://code.claude.com/docs/en/best-practices)
- [Extend with Skills](https://code.claude.com/docs/en/skills)
- [Custom Subagents](https://code.claude.com/docs/en/subagents)
- [Memory Tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool)
- [Managed Agents Overview](https://platform.claude.com/docs/en/managed-agents/overview.md)
- [Claude Code Routines](https://code.claude.com/docs/en/routines)
- [Enabling Claude Code more autonomously](https://www.anthropic.com/news/enabling-claude-code-to-work-more-autonomously)
- [Demystifying Evals for AI Agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

### Spec-driven Development
- [GitHub Spec Kit](https://github.com/github/spec-kit)
- [Spec-Driven Development blog](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/)
- [Vibe coding vs SDD](https://www.infoworld.com/article/4166817/vibe-coding-or-spec-driven-development.html)

### Document Hygiene
- [AGENTS.md standard](https://agents.md/)
- [HumanLayer: Writing a good CLAUDE.md](https://www.humanlayer.dev/blog/writing-a-good-claude-md)
- [How to build agents.md](https://www.augmentcode.com/guides/how-to-build-agents-md)

### Backlog & Tasks
- [Task Master](https://github.com/eyaltoledano/claude-task-master)
- [Now-Next-Later roadmap](https://www.aakashg.com/now-next-later-roadmap/)
- [Markdown knowledge base for engineering teams](https://medium.com/cwan-engineering/building-an-ai-powered-markdown-knowledge-base-system-for-your-engineering-team-4bccea3cdbfe)

### Worktrees & Parallel Sessions
- [Claude Code Worktrees Guide](https://claudefa.st/blog/guide/development/worktree-guide)
- [Mastering Git Worktrees with Claude Code](https://medium.com/@dtunai/mastering-git-worktrees-with-claude-code-for-parallel-development-workflow-41dc91e645fe)
- [Padiso: Worktrees for parallel agent sessions](https://www.padiso.co/blog/claude-code-worktrees-parallel-agent-sessions/)
- [Mindstudio: Parallel agentic development](https://www.mindstudio.ai/blog/parallel-agentic-development-git-worktrees)

### Hooks & Quality Gates
- [10 Claude Code Hooks from 108 hours](https://dev.to/yurukusa/10-claude-code-hooks-i-collected-from-108-hours-of-autonomous-operation-now-open-source-5633)
- [Claude Code Hooks Complete Guide](https://claudefa.st/blog/tools/hooks/hooks-guide)
- [TDD AI Agents Best Practices](https://qaskills.sh/blog/tdd-ai-agents-best-practices)
- [Promptfoo evals](https://github.com/promptfoo/promptfoo)

### Decision Records
- [ADR Github](https://adr.github.io/)
- [Martin Fowler ADRs](https://martinfowler.com/bliki/ArchitectureDecisionRecord.html)
- [Agent Decision Record](https://github.com/me2resh/agent-decision-record)

### Launch Readiness
- [Launch readiness checklist for startups](https://wellows.com/blog/launch-readiness-checklist-for-startups/)
- [SaaS Launch Checklist 2026](https://supastarter.dev/blog/saas-launch-checklist-2026)
- [SaaS Pre-launch Marketing Playbook](https://getlaunchlist.com/blog/saas-pre-launch-marketing-playbook)
- [SaaS Benchmarks 2026](https://www.averi.ai/how-to/the-saas-benchmarks-report-2026-how-your-startup-stacks-up-(from-pre-seed-to-series-a))

---

## Appendix B: Wat is anders in dit plan vs huidige documenten

| Huidig | Nieuw | Waarom |
|---|---|---|
| `CLAUDE.md` (200K+ tokens) | `AGENTS.md` (~200 regels) + `docs/changelog.md` | Compaction-vriendelijk, instructie-betrouwbaarheid |
| `TODO.md` (790 regels) | `roadmap.md` (kort) + `tasks/<id>.md` per taak | Parallel-vriendelijk, queryable status |
| 3 strategische docs | `roadmap.md` consolideerd | Single source of truth |
| 12 IMPLEMENTATIEPLAN-* | `tasks/*.md` voor open + `docs/archive/` voor done | Status accuraat, archivering verplicht |
| Geen ADRs | `docs/adr/<datum>-<id>.md` | Beslissingen reproduceerbaar |
| Geen hooks | Hooks in `.claude/settings.json` | Quality gates auto |
| Geen skills | `smoke-test`, `pre-commit`, `task-finalize`, `adr-create` | Repeterende workflows niet steeds opnieuw uitleggen |
| Geen subagents config | `code-reviewer`, `doc-keeper`, `regression-detector` | Heavy work geïsoleerd |
| Ad-hoc parallel | Worktree-conventie (max 3, file-ownership vooraf) | Geen race conditions |
| Geen routines | 1 nightly routine (start klein) | Leverage 's nachts |

---

## Appendix C: Snelle referentie — Beslissing in 30 seconden

**"Mag ik nu beginnen met deze taak?"**
1. Heeft het een `tasks/<id>.md`? Nee → eerst maken
2. Is het >2 file-changes? Ja → plan-mode eerst, user-approval halen
3. Is iemand anders bezig in dezelfde files? Ja → andere worktree of wacht
4. Is er een ADR nodig (architectuur-keuze)? Ja → eerst ADR
5. Zo niet → keep-going

**"Mag deze task gemerged?"**
1. Acceptatiecriteria afgevinkt? Ja
2. `tsc --noEmit` 0 errors? Ja
3. Lint 0 errors? Ja
4. Smoke-test gedraaid? Ja
5. Subagent code-review uitgevoerd? Ja
6. Status in task-file = done? Ja
7. Zo niet → niet mergen

**"Moet ik stop-and-ask?"**
1. Nieuwe scope (buiten task-file)? Ja → stop
2. Onbekende infra/service? Ja → stop
3. Test fail die niet door 1 retry oplost? Ja → stop
4. Externe service down? Ja → stop
5. Zo niet → keep-going

---

**Volgende stap voor jou (Erik)**: lees sectie 10 en beantwoord de open beslissingen. Daarna start ik week 1 van de migratie-roadmap (sectie 9). Verwachte tijdsinvestering jouwerzijds: ~30 min beslissingen, daarna alleen review-momenten.

**Volgende stap voor mij (Claude)**: zodra je groen licht geeft op sectie 10, voer ik week 1 dag 1-2 uit (`AGENTS.md` + `START_HERE.md` schrijven, `docs/` directory creëren). Daarna handover-moment.
