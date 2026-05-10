---
id: delta-1-cleanup-pack
title: Δ-1 cleanup-pack — SEVERITY_RANK + ReviewFinding type + Tab 3 deep-link parser
fase: pre-launch
priority: now
effort: 3-4 uur
owner: claude-code
status: in-progress
created: 2026-05-10
completed: -
related-adr: 2026-05-08-fval-output-schema-bevindingen
related-spec: -
worktree: -
---

# Probleem

Δ-1 trifecta (Surface C/D/E) is nu live, maar de finalize-loops van Surface D en E flagged drie cleanup-items als "separate task" om scope creep te voorkomen:

1. **`SEVERITY_RANK` triplicaat** in `src/app/api/alignment/review-external/[reviewLogId]/route.ts:31`, `src/app/api/alignment/internal-findings/[fidelityScoreId]/route.ts:17`, en `src/lib/claw/tools/analyze-tools.ts:13`. Drie keer `{ HIGH: 0, MEDIUM: 1, LOW: 2 }` met dezelfde comment over Prisma's alfabetische enum-sort. Drift-risico: als één entry stilletjes verandert (bijv. CRITICAL=−1 wordt toegevoegd), divergeert UX tussen surfaces.

2. **`ReviewFinding` type cross-couple**: `src/hooks/useInternalFindings.ts:9` importeert `ReviewFinding` uit `useReviewContent.ts` (Surface C hook). Surface C is functioneel verschillend van Surface E (extern paste/url vs intern canvas-content). Als Surface C ooit z'n type uitbreidt met source-specifieke velden, erft Surface E die zwijgend.

3. **Deep-link broken** in zowel Surface D als E: `ReviewFindingsCard` (Surface D) en `FindingsBlock` (Surface E) tonen "+ N more — Brand Alignment → Content Review" als platte tekst i.p.v. werkende link, omdat `BrandAlignmentPage` geen URL-param parser heeft die `?reviewLogId=` / `?fidelityScoreId=` accepteert. Beide tasks deferden de parser als "separate task wanneer pilot-feedback dit prioriteert" — dat moment is nu, vóór live productie.

# Voorstel

Drie kleine, onafhankelijke wijzigingen:

1. **Extract `SEVERITY_RANK`** naar `src/lib/brand-fidelity/severity-rank.ts`. De drie call-sites importeren ervan; comment over Prisma's alfabetische sort blijft naast de declaratie maar wordt single-source-of-truth.
2. **Extract `ReviewFinding` (+ enums) naar `src/types/brand-review-finding.ts`**. `useReviewContent` (Surface C) en `useInternalFindings` (Surface E) importeren beide uit de neutrale plek. Surface E hook re-exporteert niet meer uit Surface C.
3. **Add URL-param parser in `BrandAlignmentPage`**. Lees `useSearchParams` voor `reviewLogId` of `fidelityScoreId`. Als aanwezig: switch tab naar Tab 3 ("Content Review"), trigger de juiste hook (`useReviewFindings` voor extern, of nieuwe code-pad voor intern), render het bestaande `ContentReviewResult` component met de pre-loaded data. Surface D's `ReviewFindingsCard` + Surface E's `FindingsBlock` krijgen weer een werkende `<a href>` i.p.v. tekst.

# Acceptatiecriteria

- [ ] `src/lib/brand-fidelity/severity-rank.ts` bestaat met `SEVERITY_RANK` const + comment; alle drie call-sites importeren ervan; geen lokale `SEVERITY_RANK`-declaraties meer in `analyze-tools.ts`, beide alignment routes
- [ ] `src/types/brand-review-finding.ts` bestaat met `ReviewSeverity`, `ReviewCategory`, `ReviewFinding` types; `useReviewContent.ts` + `useInternalFindings.ts` importeren beide ervan; geen cross-hook-import meer
- [ ] `BrandAlignmentPage` leest `useSearchParams()` op mount; als `?reviewLogId=` aanwezig → switch tab naar 'review' + pre-load via bestaande `useReviewFindings(id)` hook; als `?fidelityScoreId=` aanwezig → switch tab naar 'review' + pre-load via `useInternalFindings(id)` hook
- [ ] `ReviewFindingsCard.tsx` (Surface D) "+ N more" tekst vervangen door `<a href={'/brand-alignment?tab=review&reviewLogId=' + reviewLogId}>` werkende link
- [ ] `FindingsBlock` (Surface E) "+ N more" tekst vervangen door `<a href={'/brand-alignment?tab=review&fidelityScoreId=' + fidelityScoreId}>` werkende link
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors in nieuwe/aangeraakte files
- [ ] Manual UX-smoke: klik "View all findings" in Brand Assistant card → Tab 3 opent met findings van die reviewLog pre-loaded; klik in PublishGate findings-block → Tab 3 opent met findings van die fidelityScore pre-loaded

# Bestanden die ik aanraak

**Server (geen wijzigingen)** — beide alignment GET routes blijven werken op hun eigen path; ze importeren straks alleen `SEVERITY_RANK` ipv inline.

**Util / Types**:
- `src/lib/brand-fidelity/severity-rank.ts` (nieuw, ~15 regels) — shared const + comment
- `src/types/brand-review-finding.ts` (nieuw, ~30 regels) — shared types

**Refactor (5 files)**:
- `src/app/api/alignment/review-external/[reviewLogId]/route.ts` (modify) — vervang inline `SEVERITY_RANK` door import
- `src/app/api/alignment/internal-findings/[fidelityScoreId]/route.ts` (modify) — idem
- `src/lib/claw/tools/analyze-tools.ts` (modify) — idem (rename `REVIEW_SEVERITY_RANK` → `SEVERITY_RANK` import)
- `src/hooks/useReviewContent.ts` (modify) — vervang lokale type-defs door import uit shared types
- `src/hooks/useInternalFindings.ts` (modify) — idem; verwijder cross-import uit `useReviewContent`

**Client UI (3 files)**:
- `src/components/brand-alignment/BrandAlignmentPage.tsx` (modify) — `useSearchParams` lezen + tab-switch + pre-load
- `src/features/claw/components/ReviewFindingsCard.tsx` (modify) — "+ N more" tekst → werkende `<a href>` link
- `src/features/campaigns/components/canvas/PublishGate.tsx` (modify) — `FindingsBlock` "+ N more" tekst → werkende `<a href>` link

**Documentatie**:
- `tasks/delta-1-cleanup-pack.md` (deze)
- `docs/changelog.md` (entry #246 bij task-finalize)

# Bestanden die ik NIET aanraak

- `prisma/schema.prisma` — geen schema-wijziging
- `src/lib/brand-fidelity/violation-to-finding.ts` — shared mapper-util ongewijzigd
- `src/lib/brand-fidelity/composition-engine.ts` — engine ongewijzigd
- `src/components/brand-alignment/ContentReviewTab.tsx` — render-componenten blijven; alleen entry-point in BrandAlignmentPage uitgebreid
- `src/components/brand-alignment/ContentReviewResult.tsx` — render-component ongewijzigd
- `src/lib/learning-loop/content-readiness.ts` — readiness-logic ongewijzigd
- `src/lib/brand-fidelity/fidelity-runner.ts` — internal runner ongewijzigd

# Smoke test plan

**Geen server-side smoke nodig** — pure refactor + UI-extension, gedragsmatig identiek aan pre-cleanup. Type-check + lint dekken de refactor.

**Manual UX-smoke**:

1. **Surface D deep-link**: open Brand Assistant chat, plak fluff-tekst, vraag review → krijg `ReviewFindingsCard` met findingsCount > 3 → klik "View all N findings" link → Tab 3 opent met die specifieke review pre-loaded
2. **Surface E deep-link**: trigger inject-fixture script op een deliverable → open Canvas Step 4 Planner → klik "+ N more" link in FindingsBlock → Tab 3 opent met die specifieke fidelity-score pre-loaded
3. **Direct URL access**: paste `localhost:3000/brand-alignment?tab=review&reviewLogId=<id>` in browser → tab opent + findings rendered
4. **Backward-compat**: open `localhost:3000/brand-alignment` zonder URL-params → standaardflow (lege Tab 3 met paste/url-input) zoals voor cleanup

# Risico's

- **Pre-load met onbekende ID**: als URL-param een niet-bestaande / cross-workspace ID bevat, moet UI een nette error tonen i.p.v. te crashen. **Mitigatie**: hooks hebben al error-state; `ContentReviewResult` rendert dan een empty/error message. Verifieer in manual smoke 1-2.
- **Tab 3 entry-point ambiguïteit**: oude flow = paste-input form bovenaan, nieuwe flow = pre-loaded findings. Render-conditioneel: als URL-param aanwezig, skip de form en toon direct findings + een "Run nieuwe review" knop. **Mitigatie**: render-conditie expliciet, bestaande paste-flow blijft default.
- **`fidelityScoreId` vs `reviewLogId` URL-param disambiguation**: beide geldig, mutually exclusive. Welke wint als beide gezet zijn? **Beslissing**: `reviewLogId` heeft voorrang (Surface C/D primair); `fidelityScoreId` als fallback.

# Out of scope

- Search/filter UI in Tab 3 voor history van reviews — Δ-1 v2
- Apply-suggestion inline-fix vanuit Tab 3 — Δ-1 v2
- Multi-review compare — Δ-1 v2
- Notification bij findings-update — Δ-1 v2
- Permalink-share van een review (auth-gated) — separate task
- ContentFidelityScore.findingsCount backfill voor pre-Δ-1 rijen — separate task
- Migratie van legacy `Deliverable.settings.fidelityScore` JSON-blob — separate cleanup-task

# Notes

**Phase -1 Gates resultaat**:
- Simplicity Gate: PASS (10 files totaal, waarvan 5 pure refactor + 2 nieuwe util-files + 3 UI-modifications)
- Anti-Abstraction Gate: PASS (extracts zijn dedup, geen wrapper-toevoeging)
- Integration-First Gate: PASS (deep-link parser is 1-richting URL→state, geen nieuwe contract)

**ADR-noodzaak**: NEE
- Geen schema-wijziging
- Geen nieuwe `src/lib/<module>/` directory; severity-rank.ts past in bestaande brand-fidelity/
- Geen pattern-introductie buiten conventies (URL-param read via `useSearchParams` is bestaand pattern)

**Cross-links**:
- Surface C task: `tasks/done/content-review-tab-3-ui.md` (entry #243)
- Surface D task: `tasks/done/content-review-chat-tool.md` (entry #244)
- Surface E task: `tasks/done/publishgate-findings-block.md` (entry #245)
- ADR-1 BrandReviewFinding XOR-relatie: `docs/adr/2026-05-08-fval-output-schema-bevindingen.md`
