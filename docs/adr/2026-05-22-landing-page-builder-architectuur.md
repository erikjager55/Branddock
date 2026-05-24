---
id: 2026-05-22-landing-page-builder-architectuur
title: Web-page builder architectuur — Puck (MIT) als Canvas Medium-renderer + Vercel hosting + custom domain via CNAME
status: accepted
date: 2026-05-22
supersedes: -
superseded-by: -
---

# Context

Branddock heeft **5 web-page content-types** (`landing-page`, `product-page`, `faq-page`, `comparison-page`, `microsite`) die vandaag via de Canvas-flow (Brief → Strategy → Concept → Canvas → Export) Markdown + structured-fields produceren, maar **geen publishable HTML** en geen drag-drop-editor. Klanten kunnen complete campagnes ontwerpen met perfect brand-aware content, maar moeten daarna naar een externe tool (Webflow/HubSpot) om de bijbehorende pagina te bouwen — waardoor de brand-context (Brandstyle/BrandVoice/Personas) op het kritiekste touchpoint verdampt.

Concurrentie-benchmark = HubSpot Content Hub (Starter $15/mnd, Professional $450/mnd) — die levert pakket integraal. Eerste use-case is Branddock's eigen `marketing-site-pricing` (Track C launch-tier); structurele use-case is een premium-feature voor pilot-klanten post-launch.

**Sleutelinzicht (2026-05-22)**: dit is geen aparte feature-tab, maar een **Canvas-step uitbreiding** voor de bestaande `web-page` content-category. Brand-context wordt al door de stepper geïnjecteerd via `assembleCanvasContext()`; we hoeven alleen de Medium-render-laag (Step 3) te vervangen door een visual editor voor web-page types.

**Vereisten** (afgeleid uit gesprek 2026-05-22 + HubSpot-architectuur-benchmark + Canvas-architectuur-audit):

1. Visual editor embedded in Canvas Step 3 (Medium) — geen aparte feature-tab, geen redirect naar externe tool
2. Multi-tenant + white-label — klant ziet Branddock, niet de leverancier
3. Brand-context-consumptie via bestaande `assembleCanvasContext(deliverableId, workspaceId)` — geen aparte injection-laag
4. Variant-content (Step 2) seedt initieel de Puck-data-tree zodat AI-output in Step 3 direct manipuleerbaar is
5. Publish-flow als nieuwe Export-step-actie: naar `<workspace>.branddock.app/<slug>` (default) + custom domain via CNAME (v2)
6. AI-generatie via bestaande Anthropic-stack — Step 2 variants levert al brand-aware content; Step 3 voegt visual-tree-generation toe
7. Pre-launch tijd-budget beperkt — geen 3-6 maanden build-from-scratch
8. Geen vendor op kritiek-pad pilot — license-vrijheid + portable JSON-data

**Bestaande infrastructuur (relevant voor stepper-integratie)**:
- Next.js 16 App Router + React 19 (SPA-hybride zoals beschreven in `CLAUDE.md`)
- Prisma 7 + PostgreSQL 17 (jsonb-support voor component-trees)
- Better Auth + workspace-resolver (`src/lib/workspace-resolver.ts`)
- `src/lib/ai/anthropicClient` voor AI-generatie
- Vercel-deployment in pre-launch sprint #6 (Track C `vercel-deployment` task)
- Brandstyle + BrandVoiceguide + Persona models al gemodelleerd in Prisma
- **Canvas-flow registry**: `src/features/campaigns/constants/canvas-flow-registry.ts` (DEFAULT_FLOW: context → variants → medium → planner)
- **Step 3 Medium-dispatcher**: `src/features/campaigns/components/canvas/previews/preview-map.ts` — `resolvePreviewComponent(platform, format, contentType)` levert vandaag `LandingPagePreview` voor `platform: 'web'`
- **Web-page content-types geregistreerd**: `src/features/campaigns/lib/content-type-inputs.ts` (lines 2209-2370) — alle 5 types mappen naar `platform: 'web', format: 'landing-page'`
- **Brand-context assembly**: `src/lib/ai/canvas-context.ts` — `assembleCanvasContext(deliverableId, workspaceId)` levert `CanvasContextStack { brand, concept, journeyPhase, medium, personas, brief, products, contentTypeInputs, visualBrief }` met 5-min cache via `getBrandContext()`

**Out-of-scope voor deze ADR**:
- A/B-testing framework (post-launch, eigen ADR)
- Form-builder + CRM-koppeling (post-launch)
- Smart-content / per-visitor personalization (post-launch)
- DNS-provider auto-write (GoDaddy/Cloudflare/Route53 OAuth) — friction-feature, niet kritisch voor MVP

# Decision

**Vijf samenhangende keuzes** (Pattern B uit Canvas-architectuur-audit 2026-05-22):

1. **Integratie-pattern: Puck als Medium-renderer in Canvas Step 3** voor de `web-page` content-category — vervangt `LandingPagePreview` voor de 5 types (`landing-page`, `product-page`, `faq-page`, `comparison-page`, `microsite`). Niet een aparte feature-tab.

2. **Editor-stack: Puck (`@puckeditor/core`) als open-source bouwsteen**, MIT-license. Custom components consumeren `CanvasContextStack` (bestaande context-assembly) via prop, zodat brand-tokens automatisch beschikbaar zijn binnen Puck's render-functies.

3. **Hosting: Vercel + Next.js middleware** voor multi-tenant routing. Eén Vercel-project host alle web-pages onder workspace-subdomain en (later) custom domains. Publish wordt nieuwe Export-step-actie.

4. **Custom domain provisioning: Vercel Domains API + CNAME-pattern** identiek aan HubSpot-architectuur (`pages.klant.nl CNAME → cname.vercel-dns.com`). SSL automatisch via Let's Encrypt (Vercel-managed). MVP scope = subdomain only; custom domains in v2.

5. **Persistentie: PostgreSQL via Prisma**, page-data als `Json` (jsonb) kolom in `deliverable.settings.puckData` (hergebruik bestaande Deliverable-model) + losse `LandingPage` model voor publish-state (slug + status + customDomain). Hergebruik van bestaande workspace-resolver voor multi-tenant scoping.

# Y-statement

In de context van **Branddock 5 bestaande web-page content-types die via Canvas-flow Markdown produceren maar geen publishable HTML**, facing **build-vs-buy-vs-fork keuze voor visual page-builder + integratie-locatie in stepper**, I decided **Puck (MIT) als Medium-renderer in Step 3 voor `web-page` category + Vercel + middleware-routing + Vercel Domains API voor custom domains** to achieve **vendor-vrije brand-context-consumptie via bestaande canvas-context-assembly + natuurlijke stepper-integratie zonder UX-breuk + industriestandaard hosting-pattern + portable JSON-data + zero extra AI-vendor**, accepting tradeoff **zelf bouwen van Puck-wrapper-component + publish-flow + domain-verificatie-UX + variant-to-Puck-seed-logica (geen turnkey product zoals Plasmic Enterprise)**.

# Consequences

## Positief

- **License-vrijheid** — Puck core is MIT, geen AGPL-trigger zoals Plasmic Studio bij SaaS-aanbod; geen vendor-license-fee
- **Natuurlijke stepper-integratie** — geen aparte UX-flow, geen feature-tab; gebruikers vinden de builder waar ze hem verwachten (in Canvas Step 3 voor web-page types)
- **Brand-context automatisch beschikbaar** — `CanvasContextStack` levert al brand + concept + persona + product + brief; Puck-components consumeren dit als prop, geen data-binding gymnastiek
- **Variant-content (Step 2) als Puck-seed** — AI-gegenereerde content uit Step 2 is direct manipuleerbaar in Step 3, geen handmatig kopiëren
- **Portable JSON-data** — `deliverable.settings.puckData` is gewoon JSON, exporteerbaar, queryable, migreerbaar naar alternatieve renderers indien nodig
- **Hergebruik bestaande stack** — Next.js App Router, Prisma, Anthropic-client, workspace-resolver, canvas-context-assembly — geen nieuwe dependencies van betekenis
- **Minimal-invasive integratie** — ~6 files te raken (Puck-wrapper + preview-map dispatch + Step3 routing + store slice + Prisma migration + publish API)
- **Architectuur is gevalideerd** — HubSpot doet exact dit pattern (subdomain default + CNAME custom domain + auto-SSL), 20 jaar productie-bewijs
- **Cost-positie** — schatting €15-20k eenmalig (150-200 dev-uren) + €0/mnd ongoing license, vs €12-36k/jr aan Plasmic Enterprise (vermoedelijk €1-3k/mnd × 12)

## Negatief / tradeoffs

- **Zelf bouwen van Puck-wrapper-component + publish-flow + verificatie-UX** — geen turnkey product; ~4-6 weken MVP voor 1 dev
- **Variant→Puck seed-mapping is nieuw werk** — Step 2 levert variant-content (Markdown sections), Step 3 verwacht Puck-data-tree (component-instances met props). Een mapper-functie moet AI-output omzetten naar Puck-data. Spike-validatie nodig.
- **Step 3 routing-keuze noodzakelijk**: huidige `WebPageLayout` (medium-config UI) vs nieuwe `PuckPageBuilder`. Twee opties: (a) volledig vervangen voor web-page types (cleaner), (b) toggle in UI "use builder" (meer flexibel maar complexer state). Spike informeert keuze.
- **Geen versioned releases bij Puck-upgrades** — package volgt semver, maar release-cadens van Puck-team bepaalt regressie-risico bij upgrades. Mitigatie: pin op exacte versie + handmatige upgrade-tests
- **Marketer-grade drag-drop UX onbewezen voor onze custom components** — Puck v0.21.x heeft rich text + inline editing + virtualization, maar of het Webflow/Builder-niveau aanvoelt vereist spike-validatie
- **Custom field-types (`<BrandColorPicker>`, `<PersonaSelector>`, `<BrandVoiceTonePicker>`) moeten we bouwen** — Puck's `external` field-type ondersteunt dit, maar DX is spike-bevinding
- **Vercel-lock-in voor cron + domains-API + ISR** — zelfde tradeoff als ADR 2026-05-12-cron-infra; bewust geaccepteerd in lijn met bestaande infra-keuze
- **Bij >200 custom domains schaalt Vercel Domains API minder goed** — Cloudflare for SaaS ($0.10/domain/mnd) wordt dan economischer. Re-evaluation-trigger (zie Notes)

## Neutraal

- AI-features van Puck Cloud (`PUCK_API_KEY`-gated, $25-150/mnd) gebruiken we **niet** — bestaande Step 2 Anthropic-pipeline produceert al variant-content; mapper-functie zet die om naar Puck-data-tree als seed. Spike-validatie vereist of Puck's AI-trigger UI vervangbaar is door eigen action.
- Optioneel Puck Pro $25/mnd voor priority support tijdens bouwfase — verwaarloosbaar in budget, geen formele commitment in deze ADR
- **Architectuur-impact reikt verder dan landing pages alleen**: zelfde Pattern B kan post-MVP toegepast worden op andere content-categorieën waar visual-design meerwaarde heeft (bv. email-campaigns met drag-drop). Niet pre-committeren, maar pattern is generaliseerbaar.

# Edit-architectuur (beslist 2026-05-22)

De builder ondersteunt drie edit-lagen die naast elkaar bestaan, met **diff-preview verplicht voor alle AI-changes** (Optie B uit edit-paradigma-keuze 2026-05-22) en **lock-toggle per component** om AI-overschrijving van handmatige edits te voorkomen.

## Laag 1 — Direct visual editing (Puck-native, geen build-werk)

Drag-drop, inline text-edit, sidebar-fields, component-reorder/duplicate/delete. Werkt zonder prompt, vervangt grotendeels de bestaande `canvas-inline-edit-overlays` voor web-page content-types.

## Laag 2 — Component-level AI-edit (nieuw, met diff-preview)

Context-menu acties per component ("Maak korter", "Schrijf formeler", "3 alternatieven"). Architectureel:

```
User klikt context-menu actie op <BrandHero> instance
    ↓
POST /api/landing-pages/component-edit { deliverableId, componentId, prompt, currentProps }
    ↓
anthropicClient call met component-props + contextStack.brand.voice als payload
    ↓
Response: { proposedProps, editDistance, confidence }
    ↓
[Diff-preview modal opent — verplicht]
    Side-by-side render:
    - links: <BrandHero {...currentProps} />
    - rechts: <BrandHero {...proposedProps} />
    + edit-distance badge ("AI wil 42% van text wijzigen")
    + Accept / Reject buttons
    ↓
Bij Accept: puckData update + auto-save trigger
Bij Reject: no-op, modal sluit
```

## Laag 3 — Page-level AI-regeneration (in MVP, hergebruik bestaande infra)

**Auto-iterate**:
- Hergebruikt `/api/auto-iterate/trigger` infrastructuur (al productie-stabiel sinds sprint #5)
- Nieuwe mapper: `puckDataToAutoIterateInput()` voor data-shape transform
- F-VAL judge ≥ 70 threshold blijft; bij lager: voorstel rewrite
- Output: nieuwe puckData-tree als proposal, niet directe write

**Strict-rewrite**:
- Page-level of selectie-level prompt-driven rewrite
- Zelfde dual-render preview-flow als auto-iterate

**Regenerate via Step 2 variants**:
- Bij navigatie terug naar Step 2 + variant-wissel: confirm-modal "Visual edits gaan verloren — doorgaan?"
- Bij confirm: `variantToPuckData()` overschrijft puckData volledig

**Diff-preview op page-level** (dual-render twee Puck-trees):

```
[Auto-iterate triggered]
    ↓
Compute proposed puckData (via F-VAL rewrite of strict-rewrite)
    ↓
[Page-level diff-preview modal opent — verplicht]
    Side-by-side:
    - links: <Puck.Preview data={currentPuckData} />
    - rechts: <Puck.Preview data={proposedPuckData} />
    Per gewijzigd component overlay-knop met "Accept" / "Reject"
    Locked components krijgen badge "🔒 niet gewijzigd"
    Footer: "Accept all" / "Reject all" / "Apply selected"
    ↓
Apply selected → merge per-component accept-decisions in puckData
    ↓
Auto-save trigger
```

## Lock-toggle per component

- UI: toggle-icoontje in Puck sidebar bij geselecteerde component
- State: opgeslagen in `puckData.components[id].metadata.locked: boolean`
- Effect: AI-changes (Laag 2 en Laag 3) slaan deze component over + tonen badge in diff-preview
- Bewust GEEN opslag in component-props zelf om Puck's interne data-shape niet te vervuilen

## Defense-in-depth (lessen uit gotchas 2026-05-17)

Auto-iterate heeft historisch nare scope-bugs gehad: silent variant-clobber bij missing `variantIndex`-filter, long-form shrinkage onder F-VAL gate-floor. Diezelfde patterns gelden voor de Puck-AI-edit flow:

- **`variantIndex` filter expliciet** bij Prisma-queries die "deliverable variant-0 puckData" bedoelen
- **Don't-shrink guard** via `getDeliverableTypeById(typeId).constraints.minWords` per content-type — AI-output dat onder minWords komt wordt geweigerd, niet stilzwijgend gecommit
- **Diagnostic `console.warn` op elke silent-return** in edit-flow (rejected-by-floor, no-changes-detected, locked-component-skipped)
- **Gate-floor uit registry**, niet hardcoded

## Edit-distance signal

Hergebruik bestaande `src/lib/auto-iterate/edit-distance.ts` voor metadata in diff-preview:
- "AI wil X% van content wijzigen" als visuele context bij review
- Edit-distance > 70% = sterk signaal voor user om kritisch te zijn — toon waarschuwing-banner in modal

## Performance-overweging

Dual-render van twee Puck-trees in page-level diff-preview is non-triviaal voor grote pages (50+ componenten). Mitigatie:
- Gebruik `<Puck.Preview>` (read-only) i.p.v. volledige `<Puck>` editor in beide panels
- Lazy-render: alleen zichtbare componenten in viewport renderen via virtualization
- Caps op `<BrandHero>`/`<FeatureGrid>` complexity tijdens spike, escaleer bij A8-blokker

# Alternatives considered

## Plasmic Enterprise (cloud, white-label)

**Voor**:
- Turnkey white-label visual builder + headless API + Platform API voor user provisioning
- Mature multi-tenant pattern (Spaces + RBAC) bewezen in productie
- 2-4 weken integratie, snelste pad naar pilot-live

**Tegen** (waarom NIET gekozen):
- **White-label pricing volstrekt niet publiek** — vereist sales-traject, vermoedelijk €1-3k/mnd × 12 = €12-36k/jr
- **AGPL-3.0 op `platform/wab`** als we ooit naar self-host willen — Branddock als SaaS triggert AGPL, modificaties open-sourcen verplicht
- **Brand-context-injectie via data-bindings** — minder elegant dan custom React components met `useBrandContext()`; voelt bolted-on
- **Vendor op kritiek-pad voor toekomstige landing-page-feature** — bij Plasmic-incident is Branddock-feature down
- **Geen MCP-server** (Plasmic), alleen 3rd-party Composio-wrapper

## Plasmic Self-Host (`github.com/plasmicapp/plasmic`)

**Voor**:
- OSS-code beschikbaar, geen license-fee
- Volledige controle over editor + render-stack

**Tegen** (waarom NIET gekozen):
- **AGPL-3.0 op Studio editor** — netwerk-aanbod aan derden triggert AGPL → modificaties moeten open-source. Legal-risico voor SaaS-positionering.
- **Geen GitHub Releases / semver-tags** — self-hosters trackken `master`, fragiel voor SaaS-uptime
- **Self-host docs ontbreken productie-laag** — geen S3/Redis/SSO/billing-laag in OSS-tree; precies wat SaaS nodig heeft
- **Maintenance-burden ~0.3-0.5 FTE** voor 1-2 dev team — niet passend bij pre-launch capaciteit
- **8GB+ RAM container, sparse community-support** (forum-response 1-5 dagen, Plasmic-team)

## HubSpot Content Hub (resell via partnership of API)

**Voor**:
- Volwassen, 20 jaar productie-bewijs
- Compleet pakket inclusief A/B + forms + analytics

**Tegen** (waarom NIET gekozen):
- **Geen embeddable editor in derde-partij SaaS** — klant moet HubSpot-account hebben, redirect of iframe-only
- **Vendor-coupling op zwaar niveau** — Branddock zou HubSpot-reseller worden, branding-verlies
- **Cost-positionering niet competitief** — HubSpot Professional $450/mnd is jouw concurrent, niet jouw leverancier
- **Geen brand-context-injectie mogelijk** — HubSpot weet niets van Branddock's `BrandVoiceguide` model

## Build-from-scratch (eigen drag-drop builder)

**Voor**:
- Volledig op maat voor Branddock's brand-context-model
- Geen externe afhankelijkheden

**Tegen** (waarom NIET gekozen):
- **Effort: 3-6 maanden MVP, 12 maanden tot Plasmic-pariteit** — onverenigbaar met pre-launch capaciteit
- **Drag-drop UX bouwen is een specialiteit** — dnd-kit + react-grid-layout + virtualization + history/undo + keyboard-navigation is een dieper rabbit-hole dan het lijkt
- **Geen leverage van Puck's 12.7k stars community-validatie** — herontdekken van patterns die Puck-team al opgelost heeft

## GrapesJS Studio SDK

**Voor**:
- Letterlijk gepositioneerd als embeddable white-label visual builder voor SaaS
- Multi-page + MJML + React-renderer + publish-flow uit de doos

**Tegen** (waarom NIET gekozen):
- **Pricing niet publiek** — "contact sales" voor productie-licentie; vergelijkbare onzekerheid als Plasmic Enterprise
- **AI-features achterlopen** — geen Fusion-equivalent, geen prompt-to-page native
- **DX minder React-native** — GrapesJS is framework-agnostic vanille-JS-stack met React-wrapper, voelt minder thuis in Branddock's React 19-app

# Notes

**Re-evaluation triggers** (wanneer deze ADR herzien moet worden):

1. **Puck-project stagnatie**: als release-cadens stopt of breaking changes maintainability verstoren, evalueer fork of switch naar GrapesJS / build-from-scratch.
2. **Brand-context-injectie blijkt onhaalbaar in Puck-paradigma**: spike-bevinding (zie `tasks/_drafts/idea-landing-page-builder-spike.md`) toont aan dat custom field-types of context-providers te beperkt zijn voor `<BrandColorPicker>`/`<PersonaSelector>`-DX → Plasmic Enterprise heroverwegen.
3. **Custom-domain volume > 200**: Vercel Domains API + ISR-cache schaalt minder economisch dan Cloudflare for SaaS ($0.10/domain/mnd). Migratie-pad: Cloudflare for SaaS als reverse-proxy → Vercel als origin.
4. **Marketer-DX onvoldoende voor pilot-klanten**: pilot-feedback toont aan dat Puck-editor te dev-oriented voelt → evalueer Plasmic Enterprise of GrapesJS Studio SDK.
5. **AI-page-generation vereist Puck Cloud-features**: blijkt dat Puck's editor-UI niet volledig te decoupleren is van hun cloud-AI → Puck Pro/Business tier overwegen óf eigen AI-trigger-UX bouwen buiten Puck.
6. **Diff-preview-acceptatie-ratio < 30% of > 90%**: bij < 30% is AI-quality issue (model upgrade / prompt-tuning); bij > 90% voegt preview-modal weinig waarde toe en kan v2-streamlining (auto-apply met undo-only) overwogen worden.
7. **Dual-render performance ontoereikend** voor pages > 50 componenten: switch naar JSON-diff-only view (geen visual preview) voor grote pages, of incremental rendering per scroll-viewport.

**Architectuur-pattern (high-level — Pattern B uit Canvas-audit)**:

```
[A] Editing-flow (binnen Branddock app, stepper)
─────────────────────────────────────────────────
Brief → Strategy → Concept → Canvas → Export

Voor web-page content-types (landing-page / product-page / faq-page / comparison-page / microsite):

Canvas Step 3 (Medium):
  preview-map.ts dispatcht op (platform=web, format=landing-page) → PuckPageBuilder
  PuckPageBuilder ontvangt props:
    - contextStack: CanvasContextStack (uit assembleCanvasContext)
    - variantContent: Step 2 AI-output (Markdown sections)
    - deliverable: Deliverable record
  → Op mount: variantToPuckData(variantContent, contextStack) seed-mapper
  → User edit in Puck-editor; brand-tokens automatisch toegepast via contextStack
  → Auto-save naar deliverable.settings.puckData (jsonb)

Canvas Step 4 (Planner) blijft ongewijzigd.

Export-step:
  Nieuwe actie "Publiceer als webpagina" naast bestaande Markdown/PDF export
  → POST /api/landing-pages/publish { deliverableId, slug, customDomain? }
  → Prisma write: LandingPage { workspaceId, deliverableId, slug, puckData (snapshot uit deliverable), status: PUBLISHED }
  → revalidatePath(`/p/${slug}`) + revalidateTag(`workspace-${workspaceId}`)

[B] Bezoeker-flow (publieke URL)
─────────────────────────────────────────────────
Next.js middleware in src/middleware.ts:
    Detect host:
    - branddock.app           → query LandingPage by slug (single-tenant fallback)
    - <ws>.branddock.app      → resolve workspace by subdomain + slug
    - klant.nl (custom, v2)   → resolve via DomainMapping table → workspaceId + slug
    ↓
[ISR-cached render via Puck <Render config={brandAwareConfig(workspace)} data={LandingPage.puckData} />]
    ↓
Served at edge (Vercel Edge Network)
```

**Database-schema toevoeging**:

Werkkopie van page-data leeft in **bestaande** `Deliverable.settings.puckData` (jsonb) — geen aparte tabel voor draft-state. Publish-state krijgt eigen `LandingPage` model dat een snapshot bewaart op het moment van publiceren (immutable per slug-versie, queryable per workspace + custom domain).

```prisma
model LandingPage {
  id            String        @id @default(cuid())
  workspaceId   String
  deliverableId String        // bron-deliverable in Canvas
  slug          String
  puckData      Json          // snapshot bij publish-tijd (frozen)
  status        PageStatus    @default(DRAFT)
  publishedAt   DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  workspace     Workspace     @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  deliverable   Deliverable   @relation(fields: [deliverableId], references: [id], onDelete: Cascade)
  @@unique([workspaceId, slug])
  @@index([workspaceId, status])
  @@index([deliverableId])
}

enum PageStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

model DomainMapping {
  id             String      @id @default(cuid())
  workspaceId    String
  domain         String      @unique
  verifiedAt     DateTime?
  sslStatus      SslStatus   @default(PENDING)
  vercelDomainId String?     // referentie naar Vercel Domains API
  createdAt      DateTime    @default(now())
  workspace      Workspace   @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@index([workspaceId])
}

enum SslStatus {
  PENDING
  PROVISIONING
  ACTIVE
  FAILED
}
```

**Waarom snapshot ipv live-link naar Deliverable**: published pages moeten stabiel renderen ook al wordt de bron-deliverable in Canvas verder bewerkt. Pattern volgt bestaande `competitor-snapshot-historie` ADR-keuze (immutable snapshots voor publieke artefacten).

**Middleware-routing pattern**:

```typescript
// src/middleware.ts (uitbreiding)
export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const path = req.nextUrl.pathname;

  if (host === 'branddock.app' || host === 'www.branddock.app') {
    return NextResponse.next(); // hoofdapp
  }

  if (host.endsWith('.branddock.app')) {
    const subdomain = host.split('.')[0];
    return NextResponse.rewrite(
      new URL(`/api/_internal/render-page?workspace=${subdomain}&path=${path}`, req.url)
    );
  }

  // custom domain — lookup in DomainMapping
  return NextResponse.rewrite(
    new URL(`/api/_internal/render-page?domain=${host}&path=${path}`, req.url)
  );
}

export const config = {
  matcher: ['/((?!_next|api/_internal).*)'],
};
```

**Custom domain provisioning flow** (HubSpot-pattern):

1. Klant gaat naar Branddock Settings → Domains → "Verbind eigen domein"
2. Branddock toont specifieke CNAME-instructies: `pages.klant.nl CNAME → cname.vercel-dns.com`
3. Klant updatet DNS bij hun provider
4. Branddock POST naar Vercel Domains API om host te claimen
5. Vercel doet DNS-verificatie + SSL-provisioning via Let's Encrypt (0-4 uur)
6. Webhook → update `DomainMapping.sslStatus = ACTIVE`, Branddock toont "Live" status

**Brand-context-consumptie pattern (via CanvasContextStack)**:

```typescript
// src/features/campaigns/components/canvas/medium/PuckPageBuilder.tsx
import type { Config } from '@puckeditor/core';
import { Puck } from '@puckeditor/core';
import type { CanvasContextStack } from '@/lib/ai/canvas-context';

type Props = {
  contextStack: CanvasContextStack; // brand, concept, personas, products, brief — al geassembleerd
  variantContent: VariantContent;   // Step 2 AI-output (Markdown sections)
  deliverable: Deliverable;
  onChange: (puckData: Data) => void; // auto-save callback
};

export function PuckPageBuilder({ contextStack, variantContent, deliverable, onChange }: Props) {
  const config = buildPuckConfig(contextStack); // capture brand-tokens in closure
  const initialData = deliverable.settings.puckData
    ?? variantToPuckData(variantContent, contextStack); // seed-mapper

  return <Puck config={config} data={initialData} onChange={onChange} />;
}

function buildPuckConfig(ctx: CanvasContextStack): Config {
  const { brand } = ctx;
  return {
    components: {
      BrandHero: {
        fields: {
          headline: { type: 'text' },
          sub: { type: 'textarea' },
          personaId: { type: 'external', /* lijst van ctx.personas */ },
        },
        render: ({ headline, sub, personaId }) => (
          <section style={{
            background: brand.style.primaryColor,
            fontFamily: brand.style.headingFont,
          }}>
            <h1>{headline}</h1>
            <p>{sub}</p>
          </section>
        ),
      },
      // BrandCTA, FeatureGrid, Testimonial, PricingTable, FAQ, Footer, RichText
    },
  };
}
```

**Variant→Puck seed-mapper** (`variantToPuckData`):

Step 2 levert variant-content als Markdown sections (`hero`, `value-prop`, `cta`, `features`, etc.). Mapper functie zet die om naar een Puck data-tree met onze custom components al ingevuld:

```typescript
function variantToPuckData(variant: VariantContent, ctx: CanvasContextStack): Data {
  return {
    content: [
      { type: 'BrandHero', props: { headline: variant.hero.headline, sub: variant.hero.sub } },
      { type: 'FeatureGrid', props: { features: variant.features } },
      { type: 'BrandCTA', props: { label: variant.cta.label, href: variant.cta.url } },
    ],
    root: { props: {} },
  };
}
```

Dit pattern zorgt dat AI-gegenereerde content (Step 2) **direct manipuleerbaar** is in Step 3, zonder dat de gebruiker hand-werk hoeft te doen.

**Cross-references**:
- Idea-doc: `tasks/_drafts/idea-landing-page-builder.md`
- Spike-task: `tasks/_drafts/idea-landing-page-builder-spike.md`
- Pre-launch dependency: `tasks/vercel-deployment.md` (Track C, hard launch-blocker)
- Eerste use-case: `marketing-site-pricing` (Track C, follow-on)
- Cron-infra ADR (vendor-coupling Vercel-eenvoud lijn): `docs/adr/2026-05-12-cron-infra.md`
- Snapshot-historie ADR (immutable publieke artefacten): `docs/adr/2026-05-08-competitor-snapshot-historie.md`
- HubSpot-architectuur-benchmark: gesprek 2026-05-22 (zie idea-doc Evidence-sectie)
- **Canvas-architectuur (Pattern B integratie-punt)**:
  - Flow-registry: `src/features/campaigns/constants/canvas-flow-registry.ts`
  - Medium-dispatcher: `src/features/campaigns/components/canvas/previews/preview-map.ts`
  - Web-page content-types: `src/features/campaigns/lib/content-type-inputs.ts` (lines 2209-2370)
  - Brand-context assembly: `src/lib/ai/canvas-context.ts` — `assembleCanvasContext(deliverableId, workspaceId)`
  - Vandaag-renderer (te vervangen): `LandingPagePreview` in `src/features/campaigns/components/canvas/previews/`
