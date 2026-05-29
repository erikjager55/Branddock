---
id: 2026-05-29-fval-vision-judge-dim8
title: F-VAL vision-judge dim 8 — visuele LP-fidelity als 8e dimensie in composite + auto-iterate integratie
status: accepted
date: 2026-05-29
supersedes: -
superseded-by: -
---

# Context

F-VAL (Fidelity Validation) is sinds Phase 1 BCP een 3-pijler composite: style 35% / judge 45% / rules 20% (zie ADR [`2026-05-08-fval-output-schema-bevindingen`](./2026-05-08-fval-output-schema-bevindingen.md)). De judge-pijler scoort 7 dimensies (G-Eval rubric): tone-alignment / persona-fit / brand-voice / strategic-fit / detector-position / vocabulary-fit / anatomy-fit. Alle 7 dimensies zijn **text-only** — de judge ziet pure copy, geen visual context.

Voor landing-pages (5 web-page content-types) heeft de text-only-aanpak een blinde vlek: een LP kan tekstueel perfect zijn maar visueel off-brand (verkeerde kleuren, generic layout, archetype-mismatch). De LP-fidelity werkstroom (zie [[2026-05-29-brandstyle-analyzer-lp-fidelity]]) bouwt een side-by-side judge die bron-screenshot vergelijkt met gegenereerde LP — maar die judge zit OPZICHZELF, niet als input voor het F-VAL composite-signaal dat downstream-systemen (auto-iterate, PublishGate, brand-alignment dashboard) gebruiken.

Concreet gat: auto-iterate triggert op F-VAL composite < 70. Een LP met visuele-fidelity 40 maar tekst-fidelity 85 scoort composite ~75 → geen auto-iterate. De visuele blinde vlek slipt door productie-gates ondanks dat het signaal beschikbaar is.

# Decision

Voeg **vision-judge als 8e dimensie** toe aan F-VAL composite-engine:

1. **Nieuwe dimensie `visual-fidelity` (dim 8)** in G-Eval rubric (`src/lib/brand-fidelity/g-eval-rubric.ts`). Score 0-100 — input is hero-screenshot van bron + gerenderde LP screenshot of Puck-data-tree.
2. **Vision-judge runner** in `src/lib/landing-pages/page-quality.ts` (`evaluatePageQualityViaFVAL` uitgebreid). Bestaat al sinds Phase 6.2 commit `873d69b2` als losse functie; nu geïntegreerd in F-VAL judge-pijler.
3. **Composite-engine consumeert dim 8** — wanneer content-type ∈ `PUCK_WEBPAGE_TYPES`, judge-pijler weegt dim 8 mee. Voor non-LP content-types blijft dim 8 uitgeschakeld (geen visuele context).
4. **Auto-iterate trigger geverbeterd** — `triggerAutoIterate` flow accepteert vision-score als blocker (commit `944a8d34`). Composite < 70 OF visual-fidelity < 50 → auto-iterate, ook al is text-composite >70.
5. **Per-dimensie threshold** — vision-fidelity heeft eigen threshold (50, lager dan tekst-dimensies 60-70) want vision-judging is calibration-noisier en false-negatives zijn duurder dan false-positives.

# Y-statement

In de context van **F-VAL composite die LP visueel-fidelity gat blind doorlaat ondanks dat side-by-side judge beschikbaar is**, facing **keuze tussen losse vision-score-pipeline of geïntegreerde 8e dimensie in composite**, I decided **vision-judge als dim 8 in G-Eval rubric + composite-engine + auto-iterate-trigger** to achieve **één signaal-bron voor alle downstream-systemen + auto-iterate triggert op visual-fidelity-failures + brand-alignment-dashboard toont visuele score naast tekstuele zonder extra UI-werk**, accepting tradeoff **calibration-werk nodig — vision-judge scores zijn op een andere schaal dan G-Eval-tekst-dimensies, en de composite-formule moet daarop afgestemd zonder dat bestaande tekstuele content-flows ongunstig kantelen**.

# Consequences

## Positief

- **Eén F-VAL-signaal** — auto-iterate / PublishGate / dashboard hebben geen vision-aware variant nodig; alle bestaande consumers werken
- **Auto-iterate vangt visual gaps** — LP met vision-fidelity 40 triggert refinement-loop ook al is text 85
- **Geen UI-werk voor brand-alignment dashboard** — dim 8 verschijnt automatisch tussen de 7 bestaande dimensies in pillar-breakdown
- **PublishGate krijgt visual-blocker for free** — composite-threshold logic gold blijft, vision-fidelity is gewoon een extra bijdrage
- **Per-content-type uitschakeling** — non-LP content-types (blog-post, linkedin-post, etc.) blijven 7-dimensies; geen risico op false-blocking op text-only content
- **Hergebruik bestaande infra** — `evaluatePageQualityViaFVAL` bestaat sinds Phase 6.2, geen nieuwe pipeline-bouw

## Negatief / tradeoffs

- **Calibration-werk vereist** — vision-judge scores zijn niet 1-op-1 op zelfde schaal als G-Eval tekst-dimensies. Initial mapping (lineair 0-100) moet worden geverifieerd op productie-data en mogelijk getuned. Plan `zippy-twirling-feigenbaum` Track 4.3 voorziet hierin als acceptance-criterium.
- **Vision-judge cost per F-VAL run** — Anthropic vision-call kost ~$0.02-0.04 per LP-scoring. Alle PublishGate-passes en auto-iterate-iterations triggeren dit; op pilot-volume nog binnen budget, maar schaalt linear.
- **Vision-judge latency** — Anthropic vision-call ~10-15s. Bestaande F-VAL runt ~20s; toevoeging maakt het ~30-35s. Acceptabel voor PublishGate-flow (user wacht al), risk voor auto-iterate-flow (loops × 30s = mogelijk 2+ min wait).
- **Hero-screenshot afhankelijkheid** — vision-judge vereist een screenshot van de gerenderde LP. Voor Step 2 variant-scoring is er nog geen Puck-render beschikbaar; vision-judge wordt daar overgeslagen, alleen 7 tekst-dimensies actief.
- **Schaalbaarheid op > 5 LP-content-types** — als post-launch meer web-page types worden toegevoegd (bv. case-study-page, blog-index-page), moet de dispatch in composite-engine elk type expliciet whitelisten.

## Neutraal

- **Score-distributie verschuift voor LP-types** — historische composite-scores op LP-deliverables kunnen niet 1-op-1 vergeleken met post-dim-8-scores. Migratie-script voor reschoring is mogelijk maar niet gepland; we accepteren dat de dataset een natuurlijke "v8-cutover" heeft op 2026-05-29.
- **Vision-judge wordt niet getriggerd door content-quality flows** — alleen LP-flows. Andere visual content-types (display-ad images, video-thumbnails) krijgen geen vision-judge tenzij separaat besloten.

# Alternatives considered

## Losse vision-score pipeline (geen F-VAL integratie)

**Voor**:
- Geen risico op composite-distortion voor bestaande content-types
- Vision-score blijft puur als optionele extra in UI
- Auto-iterate kan twee aparte triggers krijgen (composite OF vision)

**Tegen** (waarom NIET gekozen):
- Twee signaal-bronnen = twee UI-componenten, twee dashboard-tegels, twee threshold-discussies
- Auto-iterate dual-trigger maakt edge-case-debugging zwaarder (welke trigger fired waarom)
- PublishGate moet beide signalen consumeren met eigen blocker-logic — extra complexity

## Vision-judge als pijler 4 (4-pijler composite)

**Voor**:
- Conceptueel cleaner: visual is een eigen kwaliteits-as, niet een G-Eval rubric-dimensie
- Per-pijler weight blijft expliciet (style 35 / judge 45 / rules 20 / visual nieuwe waarde)

**Tegen** (waarom NIET gekozen):
- Vereist refactor van composition-engine, fidelity-runner, fidelityConfig schema (4 pillar-weights ipv 3)
- Backward-compat verschuift — bestaande workspaces met FidelityConfig.styleWeight/judgeWeight/ruleWeight moeten een 4e veld krijgen met default-migratie
- Dim 8 in G-Eval rubric is een 1-line-changes-uitbreiding; pijler 4 is een schema-migratie

## Vision-judge alleen bij PublishGate (skip in canvas-orchestrator)

**Voor**:
- Cost-saving — vision-judge alleen bij publish, niet bij elke variant-generation
- Latency-impact alleen bij publish-flow, niet bij browse-flow

**Tegen** (waarom NIET gekozen):
- Auto-iterate triggert vóór publish — als vision-score niet beschikbaar is bij auto-iterate, kan dim 8 ook geen refinement triggeren
- Step 2 fidelity-bar krijgt geen visual signaal — content-type-naar-vision-judge mapping wordt inconsistent (PublishGate ja, Step 2 nee)

# Notes

**Re-evaluation triggers**:

1. **Vision-judge false-positive rate > 25%** (gemeten op pilot-data): re-tune vision-judge prompt of verlaag dim-8-weight in composite tot calibration verbetert.
2. **Anthropic vision-cost wordt > $50/workspace/maand**: schakel caching in op LP-fidelity check (zelfde puckData → skip re-judge binnen 7 dagen).
3. **Vision-judge latency wordt UX-blocker** (P95 > 45s op auto-iterate): introduceer async-mode waarbij vision-judge non-blocking is en alleen logged voor latere analyse.

**Cross-references**:
- Onderliggende ADR: [`2026-05-08-fval-output-schema-bevindingen`](./2026-05-08-fval-output-schema-bevindingen.md) (3-pijler F-VAL composite definitie)
- Sister ADR: [[2026-05-29-brandstyle-analyzer-lp-fidelity]] (LP-fidelity werkstroom Fase D = side-by-side judge)
- Implementatie: commits `410dcee6` (dim 8 vision-judge volledig), `944a8d34` (auto-iterate integratie)
- Plan execution: `~/.claude/plans/zippy-twirling-feigenbaum.md` Track 2.1 + Track 4.3 (calibration acceptance)
