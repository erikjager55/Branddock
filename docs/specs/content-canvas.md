# CONTENT-CANVAS-SPEC.md
# Content Canvas — Functionele & Technische Specificatie

> **Doel**: Volledige spec voor de Content Canvas module.
> Dit document beschrijft wat Content Canvas is, hoe het verschilt van
> Content Studio, wat er al bestaat, en wat gebouwd moet worden.
>
> Lees dit altijd samen met CONTENT-STUDIO-SPEC.md.
> Laatst bijgewerkt: 27 maart 2026

---

## WAT IS CONTENT CANVAS?

Content Canvas is de **multi-deliverable orkestratie- en publicatielaag**
die boven de Content Studio staat. Waar Content Studio één deliverable
genereert en bewerkt, is Content Canvas de plek waar alle deliverables
van een campagne samen worden beheerd, goedgekeurd en gepubliceerd.

### De drie lagen naast elkaar

```
Content Studio    →  één deliverable genereren + bewerken
Content Canvas    →  alle deliverables orkestreren + goedkeuren + publiceren
Content Library   →  alle content workspace-breed doorzoeken + archiveren
```

### Positie in de gebruikersworkflow

```
Campaign aanmaken (Wizard)
    ↓
Deliverables definiëren (type + hoeveelheid)
    ↓
Content Studio: per deliverable → genereren, bewerken, beoordelen
    ↓
Content Canvas: alle deliverables → orkestreren, goedkeuren, publiceren
    ↓
Content Library: gearchiveerde content → hergebruiken, filteren, exporteren
```

---

## WAT BESTAAT ER AL?

### Bestaande API-routes (stubs — verificatie vereist bij implementatie)

Op basis van de referentiedocumentatie bestaan er 6 Canvas-endpoints.
Claude Code moet bij aanvang verifiëren via:
`find src/app/api/canvas -type f`

| Route | Method | Verwachte staat |
|-------|--------|-----------------|
| `/api/canvas/:campaignId/orchestrate` | GET, POST | Stub |
| `/api/canvas/:campaignId/components` | GET | Stub |
| `/api/canvas/:campaignId/components/:id` | PATCH | Stub |
| `/api/canvas/:campaignId/approval` | POST | Stub |
| `/api/canvas/:campaignId/publish` | POST | Stub |
| `/api/canvas/:campaignId/derive` | POST | Stub |

### Bestaande UI

Content Canvas heeft geen eigen feature directory. Toekomstige Canvas-UI
leeft in de bestaande `campaign-workspace` routing als extra tab.

Gerelateerde bestaande componenten:
- `src/features/campaigns/studio/ContentStudioPage.tsx` — per-deliverable
- `src/features/campaigns/` — campaign detail + deliverables lijst

### Bestaande Prisma-modellen

```
Campaign              → de overkoepelende entiteit
Deliverable           → individuele content-eenheid (contentType, status)
DeliverableComponent  → sub-onderdelen van een deliverable
ContentVersion        → versiegeschiedenis per deliverable
CampaignKnowledgeAsset → kennisbronnen gekoppeld aan campagne
ImproveSuggestion     → AI-verbetersugesties per deliverable
```

---

## WAT MOET GEBOUWD WORDEN?

### De vijf kernfuncties van Content Canvas

---

#### 1. ORCHESTRATE — Campagne Canvas Overzicht

Het Canvas-overzicht toont alle deliverables van een campagne als een
visueel georganiseerd board. De gebruiker ziet in één oogopslag:
- Welke deliverables klaar zijn (status COMPLETED / APPROVED)
- Welke nog bewerkt worden (DRAFT / IN_PROGRESS)
- Welke wachten op goedkeuring (PENDING_APPROVAL)
- Relaties tussen deliverables (bv. LinkedIn-post + bijbehorende visual brief)

**API: `GET /api/canvas/:campaignId/orchestrate`**
```typescript
// Response
{
  campaign: CampaignSummary;
  deliverables: CanvasDeliverable[];   // gegroepeerd per contentType-categorie
  completionPercentage: number;
  readyForApproval: number;
  publishedCount: number;
  canvasLayout: CanvasLayout;          // opgeslagen indeling
}
```

**API: `POST /api/canvas/:campaignId/orchestrate`**
```typescript
// Body — sla drag-and-drop indeling op
{ layout: CanvasLayout }
```

**UI: CampaignCanvasPage**
- Board-weergave: kolommen per status (Draft / In Review / Approved / Published)
- Toggle: board-weergave ↔ lijst-weergave
- Per deliverable: quick-access naar Studio, goedkeuren, publiceren
- Progress bar: X van Y deliverables klaar voor publicatie

---

#### 2. COMPONENTS — Deliverable Detail in Canvas Context

"Components" zijn de sub-elementen van een deliverable vanuit Canvas-perspectief.
Een LinkedIn-post heeft als components: tekst, hashtags, visual brief.
Een Google Ads-advertentie heeft: headlines (3×), descriptions (2×), display URL.

Dit maakt goedkeuren op component-niveau mogelijk zonder de volledige Studio
te openen.

**API: `GET /api/canvas/:campaignId/components`**
Response: alle `DeliverableComponent` records voor de campagne,
gegroepeerd per deliverable.

**API: `PATCH /api/canvas/:campaignId/components/:id`**
```typescript
// Body
{ status: ComponentStatus; content?: string; approvedBy?: string; }
```

**UI: DeliverableComponentCard**
- Compact kaart per component met status-indicator
- Inline bewerken (kleine tekstvelden voor korte content)
- "Approve" knop per component
- Gecollapsed by default, expand on click

---

#### 3. APPROVAL — Goedkeuringsworkflow

De approval-flow laat een tweede persoon (reviewer) content goedkeuren
vóór publicatie. Dit is essentieel voor het agency-model (klant keurt goed).

**Rollen in approval:**
- `CREATOR` — maakt content, stuurt in voor review
- `REVIEWER` — beoordeelt, keurt goed of stuurt terug
- `PUBLISHER` — publiceert (kan dezelfde zijn als creator)

**API: `POST /api/canvas/:campaignId/approval`**
```typescript
// Body
{
  deliverableIds: string[];   // welke deliverables ter goedkeuring
  reviewerId: string;         // userId van reviewer
  dueDate?: string;           // deadline (ISO)
  message?: string;           // toelichting voor reviewer
}
```

**Deliverable statussen (uitgebreid):**
```
NOT_STARTED → DRAFT → IN_PROGRESS → PENDING_APPROVAL
    → REVISION_REQUESTED → IN_PROGRESS (loop)
    → APPROVED → PUBLISHED
```

**Notificatie:** e-mail via Resend naar reviewer met deep link naar Canvas.
**Let op:** Deep links vereisen URL-based routing (Fase A prerequisite).
Bouw de UI al in Fase B. Stuur e-mails pas als Resend live is (Fase D).
Gebruik feature flag `RESEND_ENABLED` als brug.

**UI: ApprovalPanel**
- Lijst van deliverables die in review staan
- Per deliverable: approve-knop + "Request revision"-knop + feedbackveld
- Bulk-approve voor alle deliverables tegelijk
- Timeline van approval-acties (wie, wanneer, beslissing)

---

#### 4. PUBLISH — Publiceren naar externe platformen

**Fase B — Publiceren = exporteren (handmatig plaatsen):**
- Kopieer naar klembord per deliverable of bulk
- Download als ZIP (alle deliverables + visual briefs als pakket)
- Platform-specifieke opmaak in de export (LinkedIn-formaat, etc.)

**Fase H — Publiceren = directe API-koppeling (Ayrshare):**
- Directe post naar LinkedIn, Instagram, Facebook, X, TikTok
- Plannen op datum/tijd
- Post-publicatie engagement tracking

**API: `POST /api/canvas/:campaignId/publish`**
```typescript
// Body
{
  deliverableIds: string[];
  platform?: IntegrationProvider;        // null = export-modus
  scheduledAt?: string;                  // optioneel: gepland tijdstip
  exportFormat?: 'zip' | 'clipboard';   // voor export-modus (Fase B)
}
```

**UI: PublishPanel**
- Checklist van goedgekeurde deliverables
- Per deliverable: platform-selectie (Fase H: als Ayrshare gekoppeld)
- Datum/tijd picker voor geplande publicatie
- "Export pakket" knop (ZIP download)
- Publicatie-log: wat is wanneer gepubliceerd

---

#### 5. DERIVE — Nieuwe Deliverables Afleiden van Bestaande

"Derive" leidt een nieuw deliverable af van een bestaand deliverable.
De brand context en kernboodschap blijven behouden — alleen het formaat
en de platformlogica worden aangepast.

**Voorbeelden:**
- LinkedIn-post → X-post (korter, punchier)
- Blog-artikel → 5 sociale media-posts (highlights eruit halen)
- Google Ads-copy → Meta Ads-copy (andere structuur, andere limieten)
- E-mail nieuwsbrief → LinkedIn-artikel (uitgebreider, geen subject line)
- TikTok-script → Instagram Reels-concept (zelfde hook, ander format)

**API: `POST /api/canvas/:campaignId/derive`**
```typescript
// Body
{
  sourceDeliverableId: string;   // welke deliverable als basis
  targetType: string;            // doeltype (slug uit content type catalog)
  customInstructions?: string;   // aanvullende instructies
}
// Response: nieuw Deliverable record
// → direct openen in Content Studio
```

**Implementatielogica:**
1. Maak nieuw `Deliverable` aan (title = `[source.title] — [targetType]`)
2. Laad bestaande content van brondeliverable
3. Roep `/api/studio/:newDeliverableId/generate` aan met broninhoud
   als extra context in de AI-prompt
4. Navigeer naar nieuwe deliverable in Content Studio

**UI: DeriveModal**
- Dropdown: kies brondeliverable (gefilterd op COMPLETED / APPROVED)
- Grid: kies doeltype (logische afleidingen gegroepeerd getoond)
- Optioneel tekstveld: aanvullende instructies
- "Afleiden" knop → spinner → open in Studio

---

## PRISMA-MODEL AANPASSINGEN

### 1. Deliverable status uitbreiden

```prisma
enum DeliverableStatus {
  NOT_STARTED
  DRAFT
  IN_PROGRESS
  PENDING_APPROVAL    // ← nieuw
  REVISION_REQUESTED  // ← nieuw
  APPROVED            // ← nieuw
  PUBLISHED           // ← nieuw
  COMPLETED           // bestaand
}
```

### 2. DeliverableApproval (nieuw model)

```prisma
model DeliverableApproval {
  id            String         @id @default(cuid())
  deliverableId String
  deliverable   Deliverable    @relation(fields: [deliverableId], references: [id])
  requestedBy   String         // userId van creator
  reviewerId    String         // userId van reviewer
  status        ApprovalStatus @default(PENDING)
  feedback      String?
  dueDate       DateTime?
  resolvedAt    DateTime?
  createdAt     DateTime       @default(now())

  @@index([deliverableId])
  @@index([reviewerId, status])
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REVISION_REQUESTED
  EXPIRED
}
```

### 3. CanvasLayout (nieuw model — persistente board-indeling)

```prisma
model CanvasLayout {
  id         String   @id @default(cuid())
  campaignId String   @unique
  campaign   Campaign @relation(fields: [campaignId], references: [id])
  layout     Json     // { viewMode: 'board'|'list', groups: [...], order: [...] }
  updatedAt  DateTime @updatedAt
}
```

---

## ROUTING

Canvas leeft binnen de bestaande `campaign-workspace` routing.

```
campaign-workspace
  ├── overview   → CampaignDetailPage (strategie, deliverables lijst)
  ├── canvas     → CampaignCanvasPage (board)              ← NIEUW Fase B
  ├── studio/:id → ContentStudioPage (per deliverable)
  └── publish    → PublishPanel                            ← NIEUW Fase B
```

App.tsx switch: `campaign-workspace` blijft de container.
Tab-navigatie wordt uitgebreid met "Canvas" en "Publiceer" tabs.

---

## FASERING

### Fase B — Canvas Fundament (nu)

Bouw: orchestrate board, components kaarten, derive modal,
export-based publish (ZIP + clipboard).

**Wat gebouwd wordt in Fase B:**
- `CampaignCanvasPage` — board per status-kolom
- `DeliverableCard` op Canvas (status, type, quick-acties)
- `DeliverableComponentCard` — component-niveau weergave
- `DeriveModal` — afleiden naar ander content type
- `PublishPanel` — export als ZIP + klembord-kopieer
- API routes: `orchestrate` GET/POST, `components` GET/PATCH, `derive` POST
- Deliverable status enum uitbreiden + migratie
- `CanvasLayout` Prisma model

**Wat naar latere fases verschuift:**
- Volledige approval workflow met e-mailnotificaties → Fase D (Resend live)
- Directe publicatie via Ayrshare → Fase H
- Agent-gestuurde publish-planning → Fase F

### Fase F — Canvas als Agent Interface

Canvas wordt de primaire plek waar gebruiker agent-acties ziet en keurt.
`AgentApproval` records verschijnen als kaarten op het board.

### Fase H — Canvas met directe publicatie

Ayrshare-koppeling. Post-publicatie engagement data stroomt terug
naar Canvas voor rapportage in het wekelijks agent-rapport.

---

## TECHNISCHE CONSTRAINTS

- **Canvas layout is DB-state, niet client-state.** Gebruik `CanvasLayout`
  Prisma model. Nooit localStorage (wordt gepurged bij deployment).
- **Derive hergebruikt bestaande Studio generate-endpoint.** Maak eerst
  nieuw Deliverable aan via campaigns API, roep dan generate aan.
- **Approval UI bouwen in Fase B, notificaties in Fase D.** Feature flag
  `RESEND_ENABLED=false` in dev, `true` na Resend-implementatie.
- **Bulk-acties gebruiken optimistic updates.** Zie lock/unlock implementatie
  in persona-module als referentie-pattern.
- **Board is geen drag-and-drop vereiste in Fase B.** Omhoog/omlaag knoppen
  voor volgorde. Drag-and-drop is uitgesteld nice-to-have.
- **Approval vereist deep links.** URL-based routing (Fase A) is prerequisite
  voor werkende goedkeurings-e-mails. Bouw de UI alvast — blokkeer de
  e-mailstap achter `RESEND_ENABLED` flag.

---

## RELATIE TOT ANDERE DOCUMENTEN

| Document | Relatie |
|----------|---------|
| `CONTENT-STUDIO-SPEC.md` | Per-deliverable generatie (Content Studio) |
| `BRANDCLAW-ROADMAP.md` | Canvas valt onder Fase B; uitgebreid in Fase F en H |
| `CLAUDE.md` | Bestaande patterns voor API, TanStack Query, Zustand |
| `TODO.md` | Fase 6.3-6.6 = Content Studio; Canvas is aanvullend hierop |

---

*Bijgewerkt na elke Canvas-implementatiesessie. [EJ 27-03-2026]*
