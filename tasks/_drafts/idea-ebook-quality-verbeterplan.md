---
id: ebook-quality-verbeterplan
title: E-book content-type quality + asset-pipeline verbeterplan
fase: pre-launch
priority: needs-triage
effort: ~8-12d totaal (afhankelijk van scope-keuze)
owner: tbd
status: draft
created: 2026-05-18
related-spec: docs/playbooks/testplan-content-items.md (sectie 5 bug-log + 4 long-form matrix)
related-task: content-items-test-coverage
---

# Probleem

Handmatige test van content-type `ebook` op LINFI workspace (2026-05-18) leverde een resultaat op dat op meerdere assen onder norm zit. Vier andere Long-Form types (`case-study`, `whitepaper`, `pillar-page`, `blog-post`) passeerden de test. E-book valt uit toon door zijn complexere structurele vereisten + visueel multi-component karakter.

Composite F-VAL score: **85** (passed-threshold = 75) maar dat verbergt:
- 73 Strategy-pillar (zwakste) — onder 75 threshold
- 81 Menselijk
- 91 Merkstijl

Vijf onafhankelijke issues geïdentificeerd, elk met andere root cause + scope-implicatie. Sommige zijn pure prompt-fixes (1-2u), sommige zijn ontbrekende features (>1 week). Dit document quantificeert alle 5 zodat ze gerouteerd kunnen worden — niet alles hoeft pre-launch.

# Diagnose-evidence (3 parallelle Explore-agents 2026-05-18)

## H1 — Chapter-titel duplicate / paraphrase-drift (P2 content onbruikbaar)

**Observatie**: H4 = "Van meting tot montage", H6 = "Van netting tot montage". LLM-paraphrase die unique-titles niet enforce't.

**Root cause** (`src/lib/studio/prompt-templates/long-form.ts:255-312` EBOOK_SYSTEM prompt):
- Completeness checklist (regels 303-311) bevat geen uniqueness-constraint
- Anti-patterns sectie (regel 294) zegt "NEVER make all chapters the same length" — geen regel over title-uniqueness of paraphrase
- Output-schema (`prisma/seed.ts:5008-5016` componentTemplate): "body-sections" is een catch-all container — geen per-chapter array met validated titles, dus geen Zod-niveau dedupe mogelijk
- PROMPT_VERSION = '1.2.0' (long-form.ts:10) is stale; e-book miste content-test sub-sprints 5B-6A upgrades die wel naar blog-post / whitepaper landden

**Why it happens**: LLMs doen synonym-substitutie wanneer ze gerelateerde content herhaaldelijk genereren binnen één call. Zonder expliciete constraint nemen ze aan dat lichte herformulering = wenselijke variatie. De prompt vangt dit niet op.

**Fix-richting** (effort: ~2-3u):
1. EBOOK_SYSTEM prompt: voeg expliciete regel toe: "NEVER reuse or paraphrase chapter titles — each H2 must be lexically distinct. If your outline says X, use that exact phrase in the body."
2. Post-processing dedupe-check: extract alle H2 headings, fail/regen als duplicates of high cosine similarity (>0.85)
3. Bump `PROMPT_VERSION` → '1.3.0'

**Scope**: prompt-edit + utility-functie + smoke-test. Geen schema-change.

---

## H2 — Cover + chapter dividers ontbreken (NIET een bug, een ontbrekende feature)

**Observatie**: testplan-content-items zegt asset-patroon e-book = "Cover + chapter dividers (PDF)". Resultaat: geen cover, geen dividers, alleen dense lopende tekst.

**Root cause — pijplijn onvolledig**:
- `src/lib/ai/canvas-orchestrator.ts:1110-1119` — automatische image-generation **bewust gedisabled** (commentaar: "User selects or generates images explicitly in Step 3 of Content Canvas via InsertImageModal"). `imagePrompts` array wordt nog steeds gegenereerd voor backward compat maar triggert niets server-side.
- `src/features/campaigns/lib/deliverable-types.ts:313-324` — e-book entry heeft **geen** `assets` / `assetPatterns` / `requiredAssets` veld
- `src/lib/ai/canvas-context.ts:216` — e-book wordt gemapped naar `format: 'blog-article'` (zelfde als blog-post)
- `src/features/campaigns/components/canvas/previews/preview-map.ts:61-65` — geen entry voor `'ebook'`, fallback = `GenericPreview` (text-only)
- `GenericPreview.tsx:20-100` — heeft een single hero-image slot maar geen multi-asset support (geen cover-area, chapter-separators, page-layout, multi-page PDF rendering)
- Grep `ASSET_GENERATOR` / `assetPattern` / `assetConfig` / `requiredAssets` over hele codebase: **nul hits**

**Conclusie**: testplan §4 noemt "Cover + chapter dividers (PDF)" als verwachting maar er bestaat **geen** asset-generator-registry, geen per-type-asset-routing, geen multi-asset PDF-bundeling. Dit is **never-built**, niet broken.

**Recent gerelateerd**: `tasks/done/image-quality-chain.md` (#253) leverde negative-prompts + multi-candidate + visual-fidelity scoring, maar **geen orchestration** voor "welke generator per content-type" of "hoe meerdere assets bundelen".

**Fix-richting — drie scope-opties** (kies één):

| Optie | Wat | Effort | Pre-launch ja/nee |
|---|---|---|---|
| **A. Accept text-only** | Update testplan + deliverable-types: e-book asset-patroon → "tekst-only (Cover + dividers post-launch)". Behoud handmatige hero-image via InsertImageModal. | ~30 min docs | Ja, snelst |
| **B. Cover-only MVP** | Genereer 1 cover-image (via bestaande InsertImageModal flow, automatisch gepre-fillen vanuit titel + brand-voice). Geen chapter dividers, geen PDF-bundeling. | ~2-3d | Mogelijk, vereist UI-tweak + prompt-spec |
| **C. Full asset-pipeline** | Asset-generator-registry + per-deliverable-type asset-config + EbookPreview component + multi-page PDF-bundeling. Vereist routing: gpt-image-2 voor cover / Claude HTML→PNG voor dividers / asset-planner output structurering. | ~7-10d | Nee, post-launch (testplan §4.5 generator-eval is voorwaarde) |

**Aanbeveling**: **A pre-launch** (verwachting bijstellen) + **C in post-launch backlog** (mits pilot-feedback bewijst dat klanten cover/dividers willen voor e-book conversie). B is feature-creep — half-feature met onduidelijke user-value.

---

## H3 — Strategy-pillar 73/100 (P2)

**Observatie**: 73 < 75 threshold. Sub-zwakste pijler in screenshot. Voor B2B-architect-handbook verwacht je sterke positionering.

**Root cause** (3-laagse analyse):

**Laag 1 — UI-label confusion**: "Strategy" in UI = interne `judge` pillar (`FidelityScoreBar.tsx:248-250`):
- "Merkstijl" → `style` pillar (35% gewicht) → score 91
- "Strategie" → `judge` pillar (45% gewicht) → score 73 ← **dit is de leak**
- "Menselijk" → `rules` pillar (20% gewicht) → score 81

**Laag 2 — Judge is 6-dim G-Eval rubric** (`src/lib/brand-fidelity/g-eval-rubric.ts:45-124`):

| Dimensie | Gewicht binnen judge | Wat het meet |
|---|---|---|
| `strategicAnchoring` | 20% | Verankert content zich in strategische doelen/pijlers? |
| `audienceFit` | 15% | Spreekt content de declared persona aan? |
| `brandRecognition` | 15% | Zou lezer dit blind herkennen als DIT merk? |
| `antiPattern` | 30% | Vermijdt AI-tells (hardste dimensie) |
| `coherence` | 10% | Rode draad consistent? |
| `concreteness` | 10% | Abstracte claims concreet gemaakt? |

**73 totaal-judge** = 1-2 dimensies onder 7/10. Meest waarschijnlijke kandidaten gegeven het content-genre (Long-Form architect-handbook):
- `strategicAnchoring` (te generiek voor LINFI's specifieke positionering)
- `audienceFit` (architect-persona-context niet sterk genoeg verankerd)

**Laag 3 — Persona-context te beperkt** (`src/lib/brand-fidelity/fidelity-runner.ts:169-178`):
```typescript
function summarizePersona(stack: CanvasContextStack): string {
  const persona = stack.personas[0];
  return `${persona.name} — ${persona.serialized.slice(0, 240)}`;
}
```
**240 chars cap**. Voor een architect-persona met details over jobs/pain/triggers wordt veel context afgekapt. Judge-prompt krijgt dus een truncated persona, kan strategicAnchoring + audienceFit niet vol scoren.

**Strategy-summary context** (`fidelity-runner.ts:180-186`):
```typescript
function summarizeStrategy(stack: CanvasContextStack): string | undefined {
  const objective = stack.brief?.objective;        // <240 chars
  const platform = stack.concept?.creativePlatform;
  return undefined;  // ← Fallback: geen strategy context
}
```
**Returns undefined nu**. Strategy-context naar judge ontbreekt zonder brief/concept ingevuld. Voor content-mode single-content flow is brief/concept vaak leeg → judge mist strategische anchor.

**Geen per-content-type rubric**: judge-rubric is per-workspace configureerbaar (`FidelityConfig.rubricWeights`) maar **niet per-type**. E-book krijgt zelfde 6-dim rubric als blog-post. Voor lange B2B-content zou je `strategicAnchoring` + `audienceFit` zwaarder willen wegen.

**Fix-richting** (3 sub-fixes, oplopend in effort):

1. **Persona-context cap uitbreiden** (~1u): `summarizePersona` 240 → 800 chars + structured (name + role + pains[2] + triggers[2]) i.p.v. raw slice
2. **Strategy-context fallback** (~2u): wanneer brief/concept leeg (content-mode), bouw fallback uit BrandAsset PURPOSE/POSITIONING/PERSONALITY. Geef judge altijd een strategic anchor.
3. **Per-content-type rubric weights** (~3-4d): introduceer `deliverableTypes[id].rubricWeightOverrides` op `FidelityConfig`. E-book krijgt `strategicAnchoring: 0.30, audienceFit: 0.25` (vs default 0.20/0.15). Andere types houden defaults. Zod-schema uitbreiden + UI-config in Settings → AI Models. Of: schip sprint #6 als nice-to-have.

**Scope**: 1+2 zijn quick wins (~3u totaal) die elke content-type bevoordelen. 3 is groter en raakt schema — kan post-pilot.

---

## H4-H6 — Content-quality cluster: rigide structuur + missende lead-magnet elementen (P3 cluster)

**Observatie**: 8 doorgenummerde hoofdstukken + sub-steps leest als textbook, geen story-arc, geen "What you'll learn" intro-block, geen TOC, geen CTA-block.

**Root cause** (`long-form.ts:275-311`):
- Prompt heeft Hook-Teach-Apply-Bridge frame (regel 264) maar "Bridge" is onderspecified ("Connect this chapter to the next one. Create momentum" — geen concrete voorbeelden of templates)
- Geen instructies voor:
  - Table of Contents generation (intro regel 277 noemt het maar geen pipeline-stap)
  - "Key Takeaway" callout-boxes per hoofdstuk (passing mention regel 273)
  - "What you'll learn" intro-block
  - Narrative bridges/connectors tussen hoofdstukken
  - Closing CTA-block (lead-magnet conversie)
- Prompt design (regels 279-284) target 5 hoofdstukken — maar test gaf 8. Of LLM ignoreert de count, of de count-instructie is conditional/locale-dependent.

**Niet een bug op zich**, eerder een upgrade-opportunity voor de e-book prompt-template. Vergelijkbaar met de chain-of-prompts upgrades die in sub-sprint 5.B voor 8 representanten zijn gebouwd — e-book miste die ronde.

**Fix-richting** (effort: ~1d):
- Prompt-template upgrade voor e-book met:
  - Verplichte TOC-generatie als eerste sectie
  - "What you'll learn" bullet-list intro
  - Per-hoofdstuk "Key Takeaway" callout aan eind (in markdown bv. `> **Key takeaway**: ...`)
  - Closing CTA-block met conversion-hook
  - Narrative connector-instructie ("Each chapter must reference at least one element from the previous chapter to create flow")
- Chain-of-prompts upgrade: outline-generation → per-chapter-with-context generation (lost ook H7 op)

**Scope**: prompt-rewrite + golden-set update voor e-book in promptfoo. Geen schema-change.

---

## H7 — Chapter-length asymmetry / front-loading bias (P2)

**Observatie**: Hoofdstuk 1 lang/dens, daarna progressief korter. User-bevestigd.

**Root cause** (`canvas-orchestrator.ts:1371-1384` + `long-form.ts:267-284`):

**Architectural**: E-book wordt gegenereerd via **één LLM-call met 16K maxTokens budget**:
```typescript
// canvas-orchestrator.ts:1381
if (longForm.has(contentType ?? '')) return 16000;
```
Voor 5000-30000 woorden target (`deliverable-types.ts:315`) in één call is dat een token-budget van ~12K voor body-content. Bij ~5 chapters = 2.4K tokens/chapter gemiddeld. Single-pass LLM verdeelt tokens **greedig** naar eerste chapters.

**Prompt-instructie versterkt asymmetrie** (long-form.ts:267-271):
```
Critical design insight: chapters get SHORTER after chapter 3.
- Chapter 1 = longest
- Chapters 2-3 = medium
- Chapters 4-5 = shorter
- Final chapter = shortest
```
Dit is intentioneel ("call to action"-curve) MAAR de prompt geeft alleen *richting*, geen *hard min/max*. Bij gecombineerde token-budget druk + greedy LLM-allocatie wordt de gradient steiler dan bedoeld.

**Fix-richting — twee opties**:

**Optie A (quick win, ~3u)**: Hard constraints per chapter in prompt:
- Chapter 1: 800-1000 woorden (exact)
- Chapter 2-3: 600-700 woorden
- Chapter 4-N: 400-500 woorden
- + Post-gen validation: meet woord-counts per chapter, fail/regen als afwijking >30%

**Optie B (architecturale shift, ~3-5d)**: Multi-call chain voor e-book:
- Call 1: Outline + TOC + chapter-titles + per-chapter word-target
- Call 2-N: één call per chapter met outline-context + previous-chapter-summary
- Voordeel: voorspelbare lengtes, betere coherence, betere chapter-uniqueness (geen single-context paraphrase risk)
- Nadeel: ~3-4× longer wall-clock, hogere kost, vereist nieuwe orchestrator-pad

**Aanbeveling**: A pre-launch (snel + fix volledig op single-call-pad). B post-launch als pilot-feedback toont dat e-book quality een driver is.

---

# Scope-aggregatie + prioritering

| # | Issue | Severity | Effort | Pre-launch | Type |
|---|---|---|---|---|---|
| **H1** | Chapter-titel duplicate | P2 | ~2-3u | Ja | Prompt + dedupe utility |
| **H7-A** | Chapter-length hard constraints + validation | P2 | ~3u | Ja | Prompt + post-gen check |
| **H3.1** | Persona-context cap 240→800 chars | P3 | ~1u | Ja | Fidelity-runner tweak |
| **H3.2** | Strategy-summary fallback uit BrandAsset | P3 | ~2u | Ja | Fidelity-runner tweak |
| **H4-H6** | E-book prompt-template upgrade (TOC + key-takeaway + CTA + connectors) | P3 | ~1d | Ja | Prompt-rewrite + golden-set |
| **H2-A** | Accept text-only — testplan + deliverable-types update | P3 | ~30 min | Ja | Docs |
| **H3.3** | Per-content-type rubric weights | P3 | ~3-4d | Optioneel | Schema-change |
| **H2-B/C** | Cover + chapter dividers feature | P3 | 2-10d | Nee | Feature build |
| **H7-B** | Multi-call chain voor e-book | P3 | 3-5d | Nee | Architecturale shift |

**Pre-launch totaal** (H1 + H7-A + H3.1 + H3.2 + H4-H6 + H2-A): **~2-2.5d** werk.

**Post-launch backlog** (H3.3 + H2-B/C + H7-B): **~8-19d** afhankelijk van scope-keuzes.

# Aanbeveling pre-launch volgorde

1. **H2-A docs-update eerst** (30 min) — expectation alignment, voorkomt verdere "missende cover" bug-meldingen tijdens Ronde 1 voor andere types met asset-patroon
2. **H1 + H7-A bundel** (~5u) — beide raken `long-form.ts` EBOOK_SYSTEM prompt, kunnen in één PR
3. **H3.1 + H3.2 bundel** (~3u) — beide raken `fidelity-runner.ts`, kunnen in één PR
4. **H4-H6 prompt-rewrite** (~1d) — losse PR omdat het golden-set update vereist (Promptfoo)
5. Re-test e-book + verifieer composite > 75 en geen duplicate titles + chapter-length binnen 30% van target

# Out of scope

- Cover/chapter divider feature (H2-B/C) — post-launch, vereist asset-generator-registry design
- Per-content-type rubric weights (H3.3) — sprint #6+ optioneel
- Multi-call chain (H7-B) — alleen als A onvoldoende blijkt na pilot
- Andere Long-Form types die wel passeerden (case-study/whitepaper/pillar-page/blog-post) — separate analyse als ook daar issues opduiken

# Risico's

- **Prompt-tuning brittle**: H1 + H4-H6 zijn promp-only fixes. Model kan via paraphrase nog steeds afwijken. Mitigatie: dedupe-check + golden-set regression
- **Length-validation kan regenerate-storm geven**: H7-A's "fail/regen op >30% afwijking" zou bij slechte initial-output multiple LLM-calls triggeren → cost spike. Mitigatie: max 2 regens, dan accept met warning
- **Persona-context-extension raakt OOK andere content-types**: H3.1 fix is generic, niet ebook-specific. Kan andere types ook beïnvloeden (positief verwacht maar test alles in regression-sweep)
- **Stale prompt-version**: `PROMPT_VERSION '1.2.0'` heeft sub-sprint 5B-6A upgrades gemist. Bumping naar 1.3.0 kan ook andere drift onthullen

# Notes

- Brand: LINFI (architect-audience, luxury interior product "voorluiken")
- Workspace: getest 2026-05-18, peildatum playbook
- Score 85 was boven 75-threshold → geen auto-iterate getriggerd, dus content live-able
- Vier andere Long-Form types passeerden (case-study, whitepaper, pillar-page, blog-post) — wijst erop dat issues e-book-specifiek zijn, niet de Long-Form prompt-laag in zijn geheel
- Effie-fix (commit `e849a1ed`) verifieerbaar in deze test via DOM grep: status onbekend, niet expliciet door user genoemd — pak mee bij re-test

# Bestanden bij implementatie

**Prompt-laag**:
- `src/lib/studio/prompt-templates/long-form.ts` (EBOOK_SYSTEM regels 255-312, PROMPT_VERSION regel 10)

**Fidelity-laag**:
- `src/lib/brand-fidelity/fidelity-runner.ts` (summarizePersona regel 169, summarizeStrategy regel 180)

**Schema (alleen H3.3)**:
- `src/lib/brand-fidelity/composition-engine.ts`
- `src/lib/brand-fidelity/g-eval-rubric.ts`
- `FidelityConfig` Prisma model

**Asset-pipeline (alleen H2-B/C)**:
- `src/lib/ai/canvas-orchestrator.ts` (regel 1110)
- `src/features/campaigns/lib/deliverable-types.ts` (regel 313)
- `src/lib/ai/canvas-context.ts` (regel 216)
- `src/features/campaigns/components/canvas/previews/preview-map.ts` (regel 61)
- `src/features/campaigns/components/canvas/previews/GenericPreview.tsx`

**Tests/Goldens**:
- `tests/content-golden-sets/` — golden-set updaten voor e-book
- `scripts/smoke-tests/` — nieuwe smoke: ebook-prompt-output-validation

# Volgende stappen voor promote

Wanneer je deze idea wilt uitvoeren:
1. Promote naar concrete task-files: bv. `ebook-prompt-fixes.md` (H1+H7-A+H4-H6) en `fidelity-context-extension.md` (H3.1+H3.2)
2. Schedule bij sprint #5 of #6 afhankelijk van Track C prio
3. Voor full H2 build: aparte ADR voor asset-generator-registry design eerst
