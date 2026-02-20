# OPDRACHT — Persona Chat AI Integratie

## Laatst bijgewerkt: 20 februari 2026

---

## CONTEXT

De Persona Chat modal is visueel opgebouwd maar mist functionaliteit:
1. De chat is niet verbonden met een LLM
2. De "Add Context" knop werkt niet
3. De Insights tab is leeg/niet werkend
4. Er is geen manier om de system prompt te beheren

Deze opdracht maakt de Persona Chat volledig functioneel.

---

## ARCHITECTUUR OVERZICHT

```
┌─────────────────────────────────────────────────────┐
│  Persona Chat Modal                                  │
│                                                      │
│  ┌──────────────┐  ┌─────────────────────────────┐  │
│  │  Chat Tab     │  │  Insights Tab               │  │
│  │               │  │                             │  │
│  │  💬 Messages  │  │  💡 Saved insights from     │  │
│  │  💡 per msg   │  │     chat (cards)            │  │
│  │               │  │                             │  │
│  │  ┌──────────┐ │  │  [Insight Card]             │  │
│  │  │Add Context│ │  │  [Insight Card]             │  │
│  │  │  button   │ │  │  [Insight Card]             │  │
│  │  └──────────┘ │  │                             │  │
│  └──────────────┘  └─────────────────────────────┘  │
│                                                      │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  POST /api/personas/[personaId]/chat                 │
│                                                      │
│  ┌────────────┐  ┌────────────┐  ┌───────────────┐  │
│  │ System     │  │ Knowledge  │  │ Chat          │  │
│  │ Prompt     │  │ Context    │  │ History       │  │
│  │ (template  │  │ (selected  │  │ (user +       │  │
│  │  + persona │  │  items)    │  │  assistant)   │  │
│  │  data)     │  │            │  │               │  │
│  └─────┬──────┘  └─────┬──────┘  └──────┬────────┘  │
│        └───────────────┼────────────────┘            │
│                        ▼                             │
│              LLM API (Anthropic / OpenAI)             │
└─────────────────────────────────────────────────────┘
```

---

## DEEL A — Database & API Fundament

### A1. Prisma Schema uitbreidingen

**Bestand:** `prisma/schema.prisma`

```prisma
// Chat configuratie — bewerkbaar door admin, niet zichtbaar voor gebruikers
model PersonaChatConfig {
  id                  String   @id @default(cuid())
  workspaceId         String
  
  // LLM Settings — multi-provider support
  provider            String   @default("anthropic")  // "anthropic" | "openai"
  model               String   @default("claude-sonnet-4-20250514")
  temperature         Float    @default(0.8)
  maxTokens           Int      @default(1000)
  
  // Beschikbare modellen:
  // Anthropic: claude-sonnet-4-20250514 (aanbevolen: sterkste in karakter vasthouden + nuance)
  //            claude-haiku-4-5-20251001 (sneller/goedkoper, goed voor korte gesprekken)
  // OpenAI:    gpt-4o (alternatief, vergelijkbaar niveau)
  //            gpt-4o-mini (budget fallback)
  
  // System prompt template met variabelen
  // Beschikbare variabelen: {{name}}, {{description}}, {{ageRange}}, 
  // {{occupation}}, {{location}}, {{education}}, {{income}}, {{familyStatus}},
  // {{personalityType}}, {{coreValues}}, {{interests}}, 
  // {{goals}}, {{motivations}}, {{frustrations}}, {{behaviors}}
  systemPromptTemplate String  @db.Text
  
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  workspace           Workspace @relation(fields: [workspaceId], references: [id])
  
  @@unique([workspaceId])
}

// Chat sessies met berichten
model PersonaChatSession {
  id          String   @id @default(cuid())
  personaId   String
  workspaceId String
  title       String?  // Auto-generated na 3 berichten
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  persona     Persona  @relation(fields: [personaId], references: [id], onDelete: Cascade)
  messages    PersonaChatMessage[]
  insights    PersonaChatInsight[]
  knowledgeContext PersonaChatContext[]
  
  @@index([personaId])
  @@index([workspaceId])
}

model PersonaChatMessage {
  id        String   @id @default(cuid())
  sessionId String
  role      String   // "user" | "assistant" | "system"
  content   String   @db.Text
  
  // Token tracking
  promptTokens     Int?
  completionTokens Int?
  
  createdAt DateTime @default(now())
  
  session   PersonaChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  insights  PersonaChatInsight[] // Insights gekoppeld aan dit bericht
  
  @@index([sessionId])
}

// Insights gegenereerd uit chat berichten
model PersonaChatInsight {
  id        String   @id @default(cuid())
  sessionId String
  messageId String?  // Het specifieke bericht waaruit het insight komt
  
  // Insight content
  type      String   // "pain_point" | "opportunity" | "preference" | "behavior" | "need" | "objection" | "motivation"
  title     String   // Korte samenvatting
  content   String   @db.Text // Uitgebreide beschrijving
  severity  String?  // "high" | "medium" | "low"
  
  // Metadata
  isAutoGenerated Boolean @default(false) // true = AI gegenereerd, false = handmatig via 💡
  
  createdAt DateTime @default(now())
  
  session   PersonaChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  message   PersonaChatMessage? @relation(fields: [messageId], references: [id])
  
  @@index([sessionId])
  @@index([messageId])
}

// Geselecteerde knowledge context per sessie
model PersonaChatContext {
  id          String   @id @default(cuid())
  sessionId   String
  
  // Referentie naar het knowledge item
  sourceType  String   // "brand_asset" | "product" | "market_insight" | "knowledge_resource" | "campaign" | "deliverable" | "brandstyle"
  sourceId    String   // ID van het item
  sourceName  String   // Naam voor weergave
  
  // Snapshot van de context op moment van toevoegen
  contextData Json     // Relevante velden als JSON snapshot
  
  createdAt   DateTime @default(now())
  
  session     PersonaChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  
  @@unique([sessionId, sourceType, sourceId])
  @@index([sessionId])
}
```

### A2. Default System Prompt Template

**Bestand:** `prisma/seed/persona-chat-config.ts`

Dit is de default prompt die aangemaakt wordt bij het seeden. Admins kunnen deze later wijzigen.

```typescript
export const DEFAULT_PERSONA_CHAT_PROMPT = `You are {{name}}, a real person with your own perspective, experiences, and opinions. You are NOT an AI assistant — you are this specific individual.

## WHO YOU ARE

{{description}}

## YOUR DEMOGRAPHICS
- Age: {{ageRange}}
- Occupation: {{occupation}}
- Location: {{location}}  
- Education: {{education}}
- Income level: {{income}}
- Family situation: {{familyStatus}}

## YOUR PERSONALITY
- Type: {{personalityType}}
- Core values: {{coreValues}}
- Interests: {{interests}}

## WHAT DRIVES YOU
Goals: {{goals}}
Motivations: {{motivations}}

## WHAT FRUSTRATES YOU
{{frustrations}}

## HOW YOU BEHAVE
{{behaviors}}

{{#if knowledgeContext}}
## ADDITIONAL CONTEXT
The following information has been shared with you for discussion:

{{knowledgeContext}}
{{/if}}

## CONVERSATION RULES
1. ALWAYS stay in character as {{name}}. Never break character or acknowledge being AI.
2. Respond naturally as this person would — use their vocabulary level, emotional tone, and perspective.
3. When asked about products, services, or brands: react authentically based on your goals, frustrations, and behaviors.
4. Share personal opinions and experiences. Be specific, not generic.
5. If something doesn't align with your values or needs, say so clearly and explain why.
6. Use natural conversational language. Avoid corporate jargon unless your occupation calls for it.
7. Show emotion where appropriate — enthusiasm, skepticism, frustration, excitement.
8. If you don't know something specific, respond as this person realistically would.
9. Keep responses conversational — typically 2-4 paragraphs unless more detail is asked for.
10. When discussing the additional context provided, reference specific details from it.`;
```

### A3. API Routes

**Bestanden:**
```
src/app/api/personas/[personaId]/chat/
├── route.ts                    ← POST: send message, GET: list sessions
├── [sessionId]/
│   ├── route.ts                ← GET: session with messages
│   └── insights/
│       └── route.ts            ← POST: generate insight from message, GET: list insights
└── config/
    └── route.ts                ← GET/PATCH: system prompt config (admin only)

src/lib/ai/
├── persona-chat.ts             ← Core: prompt building, LLM call (Anthropic/OpenAI), streaming
├── persona-prompt-builder.ts   ← Template engine: vervangt {{variabelen}}
└── persona-insight-generator.ts ← Insight extractie uit berichten
```

**POST /api/personas/[personaId]/chat — Send message:**
```typescript
// Request
{
  message: string;
  sessionId?: string;        // Bestaande sessie, of maak nieuwe aan
  knowledgeContextIds?: {     // Optioneel: geselecteerde knowledge items
    sourceType: string;
    sourceId: string;
  }[];
}

// Response (streaming)
// Content-Type: text/event-stream
// data: {"token": "Hi"}
// data: {"token": "! I'm"}
// data: {"token": " Sarah"}
// data: {"done": true, "messageId": "...", "sessionId": "...", "usage": {"prompt": 450, "completion": 120}}
```

**POST /api/personas/[personaId]/chat/[sessionId]/insights — Generate insight:**
```typescript
// Request
{
  messageId: string;         // Het bericht waaruit een insight getrokken moet worden
}

// Achter de schermen:
// 1. Pak het bericht + 2 berichten context (1 voor, 1 na)
// 2. Stuur naar LLM (Anthropic/OpenAI) met insight-extractie prompt
// 3. Return gestructureerd insight

// Response
{
  id: string;
  type: "pain_point" | "opportunity" | "preference" | "behavior" | "need" | "objection" | "motivation";
  title: string;
  content: string;
  severity: "high" | "medium" | "low";
  messageId: string;
}
```

---

## DEEL B — Knowledge Context Selector

### B1. Add Context Modal

**Bestand:** `src/features/personas/components/chat/KnowledgeContextSelector.tsx`

De "📋 Add Context" knop in de chat footer opent een modal waarmee de gebruiker knowledge items kan selecteren die als extra context aan het gesprek worden toegevoegd.

**Welke items WÉL tonen:**

| Categorie | Bron | Wat wordt meegegeven als context |
|-----------|------|--------------------------------|
| Brand Assets | `BrandAsset` tabel | Naam + beschrijving + key attributes + status |
| Products & Services | `Product` tabel | Naam + beschrijving + categorie + pricing + features |
| Market Insights | `MarketInsight` tabel | Titel + beschrijving + impact + scope + key findings |
| Knowledge Library | `KnowledgeResource` tabel | Titel + samenvatting + categorie + key takeaways |
| Campaigns | `Campaign` tabel | Naam + type + strategie + doelgroep + status |
| Deliverables | `Deliverable` tabel | Naam + content type + generated content (snippet) |
| Brandstyle | `BrandStyleguide` elementen | Logo beschrijving, kleuren, tone of voice, typography |

**Welke items NIET tonen:**

| Uitgesloten | Reden |
|-------------|-------|
| Andere Personas | Vreemd contextprotocol — je praat al met een persona |
| Questionnaires | Te technisch/meta, niet relevant voor conversatie |
| Research Hub config | Interne configuratie, geen inhoud |
| Settings/Account | Niet relevant |
| Business Strategy (OKRs) | Te abstract, mogelijk verwarrend voor persona |

**Modal UI:**
- Header: "Select Knowledge Context" + "(X Available)" badge
- Zoekbalk: "Search by name or category..."
- Filter chips per type: All | Brand Assets | Products | Insights | Library | Campaigns | Brandstyle
- Filter chips per status: All | Validated | Ready | In Progress
- Lijst per categorie (collapsible secties):
  - Checkbox + icoon + naam + status badge
  - Voor items met sub-data: korte preview
- Footer: "X items selected" + Cancel + "✓ Apply Selection" (teal)
- Geselecteerde items worden opgeslagen in `PersonaChatContext` tabel

**Context injectie in prompt:**
Geselecteerde items worden als gestructureerde tekst in de system prompt gezet:

```
## ADDITIONAL CONTEXT

### Product: Branddock Pro
SaaS platform for brand strategy. Pricing: €99/month. Key features: AI content generation, 
brand alignment checking, research validation. Target: marketing teams at mid-size companies.

### Market Insight: AI-Powered Personalization (95% relevance)
Consumers expect personalized brand experiences. Impact: High. Scope: Macro trend.
Key finding: 78% of consumers prefer brands that use data to personalize interactions.

### Campaign: Spring Brand Refresh 2025
Strategic campaign targeting brand awareness. Status: Active. 3 deliverables in progress.
```

### B2. Context data ophalen

**Bestand:** `src/lib/ai/knowledge-context-fetcher.ts`

Per sourceType een functie die de relevante data ophaalt en als leesbare tekst formatteert:

```typescript
export async function fetchContextData(
  sourceType: string, 
  sourceId: string,
  workspaceId: string
): Promise<{ name: string; contextText: string }> {
  switch (sourceType) {
    case 'brand_asset':
      // Haal asset op met alle relaties
      // Return: naam + beschrijving + attributes + research coverage
      
    case 'product':
      // Haal product op met features + pricing
      // Return: naam + beschrijving + categorie + USPs
      
    case 'market_insight':
      // Haal insight op met industries + tags
      // Return: titel + beschrijving + impact + trends
      
    case 'knowledge_resource':
      // Haal resource op met samenvatting
      // Return: titel + samenvatting + key takeaways
      
    case 'campaign':
      // Haal campaign op met deliverables
      // Return: naam + type + strategie + voortgang
      
    case 'deliverable':
      // Haal deliverable op met content snippet
      // Return: naam + type + content preview (max 500 chars)
      
    case 'brandstyle':
      // Haal brandstyle secties op
      // Return: kleuren + tone of voice + typography samenvatting
  }
}
```

---

## DEEL C — Insight Systeem (💡 knop)

### C1. Per-bericht insight knop

Elk **assistant bericht** (antwoord van de persona) krijgt een 💡 icoon button. Bij klikken:

1. Button toont loading state (💡 wordt spinner)
2. POST naar `/api/personas/[personaId]/chat/[sessionId]/insights` met het `messageId`
3. API stuurt het bericht + context naar het geconfigureerde LLM met deze prompt:

```typescript
const INSIGHT_EXTRACTION_PROMPT = `Analyze the following conversation exchange between a user and a persona. 
Extract ONE key insight from the persona's response.

Context messages:
{{contextMessages}}

Persona response to analyze:
{{targetMessage}}

Respond in JSON format:
{
  "type": "pain_point" | "opportunity" | "preference" | "behavior" | "need" | "objection" | "motivation",
  "title": "Short 5-10 word summary",
  "content": "2-3 sentence detailed description of the insight and its implications for brand strategy",
  "severity": "high" | "medium" | "low"
}

Rules:
- Focus on actionable insights for brand strategy
- Be specific, reference what the persona actually said
- "high" severity = directly impacts purchase decision or brand perception
- "medium" severity = influences preference or consideration  
- "low" severity = nice-to-know, minor preference`;
```

4. Het insight verschijnt als een **toast notification** ("💡 Insight saved!")
5. Het bericht krijgt een subtiele indicator dat er een insight aan gekoppeld is (bijv. geel 💡 ipv grijs)
6. Het insight is direct zichtbaar in de **Insights tab**

### C2. Insights Tab

**Bestand:** `src/features/personas/components/chat/InsightsTab.tsx`

De Insights tab toont alle opgeslagen insights van de huidige sessie als cards:

```
┌─────────────────────────────────────────┐
│ 💡 Insights (4)                         │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🔴 PAIN POINT — high severity       │ │
│ │ "Brand tools ignore design needs"   │ │
│ │ Lisa expressed frustration that...  │ │
│ │ ──────────────────────────          │ │
│ │ 💬 View in chat    🗑️ Delete        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🟢 OPPORTUNITY — high severity      │ │
│ │ "Willing to pay for design-first"   │ │
│ │ When asked about pricing, Lisa...   │ │
│ │ ──────────────────────────          │ │
│ │ 💬 View in chat    🗑️ Delete        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🔵 PREFERENCE — medium severity     │ │
│ │ "Prefers visual over text-heavy"    │ │
│ │ Lisa mentioned she gravitates...    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [📥 Export Insights]                    │
└─────────────────────────────────────────┘
```

**Insight type kleuren:**
- `pain_point` → rood (🔴)
- `opportunity` → groen (🟢)  
- `preference` → blauw (🔵)
- `behavior` → paars (🟣)
- `need` → oranje (🟠)
- `objection` → rood (🔴)
- `motivation` → groen (🟢)

**Card acties:**
- "💬 View in chat" — scrollt naar het originele bericht in de Chat tab
- "🗑️ Delete" — verwijdert het insight
- "📥 Export Insights" — download alle insights als JSON of kopieer naar klembord

---

## DEEL D — Frontend Componenten

### D1. Chat Hook

**Bestand:** `src/features/personas/hooks/usePersonaChat.ts`

```typescript
interface UsePersonaChatReturn {
  // State
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  sessionId: string | null;
  
  // Actions
  sendMessage: (content: string) => Promise<void>;
  startNewSession: () => void;
  
  // Knowledge Context
  selectedContext: KnowledgeContextItem[];
  addContext: (items: KnowledgeContextItem[]) => void;
  removeContext: (id: string) => void;
  
  // Insights
  insights: ChatInsight[];
  generateInsight: (messageId: string) => Promise<void>;
  deleteInsight: (insightId: string) => void;
  isGeneratingInsight: string | null; // messageId dat bezig is
  
  // Meta
  messageCount: number;
  maxMessages: number; // 50 per sessie
}
```

### D2. Streaming implementatie

**Bestand:** `src/lib/ai/persona-chat.ts`

Gebruik streaming voor betere UX (tekst verschijnt woord voor woord):

```typescript
export async function streamPersonaChat(params: {
  personaId: string;
  sessionId: string;
  message: string;
  history: { role: string; content: string }[];
  systemPrompt: string;
  provider: string;   // "anthropic" | "openai"
  model: string;
  temperature: number;
  maxTokens: number;
}): Promise<ReadableStream> {
  
  if (params.provider === 'anthropic') {
    // === ANTHROPIC (aanbevolen) ===
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    
    const stream = await client.messages.stream({
      model: params.model,           // "claude-sonnet-4-20250514"
      system: params.systemPrompt,   // System prompt als aparte parameter (niet als message!)
      messages: [
        ...params.history.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: params.message }
      ],
      temperature: params.temperature,
      max_tokens: params.maxTokens,
    });
    
    // Anthropic stream events: message_start, content_block_delta, message_stop
    // content_block_delta bevat: delta.text
    // ...convert naar SSE
    
  } else {
    // === OPENAI (fallback) ===
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const stream = await openai.chat.completions.create({
      model: params.model,           // "gpt-4o"
      messages: [
        { role: 'system', content: params.systemPrompt },
        ...params.history,
        { role: 'user', content: params.message }
      ],
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      stream: true,
    });
    
    // OpenAI stream events: chunk.choices[0].delta.content
    // ...convert naar SSE
  }
}
```

### D3. Typing indicator

Tijdens het streamen toont de chat een typing indicator:

```
┌─────────────────────────────────┐
│ [Avatar] Lisa is typing...      │
│          ● ● ●                  │
└─────────────────────────────────┘
```

CSS animated dots: 3 bolletjes die om de beurt opschalen (staggered 200ms).

---

## SPRINT STRUCTUUR (3 sessies, 2 parallel tabs)

### Sessie A — Foundation
| Tab 1 | Tab 2 |
|-------|-------|
| **Prisma schema** uitbreidingen (A1) + migrate + seed PersonaChatConfig met default prompt (A2) | **API routes** aanmaken: POST chat (met streaming), GET sessions, system prompt config endpoint (A3) |

**Tab 1 prompt:**
> Voeg de PersonaChatSession, PersonaChatMessage, PersonaChatInsight, PersonaChatContext en PersonaChatConfig modellen toe aan het Prisma schema. Voer een migratie uit. Seed een default PersonaChatConfig met de system prompt template. Zie OPDRACHT-PERSONA-CHAT-AI.md sectie A1 en A2 voor de volledige schema's en de default prompt template.

**Tab 2 prompt:**
> Maak de API routes aan voor persona chat: POST /api/personas/[personaId]/chat (streaming via Anthropic Claude Sonnet 4 als primair model, met OpenAI als fallback). Installeer `@anthropic-ai/sdk` package. De provider en model worden geladen uit PersonaChatConfig in de database. Let op: Anthropic stuurt de system prompt als aparte `system` parameter, NIET als message. GET /api/personas/[personaId]/chat (list sessions), GET /api/personas/[personaId]/chat/[sessionId] (session met berichten). Bouw de prompt builder die {{variabelen}} vervangt met persona data. Voeg ANTHROPIC_API_KEY toe aan .env.local template. Zie OPDRACHT-PERSONA-CHAT-AI.md sectie A3 voor de API structuur.

### Sessie B — Knowledge Context + Insights
| Tab 1 | Tab 2 |
|-------|-------|
| **Knowledge Context Selector** modal (B1) + context data fetcher (B2) + context injectie in system prompt | **Insight systeem** — 💡 knop per bericht, insight extractie API, Insights tab UI (C1 + C2) |

**Tab 1 prompt:**
> Maak de KnowledgeContextSelector modal werkend. Bij klikken op "Add Context" in de persona chat: toon een modal met alle beschikbare knowledge items (Brand Assets, Products, Market Insights, Knowledge Library, Campaigns, Deliverables, Brandstyle). NIET tonen: Personas, Questionnaires, Research config. Geselecteerde items worden opgeslagen in PersonaChatContext en als tekst geïnjecteerd in de system prompt. Zie OPDRACHT-PERSONA-CHAT-AI.md sectie B1 en B2 voor de volledige specificatie.

**Tab 2 prompt:**
> Maak het insight systeem werkend. Elk assistant bericht in de persona chat krijgt een 💡 (lamp) icoon button. Bij klikken: POST naar de insights API, die het bericht analyseert met het geconfigureerde LLM (Anthropic of OpenAI, uit PersonaChatConfig) en een gestructureerd insight teruggeeft (type, title, content, severity). Het insight verschijnt als toast + wordt zichtbaar in de Insights tab als een gekleurde card. "View in chat" scrollt terug naar het originele bericht. Zie OPDRACHT-PERSONA-CHAT-AI.md sectie C1 en C2 voor de volledige specificatie.

### Sessie C — Frontend Integratie + Polish
| Tab 1 | Tab 2 |
|-------|-------|
| **usePersonaChat hook** (D1) + streaming UI (D2) + typing indicator (D3) + bestaande chat modal refactoren naar nieuwe hook | **Testen** — alle flows doorlopen, edge cases, error handling, token limiet waarschuwing, export insights |

**Tab 1 prompt:**
> Refactor de bestaande PersonaChat modal om de nieuwe usePersonaChat hook te gebruiken. Implementeer streaming (tekst verschijnt woord voor woord), typing indicator ("Lisa is typing..." met animated dots), knowledge context weergave (geselecteerde items als chips boven de input), en de 💡 insight knop op elk assistant bericht. Zie OPDRACHT-PERSONA-CHAT-AI.md sectie D voor de hook interface en UI specificaties.

**Tab 2 prompt:**
> Test alle persona chat flows: 1) Stuur een bericht en ontvang streaming antwoord, 2) Voeg knowledge context toe en stel een vraag over dat item, 3) Klik op 💡 bij een antwoord en controleer dat het insight in de Insights tab verschijnt, 4) Klik "View in chat" in de Insights tab en controleer dat er naar het juiste bericht gescrolled wordt, 5) Check dat de system prompt config uit de database geladen wordt. Fix eventuele bugs. `npx tsc --noEmit` moet 0 errors geven.

---

## KRITIEKE REGELS

1. **Model: Claude Sonnet 4** (`claude-sonnet-4-20250514`) als primair model via Anthropic API. Sterkste in karakter vasthouden en genuanceerde brand strategy gesprekken. OpenAI gpt-4o als fallback. Provider + model configureerbaar via PersonaChatConfig in database.
2. **Streaming verplicht** — geen wachten op volledige response
3. **System prompt in database** — niet hardcoded. Wijzigbaar via admin config endpoint.
4. **Prompt template variabelen** — gebruik `{{naam}}` syntax, wordt server-side vervangen
5. **Knowledge context als tekst** — geselecteerde items worden als leesbare tekst in de prompt gezet, niet als JSON
6. **Max 50 berichten per sessie** — voorkomt te lange context windows. Toon waarschuwing bij 45.
7. **Token tracking** — sla prompt_tokens + completion_tokens op per bericht
8. **Geen PII logging** — log alleen persona ID + token counts, nooit prompt/response content
9. **💡 knop alleen op assistant berichten** — niet op user berichten
10. **Insights zijn per-sessie** — niet cross-sessie
11. **Geen andere personas als context** — expliciet uitgesloten uit de Knowledge Context Selector
12. **Error handling** — bij API fout: toon toast, geen crash. Bij rate limit: toon "Even wachten..." bericht.
13. **0 TypeScript errors** — `npx tsc --noEmit` clean na elke sessie
14. **Env vars** — `ANTHROPIC_API_KEY` (primair) + `OPENAI_API_KEY` (fallback) in .env.local. Installeer `@anthropic-ai/sdk` package.
15. **Anthropic system prompt** — Bij Anthropic gaat de system prompt als aparte `system` parameter, NIET als eerste message. Dit is anders dan OpenAI.

---

## DEFINITION OF DONE

- [ ] Chat stuurt berichten en ontvangt streaming antwoorden van Claude Sonnet 4 (Anthropic API)
- [ ] System prompt wordt opgebouwd uit persona data + template uit database
- [ ] "Add Context" knop opent modal met knowledge items (assets, products, insights, library, campaigns, deliverables, brandstyle)
- [ ] Geselecteerde context wordt geïnjecteerd in de system prompt
- [ ] Persona antwoordt inhoudelijk over de geselecteerde context
- [ ] 💡 knop op elk assistant bericht genereert een insight
- [ ] Insights verschijnen in de Insights tab als gekleurde cards
- [ ] "View in chat" scrollt naar het originele bericht
- [ ] Typing indicator zichtbaar tijdens streaming
- [ ] Token usage wordt bijgehouden per bericht
- [ ] System prompt config bewerkbaar via admin API endpoint
- [ ] Max 50 berichten per sessie met waarschuwing
- [ ] Graceful error handling (toasts, geen crashes)
- [ ] 0 TypeScript errors
