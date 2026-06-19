---
id: website-page-types-w5
title: Page-types W5 — logo-garantie L-Fase 2 (judge-detectie + auto-retry/deselect) + L-Fase 3 (opt-in overlay + anchor-curatie)
fase: pre-launch
priority: now
effort: ~1 dag (plan-schatting; L-Fase 3 opt-in +1-2d apart beslispunt)
owner: claude-code
status: done — gemerged via #329 (2026-06-16)
created: 2026-06-12
completed: -
related-spec: docs/specs/website-page-types-implementatieplan.md §5
worktree: branddock-feat-page-types
depends-on: website-page-types-w0-w1 (W0 = logo L-Fase 1 prompt-laag)
---

# Probleem

Image-modellen hallucineren pseudo-logo's op gegenereerde beelden (storefronts/bussen/schorten/verpakkingen). W0 (L-Fase 1) dichtte de prompt-laag (`Brand:`-segment weg + unbranded-guards + negative-segments), maar FLUX negeert negative prompts (CFG=1) en nano-banana kent alleen semantic negatives — prompt-fixes drukken de frequentie fors maar halen nooit 0. User-eis: "of het juiste logo, of geen logo". De detectie-infra bestond al (coherence-judge op het feature-pad, `logo-fidelity`-dimensie op het hero-pad) maar **niets acteerde erop**.

# Acceptatiecriteria (L-Fase 2)

**Feature-pad**
- [x] Coherence-judge geeft een aparte boolean `visibleLogo` terug (score-neutraal; "when unsure, set true"; fail-soft default false zodat afwijkende responses het coherence-oordeel niet laten vallen)
- [x] Kandidaat-selectie (quality-mode): logo-vrije kandidaat wint ALTIJD van een kandidaat mét logo, daarna pas coherence — gratis preventie, judges draaiden toch al; runner-up draagt visibleLogo mee (swap-propagatie)
- [x] Regeneratie-poort: `visible-logo` als zwaarste reden (vóór low-coherence/duplicate), library-beelden beschermd (échte merkfoto = échte logo = toegestaan), backwards-compat voor callers zonder het veld, budget-cap (2/pagina) intact
- [x] Retry-aanscherping `{kind:'visible-logo'}`: front-loaded hard verbod + subject-anker + avoid-termen + nieuwe seed
- [x] Telemetrie: `logos=[…]` in de page-run-log

**Hero-pad**
- [x] `hero-logo-gate.ts`: pure beslisfunctie `decideHeroLogoSwap` (logo-fidelity < 50 op de actieve hero → auto-deselect naar de hoogst-scorende schone zustervariant) + `extractLogoFidelity` (parse uit het gepersisteerde aiJudgeDimensions-JSON) + async runner `runHeroLogoGate` (score-rows lezen, beslissen, `patchHeroVisualUrl` + isSelected-flip + cache-invalidatie; gooit nooit)
- [x] Wiring in generate-visual: in de bestaande fire-and-forget scoring-continuation, alleen `target==='hero'` met ≥2 varianten — **nul extra latency** op de hero-respons
- [x] Race-guard: de gate wisselt alleen wanneer de huidige hero-URL (settings) nog één van de zojuist gegenereerde varianten is; heeft de user intussen handmatig gekozen → no-op (`hero-not-ours`)
- [x] Geen schone variant → structured warn (`no-clean-variant`), géén auto-refine

**Gates**
- [x] tsc 0; eslint 0; nieuw `page-types-w5.ts` 20/20 in de keten (65+50+21+20); bestaande `smoke:feature-visual-gate` 23/23 ongebroken (backwards-compat); web-page-builder 1446/0; prompt-contracts 235; lp-text-quality 50; golden 12

# Bewuste keuzes

- **Geen auto-refine bij no-clean-variant**: het bestaande refine-pad (refine-visual route) voert brand-style-anchors als compose-inputs — precies trigger **T2** uit de logo-trace (échte merkfoto's mét logo waarvan multi-ref-fusion het logo verminkt terugkopieert). Auto-refinen zou het defect kunnen herintroduceren. De handmatige refine-knop (mét bestaande logo-fidelity-hint uit `extractRefineHint`) blijft de escape-hatch.
- **Hero-gate alleen op generate-visual**: -compose en -trained zijn expliciete user-keuzes met eigen beeld-inputs; het auto-hero-pad (LP variant-keuze) loopt via generate-visual. Uitbreiden kan later met dezelfde runner.
- **Drempel 50** conform plan §5 ("logo present but distorted" of erger) en de judge-rubriek (50 = distorted, 0 = wrong logo prominent).

# L-Fase 3 — opt-in overlay + anchor-curatie (GEBOUWD 2026-06-16)

De bestaande `compositeLogoOverlay`/`getBrandLogo`-infra aangesloten op het hero-pad als opt-in workspace-toggle + anchor-curatie. **Default UIT** (beslispunt 4: eerst L-Fase 1+2 meten, dán aanzetten).

**Opt-in toggle (geen schema-migratie)**
- [x] `hero-logo-config.ts`: `resolveHeroLogoOverlayEnabled` + `setHeroLogoOverlayEnabled` via `WorkspaceAiConfig` (featureKey `hero-logo-overlay`, `model`='on'|'off', default off) — exact het precedent van `resolveFeatureCandidateCount` (gedeelde dev-DB + migrations-history → bewust géén Prisma-kolom)
- [x] Route `/api/workspace/hero-logo-overlay` GET/PUT zodat de toggle settable is (niet alleen via psql)

**Hero-overlay (luminantie-bewust, top-right)**
- [x] `get-brand-logo.ts`: `getBrandLogos` (alle assets) + pure `pickLogoForBackground` (donkere hoek → LIGHT, lichte → DARK, polariteit-eerst, fallback-volgorde)
- [x] `logo-overlay.ts`: `sampleCornerLuminance` (sharp: hoek → 1×1 → Rec.601, degradeert naar 128) + `compositeLogoOverlay` accepteert nu `imageBuffer` (geen tweede fetch op een verlopende fal-URL)
- [x] generate-visual `target='hero'`: toggle aan + logo aanwezig → per variant de top-right-hoek sampelen, LIGHT/DARK kiezen, échte logo stempelen vóór upload (top-right vermijdt de hero-tekst); per-variant try/catch → rauw beeld bij fout; los van het scene-intent-pad; **componeert met L-Fase 2** (overlay aan → echt logo → hoge logo-fidelity → hero-gate deselect't niet)

**Anchor-curatie (plan §5 T2)**
- [x] `detect-logo-in-image.ts`: image-only Haiku-judge → `{ visibleLogo, prominence: none|incidental|dominant, rationale }`
- [x] `brand-style-anchors.ts`: `auditStyleAnchorsForLogos` (on-demand, 1 vision-call/anchor) + pure `summarizeAnchorLogoAudit` (dominant logo → NL-waarschuwing "vervang deze anchors")
- [x] GET `/api/workspace/brand-style-anchors?audit=1` surfaced de audit (opt-in query-param — kostenbewust, niet op elke GET)

**Gates (L-Fase 3)**: tsc 0; eslint 0; nieuw `page-types-w5-l3.ts` 18/18 in de keten (65+50+21+20+18); feature-visual-gate 23/23; web-page-builder 1446; prompt-contracts 235; lp-text-quality 50.

**Bewuste keuzes (L-Fase 3)**
- **Geen Prisma-migratie** — WorkspaceAiConfig-knop i.p.v. nieuwe kolom (gedeelde dev-DB + parallelle sessies + bestaande migrations-history → stray `db push` riskant; precedent bestaat al).
- **top-right default** — vermijdt de BrandHero-tekst (links/gecentreerd); plan-aanbeveling.
- **Anchor-audit on-demand (`?audit=1`)** — 1 Haiku-vision-call per anchor is te duur voor elke settings-GET.

# Notes

- **Open voor browser/live-verificatie**: (L-Fase 2) een echte run waarin de judge een logo flagt — detectie is een Haiku-prompt-wijziging, pas live meetbaar; hero-swap end-to-end. (L-Fase 3) toggle aanzetten via PUT `/api/workspace/hero-logo-overlay`, dan een hero genereren met een styleguide die LIGHT+DARK-logo's heeft → het échte logo top-right zien verschijnen met de juiste polariteit; `?audit=1` op een workspace met logo-anchors → waarschuwing zien.
- **L-Fase 3 settings-UI**: de backend (toggle-route + audit-query) staat; een knop/badge in de brandstyle-instellingen-UI is nog niet gebouwd (mechanisme-first, conform plan). Klein vervolgje wanneer gewenst.
- Pre-existing rode smokes (image-content-coupling CTA-chip, structured-tweaks flaky carousel) blijven buiten scope — zie tasks/website-page-types-w2-w3.md.
- **Hiermee is het volledige page-types-plan W0-W5 (incl. logo L-Fase 1+2+3) gebouwd.**
