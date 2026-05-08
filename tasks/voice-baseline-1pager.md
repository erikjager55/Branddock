---
id: voice-baseline-1pager
title: Voice Baseline 1-pager — afgeleide compact view uit BrandVoiceguide (Δ-3)
fase: pre-launch
priority: now
effort: 2-3 dagen
owner: claude-code
status: in-progress
sub-cluster: A — pure derivation function (in scope, this commit)
sub-cluster-deferred: B — UI component + hook, C — F-VAL judge-prompt embed, D — getBrandContext cache integration
created: 2026-05-08
completed: -
related-adr: -
related-spec: tasks/_drafts/idea-brand-control-program.md
worktree: branddock-program-p1
---

# Probleem

`BrandVoiceguide` (BV-0/1/2/3/5 gebouwd 2026-05-06) bevat alle ingrediënten voor een merk-voice-werkkader: 5+ voice-attributen op spectrum, declared `wordsWeUse` / `wordsWeAvoid` / `antiPatterns`, writing-samples, brand-voice-description. Maar geen consumer leest dit als één compact-werkkader-view: AI-prompts in `src/lib/studio/brand-voice-directive.ts` rommelen losse velden bij elkaar, UI toont individuele BV-secties verspreid, F-VAL judge-prompt referenceert delen via aparte includes. Methodology-research §3 stelt expliciet dat zonder samengeperst werkkader feedback subjectief wordt — zowel voor menselijke reviewer als AI-judge.

Bovendien is dit Δ-3 een directe consumer van Δ-1 (Content Review) en Phase 3 Strategy Analyst: alle drie hebben dezelfde "wat is de baseline waar tegen we beoordelen"-vraag. Eén canonical 1-pager voorkomt drift over consumers.

# Voorstel

Afgeleide read-only 1-pager view uit `BrandVoiceguide`: 5 voice-attributen op spectrum (extracted/projected), top-10 preferred termen + top-10 avoid termen, 3 style-rules (afgeleid uit antiPatterns + declared brandstyle). Render als header-component bovenaan Brand Alignment + embed als compacte string in F-VAL judge-prompt + consumer voor Strategy Analyst stub. Auto-update wanneer BV verandert (geen aparte cache; reads BV live via `getBrandContext` 5-min cache).

# Acceptatiecriteria

## Derivation logic
- [ ] `src/lib/brand-fidelity/voice-baseline-1pager.ts` (nieuw) — pure derivation function `deriveVoiceBaseline1Pager(voiceguide: BrandVoiceguide): VoiceBaseline1Pager` met typed shape
- [ ] Schema: `{ attributes: VoiceAttribute[5], preferredTermsTop10: string[], avoidTermsTop10: string[], styleRules: string[3] }`
- [ ] `VoiceAttribute = { name: string, polePos: string, poleNeg: string, sampleAffirmative: string }`
- [ ] Voice attributes: pak top 5 uit `voiceguide.voiceAttributes` (or projected from `voiceguide.writingSamples` wanneer < 5 declared); `polePos` + `poleNeg` uit attribute spectrum-poles uit Bijlage A van methodology
- [ ] Top-10 preferred: `voiceguide.wordsWeUse.slice(0, 10)` met fallback `[]` wanneer leeg
- [ ] Top-10 avoid: `voiceguide.wordsWeAvoid.slice(0, 10)` met fallback `[]`
- [ ] Style rules: top 3 uit `voiceguide.antiPatterns` (geconverteerd naar imperatieve rule-vorm) of afgeleid uit `Brandstyle.toneOfVoice` wanneer antiPatterns < 3
- [ ] `formatVoiceBaseline1Pager(baseline: VoiceBaseline1Pager): string` — compacte markdown-string ≤ 300 woorden voor prompt-embed

## UI surface
- [ ] `src/features/brand-alignment/components/VoiceBaseline1Pager.tsx` (nieuw) — header-component voor Brand Alignment
- [ ] Toont 5 attribute-spectrum (visueel met polen) + 10/10 termen (compact-grouped) + 3 rules (numbered list)
- [ ] Visible op alle 4 Brand Alignment tabs (Internal Scan / Brand Audit / Content Review / Insights) — header positie
- [ ] Read-only — geen edit-UI (BV-edit lives in dedicated BV-editor pages)
- [ ] Layout max 1 viewport-hoogte op desktop; collapse-toggle voor mobile

## F-VAL prompt embed
- [ ] `src/lib/studio/brand-voice-directive.ts` extended met `formatVoiceBaseline1Pager(voiceguide)` als compacte string output
- [ ] F-VAL judge-prompt-builder (`g-eval-rubric.ts` of `judge-dispatcher.ts`) consumeert deze string als `BRAND_VOICE`-section; vervangt losse-veld-includes
- [ ] Strategy Analyst stub (Phase 3) consumeert dezelfde 1-pager via `deriveVoiceBaseline1Pager` — single source of truth shared across consumers

## Cache + freshness
- [ ] `getBrandContext(workspaceId)` 5-min cache returnt 1-pager als sub-veld
- [ ] BV-mutaties triggeren `invalidateCache(cacheKeys.prefixes.brandContext(workspaceId))` (bestaande pattern)

## Quality gates
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test: render voor BB BrandVoiceguide → verify 5 attributes + 10/10/3 shape
- [ ] Smoke-test: render voor workspace zonder voiceguide → fallback "Voice baseline nog niet vastgelegd; voltooi BrandVoiceguide" UI met deeplink naar BV editor
- [ ] Smoke-test: F-VAL judge-prompt op BB content → verify embedded 1-pager string ≤ 300 woorden via prompt-log
- [ ] Smoke-test: edit BB voiceguide.wordsWeUse → wait 5min cache TTL OR invalidate → 1-pager re-renders met nieuwe term in top-10

# Bestanden die ik aanraak

## Derivation + types
- `src/lib/brand-fidelity/voice-baseline-1pager.ts` (nieuw) — `deriveVoiceBaseline1Pager` + `formatVoiceBaseline1Pager` + `VoiceBaseline1Pager` + `VoiceAttribute` types

## UI
- `src/features/brand-alignment/components/VoiceBaseline1Pager.tsx` (nieuw)
- `src/components/brand-alignment/BrandAlignmentPage.tsx` — header-include voor 1-pager-component
- `src/features/brand-alignment/hooks/use-voice-baseline.ts` (nieuw) — TanStack Query hook + 5-min staleTime

## F-VAL prompt embed
- `src/lib/studio/brand-voice-directive.ts` — extended met formatVoiceBaseline1Pager export
- `src/lib/brand-fidelity/judge-dispatcher.ts` of `src/lib/brand-fidelity/g-eval-rubric.ts` — judge-prompt-builder consumeert 1-pager
- `src/lib/ai-context.ts` — cache 1-pager als sub-veld in `getBrandContext` (existing 5-min pattern)

# Bestanden die ik NIET aanraak

- `BrandVoiceguide` Prisma schema — geen wijzigingen, alleen reads
- BV-extraction pipeline (BV-0/1/2/3/5) — onaangeraakt; reads finished output
- Direct prompt-injectie in studio routes — alleen via `getBrandContext` cache
- Edit-UI voor BrandVoiceguide — out-of-scope (read-only derived view)
- Brandstyle scraper — niet gerelateerd
- F-VAL Pijler 1 + 3 — niet gewijzigd; alleen Pijler 2 (judge-prompt) consumeert 1-pager

# Smoke test plan

1. **BB happy path**: open Brand Alignment → 1-pager toont 5 BB voice-attributes (Confident/Practical/Witty/Direct/Empathetic of equivalent) + 10 BB preferred terms + 10 BB avoid terms + 3 style-rules. Visueel correct, geen overflow.
2. **Empty voiceguide**: workspace zonder BV → 1-pager component toont "Voice baseline nog niet vastgelegd; voltooi BrandVoiceguide" met deeplink naar BV editor route
3. **Partial voiceguide (< 5 attributes)**: workspace met 3 declared attributes → toont 3 attributes plus subtle hint "Voltooi BV voor volledig 1-pager (X/5 attributes)"
4. **Less than 10 terms**: voiceguide met 5 wordsWeUse → toont alle 5, geen truncation; geen mock-fillers
5. **F-VAL embed test**: run F-VAL judge op BB content → judge-prompt log toont embedded 1-pager-string ≤ 300 woorden + alle 5 attributes + 10/10/3 zichtbaar
6. **Cache freshness**: edit BB voiceguide.wordsWeUse via UI → wait 5min cache TTL OR trigger invalidateCache → 1-pager re-renders met nieuwe term
7. **Tab persistence**: scroll Brand Alignment Tab 1 → switch naar Tab 3 (Content Review) → 1-pager blijft zichtbaar (header, niet tab-content)
8. **Strategy Analyst consume**: in Phase 3 Strategy Analyst-stub, 1-pager consumeerbaar via dezelfde `deriveVoiceBaseline1Pager` import (single source of truth verified via grep — geen duplicate-derivation in Analyst code)
9. **`npx tsc --noEmit`** 0 errors + **`npm run lint`** 0 errors

# Risico's

- **BV minder rijk dan 5 attributes** (medium): voiceguide kan < 5 attributes hebben. Mitigatie: degrade gracefully — render available count + signal "Voltooi BV (X/5)". Geen mock-data fillers.
- **Top-10 truncatie verliest signaal** (laag): wordsWeUse kan > 10 terms hebben — top-10 cutoff is arbitrair. Mitigatie: priority-order per BV-1 algorithm (existing); top-10 = head van geordende lijst, niet random
- **F-VAL prompt-bloat** (laag): embedded 1-pager + bestaande prompt-context kan token-budget verhogen. Mitigatie: compacte format ≤ 300 words, measure judge-call latency pre/post Δ-3 — accept ≤ 10% increase
- **Strategy Analyst coupling** (laag): Phase 3 Analyst-stub consumeert dezelfde 1-pager. Wijzigen van shape brengt Analyst in sync. Mitigatie: derivation-types in dedicated file, `VoiceBaseline1Pager` exported zodat Analyst importeert (single source of truth)
- **Style-rules afleiding kwaliteit** (medium): conversie van `antiPatterns` naar imperatieve regels kan stilistisch onsamenhangend zijn. Mitigatie: 3 rules slechts placeholder voor v1; manual override-veld in BV-editor wordt vervolgvraag indien feedback laag
- **Visual-design gat** (medium): 5-attribute spectrum visueel weergeven vereist UI-design beslissing (sliders? bars? text-only?). Mitigatie: starten met text-only (bullet `Attribute: PolePos | PoleNeg`), upgrade naar visueel spectrum als post-Δ-3 polish

# Out of scope

- **Editing UI voor 1-pager** — read-only derived view; BV-edit lives in dedicated BV-editor pages
- **Per-locale 1-pager varianten** — 1-pager taalt zich naar `BrandVoiceguide.contentLocale` (uit ADR-3) via formattering, maar genereert geen aparte translaties
- **Historische 1-pager-snapshots** — derived view, geen versionering. Wanneer BV verandert, 1-pager verandert mee
- **Cross-workspace voice-comparison UI** — out (Brandclaw post-launch maand 5+)
- **Style-rules learning from F-VAL violations** — out (iteratie 3 mogelijk: F-VAL detecteert antiPatterns die in style-rules ontbreken, suggesteert toevoeging)
- **PDF/print-export van 1-pager** — out v1; markdown-format is voldoende voor prompts. Print-export volgt indien klant-vraag
- **Multi-brand workspace support** — voor agency-tenants met meerdere brands per workspace, 1-pager toont actieve brand. Multi-brand picker is separate feature.
- **A/B testing van 1-pager prompt-format vs. losse-veld-format** — out v1; landing met confidence dat 1-pager beter is per methodology

# Notes

Bron-research methodology §3 + Bijlage A (voice-attribute spectrum template) + Bijlage B (sjabloon voor één voice-attribute). Het 1-pager-format is direct uitlegbaar aan klant: 5 attributes + 10 termen we wel gebruiken + 10 termen we vermijden + 3 stijl-rules — past op één scherm of A4.

Δ-3 is consumer voor twee downstream features:
- F-VAL judge-prompt (vervangt losse-veld-rommel) — direct adoptie tijdens deze task
- Strategy Analyst stub Phase 3 — zelfde 1-pager als context-input; Phase 3 task-file refereert deze module via import

Cross-link met Δ-1 (Content Review): 1-pager wordt zichtbaar als header in Brand Alignment Tab 3 (Content Review) zodat user de baseline ziet die F-VAL gebruikt. Vereenvoudigt user-trust ("dit is wat de AI als baseline neemt"). Ook: Δ-1 paste-in-flow consumeert dezelfde 1-pager via F-VAL judge-prompt embed — automatisch.

Implementatie-volgorde (aanbevolen):
1. Pure derivation-functie eerst (TDD-vriendelijk; testbaar zonder UI of F-VAL)
2. UI-component in Brand Alignment (kort gebruik visueel valideren)
3. F-VAL embed laatst (vereist judge-prompt-rebuild + smoke-run)

Cross-task dependencies: geen blokkers. Δ-3 kan parallel met Δ-2 lopen — verschillende files, verschillende concerns. Gemeenschappelijke `BrandVoiceguide` reads zijn read-only.
