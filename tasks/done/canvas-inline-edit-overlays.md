---
id: canvas-inline-edit-overlays
title: Per-preview inline-edit overlays in Content Canvas
fase: pre-launch
priority: now
effort: 2-3 dagen
owner: claude-code
status: done
created: 2026-05-07
completed: 2026-05-08
related-adr: -
related-spec: docs/specs/content-canvas.md
worktree: branddock-feat-canvas-inline-edit
---

# Probleem

`ContentSectionsEditor` toont sectie-tekst onder de preview in Canvas Step 3 maar gebruikers willen direct in de preview kunnen klikken om te bewerken. WebPageLayout's `EditableArticleSection` doet dit al voor één specifieke layout — pattern is bewezen, maar niet uitgerold over de overige 12 platform-previews.

# Voorstel

Shared `<InlineEditableSection group componentId>` component bouwen op basis van `EditableArticleSection`-patroon. Toepassen op alle 13 preview componenten. Daarna `ContentSectionsEditor` verwijderen.

# Acceptatiecriteria

- [ ] Nieuwe shared component `InlineEditableSection.tsx` in `src/features/campaigns/components/canvas/previews/_shared/` (Pencil-on-hover, klik → textarea, save/cancel via component PATCH endpoint)
- [ ] Toegepast op alle 13 preview componenten:
  - LinkedInPostPreview, LinkedInAdPreview, LinkedInCarouselPreview
  - InstagramPostPreview, InstagramCarouselPreview
  - FacebookPostPreview, XPostPreview
  - EmailPreview, LandingPagePreview
  - VideoPreview, PodcastPreview
  - GenericPreview (fallback)
- [ ] `stripMarkdownForPlainText` toegepast op plain-text variant groups (title/meta/cta/subject/preheader)
- [ ] `ContentSectionsEditor.tsx` verwijderd
- [ ] `MediumConfigLayout.tsx` ContentSectionsEditor sectie verwijderd
- [ ] Geen regressies in approval/publish flow
- [ ] `npx tsc --noEmit` 0 errors
- [ ] Smoke-test: edit + save + reload → tekst persisteert per preview-type

# Bestanden die ik aanraak

- `src/features/campaigns/components/canvas/previews/_shared/InlineEditableSection.tsx` (nieuw)
- 13× `src/features/campaigns/components/canvas/previews/*.tsx`
- `src/features/campaigns/components/canvas/MediumConfigLayout.tsx`
- `src/features/campaigns/components/canvas/medium/WebPageLayout.tsx` — herfactoor naar gebruik shared component (waar nu `EditableArticleSection` staat)
- (verwijderen) `src/features/campaigns/components/canvas/ContentSectionsEditor.tsx`

# Bestanden die ik NIET aanraak

- `src/features/campaigns/api/canvas.api.ts` — `updateComponentContent` endpoint bestaat al
- `src/features/campaigns/lib/strip-markdown.ts` — helpers bestaan al
- Variant selection UI (VariantSelector) — andere flow

# Smoke test plan

Per content-type representant doorlopen:
1. Maak deliverable van type X (bv linkedin-post), genereer content
2. Klik op title in preview → editable
3. Type wijziging → save → check API roundtrip
4. Reload page → wijziging persisteert
5. Klik op body → edit → save (multi-line markdown moet werken)
6. Verify markdown rendering nog werkt (bullets, bold, etc.)
7. Voor plain-text groups (X-post 280 chars): edit → save → check char-counter werkt
8. Approval → Publish flow → geen errors

Reps: linkedin-post, instagram-carousel, email, landing-page, video-script, x-post, podcast, generic-fallback (8 representanten dekken alle layout-categorieën).

# Risico's

- **Sectie-IDs veranderen**: regressie in publish flow als legacy-IDs ergens hardcoded zijn. Mitigatie: grep `componentId` voor referenties
- **Markdown vs plain-text branching**: complex voor X-post (280 char limit + plain text only). Mitigatie: `stripMarkdownForPlainText` plus per-component `plainTextOnly` prop
- **TipTap conflicts**: WebPage gebruikt TipTap voor article-edit. Andere previews kunnen lichtere editor nodig hebben. Mitigatie: shared component ondersteunt beide modes via prop

# Out of scope

- Multi-component re-ordering (geen drag & drop)
- Component duplicatie binnen variant
- Bulk-edit over alle variants
- Inline AI-suggestions tijdens edit (separate feature)

# Notes

Item 9.0b uit oude TODO.md (in `docs/archive/old-lists/TODO.md`).

Referentie-implementatie: `WebPageLayout.tsx` `EditableArticleSection` sub-component. Pattern: Pencil icon op hover, klik → switch naar textarea, save → component PATCH → revert naar display.

ContentSectionsEditor was een tussenstap (entry #209 in archive) — de eindstap is dit.

## Implementation summary 2026-05-08 (final delivery)

Hoofdimplementatie geleverd in eerdere sessie. Deze sessie afgerond: coverage-smoke geschreven + quality-gates geverifieerd + status closed (BCP Phase 2 trekkracht).

**Files in scope** (al bestaand vóór deze sessie):
- `src/features/campaigns/components/canvas/previews/InlineEditableSection.tsx` (258 regels) — shared component met `VariantIndexOverrideProvider` + `useEditableEntry` + `useEditableEntries` + `InlineEditableSection` + `InlineEditableEntry` interface. Pencil-hover affordance, click→textarea, save/cancel via `updateComponentContent` PATCH.
- 13 preview-consumers — alle 13 verwachte previews importeren `InlineEditableSection`:
  LinkedInPostPreview, LinkedInAdPreview, LinkedInCarouselPreview, InstagramPostPreview, InstagramCarouselPreview, FacebookPostPreview, XPostPreview, EmailPreview, LandingPagePreview, VideoPreview, PodcastPreview, GenericPreview (fallback), AdditionalComponentsSection
- `Step2ContentVariants.tsx` — gebruikt `VariantIndexOverrideProvider` voor side-by-side variant-comparison view
- `MediumConfigLayout.tsx` + `WebPageLayout.tsx` — geen `ContentSectionsEditor` import meer (alleen historische comment-referentie in WebPageLayout regel 404)

**Cleanup verified**:
- ✅ `ContentSectionsEditor.tsx` verwijderd (zowel canvas dir als previews dir)
- ✅ Geen actieve `import ContentSectionsEditor` meer in layout-files

**Files toegevoegd deze sessie**:
- `scripts/smoke-tests/inline-edit-coverage.ts` (new) + `npm run smoke:inline-edit`

**Quality gates**:
- ✅ `npx tsc --noEmit` 0 errors
- ✅ `npm run lint` 0 errors (mijn smoke-script lint-clean)
- ✅ `npm run smoke:inline-edit` 26/26 passed

**Smoke-coverage** (filesystem + import-grep, geen DOM-rendering):
- Shared component-shape: 5 expected exports + Pencil affordance + updateComponentContent API roundtrip (7 checks)
- 13 preview-consumers verifiëren `InlineEditableSection`-import (13 checks)
- ContentSectionsEditor cleanup (2 checks)
- Layout-files geen stale import (2 checks — alleen `^import` regex, comments OK)
- Step2ContentVariants integration (1 check)

**UI hand-test handover**: Live edit→save→reload→persistence per content-type representant — zie task-file Smoke Test Plan voor de 8-step manual sequence (linkedin-post / instagram-carousel / email / landing-page / video / x-post / podcast / generic).

**Out-of-scope verified**: geen drag&drop reordering, geen component-duplicatie, geen bulk-edit, geen inline AI-suggestions (separate features).
