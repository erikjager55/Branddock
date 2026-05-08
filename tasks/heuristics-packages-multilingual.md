---
id: heuristics-packages-multilingual
title: F-VAL Pijler 3 heuristiek-pakketten NL-NL / NL-BE / EN-GB / DE-DE (Δ-2)
fase: pre-launch
priority: now
effort: 5-7 dagen (excl. native BE/DE-calibratie — accepted)
owner: claude-code
status: open
created: 2026-05-08
completed: -
related-adr: 2026-05-08-locale-routing-brand-voice
related-spec: tasks/_drafts/idea-brand-control-program.md
worktree: branddock-program-p1
---

# Probleem

F-VAL Pijler 3 (rules 20%) heeft vandaag alleen 12 hardcoded spam-phrases als heuristiek-pakket (`src/lib/learning-loop/fidelity-rules.ts`). Methodology-research deze sessie identificeerde 5 categorieën signalen die per taal+regio zinnig zijn (corporate-fluff, superlatieven, vulwoorden, vage-kwaliteitsclaims, riskante-comparatieven) plus AI-tells als 6e EN-only categorie, met substantiële NL-NL ↔ NL-BE divergentie (16 NL-woorden expliciet whitelisted in BE, andere u/je-default, BE-specifieke fluff).

Vier locales nodig voor pilot-mix: `nl-NL` (BB+Linfi), `en-GB` (founder-content), `nl-BE` + `de-DE` on-demand. Pure ISO-639-1 'nl'-routing onvoldoende — locale-discriminatie is hard noodzakelijk per ADR-3.

# Voorstel

Per-locale heuristics directory `src/lib/brand-fidelity/heuristics/<locale>/<category>.ts` met provenance-tagged entries (citation-key per term), drie-laagse flagging (`always-flag` / `context-flag` / `soft-flag`). Locale-routing via ADR-3 `BrandVoiceguide.contentLocale` resolver. `nl-BE` programmatisch extends `nl-NL` met whitelist + extra-flags maar consumeert als bevroren hard-switch unit. Sync naar `BrandRule`-tabel via uitgebreid `brand-rule-sync.ts` zodat Pijler 3 evaluator ze automatisch consumeert.

# Acceptatiecriteria

## Schema + locale-routing (ADR-3 implementatie)
- [ ] `BrandVoiceguide.contentLocale` Prisma-veld (nullable String, IETF BCP 47-formaat). Additieve migration `add_brand_voiceguide_content_locale`
- [ ] Better Brands voiceguide krijgt `contentLocale: 'nl-NL'` via seed-script (Phase 1 onderdeel)
- [ ] `src/lib/brand-fidelity/heuristics/locale-resolver.ts` — `resolveLocaleForBrand(workspaceId)` met fallback chain `BrandVoiceguide.contentLocale → Workspace.contentLanguage → 'en-GB'`
- [ ] Validation in API-laag: Zod regex `^[a-z]{2}-[A-Z]{2}$` + allowlist `['nl-NL','nl-BE','en-GB','de-DE']` v1

## Heuristic packages — directory structure
- [ ] `src/lib/brand-fidelity/heuristics/citations.ts` — bron-register met 25 citation-keys (URL + naam per key)
- [ ] `src/lib/brand-fidelity/heuristics/types.ts` — `HeuristicEntry { term, citationKey, severity, contextFlag? }` + `HeuristicPackage` types
- [ ] `src/lib/brand-fidelity/heuristics/shared/risky-comparatives-detector.ts` — 2-step rule helper (detect comparative form → check zin/paragraaf voor comparand of numeriek anker)
- [ ] `src/lib/brand-fidelity/heuristics/shared/ai-tells-en.ts` — Wikipedia "Signs of AI writing" lexical (delve, tapestry, underscores, navigate, intricate, etc.) + structural (Not just X but Y, rule-of-three, em-dash overuse)

## Heuristic packages — content per locale
- [ ] `nl-NL/{corporate-fluff, superlatives, fillers, vague-quality, risky-comparatives}.ts` — ~120 entries totaal (Onze Taal modern-taalgebruik + Schrijfvis 21-schrap + Werf& jeukwoorden + Frankwatching + Clichéschatkamer)
- [ ] `nl-BE/{corporate-fluff, superlatives, fillers, vague-quality, risky-comparatives}.ts` — extends nl-NL programmatisch, returns frozen unit
- [ ] `nl-BE/nl-words-whitelisted.ts` — 16 NL-woorden expliciet whitelisted: job, onthaal, verlof, dossier, kinesist, hospitalisatie, immo, camion, fusioneren, syndicaat, technieker, domiciliëring, werf, kader, zetel, schepen
- [ ] `nl-BE/address-form-rule.ts` — u-form default zakelijk; je-vorm flag; gij/ge flag in formele copy
- [ ] `nl-BE/nl-jargon-extra-flag.ts` — pinpas/tosti/gaaf/cool/leuk extra-flag in BE
- [ ] `en-GB/{corporate-fluff, superlatives, fillers, vague-quality, risky-comparatives, ai-tells}.ts` — ~100 entries Plain English Campaign A-Z + filler-words + AI-tells als 6e categorie
- [ ] `de-DE/{corporate-fluff, superlatives, fillers, vague-quality, risky-comparatives}.ts` — ~120 entries Karrierebibel Floskeln + Caesar Caesar + Cobalt + Sternenvogelreisen Füllwörter
- [ ] `de-DE/denglisch.ts` — corporate-Anglicisms (committed, leverage, Manpower, Kickoff, alignen, briefen, deployen, etc.)

## Pijler 3 wiring
- [ ] `src/lib/brand-fidelity/heuristics/index.ts` — registry per locale-key + `getHeuristicsForLocale(locale)` returns frozen unit
- [ ] `getHeuristicsForBrand(workspaceId)` — wraps locale-resolver + getHeuristicsForLocale; cached binnen `getBrandContext` 5-min cache
- [ ] `src/lib/brand-fidelity/brand-rule-sync.ts` — sync heuristic-entries → `BrandRule` rows; alleen actieve workspace-locale syncen (niet alle 4 — DB explosion-risk)
- [ ] `src/lib/learning-loop/fidelity-rules.ts` of nieuwe Pijler 3 evaluator — gebruikt `getHeuristicsForBrand()` per content-review
- [ ] `src/lib/brand-fidelity/composition-engine.ts` Pijler 3 input includes locale-resolved package
- [ ] `src/lib/brand-fidelity/fidelity-runner.ts` — fetch locale via resolver in parallel met personality + config + centroid

## Quality gates
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test: F-VAL run op nl-NL representative content (BB) → expect locale-specific findings, geen fluff van andere locale
- [ ] Smoke-test: F-VAL run op en-GB founder-marketing-content → expect AI-tells findings (delve/tapestry detected if present), corporate-fluff findings (utilize/leverage detected if present)
- [ ] Edge case: workspace zonder BrandVoiceguide.contentLocale + zonder Workspace.contentLanguage → resolver returns 'en-GB'

# Bestanden die ik aanraak

## Schema
- `prisma/schema.prisma` — `BrandVoiceguide.contentLocale String?`
- `prisma/migrations/<timestamp>_add_brand_voiceguide_content_locale/migration.sql` — additieve
- `prisma/seed.ts` (of separate seed-script) — Better Brands locale seed `nl-NL`

## Heuristics directory (nieuw)
- `src/lib/brand-fidelity/heuristics/index.ts`
- `src/lib/brand-fidelity/heuristics/locale-resolver.ts`
- `src/lib/brand-fidelity/heuristics/citations.ts`
- `src/lib/brand-fidelity/heuristics/types.ts`
- `src/lib/brand-fidelity/heuristics/shared/risky-comparatives-detector.ts`
- `src/lib/brand-fidelity/heuristics/shared/ai-tells-en.ts`
- `src/lib/brand-fidelity/heuristics/nl-NL/{corporate-fluff,superlatives,fillers,vague-quality,risky-comparatives}.ts` (5 files)
- `src/lib/brand-fidelity/heuristics/nl-BE/{corporate-fluff,superlatives,fillers,vague-quality,risky-comparatives,nl-words-whitelisted,address-form-rule,nl-jargon-extra-flag}.ts` (8 files)
- `src/lib/brand-fidelity/heuristics/en-GB/{corporate-fluff,superlatives,fillers,vague-quality,risky-comparatives,ai-tells}.ts` (6 files)
- `src/lib/brand-fidelity/heuristics/de-DE/{corporate-fluff,superlatives,fillers,vague-quality,risky-comparatives,denglisch}.ts` (6 files)

## Pijler 3 wiring
- `src/lib/brand-fidelity/brand-rule-sync.ts` — extend
- `src/lib/learning-loop/fidelity-rules.ts` — extend met heuristic-evaluator
- `src/lib/brand-fidelity/composition-engine.ts` — Pijler 3 input
- `src/lib/brand-fidelity/fidelity-runner.ts` — locale parallel fetch

# Bestanden die ik NIET aanraak

- F-VAL Pijler 1 (`style-scorer.ts`) — onaangeraakt
- F-VAL Pijler 2 (`judge-dispatcher.ts`, `g-eval-rubric.ts`) — onaangeraakt; heuristic-flags zijn Pijler 3 only
- BrandVoiceguide schema verder dan `contentLocale` — voiceguide content blijft ongewijzigd
- Brandstyle scraper — niet gerelateerd
- `Workspace.contentLanguage` enum — blijft ongewijzigd; locale resolver mapt simple-lang naar default-locale
- `fr` / `es` / `pt` / `it` Workspace.contentLanguage values — vallen op `en-GB` fallback in v1; eigen pakketten zijn LATER-roadmap

# Smoke test plan

1. **Per-locale F-VAL run**: maak content in nl-NL + en-GB → run F-VAL → verify locale-specific heuristic findings in Pijler 3 output
2. **Cross-locale isolation**: nl-NL content mag geen BE-specifieke flag bevatten ("familiale sfeer") en omgekeerd
3. **Whitelist verificatie BE**: BE-content met "job", "onthaal", "verlof" → geen flag (whitelist actief)
4. **AI-tells alleen EN**: "delve", "tapestry", "underscores" in en-GB → flag; in nl-NL → geen flag
5. **u/je-default BE**: BE-content met `je`-vorm in zakelijke copy → flag (address-form-rule actief)
6. **Fallback chain**: workspace zonder voiceguide-locale + zonder workspace-language → resolver returns 'en-GB'
7. **Citation traceability**: pick 5 random findings → verify provenance citationKey resolves naar bron-URL in `citations.ts`
8. **Risky-comparative 2-step**: "wij zijn sneller" zonder comparand → flag; "wij zijn sneller dan X met cijfer Y" → no flag
9. **`npx tsc --noEmit`** 0 errors + **`npm run lint`** 0 errors

# Risico's

- **False-positive rate BE/DE zonder native review** (medium): research-derived lists kunnen culturele nuance missen. Mitigatie: pilot-rollout gefaseerd (BE/DE alleen on-demand wanneer pilot-klant zich aandient). Documented + accepted door user 2026-05-08.
- **Locale-resolver overhead** (laag): drie-laag fallback per content-review = extra DB query. Mitigatie: cache binnen `getBrandContext` 5-min cache (consistent met existing pattern).
- **BrandRule-sync explosion** (medium): 600+ entries × 4 locales = 2400+ BrandRule rows per workspace zonder filtering. Mitigatie: alleen actieve workspace-locale syncen, niet alle 4.
- **Pijler 3 weight regressie** (medium): rijkere heuristics kunnen Pijler 3 score sterk verlagen op content die nu groen scoort. Mitigatie: regression test op BB pre/post Δ-2 — accept ±5 punten verschil (intentional, vangt tot nu toe gemaskeerde fluff).
- **Provenance-tagging maintenance** (laag): citation-keys kunnen rotten als bron-URLs offline gaan (zoals VRT-taaladvies database is gegaan). Mitigatie: bron-naam in `citations.ts` blijft valid bibliographic referentie ook bij dode link; 6-maandelijkse link-check.
- **`nl-BE` extends-but-frozen complexiteit**: heuristiek-loader bouwt `nl-BE` programmatisch uit `nl-NL` base + whitelist + extra-flags maar exporteert als bevroren unit. Mitigatie: één-keer-aan-startup, gecached in registry-object, geen runtime-cost per review (zie ADR-3).

# Out of scope

- **Native BE/DE content-strateeg-review** — user-keuze 2026-05-08: false-positive risico geaccepteerd; pilot-feedback corrigeert
- **HIX-implementatie voor DE** (Hohenheimer Verständlichkeitsindex als scoring-component) — academische schaal genoemd in research; v1 gebruikt alleen wordlists; HIX volgt mogelijk in iteratie 3 (`fval-iteratie-3` LATER-roadmap)
- **`fr-BE` / `nl-SR` / `de-AT` / `de-CH`** — uitbreidingen blijven syntactisch consistent met IETF BCP 47, bouwen later
- **Per-workspace custom heuristic-overrides** — alleen `BrandVoiceguide.wordsWeAvoid` + `antiPatterns` blijven workspace-specifiek (bestaande functie); custom packs zijn LATER
- **Brandstyle-scraper integratie** — niet gerelateerd; visuele heuristics zijn aparte discipline
- **Heuristics-package-versioning** — alle pakketten zijn één versie; iteratie 3 introduceert version-pinning
- **Auto-wired AI-feedback-loop** — Pijler 3 violations niet automatisch terug naar BV; manual learning blijft

# Notes

Bron-research deze sessie 2026-05-08 leverde ~25 authoritative bronnen op verdeeld over 4 talen (volledige wordlijsten + URL-citations in subagent-output van planning-sessie). Implementatie gebruikt deze als seed; tijdens uitvoering verspreiden over de 4 locale-directories met provenance-tag per entry.

Pilot-rollout volgorde (per beslispunt 2 in idea-doc):
1. Better Brands `nl-NL` eerst (Phase 1 smoke)
2. Linfi `nl-NL` daarna
3. `en-GB` (founder-marketing-content of 3e pilot)
4. `nl-BE` + `de-DE` alleen on-demand wanneer pilot-klant zich aandient

ADR-3 (`docs/adr/2026-05-08-locale-routing-brand-voice.md`) is de canonical referentie voor hoe `BrandVoiceguide.contentLocale` wordt geresolved + waarom hard-switch + nl-BE-extends-nl-NL pattern.

Plan: schema + locale-resolver eerst (klein, foundation), dan citations + types + shared helpers, dan per-locale packs (nl-NL → en-GB → nl-BE → de-DE), dan Pijler 3 wiring + smoke. Parallel-uitvoer mogelijk per-locale na foundation.
