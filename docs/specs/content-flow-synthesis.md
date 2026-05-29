# Content-flow analyse — Synthesis (cross-cutting)

> **Status**: ingevuld 2026-05-29 · sub-sprint **#7.A** · methode: code-audit
> Aggregeert de 8 categorie-rapporten (`content-flow-<categorie>.md`). Doel: cross-categorie patronen, het dichten van registry-gaten, DRY-kandidaten en een geprioriteerde verbeter-shortlist.

## A. Architectuur in één oogopslag

Eén pipeline `orchestrateContentGeneration()` (`canvas-orchestrator.ts:175`) bedient alle deliverable-types via `getPromptTemplate()` (`prompt-templates/index.ts:52`). Drie generatiepaden:

| Pad | Beschikbaar voor | Conditie | Bron |
|---|---|---|---|
| Standaard angle-based dual-call | alle categorieën | default | `canvas-orchestrator.ts` |
| Plan-and-Solve | **alleen long-form** | `usePlanAndSolve && contentTypeCategory==='long-form'` (opt-in) | `:396/:401/:406` |
| SEO-pipeline | **alleen website** | `WEBSITE_DELIVERABLE_TYPES` + `primaryKeyword` | `:337-343` |

8 universele checkpoint-gates (`checkpoint-gates.ts:62-388`). F-VAL 3-pijler (style 0.35 / judge 0.45 / rules 0.20) **identiek voor alle categorieën** (`composition-engine.ts`; default per-type threshold 65 `per-type-thresholds.ts`; composite 75).

## B. Registry-landschap (geverifieerd)

Er zijn **drie** type-bronnen die niet allemaal synchroon lopen:

1. **`deliverable-types.ts`** — 55 user-facing types over 8 UI-categorieën. *Bron van waarheid voor wat een gebruiker kan kiezen.*
2. **TEMPLATE_REGISTRY** (`prompt-templates/*.ts` object-keys via `index.ts`) — de types met een dedicated, gespecialiseerde prompt. Dekt **50 van de 55**.
3. **`TYPE_TO_CATEGORY`** (`prompt-version-registry.ts`) — categorie-map voor prompt-versie-tracking + routing. **Stale.**

## C. Headline-bevindingen

### C1 — 5 prominente types draaien op de generieke prompt  **[HIGH]**
Deliverable-types **zonder** dedicated template → stille fallback op de generieke prompt (`index.ts:56-74`, geen error, geen warn):

`whitepaper` · `ebook` · `article` (long-form) · `newsletter` (email) · `microsite` (website)

Dit zijn geen randtypes — whitepaper, ebook en newsletter zijn kern-content. Ze missen expert-persona, structuur-skelet en few-shot. Zelfde stille-fout-klasse als de gotchas van 2026-05-08/05-17.

### C2 — `TYPE_TO_CATEGORY` is stale  **[MED, latente bug]**
De map bevat ~9 **phantom-IDs** zonder template én zonder deliverable-type (`battle-card`, `objection-handler`, `product-demo`, `company-announcement`, `job-description`, `recruitment-post`, `employee-newsletter`, `crisis-statement`, `thought-leadership-bio`) en **mist** ~17 echte types (`proposal-template`, `product-description`, `testimonial-video`, `internal-comms`, `career-page`, `job-ad-copy`, `employee-story`, `employer-brand-video`, `impact-report`, `facebook-ad`, `linkedin-video-ad`, …). Gevolg: `getCategoryForType()` (`prompt-version-registry.ts`) geeft voor die echte types de **fallback-categorie `'long-form'`** terug → verkeerde prompt-versie-tracking en verkeerde categorie-routing.

## D. DRY & categorie-grens

- **Binnen categorieën: géén DRY** — elk van de 50 system-prompts is bewust uniek. De 8 `buildXUserPrompt`-helpers + `helpers.ts` (`buildBaseSystemPrompt`/`buildContextBlock`) zijn al de juiste gedeelde laag.
- **Categorie-grens-inconsistentie**: `social-media.ts` host templates die UI-anders gecategoriseerd zijn: `linkedin-article` (UI long-form), `linkedin-ad` + `facebook-ad` (UI advertising). Werkt, maar maakt ad-/long-form-template-onderhoud onlogisch vindbaar.
- **Goed gedeeld patroon**: de scripted-scene engine (`isScriptedScene`, `canvas-orchestrator.ts:133-137`) bedient video + `tiktok-script` + `video-ad`/`linkedin-video-ad` cross-categorie — referentie-model.

## E. Cross-cutting gaps

- **Multi-stage asymmetrie**: lange types buiten long-form krijgen géén Plan-and-Solve — `microsite`, `faq-page`, `comparison-page` (website), `proposal-template` (sales), `impact-report` (pr-hr). Generaliseer `category==='long-form'` naar een `LONG_OUTPUT_TYPES`-set.
- **Geen sequence-coherentie** voor email `welcome-/nurture-sequence`. Sluit aan op `studio-siblings-context-variation`.
- **Geen elevated-review** voor publiek-facing high-stakes types (`press-release`, `impact-report`): zelfde threshold als een job-ad.
- **Geen per-categorie F-VAL profilering**: een 30-woorden ad en een 30.000-woorden ebook worden op identieke pijler-gewichten + threshold beoordeeld. Overweeg per-categorie profielen — **na pilot-data**.
- **Few-shot onbalans**: social ≈40 vs email ≈5 / video ≈5 / advertising ≈7 — de magerste zijn juist de meest format-gevoelige.

## F. Geprioriteerde shortlist → `tasks/content-flow-improvements-7a.md`

| # | Actie | Prio |
|---|---|---|
| CF-1 | Templates voor `whitepaper`/`ebook`/`article`/`newsletter`/`microsite` + diagnostic-warn op generic-fallback | **HIGH** |
| CF-2 | `twitter-thread` routing + preview-map + content-templates-fallback | **HIGH** |
| CF-3 | Plan-and-Solve generaliseren naar `LONG_OUTPUT_TYPES` | MED |
| CF-4 | `TYPE_TO_CATEGORY` synchroniseren met TEMPLATE_REGISTRY + deliverable-types | MED |
| CF-5 | Few-shot uitbreiden advertising + email | MED |
| CF-6 | Email sequence-coherentie-pass | MED |
| CF-7 | Elevated fidelity-threshold + review-flag `press-release`/`impact-report` | MED |
| CF-8 | Categorie-grens `linkedin-ad`/`facebook-ad`/`linkedin-article` documenteren of verplaatsen | MED |
| CF-9 | landing-page Step 2 brand-fidelity wiring verifiëren op `main` | MED |
| CF-10 | Per-categorie F-VAL threshold-profielen | defer (post-pilot) |

## G. Validatie & vervolg

- **Friction-secties (§6) zijn deels *pending Ronde 1***: het handmatige `testplan-content-items` draait in een parallelle sessie. Afgetekend tot nu: `pillar-page`, `linkedin-post/-ad/-poll`, `instagram-post`. Volgende open representant: `twitter-thread`. Vul §6 per categorie aan zodra Ronde 1-resultaten binnen zijn.
- Momentopname (2026-05-29) van code op `main`. Hidden-flags, exacte `outputFormats` en de definitieve type-set: lees live uit `deliverable-types.ts`.

## Referenties

- `canvas-orchestrator.ts:175/:133/:337/:396/:881`
- `prompt-templates/index.ts:52-75` (TEMPLATE_REGISTRY + generieke fallback) · `prompt-version-registry.ts` (`TYPE_TO_CATEGORY`, `getCategoryForType`)
- `checkpoint-gates.ts:62-388` · `composition-engine.ts` · `per-type-thresholds.ts`
- `deliverable-types.ts:276-1017`
- Categorie-rapporten: `content-flow-{long-form,social,advertising,email,website,video,sales,pr-hr}.md`
