# Plan van Aanpak: Brandstyle Feature Werkzaam Maken

## 1. Analyse Huidige Situatie

### Wat werkt
- **Frontend**: Volledig functioneel — BrandstyleAnalyzerPage, WebsiteUrlInput, PdfUploadInput, ProcessingProgress, BrandStyleguidePage (5-tab), alle section componenten, Zustand store, TanStack Query hooks
- **Styleguide CRUD**: Alle GET/PATCH endpoints voor 5 secties (logo, colors, typography, tone-of-voice, imagery) werken op de database
- **Color management**: Toevoegen/verwijderen van kleuren werkt
- **Save for AI**: Secties markeren voor AI context werkt
- **Lock/unlock**: Styleguide vergrendeling werkt
- **Polling mechanisme**: Frontend pollt elke 2s de status en toont progressive steps

### Wat NIET werkt (demo/stub)
| Component | Probleem |
|-----------|----------|
| `POST /api/brandstyle/analyze/url` | Accepteert URL maar doet **geen echte scraping**. Na 8s setTimeout worden hardcoded demo kleuren/data ingevuld |
| `POST /api/brandstyle/analyze/pdf` | Accepteert PDF maar **leest het bestand niet**. Na 8s wordt status COMPLETE zonder data |
| `GET /analyze/status/[jobId]` | Simuleert progressive steps door bij elke poll de status 1 stap op te schuiven — geen echte processing |
| `POST /export-pdf` | Stub 501 — niet geimplementeerd |

### Ontbrekende dependencies
- **Geen web scraper**: Geen cheerio, puppeteer, playwright, of firecrawl
- **Geen PDF parser**: jsPDF is voor generatie, niet parsing. Geen pdf-parse of pdfjs-dist
- **Geen image processing**: Geen sharp of color extraction library
- **Geen async job queue**: Processing draait nu in een setTimeout, geen Bull/BullMQ/Inngest

### Wat er WEL al is (herbruikbaar)
- OpenAI client (singleton, retry, structured JSON completion) — `src/lib/ai/openai-client.ts`
- Anthropic Claude SDK — `@anthropic-ai/sdk` installed
- Color utilities — `hex→RGB/HSL/CMYK, WCAG contrast` in `src/features/brandstyle/utils/color-utils.ts`
- Rate limiter (3 tiers) — `src/lib/ai/rate-limiter.ts`
- Brand context aggregator — `src/lib/ai/brand-context.ts`

---

## 2. Stappenplan

### Stap 1: Dependencies installeren
Installeer de minimale set packages:

```
npm install cheerio         # HTML parsing (lightweight, geen browser nodig)
npm install pdf-parse       # PDF text extraction
npm install @anthropic-ai/sdk  # Al geinstalleerd — Claude Vision voor screenshots
```

**Waarom deze keuze:**
- `cheerio` ipv puppeteer: Puppeteer vereist een headless browser (zwaar, deployment issues op Vercel). Cheerio parseert HTML direct — veel lichter.
- `pdf-parse` ipv pdfjs-dist: Simpeler API, server-side only, parseert text + metadata uit PDF
- Claude Vision: Kan screenshots/images analyseren voor kleur- en typografie-extractie — al beschikbaar via Anthropic SDK

### Stap 2: URL Scraping implementeren
Nieuwe utility: `src/lib/brandstyle/url-scraper.ts`

**Wat het doet:**
1. **Fetch HTML** van de opgegeven URL (native `fetch`)
2. **Parse met Cheerio**: Extraheer CSS stylesheets (inline `<style>` tags + linked `.css` bestanden)
3. **Kleur extractie**: Parse CSS voor `color`, `background-color`, `border-color` properties → verzamel unieke hex waarden
4. **Font extractie**: Parse CSS voor `font-family`, `@font-face` declarations → identificeer primaire fonts
5. **Meta extractie**: `<title>`, `<meta description>`, favicon/logo `<img>` tags, Open Graph images
6. **AI analyse**: Stuur geextraheerde data naar OpenAI/Claude met structured output prompt:
   - Categoriseer kleuren (PRIMARY, SECONDARY, ACCENT, NEUTRAL, SEMANTIC)
   - Benoem kleurwaarden met beschrijvende namen
   - Genereer logo guidelines op basis van gevonden logo's
   - Genereer typography guidelines op basis van fonts
   - Genereer tone-of-voice analyse op basis van content tekst
   - Genereer imagery richtlijnen

**Fallback strategie:**
- Als CSS fetch faalt → gebruik alleen meta tags + AI analyse van page text
- Als geen kleuren gevonden → AI genereert suggesties op basis van branding/industry

### Stap 3: PDF Parsing implementeren
Nieuwe utility: `src/lib/brandstyle/pdf-parser.ts`

**Wat het doet:**
1. **Parse PDF** met `pdf-parse`: Extraheer alle tekst content
2. **Kleur extractie uit PDF**: PDF-parse geeft geen kleuren, maar de tekst bevat vaak hex codes of kleur beschrijvingen
3. **AI analyse**: Stuur de volledige tekst naar OpenAI/Claude met structured output:
   - Identificeer brand kleuren (uit beschrijvingen, hex codes in tekst)
   - Extraheer typography informatie (font namen, groottes)
   - Extraheer tone-of-voice richtlijnen
   - Extraheer logo/imagery richtlijnen
   - Structureer alles naar het BrandStyleguide formaat

**Optionele verbetering (Stap 3b):**
- Als de PDF afbeeldingen bevat → Claude Vision API gebruiken om logo's en kleurpaletten visueel te analyseren

### Stap 4: Analysis Engine bouwen
Nieuwe module: `src/lib/brandstyle/analysis-engine.ts`

**Verantwoordelijkheden:**
1. **Orchestratie**: Ontvang URL of PDF, routeer naar juiste parser
2. **AI Structured Output**: Definieer Zod schema voor het gewenste output formaat:
   ```typescript
   const StyleguideAnalysisSchema = z.object({
     colors: z.array(z.object({
       name: z.string(),
       hex: z.string(),
       category: z.enum(['PRIMARY', 'SECONDARY', 'ACCENT', 'NEUTRAL', 'SEMANTIC']),
       tags: z.array(z.string()),
       notes: z.string().optional()
     })),
     logoVariations: z.array(z.object({ ... })),
     logoGuidelines: z.array(z.string()),
     logoDonts: z.array(z.string()),
     primaryFontName: z.string().optional(),
     typeScale: z.array(z.object({ ... })),
     contentGuidelines: z.array(z.string()),
     writingGuidelines: z.array(z.string()),
     examplePhrases: z.array(z.object({ ... })),
     photographyStyle: z.object({ ... }).optional(),
     photographyGuidelines: z.array(z.string()),
     illustrationGuidelines: z.array(z.string()),
     colorDonts: z.array(z.string()),
     imageryDonts: z.array(z.string())
   })
   ```
3. **Database schrijven**: Map AI output naar Prisma BrandStyleguide + StyleguideColor records
4. **Progress tracking**: Update `analysisStatus` in DB bij elke echte stap (niet gesimuleerd)
5. **Error handling**: Robuuste foutafhandeling met status `ERROR` + foutmelding

### Stap 5: API Routes updaten
Wijzig de bestaande routes:

**`POST /api/brandstyle/analyze/url`:**
- Vervang setTimeout + hardcoded data door:
  1. Maak styleguide record aan (status: ANALYZING)
  2. Start `analyzeUrl()` uit analysis-engine (async, non-blocking)
  3. Analysis engine update database progressief per stap
  4. Return jobId voor polling

**`POST /api/brandstyle/analyze/pdf`:**
- Vervang setTimeout door:
  1. Lees uploaded PDF buffer
  2. Maak styleguide record aan (status: ANALYZING)
  3. Start `analyzePdf()` uit analysis-engine (async, non-blocking)
  4. Return jobId

**`GET /api/brandstyle/analyze/status/[jobId]`:**
- Vervang progressieve stap-simulatie door echte DB-reads:
  1. Lees `analysisStatus` uit database
  2. Map naar step index (bestaande STATUS_TO_STEP mapping werkt)
  3. Geen mutatie meer bij elke poll — alleen lezen

**Geen frontend wijzigingen nodig** — het polling mechanisme, de 5-stap weergave, en de auto-redirect werken al correct.

### Stap 6: Error handling & edge cases
- **Timeout**: Als analyse langer duurt dan 120s → status ERROR met bericht
- **Onbereikbare URL**: Catch fetch errors → status ERROR
- **Lege PDF**: Geen tekst gevonden → status ERROR met suggestie
- **Rate limiting**: AI calls via bestaande rate limiter
- **CORS issues bij URL fetch**: Server-side fetch heeft geen CORS restricties

---

## 3. Verbeteringen

### V1: Intelligentere kleur extractie (Stap 2 enhancement)
- Na CSS parsing: bereken WCAG contrast ratios automatisch via bestaande `color-utils.ts`
- Dedupliceer vergelijkbare kleuren (bijv. #333 en #2f2f2f groeperen)
- Sorteer op frequency of occurrence in CSS

### V2: Re-analyze functionaliteit
- "Re-analyze" knop op BrandStyleguidePage
- Heranalyseert dezelfde URL/PDF zonder handmatig opnieuw te starten
- Behoudt handmatige edits als optie (merge strategie)

### V3: Screenshot-based analyse (optioneel, future)
- Gebruik een headless browser screenshot service (bijv. external API)
- Stuur screenshot naar Claude Vision voor visuele analyse
- Vult gaps op die CSS parsing mist (bijv. gradient achtergronden, hero images)

### V4: Partial update na analyse
- Bij re-analyse: toon diff van wat er veranderd is
- Gebruiker kan per sectie kiezen: "overwrite" of "keep current"

### V5: Betere progress feedback
- Voeg geschatte tijdsduur toe per stap
- Toon tussenstatus tekst (bijv. "3 kleuren gevonden, analyseren...")

---

## 4. Scope & Prioriteit

### Must-have (dit plan)
| # | Item | Geschatte complexiteit |
|---|------|----------------------|
| 1 | Dependencies installeren (cheerio, pdf-parse) | Laag |
| 2 | URL scraper utility (fetch + cheerio + CSS parse) | Medium |
| 3 | PDF parser utility (pdf-parse + text extraction) | Medium |
| 4 | Analysis engine (AI structured output + DB write) | Hoog |
| 5 | API routes updaten (url, pdf, status) | Medium |
| 6 | Error handling & edge cases | Medium |

### Nice-to-have (vervolgwerk)
| # | Item |
|---|------|
| V1 | WCAG contrast auto-berekening |
| V2 | Re-analyze functionaliteit |
| V5 | Betere progress feedback |

### Later (optioneel)
| # | Item |
|---|------|
| V3 | Screenshot-based analyse (Claude Vision) |
| V4 | Partial update / merge strategie |
| PDF export | /export-pdf endpoint implementeren |

---

## 5. Technische Details

### Bestandsstructuur (nieuw)
```
src/lib/brandstyle/
├── url-scraper.ts          ← HTML fetch + Cheerio parsing + CSS color/font extraction
├── pdf-parser.ts           ← pdf-parse wrapper + text extraction
├── analysis-engine.ts      ← Orchestratie + AI structured output + DB write
├── analysis-prompts.ts     ← AI prompt templates voor brandstyle analyse
└── analysis-schemas.ts     ← Zod schemas voor AI structured output
```

### AI Provider keuze
- **OpenAI GPT-4o** met `createStructuredCompletion()` voor de analyse — dit is de bestaande, geteste methode in het project
- Structured JSON output garandeert dat het resultaat exact het verwachte schema volgt
- Temperature: 0.3 (ANALYSIS preset) voor consistente resultaten

### Async processing patroon
Het huidige `setTimeout` patroon werkt eigenlijk prima voor de context:
- Next.js API route start de analyse als fire-and-forget
- De analyse-engine update de database progressief
- Frontend pollt elke 2s — ziet echte voortgang

Dit is niet ideaal voor productie (process crash = lost job), maar voor de huidige fase is het werkbaar. Een echte job queue (Bull/Inngest) is pas nodig bij scaling.

### Database wijzigingen
Geen schema wijzigingen nodig — het bestaande BrandStyleguide model heeft alle velden die we nodig hebben.

### Frontend wijzigingen
Minimaal tot geen — het polling mechanisme, de step weergave, en de auto-redirect naar de styleguide werken al. De enige mogelijke aanpassing is betere error messaging als de analyse faalt.
