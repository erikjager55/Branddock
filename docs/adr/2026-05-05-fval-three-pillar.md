---
id: 2026-05-05-fval-three-pillar
title: F-VAL fidelity validation als 3-pijler scoring
status: accepted
date: 2026-05-05
supersedes: -
superseded-by: -
---

# Context

Branddock claimt dat content meetbaar trouwer aan het merk is dan generieke LLM-output (vanille GPT-4o). Vóór F-VAL werd dit niet kwantificeerbaar bewezen. Vereisten:
- Score per content-versie die brand-fit meet
- Differentiator-bewijs voor demo's en marketing
- Gebruikbaar voor self-improvement loop (welke briefs falen?)
- Snel genoeg om real-time te tonen in Canvas (~20s acceptabel)

Onderzoek mei 2026 wees naar drie complementaire signalen:
1. **Style-similarity** met merk-content via embedding-cosine + declared vocabulary match
2. **G-Eval rubric judge** (LLM-as-judge) over 6 kwalitatieve criteria
3. **Deterministic rule-engine** voor brand-rules en AI-tells

Geen van de drie alleen is voldoende — pijler 1 is shallow zonder context, pijler 2 is duur zonder grounding, pijler 3 is binair.

# Decision

Adopteer **3-pijler composite score** met gewogen gemiddelde:

| Pijler | Weight | Bron | Mechanisme |
|---|---|---|---|
| **1. Style** | 0.35 | BrandPersonality wordsWeUse + BrandVoiceguide centroid | String-match (50%) + cosine similarity (50%) |
| **2. Judge** | 0.45 | Claude G-Eval rubric, 6 criteria per content-type | LLM-call met brand-context |
| **3. Rules** | 0.20 | BrandRule (auto-synced uit voiceguide) + HumanVoiceDirective | Deterministic rule-engine + AI-tell detector |

**Composite score** = 0.35×P1 + 0.45×P2 + 0.20×P3 (met skip-logica wanneer pijler-bron ontbreekt — gewicht herverdeelt over actieve pijlers)

**Threshold**: 75 default per content-type (configureerbaar per FidelityConfig)

**STRICT mode**: bij verdict AI_LEANING of PURE_AI → automatische rewrite via Claude met expliciete fidelity-instructies → re-score → toon both before+after

**Vanille comparison endpoint**: zelfde scoring tegen GPT-4o output zonder BVD/HVD/brand-context, voor demo

# Y-statement

In de context van **demo-claim "Branddock content scoort hoger op brand-fit dan vanille LLM"**, facing **moeilijke meting van iets multidimensionaal als brand-fit**, I decided **3-pijler composite met weighted gemiddelde + STRICT rewrite + vanille endpoint**, to achieve **kwantificeerbaar verschil + zelf-verbeterende rewrite**, accepting tradeoff **complexiteit van scoring + judge-kosten per generation (~20s + ~$0.01)**.

# Consequences

## Positief
- Empirisch bewezen +15-18 punten gap vs vanille GPT-4o (BB-A blogpost case study)
- STRICT mode tilt AI_LEANING content naar TOP_TIER zichtbaar in UI
- Per-pijler breakdown maakt failure-modes diagnoseerbaar
- 3-pijler architectuur uitbreidbaar (cat 2/4/9 leerlus snapshot-data hangt eraan vast)
- Scoring is workspace-specifiek configureerbaar via `FidelityConfig`

## Negatief / tradeoffs
- ~20s per generation voor full pipeline (judge call dominant)
- Judge-kosten ~$0.01 per content-versie (Claude Sonnet medium-tier brand context)
- Pijler 1 vereist gevulde BrandPersonality OF BrandVoiceguide — workspaces zonder declared signals krijgen pijler 1 skipped (weight herverdeelt)
- STRICT rewrite kost extra Claude streaming call (~30s)
- Empirische ranges kunnen verschuiven met content-type (long-form thought-leadership scoort anders dan tweet)

## Neutraal
- Persistence: `Deliverable.settings.fidelityScore` (canvas-pad) + `ContentFidelityScore` tabel (Studio-pad, ContentVersion-bridge)
- Demo-claim recalibratie nodig per content-type (zie `docs/fidelity/F-VAL-architecture.md`)

# Alternatives considered

- **Single-judge LLM-only score**: te duur, te traag, geen diagnose-vermogen
- **String-match + rule-only (geen judge)**: te shallow, scoort high op AI-output die declared vocab gebruikt maar tone mist
- **Zelf-trainde scorer model**: maandenlang werk, geen training data
- **External fidelity-as-a-service**: bestaat niet voor brand-fit, alleen plagiaat/sentiment

# Notes

Implementatie geleverd in entries #213-217 (`docs/archive/old-lists/CLAUDE-original-2026-05-07.md`):
- Composition engine: `src/lib/brand-fidelity/composition-engine.ts`
- Runner: `src/lib/brand-fidelity/fidelity-runner.ts`
- Pijler 1 style-scorer: `src/lib/brand-fidelity/style-scorer.ts`
- Pijler 2 judge: `src/lib/brand-fidelity/judge-dispatcher.ts`
- Pijler 3 rule + tell: `src/lib/brand-fidelity/rule-compiler.ts` + `ai-tell-detector.ts`
- Vanille endpoint: `src/app/api/studio/[id]/vanilla-baseline/route.ts`
- Demo UI: `FidelityScoreBar` component
- Architecture doc: `docs/fidelity/F-VAL-architecture.md`

**HVD tuning v2** (entry #216): hybride prompt met expliciete uitzondering voor brand-vocab eliminerede de pijler-1 trade-off. Composite +10 punten over alle drie pijlers.
