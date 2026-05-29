# Content-flow analyse — Long-form

> **Status**: ingevuld 2026-05-29 · sub-sprint **#7.A** · methode: code-audit (refs onderaan)
> **Types (8, deliverable-types categorie "Long-Form Content")**: `blog-post` · `pillar-page` · `whitepaper` · `case-study` · `ebook` · `article` · `thought-leadership` · `linkedin-article`
> Bron: `deliverable-types.ts:276-388` (UI-categorie) · template-registry `prompt-templates/index.ts`

## 1. Pipeline-doorloop — category-specific checkpoints

Alle types lopen door `orchestrateContentGeneration()` (`canvas-orchestrator.ts:175`): context-assembly → 8 checkpoint-gates → template-resolutie → voice-directives → generatie → property-evals → F-VAL → silent auto-iterate → persist.

**Wat long-form uniek maakt:**
- **Plan-and-Solve is exclusief voor long-form.** Conditie: `usePlanAndSolve && contentTypeCategory === 'long-form'` (`canvas-orchestrator.ts:396,401`) → `runPlanAndSolveStream` (`:406`). Geen andere categorie kan dit. **Opt-in** (`contentTypeInputs.usePlanAndSolve`), dus standaard draait long-form het angle-based dual-call pad.
- **Geen SEO-pipeline** (website-only, `:339-342`).
- **F-VAL ↔ minWords interactie kritiek.** `validateFidelityComposite` (`checkpoint-gates.ts:295`) + STRICT-rewrite kunnen lange teksten inkorten; long-form heeft hoge `minWords`, dus tightening kan onder de gate-floor zakken. Zie §5.

## 2. Prompt-quality

- **Bestand**: `src/lib/studio/prompt-templates/long-form.ts` — 550 regels, `PROMPT_VERSION 1.3.0`.
- **Maar slechts 4 van de 8 categorie-types hebben een dedicated template** in de registry: `blog-post`, `pillar-page`, `case-study`, `thought-leadership`. `linkedin-article` heeft een template in `social-media.ts`. → **`whitepaper`, `ebook`, `article` hebben GEEN template** en vallen stil terug op de generieke prompt (`index.ts:56-74`). Dit is de zwaarste bevinding van deze categorie (zie §6).
- **Few-shot**: ≈14 example-referenties verspreid over de getemplate types (keyword-telling, niet exact).
- **Multi-stage**: Plan-and-Solve (PLAN→EXECUTE per sectie→ASSEMBLY) uitsluitend hier, maar opt-in.
- Gedeelde helper `buildLongFormUserPrompt` + `buildBaseSystemPrompt`/`buildContextBlock` uit `helpers.ts`.

## 3. Output-format (geverifieerd `deliverable-types.ts`)

`blog-post`/`pillar-page`/`article` Text+HTML · `whitepaper`/`case-study`/`ebook` Text+PDF · `thought-leadership`/`linkedin-article` Text. Geen structured-JSON of script.

## 4. Asset-pattern

- **Hero + inline**: `blog-post`, `pillar-page`, `case-study`, `article`.
- **No-asset / minimaal**: `whitepaper`, `ebook`, `thought-leadership`, `linkedin-article`.

## 5. Recente gotchas (categorie-relevant)

- **2026-05-17 — Silent auto-iterate clobbert variants + shrinkt long-form onder F-VAL gate** (`gotchas.md:5-8`). Belangrijkste long-form-gotcha: tightening-rewrite liet variant-0 onder de 50-woorden gate vallen. Opgelost met `don't-shrink` guard (registry `minWords`) + expliciete `variantIndex: 0` filter.
- **2026-05-17 — Effie-jargon lek** (`gotchas.md:10-13`) — gedeelde Strategy-step, treft alle categorieën. Opgelost.

## 6. Friction-points

- **`whitepaper`, `ebook`, `article` draaien op de generieke prompt** — geen expert-persona, geen structuur-skelet, geen few-shot. Dit zijn juist de langste/zwaarste types. Hoogste-impact gat in de categorie.
- **Plan-and-Solve onderbenut**: enige multi-stage kwaliteitspad is opt-in en wordt zelden geactiveerd.
- **F-VAL/minWords spanning**: structureel opgelost (2026-05-17), blijft fragiel raakvlak bij toekomstige threshold-tuning.
- **Ronde 1**: `pillar-page` afgetekend; overige — *pending Ronde 1* (parallelle sessie).

## 7. Verbeter-aanbevelingen

1. **Templates schrijven voor `whitepaper`, `ebook`, `article`** (nu generiek) — grootste kwaliteitswinst van de categorie. → ticket CF-1.
2. **Default Plan-and-Solve aan voor whitepaper + ebook** (langste types) i.p.v. globaal opt-in. → ticket CF-3.
3. **Golden-set uitbreiden** naar alle long-form types (nu enkel `blog-post`) zodat F-VAL re-tunes regressie-getest zijn tegen lengte-gevoeligheid.

## 8. Cross-type patterns / DRY

- Getemplate types delen `buildLongFormUserPrompt`; system-prompts bewust uniek → geen DRY-kandidaat.
- `linkedin-article` is UI-gecategoriseerd als long-form maar leeft als template in `social-media.ts` — categorie-grens-inconsistentie (synthesis §D).

## Referenties (file:line)

- `src/lib/ai/canvas-orchestrator.ts:175`, `:396/:401/:406` (Plan-and-Solve), `:881` (silent auto-iterate), `:26` (`getPromptTemplate` import)
- `src/lib/studio/prompt-templates/long-form.ts` (550r, v1.3.0; templates: blog-post/pillar-page/case-study/thought-leadership)
- `src/lib/studio/prompt-templates/index.ts:52-75` (registry + generieke fallback)
- `src/lib/content-test/checkpoint-gates.ts:295` (fidelity gate)
- `deliverable-types.ts:276-388`
- `gotchas.md:5-8`, `:10-13`
