---
id: lp-feature-image-followups
title: LP feature-images follow-ups — clear-pad/bron-badge, quality-mode, audit-nauwkeurigheid, judge-downscaling
fase: pre-launch
priority: now
effort: ~1 dag
owner: claude-code
status: done
created: 2026-06-10
completed: 2026-06-10
related-adr: docs/adr/2026-06-10-feature-visual-pipeline.md (addendum in deze task)
related-spec: docs/audits/2026-06-10-lp-feature-image-diversity.md §9
worktree: branddock-feat-lp-image-followups (branch feat/lp-image-followups)
---

# Probleem

Vier bewust-deferde punten uit de #317-reviews, waarvan er één inmiddels een echte bug is: (1) de "Verwijderen"-knop in PuckImageField (#320, parallel ontwikkeld) gaat ervan uit dat feature-beelden géén clobber-guard hebben — de #317-guard draait elke bewuste clear stil terug. (2) Geen quality-mode: altijd 1 kandidaat + retry; de FEATURE_CANDIDATE_COUNT-haak is nooit aangesloten op WorkspaceAiConfig. (3) Audit-rows zijn onnauwkeurig: generationDuration = page-run-totaal, iterationCount altijd 0, `regenerated` in de response telt ook gefaalde retries. (4) Judges sturen ongeschaalde PNG-buffers (>5MB bij toekomstige modellen → judge stil inert).

# Voorstel

(1) **Clear-sentinel**: PuckImageField-clear stuurt `CLEAR_IMAGE_SENTINEL`; de preserve-guard herkent 'm als expliciete user-intentie (skip preserve + normaliseer naar '' bij persist); renderers/gap-detectie behandelen de sentinel als leeg. Plus bron-badge (URL-heuristiek: AI-gegenereerd / media library / extern) op de thumbnail. (2) **Quality-mode**: `resolveFeatureCandidateCount(workspaceId)` leest WorkspaceAiConfig featureKey `lp-feature-image-candidates` (1-3, default 1); bij >1: num_images=N, per kandidaat coherence-judge vóór upload, winnaar geüpload, runner-up in geheugen voor gratis dupe-swap vóór de regen-gate. (3) **Audit-fix**: per-slot durationMs, iterationCount bij retry, regenerated/swapped alleen bij succes. (4) **prepareJudgeImage**: sharp-downscale naar ≤1024px jpeg boven 4MB vóór elke judge-call.

# Acceptatiecriteria

- [ ] Clear-knop wist een feature-beeld blijvend (overleeft autosave + reload); stale-race-bescherming blijft werken
- [x] Bron-badge toont herkomst op de veld-thumbnail
- [ ] WorkspaceAiConfig-row `lp-feature-image-candidates`=2 → 2 kandidaten per slot, beste wint, dupe-swap gebruikt runner-up
- [x] Audit-rows: per-slot duration, iterationCount=1 na retry; response `regenerated` alleen bij geslaagde retry
- [x] Judges krijgen nooit buffers >4MB ongeschaald
- [x] `npx tsc --noEmit` 0 errors · lint 0 nieuwe warnings · smokes groen

# Bestanden die ik aanraak

- `src/app/api/studio/[deliverableId]/generate-feature-visuals/route.ts`
- `src/lib/landing-pages/feature-image-config.ts` (NIEUW)
- `src/lib/brand-fidelity/judge-image.ts` (NIEUW)
- `src/features/campaigns/lib/feature-visual-preserve.ts` (sentinel + sv-spiegeling)
- `src/features/campaigns/components/canvas/medium/PuckImageField.tsx` (sentinel + badge)
- `src/features/campaigns/components/canvas/medium/puck-config.tsx` (sentinel in renderers)
- smokes: feature-visual-preserve.ts (sentinel-cases) + judge-image.ts (NIEUW)

# Bestanden die ik NIET aanraak

- hero-paden (hero-visual-preserve.ts, patch-hero-visual.ts, generate-visual*-routes)
- copy-image-coherence-judge.ts (caller bereidt het beeld voor)

# Smoke test plan

1. Unit-smokes: sentinel-gedrag in preserve-guard (clear passeert, race blijft beschermd); judge-image downscale (groot PNG → ≤1024px jpeg)
2. tsc + lint + bestaande feature-visual-suites
3. Na merge: live probe met candidates=2 (WorkspaceAiConfig-row) → response toont winnaar + swap-gedrag; clear-knop browser-check

# Risico's

- PuckImageField/puck-config zijn vers #320-werk → kleine, additieve diffs
- Sentinel lekt naar render vóór eerste persist → renderers/gap-detectie behandelen 'm expliciet als leeg

# Out of scope

- Bron-badge op basis van persist-rows/coherence-scores (vergt component-fetch in de editor)
- Library-first matching (aparte task na embedding-backfill)

# Notes

- 2-reviewer pass: 0 critical, 6 unieke warnings — alle gefixt (swap fail-soft, sv-clear-spiegeling, allSettled, re-judge na swap, sentinel-sweep, loser-keuze) + 3 minors (telemetrie-tellers, canvas-refined-badge, magic-byte-sniff). Deferred minors: orphaned storage-files bij swap/retry (pre-existing klasse), R2-badge-heuristiek (fileName verdwijnt op R2), swap niet zichtbaar in audit-row.
- Acceptatie clear-knop + candidates=2 live-probe: na merge uitgevoerd (zie changelog).
