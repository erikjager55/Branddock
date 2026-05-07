# Implementatieplan: Studio Overhaul & Deliverable Productie

> **Fase**: Studio Overhaul (S7)
> **Geschatte doorlooptijd**: 8-10 prompt-sessies
> **Afhankelijkheden**: S6 (Campaigns) voltooid
> **Doel**: De Content Studio transformeren van stubs/placeholders naar een volledig werkende AI-gedreven content productie-engine

---

## Huidige Staat (Audit)

| Component | Status | Probleem |
|-----------|--------|----------|
| Studio Layout (3-kolom) | Volledig | Werkt goed |
| TextEditor | Placeholder | Gebruikt deprecated `document.execCommand()`, geen echte rich text editor |
| AI Content Generatie | Stub | Retourneert hardcoded Lorem Ipsum, geen echte AI-calls |
| Quality Scoring | Stub | Retourneert altijd 75, geen scoring-algoritme |
| Improve Suggestions | Stub | Leest alleen pre-seeded DB records, geen AI-analyse |
| Export | Stub | Retourneert fake CDN URL, geen echte file-generatie |
| Image Generatie | Geen | Alleen picsum.photos placeholders |
| Video Generatie | Geen | Retourneert lege string |
| Carousel Editor | Deels | Navigatie werkt, geen image upload/templates |
| Deliverable Types Registry | Volledig | 43 types, 8 categorien, maar zonder type-specifieke instellingen |

---

## Overzicht: 8 Stappen

| Stap | Naam | Focus | Prompt |
|------|------|-------|--------|
| S7.1 | Rich Text Editor | TipTap integratie + toolbar | 1 |
| S7.2 | AI Generation Engine | Echte content generatie per type | 1-2 |
| S7.3 | Quality & Improve | Scoring-algoritme + AI suggestions | 1 |
| S7.4 | Long-Form Deliverables | Blog, Whitepaper, Case Study, etc. | 1 |
| S7.5 | Social & Advertising | LinkedIn, Instagram, Ads, etc. | 1 |
| S7.6 | Email, Website & Sales | Newsletters, Landing Pages, Sales Decks | 1 |
| S7.7 | Visual Deliverables | Image generatie, Carousel, Video briefs | 1 |
| S7.8 | Export & Polish | PDF/DOCX export, preview, UX polish | 1 |

---

## Stap S7.1 — Rich Text Editor (TipTap)

### Waarom
De huidige TextEditor gebruikt `document.execCommand()` (deprecated) en `dangerouslySetInnerHTML` (onveilig). Dit is de kern van de studio en moet robuust zijn.

### Aanpak
**Bibliotheek**: [TipTap](https://tiptap.dev) (gebouwd op ProseMirror)
- Headless, volledig customizable met Tailwind
- Extensions voor alles wat we nodig hebben
- Uitstekende TypeScript support
- Gratis open-source core

### Te Bouwen

**1. TipTap Editor Component** (`src/features/campaigns/components/studio/canvas/TipTapEditor.tsx`)
```
Dependencies: @tiptap/react, @tiptap/starter-kit, @tiptap/extension-*
```

Extensions:
- `StarterKit` (bold, italic, headings, lists, blockquote, code)
- `Underline` — onderstrepen
- `Link` — hyperlinks met URL-invoer
- `TextAlign` — links/midden/rechts/uitvullen
- `Placeholder` — "Start typing or generate content..."
- `CharacterCount` — woordenteller voor deliverable-limieten
- `Typography` — smart quotes, em-dashes
- `Color` / `Highlight` — tekst- en markeerkleur (brand colors)

**2. Editor Toolbar** (`StudioToolbar.tsx`)
- Formatting: Bold, Italic, Underline, Strikethrough
- Headings: H1, H2, H3
- Lists: Bullet, Numbered, Checklist
- Alignment: Left, Center, Right
- Insert: Link, Horizontal Rule, Block Quote
- Undo/Redo
- Word count + character count display

**3. Content Sync**
- TipTap `onUpdate` → debounced Zustand store update
- HTML output opslaan in `generatedText` veld
- JSON document structuur opslaan in `settings.editorDoc` voor lossless round-trips
- Auto-save integratie behouden (5s debounce)

**4. Verwijderen**
- Oude `TextEditor.tsx` verwijderen
- `document.execCommand` calls verwijderen
- `dangerouslySetInnerHTML` rendering vervangen

### Database Impact
- Geen schema-wijzigingen nodig (`generatedText` blijft String, `settings` blijft Json)

---

## Stap S7.2 — AI Generation Engine

### Waarom
Alle generate endpoints zijn stubs die hardcoded placeholder content retourneren. Dit is de kernwaarde van Branddock.

### Architectuur

**Centrale AI Service** (`src/lib/studio/ai-generation-service.ts`)

```
┌─────────────────────────────────────────────┐
│           AI Generation Service              │
│                                              │
│  ┌─────────────┐  ┌──────────────────────┐  │
│  │ Prompt       │  │ Context Builder      │  │
│  │ Templates    │  │ (brand, persona,     │  │
│  │ (per type)   │  │  product, campaign)  │  │
│  └──────┬──────┘  └──────────┬───────────┘  │
│         │                    │               │
│         ▼                    ▼               │
│  ┌─────────────────────────────────────┐    │
│  │       Prompt Composer               │    │
│  │  template + context + user prompt   │    │
│  └──────────────┬──────────────────────┘    │
│                 │                            │
│                 ▼                            │
│  ┌─────────────────────────────────────┐    │
│  │       AI Provider Router            │    │
│  │  Claude | GPT-4o | Gemini           │    │
│  └──────────────┬──────────────────────┘    │
│                 │                            │
│                 ▼                            │
│  ┌─────────────────────────────────────┐    │
│  │       Output Parser                 │    │
│  │  Structured JSON → Editor content   │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### Te Bouwen

**1. Prompt Template Registry** (`src/lib/studio/prompt-templates/`)
Per deliverable-categorie een template-bestand:
- `long-form.ts` — Blog, Whitepaper, Case Study, E-book, etc.
- `social-media.ts` — LinkedIn, Instagram, X/Twitter, Facebook, TikTok
- `advertising.ts` — Search Ads, Social Ads, Display, Retargeting
- `email.ts` — Newsletter, Welcome Sequence, Nurture, etc.
- `website.ts` — Landing Page, Product Page, FAQ, Comparison
- `video-audio.ts` — Scripts, outlines, briefs
- `sales.ts` — Sales Deck, One-Pager, Proposal, Product Description
- `pr-hr.ts` — Press Release, Media Pitch, Job Ad, etc.

Elke template bevat:
- `systemPrompt` — rol + output formaat
- `contextTemplate` — hoe brand/persona/product context in te voegen
- `outputSchema` — Zod schema voor gestructureerde output
- `defaultSettings` — standaard tone, length, format per type

**2. Context Builder** (`src/lib/studio/context-builder.ts`)
Bouwt rijke context op uit:
- **Brand Assets**: Brand Purpose, Archetype, Personality, Promise, Values, Voice
- **Target Persona**: Demographics, JTBD, pain points, communication preferences
- **Product**: Features, benefits, USPs, positioning
- **Campaign Strategy**: Doelen, fase (awareness/consideration/conversion), messaging hierarchy
- **Competitor Differentiation**: Key differentiators vs concurrenten

**3. AI Provider Router** (`src/lib/studio/ai-router.ts`)
- Claude (Sonnet 4.5) — default voor tekst, langere content
- GPT-4o — alternatief, goed voor gestructureerde output
- Gemini 3.1 Pro — alternatief, goed voor research-intensieve content
- Provider-specifieke parameters (temperature, max_tokens, etc.)
- Streaming support voor lange content

**4. Output Parser** (`src/lib/studio/output-parser.ts`)
- Zod validatie van AI output
- Conversie naar TipTap-compatible HTML/JSON
- Fallback bij malformed output (retry met striktere prompt)
- Metadata extractie (suggesties voor titel, meta description, tags)

**5. Generate Endpoint Herschrijven** (`/api/studio/[deliverableId]/generate/route.ts`)
- Stub-content vervangen door echte AI-calls
- Streaming response voor real-time content weergave
- Error handling (rate limits, token limits, timeout)
- Cost tracking (tokens used → kosten berekenen per model)

### Type-Specifieke Output Formaten

| Content Type | Output Structuur |
|-------------|-----------------|
| Blog Post | title, metaDescription, sections[{heading, body}], conclusion, cta |
| LinkedIn Post | hookLine, body, hashtags, cta |
| Email | subjectLine, preheader, greeting, body, cta, signature |
| Landing Page | headline, subheadline, heroSection, features[], testimonials[], cta |
| Search Ad | headlines[3], descriptions[2], displayUrl, sitelinks[] |
| Press Release | headline, dateline, leadParagraph, body, boilerplate, contact |
| Sales Deck | slides[{title, bulletPoints[], speakerNotes}] |

---

## Stap S7.3 — Quality Scoring & Improve Suggestions

### Quality Scoring Engine

**Scoring Service** (`src/lib/studio/quality-scoring-service.ts`)

Drie dimensies, elk 0-100:

**1. Brand Alignment Score** (gewicht: 35%)
- Voice consistency: Komt de tone overeen met het brand personality profiel?
- Value alignment: Worden kernwaarden impliciet/expliciet gecommuniceerd?
- Messaging hierarchy: Volgt de content de strategische messaging-lagen?
- Visual/verbal identity: Consistent taalgebruik, terminologie

**2. Engagement Score** (gewicht: 35%)
- Hook strength: Is de opening pakkend? (eerste 2 zinnen analyseren)
- CTA clarity: Is er een duidelijke call-to-action?
- Readability: Flesch-Kincaid / leesbaarheidsscore
- Conversational tone: Actief taalgebruik, directe aanspreekvorm
- Emotional resonance: Sluit aan bij persona pain points/desires

**3. Clarity Score** (gewicht: 30%)
- Structure: Heeft de content logische opbouw (intro, body, conclusie)?
- Conciseness: Geen onnodige herhaling of filler
- Actionability: Kan de lezer direct iets doen na het lezen?
- SEO (waar relevant): Keyword-gebruik, meta description, headings

**Implementatie**:
- AI-gebaseerd (Claude/GPT analyseren de content)
- Gestructureerde output met per-dimensie scores + toelichting
- Caching: Score wordt opgeslagen in DB, herberekend bij content-wijziging
- Visual: Bestaande gauge component behouden, kleuren bijwerken

### Improve Suggestions Engine

**Suggestions Service** (`src/lib/studio/improve-suggestions-service.ts`)

Workflow:
1. Huidige content + quality scores analyseren
2. Zwakste dimensie identificeren (bijv. engagement = 58)
3. AI genereert 4-5 concrete, toepasbare suggesties
4. Per suggestie: originele tekst, voorgestelde vervanging, reden, geschatte score-impact

**Suggestie Types**:
- `REWRITE` — Herschrijf een specifieke passage
- `ADD` — Voeg een element toe (CTA, hook, data point)
- `REMOVE` — Verwijder overtollige content
- `RESTRUCTURE` — Herorden secties voor betere flow
- `TONE_SHIFT` — Pas toon aan (formeler, informeler, urgenter)

**Apply Logic**:
- `REWRITE`: Zoek `originalText` in content, vervang met `suggestedText`
- `ADD`: Voeg `suggestedText` in op aangegeven positie
- `REMOVE`: Verwijder `originalText` uit content
- `RESTRUCTURE`: Herorden secties volgens voorgestelde volgorde
- Na apply: automatisch quality score herberekenen

---

## Stap S7.4 — Long-Form Deliverables (7 types)

### Blog Post
**Settings Panel**:
- Tone selector: Professional / Casual / Authoritative / Friendly
- Length: Short (500w) / Medium (1000w) / Long (2000w) / Custom
- SEO focus keyword (optioneel)
- Include: Intro hook, Subheadings, CTA, Meta description
- Target audience (auto-filled vanuit campaign persona)

**Generation Output**:
```json
{
  "title": "...",
  "metaDescription": "...",
  "sections": [
    { "heading": "Introduction", "body": "..." },
    { "heading": "Section 1", "body": "..." }
  ],
  "conclusion": "...",
  "cta": "...",
  "suggestedTags": ["..."],
  "estimatedReadTime": "5 min"
}
```

**Quality Criteria** (type-specifiek):
- SEO: Keyword in title, H2s, meta description
- Scannability: Subheadings elke 200-300 woorden
- Hook: Eerste alinea trekt aandacht

### Pillar Page
**Verschil met Blog**: Langer (3000-5000w), meer secties, interne links naar cluster-content
**Extra Settings**: Topic cluster keywords, link suggestions
**Output**: Zoals Blog maar met `tableOfContents[]` en `relatedLinks[]`

### Whitepaper
**Settings**: Executive summary toggle, data/research heavy, formal tone default
**Output**: `executiveSummary`, `sections[]` met diepere subsecties, `references[]`, `methodology`
**Quality Extra**: Referenties en data-onderbouwing checken

### Case Study
**Settings**: Client industry, challenge/solution/result framework toggle
**Output**: `clientBackground`, `challenge`, `solution`, `implementation`, `results` (met metrics), `testimonialQuote`, `cta`
**Quality Extra**: Concrete metrics aanwezig? Testimonial?

### E-book
**Settings**: Chapter count (3-10), include illustrations toggle, include checklist/worksheets
**Output**: `chapters[{title, sections[], keyTakeaway}]`, `introduction`, `conclusion`
**Aanpak**: Genereer chapter-voor-chapter (te lang voor single generation)

### Feature Article
**Settings**: Journalistic vs branded, interview quotes toggle
**Output**: Zoals Blog maar met `pullQuotes[]` en meer narratieve structuur

### Thought Leadership
**Settings**: Perspective/opinion toggle, industry trend focus, provocative vs measured
**Output**: `thesis`, `arguments[]`, `counterArguments[]`, `conclusion`, `authorBio`
**Quality Extra**: Originaliteit van standpunt, onderbouwing

---

## Stap S7.5 — Social Media & Advertising (13 types)

### Social Media (7 types)

#### LinkedIn Post
**Settings**: Format (text only / text+image / carousel / poll), length (short/medium), hashtag count
**Output**: `hookLine`, `body` (max 3000 chars), `hashtags[]`, `cta`, `emojiUsage` (conservative)
**Quality**: Hook in eerste 2 regels (voor "see more"), professionele toon

#### LinkedIn Article
**Settings**: Zoals Blog maar LinkedIn-specifiek, professional tone default
**Output**: Blog-format maar met LinkedIn best practices (korte paragrafen, bold statements)

#### Instagram Post
**Settings**: Caption length (short/long), hashtag strategy (niche/broad/mix), emoji density
**Output**: `caption`, `hashtags[]` (max 30), `callToAction`, `suggestedImageDescription`
**Quality**: Visuele beschrijving matcht caption, hashtag relevantie

#### X/Twitter Thread
**Settings**: Thread length (3-15 tweets), include media suggestions, numbering style
**Output**: `tweets[{content (max 280 chars), mediaDescription?}]`, `hookTweet`
**Quality**: Elk tweet < 280 chars, thread cohesie, eerste tweet pakt aandacht

#### Facebook Post
**Settings**: Post type (text/link/event), engagement focus (comments/shares/clicks)
**Output**: `content`, `linkPreview?`, `suggestedImage`, `cta`

#### TikTok/Reels Script
**Settings**: Duration (15s/30s/60s), hook type (question/shock/story), trending audio suggestion
**Output**: `hookScene`, `scenes[{timestamp, visual, voiceover, textOverlay}]`, `endCta`, `suggestedAudio`
**Quality**: Hook in eerste 3 seconden, pacing, CTA

#### Social Carousel
**Settings**: Slide count (5-10), aspect ratio (1:1 / 4:5 / 16:9), platform (LinkedIn/Instagram)
**Output**: `slides[{headline, bodyText, designNotes, slideNumber}]`, `coverSlide`, `ctaSlide`
**Quality**: Consistente flow, elke slide standalone leesbaar, sterke cover + CTA slide

### Advertising (6 types)

#### Search Ad (Google/Bing)
**Settings**: Campaign type, keyword focus, ad extensions toggle
**Output**:
```json
{
  "headlines": ["max 30 chars each", "x3"],
  "descriptions": ["max 90 chars each", "x2"],
  "displayUrl": "brandname.com/path",
  "sitelinks": [{ "text": "...", "url": "..." }],
  "calloutExtensions": ["..."]
}
```
**Quality**: Character limits strict, keyword in headline, clear value prop

#### Social Ad
**Settings**: Platform (Facebook/Instagram/LinkedIn), objective (awareness/traffic/conversion), format
**Output**: `primaryText`, `headline` (40 chars), `description`, `ctaButton`, `targetingNotes`

#### Display Ad
**Settings**: Ad size (banner/leaderboard/skyscraper), style (minimal/bold/branded)
**Output**: `headline`, `bodyText`, `ctaText`, `designBrief` (visuele richting), `sizes[]`

#### Retargeting Ad
**Settings**: Retarget segment (cart abandoners/page visitors/email openers), urgency level
**Output**: `headline`, `body`, `ctaText`, `urgencyElement`, `socialProof`

#### Video Ad Script
**Settings**: Duration (6s/15s/30s), platform, hook type
**Output**: `scenes[{timestamp, visual, voiceover, textOverlay}]`, `endCard`

#### Native Ad
**Settings**: Publication style (editorial/sponsored), topic alignment
**Output**: `headline` (editorial style), `body`, `disclosureText`, `ctaSubtle`

---

## Stap S7.6 — Email, Website & Sales (14 types)

### Email & Automation (5 types)

#### Newsletter
**Settings**: Sections count (3-5), tone, include product spotlight, include CTA
**Output**: `subject`, `preheader`, `greeting`, `sections[{heading, body, ctaLink?}]`, `footer`
**Quality**: Subject line length (40-60 chars), preheader complementeert subject

#### Welcome Sequence
**Settings**: Email count (3-7), drip interval (days), goal progression
**Output**: `emails[{dayOffset, subject, preheader, body, cta, goal}]`
**Quality**: Progressieve value delivery, niet te sales-y in email 1-2

#### Promotional Email
**Settings**: Offer type (discount/launch/event), urgency (low/medium/high)
**Output**: `subject`, `preheader`, `heroSection`, `offerDetails`, `socialProof`, `cta`, `urgencyElement`

#### Nurture Sequence
**Settings**: Sequence length (5-12), funnel stage focus, content mix (educational/case study/offer)
**Output**: `emails[{dayOffset, subject, type, body, cta, segmentTrigger?}]`

#### Re-engagement Email
**Settings**: Inactivity period, win-back offer toggle, survey inclusion
**Output**: `subject` (re-engagement focused), `body`, `incentive?`, `unsubscribeOption`

### Website & Landing Pages (5 types)

#### Landing Page
**Settings**: Goal (lead gen/sales/signup), page length (short/long), include video hero
**Output**:
```json
{
  "headline": "...",
  "subheadline": "...",
  "heroSection": { "text": "...", "ctaButton": "..." },
  "painPoints": ["..."],
  "solution": "...",
  "features": [{ "title": "...", "description": "..." }],
  "socialProof": { "testimonials": [...], "logos": [...] },
  "cta": { "text": "...", "urgency": "..." },
  "faq": [{ "q": "...", "a": "..." }]
}
```
**Quality**: Boven-de-vouw CTA, scanbare secties, social proof aanwezig

#### Product Page
**Settings**: Product (auto-linked), feature highlights count, comparison toggle
**Output**: `productName`, `tagline`, `features[]`, `specifications`, `pricing?`, `comparison?`, `reviews`

#### FAQ Page
**Settings**: Question count (5-20), categorized toggle, search-friendly
**Output**: `categories[{name, questions[{question, answer}]}]`

#### Comparison Page
**Settings**: Competitors to compare, comparison points, bias level (neutral/favorable)
**Output**: `headline`, `comparisonTable`, `narrative`, `verdict`, `cta`

#### Campaign Microsite
**Settings**: Page count (1-5), campaign theme, interactive elements
**Output**: `pages[{title, sections[], navigation}]`, `globalNav`, `footer`

### Sales Enablement (4 types)

#### Sales Deck
**Settings**: Slide count (8-15), presentation style (data-driven/story/demo), include appendix
**Output**: `slides[{title, bulletPoints[], speakerNotes, slideType}]`
**Slide Types**: title, problem, solution, features, case-study, pricing, team, cta, appendix

#### One-Pager / Battle Card
**Settings**: Focus (product/competitive/use-case), two-sided toggle
**Output**: `headline`, `valueProposition`, `keyFeatures[]`, `competitiveAdvantages[]`, `objectionHandlers[]`, `cta`

#### Proposal Template
**Settings**: Formal level, include pricing section, include timeline
**Output**: `coverPage`, `executiveSummary`, `problemStatement`, `proposedSolution`, `deliverables[]`, `timeline`, `pricing`, `terms`

#### Product Description
**Settings**: Length (short 50w / medium 150w / long 300w), channel (website/marketplace/catalog), keywords
**Output**: `title`, `shortDescription`, `longDescription`, `bulletPoints[]`, `specifications`, `seoKeywords[]`

---

## Stap S7.7 — Visual Deliverables & Media (13 types)

### Image Generatie Integratie

**Niet bouwen**: Eigen image generatie pipeline
**Wel bouwen**: AI-gegenereerde image briefs/beschrijvingen

Voor elke deliverable die afbeeldingen nodig heeft:
- AI genereert een gedetailleerde `imageDescription` (wat moet de afbeelding uitbeelden)
- AI genereert een `dallePrompt` (optimized voor DALL-E/Midjourney)
- Gebruiker kan dit als referentie gebruiken voor hun design team of stock foto zoeken
- **Optioneel (fase 2)**: DALL-E API integratie voor directe generatie

**Image Brief Output**:
```json
{
  "concept": "Professional woman reviewing analytics dashboard on laptop",
  "style": "Clean, modern, bright natural lighting",
  "mood": "Confident, productive, focused",
  "composition": "Medium shot, slight angle, shallow depth of field",
  "brandAlignment": "Use brand colors in background elements",
  "dallePrompt": "Professional woman in modern office reviewing...",
  "stockKeywords": ["business analytics", "professional woman", "dashboard"]
}
```

### Carousel Editor Verbetering

**Huidige staat**: Basis slide navigatie, text overlay
**Verbetering**:
- Slide templates (title slide, content slide, quote slide, CTA slide, data slide)
- Text editing per slide (heading + body + CTA)
- Design notes per slide (voor designer handoff)
- Slide reordering (drag-and-drop)
- Slide dupliceren/verwijderen
- Aspect ratio preview (1:1 voor Instagram, 4:5, 16:9)

### Video & Audio (5 types)

> NB: Geen daadwerkelijke video-generatie — we genereren scripts en briefs

#### Explainer Video Script
**Settings**: Duration (60s/90s/120s), style (animated/live-action/screencast), narration pace
**Output**: `scenes[{timestamp, duration, visual, voiceover, onScreenText, transition}]`, `totalDuration`, `musicNotes`

#### Testimonial Video Brief
**Settings**: Customer type, interview questions count, b-roll suggestions
**Output**: `interviewQuestions[]`, `bRollSuggestions[]`, `openingHook`, `closingCta`, `editingNotes`

#### Promo Video Script
**Settings**: Duration (15s/30s/60s), platform, style
**Output**: Zoals Explainer maar korter en meer impact-gericht

#### Webinar Outline
**Settings**: Duration (30/45/60 min), format (presentation/interview/workshop), Q&A section
**Output**: `title`, `description`, `agenda[{time, topic, format, speakerNotes}]`, `promotionCopy`, `followUpEmail`

#### Podcast Episode Outline
**Settings**: Duration (20/30/45/60 min), format (solo/interview/panel), show notes toggle
**Output**: `title`, `description`, `segments[{time, topic, talkingPoints[], transition}]`, `showNotes`, `promotionCopy`

### PR, HR & Communications (8 types)

#### Press Release
**Settings**: Announcement type (product/partnership/milestone/event), distribution format
**Output**: `headline`, `subheadline`, `dateline`, `leadParagraph`, `bodyParagraphs[]`, `boilerplate`, `mediaContact`, `multimediaNotes`

#### Media Pitch
**Settings**: Pitch type (exclusive/embargo/general), journalist angle
**Output**: `subjectLine`, `personalizedOpening`, `pitchBody`, `newsworthyHook`, `availableAssets[]`, `callToAction`

#### Internal Communication
**Settings**: Audience (all-hands/department/leadership), sensitivity (public/internal/confidential)
**Output**: `subject`, `greeting`, `keyMessage`, `context`, `actionItems[]`, `timeline`, `faqSection?`

#### Career Page
**Settings**: Company culture highlights, benefits emphasis, diversity statement toggle
**Output**: `headline`, `employerValueProposition`, `cultureSection`, `benefits[]`, `openPositions[]`, `applicationProcess`, `diversityStatement?`

#### Job Ad
**Settings**: Seniority (junior/mid/senior/lead), remote/hybrid/onsite, include salary range
**Output**: `title`, `hookIntro`, `responsibilities[]`, `requirements[]`, `niceToHave[]`, `benefits[]`, `applicationCta`, `companyBlurb`

#### Employee Story
**Settings**: Story angle (career growth/project impact/culture), interview-style toggle
**Output**: `headline`, `employeeName`, `role`, `storyArc`, `pullQuote`, `careerJourney`, `advice`

#### Employer Branding Video Script
**Settings**: Zoals Video Script maar met employer branding focus
**Output**: Video script format met employee testimonials, office shots, culture moments

#### Impact Report
**Settings**: Period (quarterly/annual), metrics focus, stakeholder audience
**Output**: `title`, `executiveSummary`, `keyMetrics[]`, `sections[{title, narrative, dataPoints[]}]`, `outlook`, `acknowledgments`

---

## Stap S7.8 — Export & Polish

### Export Engine (`src/lib/studio/export-service.ts`)

**Formaten**:

| Formaat | Bibliotheek | Toepassing |
|---------|-------------|------------|
| PDF | `@react-pdf/renderer` of `puppeteer` | Whitepapers, rapporten, press releases |
| DOCX | `docx` (npm package) | Bewerkbare documenten, proposals |
| HTML | Native | Email templates, landing pages |
| Markdown | Native conversie | Blog posts, documentatie |
| Plain Text | Native strip | Social media posts, ad copy |
| JSON | Native | Data export, API integratie |

**Per Deliverable Type → Standaard Export Formaat**:
- Long-Form Content → PDF + DOCX + Markdown
- Social Media → Plain Text + afbeelding brief (JSON)
- Advertising → Plain Text (met character counts) + JSON
- Email → HTML (email-safe) + Plain Text
- Website → HTML
- Video/Audio → PDF (script) + DOCX
- Sales → PDF + DOCX
- PR/HR → PDF + DOCX + Plain Text

### Export Workflow
1. Gebruiker klikt "Export" → dropdown met beschikbare formaten
2. Backend genereert bestand in gekozen formaat
3. Bestand wordt opgeslagen in cloud storage (S3/Vercel Blob)
4. Download URL retourneren (1 uur geldig)
5. Optioneel: Email met download link

### UX Polish

**Preview Mode Verbetering**:
- Full-screen preview van eindresultaat
- Platform-specifieke preview (hoe ziet het eruit op LinkedIn? In Gmail?)
- Responsive preview (desktop/tablet/mobile)

**Studio UX Verbeteringen**:
- Keyboard shortcuts (Ctrl+G = generate, Ctrl+S = save, Ctrl+E = export)
- Content type quick-switcher (Ctrl+K stijl command palette)
- Recent deliverables sidebar
- Copy-to-clipboard voor social posts en ad copy
- Drag-and-drop reordering van secties in long-form content
- Split-view: content links, preview rechts
- Dark mode support voor studio (lang schrijven = eye strain)

---

## Type-Specifieke Settings: Overzicht

### Nieuw Data Model

**Uitbreiding Deliverable Types Registry** (`deliverable-types.ts`):

Elk type krijgt extra velden:
```typescript
interface DeliverableType {
  // Bestaand
  id: string;
  name: string;
  description: string;
  category: DeliverableCategory;
  funnelStage: FunnelStage;
  outputFormats: OutputFormat[];
  icon: string;

  // NIEUW
  settings: TypeSettings;           // Type-specifieke instellingen
  outputSchema: ZodSchema;          // Gestructureerde output definitie
  qualityCriteria: QualityCriteria; // Type-specifieke scoring
  promptTemplate: string;           // Referentie naar prompt template
  constraints: TypeConstraints;     // Limieten (max woorden, chars, etc.)
  exportFormats: ExportFormat[];    // Beschikbare export formaten
}

interface TypeSettings {
  fields: SettingsField[];  // UI velden in Left Panel
}

interface SettingsField {
  key: string;
  label: string;
  type: 'select' | 'slider' | 'toggle' | 'text' | 'number' | 'multiselect';
  options?: { value: string; label: string }[];
  default: any;
  min?: number;
  max?: number;
}

interface TypeConstraints {
  minWords?: number;
  maxWords?: number;
  maxCharacters?: number;  // Per veld (bijv. tweet = 280)
  requiredSections?: string[];
}
```

### Dynamic Settings Panel

**Nieuw Component**: `DynamicSettingsPanel.tsx`
- Leest `settings.fields` uit het geselecteerde deliverable type
- Rendert dynamisch de juiste UI controls
- Slaat waarden op in `deliverable.settings` JSON veld
- Vervangt de huidige statische `TextSettingsPanel`, `ImageSettingsPanel`, etc.

---

## Database Wijzigingen

### Nieuwe Velden (Prisma Schema)

```prisma
model Deliverable {
  // Bestaand - geen wijzigingen

  // Nieuw
  generatedOutput    Json?      // Gestructureerde output (type-specifiek)
  editorDocument     Json?      // TipTap document JSON (lossless)
  exportUrls         Json?      // { pdf: "url", docx: "url", ... }
  generationCost     Float?     // Kosten in USD voor AI generatie
  generationTokens   Int?       // Tokens gebruikt
  generationModel    String?    // Welk model daadwerkelijk gebruikt
  generationDuration Int?       // Duur in ms
}
```

### Migratie
- Eenmalige migratie: voeg nieuwe velden toe
- Bestaande data niet aangeraakt (alle velden nullable)

---

## Volgorde & Afhankelijkheden

```
S7.1 (TipTap Editor)
  │
  ▼
S7.2 (AI Generation Engine) ──── afhankelijk van werkende editor
  │
  ├──▶ S7.4 (Long-Form)     ┐
  ├──▶ S7.5 (Social & Ads)  ├── parallel mogelijk (onafhankelijk)
  ├──▶ S7.6 (Email & Sales) │
  └──▶ S7.7 (Visual & Media)┘
           │
           ▼
S7.3 (Quality & Improve) ──── na generatie, zodat er content is om te scoren
  │
  ▼
S7.8 (Export & Polish) ──── als laatste, bouwt voort op alles
```

**Aanbevolen volgorde**:
1. S7.1 (TipTap) — fundament
2. S7.2 (AI Engine) — kern
3. S7.4 (Long-Form) — meest complex, beste test case
4. S7.3 (Quality & Improve) — nu testbaar met echte content
5. S7.5 (Social & Ads) — minder complex, sneller
6. S7.6 (Email & Sales) — medium complexiteit
7. S7.7 (Visual & Media) — scripts/briefs, geen media generatie
8. S7.8 (Export & Polish) — afronden

---

## Risico's & Mitigatie

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| AI-kosten lopen op bij testen | Medium | Rate limiting, cost caps, test met goedkopere modellen |
| TipTap bundle size | Laag | Tree-shaking, alleen benodigde extensions laden |
| Content kwaliteit varieert per type | Hoog | Iteratieve prompt engineering, A/B testen templates |
| Export complexiteit (PDF layout) | Medium | Start met Markdown export, PDF later |
| 43 types = veel prompt templates | Hoog | Template inheritance: categorie-base + type-overrides |
| Lange generatie-tijden (whitepapers) | Medium | Streaming responses, sectie-voor-sectie generatie |

---

## Samenvatting

Dit plan transformeert de Content Studio van een **UI-shell met stubs** naar een **volledig werkende AI content productie-engine**:

- **S7.1**: Professionele rich text editor (TipTap)
- **S7.2**: Echte AI content generatie met brand context
- **S7.3**: Intelligente quality scoring + AI improvement suggestions
- **S7.4-S7.7**: 43 deliverable types met type-specifieke settings, prompts en output formats
- **S7.8**: Echte export (PDF/DOCX/HTML) + UX polish

Na deze fase is de Content Studio het hart van Branddock: een plek waar brand strategie automatisch wordt vertaald naar hoogwaardige, on-brand content voor elk kanaal.
