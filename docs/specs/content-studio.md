# CONTENT CANVAS — Spec: Stap 3 (Medium) + Stap 4 (Planner)

> **Doel van dit document**: Exacte implementatiespec voor Claude Code.
> Schrijf dit als toevoeging aan de bestaande Content Canvas wizard.
> Raak stap 1 (Review Context) en stap 2 (Content Variants) NIET aan —
> die zijn volledig werkend.
>
> Trigger voor deze stappen: na "Confirm & Continue" op stap 2,
> of via "Bring to Live" vanuit de content timeline (beat).
>
> Datum: 27 maart 2026

---

## ARCHITECTUUR — WAT ER AL STAAT (NIET AANRAKEN)

De Content Canvas heeft een 4-staps wizard met verticale tab-navigatie rechts:
- **Tab 1: Review Context** ✅ — brand context, knowledge selector, Generate knop
- **Tab 2: Content Variants** ✅ — A/B variant selectie per component
  (Hook / Body-Script / CTA / On-Screen-Text / Caption / Hashtags),
  assembled preview rechterzijbalk, Confirm & Continue knop
- **Tab 3: Medium** ❌ — SPEC HIERONDER
- **Tab 4: Planner** ❌ — SPEC HIERONDER

De wizard is medium-aware: het `medium` veld op stap 1 bepaalt
welk platform + format het betreft. In de screenshots: `tiktok` + `video`.

Alle gegenereerde content uit stap 2 is opgeslagen in het deliverable-model
en beschikbaar voor stap 3 via de bestaande API.

---

## STAP 3: MEDIUM

### Doel
De Medium-stap is de **compositie-stap**: de geselecteerde content-varianten
uit stap 2 worden samengesteld tot een publicatieklaar formaat. Per medium-type
is de weergave en de tool-set anders. Dit is het "productie atelier".

### Structuur van de pagina

```
[Linkerpaneel: Componenten]    [Rechterpaneel: Live Preview]
┌──────────────────────────┐   ┌──────────────────────────┐
│  Tekst                   │   │                          │
│  ┌────────────────────┐  │   │   [Medium Preview        │
│  │ Hook (geselecteerd)│  │   │    — platform-native     │
│  └────────────────────┘  │   │    simulatie]            │
│  ┌────────────────────┐  │   │                          │
│  │ Body-Script        │  │   │                          │
│  └────────────────────┘  │   │                          │
│  ...overige varianten... │   │                          │
│                          │   │                          │
│  Beeld / Visual          │   │                          │
│  ┌────────────────────┐  │   │                          │
│  │ [+ Voeg toe]       │  │   │                          │
│  └────────────────────┘  │   │                          │
│                          │   │                          │
│  Audio / Voice-over      │   │                          │
│  ┌────────────────────┐  │   │                          │
│  │ [Genereer / Upload]│  │   │                          │
│  └────────────────────┘  │   │                          │
│                          │   │                          │
│  Muziek / Sfeer          │   │                          │
│  ┌────────────────────┐  │   │                          │
│  │ [Kies richting]    │  │   │                          │
│  └────────────────────┘  │   │                          │
│                          │   │                          │
│  [Export / Download]     │   │                          │
└──────────────────────────┘   └──────────────────────────┘
```

### Medium-type routing

De interface past zich volledig aan op het gekozen medium. Implementeer
via een `MediumComposer` component met sub-renderers per type:

```typescript
// src/features/content-canvas/components/medium/MediumComposer.tsx
switch (deliverable.mediumType) {
  case 'tiktok-video':
  case 'reels-video':
  case 'youtube-short':
    return <VideoMediumComposer />;
  
  case 'linkedin-post':
  case 'instagram-caption':
  case 'facebook-post':
  case 'x-post':
    return <SocialTextMediumComposer />;
  
  case 'email-newsletter':
  case 'email-outreach':
    return <EmailMediumComposer />;
  
  case 'seo-page':
  case 'blog-post':
    return <LongformMediumComposer />;
  
  case 'google-ads-copy':
  case 'meta-ad-copy':
    return <AdMediumComposer />;
  
  default:
    return <GenericMediumComposer />;
}
```

---

### A. VideoMediumComposer (TikTok / Reels / YouTube Short)

Dit is het meest complexe medium. Implementeer het eerst —
het is het bewezen format in de screenshots.

#### Linkerpaneel — Tekstcomponenten

Toon de geselecteerde varianten uit stap 2 in bewerkbare blokken.
Elk blok is een TipTap inline-editor (minimaal):

**Hook** — de openingszin
```
[Hook tekst — bewerkbaar inline]
Karakter teller: 47 / 80 ✓
```

**Body-Script** — de scènes
Toon als **storyboard-lijst**: elke `[VISUAL: ...]` en `VO: ...` regel
wordt een aparte scène-kaart:

```
┌─────────────────────────────────────────────────┐
│ Scène 1                                   [↕ ✎] │
│ VISUEEL: Quick cuts van Laura op laptop,         │
│ scrollend door dating app laat op de avond       │
│ ─────────────────────────────────────────────    │
│ VOICE-OVER: Financieel adviseur? Check.          │
│ Loopbaancoach? Uiteraard. Personal trainer?      │
│ Natuurlijk.                                      │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│ Scène 2                                   [↕ ✎] │
│ VISUEEL: [Orange rewind effect...]               │
│ ─────────────────────────────────────────────    │
│ VOICE-OVER: Maar voor het zoeken naar je         │
│ levenspartner? Dat doe je zelf maar...           │
└─────────────────────────────────────────────────┘
[+ Voeg scène toe]
```

Elke scène-kaart heeft:
- Drag-handle (`↕`) voor volgorde aanpassen
- Edit-knop (`✎`) voor inline bewerking
- Visueel-blok: beschrijving van het shot (uit gegenereerde `[VISUAL: ...]`)
- Voice-over blok: de gesproken tekst (uit gegenereerde `VO: ...`)

**On-Screen-Text** — tekst-overlays
```
[On-screen tekst — bewerkbaar inline]
Voorbeeld: "You hire experts for EVERYTHING else → ..."
```

**CTA**
```
[CTA tekst]   [CTA timing: _ sec voor einde]
```

**Caption + Hashtags**
```
[Caption — volledig bewerkbaar, TipTap]
[Hashtag blok — tags als chips, toevoegen/verwijderen]
```

#### Linkerpaneel — Visuele Assets

```
┌─────────────────────────────────────────────────┐
│ 📸 Visuele Assets                               │
│                                                 │
│ Per scène kun je toevoegen:                     │
│                                                 │
│  Scène 1  [+ Afbeelding uploaden]               │
│           [🎨 Genereer met AI]  ← Imagen 4      │
│           [🔗 Stockfoto zoeken] ← Pexels/Unsplash│
│                                                 │
│  Scène 2  [thumb] Laura_exhausted.jpg  [×]      │
│           Visuele omschrijving: "Quick cuts..."  │
│                                                 │
│  Scène 3  [+ Afbeelding uploaden]               │
└─────────────────────────────────────────────────┘
```

**AI-beeld generatie (Fase I.3 — nu: visuele brief)**
In Fase B: toon de `[VISUAL: ...]` beschrijving als prompt-suggestie.
Knop "Genereer met AI" stuurt naar `POST /api/media/generate-image`
met de beschrijving als prompt + workspace brandstyle als seed.
Als Imagen 4 niet beschikbaar: toon prompt als kopieerbare brief
voor externe tool (Midjourney, Firefly).

**Stockfoto zoeken**
Koppeling aan Pexels API (Tier 1, TODO.md INT.35).
Zoekterm automatisch afleiden uit `[VISUAL: ...]` beschrijving.

#### Linkerpaneel — Voice-Over

```
┌─────────────────────────────────────────────────┐
│ 🎙 Voice-Over                                   │
│                                                 │
│ Script (samengesteld uit alle VO-regels):        │
│ ┌───────────────────────────────────────────┐   │
│ │ Financieel adviseur? Check. Loopbaancoach │   │
│ │ ? Uiteraard. Personal trainer? Natuurlijk │   │
│ │ . Maar voor het zoeken naar je leven...   │   │
│ └───────────────────────────────────────────┘   │
│                                                 │
│ Brand Voice: [Geen gekoppeld ▼]                 │
│ Taal: [Nederlands ▼]                            │
│                                                 │
│ [▶ Genereer audio preview]   ← ElevenLabs       │
│ [⬆ Upload eigen audio]                         │
│                                                 │
│ Status: Nog niet gegenereerd                    │
└─────────────────────────────────────────────────┘
```

Voice-over script = alle `VO: ...` regels uit het body-script,
aaneengeregen in scène-volgorde. Automatisch samengesteld, handmatig
bewerkbaar voor timing-aanpassingen.

ElevenLabs: `POST /api/media/generate-voice`
Parameters: `{ text, voiceId, workspaceId }`
Response: audio-URL opgeslagen in cloud storage.
Als ElevenLabs niet geconfigureerd: knop disabled, tooltip "Koppel
ElevenLabs in Settings > Integraties".

#### Linkerpaneel — Muziek & Sfeer

```
┌─────────────────────────────────────────────────┐
│ 🎵 Muziek & Sfeer                               │
│                                                 │
│ Richting (o.b.v. brand personality + campagnes):│
│ ○ Inspirerend & professioneel                   │
│ ○ Warm & menselijk                              │
│ ● Urgentie & empowerment    ← AI-suggestie      │
│ ○ Rustig & vertrouwend                          │
│                                                 │
│ Notitie voor editor / video-tool:               │
│ [Vrij tekst voor muziekrichting]                │
│                                                 │
│ Trending audio (TikTok):                        │
│ [Zoek trending audio...] ← toekomstig           │
└─────────────────────────────────────────────────┘
```

Muziekkeuze is in Fase B een notitie/richting (geen audio-generatie).
De AI-suggestie voor sfeer/richting wordt afgeleid uit brand personality
(brand foundation asset).

#### Rechterpaneel — Live Preview

Platform-specifieke mockup die real-time bijwerkt als componenten
worden bewerkt of assets worden toegevoegd.

**TikTok Preview:**
```
┌─────────────────────┐
│  [9:16 mockup]      │
│                     │
│  [Visual asset of   │
│   placeholder]      │
│                     │
│  [On-screen tekst   │
│   overlay]          │
│                     │
│  [Hook tekst]       │
│                     │
│ ❤ 💬 ↗ ⋯          │
│ @partnerselectnl    │
│ Caption tekst...    │
│ #hashtag1 #hashtag2 │
└─────────────────────┘
[▶ Simuleer (tekst-animatie)]
```

De preview is een gestileerde HTML/CSS mockup — geen echte video-render.
Toont: visuele asset (of placeholder-kleur), on-screen tekst overlay,
caption en hashtags. Optioneel: eenvoudige tekst-animatie via CSS keyframes
om het scroll-gevoel te simuleren.

#### Onderbalk — Export

```
[📋 Kopieer script]  [📄 Download als PDF]  [📦 Download pakket]
```

**Kopieer script**: plat tekst met alle componenten (Hook + Body + CTA + Caption + Hashtags)

**Download als PDF**: gestructureerde productie-brief:
- Pagina 1: Campagne context + deliverable info
- Pagina 2+: Scène-voor-scène storyboard (visueel + VO naast elkaar)
- Laatste pagina: Caption + hashtags + muziekrichting

**Download pakket** (ZIP):
- `script.txt` — platte tekst
- `storyboard.pdf` — productie-brief
- `caption.txt` — caption + hashtags
- `assets/` — geüploade of gegenereerde beelden

API: `POST /api/studio/[deliverableId]/export`
Format: `{ format: 'pdf' | 'txt' | 'package' }`

---

### B. SocialTextMediumComposer (LinkedIn / Instagram / Facebook / X)

Eenvoudiger dan video — de compositie is puur tekst + beeld.

#### Linkerpaneel

**Tekst** (TipTap editor, volledig):
Voorgevuld met geselecteerde variant. Karakter-teller per platform:
- LinkedIn: 3000 tekens max
- Instagram: 2200 tekens max
- Facebook: 63.206 (optimaal 40-80 woorden)
- X: 280 tekens max

**Afbeelding / Visual**
Zelfde asset-blok als VideoMediumComposer, maar voor één afbeelding:
`[Upload] [Genereer met AI] [Stockfoto]`
Formaat-spec automatisch ingesteld per platform:
- LinkedIn: 1200×627px (landscape) of 1080×1080px (square)
- Instagram: 1080×1080px (square) of 1080×1350px (portrait)
- X: 1600×900px

**Link preview** (optioneel):
`[URL invoeren]` → automatisch link-preview ophalen (Open Graph)

#### Rechterpaneel — Preview

Platform-native mockup:

LinkedIn:
```
┌──────────────────────────────┐
│ [Profielfoto] Naam           │
│ Functietitel · 1e            │
│                              │
│ Tekst van de post...         │
│                              │
│ [Afbeelding]                 │
│                              │
│ 👍 Vind ik leuk  💬 Reageer  │
└──────────────────────────────┘
```

#### Onderbalk

`[📋 Kopieer tekst]  [🖼 Download afbeelding]  [📄 Download brief]`

---

### C. EmailMediumComposer

#### Linkerpaneel

**Onderwerpregel** (bewerkbaar, karakter-teller)
**Preheader** (bewerkbaar)
**Body** (React Email template selector):
```
[Kies template: ○ Nieuwsbrief  ○ Outreach  ○ Minimaal]
```
Body wordt gerenderd in gekozen template, bewerkbaar per sectie.

**CTA knop**: tekst + kleur (uit brandstyle)

#### Rechterpaneel

Email HTML preview (iframe met gegenereerde email HTML).

---

### D. AdMediumComposer (Google Ads / Meta Ads)

#### Linkerpaneel

**Headlines** (3 stuks, max 30 tekens elk — harde limiet, rood bij overschrijding)
**Descriptions** (2 stuks, max 90 tekens elk)
**Display URL** + paden
**Extensies** (sitelinks, callouts — optioneel)

#### Rechterpaneel

Google Ads SERP-preview:
```
┌─────────────────────────────────────────────┐
│ Ad · partnerselectnl.nl                     │
│ Headline 1 | Headline 2 | Headline 3        │
│ Description 1. Description 2 voor meer info.│
└─────────────────────────────────────────────┘
```

Meta Ad preview (feed + stories variant).

---

### E. GenericMediumComposer (fallback)

Voor content types zonder specifieke composer:
TipTap editor met geselecteerde content, download als TXT/DOCX.

---

## STAP 4: PLANNER

### Doel
De Planner-stap koppelt de voltooide content aan een **publicatiemoment**
en slaat dat terug naar de **content timeline beat** vanwaar de wizard
werd gestart. Optioneel: auto-planner suggereert optimale tijden.

### Context: hoe de Planner wordt bereikt

Er zijn twee instappunten:
1. **Via de wizard** (stap 4 na stap 3): normaal flow
2. **Via "Bring to Live" op een timeline beat**: direct naar planner,
   met de beat-context voorgeladen

In beide gevallen heeft de Planner toegang tot:
- `deliverableId` (de content die gepland wordt)
- `beatId` (optioneel — de beat in de timeline die dit triggerde)
- `campaignId`
- `mediumType` + `platform` (uit stap 1)

### Paginastructuur

```
┌───────────────────────────────────────────────────────┐
│  📅 Planner                                           │
│                                                       │
│  Wat wordt gepubliceerd:                              │
│  ┌─────────────────────────────────────────────────┐ │
│  │ TikTok Video — "You hire experts for..."        │ │
│  │ PartnerSelect · Awareness · [thumbnail]         │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  Wanneer publiceren?                                  │
│                                                       │
│  ○ Nu publiceren (direct na goedkeuring)              │
│  ● Inplannen op specifiek moment                      │
│  ○ Auto-planner (AI kiest optimale tijd)              │
│                                                       │
│  ┌──────────────────────────────────────────────┐    │
│  │  [Datum: di 31 mrt 2026 ▼]  [Tijd: 18:00 ▼] │    │
│  └──────────────────────────────────────────────┘    │
│                                                       │
│  Platform:  [TikTok ▼]   Account: [Niet gekoppeld]   │
│             ⚠ Koppel TikTok in Settings > Integraties│
│                                                       │
│  ─────────────────────────────────────────────────   │
│  📊 Auto-planner suggesties                          │
│                                                       │
│  Op basis van je doelgroep (Mark Jansen, Laura van   │
│  den Berg) en platform (TikTok):                     │
│                                                       │
│  ✦ Di 31 mrt · 18:00–20:00   Sterk aanbevolen       │
│    Reden: Avondpiek werkende professionals,           │
│    engagement +34% t.o.v. gemiddelde                  │
│                                                       │
│  ✦ Wo 1 apr · 07:00–08:00    Goed                    │
│    Reden: Ochtend-scroll sessie, hoge reach           │
│                                                       │
│  ✦ Za 4 apr · 12:00–13:00    Redelijk                │
│    Reden: Weekend middag, lagere concurrentie         │
│                                                       │
│  ─────────────────────────────────────────────────   │
│  📍 Terugkoppeling naar timeline                     │
│                                                       │
│  Beat: "TikTok awareness · Week 14"          ✓ Actief │
│  De geplande datum wordt zichtbaar in de campaign    │
│  timeline op de gekoppelde beat.                     │
│                                                       │
│  ─────────────────────────────────────────────────   │
│  [← Terug naar Medium]    [✓ Bevestig planning]     │
└───────────────────────────────────────────────────────┘
```

### Data model

Voeg toe aan het bestaande `Deliverable` model (of maak een
`DeliverableSchedule` model als dat netter is):

```prisma
model DeliverableSchedule {
  id              String          @id @default(cuid())
  deliverableId   String          @unique
  deliverable     Deliverable     @relation(...)
  beatId          String?         // optioneel — gekoppelde timeline beat
  scheduledAt     DateTime?       // geplande publicatietijd
  publishedAt     DateTime?       // werkelijke publicatietijd
  platform        String          // 'tiktok' | 'linkedin' | etc.
  platformPostId  String?         // ID van de publicatie op het platform
  status          ScheduleStatus  @default(DRAFT)
  autoPublish     Boolean         @default(false)
  publishChannel  String?         // Ayrshare channel ID (toekomstig)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
}

enum ScheduleStatus {
  DRAFT         // nog niet bevestigd
  SCHEDULED     // ingepland, wacht op publicatie
  PUBLISHED     // gepubliceerd
  FAILED        // publicatie mislukt
  CANCELLED     // geannuleerd
}
```

### Auto-planner logica

De auto-planner suggereert tijden op basis van:

**Input-signalen (beschikbaar nu):**
- Platform (TikTok, LinkedIn, Instagram, etc.)
- Doelgroep-persona (leeftijd, beroep, dagindeling — uit persona-data)
- Journey Phase (awareness → prime-time reach; consideration → business hours)
- Campagnedoel

**Suggesties genereren:**
Roep Claude aan met:
```
POST /api/planner/suggest-times
Body: { platform, personaIds[], journeyPhase, campaignObjective, timezone }
```

Claude retourneert 3 gesorteerde tijdslots met reden per slot.
Formaat:
```typescript
interface TimeSuggestion {
  datetime: string;        // ISO
  strength: 'strong' | 'good' | 'moderate';
  reason: string;          // één zin, Nederlands
  expectedEngagementDelta: number; // % t.o.v. gemiddelde, kan 0 zijn
}
```

**Toekomstig (Fase G/H):** PostHog + platform-analytics als input
voor betere suggesties op basis van historische performance.

### Terugkoppeling naar de Content Timeline

Na bevestiging van de planning:
1. Sla `DeliverableSchedule` op in de database
2. Als `beatId` aanwezig: update de gekoppelde beat met de geplande datum
   - API: `PATCH /api/campaigns/[id]/timeline/beats/[beatId]`
   - Body: `{ scheduledDeliverableId, plannedDate }`
3. De beat in de timeline toont visueel de geplande datum en de status
   (Draft / Scheduled / Published)

**Beat status-indicatoren in de timeline:**
```
● DRAFT       — grijs — content aangemaakt, nog niet ingepland
● SCHEDULED   — blauw — ingepland op [datum]
● PUBLISHED   — groen — gepubliceerd op [datum]
● FAILED      — rood  — publicatie mislukt
```

### Publicatie-flow (nu vs. toekomst)

**Nu (Fase B):**
- Platform is niet gekoppeld → "Handmatige publicatie"-modus
- Planner slaat de geplande datum op en stuurt een herinnerings-e-mail
  (via Resend) op het geplande moment:
  "Je content voor TikTok is klaar voor publicatie. Download het pakket
  en publiceer handmatig."
- Status wordt handmatig bijgewerkt door gebruiker (knop "Markeer als gepubliceerd")

**Toekomstig (Fase H — Ayrshare):**
- Platform gekoppeld → "Automatisch publiceren" schakelaar beschikbaar
- Op het geplande moment: `POST /api/integrations/ayrshare/publish`
- Status automatisch bijgewerkt via Ayrshare webhook

### Notificatie bij deadline (nu implementeerbaar)

Als `scheduledAt` is ingesteld en Resend geconfigureerd:
- E-mail reminder 24 uur vóór publicatietijd
- E-mail reminder op het moment van publicatie
- E-mail bevestiging als gebruiker "Markeer als gepubliceerd" klikt

Resend e-mail template: `content-publish-reminder`
Subject: "Je [TikTok video] voor [PartnerSelect] is klaar voor publicatie"

---

## IMPLEMENTATIEVOLGORDE VOOR CLAUDE CODE

Bouw in deze volgorde — elke stap is onafhankelijk testbaar:

### Sprint 1: Medium-tab structuur + VideoMediumComposer

1. Maak `MediumComposer.tsx` met routing op `mediumType`
2. Implementeer `VideoMediumComposer.tsx`:
   - Storyboard-parser: splits bestaand body-script op `[VISUAL:]` + `VO:` markers
   - Scène-kaarten: drag-sorteerbaar (dnd-kit of bestaande DnD-implementatie)
   - Live TikTok preview (HTML/CSS mockup, geen echte video)
   - Voice-over sectie: tekst-assembly uit VO-regels, upload-knop
     (ElevenLabs generatie: stub met toast "coming soon" als niet geconfigureerd)
   - Visuele assets: upload-knop + Pexels-zoeker (als Pexels geconfigureerd)
   - Export: PDF productie-brief + TXT script
3. Verbind stap 2 → stap 3 via bestaande "Confirm & Continue" flow

### Sprint 2: Planner-tab + DeliverableSchedule

1. Maak `DeliverableSchedule` Prisma model + migratie
2. Maak `PlannerStep.tsx` component
3. Auto-planner suggesties via Claude API call
4. Beat-terugkoppeling via bestaande timeline API
5. Handmatige publicatie flow + Resend reminder e-mail (als Resend geconfigureerd)
6. Status-indicatoren op timeline beats

### Sprint 3: SocialTextMediumComposer

LinkedIn / Instagram / Facebook / X composer met platform-native preview.

### Sprint 4: AdMediumComposer

Google Ads + Meta Ads preview met harde karakter-limieten.

### Sprint 5: EmailMediumComposer

React Email template selector + HTML preview.

---

## TECHNISCHE CONSTRAINTS

- **Storyboard-parser**: gebruik een regex of simpele state machine op de
  bestaande `bodyScript` tekst. Splits op `\n[VISUAL:` en `\nVO:` markers.
  Bewaar originele tekst ook — parser is non-destructief.

- **TikTok preview**: puur HTML/CSS, geen externe dependencies.
  Gebruik CSS custom properties voor brand-kleuren uit workspace styleguide.

- **Voice-over generatie**: altijd via `AgentJob` queue (Fase D infra) zodra
  die beschikbaar is. In Fase B: directe API call met loading state.
  Als ElevenLabs niet geconfigureerd: toon instructie + download script.

- **Pexels/Unsplash**: gebruik `PEXELS_API_KEY` env var. Als niet aanwezig:
  toon "Stockfoto's niet beschikbaar. Voeg Pexels toe in Settings."

- **Beat-terugkoppeling**: `beatId` wordt meegegeven via query param bij
  "Bring to Live" flow. Sla op in component state en gebruik bij Planner submit.

- **Auto-planner**: simpele Claude API call in `PlannerStep.tsx`.
  Geen aparte route nodig. Cache het resultaat in component state
  (hoeft niet naar DB tenzij gebruiker bevestigt).

- **Alle nieuwe tekst**: schrijf in het Engels (codebase is gemigreerd naar Engels).
  UI-labels die zichtbaar zijn voor gebruikers: Nederlands (platformtaal is NL).
