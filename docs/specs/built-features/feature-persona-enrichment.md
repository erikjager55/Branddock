# FEATURE: Persona Verrijking — 3 Nieuwe Secties + Platform-brede Doorvoer

## Overzicht
Voeg drie ontbrekende secties toe aan het persona-model die cruciaal zijn voor Branddock's content- en campagne-functies. De data moet doorstromen naar persona chat, content studio, en campaign strategy.

Nieuwe secties:
1. **Preferred Channels** — waar bereik je deze persona
2. **Quote & Bio** — een directe quote + korte narratieve beschrijving
3. **Buying Triggers & Decision Criteria** — wat triggert actie en weegt mee in beslissingen

---

## STAP 1: Prisma Schema Uitbreiding

In `prisma/schema.prisma`, voeg toe aan het `Persona` model (na `strategicImplications`):

```prisma
  // Nieuwe velden — persona verrijking
  preferredChannels   Json?    // ["LinkedIn", "Dribbble", "Design podcasts", ...]
  techStack           Json?    // ["Figma", "Notion", "Slack", "Miro", ...]
  quote               String?  @db.Text  // Directe quote die de persona's mindset vat
  bio                 String?  @db.Text  // Korte narratieve beschrijving (2-3 zinnen)
  buyingTriggers      Json?    // ["Team schaalt op", "Huidige tool mist features", ...]
  decisionCriteria    Json?    // ["Design quality", "Integraties", "Prijs", ...]
```

Run daarna: `pnpx prisma migrate dev --name add-persona-enrichment-fields`

---

## STAP 2: Seed Data Bijwerken

In `prisma/seed.ts`, werk de bestaande persona "Lisa Müller" (of de eerste seed persona) bij met:

```typescript
preferredChannels: ["LinkedIn", "Dribbble", "Medium", "Design podcasts", "UX conferences"],
techStack: ["Figma", "FigJam", "Notion", "Slack", "Miro", "Adobe Creative Suite"],
quote: "I shouldn't need a separate tool just to keep my brand consistent — it should be baked into my design workflow.",
bio: "Lisa is a senior UX designer at a mid-size design studio in Berlin, passionate about bridging the gap between brand strategy and user experience. After years of frustration with disconnected brand tools, she's actively looking for an integrated solution that speaks her design language.",
buyingTriggers: ["Current tools lack brand consistency features", "Team scaling requires better collaboration", "Client demands for brand-aligned deliverables increasing", "New project with strict brand guidelines"],
decisionCriteria: ["Design quality and aesthetics of the tool itself", "Figma integration", "Ease of onboarding for creative teams", "Price vs. feature balance", "Quality of AI-generated outputs"],
```

Doe hetzelfde (met passende data) voor de tweede seed persona (Marcus).

---

## STAP 3: API Routes Bijwerken

### 3a. PATCH `/api/personas/[personaId]/route.ts`
Voeg de nieuwe velden toe aan de Zod schema en de Prisma update:

```typescript
// In het updatePersonaSchema, voeg toe:
preferredChannels: z.array(z.string()).optional(),
techStack: z.array(z.string()).optional(),
quote: z.string().max(500).optional().nullable(),
bio: z.string().max(1000).optional().nullable(),
buyingTriggers: z.array(z.string()).optional(),
decisionCriteria: z.array(z.string()).optional(),
```

### 3b. POST `/api/personas/route.ts`
Zelfde velden toevoegen aan het create schema.

### 3c. GET routes
De velden worden automatisch meegenomen door Prisma als ze in het model zitten. Geen aanpassingen nodig tenzij er `select` statements zijn die specifieke velden kiezen — controleer dit.

---

## STAP 4: UI — Drie Nieuwe Secties op Persona Detail Page

In het **actieve** persona detail component (waarschijnlijk `src/features/personas/components/detail/`) — NIET in het legacy `src/components/personas/PersonaContent.tsx`.

### 4a. Quote & Bio Sectie
Plaats deze direct ONDER de Demographics card, BOVEN Psychographics.

```tsx
{/* Quote & Bio */}
<Card className="border border-gray-200 dark:border-gray-800 shadow-sm">
  <CardContent className="p-6">
    {/* Quote */}
    {persona.quote && (
      <blockquote className="border-l-4 border-emerald-400 pl-4 py-2 mb-4">
        <p className="text-base italic text-foreground">"{persona.quote}"</p>
      </blockquote>
    )}
    {/* Bio */}
    {persona.bio && (
      <p className="text-sm text-muted-foreground leading-relaxed">{persona.bio}</p>
    )}
    {/* Empty state */}
    {!persona.quote && !persona.bio && (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground mb-2">No quote or bio yet</p>
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Generate with AI
        </Button>
      </div>
    )}
  </CardContent>
</Card>
```

### 4b. Preferred Channels & Tech Stack Sectie
Plaats na Psychographics, vóór Goals/Motivations/Frustrations.

Ontwerp: een card met twee sub-secties naast elkaar (2-koloms grid).

```tsx
{/* Channels & Tools */}
<Card className="border border-gray-200 dark:border-gray-800 shadow-sm">
  <CardContent className="p-6">
    <div className="flex items-center gap-2 mb-4">
      <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
        <Radio className="h-4 w-4 text-indigo-600" />
      </div>
      <div>
        <h3 className="font-semibold text-sm">Channels & Tools</h3>
        <p className="text-xs text-muted-foreground">Where to reach this persona and what they use</p>
      </div>
      <Badge variant="outline" className="ml-auto text-xs border-indigo-200 text-indigo-600">
        high impact
      </Badge>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Preferred Channels */}
      <div className="bg-indigo-50/30 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 rounded-lg p-4">
        <h4 className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Megaphone className="h-4 w-4" />
          Preferred Channels
        </h4>
        <div className="flex flex-wrap gap-2">
          {(persona.preferredChannels || []).map((channel: string) => (
            <Badge key={channel} variant="outline" className="bg-white dark:bg-gray-900 text-xs">
              {channel}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {(persona.preferredChannels || []).length} channels
        </p>
      </div>

      {/* Tech Stack */}
      <div className="bg-slate-50/30 dark:bg-slate-900/10 border border-slate-100 dark:border-slate-800 rounded-lg p-4">
        <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          Tech Stack & Tools
        </h4>
        <div className="flex flex-wrap gap-2">
          {(persona.techStack || []).map((tool: string) => (
            <Badge key={tool} variant="outline" className="bg-white dark:bg-gray-900 text-xs">
              {tool}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {(persona.techStack || []).length} tools
        </p>
      </div>
    </div>
  </CardContent>
</Card>
```

### 4c. Buying Triggers & Decision Criteria Sectie
Plaats NA Behaviors/Strategic Implications, VÓÓR Research & Validation.

```tsx
{/* Buying Triggers & Decision Criteria */}
<Card className="border border-gray-200 dark:border-gray-800 shadow-sm">
  <CardContent className="p-6">
    <div className="flex items-center gap-2 mb-4">
      <div className="h-8 w-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
        <ShoppingCart className="h-4 w-4 text-orange-600" />
      </div>
      <div>
        <h3 className="font-semibold text-sm">Buying Triggers & Decision Criteria</h3>
        <p className="text-xs text-muted-foreground">What triggers action and influences decisions</p>
      </div>
      <Badge variant="outline" className="ml-auto text-xs border-orange-200 text-orange-600">
        high impact
      </Badge>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Buying Triggers */}
      <div className="bg-orange-50/30 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800 rounded-lg p-4">
        <h4 className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-3">
          ⚡ Buying Triggers
        </h4>
        <ul className="space-y-2">
          {(persona.buyingTriggers || []).map((trigger: string, i: number) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
              <span>{trigger}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Decision Criteria */}
      <div className="bg-amber-50/30 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 rounded-lg p-4">
        <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-3">
          ⚖️ Decision Criteria
        </h4>
        <ul className="space-y-2">
          {(persona.decisionCriteria || []).map((criterion: string, i: number) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <span>{criterion}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </CardContent>
</Card>
```

### 4d. Edit Mode
Als er al een edit mode bestaat voor de persona velden, voeg dan editors toe voor de nieuwe velden:
- `quote`: textarea
- `bio`: textarea
- `preferredChannels`: tag-input (komma-gescheiden)
- `techStack`: tag-input
- `buyingTriggers`: lijst met add/remove
- `decisionCriteria`: lijst met add/remove

---

## STAP 5: Persona Context Utility Bijwerken

**Dit is cruciaal voor de doorvoer naar chat, content, en campaigns.**

Als `src/lib/ai/persona-context.ts` al bestaat (vanuit FLOW-1), werk het bij. Als het nog niet bestaat, maak het aan.

### `buildPersonaContext(persona)`

Voeg de nieuwe velden toe aan de context output:

```typescript
export function buildPersonaContext(persona: any): { summary: string; full: string } {
  const parts = [
    `Name: ${persona.name}`,
    persona.tagline ? `Tagline: ${persona.tagline}` : null,
    persona.bio ? `Bio: ${persona.bio}` : null,
    persona.quote ? `Quote: "${persona.quote}"` : null,
    
    // Demographics
    persona.age ? `Age: ${persona.age}` : null,
    persona.gender ? `Gender: ${persona.gender}` : null,
    persona.location ? `Location: ${persona.location}` : null,
    persona.occupation ? `Occupation: ${persona.occupation}` : null,
    persona.education ? `Education: ${persona.education}` : null,
    persona.income ? `Income: ${persona.income}` : null,
    persona.familyStatus ? `Family: ${persona.familyStatus}` : null,
    
    // Psychographics
    persona.personalityType ? `Personality: ${persona.personalityType}` : null,
    persona.coreValues?.length ? `Core Values: ${persona.coreValues.join(', ')}` : null,
    persona.interests?.length ? `Interests: ${persona.interests.join(', ')}` : null,
    
    // Goals, Motivations, Frustrations
    persona.goals?.length ? `Goals: ${persona.goals.join('; ')}` : null,
    persona.motivations?.length ? `Motivations: ${persona.motivations.join('; ')}` : null,
    persona.frustrations?.length ? `Frustrations: ${persona.frustrations.join('; ')}` : null,
    
    // Behaviors
    persona.behaviors?.length ? `Behaviors: ${persona.behaviors.join('; ')}` : null,
    
    // NIEUWE VELDEN
    persona.preferredChannels?.length ? `Preferred Channels: ${persona.preferredChannels.join(', ')}` : null,
    persona.techStack?.length ? `Tech Stack: ${persona.techStack.join(', ')}` : null,
    persona.buyingTriggers?.length ? `Buying Triggers: ${persona.buyingTriggers.join('; ')}` : null,
    persona.decisionCriteria?.length ? `Decision Criteria: ${persona.decisionCriteria.join('; ')}` : null,
    
    // Strategic Implications
    persona.strategicImplications ? `Strategic Implications: ${JSON.stringify(persona.strategicImplications)}` : null,
  ].filter(Boolean);

  const summary = [
    `${persona.name} (${persona.occupation || 'Unknown role'}, ${persona.location || 'Unknown location'})`,
    persona.tagline,
    persona.quote ? `"${persona.quote}"` : null,
  ].filter(Boolean).join(' — ');

  return { summary, full: parts.join('\n') };
}
```

---

## STAP 6: Persona Chat Doorvoer

In het persona chat component (of de toekomstige API route `/api/personas/chat`), zorg dat de system prompt de nieuwe velden meeneemt.

Voeg specifiek toe aan het system prompt:

```typescript
const systemPromptAdditions = [
  // Kanaalkennis — persona weet waar ze actief is
  persona.preferredChannels?.length
    ? `You actively use these channels: ${persona.preferredChannels.join(', ')}. Reference them naturally when discussing how you discover tools or stay informed.`
    : null,
  
  // Tech stack — persona weet welke tools ze gebruikt
  persona.techStack?.length
    ? `Your daily tools include: ${persona.techStack.join(', ')}. You have strong opinions about these and compare new tools against your existing workflow.`
    : null,
  
  // Quote — kernhouding
  persona.quote
    ? `Your core belief can be summarized as: "${persona.quote}". This shapes how you evaluate solutions.`
    : null,
  
  // Buying triggers — wanneer de persona actief gaat zoeken
  persona.buyingTriggers?.length
    ? `You would start actively looking for a new solution when: ${persona.buyingTriggers.join('; ')}. These are your buying triggers.`
    : null,
  
  // Decision criteria — hoe de persona evalueert
  persona.decisionCriteria?.length
    ? `When evaluating tools, you prioritize: ${persona.decisionCriteria.join(', ')}. Weight these naturally in conversations about products or solutions.`
    : null,
].filter(Boolean).join('\n\n');
```

Dit zorgt ervoor dat als je in de chat vraagt "Hoe ontdek je nieuwe tools?" of "Wat is belangrijk voor je bij het kiezen van software?", de persona antwoord geeft op basis van de echte data.

---

## STAP 7: Content Studio Doorvoer

In `/api/ai/generate/route.ts` (of de toekomstige uitbreiding met persona context), als persona's worden meegestuurd:

Voeg aan de system prompt toe:

```
Target Persona Channel Preferences:
- [persona.name] is most active on: [channels]
- [persona.name] evaluates based on: [decisionCriteria]
- Key triggers that would make [persona.name] act: [buyingTriggers]

Optimize the content for these channels and address these triggers and criteria where relevant.
```

---

## STAP 8: Campaign Strategy Doorvoer

Bij campaign strategy generatie, als persona context wordt opgebouwd, zijn de nieuwe velden automatisch beschikbaar via `buildPersonaContext()` (Stap 5). De channel preferences voeden direct de channel strategy, buying triggers voeden de messaging, en decision criteria voeden de value proposition.

Geen extra code nodig als `buildPersonaContext()` correct is bijgewerkt — het stroomt automatisch door.

---

## STAP 9: TypeScript Types Bijwerken

In het persona type bestand (zoek naar `interface Persona` of `type Persona`), voeg toe:

```typescript
preferredChannels?: string[];
techStack?: string[];
quote?: string | null;
bio?: string | null;
buyingTriggers?: string[];
decisionCriteria?: string[];
```

---

## Samenvatting Volgorde

1. **Prisma schema** + migrate (EERST)
2. **Seed data** bijwerken
3. **API routes** bijwerken (create + update schemas)
4. **TypeScript types** bijwerken
5. **UI secties** toevoegen op detail page
6. **Persona context utility** bijwerken (doorvoer)
7. **Chat system prompt** bijwerken (doorvoer)

Stappen 5-7 kunnen parallel als stap 1-4 klaar zijn.

---

Na afronding: `git add -A && git commit -m "feat(personas): add channels, quote/bio, buying triggers + platform-wide context integration" && git push origin main`
