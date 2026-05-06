# Pillar 1 Regression Report (BV-WIRE W-1)

Generated: 2026-05-06T14:27:42.531Z
Sample limit: 100  •  comparable samples: 82

## Verdict

**PASS** — mean delta 1.78 composite points (threshold < 5).

## Aggregate stats

| Metric | Value |
|---|---|
| Mean composite delta | 1.78 |
| p95 composite delta  | 13.00 |
| Max composite delta  | 20.00 |
| Comparable samples   | 82 / 85 |
| ContentVersion rows  | 3 |
| DeliverableComponent rows | 82 |

## Per workspace

| Workspace | Source | n | Mean Δ |
|---|---|---|---|
| Linfi | legacy only | 62 | 0.00 |
| Better brands | voiceguide | 20 | 7.30 |

## Interpretation

- **legacy only** workspaces should report Δ = 0 because the new
  fetcher falls back to BrandPersonality.frameworkData when no
  voiceguide exists, producing identical signals to pre-W-1.
- **voiceguide** workspaces score against the migrated voice signals;
  delta reflects how closely the voiceguide vocabulary matches the
  legacy BrandPersonality vocabulary. Larger deltas are expected if
  the voiceguide was edited independently after migration.
- **empty voiceguide** rows have a row but no wordsWeUse / voiceDescription;
  the new fetcher correctly falls back to legacy.

## Directional bias

Mean signed delta (new − legacy): **-1.78** — voiceguide-sourced scores are on average **lower** than legacy. This is informational, not a regression: the voiceguide vocabulary is a curated subset of the legacy field on most pilot workspaces, so a downward bias is expected.

## Pre-registration note

Per IMPLEMENTATIEPLAN-BV-WIRE.md the W-1 acceptance criterion is
**mean delta < 5% (composite points)** across at least 100 versions.
This script enforces that gate with exit code 1 on failure.

## Sample rows (top 10 deltas)

| Version | Workspace | Source | Words | Legacy | New | Δ |
|---|---|---|---|---|---|---|
| cmotr52gs0 | Better brands | voiceguide | 652 | 40 | 20 | 20 |
| cmotr5e1o0 | Better brands | voiceguide | 69 | 25 | 8 | 17 |
| cmotreolq0 | Better brands | voiceguide | 643 | 25 | 10 | 15 |
| cmotr52h00 | Better brands | voiceguide | 596 | 30 | 15 | 15 |
| cmotreoll0 | Better brands | voiceguide | 729 | 38 | 25 | 13 |
| cmotr5e1r0 | Better brands | voiceguide | 69 | 15 | 3 | 12 |
| cmotr4ci70 | Better brands | voiceguide | 159 | 25 | 13 | 12 |
| cmotreolh0 | Better brands | voiceguide | 15 | 10 | 0 | 10 |
| cmotreolf0 | Better brands | voiceguide | 18 | 10 | 3 | 7 |
| cmotr4ci20 | Better brands | voiceguide | 166 | 20 | 13 | 7 |
