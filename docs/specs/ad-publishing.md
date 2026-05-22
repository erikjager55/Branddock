# Ad-publishing — Functionele & Technische Spec

> **Status**: Concept · gestart 2026-05-22
> **Architectuur-anker**: [ADR 2026-05-22-ad-publishing-integration](../adr/2026-05-22-ad-publishing-integration.md). Lees die eerst voor *waarom* deze keuzes — deze spec dekt *wat* en *hoe*.
> **Lezer**: developer (mezelf in volgende sessie of een parallel-sessie) die Fase A/B/C kan oppakken zonder de ADR opnieuw door te nemen.

---

## 1. Scope + non-scope

### In scope (deze spec dekt)

- **Fase A — Ads-generation polish**: alle ad-deliverable-types renderen clean in Content Canvas via het 6-laagse routing-pattern.
- **Fase B — Account-link + publish-pipeline**: OAuth per platform, `ConnectedAdAccount` model, "Publish to Meta" UI, creative-spec validatie, status-sync via polling, token-refresh job.
- **Fase C — Measurement-foundation**: `AdCampaign` + `AdMetricSnapshot` schema, externe-ID storage in publish-flow. Geen UI, geen fetch-job, geen AI.
- **Platforms**: Meta (Fase B/C primary), LinkedIn (Fase B/C secondary, na MDP approval), Google (Fase A only — search-ad rendert; publish post-spec).
- **Test-strategie**: sandbox-test-accounts + mock-mode unit tests + per-platform smoke.

### Non-scope (later, eigen ADR/spec)

- AI improvement-suggestion engine (rewrite copy, audience-tweak, budget-shift, schedule-shift)
- Performance-dashboard UI (metrics-aggregation, brand-fidelity ↔ performance correlatie)
- Webhook-receivers voor real-time status/conversion events (initiële release pollt)
- Autopilot scheduled-publish opt-in
- Google Ads publish-pipeline (search-ad rendert in Canvas, publish blijft TBD)
- Cross-platform creative-bundle management (één creative naar Meta + LinkedIn tegelijk)
- Budget-management / bid-strategy UI (gebruik platform-native UI voor budget-instellingen)

---

## 2. Bestaande infra die we hergebruiken

| Asset | Pad | Hoe |
|---|---|---|
| `TOKEN_ENCRYPTION_KEY` env-var | `.env` | Encrypt/decrypt accessToken + refreshToken bij DB write/read |
| `WorkspaceIntegration` model | `prisma/schema.prisma` | Better Auth OAuth tokens (Google/MS/Apple voor LOGIN). Blijft bestaan; `ConnectedAdAccount` is separate omdat ad-account metadata fundamenteel anders is. Geen dubbel-schrijven. |
| Better Auth OAuth-flow patroon | `src/lib/auth.ts` databaseHooks | Reference-implementatie voor nieuwe OAuth-flows; pattern hergebruiken, niet de hooks zelf |
| F-VAL validation-laag | `src/lib/ai/fval/*` | Style/judge/rules. Platform-specifieke ad-validatie wordt **vierde laag ernaast** (niet binnen F-VAL) — nieuw module `src/lib/ad-providers/<platform>/creative-spec-validation.ts` per platform. Deze laag runt in de publish-route handler als preflight, ná F-VAL judge en vóór de Meta/LinkedIn API-call. Geen extensie van bestaande F-VAL omdat creative-spec checks platform-specifiek zijn (Meta heeft andere image-ratios dan LinkedIn) en geen tone/style-oordeel maken — puur format-validatie. |
| 6-laagse routing-pattern | zie [memory `branddock-round1-social-2026-05-20`](#) | Per ad-type in Fase A toepassen |
| Workspace resolution | `src/lib/workspace-resolver.ts` | `ConnectedAdAccount.workspaceId` is leidend; ad-publish-actie volgt zelfde workspace-context als content-generatie |
| F-VAL `WorkspaceIntegration` ≠ `ConnectedAdAccount` | — | F-VAL OAuth voor login; ConnectedAdAccount voor ad-account API. Verschillende scopes, andere refresh-cyclus, andere token-types. Splitsing rechtvaardigt eigen model. |

---

## 3. Data-model

Alle nieuwe modellen krijgen `createdAt`/`updatedAt` + cascade-deletes naar Workspace.

### 3.1 `ConnectedAdAccount` (Fase B)

```prisma
model ConnectedAdAccount {
  id                String   @id @default(cuid())
  workspaceId       String
  workspace         Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  platform          String   // "meta" | "linkedin" | "google"
  externalAccountId String   // Meta: ad-account-id (act_1234), LinkedIn: sponsoredAccount URN, Google: customer-id
  accountName       String?  // Display name (Meta Business Manager naam etc.)
  currency          String?  // ISO 4217 (EUR/USD)
  timezone          String?  // IANA timezone (Europe/Amsterdam)

  // Encrypted with TOKEN_ENCRYPTION_KEY at write-time, decrypted at read-time via helper
  accessTokenEncrypted  String
  refreshTokenEncrypted String?
  tokenExpiresAt        DateTime?

  scopes            String[] // gegranteerde OAuth scopes
  status            String   // "active" | "expired" | "revoked" | "error"
  lastRefreshedAt   DateTime?
  lastErrorMessage  String?

  connectedById     String   // User die OAuth-flow voltooide
  connectedBy       User     @relation(fields: [connectedById], references: [id])

  campaigns         AdCampaign[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([workspaceId, platform, externalAccountId])
  @@index([workspaceId, platform, status])
}
```

**Timestamp-semantiek**:
- `updatedAt` (Prisma `@updatedAt`) — auto-managed, bumpt bij ELKE row-write inclusief status-poll. Audit-trail.
- `lastStatusSyncAt` — alleen handmatig gezet door de status-sync job (§7.4) bij elke Meta-API poll, ongeacht of status veranderde. Query-veld voor "welke campagnes moeten gepolled worden" (`WHERE lastStatusSyncAt < now() - 5min`).

Bij een poll-cycle bumpt de job dus BEIDE velden, ook als de status niet veranderde — dat is correct gedrag: `lastStatusSyncAt` blijft daarmee accuraat voor het volgende poll-interval.

**Initial value bij eerste publish**: `lastStatusSyncAt = NULL` direct na publish. Dit zorgt dat de status-sync job de campagne in het eerste poll-interval (binnen 5 min na publish) oppikt, omdat `NULL < now() - 5min` true is in de query. Niet zetten op `publishedAt` — dat zou de eerste poll met 5 min vertragen.

### 3.2 `AdCampaign` (Fase C — voorbereiding van publish-flow)

Eén row per gepubliceerd creative; meerdere campagnes per Deliverable mogelijk (zelfde creative naar Meta + LinkedIn = 2 rijen).

```prisma
model AdCampaign {
  id                  String   @id @default(cuid())
  deliverableId       String
  deliverable         Deliverable @relation(fields: [deliverableId], references: [id], onDelete: Cascade)

  connectedAccountId  String
  connectedAccount    ConnectedAdAccount @relation(fields: [connectedAccountId], references: [id], onDelete: Restrict)

  // External IDs — naming volgt Meta-conventie, abstract genoeg voor LinkedIn/Google ook
  externalCampaignId  String?  // Meta: campaign-id, LinkedIn: campaign-id, Google: campaign resource name
  externalAdSetId     String?  // Meta: ad-set-id, LinkedIn: campaign-group, Google: ad-group
  externalCreativeId  String?  // Meta: creative-id, LinkedIn: creative URN, Google: ad-asset
  externalAdId        String?  // Meta: ad-id, LinkedIn: creative-id, Google: ad-id

  status              String   // "draft" | "publishing" | "active" | "paused" | "rejected" | "failed"
  statusMessage       String?  // platform reason bij rejected/failed
  lastStatusSyncAt    DateTime?

  publishedAt         DateTime?
  publishedByUserId   String?
  publishedByUser     User?    @relation(fields: [publishedByUserId], references: [id])

  // Snapshot van wat naar de API ging, voor audit + later re-submission
  publishedPayload    Json?

  metrics             AdMetricSnapshot[]

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([deliverableId])
  @@index([connectedAccountId, status])
  @@index([externalCampaignId])
}
```

### 3.3 `AdMetricSnapshot` (Fase C — leeg gevuld, structuur klaar)

Eén row per (campagne × tijdstip). Initiële release: lege table; fetch-job komt in vervolg-spec.

```prisma
model AdMetricSnapshot {
  id            String   @id @default(cuid())
  campaignId    String
  campaign      AdCampaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  capturedAt    DateTime
  windowStart   DateTime // metric-bucket start
  windowEnd     DateTime // metric-bucket end

  impressions   Int?
  reach         Int?
  clicks        Int?
  ctr           Float?
  cpm           Float?
  cpc           Float?
  spend         Float?
  conversions   Int?
  conversionValue Float?

  // Platform-specifieke velden (Meta engagement breakdown, LinkedIn lead-form fills, etc.)
  raw           Json     // full payload van platform — query-able zonder schema-migratie

  createdAt     DateTime @default(now())

  @@index([campaignId, capturedAt])
  @@unique([campaignId, windowStart, windowEnd])
}
```

### 3.4 `ImprovementSuggestion` (future — placeholder, niet bouwen in deze spec)

```prisma
// LATER — vervolg-ADR + vervolg-spec
// model ImprovementSuggestion {
//   id            String   @id @default(cuid())
//   campaignId    String
//   type          String   // "copy-rewrite" | "audience-tweak" | "budget-shift" | "schedule-shift"
//   suggestion    Json
//   confidence    Float
//   status        String   // "pending" | "applied" | "rejected"
//   ...
// }
```

### 3.5 Encryption helper

Nieuwe `src/lib/ad-tokens/encryption.ts`:

```ts
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const KEY = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY!, "base64");
const ALGO = "aes-256-gcm";

export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptToken(encoded: string): string {
  const buf = Buffer.from(encoded, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
```

Reuse: hergebruik dezelfde helper voor `WorkspaceIntegration` tokens in volgende refactor (out-of-scope).

---

## 4. OAuth-flow per platform

### 4.1 Meta (primary — Fase B)

**App-setup vereist (parallel approval-spoor)**:
- Branddock-app aanmaken in Meta App Dashboard
- Marketing API toevoegen
- Business Verification doorlopen (2-8 wk wachttijd)
- App-review aanvragen voor `ads_management` + `ads_read` permissions

**Scopes**: `ads_management`, `ads_read`, `business_management`, `pages_show_list`, `pages_read_engagement`

**Routes** (alle onder `src/app/api/ad-accounts/meta/`):

| Route | Method | Doel |
|---|---|---|
| `/api/ad-accounts/meta/connect` | GET | Redirect naar Meta OAuth dialog met state-token |
| `/api/ad-accounts/meta/callback` | GET | OAuth code → access-token exchange + ad-account-selection scherm |
| `/api/ad-accounts/meta/select` | POST | User kiest welk Business + ad-account → `ConnectedAdAccount` rij wordt aangemaakt |
| `/api/ad-accounts/meta/refresh` | POST | Long-lived token refresh (60d cycli) |
| `/api/ad-accounts/meta/disconnect` | DELETE | Revoke + soft-delete `ConnectedAdAccount` (zie disconnect-behavior hieronder) |

**Disconnect-behavior met actieve campagnes**: Schema heeft `AdCampaign.connectedAccount onDelete: Restrict` — een hard-delete van `ConnectedAdAccount` faalt als er rows in `AdCampaign` zijn die ernaar wijzen. Daarom hanteren we **soft-delete via status-veld** in plaats van hard-delete:

- `DELETE /api/ad-accounts/meta/disconnect` → set `ConnectedAdAccount.status='revoked'`, NUL `accessTokenEncrypted` + `refreshTokenEncrypted`, behoud row voor historische `AdCampaign`-referenties
- Bijbehorende UI-confirmation toont aantal actieve campagnes ("Je hebt N actieve campagnes via dit account — die blijven draaien in Meta maar Branddock kan niet meer pollen/aanpassen tot je opnieuw verbindt")
- Bestaande `AdCampaign` rows blijven werken voor read-only audit, maar nieuwe publishes naar dit account zijn geblokkeerd (`status='revoked'` filter in `ConnectedAdAccount`-select UI)
- Reconnect later via dezelfde `/connect` flow zoekt op `(workspaceId, platform, externalAccountId)` unique key en heractiveert de bestaande row (`status='active'`, nieuwe tokens) — verbindt automatisch met bestaande `AdCampaign`-historie

**Token-lifecycle**: Meta short-lived tokens (1u) → exchange voor long-lived (60d) direct na callback. Twee refresh-paden bestaan naast elkaar; zie precedence hieronder.

#### 4.1.1 Token-refresh precedence (inline vs scheduled)

| Pad | Wanneer | Doel | Falure-mode |
|---|---|---|---|
| **Scheduled** (`src/lib/jobs/refresh-ad-tokens.ts`, dagelijks 03:00 UTC) | `tokenExpiresAt < now() + 7d AND status='active'` | Pre-emptief verlengen; user merkt niets | Falure → `status='expired'` + email naar `connectedBy.email` (user is niet aanwezig) |
| **Inline** (in publish-route handler, vóór Meta API-call) | Bij elke publish, check `tokenExpiresAt < now() + 5min` OF Meta returnt 401 mid-call | Recovery; voorkomt dat user-gericht publish faalt door verlopen token | Falure → `status='expired'` + UI toont "Reconnect Meta" modal (geen email; user staat al voor het scherm) |

**Precedence**: Scheduled is primair, inline is fallback. In normale flow refresht scheduled job pre-emptief en is inline een no-op. Inline-refresh kicks in alleen bij race-conditions (publish < 5min na token-expiry voordat scheduled job aan de beurt was, of platform-side rotation). Beide paden gebruiken dezelfde `refreshMetaToken()` helper in `src/lib/ad-providers/meta/oauth.ts` — geen duplicated logic.

**Sandbox**: Meta dev-mode app heeft test-users met test-ad-account ingebouwd. Geen live ad-spend mogelijk in dev-mode. Switch naar productie-mode pas na app-review approved. Setup-instructies (dev-app aanmaken, test-user toevoegen, app-credentials in `.env`) zijn out-of-scope voor deze spec — zie Meta's officiële developer-onboarding docs (link in §12). Spec gaat ervan uit dat dev-app klaar staat vóór Fase B start.

### 4.2 LinkedIn (secondary — Fase B na MDP)

**App-setup vereist (parallel approval-spoor, start ná Meta werkend bewijs)**:
- LinkedIn Developer App registreren
- Marketing Developer Platform (MDP) partnership aanvragen — vereist business-case + Meta-pijler als bewijs
- Approval kan maanden duren

**Scopes**: `r_ads`, `rw_ads`, `r_organization_admin`, `r_ads_reporting`

**Routes**: spiegel `/api/ad-accounts/linkedin/{connect,callback,select,refresh,disconnect}` (zelfde shape als Meta).

**Token-lifecycle**: LinkedIn access-token 60d met refresh-token (60d, non-refreshable na 60d → user moet opnieuw OAuth doorlopen). Job stuurt email-reminder 7d voor expiry.

**Sandbox**: test-ad-accounts via MDP-program (na approval beschikbaar). Geen Meta-equivalent dev-mode.

### 4.3 Google (placeholder — Fase A only)

Geen publish-implementatie deze spec. `search-ad` deliverable rendert in Canvas via 6-laagse routing-pattern. Toekomstige OAuth-flow volgt zelfde shape `/api/ad-accounts/google/...`. Google Ads OAuth heeft developer-token-eis (apart van OAuth-tokens) wat aanvullende approval-stap is.

---

## 5. Publish-pipeline architectuur (Fase B)

End-to-end flow voor "Publish to Meta" knop op Content Canvas:

```
User klikt "Publish to Meta" op Deliverable
    ↓
1. Server-side: resolveWorkspaceId → load Deliverable + content
    ↓
2. ConnectedAdAccount-select UI (als workspace meerdere accounts heeft, anders auto)
    ↓
3. Creative-spec validatie (vierde F-VAL laag)
   - char-limits per veld (headline 40 chars, primary-text 125, etc.)
   - image dimensies (1080×1080 voor square, 1200×628 voor landscape)
   - video codec/duration/file-size
   - landing-page URL bereikbaar (HEAD-request)
   FAIL → toon errors, geen API-call
    ↓
4. POST /api/ad-publish/meta met { deliverableId, connectedAdAccountId, options }
    ↓
5. Server-side flow:
   a. decrypt accessToken via decryptToken()
   b. Meta API: create Campaign (objective, status=PAUSED)
   c. Meta API: create Ad Set (audience, budget, schedule)
   d. Meta API: upload Creative (image/video/copy)
   e. Meta API: create Ad linking AdSet + Creative
   f. Schrijf AdCampaign-rij met alle external IDs + publishedPayload snapshot
   g. Return { adCampaignId, externalUrls }
    ↓
6. Polling job /api/ad-publish/sync-status (1x per 5 min, alleen rows met status in ['publishing','active'])
   - Update AdCampaign.status + statusMessage
   - Bij rejection: surface platform-reason in UI
```

**Initiële release blijft alles PAUSED** in platform — user activeert vanuit Meta Business Manager. Dat is veiligheidsslot voor pre-launch trust: Branddock zet ad nooit live, alleen ready-to-go.

**Error-handling**:
- Network errors / 5xx van Meta → retry 3x exponential backoff, dan AdCampaign.status="failed"
- Validation errors (4xx van Meta) → AdCampaign.status="rejected" met platform-message, geen retry
- Quota errors (429 / 80004) → schedule retry in 1u, status="publishing"
- **Token expired tijdens publish** → publish-flow doet **inline refresh** voor de Meta API-call (zie 4.1.1 voor precedence-volgorde tussen inline en scheduled refresh). Inline refresh slaagt → continue create-calls. Faalt → `ConnectedAdAccount.status="expired"` + UI toont "Reconnect Meta account" modal (geen email; user staat al voor het scherm). Background scheduled job is voor pre-emptive refresh, niet voor publish-time recovery.

**Image-upload flow** (cruciale stap binnen 5d):

Branddock-content bevat beelden uit Media Library (S3-backed, eigen storage). Meta vereist dat creatives refereren aan een asset in Meta's eigen ad-image library (`ad_account_id/adimages` endpoint), geen externe URL. Flow:

1. Server-side: lees `Deliverable.heroImageUrl` of variant-image → fetch bytes vanaf Branddock S3 (signed URL of direct streaming)
2. POST naar `/{ad-account-id}/adimages` multipart/form-data met image-bytes → Meta returnt een `image_hash`
3. Cache het `image_hash` in `AdCampaign.publishedPayload.images[].metaImageHash` voor latere idempotency (zelfde image niet 2x uploaden)
4. Bij creative-create (5d): refereer aan `image_hash` in plaats van URL

Identieke logica voor video: POST naar `/{ad-account-id}/advideos` returnt `video_id`. Video-upload is async; poll `video_status` tot `processed` voor creative-create.

**Sandbox vs prod**: env-var `META_API_MODE=sandbox|prod`. Sandbox-mode gebruikt Meta dev-mode endpoints + alleen test-accounts. Switch via deploy-config, geen runtime-switch.

**PAUSED-status enforcement**: De `status=PAUSED` parameter wordt geïnjecteerd vanuit één geëxporteerde constante `INITIAL_PUBLISH_STATUS = 'PAUSED'` in `src/lib/ad-providers/meta/constants.ts`, geïmporteerd door `src/lib/ad-providers/meta/publish.ts` `createCampaign()`. Geen config-flag, geen DB-constraint — alleen code. Drie mitigations tegen accidental bypass:

1. **Single source of truth**: alleen `INITIAL_PUBLISH_STATUS` mag worden gebruikt in publish-call — directe string-literals `'ACTIVE'`/`'PAUSED'` in publish-route zijn een red flag in code-review
2. **Unit-test in §9.2** asserteert dat de Meta-API payload `status === 'PAUSED'` bevat (mock-mode, snapshot test)
3. **Pre-commit checklist item** in PR-template: "PAUSED-constante onveranderd in `meta/constants.ts`?" — zichtbaar bij elke PR die ad-providers/meta/ raakt

Als toekomst-spec een `ACTIVE`-publish flow nodig heeft (autopilot, opt-in autopublish), wordt dat een tweede expliciete constante naast `INITIAL_PUBLISH_STATUS` met eigen ADR-rationale.

---

## 6. Fase A breakdown — Ads-generation polish

Per ad-type het 6-laagse routing-pattern toepassen, mirror van facebook-post / twitter-thread (zie `branddock-round1-social-2026-05-20` memory). Volgorde + status:

| Ad-type | Status | Per type werk |
|---|---|---|
| `linkedin-ad` | ✓ klaar (Ronde 1) | — |
| `facebook-ad` | ⏳ | Check 6 lagen; `facebook.ad` PLATFORM_PREVIEW_MAP entry bestaat al (routes naar `FacebookPostPreview`). Verifieer: canvas-context mapping, seed-row `facebook/ad`, content-type-inputs schema |
| `display-ad` | ⏳ | Banner-format (300×250, 728×90, 160×600). Mogelijk nieuwe `DisplayAdPreview` of hergebruik `LinkedInAdPreview` |
| `native-ad` | ⏳ | Sponsored-content stijl; check welke preview |
| `video-ad` | ⏳ | Video-script type, gebruikt `VideoPreview` + scripted-scene flow uit `component-templates-fallback.ts` (al gebouwd voor `linkedin-video-ad`) |
| `retargeting-ad` | ⏳ | Heeft vermoedelijk eigen content-type-inputs (audience-segment, exclusion-rule); preview waarschijnlijk hergebruikt |
| `search-ad` | ⏳ Fase-A | Multi-field RSA — needs new `SearchAdPreview` component. Audit-output al beschikbaar in conversation; substantiel werk (~4-6u) |

**Per-type checklist (kopieer in task-file)**:

1. `DELIVERABLE_TYPE_TO_MEDIUM` in `src/lib/ai/canvas-context.ts` — entry aanwezig + correct mapt naar platform/format?
2. `PLATFORM_PREVIEW_MAP` in `src/features/campaigns/components/canvas/previews/preview-map.ts` — platform/format → preview-component routing?
3. `CONTENT_TYPE_PREVIEW_MAP` (same file) — fallback entry?
4. `MediumEnrichment` seed in `prisma/seed.ts` — platform/format row met componentTemplate dat de preview-groepen matched?
5. `component-templates-fallback.ts` — entry nodig (alleen voor video-script / structured-format types)?
6. Preview-component zelf — leest juiste group-namen, heeft fallback-chain, handledGroups masker is compleet?
7. Prompt-template in `src/lib/studio/prompt-templates/advertising.ts` — system+user prompt aligned met groep-namen + creative-spec?

Smoke-test per type: open Linfi of Napking workspace → Add Content → ad-type → genereer. Verwacht: clean preview, brand-fidelity >65, geen ADDITIONAL COMPONENTS blob, content matched platform-conventies.

---

## 7. Fase B breakdown — Account-link + publish-pipeline

### 7.1 Schema-migratie (week 1)

Prisma migration `add-connected-ad-account-and-ad-campaign`:
- `ConnectedAdAccount` + `AdCampaign` + `AdMetricSnapshot` tables (zie sectie 3)
- Cascade-deletes naar Workspace + Deliverable
- Indexes voor query-paden uit sectie 5

### 7.2 OAuth-flow (week 1-2)

- `src/app/api/ad-accounts/meta/` routes (zie 4.1)
- `src/lib/ad-tokens/encryption.ts` helper (zie 3.5)
- `src/lib/ad-providers/meta/oauth.ts` — wrapper voor Meta OAuth code-exchange + long-lived-token-conversion
- UI: `/settings/integrations/ad-accounts` nieuwe sectie naast bestaande integrations — toont connected accounts + "Connect Meta" knop → redirect naar OAuth flow

### 7.3 Publish-UI op Content Canvas (week 2-3)

- "Publish to Meta" knop op Content Canvas Step 4 (Planner) voor ad-type deliverables
- Modal: select ConnectedAdAccount + objective + budget-placeholder (info-only, niet ingesteld via API) + audience-summary
- Preflight creative-spec validatie (zie sectie 5 stap 3)
- Submit → POST `/api/ad-publish/meta` → polling status-bar
- Success state: link naar Meta Business Manager ad-page + "View in dashboard" placeholder (Fase D)

### 7.4 Status-sync (week 3)

- `src/lib/jobs/sync-ad-campaign-status.ts` — Cron job 1x/5min
- Query: `AdCampaign WHERE status IN ('publishing','active') AND lastStatusSyncAt < now() - 5min`
- Per row: Meta API GET ad-status → update AdCampaign
- Cron infra: hergebruik patroon uit [ADR 2026-05-12-cron-infra](../adr/2026-05-12-cron-infra.md) (`CRON_SECRET` env-var)

### 7.5 Token-refresh (week 3)

- `src/lib/jobs/refresh-ad-tokens.ts` — Cron job 1x/24u
- Query: `ConnectedAdAccount WHERE tokenExpiresAt < now() + 7d AND status='active'`
- Per row: refresh via Meta API → re-encrypt → update row
- Failure → status='expired' + email naar connectedBy.email

### 7.6 LinkedIn (week 4-6, parallel ná Meta MVP)

Spiegel 7.1-7.5 voor LinkedIn. Verschillen:
- Geen long-lived-token-conversion (LinkedIn 60d direct)
- Andere campaign-structuur (Campaign Group → Campaign → Creative)
- Sponsored-content-type kiezen via API (sponsored-content vs sponsored-message vs dynamic-ads)

---

## 8. Fase C breakdown — Measurement-foundation

Overlap met Fase B; data-model bouwt mee in dezelfde Prisma migration.

### 8.1 External-IDs storage in publish-flow

Tijdens publish (sectie 5 stap 5f), schrijf alle 4 external IDs (`externalCampaignId`, `externalAdSetId`, `externalCreativeId`, `externalAdId`) naar AdCampaign row + `publishedPayload` JSON snapshot. Dit is voldoende om in een toekomstige fetch-job per row te kunnen pollen.

### 8.2 `AdMetricSnapshot` lege table

Table wordt gemigreerd maar geen fetch-job gebouwd. Toekomstige spec definieert:
- Polling-strategie (hourly vs daily, per platform rate-limit)
- Aggregation in workspace-dashboard
- Brand-fidelity ↔ performance-correlatie analyse

**Waarom nu bouwen**: Zonder external-IDs in AdCampaign + `AdMetricSnapshot` schema klaar, vereist later toevoegen schema-migratie + backfill van bestaande gepubliceerde ads. Door nu de structuur te leggen, is de fetch-job in vervolg-spec een additieve feature, geen refactor.

### 8.3 `raw: Json` kolom in AdMetricSnapshot

Platform-specifieke breakdowns (Meta engagement-types, LinkedIn lead-gen-form-fills, Google quality-score) vallen in deze JSON. Query-able via Postgres JSON-operatoren zonder schema-wijziging. Vervolg-spec normaliseert wat structureel nuttig blijkt.

---

## 9. Test-strategie

### 9.1 Sandbox-test-accounts

| Platform | Setup | Notes |
|---|---|---|
| Meta | Dev-mode app → test-user + test-ad-account auto-created | Geen live ad-spend mogelijk; ideaal voor smoke + CI |
| LinkedIn | MDP-toegekende test-account-pool | Niet beschikbaar tot MDP-approval; smoke pas mogelijk in week 4+ |
| Google | Test-network OAuth client | Out-of-scope deze spec |

### 9.2 Mock-mode unit tests

Nieuwe `src/lib/ad-providers/__mocks__/meta.ts` — mockt Meta SDK responses. Unit tests voor:
- Token encryption/decryption roundtrip
- Creative-spec validatie (char-limits, image-dimensions)
- Publish-pipeline state-machine (status transitions)
- Token-refresh failure paths

CI: `npm run test -- ad-providers` — alle mocks, geen netwerk.

### 9.3 Per-platform smoke

E2E smoke test (`npm run test:e2e -- --grep ad-publish-meta`):
1. Login als test-user
2. Open test-workspace met linked Meta sandbox-account
3. Open ad-type deliverable
4. Klik "Publish to Meta"
5. Verifieer AdCampaign row aangemaakt met externalIds
6. Verifieer status="publishing" → polling-cycle → status="active" (sandbox simuleert direct)

### 9.4 Manual exploratory

Pre-merge naar main: developer opent Linfi workspace, publisht 1 facebook-ad naar sandbox, verifieert in Meta Business Manager dat ad ge-PAUSED is.

---

## 10. Acceptatiecriteria per fase

### Fase A

- [ ] Alle 7 ad-types (linkedin-ad, facebook-ad, display-ad, native-ad, video-ad, retargeting-ad, search-ad) renderen in Content Canvas met platform-correct preview
- [ ] Brand-fidelity score ≥ 65 op smoke-test per type met Linfi-workspace
- [ ] Geen ADDITIONAL COMPONENTS blob (content-leak) op enige type
- [ ] `npx tsc --noEmit` exit 0
- [ ] Per type committed met `feat(<type>): ...` conventional-commit message

### Fase B

- [ ] Meta OAuth-flow draait sandbox-end-to-end: connect → callback → ad-account-select → `ConnectedAdAccount` row
- [ ] "Publish to Meta" knop publiceert facebook-ad naar Meta sandbox als PAUSED ad
- [ ] AdCampaign row schrijft alle 4 external IDs + publishedPayload
- [ ] Token-refresh job draait dagelijks, verlengt tokens die binnen 7d expiren
- [ ] Status-sync job updatet AdCampaign.status correct (publishing → active/rejected/failed)
- [ ] Creative-spec validatie blokkeert publish bij over-de-limiet headline/image
- [ ] LinkedIn-flow parallel (zelfde criteria) na MDP-approval

### Fase C

- [ ] Prisma migration aangemaakt voor ConnectedAdAccount + AdCampaign + AdMetricSnapshot
- [ ] External-IDs schrijven bij publish-flow geverifieerd via DB-inspectie
- [ ] `AdMetricSnapshot` table bestaat maar bevat geen rijen (correct in deze fase)
- [ ] Schema gevalideerd via `npx prisma db push` zonder migration-conflicten

---

## 11. Open vragen / TBD

- [ ] **Welke Meta-objectives ondersteunen we initieel?** Optie: alleen `OUTCOME_AWARENESS` + `OUTCOME_TRAFFIC` voor MVP; conversion-objectives volgen na Pixel/Conversion-API integratie (vervolg-spec)
- [ ] **Cron-runner**: hergebruik bestaande cron-infra ([ADR 2026-05-12-cron-infra](../adr/2026-05-12-cron-infra.md)) of nieuwe scheduler? Default: hergebruik
- [ ] **Webhook-vs-polling**: status-sync via polling in initiële release. Webhooks zijn out-of-scope; mogelijk performance-issue als veel actieve campagnes — herzien na 50+ live ads
- [ ] **Multi-workspace account-sharing**: kan één Meta ad-account aan meerdere Branddock-workspaces gekoppeld zijn? Initiële beslissing: nee (1-op-1) — voorkomt confusion bij agencies; herzien als use-case opduikt
- [ ] **Budget-management API**: schrijven we budgetten via API of laten we user dat in Meta Business Manager doen? Initieel: alleen in Meta UI (PAUSED-mode workaround); auto-budget via API in vervolg-spec
- [ ] **Audience-targeting input UI**: tot welk niveau exposed Branddock targeting-velden (age/location/interests/lookalike)? Initieel: minimaal — alleen "use default workspace audience" + handmatige audience-ID-input; full UI in vervolg-spec
- [ ] **Search-ad publish-pad**: Fase A only voor nu, maar wanneer Google-pijler? Beslissing parkeerd tot na Meta+LinkedIn werken
- [ ] **Conversion-tracking**: server-side Conversions API vs Pixel-only vs platform-native? Future-spec
- [ ] **`WorkspaceIntegration` → `ConnectedAdAccount` refactor**: ooit consolideren tot één tokens-table? Niet voor deze spec
- [ ] **Programmatic publish-API**: `POST /api/ad-publish/<platform>` is initieel Canvas-UI-driven, maar het endpoint zelf is workspace-scoped en stateless — een toekomstig campaign-bulk-publish of CLI-flow kan dezelfde endpoint hergebruiken zonder wijziging. Beslissing voor nu: endpoint is intern-publiek (auth-gated, niet rate-limited per third-party), externe API-contract komt in vervolg-spec als use-case opduikt

---

## 12. Cross-references

- ADR: [`2026-05-22-ad-publishing-integration`](../adr/2026-05-22-ad-publishing-integration.md) — *waarom* deze keuzes
- ADR: [`2026-02-12-better-auth-organization`](../adr/2026-02-12-better-auth-organization.md) — OAuth-flow patroon herbruikbaar
- ADR: [`2026-05-12-cron-infra`](../adr/2026-05-12-cron-infra.md) — Cron-runner voor status-sync + token-refresh
- Memory: `branddock-round1-social-2026-05-20` — 6-laagse routing-pattern voor Fase A
- Memory: `branddock-pre-launch-tracks` — overall sprint-tracking; Fase A kan in pre-launch, Fase B/C post-launch
- Externe: [Meta Marketing API](https://developers.facebook.com/docs/marketing-apis), [LinkedIn Marketing API](https://learn.microsoft.com/en-us/linkedin/marketing/), [Google Ads API](https://developers.google.com/google-ads/api/docs/start) (parked)
