# scripts/fidelity — F-VAL Drift-Meting Research Tools

> Pure research-CLI. Geen productie-code, geen API-endpoints, geen frontend-integratie.
> Doel: drift-meting tussen Conditie A (huidige BVD) en Conditie B (gestructureerde BVD)
> empirisch uitvoeren ter input voor de F-VAL pijler-1 scope-beslissing.

---

## Architectuur

```
scripts/fidelity/
├── README.md                     # Dit bestand
├── types.ts                      # Gedeelde TypeScript types
├── config.ts                     # Brand-list, model IDs, paths
├── build-bvd.ts                  # CLI: dump huidige BVD per workspace
├── build-conditions.ts           # CLI: genereer Conditie A + B prompts
├── run-drift.ts                  # CLI: dispatch generatie via Opus 4.7
├── judge.ts                      # CLI: dispatch judge calls (GPT-5 + Sonnet)
├── judge-prompts.ts              # Template-strings voor judge-prompts
├── judge-config.ts               # Cross-family rotation map + agreement threshold
└── score-aggregate.ts            # CLI: aggregate scores + generate markdown report
```

**Outputs gaan naar `research/fidelity-week1/`** (gescheiden van scripts/, data niet in code).

```
research/fidelity-week1/
├── bvd-dumps/                    # buildBrandVoiceDirective() output per merk
├── briefings/                    # Pre-geregistreerde briefings (committed naar git)
├── conditions/                   # Volledige prompts per (merk × type × conditie)
├── outputs/                      # Gegenereerde content per (merk × type × conditie)
├── scores/
│   ├── gpt5/                     # GPT-5 judge scores per output
│   ├── sonnet/                   # Sonnet 4.6 judge scores per output
│   └── humans/                   # Menselijke ratings (manual upload)
└── reports/
    ├── llm-aggregate.md          # LLM-only signaal (parallel)
    └── final-findings.md         # Definitieve Route A/B/C beslissing (na humans)
```

---

## CLI Commands

### Verificatie + voorbereiding

```bash
# Empirische check: dump huidige BVD voor een workspace, meet token-count
npx tsx scripts/fidelity/build-bvd.ts --workspace branddock-demo

# Output: research/fidelity-week1/bvd-dumps/branddock-demo-bvd.txt
#         + console: token count, veld-coverage report
```

### Conditie-bouw

```bash
# Genereer Conditie A en B prompts per merk per content-type
# Vereist: gevulde Brand Foundation in workspace + briefings al gecommit
npx tsx scripts/fidelity/build-conditions.ts \
  --brands wra,linfi,nobox \
  --types case-study,thought-leadership

# Output: research/fidelity-week1/conditions/{brand}-{type}-{A|B}.md
#         (volledige system + user prompt, klaar voor generatie)
```

### Drift-generatie

```bash
# Dispatch Opus 4.7 calls voor alle merken × types × condities
# Schrijft outputs naar disk, één bestand per call
npx tsx scripts/fidelity/run-drift.ts \
  --brands wra,linfi,nobox \
  --types case-study,thought-leadership \
  --conditions A,B

# Output: research/fidelity-week1/outputs/{brand}-{type}-{A|B}.md
#         + console: progress + token usage report
```

### LLM-judge

```bash
# Score alle outputs met GPT-5 (primary) + Sonnet 4.6 (parallel signaal)
npx tsx scripts/fidelity/judge.ts --batch fidelity-week1

# Output: research/fidelity-week1/scores/{gpt5,sonnet}/{brand}-{type}-{A|B}.json
```

### Aggregatie

```bash
# Compute per-conditie composite scores + agreement-meting
npx tsx scripts/fidelity/score-aggregate.ts --batch fidelity-week1

# Output: research/fidelity-week1/reports/llm-aggregate.md
#         (markdown rapport met drift-tabellen, klaar voor week-1 findings)
```

---

## Hergebruik van bestaande Branddock-infrastructuur

Deze scripts zijn **pure CLI** maar hergebruiken bestaande code zonder mutaties:

| Bestaande module | Hergebruikt voor |
|------------------|------------------|
| `src/lib/prisma.ts` | Workspace + BrandPersonality + ToneOfVoice fetchen |
| `src/lib/ai/brand-context.ts` | `formatBrandPersonality()`, `formatBrandStyle()` voor Conditie A |
| `src/lib/studio/brand-voice-directive.ts` | `buildBrandVoiceDirective()` voor Conditie A |
| `src/lib/ai/openai-client.ts` | OpenAI client voor GPT-5 judge calls |
| `src/lib/ai/exploration/ai-caller.ts` | `createClaudeStructuredCompletion()` voor Opus 4.7 generator + Sonnet 4.6 judge |
| `src/lib/ai/embeddings.ts` | (Conditie C only) embedding voor corpus-centroid |

**Geen wijzigingen aan bestaande modules.** Scripts roepen bestaande functies aan; production code wordt niet aangepast.

---

## Veiligheid + scope

| Doet | Doet NIET |
|------|-----------|
| Read uit Prisma DB | Write naar Prisma DB |
| AI calls naar OpenAI + Anthropic | API endpoints toevoegen |
| Schrijft naar `research/fidelity-week1/` | Schrijft naar `src/` of `prisma/` |
| Gebruikt bestaande env vars | Vereist nieuwe env config |
| Logt naar stdout | Logt naar PostHog of Sentry |

Alle outputs zijn lokale bestanden. Geen workspace-state wordt aangepast. Veilig om idempotent te draaien.

---

## Required env vars

```
DATABASE_URL              # bestaande Branddock DB
ANTHROPIC_API_KEY         # Opus 4.7 generator + Sonnet 4.6 parallel judge
OPENAI_API_KEY            # GPT-5 primary judge
```

Geen nieuwe env vars nodig.

---

## Pre-registratie procedure

Methodologisch verplicht: protocol + briefings worden in git **vóór generatie** gecommit zodat we niet achteraf de hypothese kunnen bijbuigen op basis van outputs.

```bash
# Stap 1: protocol v0.2 + briefings committen
git add docs/fidelity/drift-protocol.md  # v0.2 met definitieve merken-aantal
git add research/fidelity-week1/briefings/
git commit -m "F-VAL drift-meting: pre-registreer protocol v0.2 + briefings"

# Stap 2: generatie draaien
npx tsx scripts/fidelity/run-drift.ts ...

# Stap 3: outputs + scores committen
git add research/fidelity-week1/outputs research/fidelity-week1/scores
git commit -m "F-VAL drift-meting: outputs + LLM-scores"

# Stap 4: na menselijke ratings, finale rapport
git add research/fidelity-week1/scores/humans research/fidelity-week1/reports/final-findings.md
git commit -m "F-VAL drift-meting: human ratings + Route A/B/C beslissing"
```

---

## Implementatie-volgorde (week 1)

1. **Vandaag (5 mei)**: README (dit bestand) + types.ts + config.ts skeleton
2. **Wachten op completeness-data**: niet bouwen vóór protocol v0.2 pre-geregistreerd
3. **Na pre-registratie (8 mei)**: build-bvd.ts (eerste check) + build-conditions.ts
4. **8-9 mei**: run-drift.ts + judge.ts + score-aggregate.ts
5. **9-12 mei**: scores + report; wachten op humans
6. **Na humans (~12-14 mei)**: final-findings.md → updated F-VAL implementatieplan

---

*Status: README + architectuur gereed. Implementatie wacht op protocol v0.2 pre-registratie.*
