# Test Plan — Content Items (53 types)

> Afvinkbaar testplan voor alle deliverable types in content mode.
> Doel: grondig, maar snel. Representant per categorie eerst, varianten daarna.
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

| Type | Gedaan | Passed | Bugs | Notes |
|---|---|---|---|---|
| **R blog-post** | ☐ | ☐ | ☐ | |
| pillar-page | ☐ | ☐ | ☐ | |
| whitepaper | ☐ | ☐ | ☐ | |
| case-study | ☐ | ☐ | ☐ | |
| ebook | ☐ | ☐ | ☐ | |
| article | ☐ | ☐ | ☐ | |
| thought-leadership | ☐ | ☐ | ☐ | |

**Category-specific checks**
- SEO pipeline loopt (8 stappen zichtbaar in progress view)
- Meta tags gegenereerd (title + description)
- FAQ sectie aanwezig bij blog-post / pillar-page
- Internal link markers `[internal link: ...]` aanwezig
- Heading hierarchy correct (H1 → H2 → H3)

---

### 💬 Social Media (13)

| Type | Gedaan | Passed | Bugs | Notes |
|---|---|---|---|---|
| **R linkedin-post** | ☐ | ☐ | ☐ | |
| linkedin-article | ☐ | ☐ | ☐ | |
| linkedin-carousel | ☐ | ☐ | ☐ | |
| linkedin-ad | ☐ | ☐ | ☐ | |
| linkedin-newsletter | ☐ | ☐ | ☐ | |
| linkedin-video | ☐ | ☐ | ☐ | |
| linkedin-event | ☐ | ☐ | ☐ | |
| linkedin-poll | ☐ | ☐ | ☐ | |
| instagram-post | ☐ | ☐ | ☐ | |
| twitter-thread | ☐ | ☐ | ☐ | |
| facebook-post | ☐ | ☐ | ☐ | |
| tiktok-script | ☐ | ☐ | ☐ | |
| social-carousel | ☐ | ☐ | ☐ | |

**Category-specific checks**
- Character limits per platform gerespecteerd (LinkedIn 3000, X 280, Instagram 2200)
- Hashtags present en relevant (niet `#hashtag1 #hashtag2`)
- Platform chrome rendert juist (LinkedIn header, Instagram avatar, X handle)
- Carousel-types: slide count binnen limiet (LinkedIn 10, Instagram 10)
- TikTok-script: hook/body/cta scene structure (Confirm Script & Configure Video knop)

---

### 💰 Advertising & Paid (6)

| Type | Gedaan | Passed | Bugs | Notes |
|---|---|---|---|---|
| **R search-ad** | ☐ | ☐ | ☐ | |
| social-ad | ☐ | ☐ | ☐ | |
| display-ad | ☐ | ☐ | ☐ | |
| retargeting-ad | ☐ | ☐ | ☐ | |
| video-ad | ☐ | ☐ | ☐ | |
| native-ad | ☐ | ☐ | ☐ | |

**Category-specific checks**
- Headlines + descriptions binnen character limits (Google Ads: 30/90)
- Meerdere varianten per headline/description als type dat vereist
- CTA scherp en specifiek (geen vage urgentie)
- Retargeting: expliciete verwijzing naar eerder bezoek/actie

---

### 📧 Email & Automation (5)

| Type | Gedaan | Passed | Bugs | Notes |
|---|---|---|---|---|
| **R newsletter** | ☐ | ☐ | ☐ | |
| welcome-sequence | ☐ | ☐ | ☐ | |
| promotional-email | ☐ | ☐ | ☐ | |
| nurture-sequence | ☐ | ☐ | ☐ | |
| re-engagement-email | ☐ | ☐ | ☐ | |

**Category-specific checks**
- Subject line aanwezig + onder 60 tekens
- Preheader aanwezig
- Sequences: meerdere emails genereren, nummering/progressie logisch
- Plain-text versie werkt naast HTML (indien beschikbaar)

---

### 🌐 Website & Landing Pages (5)

| Type | Gedaan | Passed | Bugs | Notes |
|---|---|---|---|---|
| **R landing-page** | ☐ | ☐ | ☐ | |
| product-page | ☐ | ☐ | ☐ | |
| faq-page | ☐ | ☐ | ☐ | |
| comparison-page | ☐ | ☐ | ☐ | |
| microsite | ☐ | ☐ | ☐ | |

**Category-specific checks**
- SEO keyword input → pipeline runt → keyword zichtbaar in H1, meta, body
- Hero + benefits + social proof + CTA sectie volgorde
- Comparison-page: table structuur, geen negatieve concurrent-mentions
- WebPageLayout in Canvas: inline-edit per sectie werkt (geen dubbele tekst)

---

### 🎥 Video & Audio (5)

| Type | Gedaan | Passed | Bugs | Notes |
|---|---|---|---|---|
| **R explainer-video** | ☐ | ☐ | ☐ | |
| testimonial-video | ☐ | ☐ | ☐ | |
| promo-video | ☐ | ☐ | ☐ | |
| webinar-outline | ☐ | ☐ | ☐ | |
| podcast-outline | ☐ | ☐ | ☐ | |

**Category-specific checks**
- Script opbouw: hook/body/cta scenes herkenbaar
- Knop "Confirm Script & Configure Video" verschijnt (video-script types)
- Scene-timing indicaties (bijv. "0:00-0:05 Hook")
- Webinar/podcast: agenda/outline structuur met tijdblokken

---

### 💼 Sales Enablement (4)

| Type | Gedaan | Passed | Bugs | Notes |
|---|---|---|---|---|
| **R one-pager** | ☐ | ☐ | ☐ | |
| sales-deck | ☐ | ☐ | ☐ | |
| proposal-template | ☐ | ☐ | ☐ | |
| product-description | ☐ | ☐ | ☐ | |

**Category-specific checks**
- Decks: slide-by-slide structuur, niet één blok
- Proposal: placeholders `[CLIENT NAME]` zijn intentioneel (maar niet `[PRICE]`/`TBD`)
- Product-description: features vs benefits onderscheiden

---

### 📣 PR, HR & Communications (8)

| Type | Gedaan | Passed | Bugs | Notes |
|---|---|---|---|---|
| **R press-release** | ☐ | ☐ | ☐ | |
| media-pitch | ☐ | ☐ | ☐ | |
| internal-comms | ☐ | ☐ | ☐ | |
| career-page | ☐ | ☐ | ☐ | |
| job-ad-copy | ☐ | ☐ | ☐ | |
| employee-story | ☐ | ☐ | ☐ | |
| employer-brand-video | ☐ | ☐ | ☐ | |
| impact-report | ☐ | ☐ | ☐ | |

**Category-specific checks**
- Press-release: inverted pyramid (belangrijkste bovenaan), boilerplate onderaan, contact-blok
- Job-ad: job title, responsibilities, requirements, locatie, contracttype
- Impact-report: cijfers/metrics concreet (geen "many", "significant")
- Employee-story: story spine structuur, echte quotes (of duidelijke quote-markers)

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

*Laatst bijgewerkt: 2026-04-21*
