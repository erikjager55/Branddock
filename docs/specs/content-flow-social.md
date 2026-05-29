# Content-flow analyse — Social

> **Status**: ingevuld 2026-05-29 · sub-sprint **#7.A** · methode: code-audit
> **Types (12, "Social Media")**: `linkedin-post` · `linkedin-carousel` · `linkedin-video-ad` · `linkedin-newsletter` · `linkedin-video` · `linkedin-event` · `linkedin-poll` · `instagram-post` · `twitter-thread` · `facebook-post` · `tiktok-script` · `social-carousel`
> Bron: `deliverable-types.ts:362-586` · templates: `social-media.ts` (incl. `linkedin-article` [UI: long-form] + `linkedin-ad`/`facebook-ad` [UI: advertising])

## 1. Pipeline-doorloop — category-specific checkpoints

Standaard angle-based dual-call pad (`canvas-orchestrator.ts:175`). **Geen Plan-and-Solve** (long-form-only), **geen SEO** (website-only).

- **`validateAngleDiversity`** (`checkpoint-gates.ts:155`) is voor social het meest waardevol: korte posts leunen sterk op de hook/angle, dus angle-collapse (twee bijna identieke varianten) is hier het grootste kwaliteitsrisico.
- **Scripted-scene**: `tiktok-script` valt onder de scripted-scene behandeling (`canvas-orchestrator.ts` `isScriptedScene`, `:133-137`) — hook/body/cta als scènes met `[VISUAL]`-cues.
- **Carousel-types** (`linkedin-carousel`, `social-carousel`, `instagram-post` carousel) hebben multi-slide structuur via component-templates — bron van bekende gaps (§6).

## 2. Prompt-quality

- **Bestand**: `src/lib/studio/prompt-templates/social-media.ts` — 1200 regels (grootste categorie-bestand), `PROMPT_VERSION 1.3.0`. Bevat 15 templates: alle 12 social-types + `linkedin-article` + `linkedin-ad` + `facebook-ad`.
- **Alle 12 social-types hebben een dedicated template** — geen generieke fallback in deze categorie.
- **Few-shot**: ≈40 example-referenties — verreweg de rijkste categorie qua voorbeelden.
- Gedeelde helper `buildSocialUserPrompt`.

## 3. Output-format (geverifieerd)

`linkedin-post`/`linkedin-event`/`facebook-post` Text+Image · `linkedin-carousel`/`social-carousel` Carousel · `instagram-post` Image+Carousel · `linkedin-video-ad` Text+Video · `linkedin-newsletter`/`linkedin-video`/`linkedin-poll`/`twitter-thread`/`tiktok-script` Text.

## 4. Asset-pattern

- **Hero image**: `linkedin-post`, `linkedin-event`, `facebook-post`, `instagram-post`.
- **Carousel/slides**: `linkedin-carousel`, `social-carousel`, `instagram-post`.
- **No-asset**: `linkedin-newsletter`, `linkedin-poll`, `twitter-thread`.
- **Script/video**: `tiktok-script`, `linkedin-video`, `linkedin-video-ad`.

## 5. Recente gotchas (categorie-relevant)

- **2026-05-17 — Effie-jargon lek** (`gotchas.md:10-13`). Ontdekt juist tijdens handmatige `linkedin-post` test; treft alle social-types via de gedeelde Strategy-step. Opgelost.
- **2026-05-08 — ConceptReviewView button silent-disabled** (`gotchas.md:15-18`). Raakt de variant-rating flow waar social posts doorheen lopen.

## 6. Friction-points

- **Hidden-types backlog**: `linkedin-carousel`, `linkedin-video-ad`, `linkedin-newsletter`, `linkedin-video`, `linkedin-event`, `tiktok-script`, `social-carousel` staan `hidden: true` (wachtend op multi-slide/video-pipeline). Live status: `deliverable-types.ts:362-586`.
- **Carousel multi-slide pipeline** ontbreekt nog volledig (oorzaak van de carousel hidden-flags).
- **Ronde 1**: `linkedin-post`, `linkedin-ad`, `linkedin-poll`, `instagram-post` afgetekend; **`twitter-thread` is de volgende open representant** met bekende routing + preview-map gaten + ontbrekende content-templates-fallback. Overige — *pending Ronde 1*.

## 7. Verbeter-aanbevelingen

1. **`twitter-thread` routing + preview-map + content-templates-fallback dichten** — bekende gaten, eerstvolgende Ronde 1 representant. → ticket CF-2.
2. **Carousel multi-slide pipeline** bouwen zodat de hidden carousel-types geactiveerd kunnen worden (eigen task, geen #7.A-werk).
3. **Angle-diversity gate aanscherpen voor social** specifiek (korte posts profiteren het meest van twee echt verschillende hooks).

## 8. Cross-type patterns / DRY

- 12 types delen `buildSocialUserPrompt`; system-prompts uniek per platform → geen DRY van system-prompts.
- **Categorie-grens-inconsistentie**: `social-media.ts` bevat ook `linkedin-article` (UI long-form) en `linkedin-ad`/`facebook-ad` (UI advertising) → platform-grouping wijkt af van UI-categorie. Synthesis §D + ticket CF-8.

## Referenties (file:line)

- `canvas-orchestrator.ts:175`, `:133-137` (scripted-scene incl. tiktok)
- `src/lib/studio/prompt-templates/social-media.ts` (1200r, v1.3.0, 15 templates)
- `checkpoint-gates.ts:155` (angle-diversity)
- `deliverable-types.ts:362-586`
- `gotchas.md:10-13`, `:15-18`
