---
id: linkedin-ad-formats-followups
title: LinkedIn-ad format-aware UI/F-VAL/preview — follow-ups na Q1-Q4 quick-wins
fase: post-launch (of late pre-launch wanneer pilot-feedback dat verlangt)
priority: needs-triage
effort: ~7-12d totaal (3 sub-fasen)
owner: tbd
status: draft
created: 2026-05-19
related-spec: -
related-task: content-items-test-coverage
related-commit: dedc41d7 (vorige sessie), pending (Q1-Q4 implementatie 2026-05-19)
---

# Context

Pre-launch quick-wins (Q1-Q4, 2026-05-19) maken LinkedIn-ad sub-format-aware op:
- Q1: Scope teruggebracht naar 3 formats (Single Image / Video / Message Ad). Carousel-ad uitgesteld; Text Ad gedeprecateerd.
- Q2: Value-shape genormaliseerd via shared `LINKEDIN_AD_FORMATS` (single source of truth).
- Q3: Format-specific prompt-sectie in `canvas-orchestrator.ts` (output-shape per format).
- Q4: Format-aware publication-checklist in `publish-timing.ts`.

Drie items zijn bewust uitgesteld omdat ze meer UI-/architectural werk vergen dan een pre-launch sprint kan opvangen. Dit plan documenteert die items + effort + dependencies zodat ze post-launch oppakbaar zijn.

**Out of scope voor deze follow-up (per user 2026-05-19)**:
- carousel-ad als feature (depends op generieke carousel-pipeline; zie `idea-linkedin-carousel-verbeterplan.md`)
- text-ad (LinkedIn heeft format gedeprecateerd, geen nieuwe campagnes ondersteund)

# Drie deferred items + scope

## F1 — Format-aware preview components (LinkedInAdPreview)

**Probleem**: alle LinkedIn-ad varianten gebruiken nu `GenericPreview` of de default `LinkedInPreview` van de Canvas-accordion Step 3. Visueel valt elke ad-format identiek over. Voor Message Ad is dat especially mismatched — gebruiker ziet feed-style preview terwijl product InMail is.

**Doel**: drie preview-modes die structureel matchen aan wat LinkedIn werkelijk rendert.

**Scope**:
- **`LinkedInAdSingleImagePreview`**: hero-image + intro-text (max 5 lines, "...zie meer" truncation) + headline + description + CTA-button. Matcht LinkedIn sponsored content feed-mockup.
- **`LinkedInAdVideoPreview`**: video-script gerenderd als 3-frame storyboard (Hook / Body / CTA) + thumbnail static-preview. Speel-icon overlay. Geen actual video-rendering (post-launch feature voor compose-pipeline).
- **`LinkedInAdMessageAdPreview`**: InMail-mockup met avatar + sender naam + role + onderwerpregel (bold) + bericht body + CTA-button. Zilver/wit color-palette zoals LinkedIn-message.

**Bestanden te raken**:
- `src/features/campaigns/components/canvas/previews/LinkedInAdSingleImagePreview.tsx` (NEW)
- `src/features/campaigns/components/canvas/previews/LinkedInAdVideoPreview.tsx` (NEW)
- `src/features/campaigns/components/canvas/previews/LinkedInAdMessageAdPreview.tsx` (NEW)
- `src/features/campaigns/components/canvas/previews/preview-map.ts` — uitbreiden naar `[platform=linkedin][format=ad][adFormat=...]` 3-laagse lookup OR factory-functie die adFormat leest
- `src/features/campaigns/components/canvas/medium/MediumConfigLayout.tsx` — propsdoorgeven van `mediumConfigValues.adFormat` naar preview

**Effort**: 3-4 dagen (3 components × ~1d incl. mockup-trouwheid + design-tokens)

**Acceptance**:
- Single Image: gerenderd zoals LinkedIn feed-mockup (incl. avatar workspace + brand-name)
- Video: storyboard rendert 3-scene grid; thumbnail-image gebruikt heroImage van canvas
- Message Ad: InMail-mockup met sender + subject + body
- Allemaal responsive (Canvas split-view + standalone full-screen)

## F2 — Format-aware F-VAL rubric weights

**Probleem**: F-VAL judge-rubric (6-dim G-Eval) heeft één set weights globaal per workspace via `FidelityConfig.rubricWeights`. Voor LinkedIn-ad zou je per ad-format andere weights willen:
- Single Image: nadruk op `brandRecognition` (visual + headline impact) + `concreteness` (claims-substantiation)
- Video: nadruk op `audienceFit` (hook in 3s) + `coherence` (Hook→Body→CTA arc)
- Message Ad: nadruk op `audienceFit` (persona-fit van 1-op-1 tone) + `antiPattern` (geen AI-tells in InMail = killcriterium)

Generic weights matchen daar niet goed bij — bij Message Ad zou een sterke `strategicAnchoring` score 30% van de judge wegen terwijl het bij InMail vooral over toon en relatie gaat.

**Doel**: per content-type én optioneel per sub-format (adFormat) andere rubric-weights toepassen.

**Scope**:
- Schema: `FidelityConfig.weightsByContentType: Json?` of nieuwe `FidelityRubricOverride` tabel met `(workspaceId, contentTypeId, adFormat?, weights)` rows.
- Compositie-engine: `resolveRubricWeights(workspaceId, contentTypeId, adFormat)` helper die specifiek-naar-generic resolvet.
- Defaults registry per format hardcoded (geen UI-config nodig pre-launch — workspace-override is post-MVP).
- Gedeeld met ebook-H3.3 follow-up (uit `idea-ebook-quality-verbeterplan.md`).

**Bestanden te raken**:
- `prisma/schema.prisma` — schema-uitbreiding (additive)
- `src/lib/brand-fidelity/composition-engine.ts` — accept `adFormat` param + resolve weights
- `src/lib/brand-fidelity/fidelity-runner.ts` — pass adFormat door naar composition
- `src/lib/brand-fidelity/content-type-rubric-defaults.ts` (NEW) — defaults map

**Effort**: 3-4 dagen (schema + resolver + defaults map + tests + UI om weights te zien)

**Dependencies**:
- Best afgestemd met ebook H3.3 (overlapping concern) — combineer in één PR
- Vereist Prisma-migration (additive, niet-breaking)

**Acceptance**:
- Single Image / Video / Message Ad krijgen elk eigen judge-rubric-weights
- Workspace zonder overrides krijgt sensible defaults per format
- F-VAL score voor identieke content tussen formats verschilt logisch
- Bestaande deliverables zonder adFormat krijgen workspace-default weights

## F3 — Format-aware content variants UI

**Probleem**: Step 2 "Content Variants" genereert standaard 2-3 varianten met dezelfde shape. Voor LinkedIn-ad zou per format de variant-shape moeten verschillen:
- Single Image: 3 varianten = 3 verschillende headlines + descriptions (zelfde hero-image of 3 image-candidates parallel)
- Video: 3 varianten = 3 verschillende Hook-openings + zelfde Body/CTA (most-test-able variabele in video-ads)
- Message Ad: 3 varianten = 3 verschillende subject lines + 1 body OR 3 body-tones (warm / direct / curious) met 1 subject

**Doel**: variant-generation kiest een format-specific axis-of-variation ipv generieke "schrijf 3 variaties".

**Scope**:
- `canvas-orchestrator.ts` `buildVariantStrategy(adFormat)` helper die per format aangeeft welk veld varieert
- Variant-builder UI: per format andere variant-label ("Variant A — Headline" vs "Variant A — Hook" vs "Variant A — Subject")
- Per-variant fields zichtbaar in Step 2 UI met focus op de varierende dimensie

**Bestanden te raken**:
- `src/lib/ai/canvas-orchestrator.ts` — variant-prompt branching per adFormat
- `src/features/campaigns/components/canvas/accordion/Step2ContentVariants.tsx` — labels en variant-card layout
- `src/lib/studio/prompt-templates/social-media.ts` `linkedin-ad` — variant-instructie per format

**Effort**: 2-3 dagen (prompt-engineering + UI labels + per-format axis-config)

**Acceptance**:
- Single Image: 3 varianten verschillen in headline + description, zelfde hero
- Video: 3 varianten verschillen in Hook (eerste 3s), gedeeld Body
- Message Ad: 3 varianten verschillen in subject line (en optioneel tone)
- Variant-cards in Step 2 tonen welke axis varieert ("Hook variant A")

# Prioritering & sequencing

| Item | Effort | Pilot-impact | Aanbevolen volgorde |
|---|---|---|---|
| **F1 preview** | 3-4d | Hoog (gebruiker ziet meteen verschil per format) | Eerst — quick visual win na pilot-launch |
| **F3 variants UI** | 2-3d | Medium (test-relevantie per format hoger met format-specific A/B) | Tweede — bouwt op F1 voor visualisatie |
| **F2 rubric weights** | 3-4d | Medium (subtiele score-verbetering) | Laatste — combineer met ebook H3.3 |

**Totaal**: ~8-11 dagen post-launch werk verspreid over 2-3 sprints.

# Risico's

- **F1 preview**: design-mockup-trouwheid kost meer tijd dan geschat als LinkedIn-feed-styling exact moet matchen. Mitigatie: start met "geïndiceerde" mockups (LinkedIn-color-palette + ruwe layout), polish in tweede iteratie.
- **F2 rubric**: schema-migratie is additief maar veel files raken. Mitigatie: combineer in één Prisma-migration met ebook H3.3.
- **F3 variants**: variant-strategy kan overfit zijn op een specifieke best-practice. Mitigatie: pilot-feedback verzamelen vóór finaliseren.

# Out of scope

- carousel-ad als ad-format (user uitgesloten 2026-05-19)
- text-ad als ad-format (gedeprecateerd door LinkedIn)
- Andere paid platforms (Instagram-ad, Facebook-ad, search-ad) — vergelijkbare follow-up wanneer die platforms in scope komen
- Real-time ad-account API-integratie (Google Ads / Meta Ads) — channel-activation roadmap-item

# Test plan

Na implementatie F1-F3:
1. Maak per format één LinkedIn-ad in Napking/LINFI workspace
2. Verifieer dat preview rendert volgens format-mockup
3. Verifieer dat 3 generated varianten elk de juiste axis variëren
4. Verifieer dat F-VAL score per format binnen verwachte range valt
5. Verifieer dat publication-checklist (al gefixt in Q4) consistent blijft

# Volgende stappen voor promote

Wanneer je deze idea wilt uitvoeren:
1. Promote naar `tasks/linkedin-ad-format-preview-components.md` (F1)
2. Promote naar `tasks/linkedin-ad-variant-strategy.md` (F3)
3. Combineer F2 met ebook H3.3 in `tasks/per-content-type-rubric-weights.md`
4. Schedule post-launch sprint #8 of later
