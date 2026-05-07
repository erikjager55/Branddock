# DYNAMISCH CONTEXT SYSTEEM — Toekomstbestendig AI Context Protocol

## Laatst bijgewerkt: 20 februari 2026

---

## PROBLEEM

Als je een nieuw veld toevoegt aan een persona (bijv. "karakter"), een nieuw product aanmaakt, een brand asset toevoegt (bijv. "Brand Story"), of een campaign deliverable wijzigt — dan moet die informatie **automatisch** beschikbaar zijn in:

1. De **Persona Chat system prompt** (persona data)
2. De **Knowledge Context** (alle selecteerbare items)
3. De **Insight extractie** (begrijpt de nieuwe context)

Zonder dat iemand code hoeft aan te passen.

---

## ONTWERPPRINCIPE

```
┌─────────────────────────────────────────────────────────────┐
│                    GOUDEN REGEL                              │
│                                                              │
│  De database is de ENIGE bron van waarheid.                  │
│  Code beschrijft NOOIT welke velden er zijn.                 │
│  Code ONTDEKT welke velden er zijn.                          │
│                                                              │
│  → Nieuw veld in Prisma schema + migratie = automatisch      │
│    beschikbaar in chat, context, insights.                   │
│  → Nieuw record in database = automatisch selecteerbaar      │
│    in Knowledge Context modal.                               │
└─────────────────────────────────────────────────────────────┘
```

---

## ARCHITECTUUR

```
┌──────────────────────────────────────────────────────────────┐
│                    Context Registry                           │
│         (src/lib/ai/context/registry.ts)                     │
│                                                              │
│  Definieert WELKE tabellen beschikbaar zijn als context       │
│  en HOE ze opgehaald worden — maar NIET welke velden.         │
│                                                              │
│  ┌────────────────────────────────────────────────────┐      │
│  │  { key: "products",                                │      │
│  │    label: "Products & Services",                   │      │
│  │    icon: "Package",                                │      │
│  │    prismaModel: "product",                         │      │
│  │    titleField: "name",                             │      │
│  │    descriptionField: "description",                │      │
│  │    statusField: "status",                          │      │
│  │    excludeFields: ["id","createdAt","updatedAt",   │      │
│  │                     "workspaceId","deletedAt"],     │      │
│  │    includeRelations: ["features","pricing"] }      │      │
│  └────────────────────────────────────────────────────┘      │
│                                                              │
│  Eén entry per contexttype. Voeg nieuwe entries toe           │
│  als je een NIEUW type content beschikbaar wilt maken.        │
│  Bestaande velden binnen een type worden AUTOMATISCH          │
│  meegenomen.                                                  │
└──────────────────────┬───────────────────────────────────────┘
                       │
          ┌────────────┼────────────────┐
          ▼            ▼                ▼
┌─────────────┐ ┌────────────┐ ┌──────────────┐
│  Persona    │ │ Knowledge  │ │  Context     │
│  Serializer │ │ Context    │ │  Serializer  │
│             │ │ Fetcher    │ │  (generiek)  │
│ Pakt ALLE   │ │ Haalt ALLE │ │ Zet ELKE     │
│ persona     │ │ items op   │ │ record om    │
│ velden +    │ │ per type   │ │ naar leesbare│
│ relaties    │ │ uit DB     │ │ tekst voor   │
│ dynamisch   │ │            │ │ de LLM       │
└─────────────┘ └────────────┘ └──────────────┘
```

---

## DEEL 1 — Context Registry

**Bestand:** `src/lib/ai/context/registry.ts`

De registry is de ENIGE plek waar je configureert welke database-tabellen beschikbaar zijn als AI context. Per tabel definieer je alleen de metadata — nooit de individuele velden.

```typescript
export interface ContextSourceConfig {
  // Identiteit
  key: string;                    // Unieke sleutel, bijv. "products"
  label: string;                  // UI label, bijv. "Products & Services"
  icon: string;                   // Lucide icon naam, bijv. "Package"
  category: 'knowledge' | 'strategy' | 'brand' | 'validation';
  
  // Database mapping
  prismaModel: string;            // Prisma model naam (lowercase), bijv. "product"
  workspaceFilter: string;        // Veld voor workspace filtering, bijv. "workspaceId"
  
  // Weergave velden (voor de selector modal)
  titleField: string;             // Welk veld als titel, bijv. "name"
  descriptionField?: string;      // Welk veld als beschrijving
  statusField?: string;           // Welk veld als status badge
  
  // Serialisatie regels
  excludeFields: string[];        // Velden die NOOIT naar de LLM gaan
  includeRelations?: string[];    // Relaties die mee opgehaald worden
  
  // Optioneel: custom formatting
  formatHints?: Record<string, 'currency' | 'date' | 'list' | 'percentage' | 'json_summary'>;
}

export const CONTEXT_REGISTRY: ContextSourceConfig[] = [
  // ────────────────────────────────────
  // BRAND
  // ────────────────────────────────────
  {
    key: 'brand_assets',
    label: 'Brand Assets',
    icon: 'Fingerprint',
    category: 'brand',
    prismaModel: 'brandAsset',
    workspaceFilter: 'workspaceId',
    titleField: 'name',
    descriptionField: 'description',
    statusField: 'status',
    excludeFields: ['id', 'createdAt', 'updatedAt', 'workspaceId', 'deletedAt', 'sortOrder'],
    includeRelations: ['attributes', 'researchCoverage'],
  },
  {
    key: 'brandstyle',
    label: 'Brand Style',
    icon: 'Palette',
    category: 'brand',
    prismaModel: 'brandStyleguide',
    workspaceFilter: 'workspaceId',
    titleField: 'name',
    descriptionField: 'description',
    statusField: 'status',
    excludeFields: ['id', 'createdAt', 'updatedAt', 'workspaceId', 'deletedAt'],
    includeRelations: ['colors', 'typography', 'toneOfVoice'],
  },

  // ────────────────────────────────────
  // KNOWLEDGE
  // ────────────────────────────────────
  {
    key: 'products',
    label: 'Products & Services',
    icon: 'Package',
    category: 'knowledge',
    prismaModel: 'product',
    workspaceFilter: 'workspaceId',
    titleField: 'name',
    descriptionField: 'description',
    statusField: 'status',
    excludeFields: ['id', 'createdAt', 'updatedAt', 'workspaceId', 'deletedAt', 'sortOrder'],
    includeRelations: ['features', 'pricing', 'targetAudience'],
    formatHints: { price: 'currency', features: 'list' },
  },
  {
    key: 'market_insights',
    label: 'Market Insights',
    icon: 'TrendingUp',
    category: 'knowledge',
    prismaModel: 'marketInsight',
    workspaceFilter: 'workspaceId',
    titleField: 'title',
    descriptionField: 'description',
    statusField: 'impactLevel',
    excludeFields: ['id', 'createdAt', 'updatedAt', 'workspaceId', 'deletedAt'],
    includeRelations: ['industries', 'tags', 'sources'],
  },
  {
    key: 'knowledge_resources',
    label: 'Knowledge Library',
    icon: 'BookOpen',
    category: 'knowledge',
    prismaModel: 'knowledgeResource',
    workspaceFilter: 'workspaceId',
    titleField: 'title',
    descriptionField: 'summary',
    statusField: 'status',
    excludeFields: ['id', 'createdAt', 'updatedAt', 'workspaceId', 'deletedAt', 'fileUrl', 'fileSize'],
    includeRelations: ['tags', 'keyTakeaways'],
  },

  // ────────────────────────────────────
  // STRATEGY
  // ────────────────────────────────────
  {
    key: 'campaigns',
    label: 'Campaigns',
    icon: 'Megaphone',
    category: 'strategy',
    prismaModel: 'campaign',
    workspaceFilter: 'workspaceId',
    titleField: 'name',
    descriptionField: 'description',
    statusField: 'status',
    excludeFields: ['id', 'createdAt', 'updatedAt', 'workspaceId', 'deletedAt'],
    includeRelations: ['deliverables', 'targetPersonas'],
  },
  {
    key: 'deliverables',
    label: 'Content & Deliverables',
    icon: 'FileText',
    category: 'strategy',
    prismaModel: 'deliverable',
    workspaceFilter: 'workspaceId',
    titleField: 'name',
    descriptionField: 'contentType',
    statusField: 'status',
    excludeFields: ['id', 'createdAt', 'updatedAt', 'workspaceId', 'deletedAt', 'rawContent'],
    includeRelations: ['campaign'],
    // rawContent is excluded — te groot. Gebruik 'generatedContent' snippet.
  },
];

// ────────────────────────────────────
// EXPLICIET UITGESLOTEN (met reden)
// ────────────────────────────────────
// Personas      → Je praat AL met een persona, tweede persona als context is verwarrend
// Questionnaires → Meta/configuratie, geen inhoudelijke kennis
// Research Hub   → Configuratie, niet relevant voor gesprek
// Settings       → Systeemconfig, niet relevant
// OKRs/Strategy  → Te abstract, verwarrend voor persona karakter
```

### Nieuw type toevoegen in de toekomst

Als je bijvoorbeeld een "Brand Story" model toevoegt aan Prisma:

```typescript
// 1. Voeg Prisma model toe + migratie
// 2. Voeg één entry toe aan CONTEXT_REGISTRY:
{
  key: 'brand_stories',
  label: 'Brand Stories',
  icon: 'BookHeart',
  category: 'brand',
  prismaModel: 'brandStory',
  workspaceFilter: 'workspaceId',
  titleField: 'title',
  descriptionField: 'narrative',
  statusField: 'status',
  excludeFields: ['id', 'createdAt', 'updatedAt', 'workspaceId'],
  includeRelations: ['chapters', 'themes'],
}
// 3. Klaar. De modal, fetcher, serializer en prompt builder pikken het automatisch op.
```

---

## DEEL 2 — Generieke Context Serializer

**Bestand:** `src/lib/ai/context/serializer.ts`

De serializer zet ELK database record om naar leesbare tekst voor de LLM. Hij kent GEEN specifieke velden — hij ontdekt ze dynamisch.

```typescript
interface SerializeOptions {
  config: ContextSourceConfig;
  record: Record<string, any>;
  maxLength?: number;           // Max karakters per item (default: 2000)
}

export function serializeToText(options: SerializeOptions): string {
  const { config, record, maxLength = 2000 } = options;
  const lines: string[] = [];
  
  // Titel
  const title = record[config.titleField];
  lines.push(`### ${config.label}: ${title}`);
  
  // Beschrijving (als die er is)
  if (config.descriptionField && record[config.descriptionField]) {
    lines.push(record[config.descriptionField]);
    lines.push('');
  }
  
  // Alle overige velden dynamisch
  for (const [key, value] of Object.entries(record)) {
    // Skip uitgesloten velden
    if (config.excludeFields.includes(key)) continue;
    // Skip titel en beschrijving (al afgehandeld)
    if (key === config.titleField || key === config.descriptionField) continue;
    // Skip null/undefined/lege waarden
    if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) continue;
    
    const label = formatFieldLabel(key);
    const formatted = formatFieldValue(key, value, config.formatHints);
    lines.push(`- **${label}:** ${formatted}`);
  }
  
  // Relaties
  if (config.includeRelations) {
    for (const relation of config.includeRelations) {
      const relData = record[relation];
      if (!relData || (Array.isArray(relData) && relData.length === 0)) continue;
      
      lines.push('');
      lines.push(`**${formatFieldLabel(relation)}:**`);
      
      if (Array.isArray(relData)) {
        for (const item of relData) {
          if (typeof item === 'object') {
            // Pak het meest informatieve veld (name, title, content, text, value)
            const summary = extractSummary(item);
            lines.push(`  - ${summary}`);
          } else {
            lines.push(`  - ${item}`);
          }
        }
      } else if (typeof relData === 'object') {
        const summary = extractSummary(relData);
        lines.push(`  ${summary}`);
      }
    }
  }
  
  const result = lines.join('\n');
  return result.length > maxLength ? result.substring(0, maxLength) + '\n  [...]' : result;
}

// ── Helper functies ──

function formatFieldLabel(key: string): string {
  // camelCase → Title Case: "targetAudience" → "Target Audience"
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

function formatFieldValue(
  key: string, 
  value: any, 
  hints?: Record<string, string>
): string {
  const hint = hints?.[key];
  
  // Arrays → comma-separated of bullet list
  if (Array.isArray(value)) {
    if (value.length <= 5 && value.every(v => typeof v === 'string')) {
      return value.join(', ');
    }
    return '\n' + value.map(v => `    - ${typeof v === 'object' ? extractSummary(v) : v}`).join('\n');
  }
  
  // Objecten → samenvatten
  if (typeof value === 'object' && value !== null) {
    return extractSummary(value);
  }
  
  // Format hints
  if (hint === 'currency' && typeof value === 'number') {
    return `€${value.toLocaleString('nl-NL')}`;
  }
  if (hint === 'percentage' && typeof value === 'number') {
    return `${value}%`;
  }
  if (hint === 'date' && value) {
    return new Date(value).toLocaleDateString('nl-NL');
  }
  
  // Booleans
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  // Lange strings inkorten
  if (typeof value === 'string' && value.length > 500) {
    return value.substring(0, 500) + '...';
  }
  
  return String(value);
}

function extractSummary(obj: Record<string, any>): string {
  // Zoek het meest informatieve veld in volgorde van prioriteit
  const priorityFields = ['name', 'title', 'content', 'text', 'value', 'label', 'description', 'summary'];
  
  for (const field of priorityFields) {
    if (obj[field] && typeof obj[field] === 'string') {
      const val = obj[field];
      return val.length > 200 ? val.substring(0, 200) + '...' : val;
    }
  }
  
  // Fallback: pak alle string velden
  const strings = Object.entries(obj)
    .filter(([k, v]) => typeof v === 'string' && !['id', 'createdAt', 'updatedAt'].includes(k))
    .map(([k, v]) => `${formatFieldLabel(k)}: ${v}`)
    .slice(0, 3);
  
  return strings.join(' | ') || JSON.stringify(obj).substring(0, 100);
}
```

---

## DEEL 3 — Dynamische Persona Serializer

**Bestand:** `src/lib/ai/context/persona-serializer.ts`

De persona serializer werkt op hetzelfde principe: hij ontdekt dynamisch welke velden de persona heeft.

```typescript
const PERSONA_EXCLUDE_FIELDS = [
  'id', 'createdAt', 'updatedAt', 'workspaceId', 'deletedAt',
  'sortOrder', 'imageUrl', 'avatarColor',  // Visuele velden, niet relevant voor LLM
];

// Groepering voor betere prompt structuur
const PERSONA_FIELD_GROUPS: Record<string, string[]> = {
  'Demographics': ['ageRange', 'occupation', 'location', 'education', 'income', 'familyStatus'],
  'Personality': ['personalityType', 'coreValues', 'interests'],
  'Drivers': ['goals', 'motivations'],
  'Barriers': ['frustrations', 'objections'],
  'Behavior': ['behaviors', 'buyingPatterns', 'mediaConsumption', 'decisionFactors'],
};

export function serializePersona(persona: Record<string, any>): string {
  const lines: string[] = [];
  
  // Naam en beschrijving altijd eerst
  lines.push(`You are ${persona.name}.`);
  if (persona.description) lines.push(persona.description);
  lines.push('');
  
  // Gegroepeerde velden
  const handledFields = new Set<string>(['name', 'description', ...PERSONA_EXCLUDE_FIELDS]);
  
  for (const [groupName, fields] of Object.entries(PERSONA_FIELD_GROUPS)) {
    const groupLines: string[] = [];
    
    for (const field of fields) {
      handledFields.add(field);
      const value = persona[field];
      if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) continue;
      
      const label = formatFieldLabel(field);
      const formatted = formatPersonaFieldValue(value);
      groupLines.push(`- ${label}: ${formatted}`);
    }
    
    if (groupLines.length > 0) {
      lines.push(`## ${groupName}`);
      lines.push(...groupLines);
      lines.push('');
    }
  }
  
  // ── CRUCIAAL: Onbekende/nieuwe velden automatisch oppikken ──
  const unknownFields: string[] = [];
  for (const [key, value] of Object.entries(persona)) {
    if (handledFields.has(key)) continue;
    if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) continue;
    // Skip relaties die objecten zijn (worden apart afgehandeld)
    if (typeof value === 'object' && !Array.isArray(value)) continue;
    
    const label = formatFieldLabel(key);
    const formatted = formatPersonaFieldValue(value);
    unknownFields.push(`- ${label}: ${formatted}`);
  }
  
  if (unknownFields.length > 0) {
    lines.push(`## Additional Characteristics`);
    lines.push(...unknownFields);
    lines.push('');
  }
  
  // Relaties (sub-objecten) dynamisch meenemen
  for (const [key, value] of Object.entries(persona)) {
    if (handledFields.has(key)) continue;
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    
    // Dit is een relatie-object — serialiseer het
    const label = formatFieldLabel(key);
    lines.push(`## ${label}`);
    lines.push(extractSummary(value));
    lines.push('');
  }
  
  return lines.join('\n');
}

function formatPersonaFieldValue(value: any): string {
  if (Array.isArray(value)) {
    // Array van objecten met 'text' veld (goals, motivations, etc.)
    if (value.length > 0 && typeof value[0] === 'object' && value[0].text) {
      return value.map(v => v.text).join(', ');
    }
    // Array van strings
    if (value.every(v => typeof v === 'string')) {
      return value.join(', ');
    }
    return value.map(v => typeof v === 'object' ? extractSummary(v) : String(v)).join(', ');
  }
  
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string' && value.length > 500) return value.substring(0, 500) + '...';
  
  return String(value);
}
```

### Wat er gebeurt als je een veld "karakter" toevoegt:

1. Je voegt `karakter String?` toe aan het Persona model in Prisma
2. Je draait `prisma migrate dev`
3. Je vult "Creatief en impulsief" in bij Lisa
4. De serializer pikt het automatisch op onder "Additional Characteristics":
   ```
   ## Additional Characteristics
   - Karakter: Creatief en impulsief
   ```
5. **Geen code wijziging nodig**

### Wat er gebeurt als je het veld later wilt groeperen:

Voeg het toe aan `PERSONA_FIELD_GROUPS`:
```typescript
'Personality': ['personalityType', 'coreValues', 'interests', 'karakter'],
```
Nu verschijnt het onder "Personality" in plaats van "Additional Characteristics".

---

## DEEL 4 — Generieke Knowledge Context Fetcher

**Bestand:** `src/lib/ai/context/fetcher.ts`

De fetcher haalt items op uit de database op basis van de registry config. Hij kent geen specifieke tabellen — hij leest de config.

```typescript
import { PrismaClient } from '@prisma/client';
import { CONTEXT_REGISTRY, ContextSourceConfig } from './registry';
import { serializeToText } from './serializer';

const prisma = new PrismaClient();

// ── Alle beschikbare items ophalen (voor de modal) ──

export async function getAvailableContextItems(workspaceId: string): Promise<ContextGroup[]> {
  const groups: ContextGroup[] = [];
  
  for (const config of CONTEXT_REGISTRY) {
    try {
      // Dynamische Prisma query op basis van config
      const model = (prisma as any)[config.prismaModel];
      if (!model) continue;
      
      // Bouw include object voor relaties
      const include: Record<string, boolean> = {};
      if (config.includeRelations) {
        for (const rel of config.includeRelations) {
          include[rel] = true;
        }
      }
      
      const items = await model.findMany({
        where: { [config.workspaceFilter]: workspaceId },
        include: Object.keys(include).length > 0 ? include : undefined,
        orderBy: { [config.titleField]: 'asc' },
      });
      
      if (items.length === 0) continue;
      
      groups.push({
        key: config.key,
        label: config.label,
        icon: config.icon,
        category: config.category,
        items: items.map((item: any) => ({
          sourceType: config.key,
          sourceId: item.id,
          title: item[config.titleField] || 'Untitled',
          description: config.descriptionField ? item[config.descriptionField] : undefined,
          status: config.statusField ? item[config.statusField] : undefined,
        })),
      });
    } catch (error) {
      // Model bestaat mogelijk niet meer of relatie is gewijzigd
      console.warn(`Context fetch failed for ${config.key}:`, error);
      continue;
    }
  }
  
  return groups;
}

// ── Geselecteerde items serialiseren voor de prompt ──

export async function serializeContextForPrompt(
  selectedItems: { sourceType: string; sourceId: string }[],
  workspaceId: string
): Promise<string> {
  if (selectedItems.length === 0) return '';
  
  const sections: string[] = [];
  
  for (const item of selectedItems) {
    const config = CONTEXT_REGISTRY.find(c => c.key === item.sourceType);
    if (!config) continue;
    
    try {
      const model = (prisma as any)[config.prismaModel];
      if (!model) continue;
      
      const include: Record<string, boolean> = {};
      if (config.includeRelations) {
        for (const rel of config.includeRelations) {
          include[rel] = true;
        }
      }
      
      const record = await model.findFirst({
        where: { id: item.sourceId, [config.workspaceFilter]: workspaceId },
        include: Object.keys(include).length > 0 ? include : undefined,
      });
      
      if (!record) continue;
      
      sections.push(serializeToText({ config, record }));
    } catch (error) {
      console.warn(`Context serialize failed for ${item.sourceType}/${item.sourceId}:`, error);
      continue;
    }
  }
  
  if (sections.length === 0) return '';
  
  return `\n## ADDITIONAL CONTEXT\nThe following information has been shared with you for discussion:\n\n${sections.join('\n\n')}`;
}

// ── Types ──

interface ContextGroup {
  key: string;
  label: string;
  icon: string;
  category: string;
  items: {
    sourceType: string;
    sourceId: string;
    title: string;
    description?: string;
    status?: string;
  }[];
}
```

---

## DEEL 5 — Aangepaste System Prompt Builder

**Bestand:** `src/lib/ai/context/prompt-builder.ts`

De prompt builder combineert: template + persona data + knowledge context. De template zelf wordt simpeler omdat de persona serializer het zware werk doet.

```typescript
import { serializePersona } from './persona-serializer';
import { serializeContextForPrompt } from './fetcher';

export async function buildSystemPrompt(params: {
  template: string;              // Uit PersonaChatConfig
  persona: Record<string, any>;  // Volledige persona record met relaties
  selectedContext?: { sourceType: string; sourceId: string }[];
  workspaceId: string;
}): Promise<string> {
  
  // 1. Serialiseer persona dynamisch
  const personaContext = serializePersona(params.persona);
  
  // 2. Serialiseer knowledge context dynamisch
  const knowledgeContext = params.selectedContext 
    ? await serializeContextForPrompt(params.selectedContext, params.workspaceId)
    : '';
  
  // 3. Vervang template variabelen
  let prompt = params.template;
  prompt = prompt.replace('{{PERSONA_CONTEXT}}', personaContext);
  prompt = prompt.replace('{{KNOWLEDGE_CONTEXT}}', knowledgeContext);
  prompt = prompt.replace('{{PERSONA_NAME}}', params.persona.name || 'this person');
  
  return prompt;
}
```

### Bijgewerkte System Prompt Template

De template wordt eenvoudiger — hij delegeert naar de dynamische serializers:

```
You are a real person. You are NOT an AI assistant. Stay in character at all times.

{{PERSONA_CONTEXT}}

{{KNOWLEDGE_CONTEXT}}

## CONVERSATION RULES
1. ALWAYS stay in character as {{PERSONA_NAME}}. Never break character or acknowledge being AI.
2. Respond naturally — use vocabulary, emotional tone, and perspective matching this person.
3. When asked about products, services, or brands: react authentically based on your goals, frustrations, and behaviors.
4. Share personal opinions and experiences. Be specific, not generic.
5. If something doesn't align with your values or needs, say so clearly and explain why.
6. Show emotion where appropriate — enthusiasm, skepticism, frustration, excitement.
7. Keep responses conversational — typically 2-4 paragraphs unless more detail is asked for.
8. When discussing the additional context provided, reference specific details from it.
```

---

## TOEKOMSTSCENARIO'S — Bewijs dat het werkt

### Scenario 1: Nieuw persona veld "karakter"
```
→ Prisma: voeg `karakter String?` toe aan Persona model
→ Migratie draaien
→ Vul in bij Lisa: "Creatief, impulsief, visueel ingesteld"
→ Persona serializer pikt het automatisch op
→ System prompt bevat nu: "Karakter: Creatief, impulsief, visueel ingesteld"
→ CODE WIJZIGING: GEEN
```

### Scenario 2: Nieuw product "Branddock Enterprise"
```
→ Gebruiker maakt nieuw product aan in de UI
→ Knowledge Context modal toont het automatisch onder "Products & Services"
→ Gebruiker selecteert het in een chat
→ Serializer zet ALLE productvelden om naar tekst
→ CODE WIJZIGING: GEEN
```

### Scenario 3: Nieuw veld "targetMarket" bij Products
```
→ Prisma: voeg `targetMarket String?` toe aan Product model
→ Migratie draaien
→ Vul in: "European mid-market SaaS companies"
→ Serializer pikt het automatisch op bij product context
→ System prompt bevat nu: "Target Market: European mid-market SaaS companies"
→ CODE WIJZIGING: GEEN
```

### Scenario 4: Nieuw content type "Brand Story"
```
→ Prisma: maak BrandStory model aan
→ Migratie draaien
→ Voeg één entry toe aan CONTEXT_REGISTRY (10 regels)
→ Modal toont "Brand Stories" als nieuwe categorie
→ CODE WIJZIGING: 10 regels in registry.ts (eenmalig)
```

### Scenario 5: Verwijder een veld
```
→ Prisma: verwijder `faxNumber` uit Persona model
→ Migratie draaien
→ Serializer skipt het automatisch (veld bestaat niet meer)
→ CODE WIJZIGING: GEEN
```

---

## INTEGRATIE MET BESTAANDE OPDRACHT

Dit document vervangt de volgende secties in `OPDRACHT-PERSONA-CHAT-AI.md`:

| Oude sectie | Vervangen door |
|-------------|---------------|
| A2: Default System Prompt Template | Deel 5: Aangepaste template met `{{PERSONA_CONTEXT}}` en `{{KNOWLEDGE_CONTEXT}}` |
| A3: Prompt builder in persona-chat.ts | Deel 5: `prompt-builder.ts` |
| B2: Knowledge Context Fetcher (hardcoded per type) | Deel 4: Generieke fetcher via registry |
| B1: Modal data ophalen | Deel 4: `getAvailableContextItems()` |

### Bijgewerkte bestandsstructuur

```
src/lib/ai/context/
├── registry.ts              ← ENIGE config plek: welke tabellen = context
├── serializer.ts            ← Generiek: zet elk record om naar tekst
├── persona-serializer.ts    ← Persona-specifiek: dynamisch alle velden + groepering
├── fetcher.ts               ← Generiek: haalt items op via registry config
└── prompt-builder.ts        ← Combineert: template + persona + knowledge context
```

---

## KRITIEKE REGELS (aanvulling op OPDRACHT-PERSONA-CHAT-AI.md)

16. **NOOIT veldnamen hardcoden in serializers** — de serializer ontdekt velden dynamisch uit het database record
17. **Nieuwe Prisma velden = automatisch beschikbaar** — zonder code wijziging
18. **Nieuwe database records = automatisch selecteerbaar** — in de Knowledge Context modal
19. **Nieuw content TYPE = max 10 regels** — alleen een entry toevoegen aan CONTEXT_REGISTRY
20. **excludeFields is een denylist, geen allowlist** — alles is standaard INCLUSIEF tenzij expliciet uitgesloten
21. **Relaties worden automatisch mee-geserialiseerd** — mits opgegeven in `includeRelations`
22. **Graceful degradation** — als een model of relatie niet bestaat (na verwijdering), skipt de fetcher het zonder crash
