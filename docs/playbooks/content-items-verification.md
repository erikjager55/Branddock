# Content-items verification playbook

Doel: verifiëren dat de 6 content-test improvements van sprint #5/#6 (formula library, 3 nieuwe property-evals, voice fallback, iteration nudges, derive-flow, claim-substantiation) end-to-end werken op echte content-generatie, en false-positives identificeren vóór pilot-launch.

## Scope

8 representanten (1 per category), uniforme brief, realtime walkthrough samen.

## Phase 0 — Pre-flight static-analysis (verplicht vóór elke run)

Voer altijd uit voordat je representanten doorloopt:

```bash
bash scripts/audits/content-items-preflight.sh
```

Het script detecteert 4 F-klasse anti-patterns die we in audit 2026-05-13 hebben gevonden:

| Check | Pattern | Voorbeeld-finding |
|---|---|---|
| F1 | Observability-helpers defined but never called | `tryTrackPropertyEvalResults` exists maar nooit aangeroepen → property-eval data verdwijnt |
| F2 | Gate-functies te strict | `validateContextCompleteness` accepteert geen workspace-level fallback → false-positives bij workspaces zonder campaign-link |
| F4 | Field-precedence inconsistencies | `Workspace.contentLanguage` (en) wint over `BrandVoiceguide.contentLocale` (nl-NL) → NL-klanten krijgen Engelse output |
| F-derive-nav | `window.location.href` voor interne navigatie | Hybride SPA routed via state, niet URL → derive-knop werkt niet |
| Coverage | Property-eval check-count vs union-member-count | Mismatch betekent ontbrekende check of stale type |

**Exit code 0 = clean → ga door naar verificatie. Exit code 1 = warnings → review elke warning vóór doorgaan.**

Het script is bewust conservatief: false-positives kunnen voorkomen (bv. legitime OAuth window.location.href in IntegrationsTab). Bij twijfel: open het bron-bestand en valideer manueel.

## Setup (eenmalig)

- 2 workspaces:
  - **Workspace A** — voiceguide-complete (control)
  - **Workspace B** — partial voiceguide (alleen tone-of-voice, geen voiceguide) → triggert fallback-banner
- `FEATURE_AUTO_ITERATE=true` in dev-env (optioneel, parallel 6B verificatie)
- DB-toegang voor `AICallTrace.propertyEvalResults` + `gateWarnings` inspectie

## Uniforme brief per representant

```
Topic: AI-content tooling voor B2B SaaS marketing
Audience: Marketing-managers bij mid-market B2B SaaS scale-ups (50-500 FTE)
Key messages: tijdswinst, brand-fit, geen AI-clichés
Tone: vakkundig + toegankelijk
Length: type-specific default
Sticky regression-trigger (verwerk in body OF CTA):
  "Wij zijn de beste in de wereld voor brand strategy met tot 50% snellere conversie."
```

De regression-trigger is bewust een onderbouwingsloze superlatief + numerieke claim — moet `claim-substantiation` triggeren.

## Per-item protocol (4 stappen)

### 1. Generate (workspace B, partial voiceguide)
- Brief invoeren
- Genereer

### 2. Visuele inspectie
- Headlines: 2-3 opties zichtbaar? Welke formules herkenbaar?
- Hook: eerste regel — geen "In de wereld van vandaag", "Het is belangrijk om", "Samengevat"?
- CTA: action-verb opening? Risk-reduction language waar relevant?
- Brand-voice banner: amber fallback zichtbaar boven content?

### 3. DB-inspectie (Prisma Studio of psql)
```sql
SELECT
  property_eval_results->'warnings' AS prop_warnings,
  gate_warnings,
  started_at
FROM "AICallTrace"
WHERE parent_entity_id = '<deliverableId>'
ORDER BY started_at DESC
LIMIT 1;
```
- Verwacht ≥1 claim-substantiation warn (door sticky trigger)
- Optioneel: cta-quality / meta-description / banned-phrase warns

### 4. Iteration-nudges + derive
- Chip-rij zichtbaar onder generation-output?
- Klik op category-specifieke derive-chip → check nieuwe deliverable created in juiste type
- Klik "Een sectie herzien" / "Toon aanpassen" → cosmetic check (geen action gewenst nu)

## 8 representanten (volgorde laag → hoog risico)

| # | Type-ID | Category | Focus |
|---|---|---|---|
| 1 | `blog-post` | long-form | Baseline; meest-getest in golden-sets |
| 2 | `linkedin-post` | social-media | Korte form, headline+hook scherp |
| 3 | `newsletter` | email | Multi-section + CTA-quality |
| 4 | `landing-page` | website | Meta-description compliance + risk-reduction |
| 5 | `search-ad` | advertising | Krap formaat + headline-formules |
| 6 | `one-pager` | sales | Lange form + claim-substantiation hot |
| 7 | `press-release` | pr-hr | Strict format + compliance-disclaimers |
| 8 | `explainer-video` | video-audio | Multi-modaliteit, script + voiceover |

## Severity-rubric

- 🔴 **P1**: Content broken / output onbruikbaar / property-eval false-positive blokkeert generation
- 🟡 **P2**: Improvement zichtbaar maar zwak (formula-variatie niet duidelijk; banner geblurd)
- 🟢 **P3**: UI-friction (banner-stijl, chip-copy, kleine tweak)

## Notitie-template per representant

```markdown
## [type-id] — YYYY-MM-DD HH:MM

**Generation duur**: XX s

### Visueel
- Brand-voice banner: ✓/✗ (amber fallback / emerald complete / afwezig)
- Headlines aanwezig: N varianten, formules herkend: [list]
- Hook eerste zin: "..."
- CTA: "..." — action-verb ✓/✗ — risk-reduction ✓/✗

### Property-eval warnings (uit DB)
- [check-id]: [reden]
- ...

### Iteration & derive
- Chips zichtbaar: [list]
- Derive-test: [target-type] → ✓/✗

### Findings
- P1: [...]
- P2: [...]
- P3: [...]
```

## Synthese-rapport (na 8 walkthroughs)

Locatie: `docs/audits/YYYY-MM-DD-content-items-verification.md`

Bevat:
1. Pass/fail-matrix 8 × 6 improvements
2. Cross-representant patronen (welke improvements werken consistent, welke wisselend)
3. P1-cluster voor pre-launch fix (max 1 week voor pilot)
4. P2-backlog voor sprint-7 polish
5. P3 → gotchas.md
