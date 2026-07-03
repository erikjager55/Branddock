# Test Plan — Content Items (53 types)

> Afvinkbaar testplan voor alle deliverable types in content mode.
> Doel: grondig, maar snel. Representant per categorie eerst, varianten daarna.
>
> **Tweeledig gebruik**:
> - **Ronde 1** — huidige implementatie verifiëren (text + losse image via huidige providers)
> - **Ronde 2** — na integratie van nieuwe asset-generators (gpt-image-2 / Claude HTML→PNG), per type vastleggen welke generator de beste output levert. Zie sectie 4.5.
>
> Start: __________ · Tester: __________

---

## 0 · Setup (eenmalig, vóór je begint)

- [ ] Dev server draait (`npm run dev`) en DevTools → Network + Console open
- [ ] Test workspace: **Napking** (brand foundation gevuld, `contentLanguage = nl`, naam = `Napking`)
- [ ] `/opt/homebrew/opt/postgresql@17/bin/psql postgresql://erikjager:@localhost:5432/branddock` open in apart tabblad
- [ ] Weet waar je zit: **Create Content** knop op Campaigns overzicht → 5-step wizard (Setup → Knowledge → Strategy → Concept → **Content**) → Canvas
- [ ] Eén persona + één product + één brand asset klaar om als knowledge te selecteren (voorkomt elke keer dezelfde keuze)

## 1 · Standaard flow per type (6 stappen)

1. **Setup** — Content Type kiezen · type-specifieke inputs · briefing (occasion + audience + core message)
2. **Knowledge** — selecteer 1 persona + 1 product + 1 brand asset
3. **Strategy** — genereer rationale · review (bij vertrouwde categorie: snel confirmen)
4. **Concept** — genereer creative concept · review
5. **Content** — 3 varianten genereren · variant A selecteren
6. **Canvas** — medium config bevestigen · inline edit · preview · submit for review · approve · export/publish

## 2 · Wat "Passed" betekent (toepassen op élk type)

**Content-kwaliteit**
- Taal klopt (bij Napking = Nederlands, geen Engelse koppen tussen Nederlandse body)
- Merknaam correct (`Napking` — nergens `napking` of `NAPKING`)
- Koppen in sentence case, niet Title Case
- Geen `[PRICE]`, `TBD`, `€XX`, placeholders
- Concrete CTA, geen vage "binnenkort"
- Geen persona-labels in body-tekst

**Structuur & Constraints**
- Type-specifieke secties aanwezig (bijv. blog: intro + H2's + conclusie + FAQ)
- Woordaantal binnen limieten (quality panel toont dit)
- Hashtag/slide/char-limits gerespecteerd

**UI & Flow**
- Preview toont juiste platform-chrome (LinkedIn / Instagram / email / blog)
- Hero image slot opent Insert Image modal
- Inline edit werkt + persisteert na reload
- Approval flow: DRAFT → APPROVED werkt
- Export levert bestand (TXT/MD/PDF/ZIP afhankelijk van type)
- Geen console errors, geen stille SSE aborts

**Asset-output (Ronde 2 — na generator-integratie)**
- Asset-patroon van sectie 4 aanwezig in output (hero / carousel-slides / layout / etc.)
- Brand kleuren + fonts toegepast conform Brandstyle
- Text in beeld (indien van toepassing) leesbaar + spelling correct + taal klopt
- Geen halucinaties in logo / productnaam binnen beeld
- Compositie: whitespace, hiërarchie, leesbaarheid

## 3 · Regressie-hotspots (extra alert bij deze)

Vanuit recente `gotchas.md` en memories — hier zijn al eerder bugs gevonden, check extra:

- [ ] **SSE abort / stuck pipeline** — wizard hangt op een stap ("Waiting..."), geen progress (2026-04-21)
- [ ] **Silent crash** — witte pagina of React-child errors bij malformed AI output (persona arrays null, object-as-string)
- [ ] **Stale state** — terug-navigatie resets concepten of hooks
- [ ] **React 19 double-invoke** — SSE fetch wordt geabort direct na start (werkte, stopte opeens)
- [ ] **Duplicate tekst** — Edit-sectie + Preview tonen dezelfde tekst (alleen web-page: moet gefixt zijn per sessie 2026-04-21)
- [ ] **Knoplabels per medium** — "Confirm Script & Configure Video" alleen bij echte video-scripts
- [ ] **Merknaam capitalisatie** — `napking` in koppen/CTA → gefixt per sessie 2026-04-21

---

## 4 · Test matrix per categorie

> Legend: **R** = Representant (als eerste testen) · Check-boxes: `[ ] Gedaan` · `[ ] Passed` · `[ ] Bugs` (noteer onderaan)
>
> **⚠️ Asset-pipeline scope (2026-05-18)**: Asset-generator-registry voor multi-asset document-types (Cover + chapter dividers + page headers + stats visualisatie + carousel slide-set) is **post-launch feature**. Tijdens pre-launch Ronde 1 verwacht je voor document-types (ebook / whitepaper / case-study / one-pager / proposal-template / impact-report / linkedin-carousel / social-carousel) **tekst-only output** met optionele hero-image via Step 3 InsertImageModal. De Asset-patroon kolom hieronder beschrijft de **doel-state**, niet de huidige pre-launch state. Markeer een type als `Passed` wanneer tekst-kwaliteit voldoet + hero-image (indien content-type dat heeft) genereert. Volledige scope-analyse in `tasks/_drafts/idea-ebook-quality-verbeterplan.md` H2.

### 📚 Long-Form Content (7)

| Type | Asset-patroon | Gedaan | Passed | Bugs | Notes |
|---|---|---|---|---|---|
| **R blog-post** | Hero image met headline overlay | ☑ | ☑ | ☐ | 2026-05-18 LINFI |
| pillar-page | Hero + section illustraties | ☑ | ☑ | ☐ | 2026-05-18 LINFI |
| whitepaper | Cover + page headers (PDF) | ☑ | ☑ | ☐ | 2026-05-18 LINFI — text-content passed. Asset-patroon "Cover + page headers" = zelfde post-launch gap als ebook (zie testplan §4 asset-pipeline disclaimer). WHITEPAPER_SYSTEM prompt-structureel NIET kwetsbaar voor ebook's H1/H7/H4-H6 (Finding 1/2/3 namen zijn by-design semi-static, structure is uniform — geen progressive-shortening curve). H3 fidelity-runner fix toegepast 2026-05-18 raakt whitepaper Strategy-pillar score ook positief. |
| case-study | Cover + stats visualisatie | ☑ | ☑ | ☐ | 2026-05-18 LINFI |
| ebook | Cover + chapter dividers | ☑ | ☐ | ☑ | 2026-05-18 LINFI — 5 issues; zie bug-log sectie 5 + `tasks/_drafts/idea-ebook-quality-verbeterplan.md` |
| article | Hero image | ☑ | ☑ | ☐ | **✓ PASSED 2026-07-01** (Napking). Pre-emptive prompt-guard 2026-05-19: ARTICLE_SYSTEM 2× Deep-dive H2 sections uniqueness rule + completeness check toegevoegd (medium paraphrase-drift risk, kleinere schaal dan ebook). H7/H4-H6 NIET applicable (journalistic genre, uniforme word-counts, geen lead-magnet). H3 fidelity-fix raakt auto. |
| thought-leadership | Hero met quote overlay | ☑ | ☑ | ☐ | **✓ PASSED 2026-07-01** (Napking). Pre-emptive analyse 2026-05-19: THOUGHT_LEADERSHIP_SYSTEM structureel schoon — 3 H2's zijn by-design distinct narrative-beats, 1000-2000w heeft ruim 16K-call headroom, "The call" is al provocation-CTA. Geen prompt-changes nodig. H3 fidelity-fix raakt auto. |
| linkedin-article | Hero image | ☑ | ☑ | ☐ | **✓ PASSED 2026-07-01** (Napking; let op: leent organic-post-structuur terwijl prompt long-form is — zie §5 structuur-leen). Verplaatst van Social Media naar Long-Form 2026-05-19: prompt is AUTHORITY ARTICLE (1000-2000w long-form structuur), `qualityCriteria: LONG_FORM_DEFAULTS`, input-field categorie `'long-form'`. Erft preventieve guards van article/thought-leadership pad. H3 fidelity-fix raakt auto. |

**Category-specific checks**
- SEO pipeline loopt (8 stappen zichtbaar in progress view)
- Meta tags gegenereerd (title + description)
- FAQ sectie aanwezig bij blog-post / pillar-page
- Internal link markers `[internal link: ...]` aanwezig
- Heading hierarchy correct (H1 → H2 → H3)

---

### 💬 Social Media (13)

| Type | Asset-patroon | Gedaan | Passed | Bugs | Notes |
|---|---|---|---|---|---|
| **R linkedin-post** | Inline image met text overlay | ☑ | ☑ | ☐ | **PASSED 2026-07-01** (Napking) — volledige 6-staps flow; effie-grep op Strategy-step = null. Single text-blob. Anti-pattern #91 verbiedt al hook-repeat. H3 fidelity-fix raakt auto. Step-1-skip-bug bij inheritance gefixt 2026-05-19 (commit 478bae78). |
| ~~linkedin-article~~ | Verplaatst → Long-Form (2026-05-19) | — | — | — | Categorie was inconsistent: prompt is long-form (1000-2000w), maar listing stond bij Social Media. Zie Long-Form sectie. |
| linkedin-carousel | 5-10 slide set (gedesigned) | ☐ | ☐ | ☐ | Pre-emptive paraphrase-guard 2026-05-19: anti-pattern + completeness check tegen duplicate slide-headings (mild risk uit ebook H1 lesson, kleinere schaal — 7-10 slides × 15-30w). H2 asset-pipeline post-launch — slide-designs zijn handmatig in Step 3. |
| linkedin-ad | Ad creative met CTA | ☑ | ☑ | ☐ | **✓ PASSED 2026-07-01** (Napking). Single ad-copy. H3 fidelity-fix raakt auto. |
| linkedin-newsletter | Header + hero | ☐ | ☐ | ☐ | Single text. H3 fidelity-fix raakt auto. |
| linkedin-video | Thumbnail + script storyboard | ☐ | ☐ | ☐ | Hook/Body/CTA beats — by-design distinct. H3 fidelity-fix raakt auto. |
| linkedin-event | Event banner | ☐ | ☐ | ☐ | Single text. H3 fidelity-fix raakt auto. |
| linkedin-poll | Geen asset (text-only) | ☑ | ☑ | ☐ | **✓ PASSED 2026-07-01** (Napking). 2-4 options met explicit "meaningfully different positions" guard (anti-pattern #521 al aanwezig). H3 fidelity-fix raakt auto. |
| instagram-post | Square image met caption styling | ☑ | ☑ | ☐ | **✓ PASSED 2026-07-01** (Napking). Single text-blob. H3 fidelity-fix raakt auto. |
| twitter-thread | Optionele image per tweet | ☑ | ☑ | ☐ | **✓ PASSED 2026-07-01** (Napking). Pre-emptive paraphrase-guard 2026-05-19: anti-pattern + completeness check tegen overlappende numbered-pattern concepten (mild risk uit ebook H1 lesson). H3 fidelity-fix raakt auto. |
| facebook-post | Inline image | ☑ | ☑ | ☐ | **✓ PASSED 2026-07-01** (Napking). Single text-blob. H3 fidelity-fix raakt auto. |
| tiktok-script | Storyboard frames | ☐ | ☐ | ☐ | Hook/Setup/Body/Payoff/CTA — by-design distinct beats. H3 fidelity-fix raakt auto. |
| social-carousel | Multi-slide gedesigned | ☐ | ☐ | ☐ | Pre-emptive paraphrase-guard 2026-05-19: idem als linkedin-carousel. H2 asset-pipeline post-launch. |

**Category-specific checks**
- Character limits per platform gerespecteerd (LinkedIn 3000, X 280, Instagram 2200)
- Hashtags present en relevant (niet `#hashtag1 #hashtag2`)
- Platform chrome rendert juist (LinkedIn header, Instagram avatar, X handle)
- Carousel-types: slide count binnen limiet (LinkedIn 10, Instagram 10)
- TikTok-script: hook/body/cta scene structure (Confirm Script & Configure Video knop)

---

### 💰 Advertising & Paid (6)

| Type | Asset-patroon | Gedaan | Passed | Bugs | Notes |
|---|---|---|---|---|---|
| **R search-ad** | Geen asset (text-only) | ☑ | ☑ | ☐ | **PASSED 2026-07-01** (Napking) — ad-quality-indicator groen, headlines NL, geen "No component template"-crash (seed ok). |
| social-ad | Ad creative met headline | ☑ | ☑ | ☐ | **✓ PASSED 2026-07-01** (Napking; leent linkedin/ad-structuur — zie §5 structuur-leen). |
| display-ad | Banner (meerdere sizes) | ☑ | ☑ | ☐ | **✓ PASSED 2026-07-01** (Napking). |
| retargeting-ad | Ad creative met context-cue | ☐ | ☐ | ☐ | |
| video-ad | Thumbnail + storyboard | ☐ | ☐ | ☐ | |
| native-ad | In-feed image + headline | ☑ | ☑ | ☐ | **✓ PASSED 2026-07-01** (Napking). |
| facebook-ad | Ad creative (Meta) | ☑ | ☑ | ☐ | **✓ PASSED 2026-07-01** (Napking) — ontbrak in deze matrix; toegevoegd. Zichtbaar type, seed `facebook/ad`. |

**Category-specific checks**
- Headlines + descriptions binnen character limits (Google Ads: 30/90)
- Meerdere varianten per headline/description als type dat vereist
- CTA scherp en specifiek (geen vage urgentie)
- Retargeting: expliciete verwijzing naar eerder bezoek/actie

---

### 📧 Email & Automation (5)

| Type | Asset-patroon | Gedaan | Passed | Bugs | Notes |
|---|---|---|---|---|---|
| **R newsletter** | Hero banner + section dividers (HTML) | ☐ | ☐ | ☐ | **HIDDEN 2026-07-01** — `hidden:true` + categorie uit picker (`deliverable-types.ts:691,1115`). SKIP: niet bereikbaar via normale flow. Zie bug-log §5. |
| welcome-sequence | Hero per email + branded footer | ☐ | ☐ | ☐ | |
| promotional-email | Hero + product-cards (HTML) | ☐ | ☐ | ☐ | |
| nurture-sequence | Hero per email | ☐ | ☐ | ☐ | |
| re-engagement-email | Hero met hooking visual | ☐ | ☐ | ☐ | |

**Category-specific checks**
- Subject line aanwezig + onder 60 tekens
- Preheader aanwezig
- Sequences: meerdere emails genereren, nummering/progressie logisch
- Plain-text versie werkt naast HTML (indien beschikbaar)

---

### 🌐 Website & Landing Pages (5)

| Type | Asset-patroon | Gedaan | Passed | Bugs | Notes |
|---|---|---|---|---|---|
| **R landing-page** | Volledige page layout (HTML) | ☑ | ☑ | ☐ | **PASSED 2026-07-01** (Napking) — SEO-flow schoon: geen `[QUOTE:]`/`[internal link:]` brackets in eindoutput (de P1), geen persona-leak. |
| product-page | Product hero + feature sections | ☑ | ☑ | ☐ | **✓ PASSED 2026-07-01** (Napking; leent generieke landing-page-structuur, geen product-hero/feature-grid — zie §5 structuur-leen). |
| faq-page | Layout zonder beelden (HTML) | ☑ | ☑ | ☐ | **✓ PASSED 2026-07-01** (Napking). |
| comparison-page | Comparison table layout | ☑ | ☑ | ☐ | **✓ PASSED 2026-07-01** (Napking). |
| microsite | Multi-section landing page | ☑ | ☑ | ☐ | **✓ PASSED 2026-07-01** (Napking). |

**Category-specific checks**
- SEO keyword input → pipeline runt → keyword zichtbaar in H1, meta, body
- Hero + benefits + social proof + CTA sectie volgorde
- Comparison-page: table structuur, geen negatieve concurrent-mentions
- WebPageLayout in Canvas: inline-edit per sectie werkt (geen dubbele tekst)

---

### 🎥 Video & Audio (5)

| Type | Asset-patroon | Gedaan | Passed | Bugs | Notes |
|---|---|---|---|---|---|
| **R explainer-video** | Storyboard frames + thumbnail | ☐ | ☐ | ☐ | **HIDDEN 2026-07-01** — hele categorie "Video & Audio" bewust uit picker (2026-05-19, `deliverable-types.ts`). SKIP: niet aanmaakbaar via picker. Eerdere PASSED ingetrokken (correctie). Zie bug-log §5. |
| testimonial-video | Thumbnail met quote overlay | ☐ | ☐ | ☐ | |
| promo-video | Thumbnail + scene storyboards | ☐ | ☐ | ☐ | |
| webinar-outline | Title card + agenda visualisatie | ☐ | ☐ | ☐ | |
| podcast-outline | Cover art | ☐ | ☐ | ☐ | |

**Category-specific checks**
- Script opbouw: hook/body/cta scenes herkenbaar
- Knop "Confirm Script & Configure Video" verschijnt (video-script types)
- Scene-timing indicaties (bijv. "0:00-0:05 Hook")
- Webinar/podcast: agenda/outline structuur met tijdblokken

---

### 💼 Sales Enablement (4)

| Type | Asset-patroon | Gedaan | Passed | Bugs | Notes |
|---|---|---|---|---|---|
| **R one-pager** | 1-page PDF layout (HTML) | ☐ | ☐ | ☐ | **HIDDEN 2026-07-01** — hele categorie "Sales Enablement" bewust uit picker (2026-06-16, `deliverable-types.ts`). SKIP: niet aanmaakbaar via picker. Eerdere PASSED ingetrokken (correctie). Zie bug-log §5. |
| sales-deck | Multi-slide deck (HTML/PPTX) | ☐ | ☐ | ☐ | |
| proposal-template | Document layout met placeholders | ☐ | ☐ | ☐ | |
| product-description | Product image + feature grid | ☐ | ☐ | ☐ | |

**Category-specific checks**
- Decks: slide-by-slide structuur, niet één blok
- Proposal: placeholders `[CLIENT NAME]` zijn intentioneel (maar niet `[PRICE]`/`TBD`)
- Product-description: features vs benefits onderscheiden

---

### 📣 PR, HR & Communications (8)

| Type | Asset-patroon | Gedaan | Passed | Bugs | Notes |
|---|---|---|---|---|---|
| **R press-release** | Document layout (HTML/PDF) | ☐ | ☐ | ☐ | **HIDDEN 2026-07-01** — `hidden:true` (`deliverable-types.ts:998`). SKIP: niet in Add-Content-modal. Zie bug-log §5. |
| media-pitch | Geen asset (email/tekst) | ☐ | ☐ | ☐ | |
| internal-comms | Header banner + formatted body | ☐ | ☐ | ☐ | |
| career-page | Page layout met team foto slot | ☐ | ☐ | ☐ | |
| job-ad-copy | Social-size ad creative | ☐ | ☐ | ☐ | |
| employee-story | Portrait hero + quote overlay | ☐ | ☐ | ☐ | |
| employer-brand-video | Thumbnail + storyboard | ☐ | ☐ | ☐ | |
| impact-report | Document cover + data visualisaties | ☐ | ☐ | ☐ | |

**Category-specific checks**
- Press-release: inverted pyramid (belangrijkste bovenaan), boilerplate onderaan, contact-blok
- Job-ad: job title, responsibilities, requirements, locatie, contracttype
- Impact-report: cijfers/metrics concreet (geen "many", "significant")
- Employee-story: story spine structuur, echte quotes (of duidelijke quote-markers)

---

## 4.5 · Asset Generator Evaluatie (Ronde 2 — na integratie)

> **Voorwaarde**: Sprint 1 (gpt-image-2) en/of Sprint 2 (Claude HTML→PNG) is geïntegreerd.
> **Doel**: per content type empirisch vaststellen welke generator de beste output levert, zodat de default-mapping in `canvas-orchestrator.ts` data-gedreven ingevuld wordt i.p.v. op theorie.

### Generator-opties

| ID | Generator | Strong suit | Kosten per output |
|---|---|---|---|
| **A** | Huidig (DALL-E 3 / Imagen / Flux) | Baseline, bestaande stack | ~$0.04-0.19 |
| **B** | gpt-image-2 (via OpenAI / fal.ai) | Text rendering, typografie, logos in beeld | ~$0.21 |
| **C** | Claude HTML→PNG (Opus 4.7 + Puppeteer) | Brand-tokens afdwingen, document layouts, carousels | ~$0.03-0.08 |
| **D** | Recraft V4 Vector | Editable SVG, icons, vector branding | ~$0.04-0.08 |
| **E** | Geen asset nodig | Text-only content types | $0 |

### Evaluatiecriteria per output

Voor elk type × generator: score **1-5** per criterium en een eindoordeel.

- **Brand fidelity** — kleuren, fonts, logo-plaatsing conform Brandstyle
- **Text legibility** — titel/CTA/ondertitel leesbaar, correcte spelling, taal klopt
- **Layout kwaliteit** — compositie, whitespace, hiërarchie
- **Content accuraat** — beeld sluit aan bij de geschreven content
- **Productie-gereed** — kan direct gepubliceerd, of eerst designer/editor nodig

### Matrix per categorie

Elke rij = één content type. Per generator: `[A-E]` markeer best fit + score (bijv. `B: 4.2`).
Eindkolom `Winnaar` = de default-mapping die we in code vastleggen.

#### Long-Form Content

| Type | A Huidig | B gpt-image-2 | C Claude HTML→PNG | D Recraft Vector | E Geen | Winnaar |
|---|---|---|---|---|---|---|
| blog-post | ☐ | ☐ | ☐ | ☐ | ☐ | |
| pillar-page | ☐ | ☐ | ☐ | ☐ | ☐ | |
| whitepaper | ☐ | ☐ | ☐ | ☐ | ☐ | |
| case-study | ☐ | ☐ | ☐ | ☐ | ☐ | |
| ebook | ☐ | ☐ | ☐ | ☐ | ☐ | |
| article | ☐ | ☐ | ☐ | ☐ | ☐ | |
| thought-leadership | ☐ | ☐ | ☐ | ☐ | ☐ | |

#### Social Media

| Type | A | B | C | D | E | Winnaar |
|---|---|---|---|---|---|---|
| linkedin-post | ☐ | ☐ | ☐ | ☐ | ☐ | |
| linkedin-article | ☐ | ☐ | ☐ | ☐ | ☐ | |
| linkedin-carousel | ☐ | ☐ | ☐ | ☐ | ☐ | |
| linkedin-ad | ☐ | ☐ | ☐ | ☐ | ☐ | |
| linkedin-newsletter | ☐ | ☐ | ☐ | ☐ | ☐ | |
| linkedin-video | ☐ | ☐ | ☐ | ☐ | ☐ | |
| linkedin-event | ☐ | ☐ | ☐ | ☐ | ☐ | |
| linkedin-poll | ☐ | ☐ | ☐ | ☐ | ☐ | |
| instagram-post | ☐ | ☐ | ☐ | ☐ | ☐ | |
| twitter-thread | ☐ | ☐ | ☐ | ☐ | ☐ | |
| facebook-post | ☐ | ☐ | ☐ | ☐ | ☐ | |
| tiktok-script | ☐ | ☐ | ☐ | ☐ | ☐ | |
| social-carousel | ☐ | ☐ | ☐ | ☐ | ☐ | |

#### Advertising & Paid

| Type | A | B | C | D | E | Winnaar |
|---|---|---|---|---|---|---|
| search-ad | ☐ | ☐ | ☐ | ☐ | ☐ | |
| social-ad | ☐ | ☐ | ☐ | ☐ | ☐ | |
| display-ad | ☐ | ☐ | ☐ | ☐ | ☐ | |
| retargeting-ad | ☐ | ☐ | ☐ | ☐ | ☐ | |
| video-ad | ☐ | ☐ | ☐ | ☐ | ☐ | |
| native-ad | ☐ | ☐ | ☐ | ☐ | ☐ | |

#### Email & Automation

| Type | A | B | C | D | E | Winnaar |
|---|---|---|---|---|---|---|
| newsletter | ☐ | ☐ | ☐ | ☐ | ☐ | |
| welcome-sequence | ☐ | ☐ | ☐ | ☐ | ☐ | |
| promotional-email | ☐ | ☐ | ☐ | ☐ | ☐ | |
| nurture-sequence | ☐ | ☐ | ☐ | ☐ | ☐ | |
| re-engagement-email | ☐ | ☐ | ☐ | ☐ | ☐ | |

#### Website & Landing Pages

| Type | A | B | C | D | E | Winnaar |
|---|---|---|---|---|---|---|
| landing-page | ☐ | ☐ | ☐ | ☐ | ☐ | |
| product-page | ☐ | ☐ | ☐ | ☐ | ☐ | |
| faq-page | ☐ | ☐ | ☐ | ☐ | ☐ | |
| comparison-page | ☐ | ☐ | ☐ | ☐ | ☐ | |
| microsite | ☐ | ☐ | ☐ | ☐ | ☐ | |

#### Video & Audio

| Type | A | B | C | D | E | Winnaar |
|---|---|---|---|---|---|---|
| explainer-video | ☐ | ☐ | ☐ | ☐ | ☐ | |
| testimonial-video | ☐ | ☐ | ☐ | ☐ | ☐ | |
| promo-video | ☐ | ☐ | ☐ | ☐ | ☐ | |
| webinar-outline | ☐ | ☐ | ☐ | ☐ | ☐ | |
| podcast-outline | ☐ | ☐ | ☐ | ☐ | ☐ | |

#### Sales Enablement

| Type | A | B | C | D | E | Winnaar |
|---|---|---|---|---|---|---|
| one-pager | ☐ | ☐ | ☐ | ☐ | ☐ | |
| sales-deck | ☐ | ☐ | ☐ | ☐ | ☐ | |
| proposal-template | ☐ | ☐ | ☐ | ☐ | ☐ | |
| product-description | ☐ | ☐ | ☐ | ☐ | ☐ | |

#### PR, HR & Communications

| Type | A | B | C | D | E | Winnaar |
|---|---|---|---|---|---|---|
| press-release | ☐ | ☐ | ☐ | ☐ | ☐ | |
| media-pitch | ☐ | ☐ | ☐ | ☐ | ☐ | |
| internal-comms | ☐ | ☐ | ☐ | ☐ | ☐ | |
| career-page | ☐ | ☐ | ☐ | ☐ | ☐ | |
| job-ad-copy | ☐ | ☐ | ☐ | ☐ | ☐ | |
| employee-story | ☐ | ☐ | ☐ | ☐ | ☐ | |
| employer-brand-video | ☐ | ☐ | ☐ | ☐ | ☐ | |
| impact-report | ☐ | ☐ | ☐ | ☐ | ☐ | |

### Outcome

Na de evaluatie-ronde, leg vast in `canvas-orchestrator.ts` of een nieuw `asset-generator-registry.ts`:

```ts
export const ASSET_GENERATOR_BY_TYPE: Record<string, AssetGenerator> = {
  'blog-post': 'gpt-image-2',
  'linkedin-carousel': 'claude-html-png',
  'landing-page': 'claude-html-png',
  'search-ad': 'none',
  // ... per type uit winnaar-kolom
};
```

Dit wordt de default-mapping; user kan in Canvas override per item kiezen.

### Bekende theoretische voorkeur (voorspellingen om tegen te valideren)

Uit onderzoek — te verifiëren in de test-ronde, niet als aanname behandelen:

- **Carousel-types** (LinkedIn, social) → C (Claude HTML→PNG): volledige controle over multi-slide layout + brand tokens
- **Email-types** → C: HTML is native formaat voor email, geen render nodig
- **Landing pages / product pages / microsite** → C: HTML is direct deployable
- **Social posts met text overlay** (LinkedIn/Instagram) → B (gpt-image-2): sterk in typography-in-image
- **Blog hero / article hero** → B: photorealistic beeld met optionele titel
- **Ad creatives** → B of C afhankelijk van brand-strictheid
- **Vector assets** (icons, logos) → D (Recraft)
- **Pure text types** (media-pitch, search-ad, linkedin-poll) → E (geen asset)

---

## 5 · Bug Log

> Format: `[type] [stap] severity: beschrijving → verwachte fix`
> Severities: **P1** = blokkeert · **P2** = content onbruikbaar · **P3** = UX-nit

### Round 1 — Representanten

**Pre-flight audit 2026-07-01** — code-niveau, vóór de handmatige sweep (Napking-workspace). 3 parallelle prompt-path audits + 2 DB-geverifieerde precondities. Doel: shared-pipeline-bugs voorspellen + false-positives voorkomen, zodat de sweep sneller loopt.

**Precondities (geverifieerd groen):**
- Napking `Workspace.contentLanguage = nl` + `BrandVoiceguide.contentLocale = nl-NL` → de NL taal-directive wórdt geïnjecteerd (`brand-voice-directive.ts:132-150`). Wholesale-Engelse output uitgesloten; rest-risico = Engelse sectielabels/few-shot-bleed (P2).
- `google/search-ad` MediumEnrichment-rij is geseed → search-ad crasht niet met "No component template resolved" (heeft geen fallback-template).

**Bereikbaarheid — 4 van 8 representanten GEBLOKKEERD (bewuste hiding, beslissing: SKIP + loggen):** 4 hele categorieën zijn bewust uit de Add-Content-picker gehaald (Email & Automation 2026-06-16, Video & Audio 2026-05-19, Sales Enablement 2026-06-16, PR/HR/Comms 2026-06-16 — zie comment-blok `deliverable-types.ts:~1115-1132`). Van de 8 representanten vallen er 4 in die categorieën:
- `[newsletter]` (Email) — `hidden:true` (`deliverable-types.ts:691`) + categorie uit picker. SKIP.
- `[press-release]` (PR/HR) — `hidden:true` (`:998`). SKIP.
- `[explainer-video]` (Video & Audio) — `hidden:true`; hele categorie uit picker (2026-05-19). SKIP. **Correctie 2026-07-01**: eerder abusievelijk als PASSED gelogd — type is niet via de picker bereikbaar; per user niet echt getest.
- `[one-pager]` (Sales Enablement) — `hidden:true`; hele categorie uit picker (2026-06-16). SKIP. **Correctie 2026-07-01** (zelfde reden).

**Sweep-scope Ronde 1 representanten = 4 zichtbare types:** search-ad · landing-page · linkedin-post · blog-post.

**Realiteit picker-scope (2026-07-01):** van de 55 code-type-definities zijn er **31 hidden**; slechts **24 zichtbaar** in 4 categorieën (Long-Form 8, Social Media 5, Advertising & Paid 6, Website 5). De 53-type-matrix in §4 is grotendeels achterhaald. De echte **Ronde 1 varianten-scope = de resterende ~16 zichtbare types** (buiten de al-geteste representanten + de Long-Form-sweep).

**Varianten reachability — hard-geverifieerd 2026-07-01** (via `CONTENT_TYPE_TO_MEDIUM` `canvas-context.ts:260` × geseede `MediumEnrichment`-rijen × `FALLBACK_BY_CONTENT_TYPE`): **alle 16 zichtbare varianten resolven** → geen "No component template resolved" hard-throw te verwachten. Wél 3 structuur-leen-gevallen (content-kwaliteit-watch, geen crash):
- `product-page` → `web/landing-page` medium zónder eigen fallback → genereert met de **generieke landing-page-structuur** (geen product-hero/feature-grid groups).
- `social-ad` → leent `linkedin/ad`-structuur (heet nochtans "Meta/LinkedIn/TikTok").
- `linkedin-article` → leent `linkedin/organic-post` (zelfde als linkedin-post) terwijl de prompt long-form AUTHORITY ARTICLE is → mogelijke structuur-mismatch.
- faq-page/comparison-page/microsite krijgen wél type-specifieke groups via `FALLBACK_FIRST_TYPES` → schoon.

**Per-type watch-list — te verifiëren tijdens sweep:**
- `[search-ad]` — (P2) char-limits 30/90 worden NIET afgedwongen, alleen gesignaleerd → check dat de ad-quality-indicator groen is. (P2) Engelse Title-Case headlines uit few-shot; taal-check slaat velden <30 chars over → lees elke headline. NIET-FLAG: SERP-preview toont bewust `napking.com` lowercase (chrome).
- `[landing-page]` — (P1) SEO-keyword-pad laat `[QUOTE:]`/`[CASE STUDY:]`/`[internal link:]` markers staan (cleanup carve-out `seo-prompts.ts:355`) → **grootste eyeball**. (P2) persona-leak op SEO-pad (guardrail ontbreekt in seo-prompts). (P2) hardcoded Engelse CTA-knoppen in `WebPageLayout.renderCta`. (P2) 8-staps SEO-pijplijn (tot 300s/32K per stap) kan mid-run hangen → lege output. NIET-FLAG: edit/preview duplicate-tekst is gefixt (m.u.v. magazine pull-quote + title+body-H1-overlap).
- `[explainer-video]` **(HIDDEN — niet getest, audit-referentie)** — (P2) output = sectie-outline met timestamps/`[VISUAL]`/`(VOICEOVER)`, GEEN hook/body/cta scene-cards. (P2) export: geen SRT (nergens geïmplementeerd), geen PDF (platform≠web) → alleen Copy/MD/HTML. NIET-FLAG: knop toont "Confirm & Continue" (niet "Configure Video") = correct; flip = regressie.
- `[one-pager]` **(HIDDEN — niet getest, audit-referentie)** — (P2) output = markdown-bullets, geen HTML/PDF one-pager; geen PDF-knop (platform sales≠web). (P2) SOLUTION moet outcomes lezen, geen feature-dump. Structureel schoon: placeholder-prijzen (triple-guarded), merknaam, CTA (48-char cap).
- `[linkedin-post]` — flow niet eerder afgerond. Effie-fix runtime-verify: Strategy-step console `document.body.innerText.match(/effie/gi)` → moet `null`. Volledige 6-staps flow doorlopen.
- `[blog-post]` — PASSED 2026-05-18 op LINFI-workspace. Napking-hertest optioneel voor NL-baseline + effie DOM-grep.

**Cross-cutting (alle types):** SSE-abort stopt de server-generatie NIET (geen `request.signal`-listener) → weg-navigeren mid-run kan stuck spinner / stale-of-lege state / race met tweede generate geven. Preview-chrome is vaak hardcoded Engels (email "Hi {{firstName}}", generic-preview labels "DATELINE LEAD") → chrome ≠ content, niet flaggen.

**Sweep-resultaten** (invullen tijdens handmatig testen — format `[type] [stap] severity: beschrijving → verwachte fix`):

```
[search-ad] PASSED 2026-07-01 (Napking) — ad-quality-indicator groen, headlines NL, geen crash (seed ok)
[landing-page] PASSED 2026-07-01 (Napking) — SEO-flow schoon: geen [QUOTE:]/[internal link:] brackets in eindoutput, geen persona-leak
[explainer-video] SKIPPED — hidden (categorie Video & Audio bewust uit picker; eerdere PASSED ingetrokken)
[one-pager] SKIPPED — hidden (categorie Sales Enablement bewust uit picker; eerdere PASSED ingetrokken)
[linkedin-post] PASSED 2026-07-01 (Napking) — volledige 6-staps flow, effie-grep op Strategy = null
[blog-post] PASSED 2026-07-01 (Napking) — herbevestigd (eerder LINFI 2026-05-18)
[newsletter] SKIPPED — hidden (zie boven)
[press-release] SKIPPED — hidden (zie boven)
```

### Round 1 — Varianten sweep (2026-07-01)

> Napking-workspace. Alle 16 zichtbare varianten (buiten de 4 al-geteste representanten + de Long-Form-sweep). Reachability vooraf hard-geverifieerd (16/16 resolven). **Resultaat: 16/16 PASSED, 0 bugs.**

```
[Long-Form]   article, thought-leadership, linkedin-article — PASSED
[Social]      linkedin-poll, instagram-post, twitter-thread, facebook-post — PASSED
[Advertising] linkedin-ad, facebook-ad, social-ad, display-ad, native-ad — PASSED
[Website]     product-page, faq-page, comparison-page, microsite — PASSED
[structuur-leen — content-kwaliteit-nit, geen blocker, post-launch]:
  product-page → generieke landing-page-structuur (geen product-hero/feature-grid)
  social-ad → linkedin/ad-structuur
  linkedin-article → linkedin/organic-post-structuur terwijl prompt long-form is
```

### Round 1 — Long-Form categorie-sweep (2026-05-18)

> Workspace: LINFI (architect-audience, luxury interior brand "voorluiken")
> Status: 4/7 types getest en passed; e-book toont issues — verbeterplan apart.

```
[blog-post] PASSED 2026-05-18 — alle stappen door, content + asset patronen ok
[case-study] PASSED 2026-05-18 — alle stappen door
[whitepaper] PASSED 2026-05-18 — alle stappen door
[pillar-page] PASSED 2026-05-18 — alle stappen door
[ebook] FAIL 2026-05-18 — 5 issues op één output (composite 85, Strategy-pillar 73). Volledige diagnose + scope in `tasks/_drafts/idea-ebook-quality-verbeterplan.md`. Samenvatting:
  - H1 P2: chapter-titel duplicate (H4 "Van meting tot montage" + H6 "Van netting tot montage") — root cause `src/lib/studio/prompt-templates/long-form.ts:255-312` EBOOK_SYSTEM mist uniqueness-constraint
  - H2 NIET-bug-maar-feature-gap: asset-patroon "Cover + chapter dividers (PDF)" never built — `canvas-orchestrator.ts:1110-1119` auto-image-gen gedisabled + geen ebook entry in `preview-map.ts`. Aanbeveling: testplan-verwachting bijstellen naar text-only pre-launch
  - H3 P2: Strategy-pillar 73 (=judge pillar 45% weight). Root cause persona-context cap 240 chars in `fidelity-runner.ts:169-178` + strategy-summary fallback returns undefined wanneer brief/concept leeg (content-mode)
  - H4-H6 P3 cluster: rigide 8-hoofdstukken structuur, geen TOC, geen "Key Takeaway" callouts, geen narrative bridges, geen lead-magnet CTA-block — EBOOK_SYSTEM prompt mist sub-sprint 5B/6A upgrades
  - H7 P2: chapter-length asymmetry. Hoofdstuk 1 te lang, daarna progressief korter. Root cause single 16K-token call + prompt-instructie "chapters get SHORTER after chapter 3" zonder hard min/max — front-loading + greedy token-allocatie
  - Pre-launch fix-bundle: ~2-2.5d totaal (H1 + H7-A + H3.1 + H3.2 + H4-H6 + H2-A docs). Post-launch backlog: ~8-19d (H2-B/C feature + H3.3 per-type rubric + H7-B multi-call chain)
  - Effie-fix verifieerbaar in deze content? Niet expliciet door tester gecheckt — DOM grep `document.body.innerText.match(/effie/gi)` bij re-test toevoegen
[article] [...]
[thought-leadership] [...]
```

### Round 1 — Social Media categorie-sweep (parallel-run gestart 2026-05-13)

> Tester: sessie 2 incognito · Workspace: Napking · Campaign: aparte instance naast Long-Form
> Vul severity + beschrijving in zodra bug verschijnt. Prefix `[shared]` als dezelfde bug ook in Long-Form sessie 1 optreedt.

```
[linkedin-post] [Strategy] P2 [shared-pipeline] — FIXED 2026-05-17: Content-strategy-rationale bevat letterlijk "effie-waardig" als kwaliteits-claim → leak vanuit campaign-strategy `effieRationale` veld (bewust intern bedoeld als Effie Award rubric in `src/lib/campaigns/strategy-blueprint.types.ts:643,1268,1751` + prompt-templates `src/lib/ai/prompts/campaign-strategy.ts:267,276,693-714,818`). Bij content-flow strategy-stap wordt campaign-context doorgegeven inclusief effie-jargon, model echo't term letterlijk. Wortel-oorzaak: single-content-mode hergebruikt dezelfde `campaign-strategy.ts` prompts (geen aparte content-wizard prompt) — `selectedContentType` is alleen een parameter. **3-laagse defense-in-depth fix toegepast**:
  - (a) Prompt-guard: `EFFIE TEST` sectie → `STRATEGIC QUALITY TEST` gewrapped in `<internal_rubric purpose="quality-check" surface_in_output="false">`. System-prompt "Effie Award-winning" → "strategically rigorous and creatively distinctive". Output-language-guard regel toegevoegd met expliciete "Never use Effie/effie-waardig" instructie. Mirror in `campaign-strategy-agents.ts` voor critic + creative-critic prompts. Plus angle-context strings `Effie/Cannes potential:` / `Effie potential:` → `Award potential:`.
  - (b) Output-sanitizer: `src/lib/ai/sanitize-strategy-output.ts` met `scrubStrategyLayer()` toegepast op beide productie-sites in `strategy-chain.ts` (regeneration + concept-driven). Scrub-regex met word-boundary om "effectief" / "Jeffie" niet te raken.
  - (c) Smoke-test: `scripts/smoke-tests/sanitize-strategy-output.ts` 24/24 groen.
  - Re-test cross-type bij hervatten Ronde 1: linkedin-post / blog-post / search-ad — verifieer 0 effie-tokens in rationale-veld (visueel + DOM grep `document.body.innerText.match(/effie/gi)` → null).
  - Follow-ups out-of-scope: veldnaam-rename `effieRationale` → `strategicQualityRationale`, studio promo-video Effie-leak (`src/lib/studio/prompt-templates/video-audio.ts:225`), legacy DB rows met onscrub te tekst, **hardcoded UI-labels "Effie Award Rationale" / "Effie Rationale"** in `ConceptReviewView.tsx:69`, `ReviewStep.tsx:230`, `StrategySection.tsx:193-199`, `compile-structured-feedback.ts:18` (pre-existing static strings — apart van LLM-leak; rename samen met veldnaam-follow-up).
[linkedin-article] [...]
[linkedin-carousel] [...]
[linkedin-ad] [...]
[linkedin-newsletter] [...]
[linkedin-video] [...]
[linkedin-event] [...]
[linkedin-poll] [...]
[instagram-post] [...]
[twitter-thread] [...]
[facebook-post] [...]
[tiktok-script] [...]
[social-carousel] [...]
```

### Round 2 — Varianten

```

```

### Categorie-brede issues (raakt hele categorie)

```

```

---

## 6 · Summary na afronding

**Ronde 1 — representanten (bijgewerkt 2026-07-01):** **4/8 passed** via picker (search-ad, landing-page, linkedin-post, blog-post) · **4/8 hidden-skip** (newsletter, press-release, explainer-video, one-pager — hun categorieën zijn bewust uit de picker). **0 bugs.** ⚠️ Realiteit: van de 55 code-types zijn er **31 hidden** — slechts **24 zichtbaar** in 4 categorieën (Long-Form, Social Media, Advertising & Paid, Website). De 53-type-tabel hieronder is grotendeels achterhaald; de echte **Ronde 1 varianten-scope = de ~16 resterende zichtbare types**. Long-Form categorie-sweep (2026-05-18) staat los: 4/5 passed, ebook fail (apart verbeterplan).

> Herkaderd naar picker-realiteit (24 zichtbaar / 31 hidden). Alleen zichtbare types tellen mee voor pre-launch coverage.

| Categorie | Tested | Passed | Bugs | % Passed |
|---|---|---|---|---|
| Long-Form Content | 8 / 8 zichtbaar | 7 | 1 (ebook) | 88% |
| Social Media | 5 / 5 zichtbaar | 5 | 0 | 100% |
| Advertising & Paid | 6 / 6 zichtbaar | 6 | 0 | 100% |
| Website & Landing Pages | 5 / 5 zichtbaar | 5 | 0 | 100% |
| Email & Automation | hidden (uit picker) | — | — | — |
| Video & Audio | hidden (uit picker) | — | — | — |
| Sales Enablement | hidden (uit picker) | — | — | — |
| PR, HR & Comms | hidden (uit picker) | — | — | — |
| **Totaal zichtbaar** | **24 / 24** | **23** | **1** | **96%** |

## 7 · Follow-up

- [ ] Bugs verwerkt naar issues / PR's
- [ ] `gotchas.md` bijgewerkt met nieuwe lessen
- [ ] Herhaal regressie-rondes op P1/P2 types na fix
- [ ] Update `deliverable-types.ts` docs als constraints niet bleken te kloppen

---

*Laatst bijgewerkt: 2026-04-24 (asset-patronen + generator-evaluatiematrix toegevoegd)*
