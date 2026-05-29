# Content-flow analyse — Advertising

> **Status**: ingevuld 2026-05-29 · sub-sprint **#7.A** · methode: code-audit
> **Types (8, "Advertising & Paid")**: `linkedin-ad` · `facebook-ad` · `search-ad` · `social-ad` · `display-ad` · `retargeting-ad` · `video-ad` · `native-ad`
> Bron: `deliverable-types.ts:409-665` · templates: `advertising.ts` (6) + `social-media.ts` (`linkedin-ad`, `facebook-ad`)

## 1. Pipeline-doorloop — category-specific checkpoints

Standaard angle-based dual-call pad (`canvas-orchestrator.ts:175`). Geen Plan-and-Solve, geen SEO.

- **`validateVariantOutput`** (`checkpoint-gates.ts:205`) is hier kritiek: ads hebben harde karakter-/woordlimieten per component (search-ad 270 chars, display-ad ~30w). Variant buiten format = block.
- **`video-ad`** valt onder scripted-scene behandeling (`canvas-orchestrator.ts` `isScriptedScene`, `:133-137`).
- Ads gebruiken componentrijke templates (meerdere headline-/description-slots) → meeste afzonderlijke gegenereerde componenten van alle categorieën.

## 2. Prompt-quality

- **Bestand**: `src/lib/studio/prompt-templates/advertising.ts` — 639 regels, `PROMPT_VERSION 1.2.0` — bevat de 6 "pure" ad-types. `linkedin-ad` + `facebook-ad` worden getemplate in `social-media.ts` (platform-grouping). Alle 8 advertising-types hebben dus een dedicated template — **geen generieke fallback in deze categorie**.
- **Few-shot**: ≈7 example-referenties — relatief mager voor een categorie met de strengste format-eisen; search-ad rijk, rest dunner.
- Gedeelde helper `buildAdUserPrompt`. AIDA-varianten per platform.

## 3. Output-format (geverifieerd)

`search-ad`/`video-ad`/`native-ad` Text · `social-ad`/`display-ad`/`retargeting-ad`/`linkedin-ad`/`facebook-ad` Text+Image (`deliverable-types.ts`). Multi-slot component-output (headlines + descriptions).

## 4. Asset-pattern

- **Hero image**: `social-ad`, `display-ad`, `retargeting-ad`, `linkedin-ad`, `facebook-ad`.
- **No-asset**: `search-ad`, `native-ad`.
- **Script**: `video-ad`.
- Display-ad gemigreerd naar Google Responsive Display Ads asset-library (multi-aspect image + asset-set i.p.v. fixed banners — zie ADR ad-quality-validation).

## 5. Recente gotchas (categorie-relevant)

- **2026-05-22 — React hooks-rules violation in `DisplayAdPreview.tsx`** (`gotchas.md:159-167`). `useEditableEntry` in een `.map()` over 5 headline + 5 description slots → tsc groen, lint faalt. Display-ad specifiek door de vele slots.
- **2026-05-22 — Client component trekt server-only modules in bundle** (`gotchas.md:169-177`). `Step2ContentVariants` → `VariantAdQualityIndicator` → `@/lib/ad-validation` barrel → `prisma`/`pg`/`tls`.
- **2026-05-17 — Effie-jargon lek** (`gotchas.md:10-13`) — gedeelde Strategy-step.

## 6. Friction-points

- **Few-shot tekort vs. strikte format**: ads hebben de hardste constraints maar magere voorbeeld-dekking (≈7 voor 8 types) → meeste format-block-risico bij generatie.
- **Platform-grouping verwarrend**: `linkedin-ad`/`facebook-ad` zitten in `social-media.ts` terwijl ze UI-categorie "Advertising" zijn → onderhouds-frictie bij ad-template-wijzigingen.
- **Hidden**: `linkedin-video-ad` (in social) + enkele varianten hidden — live status: `deliverable-types.ts`.
- **Ronde 1**: `linkedin-ad` afgetekend; overige — *pending Ronde 1*.

## 7. Verbeter-aanbevelingen

1. **Few-shot uitbreiden voor display/social/retargeting/native** (1→2-3 per type) — direct format-compliance effect bij de strengste constraints. → ticket CF-5.
2. **Platform-grouping documenteren of consolideren**: maak expliciet dat LinkedIn/Facebook-ads in `social-media.ts` leven (of verplaats naar `advertising.ts`). → ticket CF-8.
3. **Ad-quality preview-keten** server/client-grens harden (al opgelost; regressie-case #7.B).

## 8. Cross-type patterns / DRY

- 6 ad-types delen `buildAdUserPrompt`; LinkedIn/Facebook-ads delen `buildSocialUserPrompt`.
- **Geen duplicate system-prompts** (eerdere "8 vs 6" indruk was de base/helper-prompts, niet extra type-templates).

## Referenties (file:line)

- `canvas-orchestrator.ts:175`, `:133-137` (scripted-scene flag)
- `src/lib/studio/prompt-templates/advertising.ts` (639r, v1.2.0; 6 types) + `social-media.ts` (linkedin-ad, facebook-ad)
- `checkpoint-gates.ts:205` (variant-output)
- `deliverable-types.ts:409-665`
- `gotchas.md:159-167`, `:169-177`, `:10-13`
- ADR `docs/specs/ad-quality-validation.md`
