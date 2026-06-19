# lp-text-quality-fidelity

**Status**: done — gemerged via #316 (PR #47, 2026-06-10); fase 6 = opt-in vervolg
**Aangemaakt**: 2026-06-10
**Bron**: PO-klacht (lage LP-tekstkwaliteit + laagste brand-fidelity) → multi-agent onderzoek
**Audit/plan**: `docs/audits/2026-06-10-lp-text-quality-fidelity.md` (volledige onderbouwing + fase-detail)

## Scope

Twee gescheiden problemen, samen één arc:
1. **Meetartefact**: 46/47 LP-fidelity-scores krijgen ×0.60 length-penalty (target 1550 vs reële ~650 woorden) → judge 46.2 i.p.v. raw 75.4. Fix = registry-target + override-pariteit (F33).
2. **Copy-kwaliteit**: LP-generatiepad mist HVD/model-routing/silent-iterate/STRICT; prompt seedt em-dash- en drieslag-tells zelf; detector mist de glued em-dash-vorm.

FAQ-dropdown: OUT OF SCOPE (geen bug — werkt in Step 3 + published; Step 2/editor blokkeren pointer-events by design).

## Fasen (zie audit voor detail per item)

- [x] **Fase 1 — meting** (~0.5-1d): LP-word-targets in registry (alle PUCK_WEBPAGE_TYPES) + override in 2 actieve routes + placeholder-guard/dedupe + drempel ~70 + baseline-reset
- [x] **Fase 2 — prompts** (~1-1.5d): HVD-injectie (mode-gated) + em-dashes uit systemprompt + anti-drieslag-regels + riskReducer-voorbeeld + LINFI/BB-hardcode weg + model-routing sonnet-4-6 (divergentie via angles!) + anti-fabricage + locale-fix
- [x] **Fase 3 — detector** (~0.5d, NÁ fase 2): glued-em-dash-pattern + vocab-whitelist↔detector + do/avoid-dedup + rules-pijler contradictie-check
- [x] **Fase 4 — loop-pariteit** (~1d): silent iterate na batch + STRICT-variant-rewrite + verrijkte iterate-prompt
- [x] **Fase 5 — meetbaarheid** (~0.5d): AICallSnapshot-capture variant-generator + golden-set op echte prompt + re-score-batch + flatten-hygiëne
- [ ] **Fase 6 — opt-in** (apart besluit): style-pijler centroid-backfill (W-1) / dode endpoints / taal-factualiteit-dimensie

## Realisatie-notities (2026-06-10)

- Scoring-targets als `STRUCTURED_VARIANT_WORD_TARGETS`-map in fidelity-runner (NIET in deliverable-types constraints — die hebben andere consumers: content-validator, shrink-guard, vanilla-baseline).
- Dedupe via nieuwe `ContentFidelityScore.contentHash`-kolom (db push gedaan) + skip-guard in persist.
- Silent composite-iterate is OPT-IN via `LP_SILENT_ITERATE=1` (patroon AUTO_ITERATE_DEEP_SCORE): scoring is in deze flow bewust client-getriggerd; altijd-aan zou generatie-latency +20-60s en judge-kosten ×2 maken. STRICT tell-rewrite (detector-gated, ~gratis) staat WEL default aan voor STRICT-workspaces.
- Anti-fabricage maakte author-velden soms leeg → schema-fallback ("Tevreden klant"/"Klant") + prompt-instructie functie-aanduiding; flatten filtert lege company.
- Sectielabels alleen in `flattenPuckTextForJudge` (aparte functie) — in `flattenPuckText` vervuilden ze readability-telling (phase10-smoke ving dit).
- Data-scripts gedraaid op dev-DB: `dedupe-voice-vocab --apply` (Linfi 3 termen) + `recompute-lp-fidelity-baseline --apply` (46 rijen, 62.4→75.8, backup-JSON in scripts/dev/).
- Re-score-verificatie (8 variants, live judge): composite 72.9 / judge 79.3 / 6-8 boven drempel — meting-fix bevestigd vóór nieuwe copy.

## Review-fixes (adversariële review 2026-06-10, 4 majors + 5 minors)

- Whitelist op alle rewrite-detector-paden (variant-tell-rewrite options-param + 2 routes)
- `skipPersist` in runFidelityScoring voor silent-iterate (settings-clobber-race weg)
- Workspace-data: Zwarthout/People Masterminds/Branddock Demo `contentLanguage` 'en'→'nl' (nooit bewust gezette default; **follow-up**: overige 8 'en'-default workspaces checken via language-backfill — Adullam/DTS/HNG/Nobox/PartnerSelect/QonnecQt/TechCorp/Wassink)
- `resolveScoringWordCountOverride` (webpage-scoped F33) op studio auto-iterate trigger + integration-rescore
- Word-boundary whitelist, tolerant author-schema, awaited tracking, yaml-flake-mitigatie, gitignore backups
- Geaccepteerde rest-risico's (bewust, genoteerd): contentHash-dedupe is TOCTOU-poreus onder parallelle persists (best-effort); placeholder-guard geldt pipeline-breed (markers in legitieme copy is theoretisch); response-tokentotalen tellen STRICT/silent-rewrite-calls niet mee (informatief veld).

## Acceptatiecriteria

- LP composite gem. ≥75 op verse re-score-batch (was 63.0); antiPattern raw ≥8 (was 5.96)
- Glued em-dashes in nieuwe LP-copy: ~0 (was 92% van deliverables-met-copy); drieslag ≤1 per pagina
- Geen regressie andere types (registry-wijziging raakt alleen webpage-types; detector-wijziging gesimuleerd op bestaande corpus vóór merge)
- tsc 0 + lint 0 + bestaande web-page-builder smoke-suite groen + nieuwe golden-set groen

## File-ownership / conflicten

- Raakt: variant-generator.ts, fidelity-runner.ts, g-eval-rubric.ts (evt.), ai-tell-detector.ts, deliverable-types.ts, LP-score-routes, auto-iterate-variant route
- Raakt NIET: puck-config.tsx / PuckPageBuilder.tsx / ImageSourcePanel (parallelle workstream `feat/lp-editor-image-field` + `tasks/lp-feature-image-diversity.md`)
- Eigen branch vanaf main; NIET bouwen in de huidige worktree zolang `feat/lp-editor-image-field` uncommitted werk heeft

## Out-of-scope

- judgeCallTraceId-tracing (systeembreed observability-werk)
- Twee-fase generatie (attention-smearing weerlegd)
- Composer-duplicaat-fix (dood mei-pad; eerst reproductie op juni-data)
