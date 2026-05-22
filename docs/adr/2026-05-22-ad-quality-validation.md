---
id: 2026-05-22-ad-quality-validation
title: Ad-quality validation layer met L1 static rules + L2 AI-judge + per-platform plugins
status: accepted
date: 2026-05-22
supersedes: -
superseded-by: -
---

# Context

Branddock genereert ad-content (search-ad, facebook-ad, display-ad, linkedin-ad, native-ad, retargeting-ad, video-ad) via type-specifieke prompt-templates en `MediumEnrichment` componentTemplate-seed-rows. Op dit moment is de enige feedback op kwaliteit:

- Het system-prompt instrueert het model over Quality Score factors (Expected CTR, Ad Relevance, Landing Page Experience voor search; Quality Ranking voor Meta) als guidance, maar er is geen post-generation verificatie of het model zich eraan hield.
- De seed-row `componentTemplate` definieert `maxLength` per veld, maar dit is statisch advies aan het model — als het model 35 chars genereert in een 30-char headline slipt het door, geen validatie.
- De bestaande F-VAL validation-laag (`src/lib/ai/fval/*`) doet 3-pijler scoring (style 35% / judge 45% / rules 20%) maar meet brand-fit + menselijkheid, geen Google-/Meta-specifieke ad-quality indicators.

User-vraag (2026-05-22): "Wordt er bij het genereren van de advertenties ook een check gedaan op de kwaliteit? Google heeft hier indicatoren voor waardoor de advertentie een score krijgt." Het antwoord moest eerlijk zijn: nee, niet specifiek.

De vraag wijst op een echt gat:
- **Google Search RSA** heeft een algoritmische "Ad Strength" score (Poor / Average / Good / Excellent) gebaseerd op headlines-count, headline-uniqueness, keyword-usage, descriptions-count, asset-coverage. Daarbovenop Quality Score (1-10) per keyword met componenten Expected CTR + Ad Relevance + Landing Page Experience.
- **Google Display** heeft eigen Ad Strength logica voor responsive display ads.
- **Meta** (facebook-ad, instagram-ad) gebruikt Relevance Score + Quality Ranking + Engagement Rate Ranking + Conversion Rate Ranking — eigen platform-mechanica.
- **LinkedIn** Sponsored Content heeft Relevance Score met andere weights.

Deze indicators zijn ground-truth post-publish maar zonder live API-koppeling (Fase B van [[2026-05-22-ad-publishing-integration]] — accounts gekoppeld via OAuth, vereist meta Business Verification 2-8 wk approval) zijn ze niet beschikbaar in de generation-fase. Een validation-laag die NU bij elke generation kwaliteit communiceert — voordat OAuth-publish bestaat — is daarom apart nodig.

Het bestaande F-VAL is een natuurlijke template: 3-pijler scoring, gestructureerde output-schema, brand-fit prompt-pattern. Hergebruik is goedkoper dan from-scratch ontwerp.

# Decision

Adopteer een **hybride 2-laagse Quality Validation Layer met per-platform plugins, soft-warn UI, en F-VAL-template L2-judge**, als Fase A.5 binnen het bestaande ad-publishing-spec — tussen Fase A (generation polish) en Fase B (OAuth + publish-pipeline). Concreet:

1. **L1 — Static deterministic rule-engine** in `src/lib/ad-validation/rules/<platform>/<type>.ts` per platform/type. Checks zijn pure functies over de gegenereerde groups en metadata:
   - Mechanical: `char-overflow` per groep, `all-caps-in-headline`, `exclamation-in-headline` (Google policy), `banned-superlatives` ("#1", "Best", "Top-rated" zonder proof).
   - Structurele: `duplicate-headlines`, `sitelink-restating-title`, `keyword-in-h1` (vergelijk met `seoInput.primaryKeyword`).
   - Coverage: `minimum-headlines-count`, `descriptions-count`, `sitelinks-count`.
   - Output per rule: `{ status: 'pass' | 'warn' | 'fail', message: string, suggestion?: string }`.

2. **L2 — AI-judge laag** in `src/lib/ad-validation/judge/<platform>/<type>.ts`. LLM evaluate de gegenereerde ad tegen platform-specifieke kwaliteits-criteria. Output is een gestructureerd JSON-schema met scores 0-100 per dimensie + suggesties:
   - Search-ad dimensions: headline-hook-strength, headline-uniqueness, cta-clarity, keyword-relevance.
   - Display-ad dimensions: visual-text-fit, scanning-pattern-fit, headline-distinction-across-sizes.
   - Facebook-ad dimensions: hook-stop-power, body-cta-alignment, image-text-synergy (review the image-prompt, not the image bytes).
   - LinkedIn-ad dimensions: professional-tone, value-prop-clarity, b2b-relevance.
   - Reuse F-VAL judge prompt-template + output-schema; substituteer brand-fit-criteria met platform-quality-criteria.

3. **Per-platform indicators als plugins** — elke platform/type combo heeft eigen L1 rule-set + L2 dimensions + aggregate-weights. Modules zijn registry-driven (`AD_VALIDATORS_BY_TYPE`), nieuwe ad-types pluggen in zonder framework-wijziging.

4. **Aggregatie: weighted 0-100** zoals F-VAL. L1 hard-results bumpen of crashen de score (`fail` = -20 punten cap, `warn` = -5 punten); L2 dimension-scores genormaliseerd. Per platform andere gewichten — Google Search legt zwaarder gewicht op keyword-relevance + headline-count; Meta legt zwaarder gewicht op hook-stop-power.

5. **UI: score-badge bovenaan preview + expandable breakdown drawer**:
   - Compacte badge met Google's color-codering (Poor red / Average orange / Good yellow / Excellent green) en absolute score (bv. `Good · 78/100`).
   - Drawer onder/naast preview met per-rule + per-dimensie breakdown, fix-suggesties, en links naar bestaande Branddock-features (Brand Voice, Knowledge Library) waar nuttig.
   - Zit op Content Canvas Step 2 (Content Variants) — direct feedback bij elke regenerate.

6. **Soft-warn, geen hard-gate** in initial release. Lage score blokkeert Publish niet. Eventuele hard-gate komt in vervolg-ADR nadat usage-data toont dat lage-score-ads daadwerkelijk falen post-publish.

7. **Roll-out volgorde**: `search-ad` als eerste implementatie (meest gestructureerde indicator-set, snelste meetbaarheid via Google Ad Strength model). Daarna `display-ad`, `facebook-ad`, `linkedin-ad`, dan de rest. Elke ad-type krijgt een eigen feature-spec sectie.

# Y-statement

In de context van **een ad-generatie pipeline die nu alleen prompt-guidance + statische char-limits + algemene F-VAL brand-fit doet**, facing **een user-vraag naar échte ad-quality validatie met platform-specifieke indicators (Google Quality Score / Ad Strength, Meta Relevance Score, LinkedIn Relevance Score) NU bij elke generation, lang vóór OAuth-publish ground-truth beschikbaar is**, I decided **een hybride 2-laagse Quality Validation Layer (L1 static deterministic rule-engine + L2 AI-judge laag) met per-platform-plugins, soft-warn UI badge + breakdown-drawer, en F-VAL judge-architectuur als L2 blueprint, ingeplugd als Fase A.5 in het bestaande ad-publishing-spec**, to achieve **platform-bewuste kwaliteitsfeedback bij elke ad-generation met directe explainability, zonder publish-blocking, en zonder schema-refactor wanneer we later improvement-engine of hard-gating willen toevoegen**, accepting tradeoff **dat we per ad-type twee extra validation-lagen onderhouden, AI-judge tokens-kosten per generation toevoegt (~$0.001), en false-positives bij Google/Meta policy-updates user-vertrouwen kunnen schaden**.

# Consequences

## Positief

- Branddock positioneert zich als platform-bewust ad-tool — niet alleen "AI die copy schrijft", maar een tool die ook zegt of die copy zal performen.
- Hybride L1+L2 combineert best of static (snel, voorspelbaar, deterministic) + AI-judge (semantic, vangt nuance die rule-engine niet kan).
- Per-platform plugins maken het framework uitbreidbaar zonder refactor — elk nieuw platform = nieuw plugin-bestand, niet framework-wijziging.
- F-VAL judge-hergebruik versnelt L2 aanzienlijk: bestaand schema, bestaande judge-pattern, bestaande prompt-engineering hergebruikt.
- Quality-scores leveren natural signal voor de later-geplande AI improvement-engine (vervolg-ADR): "hier is een lage-score-ad, hier zijn de gefaalde dimensies, genereer rewrites die specifiek die dimensies adresseren."
- Soft-warn opent ruimte voor user-learning. Gebruikers zien "headline mist primary keyword" en leren te corrigeren — bouwt platform-fluency.
- Past natuurlijk in het bestaande Content Canvas Step 2 paradigma (Variant A vs B) — score wordt per variant getoond, helpt gebruiker te kiezen.

## Negatief / tradeoffs

- Twee nieuwe lagen per ad-type betekent extra implementatie-kosten per nieuwe ad-format — niet eenmalig.
- AI-judge laag tikt tokens-kosten aan, ~$0.001 per ad-generation. Bij hoge volumes (tienduizend ads/maand op platform-schaal) wordt dat $10/mnd per workspace, niet verwaarloosbaar.
- Per-platform indicator-onderhoud: wanneer Google een nieuwe Quality Score component introduceert of Meta hun Relevance Score-mechanica wijzigt, moet de bijbehorende plugin worden bijgewerkt. Niet groot, wel reëel.
- UI complexity neemt toe — badge + drawer + per-rule fix-suggesties wordt een eigen UX-laag die ontworpen en getest moet worden.
- Risico op false-positives: L1-regels die te streng zijn ("banned superlative" raakt onbedoeld een legitieme claim) of L2-judge die hallucineert. Schaadt user-vertrouwen. Mitigatie via duidelijke per-rule explainability ("waarom geeft deze regel een warning?") en transparant model-prompt voor L2.
- Verleiding bestaat om L2-output te over-interpreteren als "Google says this is bad" — terwijl het een Branddock-interpretatie is van Google's openbaar gemaakte criteria, niet ground-truth.

## Neutraal

- Quality-score is default-aan en niet feature-flagged — daarmee deel van het standaard product-pad.
- Score wordt opgeslagen op deliverable + variant niveau (nieuwe `AdQualityScore` model in vervolg-spec) zodat history beschikbaar is voor latere analyse + improvement-engine.
- Per platform andere weights in score-aggregatie; de aggregate-functie blijft generic maar weights zijn per-validator-plugin gedefinieerd.
- Voor `video-ad` waarschijnlijk minder relevant (geen Google-search-equivalent quality-score); later ADR bepaalt of die ad-type een quality-check krijgt of dat het bij F-VAL blijft.

# Alternatives considered

- **L1 only (alleen static rules)**: Verworpen omdat het semantic kwaliteit mist. Een rule-engine kan "is keyword aanwezig" beantwoorden, maar niet "is dit een sterke hook". Te veel false-negatives in praktijk — een formeel correcte ad kan inhoudelijk zwak zijn.
- **L2 only (alleen AI-judge)**: Verworpen omdat het tokens-kosten verdubbelt en de simpele mechanical checks (char-overflow, ALL CAPS, banned phrases) prima door deterministic rules afgehandeld kunnen worden zonder LLM-call. Bovendien zijn die deterministische checks 100% reproducible — gewenst voor user-vertrouwen.
- **L3 only (Marketing API ground-truth via Google Ads / Meta APIs)**: Verworpen omdat dit vereist dat ConnectedAdAccount + OAuth gekoppeld is (Fase B van [[2026-05-22-ad-publishing-integration]]), wat de quality-check pas post-launch beschikbaar maakt. User wil de check NU bij elke generation zien — vóór er een live ad-account is. L3 kan later als optionele bovenlaag in vervolg-ADR worden toegevoegd.
- **Hard-gate publish bij lage score**: Verworpen omdat het te restrictief is voor early-stage user-trust. Gebruikers moeten eerst leren wat de scores betekenen en het systeem moet bewijzen dat lage-score-ads daadwerkelijk falen. Blokkeren vóór dat bewijs er is voelt willekeurig.
- **Generic cross-platform rules (één set checks voor alle ads)**: Verworpen, te vaag. Google Quality Score, Meta Relevance, LinkedIn Relevance hebben fundamenteel andere mechanica. Een generieke set checks zou ofwel niets zinnigs zeggen ofwel de subtiliteiten van elke platform missen.
- **Quality check als optioneel feature-flag**: Verworpen — het is een kerntoegevoegde-waarde van het Branddock-product en moet default-aan zijn. Een feature-flag suggereert dat het optioneel is; semantisch is dat een verkeerde framing.
- **Separate quality-check feature buiten ad-publishing-spec**: Verworpen — het hoort logisch in dezelfde pipeline (generate → validate → publish) en de spec-organisatie volgt die flow.
- **F-VAL uitbreiden in plaats van eigen ad-validation laag**: Verworpen omdat F-VAL primair brand-fit + menselijkheid meet. Ad-quality is een orthogonale concern (een perfect-brand-fit ad kan slechte Google Ad Strength hebben). Aparte laag voorkomt dat F-VAL semantisch overladen wordt.

# Notes

Verwante artefacten:
- Feature-spec wordt opgesteld in `docs/specs/ad-quality-validation.md` met L1-rule-sets per ad-type, L2-judge JSON-schemas, aggregate-weight-tables per platform, en UI-mockup voor badge + drawer.
- Cross-reference: zal in [[2026-05-22-ad-publishing-integration]] spec opgenomen worden als Fase A.5, geplaatst tussen Fase A (generation polish) en Fase B (OAuth + publish-pipeline).
- F-VAL ADR: [[2026-05-05-fval-three-pillar]] — architectuur waar L2 judge-laag uit voortbouwt.
- Memory: `branddock-round1-social-2026-05-20` — context over Ronde 1 testronde waar deze validation-laag een natuurlijke uitbreiding op is.

Externe referenties (te raadplegen tijdens spec-fase):
- Google Ads Ad Strength: https://support.google.com/google-ads/answer/9929709
- Google Quality Score components: https://support.google.com/google-ads/answer/6167118
- Meta Relevance Score evolution naar Quality Ranking + Engagement + Conversion: https://www.facebook.com/business/news/relevance-score-replaced-with-quality-rate
- LinkedIn Ad Relevance Score: https://www.linkedin.com/help/lms/answer/a420717

Toekomstige vervolg-ADRs te verwachten:
- Hard-gate publishing bij minimum-score threshold (na trust-data verzameld is).
- L3 Marketing API integration: ground-truth Ad Strength scores rechtstreeks uit Google/Meta na Fase B publish-pipeline live is.
- AI improvement-engine architectuur — gebruikt quality-scores als signal voor welke ads een rewrite-cycle verdienen.
- `AdQualityScore` Prisma-model voor persistente score-history per deliverable + variant.

---

## Addendum 2026-05-22 — Display-ad dimensions update na RDA migration

**Context**: Op dezelfde dag dat deze ADR is geschreven werd display-ad gemigreerd van een legacy 3-fixed-size banner-brief (728×90 + 300×250 + 160×600) naar Google's current Responsive Display Ads (RDA) asset-library paradigm. Zie commit `10ff435e` en memory [[branddock-display-ad-rda-migration-2026-05-22]].

**Impact op deze ADR**: De display-ad L2-judge dimensions die in deze ADR genoemd zijn — `visual-text-fit / scanning-pattern-fit / headline-distinction-across-sizes` — zijn **OBSOLETE** voor RDA omdat:
- Er zijn geen vaste sizes meer (Google's ML composeert assets per placement)
- `scanning-pattern-fit` heeft geen betekenis zonder vaste banner-layouts
- `headline-distinction-across-sizes` is vervangen door distinction-binnen-de-asset-pool (5 short-headlines moeten 5 verschillende hook-angles zijn)

**Nieuwe dimensions voor `google/display-ad` L2-judge** (vervangen de eerdere drie):
- `asset-quantity` — count short-headlines + descriptions (target: 5 elk voor "Excellent")
- `asset-diversity` — zijn de 5 short-headlines fundamenteel verschillende hook-angles (claim/question/stat/contrarian/outcome), of zijn ze paraphrases van één angle?
- `asset-quality-per-type` — readability + value-prop clarity per slot, geaggregeerd
- `image-direction-multi-aspect` — werkt de art-direction in zowel landscape (1.91:1) als square (1:1) crops?

**L1 rules voor RDA** (vervangen de eerdere `distinct-headlines-across-sizes` etc.):
- Char-overflow per asset-type (30/90/25 ipv 25/35/15)
- All-CAPS / `!` / banned-superlatives over ALLE assets
- `duplicate-headlines-within-pool` — exact-of-quasi-duplicate detection binnen de 5 short-headline slots
- `duplicate-descriptions-within-pool` — idem voor descriptions
- `coverage-headlines-recommended` — 5/5 short-headlines voor "Excellent" Ad Strength
- `coverage-descriptions-recommended` — 5/5 descriptions
- `has-long-headline-required` — long-headline aanwezig
- `has-business-name-required` — business-name aanwezig
- `image-direction-no-text-overlay-warning` — regex-check op "text overlay", "logo top", etc. in image-direction prose (>20% text-on-image is Google policy violation)

**Aggregate-weights voor `google/display-ad`** blijven `L1_WEIGHT: 0.35 / L2_WEIGHT: 0.65` (semantic visual-text-fit oordeel was/is zwaarder dan mechanical).

**Score-aggregatie methodologie** blijft consistent met deze ADR's hoofdtekst — Ad Strength mapping naar Poor/Average/Good/Excellent labels via 0-25/26-50/51-75/76-100 thresholds.

**Volgt nog**: feature-spec [`docs/specs/ad-quality-validation.md`](../specs/ad-quality-validation.md) sectie 4.4 ("L1 rule-sets per ad-type — placeholders" voor display-ad) en sectie 9 (A.5.2 — Display-ad implementation phase) moeten geactualiseerd worden met deze RDA-aligned regels. Niet in scope van dit addendum — wordt opgepakt bij A.5.2 implementatie.
