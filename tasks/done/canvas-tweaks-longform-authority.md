---
id: canvas-tweaks-longform-authority
title: Per-type inputs voor long-form / authority content (blog, thought-leadership, whitepaper, case-study, press)
fase: pre-launch
priority: now
effort: 2 dagen
owner: claude-code
status: done
created: 2026-05-08
completed: 2026-05-08
related-adr: -
related-spec: docs/audits/2026-05-08-canvas-per-item-tweaks-plan.md
worktree: branddock-feat-canvas-longform
---

# Probleem

Long-form / authority-content (blog-post, pillar-page, article, thought-leadership, whitepaper, linkedin-article) wordt generiek omdat de **unique-angle** + **evidence-pieces** + **counterclaim** ontbreken in de inputs. AI krijgt nu wel `articleStructure` + `seoKeyword` (descriptive-mode) maar geen argumentatieve scharnier. Mental-model walkthrough op `blog-post` (audit 2026-05-08, sectie 3.2): met `uniqueAngle` + `evidencePieces` + `counterClaim` verschuift H1 van "Brand Positioning: A Comprehensive Guide" (descriptive SEO-blog) naar argumentative thesis met expliciete bewijslast.

Drie PR-types (case-study, press-release, media-pitch) hebben een verwante failure-mode: missende **why-now angle** + **narrative pivot**. Worden meegenomen in deze task omdat infra-impact identiek is.

# Voorstel

Twee nieuwe builders in `content-type-inputs.ts`:

1. `authorityContentFields()` — voor long-form types die een argumentatieve stelling moeten innemen:
   - `uniqueAngle` (textarea, required) — "wat zegt deze content dat 95% van anderen niet zegt"
   - `evidencePieces` (tags, AI-derivable) — 3-5 named bewijsstukken (data / quote / anekdote / case-fragment)
   - `counterClaim` (textarea, optioneel) — anti-claim die expliciet weersproken wordt

2. `narrativeAnchorFields()` — voor PR / case-study / press waar narratief skelet missing is:
   - `whyNowAngle` (textarea, required voor press-types)
   - `pivotMoment` (text, required voor case-study + employee-story)
   - `industryContext` (text, optioneel)

Plus per-type aanvullingen volgens audit-matrix sectie 2 (Long-Form, sub-rij "Voorgestelde toevoegingen"). `canvas-orchestrator.ts` aanpassen om interpolaties op te nemen.

**Scope-types** (10):
- Long-form authority: blog-post, pillar-page, article, thought-leadership, whitepaper, linkedin-article
- Narrative anchor (PR/case): case-study, press-release, media-pitch, employee-story

# Acceptatiecriteria

- [ ] Nieuwe builders `authorityContentFields()` + `narrativeAnchorFields()` in `content-type-inputs.ts`
- [ ] Per-type aanvullingen toegevoegd voor 10 types per audit-matrix
- [ ] AI-derivation-hints zodat Asset Planner ze pre-fillt (m.n. `evidencePieces` + `whyNowAngle`)
- [ ] `canvas-orchestrator.ts` interpoleert nieuwe velden — voor `uniqueAngle` + `counterClaim` expliciet als "thesis vs. anti-thesis" framing
- [ ] `buildAiDerivationInstructions()` examples bijgewerkt
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test: regenerate `blog-post` zonder + met `uniqueAngle` + `counterClaim`, vergelijk H1 + lead-paragraph
- [ ] Smoke-test: regenerate `case-study` met `pivotMoment` + `whyNowAngle`, verifieer dat verhaal rond pivot draait

# Bestanden die ik aanraak

- `src/features/campaigns/lib/content-type-inputs.ts` (2 builders + 10 type-extensies)
- `src/features/campaigns/lib/canvas-orchestrator.ts` (prompt-interpolation, m.n. argumentative framing)
- `src/features/campaigns/components/canvas/ContextPanel.tsx` (rendering check)
- `src/features/campaigns/lib/asset-planner.ts` (derivation-hints)

# Bestanden die ik NIET aanraak

- `medium-config-registry.ts` — Step 3 raakt long-form niet
- `canvas-flow-registry.ts` — geen flow-divergentie nodig
- Conversion / structured types — separate tasks
- F-VAL fidelity-scoring — geen judge-criteria-uitbreiding in deze task

# Smoke test plan

1. Run dev-server, Napking-workspace
2. Maak campagne, content-type `blog-post`
3. Vul `uniqueAngle: "Most positioning frameworks fail because they treat positioning as creative rather than operational"`, `evidencePieces: ["Reichheld churn data", "Patagonia case", "B2B SaaS positioning failure anecdote"]`, `counterClaim: "Positioning is a constraint engineering problem, not a creative exercise"`
4. Genereer; verwacht H1 die contrarian is (niet "What is Brand Positioning"), lead-paragraph die counterClaim noemt, body die expliciet refereert aan named evidence
5. Herhaal voor `thought-leadership` en `case-study` (pivotMoment scenario: "het moment waarop de klant z'n team durfde te halveren")
6. Vergelijk vorige + nieuwe output side-by-side; F-VAL judge zou "less generic" / "stronger thesis" moeten flagen

# Risico's

- **`uniqueAngle` als required field schrikt af** als user nog geen angle heeft → mitigatie: AI-derivable maken zodat Asset Planner een eerste voorstel doet; user kan accepteren of overrulen
- **AI interpoleert evidencePieces als bullet-list** in plaats van te integreren in flow → mitigatie: prompt-template expliciet "weave the named evidence pieces naturally into argument; do NOT list them as bullets"
- **CounterClaim wordt te aanvallend** voor sommige merken → mitigatie: tone-suggesties uit Strategy chips dempen indien toon `friendly` / `warm-personal`
- **PR-types `whyNowAngle` overlapt met bestaande `releaseDate`** → mitigatie: `whyNowAngle` is "waarom nu nieuws", `releaseDate` is dateline. Help-text expliciet onderscheiden

# Out of scope

- Conversion / structured types
- Voice-versterking voor types waar input-toevoeging niet voldoende is (case-study / proposal-template fallen hier in 50/50 categorie — observeer eerst)
- F-VAL judge-uitbreiding met "thesis-strength" criterium — separate evaluatie na bouw
- UI-redesign — ContextPanel hergebruiken zoals het is

# Notes

Audit `docs/audits/2026-05-08-canvas-per-item-tweaks-plan.md` sectie 2 (Long-Form, PR/HR sub-rijen) en sectie 3.2 (mental-model walkthrough blog-post).

Volgorde-aanbeveling: na bouw-task 1 (conversion). Reden: long-form heeft langere generatie-tijd (60-120s) waardoor smoke-cyclus traag is; kortere conversion-types eerst om iteratie-snelheid te behouden.

Cross-links: `tasks/canvas-tweaks-conversion-shortform.md` (vorige), `tasks/canvas-tweaks-structured-skeleton.md` (parallel).

## Decisions 2026-05-08 (Erik gedelegeerd)

- **Volgorde**: deze task TWEEDE (na conversion-shortform) — bevestigd, geen wijziging.
- **`evidencePieces` veld**: **textarea, niet tag-input**. Convention: één evidence per regel, helpText "Eén stuk bewijs per regel — minimaal 3, maximaal 7 (citaten, statistieken, klantvoorbeelden)". Reden: evidence-stukken kunnen multi-line citaten zijn die niet in chips passen; AI splitst eenvoudig op `\n`. Tag-input introduceren als users frictie melden, niet upfront.
- **`aiDerivable: true` op alle nieuwe velden**: JA — halve dag extra is gerechtvaardigd. Voor `evidencePieces` specifiek: AI suggereert 3-5 evidence-pieces afgeleid uit brief + brand-foundation + persona; user kan accepteren / aanvullen / vervangen.
- **`uniqueAngle` als `required: false` + aiDerivable**: gekozen boven hard required. Mitigatie risico 1: Asset Planner pre-fillt → veld is feitelijk altijd gevuld zonder hard te blokkeren.

## Implementation summary 2026-05-08

**Files changed**:
- `src/features/campaigns/lib/content-type-inputs.ts` — 2 nieuwe `InputCategory` waardes (`"authority-frame"`, `"narrative-anchor"`, beide order 1) + INPUT_CATEGORY_CONFIG entries (mutually exclusive at type-level dus geen conflict op order); 9 nieuwe helpers (`uniqueAngle`, `evidencePieces`, `counterClaim`, `coreThesis`, `industryNorm`, `personalCredentials`, `whyNowAngle`, `pivotMoment`, `industryContext`); 2 nieuwe bundles (`authorityContentFields`, `narrativeAnchorFields`); 10 type-entries uitgebreid (long-form: blog-post, pillar-page, whitepaper, article, thought-leadership, linkedin-article; narrative: case-study, press-release, media-pitch, employee-story).
- `src/lib/ai/prompts/campaign-strategy.ts` — `buildAssetPlannerPrompt()` `contentTypeInputs` examples uitgebreid met authority-frame + narrative-anchor bundles + per-type extras voor de 10 types.
- `src/lib/ai/canvas-orchestrator.ts` — nieuwe `AUTHORITY_RICH_RENDERS` map met rich-render-snippets voor `uniqueAngle` (THESIS), `counterClaim` (ANTI-THESIS), `evidencePieces` (weave-not-list instructie), `pivotMoment` (NARRATIVE SCHARNIER), `whyNowAngle` (JOURNALISTIC HOOK). Mitigeert risico 2 (evidencePieces als bullet-list) expliciet via "Integrate these into the running argument as the content unfolds. Do NOT list them as a separate bullet-section."
- `scripts/smoke-tests/longform-tweaks.ts` (new) + `npm run smoke:longform-tweaks`

**Quality gates**:
- ✅ `npx tsc --noEmit` 0 errors in mijn files (1 pre-existing error in `competitor-snapshot-historie` parallel-task — niet mijn scope)
- ✅ `npm run lint` 0 errors (961 warnings, +1 t.o.v. baseline door parallel-task; mijn files lint-clean)
- ✅ `npm run smoke:longform-tweaks` 8/8 hard checks passed (1 soft-warning op letterlijke "pivot"-mention — AI parafraseerde)

**Hypothese-bevestiging (kwalitatief)**:
- blog-post WITHOUT (descriptive H1): "# Brand Consistency: Waarom B2B-merken hier mee stoppen"
- blog-post WITH (`uniqueAngle: positioning is operationeel niet creatief`, `counterClaim: brand consistency is creatieve uitdaging`, `evidencePieces: Reichheld churn / Patagonia / +24% conversie`): **"# Brand-Consistency Is Geen Creatieve Uitdaging — Het Is Een Operationeel Probleem"** — thesis-as-H1 + counterClaim impliciet ingebakken + integreert "operationeel" en "churn" in body
- case-study WITHOUT: descriptive lead "Napking is een B2B-softwarebedrijf..."
- case-study WITH (`whyNowAngle: EU AI Act Q1 2026`, `pivotMoment: Brand Lead besloot agency niet te vervangen maar voice operationeel te maken`): subtitle "**Marketingteam van 8 produceerde 5 verschillende brand-voices. Better Brands maakte er één van.**" + integreert "EU AI Act" timing-hook + "operationeel" pivot-thema

**Out-of-scope items die ik bewust niet aanraakte**:
- ebook (audit Long-Form scope, task-file scope laat uit — eigen `chapterTitles`+`narrativeArc` patroon, niet authorityContentFields)
- Conversion / structured / video-types — separate tasks
- F-VAL judge-uitbreiding met "thesis-strength" criterium — separate evaluatie na bouw indien nodig
- UI-redesign — Step1Context dynamic render via INPUT_CATEGORY_CONFIG werkt out-of-the-box
