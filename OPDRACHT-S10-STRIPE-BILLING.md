# OPDRACHT S10 — Stripe Billing & Plan Enforcement

## Laatst bijgewerkt: 20 februari 2026

---

## CONTEXT

Branddock gaat een **testfase** in. Alle features blijven gratis beschikbaar. De volledige Stripe-infrastructuur wordt wél gebouwd zodat bij lancering alleen een feature flag omgezet hoeft te worden.

### Kernprincipe: `BILLING_ENABLED=false`

```env
# .env.local
NEXT_PUBLIC_BILLING_ENABLED=false   # false = alles gratis, true = echte plan enforcement
STRIPE_SECRET_KEY=sk_test_...       # Altijd test keys tijdens development
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Wanneer `BILLING_ENABLED=false`:
- `usePlan()` retourneert altijd `ENTERPRISE` plan met `Infinity` limits
- Geen paywalls, geen checkout redirects, geen upgrade modals
- Billing tab in Settings toont "Free Beta — All features unlocked"
- Stripe SDK is wél geïnstalleerd en webhooks werken (test mode)

Wanneer `BILLING_ENABLED=true`:
- Echte plan enforcement op basis van Stripe subscription status
- Checkout flows, upgrade modals, usage tracking actief
- Billing tab toont actuele subscription, facturen, usage

---

## PRICING MODEL (4 tiers)

### Plan Definities

| | Free | Pro | Agency | Enterprise |
|---|---|---|---|---|
| **Prijs** | €0/mnd | €29/mnd | €99/mnd | €249/mnd |
| **Workspaces** | 1 | 3 | 10 | Unlimited |
| **Team members** | 1 | 5 | 25 | Unlimited |
| **AI tokens/mnd** | 10.000 | 100.000 | 500.000 | 2.000.000 |
| **Personas** | 3 | 10 | 50 | Unlimited |
| **Campaigns** | 2 | 10 | 50 | Unlimited |
| **Brand Assets** | 5 | 20 | 100 | Unlimited |
| **Products** | 3 | 15 | 75 | Unlimited |
| **Market Insights** | 5 | 25 | 100 | Unlimited |
| **Knowledge Resources** | 10 | 50 | 250 | Unlimited |
| **Storage** | 100MB | 1GB | 10GB | 100GB |
| **AI Overage** | Geblokkeerd | €0.02/1K tokens | €0.015/1K tokens | €0.01/1K tokens |
| **Brand Alignment scans** | 1/week | Dagelijks | Onbeperkt | Onbeperkt |
| **Content Studio** | Basic | Full | Full + Templates | Full + Custom |
| **Export** | — | PDF | PDF + DOCX | All formats |
| **Priority support** | — | — | Email | Dedicated |

### Revenue Streams

1. **Subscription** (recurring): Maandelijkse fee per tier via Stripe Subscription
2. **AI Usage Overage** (metered): Tokens boven maandelijkse bundel → Stripe Usage Records
3. **One-time purchases** (al deels gebouwd in S2a): Workshop sessions, research bundles, interview packs → Stripe Payment Intents

---

## BESTAANDE INFRASTRUCTURE (uit S9)

Al aanwezig in de database (check `schema.prisma`):
- `Plan` model (name, slug, price, features, limits, isActive)
- `Subscription` model (planId, status, stripeSubscriptionId, currentPeriodStart/End, cancelAtPeriodEnd)
- `PaymentMethod` model (stripePaymentMethodId, type, last4, brand, isDefault)
- `Invoice` model (stripeInvoiceId, amount, status, pdfUrl, periodStart/End)

Al aanwezig in de API (S9.2):
- 10 Billing endpoints (Settings → Billing tab)
- BillingSettingsPage UI met plan info, payment methods, invoices

**Wat S10 toevoegt:** Stripe SDK integratie, webhook processing, echte plan enforcement middleware, usage tracking, checkout flows, metered billing.

---

## SPRINT STRUCTUUR (6 sessies, 2 parallel tabs)

### S10.1 — Stripe Foundation + Plan Config (Tab 1)
**Doel:** Stripe SDK, plan definities, feature flag systeem

**Bestanden:**
```
src/lib/stripe/
├── client.ts                    ← Stripe SDK singleton (server-side)
├── config.ts                    ← Plan definities + limits als TypeScript constants
├── plans.ts                     ← PLAN_LIMITS map, isPlanFeatureAllowed(), getLimit()
└── feature-flags.ts             ← isBillingEnabled(), getBillingMode()

src/lib/constants/
└── plan-limits.ts               ← PlanTier enum, FeatureKey enum, PLAN_CONFIG object

src/types/
└── billing.ts                   ← PlanTier, PlanLimits, SubscriptionStatus, UsageRecord, CheckoutSession types
```

**Taken:**
1. `npm install stripe` (server-side SDK)
2. Stripe client singleton met retry logic
3. Plan definities als TypeScript constants (4 tiers, alle limits)
4. `PlanTier` enum: `FREE | PRO | AGENCY | ENTERPRISE`
5. `FeatureKey` enum: `WORKSPACES | TEAM_MEMBERS | AI_TOKENS | PERSONAS | CAMPAIGNS | ...`
6. `PLAN_LIMITS` map: `Record<PlanTier, Record<FeatureKey, number>>` (Infinity voor unlimited)
7. Feature flag: `isBillingEnabled()` → leest `NEXT_PUBLIC_BILLING_ENABLED`
8. `getEffectivePlan()` → als billing disabled, return ENTERPRISE met Infinity limits

**Env vars toevoegen:**
```env
NEXT_PUBLIC_BILLING_ENABLED=false
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
```

---

### S10.2 — Webhook + Subscription Sync (Tab 2)
**Doel:** Stripe webhooks ontvangen en subscription status syncen naar database

**Bestanden:**
```
src/app/api/stripe/
├── webhook/route.ts             ← POST (Stripe webhook handler)
└── sync/route.ts                ← POST (manual subscription sync, admin only)

src/lib/stripe/
├── webhook-handlers.ts          ← Event handlers per type
├── subscription-sync.ts         ← syncSubscription(), updatePlanFromStripe()
└── customer.ts                  ← getOrCreateCustomer(), linkCustomerToWorkspace()
```

**Webhook Events afhandelen:**
```typescript
// Prioriteit 1 — Subscription lifecycle
'checkout.session.completed'      → Create/update Subscription record
'customer.subscription.created'   → Sync plan + limits
'customer.subscription.updated'   → Plan changes, upgrades/downgrades
'customer.subscription.deleted'   → Mark canceled, enforce free tier
'customer.subscription.paused'    → Mark paused

// Prioriteit 2 — Payments
'invoice.paid'                    → Create Invoice record, reset usage counters
'invoice.payment_failed'          → Mark subscription past_due, notify user
'invoice.finalized'               → Update invoice PDF URL

// Prioriteit 3 — Usage (metered)
'invoice.upcoming'                → Pre-invoice usage calculation
```

**Taken:**
1. Webhook endpoint met Stripe signature verification
2. Idempotency: check `stripeEventId` in processed_events tabel (nieuw)
3. `syncSubscription()`: Stripe sub → Prisma Subscription update
4. `getOrCreateCustomer()`: workspace → Stripe customer mapping
5. Voeg `stripeCustomerId` toe aan Workspace model
6. Voeg `ProcessedStripeEvent` model toe (eventId, type, processedAt)
7. Error handling: log failed webhooks, retry queue (simple)

**Database migration:**
```prisma
model Workspace {
  // bestaande velden...
  stripeCustomerId String? @unique
}

model ProcessedStripeEvent {
  id          String   @id @default(cuid())
  eventId     String   @unique  // Stripe event ID
  eventType   String
  processedAt DateTime @default(now())
}
```

---

### S10.3 — Plan Enforcement Middleware (Tab 1)
**Doel:** Server-side enforcement van plan limits op alle API routes

**Bestanden:**
```
src/lib/stripe/
├── enforcement.ts               ← checkPlanLimit(), enforceFeature(), PlanLimitError
├── usage-tracker.ts             ← trackAiUsage(), getUsageThisMonth(), resetMonthlyUsage()
└── middleware.ts                 ← withPlanEnforcement() HOC voor API routes

src/app/api/usage/
├── route.ts                     ← GET (current usage stats)
├── ai/route.ts                  ← GET (AI token usage this period)
└── history/route.ts             ← GET (usage history, last 6 months)
```

**Enforcement logica:**
```typescript
// Wrapper voor API routes
export function withPlanEnforcement(
  handler: RouteHandler,
  feature: FeatureKey,
  options?: { countAction?: boolean }
) {
  return async (req, ctx) => {
    // Als billing disabled → skip enforcement
    if (!isBillingEnabled()) return handler(req, ctx);
    
    const { workspaceId } = await requireAuth();
    const plan = await getWorkspacePlan(workspaceId);
    const limit = PLAN_LIMITS[plan.tier][feature];
    const current = await getCurrentCount(workspaceId, feature);
    
    if (current >= limit) {
      return NextResponse.json(
        { error: 'plan_limit_reached', feature, limit, current, upgrade_url: '/settings/billing' },
        { status: 403 }
      );
    }
    
    return handler(req, ctx);
  };
}
```

**AI Usage Tracking:**
```typescript
// Bij elke AI call (completion, analysis, etc.)
model AiUsageRecord {
  id          String   @id @default(cuid())
  workspaceId String
  userId      String
  tokens      Int      // prompt + completion tokens
  model       String   // gpt-4o, etc.
  feature     String   // brand-analysis, content-studio, alignment-scan
  createdAt   DateTime @default(now())
  
  workspace   Workspace @relation(...)
  user        User      @relation(...)
}
```

**Taken:**
1. `checkPlanLimit()` → check current count vs plan limit
2. `withPlanEnforcement()` HOC voor API routes
3. AI usage tracking: log tokens per call, aggregeer per maand
4. `getUsageThisMonth()` → som tokens huidige billing period
5. Usage API endpoints (3 routes)
6. Integreer met bestaande AI middleware (`src/lib/ai/`)
7. Alle enforcement SKIPPED wanneer `BILLING_ENABLED=false`

---

### S10.4 — Checkout + Customer Portal (Tab 2)
**Doel:** Stripe Checkout voor upgrades, Customer Portal voor beheer

**Bestanden:**
```
src/app/api/stripe/
├── checkout/route.ts            ← POST (create checkout session)
├── portal/route.ts              ← POST (create portal session)
└── prices/route.ts              ← GET (fetch current prices from Stripe)

src/lib/stripe/
└── checkout.ts                  ← createCheckoutSession(), createPortalSession()

src/hooks/
└── use-billing.ts               ← useBilling() hook (plan, usage, checkout, portal)

src/components/billing/
├── UpgradeModal.tsx             ← Plan comparison + checkout redirect
├── UsageMeter.tsx               ← AI token usage bar (current/limit)
├── PlanBadge.tsx                ← Badge component voor current plan
└── BillingBanner.tsx            ← "Free Beta" banner (billing disabled) / usage warning
```

**Checkout flow:**
```
User klikt "Upgrade" → POST /api/stripe/checkout
  → Stripe Checkout Session aangemaakt (success_url, cancel_url)
  → Redirect naar Stripe hosted checkout
  → Na betaling: webhook → subscription sync → redirect terug
```

**Customer Portal:**
```
User klikt "Manage Subscription" → POST /api/stripe/portal
  → Stripe Customer Portal session
  → Redirect naar Stripe hosted portal (plan wijzigen, kaart updaten, facturen)
```

**useBilling() hook:**
```typescript
export function useBilling() {
  const billingEnabled = isBillingEnabled();
  
  // Als billing disabled, return mock data
  if (!billingEnabled) {
    return {
      plan: { tier: 'ENTERPRISE', name: 'Free Beta' },
      limits: ALL_INFINITY_LIMITS,
      usage: { aiTokens: 0, percentage: 0 },
      isFreeBeta: true,
      canUpgrade: false,
      openCheckout: () => {},   // no-op
      openPortal: () => {},     // no-op
    };
  }
  
  // Echte billing data via TanStack Query
  return { ... };
}
```

**Taken:**
1. Checkout session creation (plan selectie → Stripe redirect)
2. Customer Portal session creation
3. Prices endpoint (live prijzen uit Stripe)
4. `useBilling()` hook met feature flag aware logic
5. UpgradeModal component (plan vergelijking, CTA per tier)
6. UsageMeter (progress bar AI tokens, kleur bij 80%/100%)
7. PlanBadge (kleine badge in sidebar/header)
8. BillingBanner: "🎉 Free Beta — All features unlocked" wanneer billing disabled

---

### S10.5 — Metered Billing + One-time Purchases (Tab 1)
**Doel:** AI overage tracking naar Stripe, losse aankopen via Payment Intents

**Bestanden:**
```
src/lib/stripe/
├── metered.ts                   ← reportUsageToStripe(), calculateOverage()
└── one-time.ts                  ← createPaymentIntent(), handlePurchase()

src/app/api/stripe/
├── usage-report/route.ts        ← POST (report usage to Stripe, cron/manual)
└── purchase/route.ts            ← POST (one-time purchase: workshop, bundle)

src/app/api/cron/
└── usage-sync/route.ts          ← POST (daily usage sync to Stripe)
```

**AI Overage flow:**
```
1. AI call → log tokens in AiUsageRecord
2. Dagelijkse cron (of bij invoice.upcoming webhook):
   - Tel totaal tokens deze periode
   - Trek included tokens af (plan bundel)
   - Report overage naar Stripe als usage record
3. Stripe voegt overage toe aan volgende factuur
```

**One-time purchases (integratie met bestaand S2a systeem):**
```
Bestaand: PurchasedBundle model, /api/purchased-bundles
Toevoegen: Stripe Payment Intent flow
  → User koopt workshop/bundle
  → POST /api/stripe/purchase { type, itemId, amount }
  → Stripe Payment Intent created
  → Client confirmt met Stripe.js
  → Webhook payment_intent.succeeded → markeer PurchasedBundle als PAID
```

**Taken:**
1. `reportUsageToStripe()` → Stripe Usage Records API
2. Overage calculator (tokens used - included tokens = overage)
3. Cron endpoint voor dagelijkse usage sync
4. Payment Intent flow voor losse aankopen
5. Koppel aan bestaand PurchasedBundle model
6. Alles no-op wanneer `BILLING_ENABLED=false`

---

### S10.6 — UI Integration + Settings Billing Refactor (Tab 2)
**Doel:** Billing UI in Settings updaten, plan info door hele app

**Bestanden updaten:**
```
src/components/settings/billing/
├── BillingSettingsPage.tsx       ← REFACTOR: echte Stripe data of "Free Beta" state
├── CurrentPlanCard.tsx           ← Plan details + usage meters
├── PaymentMethodsCard.tsx        ← Stripe payment methods
├── InvoiceHistoryCard.tsx        ← Stripe invoices
├── UsageOverviewCard.tsx         ← NIEUW: AI usage + overage stats
└── PlanComparisonTable.tsx       ← NIEUW: 4-tier vergelijking met CTA's

src/components/settings/team/
└── TeamPlanHeader.tsx            ← UPDATE: echte plan badge + member count vs limit
```

**Sidebar/Header updates:**
```
- PlanBadge in sidebar footer (FREE / PRO / AGENCY / ENTERPRISE)
- UsageMeter in sidebar (AI tokens %, alleen als >50% gebruikt)
- BillingBanner top-of-page als approaching limit (>80%)
- "Free Beta" badge wanneer BILLING_ENABLED=false
```

**Taken:**
1. Refactor BillingSettingsPage: dual mode (free beta vs active billing)
2. CurrentPlanCard met `useBilling()` hook
3. UsageOverviewCard: AI tokens, entities count per type vs limit
4. PlanComparisonTable: 4 kolommen, highlight current, upgrade CTA's
5. PaymentMethodsCard: Stripe.js card element (of portal link)
6. InvoiceHistoryCard: echte Stripe invoices
7. Sidebar PlanBadge + UsageMeter
8. TeamPlanHeader: member count / limit
9. Alles graceful degradation wanneer billing disabled
10. 0 TS errors

---

## SESSIE TOEWIJZING

| Sessie | Tab 1 | Tab 2 |
|--------|-------|-------|
| 1 | S10.1 Stripe Foundation + Plan Config | S10.2 Webhook + Subscription Sync |
| 2 | S10.3 Plan Enforcement Middleware | S10.4 Checkout + Customer Portal |
| 3 | S10.5 Metered Billing + One-time Purchases | S10.6 UI Integration + Billing Refactor |

---

## DATABASE MIGRATIE SAMENVATTING

```prisma
// Toevoegen aan bestaand Workspace model
model Workspace {
  stripeCustomerId  String?  @unique
  planTier          PlanTier @default(FREE)
  // bestaande velden...
}

// Nieuw enum
enum PlanTier {
  FREE
  PRO
  AGENCY
  ENTERPRISE
}

// Nieuw model
model AiUsageRecord {
  id          String   @id @default(cuid())
  workspaceId String
  userId      String
  tokens      Int
  model       String
  feature     String   // brand-analysis, content-studio, etc.
  cost        Float?   // berekende kosten in euros
  createdAt   DateTime @default(now())
  
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  user        User      @relation(fields: [userId], references: [id])
  
  @@index([workspaceId, createdAt])
  @@index([userId, createdAt])
}

// Nieuw model
model ProcessedStripeEvent {
  id          String   @id @default(cuid())
  eventId     String   @unique
  eventType   String
  processedAt DateTime @default(now())
  
  @@index([eventType])
}

// Update bestaand Subscription model
model Subscription {
  // bestaande velden...
  stripeCurrentPeriodUsage  Int?     // AI tokens used this period
  stripePriceId             String?  // Stripe price ID
  
  // metered billing
  usageReportedAt           DateTime? // Last usage report to Stripe
}
```

---

## ENVIRONMENT VARIABLES SAMENVATTING

```env
# Billing feature flag
NEXT_PUBLIC_BILLING_ENABLED=false

# Stripe (gebruik test keys!)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (aanmaken in Stripe Dashboard)
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_AGENCY_MONTHLY=price_...
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...
STRIPE_PRICE_AI_OVERAGE=price_...        # metered price voor overage
```

---

## KRITIEKE REGELS

1. **BILLING_ENABLED=false is default** — de app MOET volledig functioneren zonder Stripe keys
2. **Nooit blokkeren zonder feature flag** — als `isBillingEnabled()` false retourneert, skip ALLE enforcement
3. **Stripe Test Mode** — gebruik ALTIJD `sk_test_` keys, nooit live keys in development
4. **Webhook idempotency** — elke webhook event wordt maar 1x verwerkt (ProcessedStripeEvent)
5. **Graceful degradation** — als Stripe API onbereikbaar is, val terug op database cache
6. **Bestaande S9 models respecteren** — Plan, Subscription, PaymentMethod, Invoice bestaan al; extend, niet vervangen
7. **Bestaande S2a purchases respecteren** — PurchasedBundle model koppelen aan Stripe Payment Intents
8. **PATTERNS.md volgen** — alle UI componenten via PageShell + PageHeader + design tokens
9. **`usePlan()` / `useBilling()` centraal** — één hook, overal hetzelfde gedrag

---

## OPEN BESLISSINGEN (besloten in deze opdracht)

| Vraag | Beslissing |
|-------|-----------|
| Agency pricing model | Per workspace basis (€99/mnd voor max 10 workspaces) |
| Gratis tier limieten | Zie tabel hierboven (beperkt maar bruikbaar) |
| AI overage model | Per 1K tokens, tarief per plan tier |
| One-time purchases | Via Stripe Payment Intents, gekoppeld aan PurchasedBundle |
| Billing UI | Dual mode via feature flag (Free Beta vs Active) |

---

## TESTFASE GEDRAG SAMENVATTING

Met `BILLING_ENABLED=false` (default):
- ✅ Alle features werken zonder beperkingen
- ✅ Geen checkout flows of paywalls
- ✅ Settings > Billing toont "Free Beta — All features unlocked"
- ✅ Sidebar toont "BETA" badge i.p.v. plan naam
- ✅ `useBilling()` retourneert Enterprise limits
- ✅ AI calls worden wél gelogd (AiUsageRecord) voor analytics
- ✅ Stripe SDK geïnstalleerd maar geen API calls
- ❌ Geen Stripe checkout, portal, of webhook verwerking
