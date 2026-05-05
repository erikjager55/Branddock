# F-VAL Drift-Meting — LLM Aggregate Rapport

> Datum: 2026-05-05
> Status: **parallel signaal** — niet de basis voor Route A/B-beslissing
> Definitief oordeel wacht op menselijke ratings

## Agreement-meting tussen judges

Threshold voor "high agreement": mean delta ≤ 1.5, agreement score ≥ 7/10.

| Output key | Mean delta | Agreement score | High agreement? | vF | bR | Nat | Flu |
|---|---|---|---|---|---|---|---|
| better-brands-case-study-A | 0.25 | 9.5/10 | ✓ | 0 | 0 | 0 | 1 |
| better-brands-case-study-B | 1.00 | 8.0/10 | ✓ | 1 | 1 | 0 | 2 |
| better-brands-thought-leadership-A | 0.50 | 9.0/10 | ✓ | 1 | 0 | 1 | 0 |
| better-brands-thought-leadership-B | 1.50 | 7.0/10 | ✓ | 2 | 2 | 2 | 0 |
| linfi-case-study-A | 1.50 | 7.0/10 | ✓ | 2 | 1 | 1 | 2 |
| linfi-case-study-B | 0.25 | 9.5/10 | ✓ | 0 | 0 | 1 | 0 |
| linfi-thought-leadership-A | 1.75 | 6.5/10 | ✗ | 1 | 1 | 4 | 1 |
| linfi-thought-leadership-B | 1.50 | 7.0/10 | ✓ | 2 | 1 | 1 | 2 |
| wra-juristen-case-study-A | 0.25 | 9.5/10 | ✓ | 0 | 0 | 0 | 1 |
| wra-juristen-case-study-B | 0.50 | 9.0/10 | ✓ | 0 | 1 | 1 | 0 |
| wra-juristen-thought-leadership-A | 1.50 | 7.0/10 | ✓ | 1 | 1 | 1 | 3 |
| wra-juristen-thought-leadership-B | 1.00 | 8.0/10 | ✓ | 1 | 0 | 2 | 1 |

Outputs flagged for low agreement (excluded from LLM aggregate): **1** of 12
- linfi-thought-leadership-A (mean delta 1.75)

## Per-conditie composite voice-fit (high-agreement only)

| Conditie | n | GPT-5 voice-fit (mean ± std) | Sonnet voice-fit (mean ± std) |
|---|---|---|---|
| A (baseline — huidige BVD) | 5 | 8.00 ± 1.00 | 7.60 ± 1.34 |
| B (gestructureerde BVD) | 6 | 8.33 ± 0.82 | 8.00 ± 1.26 |

## Drift B vs A

- **GPT-5**: B − A = **+0.33** points
- **Sonnet 4.6**: B − A = **+0.40** points

## Voorlopige LLM-indicatie

Conditie A en B scoren binnen 0.37 punt van elkaar. Voorlopig signaal: **geen meetbaar verschil → Route A**.

**Definitieve Route A/B-beslissing wacht op menselijke ratings.** Zie `final-findings.md` na human-eval ronde.

## Per-output detail (alle outputs, beide judges)

| Key | GPT-5 vF | GPT-5 comp | Sonnet vF | Sonnet comp |
|---|---|---|---|---|
| better-brands-case-study-A | 7 | 7.0 | 7 | 7.3 |
| better-brands-case-study-B | 8 | 7.5 | 7 | 7.5 |
| better-brands-thought-leadership-A | 7 | 6.5 | 6 | 6.0 |
| better-brands-thought-leadership-B | 8 | 7.3 | 6 | 5.8 |
| linfi-case-study-A | 9 | 8.0 | 7 | 7.5 |
| linfi-case-study-B | 9 | 8.5 | 9 | 8.3 |
| linfi-thought-leadership-A | 7 | 7.8 | 6 | 6.0 |
| linfi-thought-leadership-B | 7 | 6.8 | 9 | 8.3 |
| wra-juristen-case-study-A | 9 | 7.8 | 9 | 8.0 |
| wra-juristen-case-study-B | 9 | 8.3 | 9 | 8.3 |
| wra-juristen-thought-leadership-A | 8 | 6.5 | 9 | 8.0 |
| wra-juristen-thought-leadership-B | 9 | 8.5 | 8 | 7.5 |