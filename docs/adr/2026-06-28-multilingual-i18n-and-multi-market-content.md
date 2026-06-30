---
id: 2026-06-28-multilingual-i18n-and-multi-market-content
title: Meertaligheid — twee-assige locale-architectuur (UI-locale per gebruiker via i18next + automatische AI-vertaling) + multi-markt content via Brand-spine + BrandLocaleProfile (Approach C)
status: accepted
date: 2026-06-28
supersedes: 2026-05-08-locale-routing-brand-voice
superseded-by: -
---

# Context

Branddock moet meertalig worden voor gebruikers. Twee aparte behoeften, die strikt gescheiden moeten blijven:

1. **UI-locale** — de taal waarin een gebruiker de app *leest* (menu's, knoppen, labels, toasts). Per **gebruiker**.
2. **Content-locale** — de taal waarin de AI brand-content *schrijft*. Per **workspace/merk** vandaag, en in de toekomst per **markt** (één multinationaal merk dat tegelijk in N markten communiceert).

Twee diepe codebase-onderzoeken (multi-agent, 2026-06-26/28) leverden de volgende verifieerde basis:

- **Architectuur**: hybride Next.js 16 SPA. De app rendert client-only (`dynamic(() => import('../App'), { ssr:false })` in `src/app/page.tsx`) en routeert pagina's via een `renderContent()`-switch op `activeSection` in `src/App.tsx` — **geen App Router voor pagina-routing**, de URL blijft de hele sessie `/`. Gevolg: `next-intl` met `/[locale]/`-segmenten is architecturaal incompatibel (server-component-machinerie is dood in een ssr:false-tree; middleware zou álle `/api/*` onderscheppen). Gescoord 20/100 en verworpen.
- **UI-locale = dode seam**: `AppearancePreference.language` (per-user, `@default("en")`, `prisma/schema.prisma`) bestaat al, met GET/PATCH `/api/settings/appearance`, maar wordt door **niets** geconsumeerd. De twee settings-schermen die hierbij leken te horen (`AppearanceSettingsPage.tsx`, `AccountSettingsPage.tsx`) zijn **orphaned dead code** (nergens geïmporteerd). De levende settings-UI is `src/features/settings/components/SettingsPage.tsx`; de 'Appearance'-tab is een *"coming soon"*-placeholder. Beide taalselectors moeten dus **gebouwd** worden, niet "aangesloten".
- **String-oppervlak**: ~2.900–4.000 distincte user-facing strings over ~600 bestanden (campaigns 151, settings 51, personas 43, brandstyle 42, media-library 40, workshop 36, …), + 529 placeholders, 98 aria-labels, 35 toasts, ~137 zod-messages, 43 hand-gerolde plurals, honderden mid-sentence-interpolaties, ~180 locale-loze datum/getal-sites. Extractie is de dominante, library-onafhankelijke kost.
- **Content-locale = single-scalar vandaag, via TWEE parallelle paden**: `Workspace.contentLanguage` (ISO 639-1, per-workspace, 7 waarden en/nl/de/fr/es/pt/it) + `BrandVoiceguide.contentLocale` (BCP-47, per-brand). Er zijn **twee onafhankelijke locale-chokepoints met verschillende fallback** (verify-at-build; regelnummers driften): (a) `getBrandContext` (`src/lib/ai/brand-context.ts:849`) berekent `ctx.contentLanguage` **inline** aan het return-punt (`brand-context.ts:1005`: `voiceguideLocalePrefix ?? workspace.contentLanguage ?? 'en'`, ISO 639-1, fallback `'en'`) en roept `resolveLocaleForBrand` **NIET** aan; (b) `resolveLocaleForBrand` (`src/lib/brand-fidelity/heuristics/locale-resolver.ts:56`, BCP-47, fallback `'en-GB'`) is een apart pad dat alleen F-VAL gebruikt. Profiel-precedentie moet dus op **beide** plekken landen. **Geen enkel content-model draagt een locale-dimensie** (Deliverable, ContentVersion, DeliverableComponent, Campaign, LandingPage missen een locale-kolom). `BrandVoiceguide.workspaceId` is `@unique` en `BrandStyleguide` is `@@unique([workspaceId])` → een merk heeft exact één voice/één stijl. Er is geen Market/Region/hreflang-concept.
- **Bestaande lek**: 4 analyze-routes (`products/analyze/url+pdf`, `competitors/analyze/url`, `competitors/[id]/refresh`) localiseren output naar de **browser-taal van de operator** (`Accept-Language` via `parseOutputLanguage`, `src/lib/ai/prompts/product-analysis.ts:14`) i.p.v. de content-taal — de UI-taal van de operator bloedt zo in geproduceerde content.
- **F-VAL coverage-debt**: heuristiek-packs bestaan voor 4 locales (nl-NL/nl-BE/en-GB/de-DE) terwijl `contentLanguage` 7 talen accepteert; fr/es/pt/it scoren stil tegen en-GB.

**Multinationale eis** (nieuw, deze ADR): één merk dat in veel markten tegelijk communiceert, met per-markt voice-register (DE Sie vs NL je), getranscreëerde positionering, gelokaliseerde persona's (een Duitse koper ≠ een vertaalde Nederlandse), per-markt claims/compliance, per-locale F-VAL en hreflang-SEO — op een **gedeelde merk-kern** zonder N-voudige duplicatie.

Deze ADR superseert `2026-05-08-locale-routing-brand-voice`: die ADR koos per-brand locale voor **AGENCY-workspaces met meerdere distincte merken** — maar omdat `BrandVoiceguide.workspaceId @unique` per-brand collapst tot per-workspace, is noch die agency-granulariteit noch de nieuwe multinationale eis (één merk, veel markten) eronder leverbaar. Deze ADR is de correctie.

# Decision

## Beslissing 1 — Twee orthogonale locale-assen, strikt gescheiden

- **UI-locale**: per-**gebruiker**, source = `AppearancePreference.language`. Nieuwe UI-i18n-code leeft onder een **nieuw** namespace `src/lib/ui-i18n/` (NIET `src/lib/i18n/`, dat is het franc-min CONTENT-systeem). Vocabulaire: `uiLocale`.
- **Content-locale**: per-**workspace/merk/markt**, source = het nieuwe `BrandLocaleProfile` (zie Beslissing 3). `Workspace.contentLanguage` blijft als **derived mirror**.
- **Invariant (test- + lint-afgedwongen)**: `AppearancePreference.language` mag nooit input zijn van `getBrandContext()`/`resolveLocaleForBrand()`; `src/lib/ai/**` mag `AppearancePreference` niet importeren. Een smoke-test bewijst dat content-resolutie byte-identiek is ongeacht de UI-taal van de aanroepende gebruiker.

## Beslissing 2 — UI-runtime = i18next + react-i18next (client provider), met automatische AI-vertaling

- Client-provider `<I18nProvider>` (i18next + react-i18next + i18next-browser-languagedetector + i18next-resources-to-backend, optioneel i18next-icu), gemount in `src/app/page.tsx` **wrappend `<AuthGate>`** (onder `QueryProvider`, boven login + app). Runtime-switch via `i18n.changeLanguage()` — geen URL, geen middleware, geen routing-wijziging (matcht "URL blijft `/`").
- Initiële locale **synchroon** geseed uit een non-httpOnly cookie `branddock-ui-locale` (navigator.language fallback), post-login gereconcilieerd naar `AppearancePreference.language`. `<html lang>` wordt dynamisch gezet.
- **`en` = single source of truth**; developers schrijven alleen Engelse sleutels. Getypeerde keys (react-i18next module-augmentation) → ontbrekende/hernoemde sleutel = compile-fout.
- **Alle niet-Engelse bundles worden automatisch door AI gegenereerd** (geen handmatige vertaling). Build-time script roept Claude Opus via `src/lib/ai/` (nooit de SDK direct); incrementeel via source-hash; placeholder/ICU-behoud; glossary (do-not-translate merktermen) + tone-keuze per taal; deterministische validatie-gate + LLM-judge (self-repair-loop); gegenereerde bundles worden gecommit. Ontbrekende vertaling valt graceful terug op Engels (nooit een rauwe sleutel).
- **Regressie-guard**: de bestaande `no-restricted-syntax` ESLint-regel (`eslint.config.mjs`, nu een NL-woorden-denylist uit `2026-06-17-nl-to-en-ui-migration`) wordt geëvolueerd naar een structurele regel die élke hardcoded user-facing string buiten `t()` blokkeert. Draait op de bestaande tsc/eslint PostToolUse-hooks + pre-commit + task-finalize.

## Beslissing 3 — Multi-markt content-architectuur = Approach C (Hybride: Brand-spine + BrandLocaleProfile)

Onderzochte alternatieven gescoord: A (overlay-tabellen per entiteit + WorkspaceMarket, 8) · B (workspace-per-markt + BrandCore + sync-engine, 7.5) · **C (gekozen, 8)**.

- Nieuwe entiteit **`Brand`** 1:1 aan `Workspace` (v1, `Brand.workspaceId @unique`). Houdt **geen** gekopieerde content — de kern leeft al in de workspace-singuliere `BrandStyleguide`/`BrandVoiceguide`/`BrandAsset`. `Brand` is de **decoupling-seam**: omdat content naar `Brand`+`BrandLocaleProfile` verwijst, kan een latere fase `Brand` naar org-scope tillen (gedeelde kern over sibling-workspaces) zonder enige content-hermodellering.
- Nieuwe entiteit **`BrandLocaleProfile`** (`@@unique([workspaceId, locale])`): één rij per markt, draagt alléén de per-markt-**delta** — `voiceOverrides` (JSON, géén tweede voiceguide-rij), `localizedAssets` (JSON getranscreëerde positionering), per-markt F-VAL `centroidEmbedding`, `market`/`status`/`isDefault`.
- De **load-bearing constraints blijven intact**: `BrandVoiceguide.workspaceId @unique` en `BrandStyleguide @@unique([workspaceId])` blijven — markten zijn **deltas**, geen extra rijen. Dit vermijdt het breken van de `findUnique({where:{workspaceId}})`-contracten in `locale-resolver.ts:59`, `brand-context.ts` en `external-content-runner`.
- `getBrandContext(workspaceId)` → **`getBrandContext(workspaceId, localeProfileId?)`** die de profiel-delta over de canonieke kern **merget**. Cache-key (`Map` in `brand-context.ts:37`, + `invalidateBrandContext` :60-61) verandert in **dezelfde commit** van `workspaceId` naar `${workspaceId}:${localeProfileId}` (anders cross-locale context-bleed); `invalidateBrandContext` moet álle profiel-entries van een workspace wissen, niet één key. **Let op (review-bevinding): dit is NIET de enige chokepoint** — de inline-berekening in `getBrandContext` (:1005, fallback `'en'`) én `resolveLocaleForBrand` (fallback `'en-GB'`) zijn twee parallelle paden; profiel-precedentie moet op beide en de byte-identiek-smoke moet beide onafhankelijk bewijzen. Weggelaten profiel = laad `isDefault` = reproduceert vandaag byte-identiek.

### Schema-shape (additief/nullable)

```prisma
model Brand {
  id          String   @id @default(cuid())
  workspaceId String   @unique
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  // v1: geen gekopieerde content — kern blijft in BrandStyleguide/BrandVoiceguide/BrandAsset
  localeProfiles BrandLocaleProfile[]
}

model BrandLocaleProfile {
  id               String   @id @default(cuid())
  brandId          String
  brand            Brand    @relation(fields: [brandId], references: [id], onDelete: Cascade)
  workspaceId      String   // gedenormaliseerd voor scoping/queries
  locale           String   // BCP-47, bv 'de-DE'
  market           String?  // ISO-3166, bv 'DE' — drijft hreflang (LATER)
  status           String   @default("ACTIVE") // DRAFT|ACTIVE|ARCHIVED
  isDefault        Boolean  @default(false)
  voiceOverrides   Json?    // delta over de canonieke BrandVoiceguide
  localizedAssets  Json?    // getranscreëerde positionering/messaging
  centroidEmbedding Unsupported("vector(1536)")? // per-locale F-VAL Pijler-1
  @@unique([workspaceId, locale])
  @@index([workspaceId, status])
}

// Output-entiteiten worden locale-adresseerbaar (null = default profiel = gedrag van vandaag)
// Deliverable.localeProfileId String?   Persona.localeProfileId String?
// LandingPage.localeProfileId String? + LandingPage.locale String?
//   @@unique([workspaceId, slug]) -> @@unique([workspaceId, locale, slug])
```

### Resolver-precedentie (uitgebreid, @unique onaangetast)

```ts
// resolveLocaleForBrand(workspaceId, requestedLocale?)
// precedentie: requestedLocale ∈ BrandLocaleProfile
//   -> default-profile.locale
//   -> voiceguide.contentLocale   (bestaande findUnique-fallback, ongewijzigd)
//   -> workspace.contentLanguage
//   -> 'en-GB'
```

## Beslissing 4 — Twee fundamenteel verschillende vertaal-engines

| | UI-string-vertaling | CONTENT-transcreatie |
|---|---|---|
| Wanneer | Build-time, statisch gecommit | Runtime, per request |
| Aard | Letterlijk, brand-context-vrij | Transcreatie: voice-/persona-/**compliance**-bewust |
| Bron | `en` (source of truth) | Default-profiel-content van het merk (niet `en`) |
| Validatie | String-fidelity LLM-judge | F-VAL 3-pijler, opnieuw per locale |
| Opslag | Gecommitte bundles | `Deliverable`-rijen |
| Trigger | Build-time | Per request |

**Gedeelde dunne laag (alléén dit)**: de `locale-instruction.ts`-helpers (`resolveLocaleLabel:66`/`buildLocaleInstruction:114`/`buildLocaleSystemFragment:133`, "translate, don't mirror"), de AI-client-laag, en het LLM-judge-*patroon*. **Niet gedeeld**: bron, validatie-gate, opslag, trigger. **Let op (review-bevinding)**: `SUPPORTED_LOCALES` is NIET de gedeelde taxonomie — het zit in `src/lib/brand-fidelity/heuristics/locale-resolver.ts:21` en is exact de 4 F-VAL-pack-locales (`nl-NL`/`nl-BE`/`en-GB`/`de-DE`), niet de 7 content-talen. Er zijn drie divergente lijsten: content-taxonomie (7, `VALID_LANGUAGES`), F-VAL-packs (4, `SUPPORTED_LOCALES`), `parseOutputLanguage` `LANG_MAP` (~29). De transcreatie-engine mag NIET op `SUPPORTED_LOCALES` leunen (zou fr/es/pt/it stil uitsluiten); markt-activatie is gated op pack-beschikbaarheid.

# Y-statement

In de context van **Branddock's hybride ssr:false-SPA (single-route, switch-gerouteerd) en een vandaag single-scalar content-locale-model dat één merk aan één taal bindt**, facing **de eis om (a) gebruikers hun eigen UI-taal te laten kiezen, (b) content-taal apart te laten kiezen, en (c) multinationale merken in N markten tegelijk te laten communiceren op een gedeelde merk-kern**, kozen wij **een twee-assige architectuur: een client-side i18next UI-laag met volledig automatische AI-vertaling (en = source-of-truth) per gebruiker, plus een Brand-spine + BrandLocaleProfile-delta-overlay-model (Approach C) per workspace/markt, met getypeerde keys + een CI-guard die nieuwe hardcoded strings blokkeert**, om te bereiken **dat elke toekomstige wijziging automatisch meertalig is, de twee locale-assen nooit verstrengelen, en het multinationale pad open ligt zonder de tenancy/ACL/cache te herstructureren**, accepterend als tradeoff **een extractie-programma over ~600 bestanden, een nieuwe transcreatie-runtime + per-locale F-VAL met N-voudige AI-kosten (vereist job-queue + heuristiek-packs per markt), en drie coexisterende locale-scalars die via één source-of-truth (BrandLocaleProfile) gesynct moeten blijven**.

# Consequences

## Positief
- **Elke latere wijziging is automatisch meertalig**: lint blokkeert hardcoded strings → sleutel landt in `en` → AI-pipeline vult elke taal → volledigheids-check garandeert dekking. Geen handmatige vertaling.
- **Twee assen, nooit verstrengeld**: UI-taal per gebruiker, content-taal per workspace/markt; getest + lint-afgedwongen.
- **Niet-brekende migratie**: bestaande ~13 workspaces worden 1-markt-merken met byte-identiek gedrag (nullable locale = default; afwezig profiel = kern). Load-bearing `@unique`-constraints blijven.
- **Eén merk-DNA / één tenant / één subscription** blijft (vs B's N siloed workspaces + drift).
- **Forward-compatible nu, gratis pre-launch**: `Brand`/`BrandLocaleProfile`-seeds + cache-key + LandingPage unique-key zijn nu een goedkope `db push`, later een live-URL-migratie.
- **Dichten van twee dode seams**: `AppearancePreference.language` (UI, nu) en `ContentReviewLog.language` (content, Fase 4).

## Negatief / tradeoffs
- **Brede extractie**: ~600 bestanden, hoge merge-conflict-oppervlakte; plurals/interpolaties moeten geherauteerd, niet plat-geëxtraheerd.
- **`getBrandContext` wordt complexer op de heetste chokepoint**: een merge-bug corrumpeert stil élke prompt voor een markt.
- **AI-kosten × markt-aantal**: een 12-markt-campagne van 20 deliverables ≈ tot 240 transcreatie- + 240 F-VAL-runs. `bulk-generate` (MAX_CONCURRENCY 3 / 600s) is hiervoor onvoldoende → job-queue vereist (Fase 4).
- **F-VAL coverage-debt wordt zichtbaar**: 4 packs vs 7 talen; markt-activatie moet gated op pack-beschikbaarheid (beta-flag, nooit stille en-GB-fallback).
- **Drie locale-scalars** (`Workspace.contentLanguage`, `BrandVoiceguide.contentLocale`, `BrandLocaleProfile.locale`) — profiel = single source-of-truth, andere twee als synced mirrors.
- **Geen markt-scoped RBAC vandaag**: `WorkspaceMemberAccess` is een presence-based membership-join-tabel (rij = toegang, `@@unique([memberId, workspaceId])`, géén per-markt-scoping-veld). N markten in één workspace betekent dat elke owner/admin alle markten ziet tot Fase 5.
- **Server-side oppervlakken NIET gedekt door de client-i18next-laag**: transactionele e-mails (`sendTransactional`, `src/lib/email/transactional.ts:43` — neemt geen locale), persisted in-app `Notification`-strings, en de ~10 `export*Pdf.ts`-utilities renderen runtime/server-side. Die volgen recipient-/content-locale via een server-importeerbare catalog, niet `AppearancePreference.language`. Idem: ~171 `toLocale*`-datum/getal-sites zijn JS-API-calls (geen `t()`-keys) — een aparte Intl-formatter-workstream (`src/lib/ui-i18n/format.ts`), niet gedekt door de bundle-pipeline of de JSX-CI-guard.

## Neutraal
- `i18next` voegt ~40-60kb + ~4 deps toe — acceptabel voor een ingelogde SaaS; t()/provider-grens is bewust wisselbaar (terug naar hand-rolled mogelijk zonder de wiring te raken).
- De twee selector-talenlijsten verschillen legitiem (UI = beschikbare bundles; content = F-VAL-gedekte locales) — gedocumenteerd zodat de divergentie als bewust leest.

# Alternatives considered

- **next-intl met `/[locale]/` App-Router-segmenten** — verworpen (score 20). De app is ssr:false en switch-gerouteerd; URL-locale-segmenten + server-component-message-loading zijn dood voor ~860/873 .tsx, en middleware zou álle `/api/*` onderscheppen. Canoniek maken zou een volledige routing-rewrite vereisen (tegen de bewuste hybride-SPA-ADR in). Enige legitieme nis: de echte App-Router marketing-pagina's (`src/app/marketing/*`) als losse SEO-workstream — expliciet NIET `/p/[slug]` (volgt content-locale) en NIET de app-shell.
- **Hand-rolled `t()` + Intl + Zustand** (UI-runtime) — score 80, sterke fit met de minimal-deps-cultuur, maar herbouwt parser/plural/lazy/fallback zelf; bij ~3-4k strings wint i18next's ecosysteem (parser, plurals, lazy, TMS). Bewust wisselbaar gehouden.
- **Multi-markt Approach A** (overlay-tabel per entiteit + `WorkspaceMarket`) — score 8, functioneel gelijkwaardig maar spreidt de overlay over 5 nieuwe tabellen; C verzamelt het gangbare geval in één `BrandLocaleProfile`-rij en voegt de Brand-spine toe als expliciete forward-compat-seam.
- **Multi-markt Approach B** (workspace-per-markt + `BrandCore` + sync-engine) — score 7.5; vereist het openen van de `org.type==='AGENCY'`-gate, `maxWorkspaces` verhogen, 3 billing-systemen verzoenen, en een net-nieuwe propagatie/drift-laag; dupliceert merk-DNA per markt. Alleen superieur als markten écht onafhankelijke merken zijn — wat het bestaande AGENCY-type al dekt.
- **Per-markt voice via extra `BrandVoiceguide`-rijen** (relax `@unique` naar `(workspaceId, locale)`) — verworpen; breekt `findUnique({where:{workspaceId}})` in `locale-resolver.ts:59` + `brand-context.ts`. Gekozen: `voiceOverrides` JSON-deltas, merged at resolution.

# Notes

## Gefaseerd programma (uitvoerbaar via 5 task-files)

| Fase | Task-file | Wanneer | Effort |
|---|---|---|---|
| 1 — UI-i18n runtime + Display-language selector (per-user) | `tasks/i18n-ui-foundation.md` | NU | 2-3 wk |
| 1b — Automatische AI-vertaal-pipeline (geen handwerk) | `tasks/i18n-ai-translation-pipeline.md` | NU (parallel) | 1-2 wk + per-namespace |
| 2 — Content-language selector + forward-compatible datamodel (Brand + BrandLocaleProfile) | `tasks/content-locale-foundation.md` | NU | 2-3 wk |
| 3 — Per-generatie target-locale picker + analyze-lek dichten | `tasks/content-locale-target-picker.md` | NU/vroeg | 1-2 wk |
| 4+5 — Multi-markt transcreatie-fan-out + per-locale F-VAL + compliance/hreflang/RBAC/org-billing | `tasks/multi-market-transcreation-enterprise.md` | LATER (enterprise, go/no-go-gated) | multi-maand |

**Launch-discipline**: Fases 1-3 zijn niet-brekend en forward-compatible. Fase 4+5 is de enterprise-track met harde dependencies (job-queue, F-VAL-packs per markt, juridische claim-taxonomie, billing-verzoening) en krijgt een eigen go/no-go-gate; mag de hard launch-blocker `vercel-deployment` niet gijzelen.

## Cross-references
- `docs/adr/2026-05-08-locale-routing-brand-voice.md` — **superseded** door deze ADR (per-brand == per-workspace door `@unique`; multinationale granulariteit nooit geleverd).
- `docs/adr/2026-06-17-nl-to-en-ui-migration.md` — de NL→EN-migratie + de `no-restricted-syntax`-guard die deze ADR evolueert.
- `docs/adr/2026-05-08-fval-output-schema-bevindingen.md` — F-VAL findings-model dat per-locale opnieuw scoort (Fase 4).
- Onderzoeks-output (deze sessie): twee multi-agent workflows (UI-mapping + content/multinational-mapping).

## Open punten vóór Fase 4+5-start
- Job-queue-keuze (transcreatie-fan-out concurrency/cost-budget).
- F-VAL heuristiek-packs voor fr/es/pt/it (+ `detect-brand-language` `ISO3_TO_LANG`-uitbreiding) — gate voor markt-GA.
- `MarketClaim`-model + juridische claim-taxonomie per jurisdictie.
- Verzoening van de drie entitlement-systemen (`Organization.max*` / `PLAN_LIMITS` / Prisma `Plan`/`Subscription`) + org-level billing gemeten op actieve markten.
- Markt-scoped RBAC over `WorkspaceMemberAccess`.
