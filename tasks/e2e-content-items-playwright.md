---
id: e2e-content-items-playwright
title: Playwright e2e-sweep over de 24 zichtbare content-types + campagnegenerator (Napking)
fase: post-launch
priority: now
effort: 1 dag bouwen + 1-2 uur runtime
owner: claude-code
status: in-progress
created: 2026-08-15
completed: -
related-adr: -
related-spec: docs/playbooks/testplan-content-items.md
worktree: - (co-sessie blokkeert git; committen kan pas als 8ed1aa79 dicht is)
---

# Probleem

De 53-types-sweep van juli (`content-items-test-coverage`, #367) was **handmatig UI-werk**;
een geautomatiseerde Playwright-suite stond daar expliciet out-of-scope. Daardoor is er
vandaag geen herhaalbare test die bewijst dat een gebruiker élk zichtbaar content-type
daadwerkelijk kan aanmaken én genereren. De bestaande `content-studio`-specs ontwijken het
probleem: ze doen `page.request` op API-endpoints en meerdere suites mocken de route, dus
ze raken de generatieketen niet.

Bijkomend: `e2e/playwright.config.ts` staat op `timeout: 30_000`, terwijl één echte
generatie minuten duurt. De huidige suite kán een generatie dus niet afwachten.

# Voorstel

Een eigen Playwright-project dat het échte klikpad aflegt voor de 24 **zichtbare**
content-types, tegen een `branddock_test`-kopie van de Napking-workspace (gevuld merk-DNA,
`contentLanguage = nl`), plus één run van de campagnegenerator.

Klikpad per type: Claw → Quick Content → type kiezen → aanmaken →
Content Canvas → genereren → wachten op afronding → output + F-VAL vastleggen.

# Acceptatiecriteria

- [x] Napking-merk-DNA staat in `branddock_test` in een eigen workspace (dev-DB alleen gelezen)
- [x] `data-testid` op type-select, submit-knop, canvas-generate-knop en output-container
- [x] Eigen config: ruime timeout, `retries: 0`, 1 worker, **geen** destructieve reseed
- [x] Spec loopt over de 24 zichtbare type-IDs uit `deliverable-types.ts` — alle 24 gemeten
- [x] Per type vastgelegd: aangemaakt, generatie geslaagd, foutmelding, F-VAL-score
- [x] Campagnegenerator: gestopt op de briefing-gate (AI-score 68 < drempel 80) — **correct
      productgedrag, geen storing**. Setup + Knowledge + briefingvalidatie werken aantoonbaar.
      De stappen ná de gate (foundation, concept, deliverables, review) zijn hiermee **niet**
      afgedekt; daarvoor is een briefing nodig die ≥80 scoort.
- [x] Resultatentabel opgeleverd (`scripts/dev/content-sweep-report.ts`) + 8 bugs gemeld
- [x] `npx tsc --noEmit` 0 errors · `eslint` 0 errors (15 pre-existing warnings)

# Eindresultaat

**17 van 24 zichtbare types werken. 7 falen, door twee oorzaken (B1 en B6).**

| Uitkomst | Aantal | Types |
|---|---|---|
| Werkt | 17 | 4 long-form, 6 social, 6 ads, product-page |
| B1 (SEO stap 8) | 3 | blog-post, pillar-page, thought-leadership |
| B6 (variant-truncatie) | 4 | landing-page, faq-page, comparison-page, microsite |

⚠️ **Meetval die ik zelf raakte**: `product-page` leek mislukt omdat de componentketen leeg
was, maar zijn content stond in `settings.structuredVariantOptions` (2 varianten, 12.529
tekens) — de tweede keten uit ADR 2026-07-17. Het rapportscript telt nu beide ketens.
Gevolg: **B6 is niet-deterministisch** — product-page paste wél binnen 4500 tokens, de
andere vier niet. Intermitterende afkap, geen harde grens.

**F-VAL-signaal** (geen conclusie): long-form scoort 85-88, maar linkedin-post 69,
linkedin-poll 70, search-ad 70,5 en twitter-thread 71 zitten onder de drempel van 75.
Napking's styleguide staat op `published = false`, dus de stijl-pijler mist context —
eerst dat uitsluiten voordat je hier iets aan ophangt.

# Bestanden die ik aanraak

- `e2e/playwright.content-sweep.config.ts` (nieuw)
- `e2e/tests/content-sweep/*.spec.ts` (nieuw)
- `src/features/claw/components/QuickContentForm.tsx` — testids
- Canvas generate-component — testids
- `scripts/migrate-brand-dna/bundles/napking-e2e-<datum>.json` (nieuw, gegenereerd)

# Bestanden die ik NIET aanraak

- `e2e/playwright.config.ts` en `e2e/global-setup.ts` — de bestaande suite blijft ongewijzigd
- De dev-database — alleen lezen voor de export
- Generatie-/prompt-logica — dit is een test, geen fix

# Smoke test plan

Eerst één type (`blog-post`) end-to-end groen krijgen vóór de volle 24 draaien.

# Risico's

- **Kosten**: 24 generaties incl. beeld-types. Mitigatie: `retries: 0`, eerst één type.
- **Flake**: gotchas 2026-07-07 (count-race, detach-hang, stale testid). Mitigatie: testids
  op gedragsneutrale elementen, expliciete waits i.p.v. `.count()`.
- **Reseed wist data**: `global-setup` seedt destructief. Mitigatie: eigen config zonder
  `globalSetup`.

# Out of scope

- De 31 verborgen types (user-keuze 2026-08-15: alleen de 24 zichtbare)
- Headless sweep via `createAndGenerateDeliverable` (user koos Playwright)
- Fixen van gevonden bugs — die worden gemeld, niet opgelost

# Fixes + hertest (2026-08-15)

Alle 8 bevindingen opgelost en de 7 gefaalde types opnieuw door het echte klikpad:

| Type | vóór | ná | bewijs |
|---|---|---|---|
| blog-post | EMPTY | ✅ | SEO-job COMPLETED 8/8 · 26.829 tekens |
| pillar-page | EMPTY | ✅ | COMPLETED 8/8 · 32.269 tekens |
| thought-leadership | EMPTY | ✅ | COMPLETED 8/8 · 27.364 tekens |
| landing-page | GENERATION_FAILED | ✅ | 10.961 tekens |
| faq-page | GENERATION_FAILED | ✅ | 10.566 tekens |
| comparison-page | GENERATION_FAILED | ✅ | 11.379 tekens |
| microsite | GENERATION_FAILED | ✅ | 5.249 tekens |

Sluitende maat over de hele hertest: **0 truncatie-fouten** (was 4+), **0 temperature-fouten**
(was élke beeldrun), **0 hero-persist-fouten** (was élke AI-hero).

## Wat het meten veranderde aan de fixes

**B6 zou ik verkeerd hebben gefixt op basis van de foutmelding.** Die zei "increase maxTokens".
Een probe met échte API-calls wees anders uit:

```
max_tokens=4500   default   → stop=max_tokens blocks=[thinking] chars=0
max_tokens=12000  default   → stop=max_tokens blocks=[thinking] chars=0
max_tokens=4500   disabled  → stop=end_turn   blocks=[text]     chars=3035
```

Extended thinking staat standaard AAN op `claude-sonnet-5` en put het budget uit. Verhogen
financiert alleen meer thinking. De foutmelding in `anthropic-client` benoemt dit nu zelf
zodra `chars === 0` samenvalt met een thinking-block.

**Een claim ingetrokken vóór hij een fix werd.** `brand-archetype-classifier` (maxTokens 500,
zelfde model) leek gegarandeerd stuk. Gemeten: hij werkt — 41 tekens binnen 500 tokens.
Thinking is **adaptief** en schaalt met taakcomplexiteit; het risico zit bij grote
gestructureerde generaties, niet bij alle STRUCTURED-calls.

## Bewust niet aangeraakt

`rule-structurer` en `brief-week-theme-prompt` zijn dezelfde soort STRUCTURED-calls en
theoretisch kwetsbaar. Daar thinking uitzetten is een kwaliteitsafweging (die twee redeneren
over merkregels) — een productkeuze, geen bugfix. De nieuwe foutmelding wijst het daar direct
aan als het toch misgaat.

# Bevindingen uit de sweep

## B1 — SEO-pipeline faalt structureel op stap 8 (ERNSTIG)
`SeoGenerationJob` FAILED op wave `Publication Prep`: *"Claude response was truncated
(hit 4000 token limit). The JSON output is incomplete."* Zeven stappen slagen, de achtste
sloopt de hele run. **De UI toont enkel een leeg variantenpaneel — geen foutmelding.**

Grondoorzaak is niet alleen het budget, maar een **tegenstrijdige prompt**:
- `seo-prompts.ts:344` (system): "produce ONLY a technical SEO implementation checklist …
  do NOT rewrite or reproduce it"
- `seo-prompts.ts:366` (user): "Prepare **the final publication-ready version** and the
  technical SEO checklist"
- `seo-pipeline.ts:504`: `8: { maxTokens: 4000 }  // enkel de checklist (geen rewrite meer)`

Het budget is verlaagd op de aanname "checklist-only", maar de gebruikersprompt vraagt nog
steeds om de volledige eindversie. Bovendien bevat de checklist zélf twee JSON-LD-blobs
(`faqSchema`, `howToSchema`) als ge-escapete strings — voor long-form met FAQ past dat niet
in 4000 tokens, ook zonder rewrite.

**Reikwijdte exact bepaald** (`shouldRunSeoPipeline` schakelt pas bij een aanwezig keyword):

- **8 types falen deterministisch** — `seoKeyword` is verplicht én de SEO-tak staat aan:
  blog-post, pillar-page, thought-leadership, landing-page, product-page, faq-page,
  comparison-page, microsite. Een gebruiker kán deze niet genereren zonder de fout te raken.
- **4 types voorwaardelijk** — SEO-tak aan, maar geen verplicht keywordveld: whitepaper,
  case-study, ebook, linkedin-article. Ontsnappen in de sweep (verplichte velden worden
  gevuld, optionele niet), maar een gebruiker die het keywordveld wél invult raakt de fout.
- **Losse inconsistentie**: `article` eist `seoKeyword` maar draait de SEO-pipeline nooit —
  een verplicht veld zonder effect.

Bewijs: blog-post én pillar-page falen op exact dezelfde regel (stap 8/8, zelfde melding);
whitepaper — zelfde categorie, géén keywordveld — slaagde in 149s via het normale pad.
Bijkomend: bij een gefaalde run zijn de **beeldcomponenten wél gegenereerd** (blog-post: 2
beelden, 0 tekst), dus elke mislukking kost alsnog beeldgeneratie.

## B6 — website-variantgeneratie kapt af op 4500 tokens met NUL output
Uit de serverlog bij `landing-page` (niet zichtbaar in de UI):
```
[generate-structured-variant] SSE slot 0 failed: Claude response was truncated
  (hit 4500 token limit). Output was 0 chars.
[generate-structured-variant] SSE slot 0 retry also failed: … Output was 106 chars.
[generate-structured-variant] SSE slot 1 failed: … Output was 0 chars.
```
Beide variantslots én beide retries falen → de gebruiker krijgt "Generation failed —
Something went wrong. Please try again." zonder oorzaak. **"Output was 0 chars" bij een vol
tokenbudget** wijst op thinking-tokens die het output-budget opeten (gotcha 2026-07-12:
"maxOutputTokens is inclusief thinking-tokens"). Zelfde familie als B1, andere plek.

Raakt de 5 `WEBSITE_DELIVERABLE_TYPES`: landing-page, product-page, faq-page,
comparison-page, microsite.

## B7 — hero-beeld wordt nooit gepersisteerd (alt-tekst te lang)
```
[Step1Context] hero persist failed: HTTP 400 —
  {"fieldErrors":{"alt":["Too big: expected string to have <=500 characters"]}}
```
De gegenereerde alt-tekst overschrijdt de 500-tekenvalidatie van de eigen API. Faalt stil:
alleen een console-melding, geen UI-signaal. Het beeld verdwijnt gewoon.

## B8 — `dam-auto-tagger` is volledig stuk
```
[dam-auto-tagger] vision call failed: 400 — "`temperature` is deprecated for this model."
```
Elke auto-tagging-vision-call faalt op een verouderde parameter. Reproduceerde op élke run
met beeld. Stille faalmodus — de feature doet simpelweg niets meer.

## B2 — mislukte generatie boekt als geslaagde job
`AgentJob.status = COMPLETED` terwijl `SeoGenerationJob.status = FAILED`. Monitoring of
alerting op `AgentJob` ziet deze storingsklasse per definitie niet.

# Notes

- **Vondst 1 — `hidden` lekt**: `QuickContentForm.tsx:154` filtert alleen op categorie, niet
  op `hidden`. Exact **9 verborgen types** staan daardoor tóch in de Quick Content-picker:
  linkedin-carousel, linkedin-video-ad, linkedin-newsletter, linkedin-video, linkedin-event,
  tiktok-script, social-carousel, retargeting-ad, video-ad. De Add Content-modal respecteert
  de vlag wél — één van beide ingangen liegt.
- **Vondst 2 — dood endpoint**: `/api/campaigns/wizard/deliverable-types` retourneert 16
  hardcoded types met IDs buiten de canonieke registry (`blog-article`, `social-post`,
  `email-newsletter`, `video-script`, `presentation`, `brand-guidelines`); enige consument
  `useDeliverableTypes()` heeft nul call-sites.
- **Vondst 3 — campagne-type-filter**: `/api/campaigns` doet `where.type = { not: "CONTENT" }`.
  Een campagne van type CONTENT is dus onzichtbaar in de Quick Content-campagnekiezer.
  Kostte een debugronde; de e2e-campagne staat nu op STRATEGIC.
- **Opzet-les — `CRON_SECRET` is verplicht voor deze suite**: long-form/website-types nemen in
  `canvas-orchestrator.ts:383` de SEO-pipeline-tak, die een `SEO_GENERATE`-job op de queue zet
  en terugkeert. `kickWorker` (`jobs/dispatch.ts:101`) doet zonder `CRON_SECRET` +
  `BETTER_AUTH_URL` een **stille early-return** → job blijft PENDING, UI toont eeuwig de
  generating-staat, test loopt in zijn timeout. Zonder deze variabele meet je een
  infrastructuurgat en niet het product. Zelfde klasse als de dev-valkuil bij changelog #456.
- **Vals-groen-les**: de eerste spec-versie deed een vroege `return` bij een geblokkeerd type
  en rapporteerde daardoor "passed" terwijl er 0 componenten in de DB stonden. Nu faalt alles
  wat geen `VARIANTS_READY` oplevert. Een sweep die groen is zonder output is erger dan geen sweep.
- **Merkcontext-beperking**: Napking's styleguide staat op `published = false` (net als in dev),
  en `brand-context.ts:1278` poort de styleguide-context daarop. De sweep meet dus de
  voice-/asset-laag, niet de stijl-laag. Bewust zo gelaten om dev getrouw te spiegelen.
