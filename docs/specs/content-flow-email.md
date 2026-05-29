# Content-flow analyse — Email

> **Status**: ingevuld 2026-05-29 · sub-sprint **#7.A** · methode: code-audit
> **Types (5, "Email & Automation")**: `newsletter` · `welcome-sequence` · `promotional-email` · `nurture-sequence` · `re-engagement-email`
> Bron: `deliverable-types.ts:676-727` · template-registry `prompt-templates/email.ts`

## 1. Pipeline-doorloop — category-specific checkpoints

Standaard angle-based dual-call pad (`canvas-orchestrator.ts:175`). Geen Plan-and-Solve, geen SEO.

- **Sequences zijn meervoudig**: `welcome-sequence` en `nurture-sequence` produceren meerdere emails per deliverable. De gates (`checkpoint-gates.ts:62-388`) draaien per variant/component; er is **geen sequence-coherentie-gate** (geen check dat email 2 voortbouwt op email 1). Grootste category-specifieke blinde vlek.
- Verplichte secties subject/body/cta via `validateVariantOutput` (`checkpoint-gates.ts:205`).

## 2. Prompt-quality

- **Bestand**: `src/lib/studio/prompt-templates/email.ts` — 416 regels, `PROMPT_VERSION 1.2.0`.
- **4 van de 5 types hebben een dedicated template**: `welcome-sequence`, `promotional-email`, `nurture-sequence`, `re-engagement-email`. → **`newsletter` heeft GEEN template** en valt terug op de generieke prompt (`index.ts:56-74`). Opvallend, want newsletter is een hoog-volume basistype.
- **Few-shot**: ≈5 example-referenties (≈1 per getemplate type) — magere dekking.
- Gedeelde helper `buildEmailUserPrompt`. Geen multi-stage variant.

## 3. Output-format (geverifieerd)

Alle 5: HTML + Text (`deliverable-types.ts:676-727`). Samen met website de enige HTML-first categorie. Vereiste secties: subject, body, cta.

## 4. Asset-pattern

- **Inline images** voor alle 5 (geen hero/carousel). Beeld ondersteunend binnen body.

## 5. Recente gotchas (categorie-relevant)

- **Geen email-specifieke gotchas** in `gotchas.md`. Cross-cutting van toepassing: F-VAL/auto-iterate (`:5-8`), effie-lek (`:10-13`).

## 6. Friction-points

- **`newsletter` draait generiek** — geen expert-prompt voor het meest-gebruikte email-type.
- **Geen sequence-coherentie-borging**: multi-email sequences worden per-email gegenereerd zonder cross-email consistentie (toon-drift, herhaalde opening, onlogische arc).
- **Few-shot tekort** (≈1 per type).
- **Nul email-gotchas** = ongeteste flow, niet bewezen-stabiel; *pending Ronde 1*.

## 7. Verbeter-aanbevelingen

1. **Template voor `newsletter`** schrijven (nu generiek). → ticket CF-1.
2. **Sequence-coherentie-pass** voor `welcome-/nurture-sequence` (siblings-context, lexicale diversiteit) — sluit aan op `studio-siblings-context-variation`. → ticket CF-6.
3. **Few-shot uitbreiden** met subject-line + preheader anchors per type (open-rate gevoelig).

## 8. Cross-type patterns / DRY

- Getemplate types delen `buildEmailUserPrompt`; system-prompts uniek → geen DRY.
- Sequence-types delen een multi-step generatiebehoefte die nu niet expliciet gemodelleerd is → mogelijke gedeelde "sequence-orchestrator" helper (synthesis-doc).

## Referenties (file:line)

- `canvas-orchestrator.ts:175`
- `src/lib/studio/prompt-templates/email.ts` (416r, v1.2.0; templates: welcome-sequence/promotional-email/nurture-sequence/re-engagement-email — newsletter ontbreekt)
- `src/lib/studio/prompt-templates/index.ts:56-74` (generieke fallback)
- `checkpoint-gates.ts:205`
- `deliverable-types.ts:676-727`
- `gotchas.md:5-8`, `:10-13`
