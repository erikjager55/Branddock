# Audit + plan — per-content-type tweaks in Canvas wizard

> **Datum**: 2026-05-08
> **Aanleiding**: Plan-task `tasks/canvas-per-item-tweaks-plan.md` (Erik 2026-05-08): "tweaks per item bedoel ik dat er item specifieke vragen / inputvelden moeten zijn die relevant zijn." Hypothese: betere per-item inputs leveren specifiekere prompts en daarmee minder generieke output.
> **Scope**: alle 53 content-types in `docs/playbooks/testplan-content-items.md` mappen tegen `content-type-inputs.ts` (Step 1) + `medium-config-registry.ts` (Step 3). Gap-analyse + 3 gegroepeerde bouw-tasks.
> **Out-of-scope**: code-wijzigingen, spec-rewrites, image-briefing (separate plan in `canvas-image-briefing-plan.md`), tone/voice-versterking (eventueel separate task na bouw indien hypothese onvoldoende blijkt).

---

## TL;DR

1. **Mechaniek staat — dekking is ongelijk.** 53/53 testplan-types zitten in `CONTENT_TYPE_INPUTS` (geen ontbrekende registratie). 47 van de 53 hergebruiken een bundle (`*ContentStyleFields()`); 6 staan rauw zonder bundle (`linkedin-event`, `linkedin-poll`, `instagram-post`, `newsletter`, `microsite`, `welcome-sequence`).
2. **Generieke-output hypothese is sterk voor 3 archetypen**, wisselvallig voor de rest. Sales-email / blog-post / TikTok-script werden mental-model gewalkthrough'd: in alle drie maakt 1-3 extra concrete inputs ("offerType + urgency + objection-to-overcome", "uniqueAngle + counterClaim + sourceTypes", "hookFormat + sceneCount + payoffStyle") merkbaar verschil aan prompt-gehalte. Voor types die al zwaar gestructureerd zijn (case-study, proposal-template, linkedin-event) zit de bottleneck eerder in tone/voice dan in input-dekking — flag voor follow-up.
3. **De gaten clusteren rond drie archetypen**, niet rond categorie. Vandaar 3 bouw-tasks per archetype i.p.v. per testplan-categorie:
   - **Short-form / conversion** (social posts + ads + promotional email) — mist hook-mechaniek + concrete payoff/urgency-inputs
   - **Long-form / narrative authority** (blog / case-study / thought-leadership / sales-deck / press-release / video-script) — mist unique-angle / evidence-pieces / objection-handling
   - **Structured / multi-section** (carousels / landing-page / faq-page / comparison-page / webinar / podcast) — mist skeleton-input (per-slide topic, per-section purpose, per-segment beat)
4. **6 "naked" types verdienen review**, niet noodzakelijk extra inputs. `linkedin-event`/`linkedin-poll`/`newsletter` werken met campaign-detail-fields (eventName, pollQuestion, sectionTopics) die volstaan voor concrete output. `instagram-post`/`microsite`/`welcome-sequence` zijn echte gaten — instagram-post heeft geen hook-input, microsite heeft alleen page-count en SEO, welcome-sequence mist activation-doel-koppeling.

---

## 1 · Inventarisatie — wat heeft elk type nu aan inputs?

### Bundle-overzicht (per `*ContentStyleFields()`)

| Bundle | Velden | Toegepast op (testplan-naam) |
|---|---|---|
| `socialContentStyleFields` | hashtagStrategy, includeEmoji | linkedin-post, instagram-post, twitter-thread, facebook-post |
| `longFormContentStyleFields` | articleStructure, includeFaq | blog-post, pillar-page, whitepaper, case-study, ebook, article, thought-leadership, linkedin-article |
| `salesContentStyleFields` | salesAngle, includePricing | sales-deck, one-pager, proposal-template, product-description |
| `prContentStyleFields` | structure, quoteCount, includeBoilerplate, includeContactBlock | press-release, media-pitch, internal-comms, career-page, job-ad-copy, employee-story, impact-report |
| `emailContentStyleFields` | ctaPlacement, previewTextLength, personalize | welcome-sequence, promotional-email, nurture-sequence, re-engagement-email, linkedin-newsletter |
| `carouselContentStyleFields` | transitionStyle, includeCtaSlide | linkedin-carousel, social-carousel |
| `podcastContentStyleFields` | episodeFormat, segmentCount, introStyle, includeShowNotes, includeTranscript | webinar-outline, podcast-outline |
| `adContentStyleFields` | adCtaType (ctaType), urgencyLevel, socialProof | search-ad, social-ad, display-ad, retargeting-ad, native-ad, linkedin-ad, video-ad |
| `videoContentStyleFields` | footageType, textOverlay, colorGrade | tiktok-script, explainer-video, testimonial-video, promo-video, linkedin-video, employer-brand-video, video-ad |
| `webPageContentStyleFields` | seoFocus | landing-page, product-page, faq-page, comparison-page |

### Step 3 Medium config (rendering-laag, registry-driven)

Per `MediumCategory` (10): wat staat erin?

| Category | Step 3 fields | Status |
|---|---|---|
| `social-post` | — | Leeg sinds migratie 2026-04-27 (alle styling naar Step 1) |
| `long-form` | — | Leeg (geen platform-rendering) |
| `sales` | — | Leeg |
| `pr-hr` | — | Leeg |
| `carousel` | slideCount, slideFormat | Volledig |
| `email` | templateStyle, headerType | Volledig |
| `web-page` | pageLayout, heroStyle, sectionCount, ctaType | Volledig |
| `podcast` | duration | Minimaal |
| `advertising` | adFormat | Minimaal |
| `video` | duration, aspectRatio, quality | Volledig |

**Observatie**: Step 3 is bewust dun (alleen platform-rendering). Alle "wat-schrijft-de-AI" inputs zitten in Step 1 via `content-type-inputs.ts`. Tweaks horen daarom **uitsluitend** in `content-type-inputs.ts`.

---

## 2 · Gap-matrix per type (53 types)

> Legenda: **B+** = meerdere bundle-velden plus type-specifieke; **B** = alleen bundle-velden; **B-** = naked of one-field. Score is een proxy voor input-rijkdom, niet voor outputkwaliteit.

### Long-Form Content (7)

| Type | Huidige inputs (samenvatting) | Score | Voorgestelde toevoegingen | Rationale |
|---|---|---|---|---|
| blog-post | longForm-bundle, seoKeyword, secondaryKeywords, metaDescription, internalLinks | B+ | `uniqueAngle` (vrij tekst, "wat zegt deze blog dat 95% van blogs niet zegt"), `evidencePieces` (tags: "data/quote/anekdote/case-fragment"), `counterClaim` (textarea, optioneel) | "Generiek" komt vrijwel altijd door ontbrekende contrarian / unieke positionering. AI met `uniqueAngle` schrijft een H1+lead die vertrekt vanuit dat angle i.p.v. consensus-opener |
| pillar-page | longForm-bundle, seoKeyword, secondaryKeywords | B | `subTopicMap` (tags: 3-7 sub-topics die als H2 dienen), `expertiseLevel`, `internalSubpages` | Pillar-pages falen als ze niet als hub fungeren; een expliciete sub-topic-lijst stuurt structuur en latere internal-linking |
| whitepaper | longForm-bundle, researchTheme, expertiseLevel | B+ | `coreThesis` (textarea, 1-2 zinnen), `dataSourcesUsed` (tags), `targetCitationCount` (number) | Whitepapers worden generiek als ze geen scherpe stelling hebben — "core thesis as one sentence" dwingt AI tot stelling-name |
| case-study | longForm-bundle, customerName, challengeDescription, keyMetrics, customerQuote | B+ | `industryContext`, `solutionPhases` (tags: 3-5 implementatie-stappen), `failureFootnote` (textarea, optioneel — wat is gefaald onderweg) | Case-studies zijn vaak hagiografieën zonder spanning; `failureFootnote` voegt geloofwaardigheid toe |
| ebook | longForm-bundle, chapterCount, expertiseLevel | B+ | `chapterTitles` (tags), `narrativeArc` (select: educational/journey/argument), `targetTakeaway` | AI kiest nu zelf chapter-titles → vaak generiek; expliciete chapter-list is stevigere skeleton-input |
| article | longForm-bundle, seoKeyword, secondaryKeywords | B | Idem blog-post (uniqueAngle, evidencePieces) | Zelfde failure-mode als blog-post |
| thought-leadership | longForm-bundle, seoKeyword, authorPerspective | B+ | `provocativeClaim` (textarea), `industryNorm` (textarea: "wat denkt iedereen?"), `evidencePieces` | Thought-leadership = norm-busting per definitie; expliciete norm + counterclaim is het hele genre |

### Social Media (13)

| Type | Huidige inputs | Score | Voorgestelde toevoegingen | Rationale |
|---|---|---|---|---|
| linkedin-post | social-bundle, postType | B+ | `hookFormat` (select: question/stat/contrarian-take/story-open/listicle-promise), `payoffPromise` (text: "wat krijgt lezer als hij doorleest"), `personalAnecdote` (boolean) | LinkedIn-post wordt of-niet-gelezen op basis van eerste 2 zinnen; `hookFormat` stuurt eerste regel direct |
| linkedin-article | longForm-bundle, seoKeyword(opt), authorPerspective | B+ | `provocativeClaim`, `personalCredentials` (text: "waarom mag jij hier iets over zeggen") | Long-form social, vergelijkbaar met thought-leadership |
| linkedin-carousel | carousel-bundle, slidesCount, narrativeStructure | B+ | `slideTitles` (tags, optioneel skeleton), `payoffSlide` (text: "wat zegt slide 10") | Carousel-skeleton-input verhoogt structuur drastisch |
| linkedin-ad | ad-bundle, landingPageUrl, adFormat | B+ | `valueProposition` (textarea, kort), `targetObjection` (text), `proofPoint` (text) | Ads zonder concrete VP + objection worden stockphrase-output |
| linkedin-newsletter | email-bundle, subjectLine, newsletterTheme | B+ | `recurringSegments` (tags: vaste rubrieken), `featuredItem` (text: hoofd-item deze editie) | Newsletters herhalen structuur per editie; vaste segments = consistentie |
| linkedin-video | video-bundle, videoDuration, videoFormat | B+ | `hookSecond` (text: wat gebeurt 0:00-0:03), `payoffMoment` (text: scene waar value landed) | Video-script-skeleton: hook + payoff zijn de scharnierpunten |
| linkedin-event | eventName, eventDate, eventUrl, eventLocation, speakers | B+ (campaign-data only) | `valueForAttendee` (text), `urgencyHook` (text: deadline/scarcity) | Event-promotie zonder waarde-belofte = generieke "join us" |
| linkedin-poll | pollQuestion, pollOptions | B (campaign-data only) | `intendedInsight` (text: wat wil je leren) | Polls zonder doel produceren generieke vragen |
| **instagram-post** | social-bundle ALLEEN | B− | `hookFormat`, `payoffPromise`, `captionLength` (select: short/medium/long), `firstLineMagnet` | NAKED — alleen hashtag + emoji-toggle; geen briefing-input |
| twitter-thread | social-bundle, threadLength | B+ | `openingHook` (text), `tweetSkeleton` (tags, optioneel) | Threads die niet rond hook draaien sterven |
| facebook-post | social-bundle, postType | B+ | `hookFormat`, `audienceMood` (select) | Facebook is conversational — mood-input verandert tone |
| tiktok-script | video-bundle, videoDuration, trendReference | B+ | `hookFormat` (select: pattern-interrupt/question/POV-statement), `sceneCount` (number), `payoffStyle` (select: reveal/punchline/cliffhanger) | TikTok = hook-driven; bundle-velden (footage/text-overlay/color) zijn productie, niet briefing |
| social-carousel | carousel-bundle, slidesCount, platform, narrativeStructure | B+ | `slideTitles` (tags), `firstSlideHook` (text) | Idem linkedin-carousel |

### Advertising & Paid (6)

| Type | Huidige inputs | Score | Voorgestelde toevoegingen | Rationale |
|---|---|---|---|---|
| search-ad | ad-bundle, targetKeywords, landingPageUrl | B+ | `valueProposition`, `targetObjection`, `headlineCount` (number, default 3) | Google ads vereist meerdere headline-varianten; expliciet aantal |
| social-ad | ad-bundle, landingPageUrl, adPlatform, adObjective | B+ | `valueProposition`, `targetObjection`, `proofPoint` | Idem linkedin-ad |
| display-ad | ad-bundle, landingPageUrl | B | `valueProposition`, `dominantVisualElement` (text), `headlineCount` | Display heeft 1-2 woorden om mee te werken; expliciete focus is essentieel |
| retargeting-ad | ad-bundle, landingPageUrl, retargetingSegment, productReference | B+ | `previousActionContext` (text: wat de user concreet deed), `incentiveOffer` (text) | Retargeting-copy moet expliciet refereren aan eerdere actie |
| video-ad | ad+video-bundle, videoDuration, landingPageUrl, adPlatform | B+ | `hookSecond`, `payoffMoment`, `skipDeterrent` (text: hoe houd je in 0:00-0:05 vast) | Video-ads hebben 5s om skip te voorkomen |
| native-ad | ad-bundle, landingPageUrl, publisherStyle | B+ | `editorialPretext` (text), `valueProposition` | Native = editorial-mimicry; pretext-input is genre-essentie |

### Email & Automation (5)

| Type | Huidige inputs | Score | Voorgestelde toevoegingen | Rationale |
|---|---|---|---|---|
| **newsletter** | subjectLine, sectionTopics | B− | email-bundle ontbreekt!, `featuredItem`, `recurringSegments` | Newsletter mist `ctaPlacement` + `personalize` die andere email-types wel hebben — simpele inconsistentie |
| **welcome-sequence** | email-bundle, emailCount, sendInterval, onboardingSteps | B+ | `activationMilestone` (text: wat is "geactiveerd"-moment), `emailPurposeMap` (tags: per email 1 zin doel) | Sequences worden generiek als per-email-doel niet expliciet is |
| promotional-email | email-bundle, subjectLine, offerDetails, landingPageUrl | B+ | `urgencyMechanism` (select: deadline/scarcity/loss-aversion/none), `targetObjection`, `socialProofSnippet` | Promo-emails zonder urgency-mechanisme = "nice to know" |
| nurture-sequence | email-bundle, emailCount, buyingStage, keyObjections | B+ | `emailPurposeMap` (tags), `escalationCurve` (select: educate→demo / pain→solution / etc) | Nurture-sequences zijn structureel kwetsbaar voor "vul-mailtjes" |
| re-engagement-email | email-bundle, subjectLine, incentive, inactivityPeriod | B+ | `lastValueDelivered` (text: waar zat user de laatste keer interesse in), `pivotAngle` (text) | Re-engagement zonder anker naar laatste-interactie = generieke "we miss you" |

### Website & Landing Pages (5)

| Type | Huidige inputs | Score | Voorgestelde toevoegingen | Rationale |
|---|---|---|---|---|
| landing-page | webPage-bundle, seoKeyword, conversionGoal, trafficSource, socialProof | B+ | `valueProposition`, `targetObjection`, `sectionSkeleton` (tags: section-titel-list) | Skeleton-input per sectie maakt LP veel concreter |
| product-page | webPage-bundle, seoKeyword, productSpecs, pricingInfo | B+ | `valueProposition`, `targetObjection`, `featureBenefitMap` (tags pairs) | Product-pages worden feature-dump zonder benefit-mapping |
| faq-page | webPage-bundle, topQuestions, seoKeyword | B+ | `personaPainPoints` (tags), `productScopeBoundary` (text) | FAQ-relevantie hangt aan persona-mapping |
| comparison-page | webPage-bundle, seoKeyword, competitors, comparisonCriteria | B+ | `differentiatorClaim` (text), `tonePosition` (select: factual/persuasive/diplomatic) | Comparison kan giftig of zwak; tone-position stuurt |
| **microsite** | seoKeyword, micrositePages | B− | webPage-bundle (seoFocus) ontbreekt!, `pageSkeleton` (tags), `narrativeFlow` (text) | NAKED — alleen page-count en SEO; mist hele rest |

### Video & Audio (5)

| Type | Huidige inputs | Score | Voorgestelde toevoegingen | Rationale |
|---|---|---|---|---|
| explainer-video | video-bundle, videoDuration, videoFormat, complexityLevel | B+ | `hookSecond`, `coreAnalogy` (text: wat is de centrale metafoor), `payoffMoment` | Explainers staan of vallen bij analogy |
| testimonial-video | video-bundle, videoDuration, customerName, keyMessages | B+ | `emotionalArc` (select: relief/triumph/transformation), `objectionAddressed` (text) | Testimonials zonder arc = boring monologues |
| promo-video | video-bundle, videoDuration, musicDirection | B | `hookSecond`, `payoffMoment`, `valueProposition` | Promo zonder VP = atmospheric maar leeg |
| webinar-outline | podcast-bundle, videoDuration, webinarFormat, speakers, interactionPoints | B+ | `targetTakeaway` (text), `agendaSkeleton` (tags) | Idem ebook; skeleton-input |
| podcast-outline | podcast-bundle, videoDuration, guestInfo | B+ | `centralQuestion` (text), `agendaSkeleton` | Podcast-aflevering zonder centrale vraag = onbestemde gesprekken |

### Sales Enablement (4)

| Type | Huidige inputs | Score | Voorgestelde toevoegingen | Rationale |
|---|---|---|---|---|
| sales-deck | sales-bundle, slidesCount, pricingInfo, keyMetrics | B+ | `slideSkeleton` (tags), `centralPainPoint` (text), `competitorContext` (text) | Decks zijn vaak chaotisch; skeleton centraal |
| one-pager | sales-bundle, keyMetrics | B+ | `valueProposition`, `targetObjection`, `proofStack` (tags: 3-5 proof-elementen) | One-pager = compressed selling; structuur expliciet |
| proposal-template | sales-bundle, clientName, projectScope, budgetRange, timeline | B+ | `discoveredPainPoint` (text), `differentiatorClaim`, `riskMitigation` (text) | Proposals zonder discovery-anker = template-gevoel |
| product-description | sales-bundle, seoKeyword, productSpecs, pricingInfo | B+ | `valueProposition`, `featureBenefitMap`, `audienceMood` | Product-descriptions worden specs-dumps |

### PR / HR / Communications (8)

| Type | Huidige inputs | Score | Voorgestelde toevoegingen | Rationale |
|---|---|---|---|---|
| press-release | pr-bundle, newsFact, releaseDate, spokespersonQuote, contactInfo | B+ | `industryContext` (text), `whyNowAngle` (text) | "Why now" is journalistic-essentie; bestaande velden missen news-hook |
| media-pitch | pr-bundle, targetJournalist, exclusiveAngle | B+ | `journalistRecentArticle` (text: laatste relevante artikel), `dataPoint` (text) | Media-pitches floppen zonder reference naar journalist's eigen werk |
| internal-comms | pr-bundle, announcementType, actionRequired, affectedTeams | B+ | `whyNowFraming`, `acknowledgeConcern` (text) | Internal comms worden corporate-speak zonder "wat denkt het team nu?" |
| career-page | pr-bundle, jobTitle, jobLocation, salaryRange | B+ | `companyPainPoint` (text: wat lost deze persoon op), `dayInTheLife` (text), `growthPath` (text) | Career-pages = recruitment-marketing; "what problem do you solve here" is de hook |
| job-ad-copy | pr-bundle, jobTitle, keyRequirements, uniquePerks | B+ | `companyPainPoint`, `idealCandidateSignal` (text: "you'll know this is for you if…") | Job-ads zonder candidate-resonance-test trekken iedereen aan |
| employee-story | pr-bundle, employeeName, storyAngle | B+ | `pivotMoment` (text: keer-punt in verhaal), `cultureSignal` (text) | Employee-stories floppen zonder narrative-pivot |
| employer-brand-video | video-bundle, videoDuration, storyAngle | B+ | `cultureSignal`, `audienceTakeaway` | Idem |
| impact-report | pr-bundle, reportingPeriod, impactMetrics, stakeholderAudience, esgFramework | B+ | `failureLearnings` (textarea), `nextYearCommitment` (text) | Impact-reports worden propaganda zonder "wat ging niet"-sectie |

---

## 3 · Hypothese-check — "betere inputs → minder generieke output"

Mental-model walkthrough op 3 types met expliciete prompt-vergelijking.

### 3.1 Sales-email (`promotional-email`)

**Huidige inputs (bundle-niveau)**: `ctaPlacement: bottom`, `previewTextLength: 90`, `personalize: true`, `subjectLine: "...", `offerDetails: "30% off annual plans until June 30"`, `landingPageUrl`.

**Prompt-effect zonder tweaks**: AI krijgt offer-tekst maar geen mechanisme. Genereert opener als "We have great news!" en CTA "Don't miss out!" — generiek.

**Met voorgestelde toevoegingen** (`urgencyMechanism: "deadline"`, `targetObjection: "team can't justify cost"`, `socialProofSnippet: "Used by 200+ brand teams"`):

AI krijgt nu drie scharnierpunten. Opener kan vertrekken vanuit objection ("Most marketing budgets are scrutinized in Q3 — here's a number that flips the conversation"), urgency wordt deadline-gerelateerd (specifieke datum vs. vage "limited time"), social proof landt natuurlijk in body.

**Verschil**: prompt-tokens stijgen ~50%, output verschuift van template-bouwen naar argument-construeren. **Sterke hypothese-bevestiging.**

### 3.2 Blog-post

**Huidige inputs**: `articleStructure: deep-dive`, `seoKeyword: "brand positioning"`, `secondaryKeywords: [...]`, `metaDescription`, `internalLinks`. Plus tone via Strategy chips.

**Prompt-effect zonder tweaks**: AI weet structuur-archetype + keywords. Genereert "Brand Positioning: A Comprehensive Guide" met 5 H2's afgeleid van keyword-cluster — 100% generiek SEO-blog.

**Met voorgestelde toevoegingen** (`uniqueAngle: "Most positioning frameworks fail because they treat positioning as a marketing exercise rather than an operational decision"`, `evidencePieces: ["Reichheld customer churn data", "Patagonia case fragment", "anekdote: B2B SaaS positioning failure"]`, `counterClaim: "Positioning isn't a creative exercise — it's a constraint engineering problem"`):

AI krijgt **stelling** + **bewijslast** + **anti-claim**. H1 verschuift van descriptive naar argumentative. Body krijgt expliciete evidence-anchors, niet self-generated voorbeelden.

**Verschil**: AI gaat van "definieer term + lijst best practices" naar "verdedig contrarian claim met 3 named bewijsstukken". **Sterke hypothese-bevestiging.**

### 3.3 TikTok-script

**Huidige inputs**: `footageType`, `textOverlay`, `colorGrade`, `videoDuration: 30`, `trendReference: "POV format"`. Tone via Strategy.

**Prompt-effect zonder tweaks**: AI weet productie-stijl maar geen narratief skelet. Genereert 3 scenes "Hook → Body → CTA" met generic phrasing.

**Met voorgestelde toevoegingen** (`hookFormat: "pattern-interrupt"`, `sceneCount: 4`, `payoffStyle: "reveal"`):

`hookFormat: pattern-interrupt` instrueert AI om scene 1 te schrijven als een verrassende vorm-breuk (bv. "Ik ga iets zeggen wat mijn agent niet leuk vindt") i.p.v. "Did you know…". `payoffStyle: reveal` dwingt scene 4 als plot-onthulling i.p.v. CTA-statement.

**Verschil**: van 3-act-template naar 4-scene-narratief met specifieke mechanieken. **Sterke hypothese-bevestiging**, maar afhankelijk van AI-prompt-engineering om hookFormat-waardes te interpreteren — flag voor implementatie.

### Conclusie hypothese

**Sterk** voor 3 archetypen:
- Conversion-content (sales-email, ads, social-posts) — payoff/objection/urgency-inputs zijn direct prompt-impactful
- Long-form authority (blog, thought-leadership, whitepaper) — angle/evidence/counterclaim verschuiven van descriptive naar argumentative
- Video/TikTok-scripts — hook+payoff zijn scharnierpunten, narratief skelet vs. productie-stijl

**Wisselvallig** voor:
- Types die al rijk zijn (case-study, proposal, linkedin-event) — bottleneck zit eerder in tone/voice/persona-context dan input-dekking. Voor deze types is "meer inputs" niet de fix; voice-versterking of UI-clutter-vermindering is plausibeler.
- Skeleton-types (carousel, podcast-outline) — input-toevoeging is echt skeleton-specificering, helpt structuur maar niet noodzakelijk woordkeuze.

**Open issue**: voor 5 types (case-study / proposal-template / linkedin-event / impact-report / employer-brand-video) is hypothese onvoldoende sterk om alleen input-toevoegingen te rechtvaardigen. Aanbeveling: deze types **niet** in eerste bouw-batch; observeer na implementatie van de andere of generieke-output-klacht overblijft. Indien ja → separate voice/prompt-engineering-task.

---

## 4 · Bouw-task voorstellen

### Cluster-strategie

Niet per testplan-categorie (10), niet per type (53), maar per **archetype-failure-mode** (3). Reden: types delen failure-mode binnen archetype, niet binnen testplan-categorie. Voorbeeld: blog-post + thought-leadership + whitepaper falen op hetzelfde (geen unique-angle) maar zitten allemaal in long-form. Maar TikTok-script + LinkedIn-video + promo-video falen ook op missende hook-input — die zitten in social + video + ad-categorie. Failure-mode is de juiste as.

### Bouw-task 1 — `canvas-tweaks-conversion-shortform`
**Scope**: short-form / conversion content. Toevoegen van hook + payoff + objection + urgency + proof-point inputs aan: alle social posts (linkedin-post, instagram-post, twitter-thread, facebook-post), alle ads (search-ad, social-ad, display-ad, retargeting-ad, video-ad, native-ad, linkedin-ad), promotional-email + re-engagement-email.
**Effort**: 2-3 dagen
**Files**: `src/features/campaigns/lib/content-type-inputs.ts` (nieuwe field-builders + bundle), `canvas-orchestrator.ts` (prompt-interpolatie), evt. UI-grouping in ContextPanel.
**Smoke**: regenerate 3 types met + zonder inputs, vergelijk hooks. Zie task-file.

### Bouw-task 2 — `canvas-tweaks-longform-authority`
**Scope**: long-form / narrative authority. Toevoegen van unique-angle + evidence-pieces + counterclaim aan: blog-post, pillar-page, article, thought-leadership, whitepaper, linkedin-article. Plus narrative-arc/why-now aan: case-study, press-release, media-pitch.
**Effort**: 2 dagen
**Files**: zelfde set als bouw-task 1.
**Smoke**: regenerate blog-post + thought-leadership, controleer of H1 contrarian wordt.

### Bouw-task 3 — `canvas-tweaks-structured-skeleton`
**Scope**: structured / multi-section content. Toevoegen van skeleton-inputs (slide-titles / section-skeleton / agenda-skeleton / chapter-titles) aan: linkedin-carousel, social-carousel, ebook, sales-deck, landing-page, product-page, microsite, webinar-outline, podcast-outline, comparison-page. Plus naked-type fixes voor instagram-post, microsite, newsletter (email-bundle wiring).
**Effort**: 2 dagen
**Files**: zelfde set + ContextPanel UI om tag-input voor skeletons mooi te tonen.
**Smoke**: regenerate carousel + landing-page met skeleton-input, controleer of slides/secties matchen.

### Bewust uit scope (voor follow-up)

- Voice/tone-versterking voor types waar input-toevoeging niet voldoende is (case-study, proposal-template, linkedin-event, impact-report, employer-brand-video). Wachten tot na bouw 1-3 om te beoordelen.
- AI-derivation-uitbreiding: nieuwe velden moeten `aiDerivable` worden waar zinvol; per-task in te schatten.
- UI-clutter-management: ContextPanel kan groeien naar 20+ velden per type. Eventueel collapsible sections of "advanced" toggle. Check binnen bouw-task 1 (eerst zien hoe stevig probleem is).
- Per-content-type previews / flow-divergentie / spec-rewrites — buiten scope deze plan-task.

---

## 5 · Open vragen voor Erik

1. **Tag-fields versus textarea**: voor velden zoals `evidencePieces` en `slideSkeleton` zit ik tussen tags (snel, gestructureerd, AI-prompt-friendly) en textarea (vrijer, organischer). Voorkeur?
2. **AI-derivation prioriteit**: moeten de nieuwe velden meteen `aiDerivable: true` worden zodat Asset Planner ze pre-populeert? Dan duurt elke task ~halve dag langer maar is gebruikerservaring veel beter (user reviewt vs. moet typen). Aanbeveling vanuit mij: ja, in elke bouw-task meenemen.
3. **Volgorde**: ik zou starten met bouw-task 1 (conversion) — meeste types, sterkste hypothese, raakt direct pilot-content (sales-email + linkedin-post zijn typische Better Brands-content). Akkoord?
4. **Voice/tone follow-up**: wil je nu al een placeholder-task aanmaken voor de 5 wisselvallige types ("voice-versterking-niche-types"), of pas na bouw 1-3 als blijkt dat klacht overblijft? Aanbeveling vanuit mij: na, voorkomt dubbel werk.
