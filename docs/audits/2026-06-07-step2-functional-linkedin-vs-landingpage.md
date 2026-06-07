# Audit — Step 2 (Content Variants): LinkedIn-post vs landingspagina, functioneel (2026-06-07)

**Vraag**: hoe werkt Step 2 functioneel voor een LinkedIn-post vs een landingspagina (niet qua inhoud)? Wat gaat goed, wat kan beter, + verbeterplan.

**Methode**: 5 parallelle code-investigators (variant-generatie / weergave-preview / selectie-vergelijking / bewerken-verfijnen / doorstroom-persistentie) + eigen cross-check op `Step2ContentVariants.tsx`, `LandingPageGenerateBlock.tsx`, `VariantCard`/`VariantCompareCard`, previews, `canvas-orchestrator.ts`, `generate-structured-variant` + `auto-iterate-variant`.

## Twee fundamenteel verschillende paden

`PUCK_WEBPAGE_TYPES` (landing-page/product-page/faq-page/comparison-page/microsite) → `LandingPageGenerateBlock`. Al het andere (LinkedIn-post etc.) → de multi-variant ABCD-grid in `Step2ContentVariants`.

| Dimensie | LinkedIn-post (multi-variant) | Landingspagina (structured) |
|---|---|---|
| Variant-engine | `canvas-orchestrator` — 2 **dynamische creative angles** (Gemini/Tree-of-Thoughts), 2 parallelle Claude-calls, SSE-stream | `generate-structured-variant` — vaste **A conservative / B creative**, 1 structured call |
| Aantal | 2 (hardcoded), per-group | 2 (hardcoded) |
| Preview | **WYSIWYG** platform-mockup (`LinkedInPostPreview`), side-by-side grid | **Tekst-formulier** van de secties (`VariantCompareCard`); echte pagina pas in Step 3 (Puck) |
| Bewerken | rich-text TipTap + AI-bubble (Shorter/Urgent/Brand Voice), **per-groep regenereren** | plain textarea per veld; **auto-iterate** (one-shot copy-rewrite, structuur locked) |
| Selectie | pill met angle-labels → pick-one (alle groups op één index) | A/B compare-cards → kies → bouwt Puck-pagina |
| Fidelity-score | per variant + per-component badges (`VariantAdQualityIndicator`) | per variant (A/B-toggle) |
| Beeld-generatie | optioneel + ontkoppeld (na keuze) | **verplicht + atomisch tijdens keuze** (hero 75s+retry server-side, features 4-budget/60s) |
| Persist | lazy (fire-and-forget per component), tot Step 3 | deterministisch + direct bij keuze (puckData gepatcht) |

## Wat gaat goed

1. **Angle-gedreven differentiatie** (social): 2 echt verschillende strategische angles (Gemini/ToT), niet cosmetisch — met semantische labels (bv. "Schaal & trots" vs "Daglicht & lucht").
2. **WYSIWYG-preview** (social): de mockup matcht de echte post → je beoordeelt wat je écht publiceert, en bewerkt inline op de mockup zelf.
3. **Rijke inline-edit + AI-microtransforms** (social): TipTap + Shorter/Urgent/Brand-Voice = snelle low-friction tweaks.
4. **Per-groep regenereren** (social): regenereer alleen het zwakke onderdeel, behoud de rest.
5. **Graceful fallbacks** (beide): ToT→legacy→1-call; beeld-fail→icon-grid; deterministische hero.
6. **Gedeelde `FidelityScoreBar`** (beide): consistente brand-fit-metric + zone-labels (TOP_TIER/HUMAN_BASELINE/AI_LEANING/PURE_AI).
7. **Deterministische, atomische hero/beeld-wiring** (landing, recente fix): pagina opent gegarandeerd mét foto, server-side.
8. **Type-veilige structured variant** (landing): compile-time correctheid, geen veld-drift.

## Wat kan beter

**Hoofdthema: de landingspagina-Step-2 is functioneel armer dan de social-Step-2 — het erft minder van de rijke variant-tooling.**

- **W1 (groot) — Geen WYSIWYG voor de landingspagina in Step 2.** Je bewerkt een tekstformulier "blind"; de echte pagina zie je pas in Step 3. Social krijgt een getrouwe preview.
- **W2 — Geen per-sectie-regenereren voor de landingspagina.** Alleen hele-variant auto-iterate (one-shot). Social regenereert per groep. Je kunt niet "alleen de FAQ opnieuw".
- **W3 — Geen tone/length-microtransforms voor de landingspagina.** Social heeft Shorter/Urgent/Brand-Voice; landing niet (alleen hele-variant auto-iterate).
- **W4 — Vaste conservative/creative-labels** (landing) vs dynamische semantische angles (social) → minder betekenisvolle A/B, geen angle-diversiteit-gate.
- **W5 — Auto-iterate zonder before/after.** Je ziet alleen een score-delta, niet wat er veranderde; geen iterate-tot-threshold (het is één call).
- **W6 — `count=2` hardcoded in beide paden.** Geen per-content-type-config voor meer/minder varianten.
- **W7 — Feature-beeld-budget hardcoded 4 + stille fallback.** 6 features → 2 worden icons, zonder feedback welke.
- **W8 — Persist-timing-asymmetrie + geen terugnavigatie.** Landing commit in Step 2 (puckData gepatcht) en de variant-keuze is daarna niet meer te herzien zonder nieuwe deliverable; social stelt uit.
- **W9 — Async fidelity-race.** Je kunt bevestigen vóór de scores klaar zijn; A/B-toggle kan out-of-sync scores tonen.
- **W10 — Edit-persist-asymmetrie.** Social inline-edits persisten per component (robuust); landing-edits zijn local-state tot "Kies" (verloren bij regenerate).
- **W11 — Dode/dubbele componenten.** `VariantCard` (VariantWorkspace) lijkt ongebruikt; `LandingPagePreview` verlaten per ADR 2026-05-24 → opruimen/verwarring.
- **W12 — Geen multi-select / A-B-export** (beide): geen "houd A én B voor een A/B-test".
- **W13 — Geen "beste"-signaal** (beide): alle varianten gelijk, geen historische performance-hint per angle.

## Verbeterplan (geprioriteerd)

**P1 — Til de landingspagina-Step-2 naar het niveau van social (hoogste leverage)**
- **P1a — Visuele preview per A/B-variant** in Step 2: render een verkleinde echte Puck-preview (hergebruik de Step 3-renderer als thumbnail) zodat je de pagina ziet vóór de keuze → WYSIWYG-pariteit. (De renderer is net robuust gemaakt; schaalbaar hergebruiken is haalbaar.) Lost W1.
- **P1b — Per-sectie-regenereren**: laat `auto-iterate-variant` een sectie-scope accepteren ("regenereer alleen hero/FAQ/…"), spiegelt social's per-groep. Lost W2.
- **P1c — Tone/length-microtransforms** op de veld-edits (hergebruik de social AI-bubble: Shorter/Urgent/Brand-Voice). Lost W3.

**P2 — Slimmere verfijning (beide)**
- **P2a — Auto-iterate before/after-diff + iterate-tot-threshold** i.p.v. one-shot. Lost W5.
- **P2b — Feature-beeld-transparantie**: toon welke secties/features geen beeld kregen + een retry-affordance. Lost W7.

**P3 — Variant-strategie & flexibiliteit**
- **P3a — Configureerbaar variant-aantal per content-type** (vervang hardcoded 2). Lost W6.
- **P3b — Dynamische angles ook voor de landingspagina** (hergebruik de angle-generator van het social-pad i.p.v. vaste conservative/creative) → betekenisvollere A/B. Lost W4.
- **P3c — Per-variant draft-persist** (edits niet verliezen bij regenerate) + variant-keuze herzienbaar (terug-nav vanuit Step 3 of een "opnieuw kiezen"-affordance). Lost W8 + W10.

**P4 — Polish / consistentie / opruimen**
- Uniforme error-messaging (welke variant faalde), fidelity-async-race-guard (blokkeer bevestigen tot scores klaar / markeer stale), loading-state op "Confirm & Continue", verwijder dode `VariantCard`/`LandingPagePreview`. Lost W9 + W11.
- (Later) multi-select / A-B-export + een "beste angle"-signaal uit historische performance. Lost W12 + W13.

## Aanbevolen volgorde
P1a (WYSIWYG-preview) heeft de grootste UX-impact en bouwt direct op de nu-robuuste renderer. Daarna P1b/P1c (regenereren + microtransforms) sluiten het gros van de social↔landing-gap. P2–P4 zijn incrementeel.
