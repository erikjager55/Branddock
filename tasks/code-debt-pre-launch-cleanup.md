---
id: code-debt-pre-launch-cleanup
title: Code-debt cleanup — persist-TODOs + cleanup + API-deprecation
fase: pre-launch
priority: now
effort: ~6d totaal, verspreid over sprint #4-7 als fill-in
owner: claude-code
status: open
created: 2026-05-12
completed: -
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
| `src/features/campaigns/lib/content-type-inputs.ts:298` | Evaluate urgencyLevel deprecation overlap | 4u |

# Acceptatiecriteria

**Cluster A — sprint #4-5 (kritiek)**:
- [x] Variant-selection persists via API (refresh = same variant active) — done 2026-05-12, commit volgt
- [ ] Fix-options persist (2× call-sites consistent)
- [ ] Persona image-storage werkt end-to-end (gen → save → render)
- [ ] ProseMirror diff replaces string-diff in learning-loop (rich-text comparisons)

**Cluster B — sprint #5-6**:
- [ ] Exa API call gemigreerd naar non-deprecated method
- [ ] Trend-radar smoke groen na migratie

**Cluster C — sprint #6-7 fill-in**:
- [x] Design-tokens cleanup (verwijder dev-only nav-entry) — done 2026-05-12, commit volgt
- [ ] BrandAlignmentPage lazy-loaded
- [ ] urgencyLevel deprecation-overlap geëvalueerd (gehandhaafd of verwijderd)

**Cross-cutting**:
- [ ] `npx tsc --noEmit` 0 errors na elke cluster
- [ ] `npm run lint` 0 errors / geen nieuwe warnings
- [ ] Per cluster: smoke-test of affected flow nog werkt

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
