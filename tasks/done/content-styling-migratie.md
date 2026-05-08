---
id: content-styling-migratie
title: Migreer content-styling velden naar Content Brief (8 categorieën)
fase: pre-launch
priority: now
effort: 3-5 dagen
owner: claude-code
status: done
created: 2026-05-07
completed: 2026-05-08
related-adr: -
related-spec: -
worktree: branddock-feat-content-styling-migratie
---

# Probleem

Velden uit `medium-config-registry.ts` Stap 3 sturen content-generatie aan, niet medium-rendering: Tone of Voice, Hashtag Strategy, CTA-style, Include Emojis, Visual Style. Die horen bij briefing (Stap 1 Content Brief), niet pas in Stap 3 — anders moet user na eerste generatie alsnog terug en regenerate.

`social-post` is al gemigreerd (entry #208c, 5 velden voor linkedin/instagram/facebook/twitter). Resterend: 8 categorieën.

# Voorstel

Per categorie: identificeer content-styling velden in registry, migreer naar `contentTypeInputs` registry (Stap 1), update prompt-injection via `formatMergedMediumConfig()`. Behoud platform-rendering velden in Medium step.

# Acceptatiecriteria

Per categorie: field-builders + toepassing op alle content-types in registry + verwijderd uit Medium sectie + toegevoegd aan `MEDIUM_CONFIG_HANDLED_KEYS` set in canvas-orchestrator (waar formatMediumConfig al rich-instructies genereert).

## Long-form (~1 dag)
- [ ] tone, articleStructure, readingLevel, includeFaq, includeQuotes, internalLinking, seoFocus → naar Content Brief
- [ ] Geen platform-rendering velden — alle medium config leeg voor long-form

## Sales (~halve dag)
- [ ] tone, salesAngle, proofPointDensity, includePricing, ctaStyle → Content Brief
- [ ] Geen platform-rendering

## PR-HR (~halve dag)
- [ ] tone, structure, quoteCount, includeBoilerplate, includeContactBlock, hasEmbargo → Content Brief

## Email (~halve dag)
- [ ] ctaPlacement, previewTextLength, personalize → Content Brief
- [ ] Behoud in Medium: templateStyle, headerType

## Carousel (~halve dag)
- [ ] transitionStyle, includeCtaSlide, visualStyle → Content Brief
- [ ] Behoud in Medium: slideCount, slideFormat

## Podcast (~halve dag)
- [ ] episodeFormat, segmentCount, introStyle, includeShowNotes, includeTranscript → Content Brief
- [ ] Behoud in Medium: duration

## Advertising (~halve dag)
- [ ] urgencyLevel, socialProof, ctaType, visualStyle → Content Brief
- [ ] Behoud in Medium: adFormat

## Video (~halve dag)
- [ ] footageType, textOverlay, colorGrade → Content Brief
- [ ] Behoud in Medium: duration, aspectRatio, quality

## Web-page (~halve dag)
- [ ] seoFocus → Content Brief
- [ ] Behoud in Medium: pageLayout, heroStyle, sectionCount, ctaType

## Cross-cutting
- [ ] `npx tsc --noEmit` 0 errors
- [ ] Smoke-test per categorie: maak deliverable → check Step 1 toont nieuwe velden, Step 3 toont alleen rendering velden
- [ ] Bestaande deliverables blijven werken (geen migratie van DB-data nodig — registries bepalen UI)

# Bestanden die ik aanraak

- `src/features/campaigns/lib/content-type-inputs.ts` — field-builders per categorie
- `src/features/campaigns/lib/medium-config-registry.ts` — verwijder content-styling velden
- `src/features/campaigns/lib/canvas-orchestrator.ts` — `MEDIUM_CONFIG_HANDLED_KEYS` set + `formatMergedMediumConfig()` merge logic

# Bestanden die ik NIET aanraak

- Content Studio (verwijderd) — niet meer relevant
- Andere registries (deliverable-types, fidelity-criteria) — geen impact
- Bestaande deliverable.settings — registries veranderen UI, geen DB migratie

# Smoke test plan

Per categorie (10 reps):
1. Open Canvas voor representant content-type van categorie (bv whitepaper voor long-form)
2. Step 1 Context: verifiëren nieuwe velden zichtbaar (tone, articleStructure, etc.)
3. Vul velden in, ga naar Step 2 → genereren
4. Step 3 Medium: verifiëren content-styling velden NIET meer zichtbaar
5. Genereer → check tone/structure/etc. zichtbaar in output (prompt-injectie werkt)
6. Regenerate met andere tone → output verandert overeenkomstig

# Risico's

- **Backward compatibility**: oude deliverables met velden in `settings.mediumConfig` moeten leesbaar blijven. Mitigatie: registry-driven UI leest beide locaties tijdens transition-window
- **Prompt-injectie volgorde**: brief vs medium config conflict in prompt. Mitigatie: brief wins, medium config is rendering-only
- **Coverage**: 53 content-types over 8 categorieën — risico op missen. Mitigatie: validate-all-criteria.ts script uitbreiden met inputs check

# Out of scope

- Categorie-overschrijdende velden harmonisatie (bv "tone" overal hetzelfde format)
- Conditional inputs (bv "alleen voor B2B") — komt later
- AI-suggestion voor field defaults op basis van campaign goal

# Notes

Item 9.0c uit oude TODO.md.

Sociale-post migratie als referentie-implementatie: `socialContentStyleFields()` helper in content-type-inputs.ts, `formatMergedMediumConfig()` in canvas-orchestrator.

Test elke categorie afzonderlijk shippable — kan in 8 separate commits + branches als parallel werk wenselijk.
