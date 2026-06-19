---
id: website-page-types-w4
title: Page-types W4 — microsite volwaardig (AnchorNav + StoryChapter + HighlightCards + block-beelden)
fase: pre-launch
priority: now
effort: ~3-4 dagen (plan-schatting)
owner: claude-code
status: done — gemerged via #329 (2026-06-16)
created: 2026-06-12
completed: -
related-spec: docs/specs/website-page-types-implementatieplan.md §4
worktree: branddock-feat-page-types
depends-on: website-page-types-w0-w1 (microsite-schema + builder + dispatch)
---

# Probleem

Na W1 genereert de microsite type-eigen (heroManifest/story/impact/community/join), maar de render mist de "lange pagina met ankernavigatie"-essentie: de nav was statisch (BrandNav, niet sticky, geen scroll-spy), hoofdstukken renderden als markdown-RichText zonder beeld-ritme, er was geen TL;DR-laag voor de 50-70% die de bodem nooit haalt, en chapter-block-beelden hadden geen slot.

# Acceptatiecriteria

- [x] **AnchorNav** (a11y-spec §4.3): sticky + scroll-spy (IntersectionObserver → `aria-current`), native `<a href="#id">` met progressive enhancement (scrollIntoView; `smooth` alleen bij `prefers-reduced-motion: no-preference`, daarna focus op de sectie), max 5 ankers + persistente CTA, mobiel hide-on-scroll-down, genummerde labels (01-04) voor de story-arc. **In eigen `'use client'`-bestand** (`AnchorNavClient.tsx`) — puck-config blijft server-safe (RSC /p/[slug] + screenshotter); alleen serialiseerbare props over de grens.
- [x] **StoryChapter**-component: heading + intro + 2-3 blokken alternerend beeld/tekst (flex row/row-reverse per beeld-rij — het IKEA-ritme), sectie draagt `anchorId` + `tabindex="-1"` + `scroll-margin-top`.
- [x] **HighlightCards** (Apple "Get the highlights"): genummerde TL;DR-kaarten na de hero, tegelijk jump-links; alleen bij ≥2 hoofdstukken; join-card draagt de deadline (urgentie).
- [x] **Block-beeld-slots**: `blocks[].imageUrl` additief in het schema (pipeline-conventie); builder vult hero uit het eerste brandImage en block-slots uit de rest (max 2 per hoofdstuk, ~40% beeld-ritme); blok-eigen imageUrl wint.
- [x] **Anker-a11y overal**: RichText/BrandCTA/FAQ-secties met `anchorId` kregen `tabindex="-1"` + `scroll-margin-top` (focus na anchor-jump).
- [x] **FAQ-jump-nav geüpgraded** naar AnchorNav (sticky + scroll-spy, niet genummerd) — zelfde component, consistente UX.
- [x] **Blueprint→sectie-mapping** als regel 9 in de microsite-systemprompt (em-dash-vrij): kernconcept→heroManifest, aanleiding→story, fases/cijfers→impact, bewijs→community, aanbod+einddatum→join.
- [x] **Gates**: tsc 0; eslint 0 op alle W4-bestanden; nieuw `page-types-w4.ts` 21/21 in de smoke:page-types-keten (65+50+21); web-page-builder 1446/0 (component-count 13→16); prompt-contracts 235; lp-text-quality 50; golden 12.

# Superseded uit het plan (gedocumenteerd, niet gebouwd)

- **Contract page-N → benoemde ankersecties v3.0.0 + aliases**: achterhaald door W1 — het orchestrate-pad is voor PUCK-types gegate (benigne SSE-skip) en het structured-schema heeft de benoemde secties + navLabels native. Het legacy read-pad (`extractContractFields` page-N → longText) blijft bestaan voor oude data.
- **StatCards**: gedekt door het bestaande StatsBlock (stat-callout per hoofdstuk).

# Notes

- **RSC-grens**: scroll-spy vereist hooks → AnchorNavClient in eigen `'use client'`-bestand; de puck-config-registratie berekent de merk-styling (scraped TOP_NAVIGATION-sample wint, spiegel van brandNavComponent) en geeft die als serialiseerbaar `styles`-object door. `numbered` is bewust géén Puck-field (bandTone-precedent).
- **Sticky in de editor-preview**: VariantPuckPreview rendert geschaald binnen een transform → `position: sticky` is daar inert; op de echte pagina werkt het. Bekend en acceptabel.
- **Stale asserts bijgewerkt** (bewuste W4-gedragsveranderingen): page-types-w1 (microsite-skelet AnchorNav/HighlightCards/StoryChapter, slug-dedup via StoryChapter, faq-volgorde AnchorNav, dispatch-asserts), page-types-w2-w3 (FAQ-nav AnchorNav), phase2 (componenten 13→16).
- **Open voor browser-verificatie**: scroll-spy/aria-current live, sticky-gedrag + mobiel hide-on-scroll-down, smooth-scroll + focus-jump, HighlightCards-links, StoryChapter beeld-alternatie. Code-paden smoke-gedekt, nog niet in de browser gezien.
- **W5 (logo-garantie L-Fase 2/3) is de enige resterende plan-fase.**
