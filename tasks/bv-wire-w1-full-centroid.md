---
id: bv-wire-w1-full-centroid
title: BV-WIRE W-1 full — semantic centroid switch in F-VAL Pillar 1
fase: post-launch
priority: next
effort: 4-6 uur (+ 1u regression test)
owner: claude-code
status: open
created: 2026-05-07
completed: -
related-adr: docs/adr/2026-05-06-brand-voice-extraction.md
related-spec: -
worktree: -
---

# Probleem

BV-WIRE W-1 (data-source swap, entry #218) gaf F-VAL Pijler 1 toegang tot `BrandVoiceguide` data, maar het scoring-algoritme zelf is nog string-match only. Pre-existing regression test toonde voor Better Brands `Δ +24` punten verschil tussen string-match en cosine-similarity — semantic match vangt brand-thematic content op die declared `wordsWeUse` mist.

# Voorstel

Vervang string-match in F-VAL Pijler 1 met cosine-similarity tegen `BrandVoiceguide.centroidEmbedding`. Behoud string-match als 50/50 fallback wanneer beide bronnen beschikbaar zijn (W-1-full pattern uit entry #220).

# Acceptatiecriteria

- [ ] `src/lib/brand-fidelity/style-scorer.ts` herschreven met cosine-similarity branch
- [ ] `src/lib/brand-fidelity/composition-engine.ts` `voiceguideCentroid?: number[] | null` field op `FidelityCompositionInput`
- [ ] OpenAI text-embedding-3-small embedding van content → `embedContentForVoiceMatch()`
- [ ] Cosine projection naar 0-100 range met stretched curve (0.7 → 50, 0.85 → 80, 1.0 → 100)
- [ ] 50/50 weighted: when both string-match AND centroid available
- [ ] Skip string-match when no declared signals
- [ ] Skip semantic when no centroid OR `OPENAI_API_KEY` ontbreekt
- [ ] `scorerVersion` krijgt `+voice-emb-1.0` suffix wanneer semantic actief was
- [ ] **Regression-test gerund**: `scripts/fidelity/test-pillar1-regression.ts` over min 3 workspaces
- [ ] PASS criterium: cosines in plausible range [0.3, 1.0], 0 embed errors, ≥10 comparable samples
- [ ] Centroid seeding: `scripts/fidelity/seed-voiceguide-centroids.ts` voor pilots zonder centroid
- [ ] Demo workspace re-tested: F-VAL composite stabiel of verbeterd vs pre-W-1-full
- [ ] `npx tsc --noEmit` 0 errors

# Bestanden die ik aanraak

- `src/lib/brand-fidelity/style-scorer.ts`
- `src/lib/brand-fidelity/composition-engine.ts`
- `src/lib/brand-fidelity/fidelity-runner.ts` — fetch centroid in parallel met personality
- `src/lib/brand-fidelity/voice-similarity.ts` (nieuw) — `cosineSimilarity` + `fetchVoiceguideCentroid` + `embedContentForVoiceMatch` + `projectSimilarityToScore`

# Bestanden die ik NIET aanraak

- BVD prompt files — niet gerelateerd
- Andere F-VAL pijlers (judge, rules) — buiten scope
- BrandVoiceguide schema — al af

# Smoke test plan

1. Run `seed-voiceguide-centroids.ts` voor Better Brands workspace
2. Run `test-pillar1-w1-full-regression.ts` met N=20 samples
3. Verify markdown report: cosine min/p50/mean/p95 in plausible range
4. Run vol F-VAL pipeline op live BB content via Canvas
5. Compare composite score met pre-W-1-full baseline
6. Edge case: workspace zonder voiceguide → fallback naar string-match werkt
7. Edge case: workspace met voiceguide maar geen writingSamples → centroid is NULL → graceful skip

# Risico's

- **Embedding cost**: OpenAI text-embedding-3-small ~$0.0001 per content-versie. Bij 1000 generaties/dag = ~$0.10/dag. Mitigatie: cached embedding per content-hash
- **Cosine range mismatch**: workspaces met diverse content kunnen lage cosines geven (0.5 ipv 0.7). Mitigatie: regression test over meerdere workspaces vóór productie
- **Demo claim regressie**: BB +15-18 gap kan veranderen. Mitigatie: re-run `test-demo-full-flow.ts` post-implementatie, recalibreer F-VAL-architecture.md indien nodig
- **Network failure tijdens embedding**: F-VAL faalt. Mitigatie: try/catch → fallback naar string-match alleen, log warning

# Out of scope

- Centroid-update logic bij voiceguide changes (bestaande recompute-route doet dit al)
- Per-content-type weight-tuning (later iteratie 3)
- Workspace-specifieke string-match vs semantic weights

# Notes

Regression-harness staat klaar in entry #221 (`scripts/fidelity/test-pillar1-w1-full-regression.ts`). Empirische run Better Brands gaf Δ+24 punten — interpretatie: BB content is thematisch verwant aan voiceguide samples maar gebruikt weinig van declared `wordsWeUse`. Semantic match correcteert deze underrepresentation.

Pilot rollout volgorde:
1. Better Brands (centroid al klaar)
2. Linfi, Nobox, WRA Juristen (pilot workspaces — hebben BrandPersonality, mogelijk nog geen voiceguide)
3. Productie default na 2 weken stabiel
