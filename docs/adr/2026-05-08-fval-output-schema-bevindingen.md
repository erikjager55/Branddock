---
id: 2026-05-08-fval-output-schema-bevindingen
title: F-VAL output uitbreiden met BrandReviewFinding-model voor gestructureerde bevindingen
status: accepted
date: 2026-05-08
supersedes: -
superseded-by: -
---

# Context

F-VAL (fidelity validation) is Branddock's content-scoring engine met 3 pijlers (style 35% / judge 45% / rules 20%) — vastgelegd in ADR `2026-05-05-fval-three-pillar`. Het `ContentFidelityScore` Prisma-model levert vandaag één output: een numeriek `compositeScore` (0-100) plus per-pijler-subscores. Dit contract wordt gelezen door minimaal zeven consumers: PublishGate composite-gate (Content Canvas), `fidelity-runner.ts` (orchestrator), learning-loop (`fidelity-rules.ts`), strategy-PDF/JSON-exporters, TanStack-Query hooks (`use-content-readiness.ts`), `ContentVersion` CRUD-routes, en het readiness-dashboard.

Het pre-launch programma "Brand Control Program" (zie `tasks/_drafts/idea-brand-control-program.md`) introduceert review-side capabilities die dit numerieke contract niet meer voldoen:

- **Δ-1 Content Review** — externe paste-in tekst → bevindingen-tabel (severity + locatie + voor/na suggesties), niet alleen een score
- **Δ-4 PublishGate second-opinion** — vlaggen waarop F-VAL en de second-opinion subagent verschillen
- **Brand Assistant chat** — `review_content` read-tool moet structured findings retourneren voor inline rendering
- **Phase 3 Strategy Analyst** — moet trends detecteren ("welke severity-categorieën stijgen op LinkedIn-content over de afgelopen 30 dagen?") via queryable findings

De methodology (extern document 2026-05-08) eist drie outputs per review: composite-summary, bevindingen-tabel met locatie + ernst + suggestie, en voor/na voor de top 3-5 highest-ernst issues. F-VAL heeft de scoring-engine en de baseline-data, maar geen output-schema voor deze bevindingen-vorm.

Constraint: backwards-compat is hard — de zeven bestaande consumers mogen niet breken. Strategy Analyst (Phase 3) moet per-finding kunnen queryen voor trend-analyse over tijd, niet door JSON-veld te filteren.

# Decision

Wij breiden F-VAL output additief uit door een nieuw `BrandReviewFinding` Prisma-model met 1-N relation naar `ContentFidelityScore`. Het bestaande numerieke `compositeScore`-contract blijft ongewijzigd. Findings worden per-row opgeslagen, indexeerbaar op `(fidelityScoreId, severity)` voor render-queries en `(workspaceId, createdAt)` voor Analyst-trend-queries. Een nullable `findingsCount`-veld op `ContentFidelityScore` levert UI-counts zonder join.

## Schema-shape

```prisma
model BrandReviewFinding {
  id              String   @id @default(cuid())
  fidelityScoreId String
  workspaceId     String
  location        String   // "section + first 4 words" of "char-offset range"
  severity        Severity // HIGH | MEDIUM | LOW (bestaande enum)
  category        FindingCategory
  description     String   @db.Text
  suggestion      String?  @db.Text
  beforeText      String?  @db.Text  // voor top-issues
  afterText       String?  @db.Text  // voor top-issues
  evidence        Json?    // citation-keys, rule-IDs, confidence
  fidelityScore   ContentFidelityScore @relation(fields: [fidelityScoreId], references: [id], onDelete: Cascade)
  workspace       Workspace            @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  createdAt       DateTime @default(now())

  @@index([fidelityScoreId, severity])
  @@index([workspaceId, createdAt])
}

enum FindingCategory {
  VOICE          // §5.1 methodology — toon, persoonsverschuiving, genre-misfit
  TERMINOLOGY    // §5.2 — synoniem-zwerm, brand-vocabulary onderbenut
  CLAIMS         // §5.3 — superlatieven, vage kwaliteit, comparatieven
  STYLE          // §5.4 — sentence/title case, number-formatting, punctuatie
  BUSINESS       // §5.5 — kern-narrative, positionering, regulering
  AI_TELL        // EN-only initieel — AI-generated content telltales
}

// ContentFidelityScore krijgt aanvullend:
// findingsCount Int? // nullable — null voor pre-Δ-1 rows, 0+ voor post-Δ-1
```

# Y-statement

In de context van **F-VAL output voor zowel content-generation als externe content-review**, facing **de eis dat methodology-conforme bevindingen-tabel + voor/na suggesties geleverd worden zonder de zeven bestaande numerieke-score consumers te breken en met queryable trends voor Strategy Analyst Phase 3**, I decided **een separate `BrandReviewFinding` Prisma-model toe te voegen met 1-N relation naar ContentFidelityScore plus nullable `findingsCount`-aggregatie-veld** to achieve **backwards-compat voor het bestaande numerieke contract én indexeerbare per-finding queries voor Analyst-trend-detection en review-UI rendering**, accepting tradeoff **een extra tabel + 1-N join bij PublishGate-render (verwacht <5ms latency-impact via composite-index) en een additieve schema-migratie**.

# Consequences

## Positief
- Het bestaande `ContentFidelityScore.compositeScore` contract blijft ongewijzigd — alle zeven consumers werken zonder code-wijziging
- Findings zijn per-row queryable: Strategy Analyst kan eenvoudig "alle HIGH-severity findings voor workspace X laatste 30 dagen, gegroepeerd op category" trekken zonder JSON-parsing of full-table-scans
- `ContentFidelityScore` blijft slank (geen JSON-blob die met content-grootte meegroeit)
- `findingsCount`-aggregatie op ContentFidelityScore levert snelle UI-counts (badge-getallen op PublishGate, bevindingen-tab) zonder join
- One-source-of-truth: Δ-1 paste-in, Δ-4 second-opinion, Brand Assistant chat-tool, en bestaande generation-flow produceren allemaal dezelfde `BrandReviewFinding`-rijen
- `onDelete: Cascade` op fidelityScore + workspace voorkomt verweesde rijen

## Negatief / tradeoffs
- Extra tabel + 1-N join bij PublishGate render — geschatte latency-impact <5ms via composite-index `(fidelityScoreId, severity)`
- Schema-migratie nodig (additief, geen breaking)
- Onderscheid tussen "geen findings gevonden" (findingsCount = 0) en "pre-Δ-1 score zonder findings-pad" (findingsCount = null) vereist discipline — UI moet null-pad als "niet beoordeeld" tonen
- Findings persistentie verhoogt DB-grootte; mitigatie via `ContentReviewLog` retention (90 dagen, Phase 2 cron) — vastgelegd in idea-doc beslispunt 4

## Neutraal
- `Severity`-enum hergebruikt bestaande `AlignmentIssue.severity` waarden (HIGH/MEDIUM/LOW) — terminologisch consistent met Brand Alignment
- `FindingCategory`-enum is nieuw maar volgt direct §5.1-5.5 methodology + AI_TELL voor EN-only signaal
- `evidence: Json` is bewust JSON (geen genormaliseerde tabel) — citation-keys + confidence per finding zijn write-once read-rare metadata, geen query-target
- Migratie heeft geen runtime-impact op bestaande generation-flow tot Δ-1 daadwerkelijk findings produceert

# Alternatives considered

- **Alt A — Vervang composite-score door findings-array (breaking change)**: zou `ContentFidelityScore.compositeScore` numeric-veld vervangen door `findings: BrandReviewFinding[]` waaruit consumers een aggregatie-score moeten berekenen. Afgewezen — migratie-overhead voor zeven consumers (PublishGate, fidelity-runner, learning-loop, exporters, hooks, ContentVersion CRUD, dashboard) is onevenredig met de winst. Ook: composite-score is een gevalideerde gate-waarde in PublishGate (drempel 70) die zou moeten worden geherformuleerd als ad-hoc berekening — risico op silent regression in de gate-drempel.

- **Alt B — Tweede parallel model `ContentReviewResult` naast `ContentFidelityScore`**: zou F-VAL twee outputs laten produceren voor dezelfde input: één voor generation-flow, één voor review-flow. Afgewezen — dubbel werk in scoring-pipeline, twee codepaden voor zelfde logica, divergence-risico over tijd. Bovendien: paste-in content moet ook composite-score krijgen voor PublishGate-style gating in toekomstige features (channel-publish-gate post-launch).

- **Alt D — Findings als JSON-veld op ContentFidelityScore**: zou bevindingen als JSON-array opslaan op `ContentFidelityScore.findings`. Afgewezen om twee redenen: (1) Strategy Analyst Phase 3 moet trends queryen ("severity-distributie per category over tijd", "welke citation-keys vaakst geflagd?") — JSON-filtering vereist scan + parse op elke query, niet schaalbaar voor wekelijkse Analyst-runs over duizenden ContentFidelityScore-rijen. (2) JSON-grootte voor lange paste-in content kan 10KB+ bereiken; opgeslagen in elke ContentFidelityScore-rij maakt het model log-tabel-onvriendelijk en breekt het slanke-row-patroon dat bestaande consumers verwachten.

# Notes

- **Cross-references**:
  - `tasks/_drafts/idea-brand-control-program.md` — programma-context, locked-in 2026-05-08
  - ADR `2026-05-05-fval-three-pillar` — F-VAL fundament dat dit ADR uitbreidt
  - ADR `2026-05-08-locale-routing-brand-voice` (te schrijven) — runtime-keuze welke heuristiek-pakketten in Pijler 3 worden gebruikt; output volgt deze schema-shape

- **Migratie-pad**:
  1. Prisma-migration `add_brand_review_finding_model` (additief, geen data-rewrite)
  2. `ContentFidelityScore.findingsCount` nullable toevoegen (geen backfill — null voor bestaande rijen)
  3. Geen runtime-impact tot Δ-1 daadwerkelijk findings produceert in Phase 2

- **Index-keuze**: composite `(fidelityScoreId, severity)` versnelt zowel render-query (alle findings voor één score) als severity-filtering. `(workspaceId, createdAt)` versnelt Strategy Analyst-trend-queries (per-workspace tijdvenster). Beide cardinaliteits-veilig — geen risico op index-bloat.

- **Rendering-implicatie**: PublishGate haalt findings via `prisma.brandReviewFinding.findMany({ where: { fidelityScoreId } })` — al gedekt door bestaande TanStack-Query patterns; aparte hook `useContentReviewFindings(fidelityScoreId)` plant in Phase 2.

- **Future-proof voor channel-publish-gate**: wanneer `ayrshare-social-publishing` (LATER-roadmap) komt, kan elk kanaal eigen review-context hebben; `BrandReviewFinding` heeft geen channel-specifiek veld nodig (location is generiek char/section), dus channel-context komt via aparte `BrandReviewContext` tabel of metadata op `ContentReviewLog` (Phase 2).
