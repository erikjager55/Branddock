---
id: 2026-05-29-dts-content-quality
title: DTS content-quality C1-C11 — vocabulary-rails + voice-sample + render-constraints + DTS visuele pattern-library
status: accepted
date: 2026-05-29
supersedes: -
superseded-by: -
---

# Context

In de DTS Ede design-system experiment (`docs/experiments/DTS Ede Design System/`) heeft Claude een volledige brand-deliverable gegenereerd uit een Branddock brand-export: README + CSS variables + 18 specimen-cards + complete React UI-kit met **echte** DTS-content (headlines, fixtures, news-cards). Het resultaat voelt overweldigend specifiek voor DTS — typisch sport-civic, met civic-eyebrow patterns, tight type-scale, hard sectie-structuur en concrete copy-rules.

Branddock's eigen LP-generator (variant-generator + Puck-renderer) produceert tegen-vergelijking generic content: AI-grijp naar woorden als "innovative" / "premium quality" / "revolutionary" zelfs voor merken die nooit zulke woorden gebruiken. Layout-randomness — soms 4 secties, soms 11. Geen civic-eyebrow patterns voor merken die dat zelf wel doen. Geen hard render-constraints — een RULER-merk kan per ongeluk een speelse gradient krijgen.

Audit (zie `docs/specs/dts-content-quality-improvements.md`) identificeerde 7 specifieke design-keuzes die DTS herkenbaar maken (vocabulary-rails, uppercase eyebrow, tight type-scale, hard sectie-structuur, concrete copy-rules, no-accent palet, real placeholders). Sectie 5 voegde 4 visuele items toe (max-width container, sticky banner-pattern, photo-scrim, flat-card discipline). Totaal: 11 verbeteringen.

Het patroon was overdraagbaar maar verspreid over 11 losse items met verschillende effort-impact-mappings (kleine visuele items 0.25d, copy-items 0.5-1d).

# Decision

Bouw **alle 11 DTS content-quality verbeteringen (C1-C11)** als single werkstroom, gefaseerd in twee commits per impact-categorie:

1. **C1-C2 + C6-C7 + C9 copy-DNA + sticky-CTA** (commit `39171432`):
   - C1 Vocabulary-rails: `BrandVoiceguide.vocabularyDo` + `vocabularyDont` (string[]) → variant-generator system-prompt + F-VAL judge sub-criterium
   - C2 Voice few-shot sample: `BrandVoiceguide.voiceSample` (TEXT) → variant-generator embed "match this voice"
   - C6 Section-structuur richtlijn: per-archetype default sectie-volgorde in `render-constraints.ts` (RULER 4 secties / SAGE 7 / JESTER 6)
   - C7 Real-content fixture samples: `BrandStyleguide.fixtureSamples` JSON → Puck defaultProps i.p.v. lorem-ipsum
   - C9 StickyCtaBar: nieuwe optionele Puck-component voor lange LPs, variant van BrandCTA met subtle shadow

2. **C3 + C4 + C5 + C8 + C10 + C11 visuele DTS-verbeteringen** (commit `d06b428e`):
   - C3 Hard render-constraints: `render-constraints.ts` per-archetype `allowGradients` / `allowShadow` / `allowEmoji` / `maxRadiusPx` / `capitalisation` — renderer enforced
   - C4 Type-scale + text-tokens: `BrandTokens.text` met `heading`/`body`/`secondary`/`caption` hiërarchie + banner-style utility
   - C5 Eyebrow pattern: `SpikeBrandHeroProps.eyebrow?: string` (max 40 chars uppercase + tracking)
   - C8 Max-width container: `tokens.layout.maxContentWidth` per archetype default (RULER/SAGE 1200, JESTER/EXPLORER 1400)
   - C10 Photo-scrim per archetype: BrandHero full-bleed-image kiest scrim-stijl per archetype (RULER solid brand-color, JESTER gradient, EXPLORER dark-bottom-up)
   - C11 Flat-card discipline: MINIMAL + EDITORIAL force `elevation.cardElevationCategory='border-only'` tenzij user-set

**Implementatie-volgorde keuze** (eerst copy/sticky-CTA, dan visuele): C1+C2 hadden de hoogste impact-ROI per `docs/specs/dts-content-quality-improvements.md` sectie 3, dus die zijn eerst gelandt. De visuele 6 items zijn een coherente tweede batch want ze raken allemaal renderers + render-constraints.

# Y-statement

In de context van **Branddock LP-generator die generic copy + ad-hoc layout-keuzes produceert terwijl DTS-experiment laat zien dat 11 specifieke design-keuzes een merk-herkenbare deliverable maken**, facing **keuze tussen quick-wins-only (C1+C2 ~1.5d) of volledig C1-C11 plan (~4.5d) of post-launch defer**, I decided **alle 11 items uitvoeren in twee commit-batches binnen LP-fidelity werkstroom-window (visueel-eerst kan ook in 2.75d, gepland volgorde was copy-eerst voor pilot-evidence)** to achieve **DTS-niveau brand-herkenbaarheid voor alle 5 LP content-types + vocabulary-discipline die LINFI/Branddock zelf hoor-baar maakt + hard render-constraints die off-brand-drift voorkomen + visuele finishing (eyebrow / max-width / scrim / flat-cards) die LPs niet meer als "wireframe in brand colors" voelen**, accepting tradeoff **schema-uitbreiding op BrandVoiceguide + BrandStyleguide (3 nieuwe Json-velden: vocabularyDo/Dont, voiceSample, fixtureSamples) + render-constraints.ts wordt single source of truth voor archetype-hard-rules wat een review-discipline vereist bij toekomstige archetype-toevoegingen**.

# Consequences

## Positief

- **LP-copy is brand-specifiek herkenbaar** — LINFI-variants gebruiken geen "innovative" of "premium quality" meer maar woorden als "op maat", "vakmanschap", "millimeter nauwkeurig"
- **Voice-rhythm matcht source** — voice-sample few-shot trekt zinslengte + cadens naar het bronmerk
- **Off-brand drift onmogelijk** — render-constraints enforced; RULER-merk kan geen gradient krijgen ook al stuurt AI dat aan
- **Sectie-density is voorspelbaar** — gebruikers krijgen consistent dezelfde anatomy per archetype (geen verrassingen tussen generations)
- **Real placeholders in Step 2 preview** — gebruikers zien direct hun eigen vocabulary i.p.v. lorem-ipsum-equivalents
- **Visuele finishing op DTS-niveau** — eyebrow + max-width + scrim + flat-cards in combinatie maken LPs niet meer wireframe-achtig
- **F-VAL judge krijgt vocabulary-fit + anatomy-fit dimensies** — automatic gate op naleving zonder UI-werk
- **Backward-compat behouden** — alle nieuwe velden zijn Json/optional; bestaande workspaces zonder vocabulary/voiceSample/fixtureSamples vallen schoon terug op archetype-default

## Negatief / tradeoffs

- **Render-constraints.ts wordt single source of truth voor archetype-hard-rules** — bij toekomstige archetype-toevoegingen (post-launch Brand Voice 2.0) MOET de constants-file expliciet bijgewerkt worden, anders krijgt het nieuwe archetype geen render-discipline
- **AI Phase 3 (Voice & Imagery) wordt zwaarder** — extra extractie van vocabularyDo/Dont (8-12 paren), voiceSample (40-80 woorden), fixtureSamples per content-type (3 zinnen × 3 types = 9 samples). Cost per scrape stijgt ~$0.02-0.05
- **Schema-bloat alarm** — 3 nieuwe Json-velden (vocabularyDo, vocabularyDont, voiceSample, fixtureSamples) op merge van BrandVoiceguide + BrandStyleguide. Acceptabel maar moet bewust beheerd worden
- **Voice-sample few-shot is brittle** — AI-output match op rhythm kan instabiel zijn bij verschillende user-prompts. Mitigatie: F-VAL judge meet voice-fit, geeft signaal als output drift
- **Per-archetype sectie-volgorde kan rigid voelen** — JESTER krijgt altijd 6 secties; sommige use-cases willen 4 (event-page) of 9 (lange product-launch). Render-constraints is **prompt-guidance** voor AI, geen hard validator, dus user mag afwijken via Puck-editing in Step 3
- **Eyebrow pattern is optional** — AI mag null retourneren; sommige merken (LINFI) krijgen geen eyebrow ook al kan het meerwaarde geven. Acceptabel voor v1

## Neutraal

- **Render-constraints leven in code, niet CMS** — bij CMS-table-keuze hadden user-overrides mogelijk geweest. v1 = code-constants; v2 kan migreren naar BrandStyleguide.renderConstraints Json
- **DTS-style 18-specimen-cards niet gebouwd** — alleen content-quality items (C1-C11) gebouwd; geen specimen-page in Brandstyle-UI (zie [`dts-comparison-improvements.md`](../specs/dts-comparison-improvements.md) V3 voor potentieel post-MVP werk)
- **Per-archetype sectie-volgorde overlapt met variant-generator's eigen sectie-decisions** — gewogen blueprint guidance werkt 80% van de tijd, de 20% wordt door menselijke review opgelost via Puck-edits

# Alternatives considered

## Quick-wins-only (C1 + C2 alleen, ~1.5d)

**Voor**:
- Snelste pad naar copy-quality verbetering
- Geen renderer-changes nodig

**Tegen** (waarom NIET gekozen):
- Visuele items (C3-C5, C8, C10-C11) hadden grote impact op "wireframe-feel" die copy-only niet oplost
- Sectie-density verandert niet zonder C6, layout-randomness blijft

## Visueel-eerst pad (~2.75d, C4 → C3 → C10 → C11 → C5 → C8)

**Voor**:
- Per `dts-content-quality-improvements.md` sectie 7 aanbeveling
- Snelste pad naar zichtbaar effect op de pagina's

**Tegen** (waarom NIET gekozen):
- C1+C2 copy-items waren al gepland in de LP-fidelity sessie en logisch geclusterd met sticky-CTA (C9) die ook visueel is
- Twee parallelle volgordes (visueel-eerst vs ROI-eerst) had geen meerwaarde t.o.v. één gemixte batch waar de impact-items eerst kwamen

## Post-launch defer

**Voor**:
- Geen scope-uitbreiding voor pre-launch
- Focus op vercel-deployment + pilot-onboarding

**Tegen** (waarom NIET gekozen):
- Pilot-klanten zien DTS-experiment-niveau output als ondergrens — als Branddock's eigen LP-output dat niveau niet haalt, is pilot-conversie risico
- Render-constraints zijn een fundamentele renderer-discipline die later moeilijker te retrofit is (alle bestaande LPs zouden re-rendered moeten worden)

# Notes

**Re-evaluation triggers**:

1. **Sectie-blueprint per archetype voelt rigid op pilot-cases**: zet render-constraints sectie-volgorde naar `'prompt-guidance'` mode (zachter signaal) ipv hard-rules — code-constant veranderen + variant-generator system-prompt update.
2. **Eyebrow-skip-rate > 70%** in pilot-data (AI retourneert vaak null): pas Phase 3 prompt aan zodat eyebrow extractie geforceerd is, of verwijder eyebrow-veld als laagwaardige optional.
3. **vocabularyDont leidt tot overcautious copy**: monitor F-VAL vocabulary-fit scores; als vocabulary-shrinkage F-VAL onder threshold drukt, relax to "soft guidance" in prompt.
4. **fixtureSamples raakt verouderd** bij brand-pivot: BrandStyleguide.fixtureSamples ververst op scrape, maar manual edits aan brand-context kunnen samples niet automatically updaten. Bij grote brand-evolution: trigger manual re-scrape.

**Cross-references**:
- Plan-doc: `docs/specs/dts-content-quality-improvements.md` (✅ alle C1-C11 done, gemarkeerd in spec)
- Companion spec: `docs/specs/dts-comparison-improvements.md` (DTS-system V1-V5 verbeteringen — post-MVP scope)
- Sister ADR: [[2026-05-29-brandstyle-analyzer-lp-fidelity]] (LP-fidelity werkstroom, parallel)
- Sister ADR: [[2026-05-29-fval-vision-judge-dim8]] (vision-judge gebruikt deze render-constraints om hard-rules visueel te scoren)
- Implementatie: commits `39171432` (C1+C2+C6+C7+C9) + `d06b428e` (C3+C4+C5+C8+C10+C11)
- Plan execution: `~/.claude/plans/zippy-twirling-feigenbaum.md` Track 2.1
