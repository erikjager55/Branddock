# Runway ML API Integration Plan — Persona Video Chat

## Laatst bijgewerkt: 12 maart 2026

---

## 1. Executive Summary

Dit document beschrijft het integratieplan voor de koppeling van Runway ML's **Characters API** (GWM-1 Avatars) aan het bestaande Persona Chat-systeem in Branddock. Het doel is om persona's visueel tot leven te brengen als real-time video-avatars waarmee gebruikers live gesprekken kunnen voeren — inclusief lipsync, gezichtsuitdrukkingen, oogbewegingen en gebaren.

### Wat verandert er?

| Huidige situatie | Na integratie |
|---|---|
| Tekst-chat met Claude Sonnet 4 (SSE streaming) | **Twee modi**: tekst-chat (bestaand) + video-chat (Runway Characters) |
| Persona is een tekstuele representatie | Persona heeft een **video-avatar** met stem, persoonlijkheid en knowledge base |
| Chat modal met berichten en typing indicator | **Video call interface** met real-time avatar, mic/camera controls |

### Waarom Runway Characters?

- **Eén foto = avatar**: Geen training nodig, instant avatar van persona's bestaande profielfoto
- **Real-time conversatie**: WebRTC-gebaseerd, lage latency, lip-sync + gezichtsexpressies
- **Knowledge base**: Tot 50 documenten per avatar — perfect voor brand context injectie
- **Personality/System prompt**: Volledige controle over hoe de avatar zich gedraagt
- **React SDK**: `@runwayml/avatars-react` met kant-en-klare componenten

---

## 2. Runway ML API — Technisch Overzicht

### 2.1 API Structuur

**Base URL**: `https://api.dev.runwayml.com` (via SDK)
**Authenticatie**: Bearer token via `RUNWAYML_API_SECRET` env var
**SDK**: `@runwayml/sdk` (Node.js, server-side) + `@runwayml/avatars-react` (React, client-side)

### 2.2 Relevante Endpoints

| Endpoint | Methode | Beschrijving |
|---|---|---|
| `client.avatars.create()` | POST | Avatar aanmaken (naam, referenceImage, personality, voice) |
| `client.avatars.update()` | PUT | Avatar bijwerken (system prompt, voice, knowledge docs) |
| `client.avatars.list()` | GET | Avatars lijst (paginated) |
| `client.realtimeSessions.create()` | POST | Real-time sessie starten (WebRTC credentials) |

### 2.3 Characters API — Kernconcepten

**Avatar creatie:**
```typescript
import RunwayML from '@runwayml/sdk';

const client = new RunwayML(); // leest RUNWAYML_API_SECRET

const avatar = await client.avatars.create({
  name: 'Sarah Chen - The Ambitious Startup Founder',
  referenceImage: 'https://example.com/sarah-chen-avatar.jpg',
  personality: 'You are Sarah Chen, a 32-year-old startup founder...',
  voice: { preset: 'emma' }, // 30+ preset stemmen
  imagePreprocessing: 'optimize',
});
// avatar.id → UUID voor sessies
```

**Real-time sessie:**
```typescript
const session = await client.realtimeSessions.create({
  model: 'gwm1_avatars',
  avatar: { type: 'custom', avatarId: avatar.id },
  maxDuration: 300, // 5 minuten max
});
// session.id, session.url, session.token, session.room_name → voor WebRTC
```

**React SDK (client-side):**
```tsx
import { AvatarCall } from '@runwayml/avatars-react';

<AvatarCall
  avatarId={persona.runwayAvatarId}
  connectUrl="/api/personas/[id]/video-chat/connect"
/>
```

### 2.4 Modellen & Pricing

| Model | Kosten | Toelichting |
|---|---|---|
| `gwm1_avatars` (GWM-1 Avatars) | Credits-based | Real-time video agent |
| Credits | $0.01 per credit | Aankoop via developer portal |

**Exacte kosten per minuut voor Characters API zijn nog niet publiek gedocumenteerd** — vermoedelijk vergelijkbaar met video-generatie (5-25 credits/sec afhankelijk van kwaliteit). Dit moet gevalideerd worden bij Runway's Enterprise team of via een testaccount.

**Geschatte kosten per 5-min gesprek**: 1500-7500 credits ($15-$75). Dit is significant en vereist een credit-budgettering per workspace.

### 2.5 Beperkingen

| Beperking | Waarde |
|---|---|
| Knowledge documenten per avatar | Max 50 |
| Sessie max duur | Configureerbaar (in seconden) |
| Concurrent sessies | Tier-afhankelijk (throttled bij overschrijding) |
| Browser support | Chrome 74+, Firefox 78+, Safari 14.1+, Edge 79+ |
| Vereist | Camera + microfoon permissies |
| Branding vereiste | "Powered by Runway" badge + link |

---

## 3. Huidige Persona Chat Architectuur

### 3.1 Flow (tekst-chat)

```
ChatWithPersonaModal
  → PersonaChatInterface (berichten + input)
    → usePersonaChat hook (state management)
      → persona-chat.api.ts (SSE streaming)
        → POST /api/personas/[id]/chat (Next.js route)
          → streamPersonaChat() (Claude Sonnet 4)
```

### 3.2 Kernbestanden

| Bestand | Rol |
|---|---|
| `src/features/personas/components/chat/ChatWithPersonaModal.tsx` | Modal container (header, tabs, content) |
| `src/features/personas/components/chat/PersonaChatInterface.tsx` | Chat UI (berichten, input, typing indicator) |
| `src/features/personas/hooks/usePersonaChat.ts` | Chat state (sessie, berichten, streaming, context, insights) |
| `src/features/personas/api/persona-chat.api.ts` | API calls (SSE stream, insights, context) |
| `src/app/api/personas/[id]/chat/route.ts` | Server route (sessie creatie + Claude streaming) |
| `src/features/personas/types/persona-chat.types.ts` | TypeScript types |
| `src/features/personas/stores/usePersonaChatStore.ts` | Zustand store (UI state) |

### 3.3 Huidige capabilities

- **Streaming**: SSE via Claude Sonnet 4 met token-by-token streaming
- **Knowledge Context**: Selecteerbare brand assets, personas, producten als chat context
- **Insights**: AI-gegenereerde inzichten uit gesprekken
- **Chat modes**: FREE_CHAT, GUIDED, EXPLORE, VALIDATE, IDEATE, CHALLENGE
- **Configureerbaar**: PersonaChatConfig model (provider, model, temperature, maxTokens, systemPromptTemplate)
- **Max 50 berichten** per sessie

---

## 4. Integratieplan

### 4.1 Architectuurkeuze: Hybride Dual-Mode

De integratie voegt een **tweede chat-modus** toe naast de bestaande tekst-chat. Gebruikers kiezen in de chat modal tussen:

1. **Text Chat** (bestaand) — Claude Sonnet 4, SSE streaming, tekst in/uit
2. **Video Chat** (nieuw) — Runway Characters, WebRTC, video + audio in/uit

**Waarom hybride?**
- Video chat is duurder (credits) en vereist camera/mic → niet altijd gewenst
- Text chat blijft beschikbaar als fallback en voor snelle vragen
- Insights/knowledge context werken in beide modi
- Geleidelijke uitrol mogelijk (feature flag per workspace)

### 4.2 Database Wijzigingen

```prisma
// Nieuw model: koppeling persona ↔ Runway avatar
model PersonaRunwayAvatar {
  id              String   @id @default(cuid())
  personaId       String
  persona         Persona  @relation(fields: [personaId], references: [id], onDelete: Cascade)
  workspaceId     String
  workspace       Workspace @relation(fields: [workspaceId], references: [id])

  // Runway API velden
  runwayAvatarId  String   // UUID van Runway
  voicePreset     String   @default("emma") // Runway preset voice naam

  // Sync status
  lastSyncedAt    DateTime?
  syncStatus      RunwayAvatarSyncStatus @default(PENDING)
  syncError       String?  @db.Text

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([personaId]) // 1 avatar per persona
  @@index([workspaceId])
}

// Uitbreiding PersonaChatSession
model PersonaChatSession {
  // ... bestaande velden ...
  chatType        ChatType @default(TEXT) // TEXT of VIDEO
  runwaySessionId String?  // Runway realtime session ID (voor video)
  videoDuration   Int?     // Duur van video sessie in seconden
  creditsUsed     Int?     // Runway credits verbruikt
}

// Workspace uitbreiding voor Runway config
model Workspace {
  // ... bestaande velden ...
  runwayApiSecret     String?  @db.Text // Encrypted
  runwayCreditsBalance Int?     // Cached credits saldo
  runwayMaxSessionDuration Int? @default(300) // Max sessie duur in seconden (default 5 min)
}

// Enums
enum RunwayAvatarSyncStatus {
  PENDING
  SYNCED
  ERROR
}

enum ChatType {
  TEXT
  VIDEO
}
```

### 4.3 Nieuwe API Routes

| Route | Methode | Beschrijving |
|---|---|---|
| `/api/personas/[id]/runway-avatar` | POST | Avatar aanmaken/syncen naar Runway |
| `/api/personas/[id]/runway-avatar` | GET | Avatar status ophalen |
| `/api/personas/[id]/runway-avatar` | PATCH | Avatar bijwerken (voice, personality) |
| `/api/personas/[id]/runway-avatar` | DELETE | Avatar verwijderen bij Runway |
| `/api/personas/[id]/runway-avatar/voices` | GET | Beschikbare stemmen |
| `/api/personas/[id]/video-chat/connect` | POST | Runway sessie aanmaken (credentials) |
| `/api/personas/[id]/video-chat/[sessionId]/end` | POST | Sessie beëindigen + credits loggen |
| `/api/settings/runway` | GET | Runway configuratie (workspace) |
| `/api/settings/runway` | PATCH | Runway API key + instellingen opslaan |

### 4.4 Server-side Implementatie

#### 4.4.1 Runway Client Singleton

```
src/lib/ai/runway-client.ts
```

```typescript
import RunwayML from '@runwayml/sdk';

// Singleton per workspace (API key kan per workspace verschillen)
const clientCache = new Map<string, RunwayML>();

export function getRunwayClient(apiSecret: string): RunwayML {
  if (!clientCache.has(apiSecret)) {
    clientCache.set(apiSecret, new RunwayML({ apiKey: apiSecret }));
  }
  return clientCache.get(apiSecret)!;
}
```

#### 4.4.2 Avatar Sync Service

```
src/lib/ai/runway-avatar-sync.ts
```

Verantwoordelijk voor:
- Avatar aanmaken bij Runway vanuit persona data (naam, foto, personality prompt)
- System prompt genereren op basis van persona velden + workspace brand context
- Knowledge documents uploaden (brand assets, producten, etc.)
- Voice matching (persona demographics → passende stem)
- Sync status bijhouden

#### 4.4.3 System Prompt Builder (uitbreiding)

De bestaande `buildSystemPrompt()` in `src/lib/ai/context/prompt-builder.ts` wordt hergebruikt als basis voor de Runway avatar personality prompt. Het verschil:
- **Text chat**: System prompt gaat naar Claude API als `system` message
- **Video chat**: System prompt gaat naar Runway als `personality` veld bij avatar creatie

#### 4.4.4 Knowledge Document Sync

Brand context data (assets, personas, producten) wordt als knowledge documents aan de Runway avatar gekoppeld:
- Bij avatar creatie: initiële documents uploaden
- Bij data wijzigingen: documents updaten (via webhook of on-demand sync)
- Max 50 documents — prioritering op basis van relevantie

### 4.5 Frontend Implementatie

#### 4.5.1 Nieuwe Componenten

```
src/features/personas/components/video-chat/
├── PersonaVideoChatInterface.tsx    ← Video call UI wrapper
├── VideoChatControls.tsx            ← Mic/camera/end controls
├── VideoChatSetup.tsx               ← Permission check + device select
├── RunwayAvatarSetup.tsx            ← Avatar configuratie (stem, sync status)
├── RunwayPoweredBadge.tsx           ← "Powered by Runway" badge (verplicht)
└── VideoChatCreditsBanner.tsx       ← Credits verbruik indicator
```

#### 4.5.2 Modal Uitbreiding

`ChatWithPersonaModal.tsx` krijgt een **derde tab** of **mode toggle**:

```
┌─────────────────────────────────────────┐
│ [Avatar] Sarah Chen                  [X] │
│ Startup Founder • 32                     │
├─────────────────────────────────────────┤
│ [💬 Text Chat] [📹 Video Chat] [✨ Insights] │
├─────────────────────────────────────────┤
│                                          │
│  (Text Chat = bestaande interface)       │
│  (Video Chat = Runway AvatarCall)        │
│  (Insights = bestaande interface)        │
│                                          │
├─────────────────────────────────────────┤
│ 🔌 Powered by Runway         Credits: 42 │
└─────────────────────────────────────────┘
```

#### 4.5.3 Video Chat Interface

```tsx
// PersonaVideoChatInterface.tsx (conceptueel)
import { AvatarSession, AvatarVideo, ControlBar } from '@runwayml/avatars-react';

export function PersonaVideoChatInterface({ persona, onEnd }) {
  const [credentials, setCredentials] = useState(null);

  // Fetch session credentials from our backend
  useEffect(() => {
    fetch(`/api/personas/${persona.id}/video-chat/connect`, { method: 'POST' })
      .then(res => res.json())
      .then(setCredentials);
  }, []);

  if (!credentials) return <VideoChatSetup persona={persona} />;

  return (
    <AvatarSession credentials={credentials} onEnd={onEnd}>
      <AvatarVideo />
      <ControlBar />
      <RunwayPoweredBadge />
      <VideoChatCreditsBanner creditsUsed={...} />
    </AvatarSession>
  );
}
```

#### 4.5.4 Hooks

```
src/features/personas/hooks/useRunwayAvatar.ts
```

- `useRunwayAvatar(personaId)` — Avatar status + sync
- `useRunwayVoices()` — Beschikbare stemmen
- `useStartVideoChat(personaId)` — Sessie starten
- `useEndVideoChat(sessionId)` — Sessie beëindigen + credits loggen

### 4.6 State Management

#### Zustand Store Uitbreiding

```typescript
// usePersonaChatStore.ts uitbreiding
interface PersonaChatStore {
  // ... bestaande velden ...
  chatMode: 'text' | 'video';
  setChatMode: (mode: 'text' | 'video') => void;

  // Video chat state
  videoSessionId: string | null;
  isVideoConnecting: boolean;
  isVideoActive: boolean;
  videoCreditsBurned: number;
}
```

### 4.7 Avatar Configuratie UI

Persona Detail Page → Sidebar → Quick Actions → **"Configure Video Avatar"**

Dit opent een configuratiepaneel waar de gebruiker:
1. De persona foto selecteert als avatar referentie-afbeelding
2. Een stem kiest uit 30+ presets (met preview)
3. De avatar synchroniseert naar Runway
4. Een test-gesprek kan starten

```
src/features/personas/components/detail/sidebar/RunwayAvatarConfigCard.tsx
```

### 4.8 Settings Page — Runway Configuratie

Onder Settings → Account of Settings → Admin:

```
src/features/settings/components/RunwayIntegrationSettings.tsx
```

- API Key invoer (encrypted opslag)
- Credits saldo weergave
- Max sessieduur instelling (per workspace)
- Feature toggle (video chat aan/uit per workspace)
- Link naar Runway developer portal

---

## 5. Implementatiefasen

### Fase 1: Foundation (Geschat: 2 sessies)

**Doel**: Server-side Runway integratie + database schema

1. **Schema**: PersonaRunwayAvatar model + ChatType enum + Workspace uitbreiding
2. **Runway Client**: `src/lib/ai/runway-client.ts` singleton
3. **Avatar Sync**: `src/lib/ai/runway-avatar-sync.ts` (create, update, delete)
4. **API Routes**: CRUD voor `/api/personas/[id]/runway-avatar`
5. **Env vars**: `RUNWAYML_API_SECRET` in `.env.local` + `.env.example`
6. **Dependency**: `npm install @runwayml/sdk`

### Fase 2: Video Chat Backend (Geschat: 1 sessie)

**Doel**: Session management + credentials flow

1. **Connect endpoint**: `/api/personas/[id]/video-chat/connect` (create Runway session, return credentials)
2. **End endpoint**: `/api/personas/[id]/video-chat/[sessionId]/end` (log credits, update DB)
3. **ChatSession uitbreiding**: chatType, runwaySessionId, videoDuration, creditsUsed
4. **Credit tracking**: Credits verbruik per sessie loggen

### Fase 3: Frontend — Video Chat UI (Geschat: 2 sessies)

**Doel**: Video chat interface in persona chat modal

1. **Dependency**: `npm install @runwayml/avatars-react`
2. **PersonaVideoChatInterface**: AvatarSession + AvatarVideo + ControlBar wrapper
3. **VideoChatSetup**: Camera/mic permissie check + device selector
4. **VideoChatControls**: Custom controls (mute, camera toggle, end call)
5. **Modal uitbreiding**: Text/Video tab toggle in ChatWithPersonaModal
6. **RunwayPoweredBadge**: Verplichte branding
7. **VideoChatCreditsBanner**: Real-time credits verbruik

### Fase 4: Avatar Configuratie (Geschat: 1 sessie)

**Doel**: Avatar setup + voice selection

1. **RunwayAvatarConfigCard**: Sidebar component in persona detail
2. **Voice selector**: 30+ presets met audio preview
3. **Sync flow**: Foto upload → Runway avatar creatie → status feedback
4. **Auto-sync**: Bij persona foto wijziging → avatar update triggeren

### Fase 5: Settings & Credits (Geschat: 1 sessie)

**Doel**: Workspace-level configuratie

1. **RunwayIntegrationSettings**: API key, feature toggle, max duur
2. **Credits dashboard**: Verbruik per persona, per periode
3. **Budget limiet**: Optionele max credits per maand per workspace
4. **Feature flag**: `workspace.features.videoChat` toggle

### Fase 6: Knowledge Sync + Polish (Geschat: 1 sessie)

**Doel**: Brand context in video avatars + edge cases

1. **Knowledge document sync**: Brand assets → Runway documents
2. **Auto-update**: Bij brand asset wijziging → avatar knowledge updaten
3. **Error handling**: Network failures, API errors, credit exhaustion
4. **Loading states**: Skeleton UI, connection progress
5. **Accessibility**: Keyboard controls, screen reader labels

---

## 6. Dependency Wijzigingen

### Nieuwe npm packages

| Package | Versie | Doel | Server/Client |
|---|---|---|---|
| `@runwayml/sdk` | Latest | Server-side Runway API calls | Server |
| `@runwayml/avatars-react` | Latest | React componenten voor video chat | Client |

### Environment Variables

```env
# Runway ML API (optioneel — video chat is een opt-in feature)
RUNWAYML_API_SECRET=          # Runway API key (per workspace mogelijk)
```

---

## 7. Risico's & Mitigatie

| Risico | Impact | Kans | Mitigatie |
|---|---|---|---|
| **Hoge kosten per sessie** | Hoog | Hoog | Credit budget limieten per workspace, sessie-duur limiet (default 5 min), waarschuwing bij lage credits |
| **Characters API pricing onduidelijk** | Hoog | Medium | Test met developer account, Enterprise contact voor volumeprijzen, fallback naar tekst-chat |
| **WebRTC browser compatibiliteit** | Medium | Laag | Graceful degradation naar tekst-chat, browser check bij modal open |
| **Camera/mic permissie geweigerd** | Medium | Medium | Duidelijke instructies, fallback naar tekst-chat, "audio-only" modus overwegen |
| **Runway API downtime** | Medium | Laag | Tekst-chat als fallback, health check endpoint, retry met exponential backoff |
| **Persona foto kwaliteit** | Medium | Medium | `imagePreprocessing: 'optimize'` gebruiken, minimale resolutie check, fallback naar preset avatar |
| **Latency / kwaliteit** | Medium | Medium | maxDuration instelling, kwaliteits-feedback loop, preset avatars als alternatief |
| **GDPR / privacy** | Hoog | Medium | Camera/mic data verlaat browser → Runway servers. Privacy policy update, opt-in consent, data processing agreement met Runway |
| **"Powered by Runway" branding** | Laag | Zeker | Badge component altijd zichtbaar, niet verwijderbaar. Accepteren als voorwaarde. |
| **Knowledge document limiet (50)** | Laag | Laag | Prioritering op basis van relevantie, samenvatting van grote datasets |

---

## 8. Kosten Analyse

### Geschatte kosten per gebruik

| Scenario | Geschatte credits | Geschatte kosten |
|---|---|---|
| 2-min test gesprek | ~600-3000 | $6-$30 |
| 5-min gebruikerssessie | ~1500-7500 | $15-$75 |
| 10-min diepgaand interview | ~3000-15000 | $30-$150 |

> **Let op**: Exacte Characters API pricing is nog niet publiek gedocumenteerd. Bovenstaande schattingen zijn gebaseerd op video-generatie tarieven (5-25 credits/sec). De werkelijke kosten kunnen lager liggen omdat Characters een ander model (GWM-1) gebruikt dan Gen-4/4.5.

### Aanbeveling

- **Start met 30 gratis credits** (bij account creatie) om te testen
- **Pro plan ($35/mo, 2250 credits)** voor development/testing
- **Enterprise** voor productie met volumekortingen
- **Implementeer credit budgets** per workspace vanaf dag 1

---

## 9. Alternatieve Overwegingen

### 9.1 Alleen Video Generatie (geen Characters)

In plaats van real-time conversatie, genereer korte video-clips van de persona:
- **Text-to-Video**: Persona's antwoord als video clip (5-10 sec)
- **Kosten**: Gen-4 Turbo: 5 credits/sec = 25-50 credits per antwoord
- **Nadeel**: Geen real-time interactie, wachttijd per antwoord
- **Voordeel**: Goedkoper, geen WebRTC nodig

### 9.2 Audio-Only Avatar

Runway Characters zonder video — alleen audio conversatie:
- Lagere bandwidth vereisten
- Mogelijk lagere kosten
- Nog steeds dezelfde personality/knowledge engine
- **Overwegen als** video te duur blijkt

### 9.3 Hybrid: Text + Gegenereerde Video Clips

Combineer bestaande tekst-chat met af-en-toe een korte video-respons:
- Gebruiker typt → Claude genereert tekst → optioneel "Watch response" button
- Button genereert een 5-sec video clip van de persona die het antwoord uitspreekt
- **Kosten**: Alleen voor video-clips, niet voor elke interactie

---

## 10. Acceptatiecriteria

### Must Have (MVP)

- [ ] Runway avatar aanmaken vanuit persona profielfoto
- [ ] Real-time video chat sessie starten vanuit persona chat modal
- [ ] Audio + video stream werkt (avatar spreekt, lip-sync)
- [ ] Sessie beëindigen met credits logging
- [ ] "Powered by Runway" badge zichtbaar
- [ ] Fallback naar tekst-chat als video niet beschikbaar
- [ ] Credit verbruik weergave tijdens sessie
- [ ] API key configuratie in Settings

### Should Have

- [ ] Voice preset selectie per persona
- [ ] Knowledge documents sync (brand assets → avatar)
- [ ] Sessie-duur limiet met waarschuwing
- [ ] Camera/mic device selectie
- [ ] Credits budget limiet per workspace

### Could Have

- [ ] Automatische avatar re-sync bij persona wijziging
- [ ] Audio-only modus
- [ ] Video chat transcript export
- [ ] Insights generatie uit video gesprekken (speech-to-text → analysis)
- [ ] Preset avatars als fallback (geen eigen foto nodig)

### Won't Have (v1)

- Video opname/download van gesprekken
- Multi-persona video conferentie
- Custom voice cloning
- Video chat in Content Studio
- Mobile-first video chat

---

## 11. Technische Beslissingen (nog te nemen)

| Beslissing | Opties | Aanbeveling |
|---|---|---|
| API key scope | Globaal vs per workspace | Per workspace (agency model ondersteuning) |
| Avatar creatie trigger | Automatisch bij persona create vs handmatig | Handmatig (opt-in, vanwege kosten) |
| Knowledge sync | Realtime vs on-demand | On-demand (bij avatar sync + bij sessie start) |
| Credit tracking | Client-side estimate vs server-side polling | Server-side (betrouwbaarder) |
| Fallback bij API error | Redirect naar tekst vs error modal | Redirect naar tekst-chat met toast melding |
| Branding placement | Header vs footer vs overlay | Footer van video chat interface |

---

## 12. Bronnen

- [Runway ML API Documentatie](https://docs.dev.runwayml.com/)
- [Runway ML API Reference](https://docs.dev.runwayml.com/api/)
- [Runway Characters Documentatie](https://docs.dev.runwayml.com/characters/)
- [Runway Characters — Create Your Own](https://docs.dev.runwayml.com/characters/create-your-own/)
- [Runway ML Pricing](https://docs.dev.runwayml.com/guides/pricing/)
- [Runway Models Overview](https://docs.dev.runwayml.com/guides/models/)
- [Runway API Usage Tiers & Limits](https://docs.dev.runwayml.com/usage/tiers/)
- [Runway Developer Portal](https://dev.runwayml.com/)
- [@runwayml/sdk (npm)](https://www.npmjs.com/package/@runwayml/sdk)
- [avatars-sdk-react (GitHub)](https://github.com/runwayml/avatars-sdk-react)
- [sdk-node (GitHub)](https://github.com/runwayml/sdk-node)
- [Introducing Runway Characters (blog)](https://runwayml.com/news/introducing-runway-characters)
