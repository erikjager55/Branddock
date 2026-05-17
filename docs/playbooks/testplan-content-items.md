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

### 📚 Long-Form Content (7)

| Type | Asset-patroon | Gedaan | Passed | Bugs | Notes |
|---|---|---|---|---|---|
| **R blog-post** | Hero image met headline overlay | ☐ | ☐ | ☐ | |
| pillar-page | Hero + section illustraties | ☐ | ☐ | ☐ | |
| whitepaper | Cover + page headers (PDF) | ☐ | ☐ | ☐ | |
| case-study | Cover + stats visualisatie | ☐ | ☐ | ☐ | |
| ebook | Cover + chapter dividers | ☐ | ☐ | ☐ | |
| article | Hero image | ☐ | ☐ | ☐ | |
| thought-leadership | Hero met quote overlay | ☐ | ☐ | ☐ | |

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
| **R linkedin-post** | Inline image met text overlay | ☐ | ☐ | ☐ | |
| linkedin-article | Hero image | ☐ | ☐ | ☐ | |
| linkedin-carousel | 5-10 slide set (gedesigned) | ☐ | ☐ | ☐ | |
| linkedin-ad | Ad creative met CTA | ☐ | ☐ | ☐ | |
| linkedin-newsletter | Header + hero | ☐ | ☐ | ☐ | |
| linkedin-video | Thumbnail + script storyboard | ☐ | ☐ | ☐ | |
| linkedin-event | Event banner | ☐ | ☐ | ☐ | |
| linkedin-poll | Geen asset (text-only) | ☐ | ☐ | ☐ | |
| instagram-post | Square image met caption styling | ☐ | ☐ | ☐ | |
| twitter-thread | Optionele image per tweet | ☐ | ☐ | ☐ | |
| facebook-post | Inline image | ☐ | ☐ | ☐ | |
| tiktok-script | Storyboard frames | ☐ | ☐ | ☐ | |
| social-carousel | Multi-slide gedesigned | ☐ | ☐ | ☐ | |

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
| **R search-ad** | Geen asset (text-only) | ☐ | ☐ | ☐ | |
| social-ad | Ad creative met headline | ☐ | ☐ | ☐ | |
| display-ad | Banner (meerdere sizes) | ☐ | ☐ | ☐ | |
| retargeting-ad | Ad creative met context-cue | ☐ | ☐ | ☐ | |
| video-ad | Thumbnail + storyboard | ☐ | ☐ | ☐ | |
| native-ad | In-feed image + headline | ☐ | ☐ | ☐ | |

**Category-specific checks**
- Headlines + descriptions binnen character limits (Google Ads: 30/90)
- Meerdere varianten per headline/description als type dat vereist
- CTA scherp en specifiek (geen vage urgentie)
- Retargeting: expliciete verwijzing naar eerder bezoek/actie

---

### 📧 Email & Automation (5)

| Type | Asset-patroon | Gedaan | Passed | Bugs | Notes |
|---|---|---|---|---|---|
| **R newsletter** | Hero banner + section dividers (HTML) | ☐ | ☐ | ☐ | |
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
| **R landing-page** | Volledige page layout (HTML) | ☐ | ☐ | ☐ | |
| product-page | Product hero + feature sections | ☐ | ☐ | ☐ | |
| faq-page | Layout zonder beelden (HTML) | ☐ | ☐ | ☐ | |
| comparison-page | Comparison table layout | ☐ | ☐ | ☐ | |
| microsite | Multi-section landing page | ☐ | ☐ | ☐ | |

**Category-specific checks**
- SEO keyword input → pipeline runt → keyword zichtbaar in H1, meta, body
- Hero + benefits + social proof + CTA sectie volgorde
- Comparison-page: table structuur, geen negatieve concurrent-mentions
- WebPageLayout in Canvas: inline-edit per sectie werkt (geen dubbele tekst)

---

### 🎥 Video & Audio (5)

| Type | Asset-patroon | Gedaan | Passed | Bugs | Notes |
|---|---|---|---|---|---|
| **R explainer-video** | Storyboard frames + thumbnail | ☐ | ☐ | ☐ | |
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
| **R one-pager** | 1-page PDF layout (HTML) | ☐ | ☐ | ☐ | |
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
| **R press-release** | Document layout (HTML/PDF) | ☐ | ☐ | ☐ | |
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

```
[blog-post] [...]
[linkedin-post] [...]
[search-ad] [...]
[newsletter] [...]
[landing-page] [...]
[explainer-video] [...]
[one-pager] [...]
[press-release] [...]
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

| Categorie | Tested | Passed | Bugs | % Passed |
|---|---|---|---|---|
| Long-Form Content | / 7 | / 7 | | % |
| Social Media | / 13 | / 13 | | % |
| Advertising & Paid | / 6 | / 6 | | % |
| Email & Automation | / 5 | / 5 | | % |
| Website & Landing Pages | / 5 | / 5 | | % |
| Video & Audio | / 5 | / 5 | | % |
| Sales Enablement | / 4 | / 4 | | % |
| PR, HR & Comms | / 8 | / 8 | | % |
| **Totaal** | **/ 53** | **/ 53** | | **%** |

## 7 · Follow-up

- [ ] Bugs verwerkt naar issues / PR's
- [ ] `gotchas.md` bijgewerkt met nieuwe lessen
- [ ] Herhaal regressie-rondes op P1/P2 types na fix
- [ ] Update `deliverable-types.ts` docs als constraints niet bleken te kloppen

---

*Laatst bijgewerkt: 2026-04-24 (asset-patronen + generator-evaluatiematrix toegevoegd)*
