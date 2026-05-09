---
id: canvas-tweaks-conversion-shortform
title: Per-type inputs voor conversion / short-form content (social posts, ads, promo-email)
fase: pre-launch
priority: now
effort: 2-3 dagen
owner: claude-code
status: done
created: 2026-05-08
completed: 2026-05-08
related-adr: -
related-spec: docs/audits/2026-05-08-canvas-per-item-tweaks-plan.md
worktree: branddock-feat-canvas-conversion
---

# Probleem

Short-form / conversion-content (social posts, ads, promotional-email) wordt door Erik als "vaak generiek" ervaren. Audit 2026-05-08 (`docs/audits/2026-05-08-canvas-per-item-tweaks-plan.md`) toont dat het hook-mechanisme (eerste 1-3 zinnen / scenes) en de objection/urgency/proof-laag in de prompt missen. AI krijgt nu wel structuur (`postType`, `adFormat`) en productie-stijl (`hashtagStrategy`, `urgencyLevel: 1-5`) maar geen narratieve scharnier-inputs. Mental-model walkthrough op `promotional-email` en `linkedin-post` bevestigt: met `hookFormat` + `payoffPromise` + `targetObjection` verschuift output van template-bouwen naar argument-construeren.

Pilot-relevantie: sales-emails en LinkedIn-posts zijn de typische Better Brands-content. Generieke output is hier direct merkbaar.

# Voorstel

Toevoegen van een nieuwe `conversionContentStyleFields()` bundle aan `content-type-inputs.ts`, plus per-type extensies. Bundle bevat:

- `hookFormat` (select: `pattern-interrupt` / `question` / `stat` / `contrarian-take` / `story-open` / `listicle-promise`) — stuurt eerste regel direct
- `payoffPromise` (text) — wat krijgt lezer als hij doorleest / klikt
- `targetObjection` (text, optioneel) — concrete weerstand die copy moet adresseren
- `proofPoint` (text, optioneel) — 1 stat / quote / case-fragment voor body

Bovenop bundle per type 1-2 specifieke velden (zie audit, sectie 2). Daarna `canvas-orchestrator.ts` aanpassen om nieuwe velden te interpoleren in prompt — bestaande velden behouden. AI-derivation-hints meenemen zodat Asset Planner pre-fillt.

**Scope-types** (12):
- Social: linkedin-post, instagram-post, twitter-thread, facebook-post
- Ads: search-ad, social-ad, display-ad, retargeting-ad, video-ad, native-ad, linkedin-ad
- Email: promotional-email, re-engagement-email

# Acceptatiecriteria

- [ ] Nieuwe builder `conversionContentStyleFields()` in `content-type-inputs.ts` (4 velden + AI-derivation hints)
- [ ] Per-type aanvullingen toegevoegd voor 12 types per audit-matrix
- [ ] Velden pre-populeren via Asset Planner (`aiDerivable: true`)
- [ ] `canvas-orchestrator.ts` interpoleert nieuwe velden in prompt-template
- [ ] `buildAiDerivationInstructions()` examples bijgewerkt
- [ ] ContextPanel rendert nieuwe velden zonder layout-bugs
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test: regenerate `promotional-email` met + zonder hookFormat/targetObjection en vergelijk subject + opener
- [ ] Smoke-test: regenerate `linkedin-post` met `hookFormat: pattern-interrupt` en verifieer dat eerste zin geen "Did you know" / "I want to share" opener is

# Bestanden die ik aanraak

- `src/features/campaigns/lib/content-type-inputs.ts` (bundle + 12 type-extensies)
- `src/features/campaigns/lib/canvas-orchestrator.ts` (prompt-interpolation)
- `src/features/campaigns/components/canvas/ContextPanel.tsx` (UI-rendering check, evt. groeperen)
- `src/features/campaigns/lib/asset-planner.ts` (AI-derivation hints, indien daar examples bestaan)

# Bestanden die ik NIET aanraak

- `medium-config-registry.ts` — Step 3 mag dun blijven, alle styling hoort in content-type-inputs
- `canvas-flow-registry.ts` — flow blijft 4-step
- Andere content-type-inputs (long-form / structured) — separate tasks
- `docs/specs/content-canvas.md` / `content-studio.md` — spec-rewrite is buiten scope

# Smoke test plan

1. Run dev-server, open Napking-workspace
2. Maak nieuwe campagne, kies content-type `promotional-email`
3. Verifieer: ContextPanel toont nieuwe velden onder bestaande `Engagement` of nieuwe `Conversion Hook` group
4. Vul `hookFormat: contrarian-take`, `payoffPromise: "10% extra omzet zonder discount"`, `targetObjection: "marketing-budget al uitgeput"`
5. Genereer email
6. Verwacht: opener pakt objection-frame, subject-line is contrarian, niet "Limited time offer"
7. Herhaal voor `linkedin-post` (hookFormat: pattern-interrupt) en `social-ad` (hookFormat: stat)
8. Output zonder nieuwe velden naast output met velden zetten — AI-judge moet "less generic" detecteren

# Risico's

- **AI interpreteert hookFormat-waardes inconsistent** → mitigatie: in canvas-orchestrator expliciete prompt-snippets per hookFormat-waarde meegeven (bv. `pattern-interrupt → "Open with a sentence that breaks expected rhythm"`)
- **ContextPanel cluttered met 4 nieuwe velden bovenop bestaande** → mitigatie: nieuwe `Conversion Hook` category creëren in INPUT_CATEGORY_CONFIG; toon alleen bij conversion-types via getInputCategories()
- **Pre-fill is wisselvallig** zonder genoeg campaign-context → mitigatie: aiHint expliciet maken ("derive from persona pain point + product value prop"); alternative: alleen objection/proofPoint AI-derivable, hookFormat door user
- **Bestaande `urgencyLevel: 1-5`** wordt redundant met `hookFormat` + `payoffPromise` → mitigatie: behouden voor backwards-compat; in audit van bouw-task evalueren of deprecaten in fase 2

# Out of scope

- Long-form / authority-types (separate task `canvas-tweaks-longform-authority`)
- Structured types (separate task `canvas-tweaks-structured-skeleton`)
- Voice/tone-versterking — pas oppakken na deze 3 bouw-tasks indien klacht overblijft
- Content-Strategy AI-prompt-aanpassingen anders dan input-interpolatie
- UI-redesign van ContextPanel — alleen integratie, geen nieuwe layout

# Notes

Audit `docs/audits/2026-05-08-canvas-per-item-tweaks-plan.md` is de volledige inhoudelijke onderbouwing. Sectie 2 (Social + Ads + Email) heeft per type de specifieke aanvullingen.

Erik's feedback (2026-05-08): conversion-content is pilot-pijler. Beginnen met deze task is logisch — meeste types, sterkste hypothese-bevestiging, direct merkbaar bij Better Brands-content.

Cross-link: `tasks/canvas-tweaks-longform-authority.md` (parallel), `tasks/canvas-tweaks-structured-skeleton.md` (parallel), `tasks/canvas-image-briefing-plan.md` (image-zijde, separate track).

## Decisions 2026-05-08 (Erik gedelegeerd)

- **Volgorde**: deze task EERST (1 van 3). Reden: meeste types (12) + grootste pilot-impact + sterkste hypothese-bevestiging via snelle iteratie.
- **`aiDerivable: true` op alle nieuwe velden**: JA — halve dag extra is gerechtvaardigd. Lege velden = zelfde generieke-output-probleem als nu; suggesties geven user een startpunt en versterken het "betere inputs → betere output" doel. Bouw suggestion-route mee in deze task.

## Implementation summary 2026-05-08

**Files changed**:
- `src/features/campaigns/lib/content-type-inputs.ts` — nieuwe `"conversion-hook"` InputCategory + INPUT_CATEGORY_CONFIG entry (order 1, label "Conversion Hook"); 6 nieuwe helpers (`hookFormat`, `payoffPromise`, `targetObjection`, `proofPoint`, `valueProposition`, `headlineCount`); nieuwe `conversionContentStyleFields()` bundle; 13 type-entries uitgebreid (4 social: linkedin-post, instagram-post, twitter-thread, facebook-post; 7 ads: linkedin-ad, search-ad, social-ad, display-ad, retargeting-ad, video-ad, native-ad; 2 email: promotional-email, re-engagement-email)
- `src/lib/ai/prompts/campaign-strategy.ts` — `buildAssetPlannerPrompt()` `contentTypeInputs` examples uitgebreid met conversion-bundle + per-type extras voor de 13 types (Asset Planner zal aiDerivable velden voorvullen)
- `src/lib/ai/canvas-orchestrator.ts` — `formatContentTypeInputs()` enrichment: wanneer `key='hookFormat'` rendert het een rijke instruction-snippet ipv dunne label-line. Plus `HOOK_FORMAT_INSTRUCTIONS` map met 6 per-value snippets (mitigatie risico 1). User-prompt header geüpdatet: "Hook Format instruction... overrides any generic 'engaging intro' guidance"
- `scripts/smoke-tests/conversion-tweaks.ts` (new) + `npm run smoke:conversion-tweaks`

**Quality gates**:
- ✅ `npx tsc --noEmit` 0 errors
- ✅ `npm run lint` 0 errors (960 warnings, baseline ongewijzigd)
- ✅ `npm run smoke:conversion-tweaks` 8/8 hard checks passed (1 soft-warning over AI-paraphrase)

**Hypothese-bevestiging (kwalitatief)**:
- promotional-email WITHOUT: "Hé, Je weet hoe het gaat: je team schrijft content, maar het voelt niet altijd als jouw merk." (generic competentie-aanspreek)
- promotional-email WITH (`hookFormat: contrarian-take`, `targetObjection: "AI-tools snijden te veel persoonlijkheid weg"`, `proofPoint: "+24% voice-fidelity"`): "**AI vermoord jouw brand-stem niet (wij voorkomen het)**" — direct contrarian subject, integreert objection en proof-point in body
- linkedin-post WITHOUT: "Merkconsistentie is niet iets voor later. Het is de basis." (statement-opener, decent maar generic)
- linkedin-post WITH (`hookFormat: pattern-interrupt`, `targetObjection: "consistentie maakt creatief werk saai"`, `proofPoint: "200+ B2B-merken / 2.3x conversie"`): "**Jouw merk zegt iets anders elke week. Dat is het probleem.**" — pattern-interrupt opener + objection-rebuttal + concrete data-anchor

**UI-rendering**: Step1Context.tsx consumeert `getContentTypeInputs()` dynamisch via `INPUT_CATEGORY_CONFIG` + groepeert. Nieuwe "Conversion Hook" categorie verschijnt automatisch bovenaan voor de 13 types. Geen UI-code wijzigingen nodig.

**Out-of-scope items die ik bewust niet aanraakte**:
- `urgencyLevel: 1-5` blijft staan (overlap met hookFormat+payoffPromise) — TODO comment toegevoegd in `adContentStyleFields()` voor fase-2 deprecation-evaluatie
- Geen wijziging in `medium-config-registry.ts` (Step 3 blijft dun, alle styling in content-type-inputs)
- Long-form / structured-types / image-zijde — separate tasks (`canvas-tweaks-longform-authority`, `canvas-tweaks-structured-skeleton`, `canvas-image-*`)
