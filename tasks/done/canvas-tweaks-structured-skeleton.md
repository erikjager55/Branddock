---
id: canvas-tweaks-structured-skeleton
title: Per-type inputs voor structured / multi-section content (carousels, web-pages, decks, podcast/webinar) + naked-type fixes
fase: pre-launch
priority: now
effort: 2 dagen
owner: claude-code
status: done
created: 2026-05-08
completed: 2026-05-08
related-adr: -
related-spec: docs/audits/2026-05-08-canvas-per-item-tweaks-plan.md
worktree: branddock-feat-canvas-structured
---

# Probleem

Multi-section content (carousels, landing-pages, decks, ebooks, podcast/webinar-outlines, comparison-pages) krijgt nu impliciet structuur via slide/section-counts (`slidesCount`, `sectionCount`, `chapterCount`) maar **geen skeleton-input** met expliciete titels / topics / beats. Gevolg: AI vult het skelet zelf in en doet dat generiek (bv. carousel met "Tip 1: Start strong, Tip 5: Stay consistent"). Een expliciete `slideTitles: [...]` of `agendaSkeleton: [...]` verhoogt structuur dramatisch.

Bijvangst: 6 testplan-types staan rauw zonder volledige bundle (`linkedin-event`, `linkedin-poll`, `instagram-post`, `newsletter`, `microsite`, `welcome-sequence`). Voor 3 daarvan (`instagram-post`, `microsite`, `newsletter`) is dit een echte gat — bundle-velden ontbreken en moeten alsnog gewired. De andere 3 hebben campaign-data-velden die volstaan. Audit 2026-05-08 sectie 1 + 2 detailleert.

# Voorstel

Eén nieuwe builder in `content-type-inputs.ts`:

- `skeletonInputFields()` (parametrized) — accepteert kind = `slide` / `section` / `chapter` / `agenda` / `segment`. Levert:
  - `*Skeleton` (tags, optioneel) — lijst van titels / topics / beats
  - `firstSlideHook` / `firstSectionHook` (text, kind-afhankelijke key) — opening
  - `payoffPosition` (number, optioneel) — slide/section nummer waar pay-off landt

Plus per-type aanvullingen volgens audit-matrix sectie 2 (Carousel, Website, Sales, Video & Audio sub-rijen).

**Naked-type fixes**:
- `instagram-post` — wire `socialContentStyleFields()` + nieuwe `hookFormat` + `payoffPromise` (overlap met conversion-task; coördineren)
- `microsite` — wire `webPageContentStyleFields()` + `pageSkeleton` (skeletonInputFields kind=section)
- `newsletter` — wire `emailContentStyleFields()` + `featuredItem` + `recurringSegments`

**Scope-types** (13):
- Structured: linkedin-carousel, social-carousel, ebook, sales-deck, landing-page, product-page, comparison-page, webinar-outline, podcast-outline
- Naked-fix: instagram-post, microsite, newsletter
- Plus opt-in: video scripts (linkedin-video, explainer-video, promo-video, tiktok-script) krijgen `sceneSkeleton` als opt-in via `kind=segment`

# Acceptatiecriteria

- [ ] Nieuwe builder `skeletonInputFields(kind)` in `content-type-inputs.ts`
- [ ] Per-type aanvullingen toegevoegd voor 9 structured-types
- [ ] 3 naked-types gefixt: bundles toegevoegd waar ze ontbreken
- [ ] Skeleton-velden zijn `aiDerivable: true` zodat Asset Planner placeholder-skeleton voorstelt
- [ ] `canvas-orchestrator.ts` interpoleert skeleton-list als expliciete instructie ("Use these section titles in this order, do not invent new ones")
- [ ] ContextPanel rendert tags-input voor skeleton zonder UI-drift bij 5+ items
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test: regenerate `linkedin-carousel` met `slideTitles: ["Het probleem", "Stat", "Onze oplossing", "Bewijs", "CTA"]`, verifieer dat slide-titels exact matchen
- [ ] Smoke-test: regenerate `landing-page` met `sectionSkeleton: [...]` en verifieer sectie-volgorde + titels
- [ ] Smoke-test: instagram-post heeft nu hashtagStrategy + hookFormat (verifieer via dev-tools dat fields renderen)

# Bestanden die ik aanraak

- `src/features/campaigns/lib/content-type-inputs.ts` (1 parametrized builder + 9 type-extensies + 3 naked-fixes)
- `src/features/campaigns/lib/canvas-orchestrator.ts` (skeleton-interpolation pattern)
- `src/features/campaigns/components/canvas/ContextPanel.tsx` (verifieer tags-input UI bij length 5-10)
- `src/features/campaigns/lib/asset-planner.ts` (derivation-hints voor skeletons)

# Bestanden die ik NIET aanraak

- `medium-config-registry.ts` — `slideCount` / `sectionCount` / `chapterCount` blijven daar (rendering-laag)
- `canvas-flow-registry.ts` — geen flow-divergentie
- Conversion / longform types — separate tasks
- Bestaande preview-componenten (`previews/*Preview.tsx`) — skeleton beïnvloedt content, niet preview-rendering

# Smoke test plan

1. Run dev-server, Napking-workspace
2. Maak campagne, content-type `linkedin-carousel`
3. Stel `slidesCount: 5`, `slideTitles: ["Het probleem niemand benoemt", "De data die het bewijst", "Wat anderen verkeerd doen", "Onze aanpak", "De volgende stap"]`
4. Genereer; verwacht 5 slides waar slide-titels 1-op-1 matchen met input
5. Herhaal voor `landing-page` met sectionSkeleton; verifieer dat AI niet zelf "Why Choose Us" sectie injecteert die niet in skeleton staat
6. Test naked-fix: open `instagram-post` content-type, verifieer dat ContextPanel hashtagStrategy + nieuwe hookFormat-veld rendert
7. Test naked-fix: open `microsite`, verifieer pageSkeleton + seoFocus zichtbaar
8. Test naked-fix: open `newsletter`, verifieer ctaPlacement + previewTextLength + personalize zichtbaar (matchen andere email-types)

# Risico's

- **AI negeert skeleton-list en verzint eigen titels** → mitigatie: prompt-template extreem expliciet ("THESE are the slide titles, do not modify, do not add, do not reorder"). Zo nodig `temperature: 0.3` voor structurele types
- **Tags-input UI rommelig bij 8+ items** → mitigatie: testen in ContextPanel; eventueel switchen naar textarea met newline-separator (komt via existing tag-parsing-utility?)
- **Instagram-post overlap met conversion-task** (beide willen `hookFormat`) → mitigatie: dependency: structured-task wacht op conversion-task voor instagram, gebruikt diens builder
- **`pageSkeleton` voor microsite is anders dan `sectionSkeleton` voor landing-page** (multi-page vs. single-page) → mitigatie: kind-parameter in builder onderscheidt; help-text expliciet
- **AI-derivation pre-fill voor skeletons levert te generieke skeletons** → mitigatie: aiHint expliciet ("derive from campaign goal + persona pain points + product positioning, NOT from generic templates")

# Out of scope

- Conversion / authority types — separate tasks
- Per-content-type preview-componenten (audit-vraag 1b uit canvas-studio-state) — separate plan-task indien nodig
- Flow-divergentie (bv. blog skipt scene-editor) — niet in scope deze task
- Voice-versterking
- Spec-rewrites

# Notes

Audit `docs/audits/2026-05-08-canvas-per-item-tweaks-plan.md` sectie 2 (Carousel, Website, Sales, Podcast/Webinar sub-rijen) en sectie 4 (cluster-strategie).

Volgorde-aanbeveling: derde, na conversion + longform. Reden: skeleton-tweaks zijn structureel en hebben minder hypothese-risico (sterke ja-bevestiging op carousel/landing-page); first-do-no-harm op de spannender hypothesen.

Coördinatie met conversion-task voor instagram-post: aanbeveling deze task pas mergen na merge van conversion-task om `hookFormat`-builder te kunnen hergebruiken. Anders dezelfde builder dubbel definiëren.

Cross-links: `tasks/canvas-tweaks-conversion-shortform.md`, `tasks/canvas-tweaks-longform-authority.md`.

## Decisions 2026-05-08 (Erik gedelegeerd)

- **Volgorde**: deze task DERDE (na conversion + longform) — bevestigd. Plus: na merge van conversion-task om `hookFormat`-builder te hergebruiken voor instagram-post.
- **`slideSkeleton` veld**: **textarea, niet tag-input**. Convention: één slide per regel met optionele structuur `Title — bullet1; bullet2`. HelpText: "Eén slide per regel. Optioneel: titel — bullets gescheiden met puntkomma". Reden: slides hebben variabele lengte, AI parst lijnen eenvoudig.
- **`aiDerivable: true` op alle nieuwe velden**: JA — voor skeleton-velden suggereert AI een 5-7 slide skelet vanuit brief + concept; user kan structuur overrulen.

## Implementation summary 2026-05-08

**Files changed**:
- `src/features/campaigns/lib/content-type-inputs.ts` — nieuwe `"structure-skeleton"` InputCategory + INPUT_CATEGORY_CONFIG entry; parametrized `skeletonInputFields(kind)` (kind ∈ slide/section/chapter/agenda/page/scene) levert 3 velden per kind: `${kind}Skeleton` (textarea per Q1 decision) + `${kind}Hook` (text) + `payoffPosition` (number). Plus 3 reusable helpers (`targetTakeaway`, `centralPainPoint`, `featureBenefitMap`). 13 type-entries uitgebreid: 9 structured (linkedin-carousel + social-carousel kind=slide; ebook kind=chapter + targetTakeaway + narrativeArc; sales-deck kind=slide + centralPainPoint + competitorContext; landing-page kind=section + valueProposition + targetObjection; product-page valueProposition + targetObjection + featureBenefitMap; comparison-page differentiatorClaim + tonePosition; webinar-outline kind=agenda + targetTakeaway; podcast-outline kind=agenda + centralQuestion), 2 naked-fixes (microsite kind=page + narrativeFlow + webPage-bundle wired; newsletter email-bundle wired + featuredItem + recurringSegments), 4 video opt-in (linkedin-video / explainer-video + coreAnalogy / promo-video + valueProposition / tiktok-script all kind=scene). Instagram-post bewust niet geraakt (gedaan in conversion-task per task-file dependency-note).
- `src/lib/ai/prompts/campaign-strategy.ts` — `buildAssetPlannerPrompt()` `contentTypeInputs` examples uitgebreid met structure-skeleton bundle + per-type extras voor de 13 types.
- `src/lib/ai/canvas-orchestrator.ts` — `buildSkeletonRender(itemName, itemPlural)` factory + 6 skeleton-renderers (slideSkeleton/sectionSkeleton/chapterSkeleton/agendaSkeleton/pageSkeleton/sceneSkeleton) gemerged in bestaande `AUTHORITY_RICH_RENDERS` map. Wording: "**USE EXACTLY — do NOT modify, reorder, or add**" + numbered-list rendering + "Each {item} MUST appear exactly once" — directe mitigatie van risico 1 (AI verzint eigen titels). Smoke-test bevestigt 100% honoring.
- `scripts/smoke-tests/structured-tweaks.ts` (new) + `npm run smoke:structured-tweaks`

**Quality gates**:
- ✅ `npx tsc --noEmit` 0 errors in mijn files
- ✅ `npm run lint` 0 errors (962 warnings; +2 t.o.v. baseline van vorige task door overige parallel-werk; mijn files lint-clean)
- ✅ `npm run smoke:structured-tweaks` 13/13 passed (10 unit + 3 AI roundtrips, 0 soft-warnings)

**Hypothese-bevestiging**:
- linkedin-carousel: alle 5 slide-titels uit `slideSkeleton` exact in output ("Het probleem niemand benoemt" → "Slide 1: **Het probleem niemand benoemt**"; etc.) — 5/5 verbatim match
- landing-page: alle 4 section-titels uit `sectionSkeleton` exact in output (4/4) + 0 generic AI-injected sections (geen "Why Choose Us" / "About Us" / "Features"-injecties) — exacte volgorde + geen ongevraagde toevoegingen
- naked-fixes verified: microsite heeft pageSkeleton + narrativeFlow + webPage-bundle; newsletter heeft email-bundle (ctaPlacement/personalize/previewTextLength) + featuredItem + recurringSegments

**Out-of-scope items die ik bewust niet aanraakte**:
- instagram-post (al gedaan in conversion-task, task-file dependency-note expliciet)
- F-VAL judge-uitbreiding met "skeleton-honoring"-criterium — separate task indien productie-feedback erom vraagt
- Tags-input UI tooling — task-file noemde fallback maar Q1 decision was textarea, geen tags-input nodig
- pre-existing tsc-error in `competitor-snapshot-historie` is inmiddels opgelost (task is done per laatste roadmap update)
