---
id: code-debt-pre-launch-cleanup
title: Code-debt cleanup — persist-TODOs + cleanup + API-deprecation
fase: pre-launch
priority: now
effort: ~6d totaal, verspreid over sprint #4-7 als fill-in
owner: claude-code
status: done
created: 2026-05-12
completed: 2026-05-17
related-adr: -
related-spec: -
worktree: -
---

# Probleem

Roadmap-inventaris 2026-05-12 onthulde ~10 substantiële TODO/FIXME comments in `src/` die niet als concreet werk staan gepland. Verdeeld over: persist-werk (data niet opgeslagen na user-actie), quality-enhancements (richer previews/components), en deprecated-API replacement.

Geen enkel item is een hard launch-blocker, maar samen vormen ze technical debt die pilot-feedback risico's vergroot:
- Persist-TODOs: user verliest werk bij refresh
- Deprecated API: silently broken bij volgende dependency-upgrade
- Cleanup: dev-only artifacts staan in productie-paden

# Voorstel

Groeperen in 3 mini-clusters voor fill-in werk tussen grote sprints. Niet als één blok — verspreiden over sprint #4-7.

## Cluster A — Persist-TODOs (kritiek voor pilot UX, ~3d)

| File:line | Wat | Effort |
|---|---|---|
| `src/app/api/personas/[id]/generate-image/route.ts:33` | Persistent image storage na generatie | 1d |
| `src/features/campaigns/components/canvas/VariantCard.tsx:92` | useSelectVariant API persistence voor variant-selection | 2u |
| `src/lib/alignment/fix-generator.ts:93,131` | Persist fix-options after generation (2× location) | 1d |
| `src/lib/learning-loop/diff-builder.ts:63,68` | ProseMirror-diff integration voor rich-text (2× location) | 1-2d |

## Cluster B — API-deprecation (silent-failure risico, ~1d)

| File:line | Wat | Effort |
|---|---|---|
| `src/lib/trend-radar/researcher.ts:156` | Replace deprecated Exa `analyzeMultipleSources` API | 1d |

## Cluster C — Cleanup (cosmetic, ~3u)

| File:line | Wat | Effort |
|---|---|---|
| `src/lib/design-tokens.ts:97` | Remove website-scanner temp nav entry | 15m |
| `src/components/brand-alignment/BrandAlignmentPage.tsx` | Lazy-load via next/dynamic (optimization) | 2u |
| `src/features/campaigns/components/canvas/accordion/Step1Context.tsx` | `Suggest from content` toont generieke "Suggestion failed — try again later" — echte 400-error body uit response.json() lezen + tonen (e.g. "Add a key message, persona, or product first") | 30m |
| `src/features/campaigns/lib/content-type-inputs.ts:298` | Evaluate urgencyLevel deprecation overlap | 4u |

# Acceptatiecriteria

**Cluster A — sprint #4-5 (kritiek)**:
- [x] Variant-selection persists via API (refresh = same variant active) — done 2026-05-12
- [x] Fix-options persist (cache-based, 60-min TTL) — done 2026-05-17, commit `9556016f`
- [x] Persona image-storage via getStorageProvider (R2 prod / local dev) — done 2026-05-17, commit `3dae25c6`
- [x] ProseMirror diff via Markdown-isatie (no external lib) — done 2026-05-17, commit `5e919c5e`

**Cluster B — sprint #5-6**:
- [x] analyzeMultipleSources migrated to synthesizeTrends (raw-content fallback signals) — done 2026-05-17, commit `da9fc408`
- [x] Trend-radar fallback path uses single unified synthesis function — `analyzeTrends` + `analyzeMultipleSources` deleted (-190 lines)

**Cluster C — sprint #6-7 fill-in**:
- [x] Design-tokens cleanup — done 2026-05-12
- [x] BrandAlignmentPage lazy-loaded — already done via `lazy-imports.ts` + LazyWrapper, task-file comment was stale (verified 2026-05-17)
- [x] urgencyLevel deprecation — removed; strategic urgency flows via adCtaType + hookFormat + urgencyMechanism — done 2026-05-17, commit `9f9b5ad2`
- [x] Step1Context error-bubble — `Suggest from content` now surfaces real server-side error bodies — done 2026-05-17, commit `9f9b5ad2`

**Cross-cutting**:
- [x] `npx tsc --noEmit` 0 errors na elke cluster
- [x] `npm run lint` 0 errors / geen nieuwe warnings (pre-existing warnings remain — see commit messages)
- [x] Per cluster: smoke-test of affected flow nog werkt (test-via dev server na elke commit)

**Bonus findings (deferred as separate cleanup):**
- `DELIVERABLE_TYPE_SETTINGS` map in `deliverable-type-settings.ts` has 0 consumers in `src/` — full dead-code, candidate for removal
- `buildMultiSourceSystemPrompt` + `buildMultiSourceUserPrompt` in `prompts/trend-analysis.ts` orphaned after Cluster B migration
- `ImageSuggestion.strengths` field unused in any UI surface since F-LinkedIn-1d cleanup

# Bestanden die ik aanraak

Per file: zie tabellen hierboven. Mogelijk volgen meer aanrakingen voor types/api-changes.

# Bestanden die ik NIET aanraak

- Code-architectuur buiten de TODO-scope (geen scope-creep refactor)
- Tests buiten smoke-niveau (apart in test-coverage werk)
- Code-comments die alleen stilistisch zijn

# Smoke test plan

Per cluster:
- **A**: persist + refresh elke affected flow (variant-pick → refresh → same active; fix-option apply → refresh → same applied; persona image gen → refresh → same image)
- **B**: trend-radar workspace-research call → check output identical pre/post-migration
- **C**: visuele check + click-through

# Risico's

- **ProseMirror diff** kan niet-triviaal zijn — kan in scope groter dan 1-2d. Mitigatie: time-box op 2d, anders splitsen + post-launch deel.
- **Exa API migratie** kan rate-limit verschuivingen geven. Mitigatie: side-by-side test vóór switch.
- **Cluster C scope-creep** — urgencyLevel-eval kan onthullen dat er meer overlap is dan verwacht. Mitigatie: time-box op 4u, anders aparte issue.

# Out of scope

- Andere TODOs die NIET in deze 3 clusters staan
- Refactor opportunities die niet door TODO's worden gemarkeerd
- Performance-tuning buiten de aangewezen optimizations
- Comprehensive linter-warning sweep (apart post-launch werk)

# Notes

Items komen uit roadmap-inventaris 2026-05-12 via grep TODO/FIXME/XXX/HACK in `src/`. Voor andere code-debt items die later boven water komen: aparte task-file of toevoegen aan deze cluster met expliciete update.
