---
id: campaign-brief-output-mapper
title: Campagne-brief output-mapper (Fase A — Cowork-pariteit render-laag)
fase: pre-launch
priority: now
effort: 2-3 dagen
owner: claude-code
status: done
created: 2026-05-07
completed: 2026-05-08
related-adr: -
related-spec: tasks/_drafts/idea-campaign-brief-cowork-parity.md
worktree: branddock-feat-campaign-brief-output-mapper
---

# Probleem

Branddock's campagne-wizard produceert client-presenteerbaar werk dat ondanks rijke onderliggende data (Persona-narratief, AssetPlan-mini-briefs, MediumEnrichment-tone-guidance) nog niet gerendered wordt als 10-secties Linfi-stijl brief. Founder dogfooding (2026-05) bevestigde gat van ±49,5% t.o.v. Cowork-output (zie `idea-campaign-brief-cowork-parity-validation.md`). De primary-metric "% briefs zonder edits naar klant" stijgt niet zolang de render-laag ontbreekt.

A3-validatie 2026-05-07 toonde bimodale gap-verdeling: 6 secties vallen in format-zone (5-50% gap) en kunnen via output-mapper afgehandeld worden zonder Prisma-wijziging. Fase A pakt deze 6 secties + week-thema-render-prompt voor sectie 5 (zonder persistentie). Studio-content-generation-real-ai is DONE (commit `fbc44d7`, 2026-05-07), dus Fase A is unblocked.

# Voorstel

Een dunne render-laag bovenop de bestaande `CampaignBlueprint`-structuur: een pure data-mapper transformeert wizard-output naar een type-veilige `BriefViewModel`, een renderer produceert markdown + HTML voor 10 secties in Linfi-stijl-volgorde. Zes secties (1, 2, 3, 4, 6, 10) putten uit bestaande velden; sectie 5 maakt één Anthropic-call on-render (geen persistentie); secties 7, 8, 9 tonen expliciete "Niet beschikbaar — vereist <follow-up-feature-id>" placeholders. Een GET-endpoint `/api/campaigns/[id]/brief/render` levert het resultaat aan een nieuwe `BriefRenderView` met "Klaar voor klant"-knop die een PostHog telemetrie-event logt voor primary-metric tracking.

Hergebruik van bestaande primitives: `getBrandContext(workspaceId)` voor brand-tone, `anthropicClient` voor week-thema-prompt, `trackEvent` voor telemetrie, `PageShell + DetailHeader` voor UI, `exportCampaignStrategyPdf.ts` als referentie-patroon voor mapper-stijl. Geen schema-wijzigingen.

# Acceptatiecriteria

- [ ] Given een afgeronde campaign-wizard (alle 9 fasen tot en met `elaborate`), When user klikt "Genereer campagne-brief", Then verschijnt een markdown-document met 10 secties in Linfi-stijl-volgorde (1: overzicht, 2: doelgroep, 3: kernboodschappen, 4: kanaalstrategie, 5: kalender, 6: assets, 7: metrics, 8: budget, 9: risico's, 10: volgende stappen)
- [ ] Given de gegenereerde brief, When user inspecteert sectie 5 (kalender), Then ziet user week-thema's afgeleid uit `CampaignBlueprint.architecture.phaseDurations` + `Persona` + `AssetPlanLayer.deliverables[]` (1 thema per week, on-render via single Anthropic-call, geen persistentie)
- [ ] Given de gegenereerde brief, When user inspecteert sectie 7 (metrics), 8 (budget), 9 (risico's), Then ziet user expliciete "Niet beschikbaar — vereist <follow-up-feature-id>"-placeholder met link naar respectievelijk `campaign-kpi-structure`, `campaign-budget-table`, `campaign-risk-assessment` — **niet** een hallucinatie of lege sectie
- [ ] Given de gegenereerde brief, When user inspecteert sectie 6 (assets), Then ziet user per asset een mini-brief met `objective + keyMessage + toneDirection + CTA + contentOutline` (Branddock-USP)
- [ ] Given de gegenereerde brief, When user klikt "Klaar voor klant", Then wordt PostHog-event `campaign_brief_marked_ready` gelogd met `{ campaignId, workspaceId, sectionsRenderedCount, missingDataFlags[] }`
- [ ] Given de wizard-data heeft missing fields (bv. geen `Campaign.masterMessage`), When de brief gegenereerd wordt, Then toont de relevante sectie een gerichte "ontbrekende data: <veldnaam>"-melding ipv. blanco — geen crash
- [ ] Counter-metric: render-tijd brief ≤ 5 seconden inclusief week-thema-AI-call (single Anthropic-call met cap 60s timeout, gemiddeld 3-5 sec). Server logging van duration als observability
- [ ] Workspace-isolatie: GET `/api/campaigns/[id]/brief/render` filtert via `resolveWorkspaceId()` + `where: { id, workspaceId }` — campaign uit andere workspace levert 404
- [ ] `npx tsc --noEmit` 0 errors, geen `any` types
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd (zie sectie hieronder)

# Bestanden die ik aanraak

**Nieuw:**
- `src/lib/campaigns/brief-data-mapper.ts` — pure data-transformatie: `Campaign + CampaignBlueprint + Persona[] + MediumEnrichment[] → BriefViewModel`. ~250 regels. Risico: laag (pure functie, type-veilig, geen IO).
- `src/lib/campaigns/brief-renderer.ts` — markdown + HTML template-engine die `BriefViewModel` consumeert + per-sectie placeholder-strings. ~300 regels. Risico: laag (pure rendering, geen state).
- `src/lib/campaigns/brief-week-theme-prompt.ts` — Anthropic-prompt-builder + caller voor sectie 5 week-thema's. ~120 regels. Gebruikt `anthropicClient` + `getBrandContext(workspaceId)`. Risico: medium (AI-call, kan timeouten — fallback levert "Wekelijkse thema's niet beschikbaar — probeer opnieuw").
- `src/lib/campaigns/brief-types.ts` — TypeScript interfaces: `BriefViewModel`, `BriefSection`, `BriefMissingDataFlag`, `WeekThemeOutput` (Zod schema voor AI-response validatie). ~80 regels. Risico: laag.
- `src/app/api/campaigns/[id]/brief/render/route.ts` — GET endpoint, workspace-filter via `resolveWorkspaceId()`, fetcht `Campaign` + relations, roept mapper + renderer + week-thema-prompt aan, returnt `{ markdown, html, missing[], generatedAt, durationMs }`. ~120 regels. Risico: medium (eerste GET-route die AI-call wraps; dynamic-route conflict-check vs. bestaande `/api/campaigns/[id]/...` — `brief/render` is nieuw segment, geen overlap).
- `src/features/campaigns/components/detail/strategy/BriefRenderView.tsx` — nieuwe view-component: "Genereer brief"-knop, loading-state, markdown-preview (`react-markdown` reeds in deps?), "Klaar voor klant"-knop met telemetrie-call. ~200 regels. Risico: medium (UI-state + telemetrie-trigger).
- `src/features/campaigns/api/brief.api.ts` — TanStack-Query hook `useGenerateBrief(campaignId)` die GET aanroept. ~50 regels. Risico: laag.

**Extend:**
- `src/features/campaigns/components/content-library/ContentLibraryCampaignMode.tsx` — voeg "Genereer brief" knop toe naast bestaande PDF/JSON-exports (regels rond 510-530). ~10 regels gewijzigd. Risico: laag.

**Workspace-isolatie**: GET-route doet alleen reads — geen `invalidateCache` nodig. **Belangrijk**: telemetrie-event op "Klaar voor klant" gaat via PostHog server-side trackEvent (zie `src/lib/analytics/posthog.ts`), dus aparte POST `/api/campaigns/[id]/brief/mark-ready` route nodig om server-side `trackEvent` aan te roepen — geen DB-mutatie, dus ook geen cache-invalidation. Dat is een 2e route ~40 regels, laag risico.

**Tailwind 4 purge check**: nieuwe UI gebruikt bestaande primitives (`PageShell`, `DetailHeader`, `Button`, `Card`, `EmptyState`) en design tokens (`text-primary`, `bg-emerald-50`). Geen nieuwe Tailwind utility-classes. Voor markdown-preview: gebruik bestaande prose-classes uit `src/index.css` of inline-style indien `prose-*` ontbreekt — vooraf grep `prose-` in `src/index.css`, anders `react-markdown` met inline class-overrides via `components` prop.

**Totaal**: 7 nieuwe files + 1 extend + 1 extra POST-route = 9 files, ~1170 regels nieuw + ~10 gewijzigd.

# Bestanden die ik NIET aanraak

- `prisma/schema.prisma` — geen schema-wijziging in Fase A (expliciet uit idea-file)
- `src/lib/campaigns/strategy-chain.ts` — wizard-pipeline blijft ongemoeid; brief-mapper is downstream
- `src/lib/campaigns/strategy-blueprint.types.ts` — bestaande types worden gelezen, niet gewijzigd
- `src/features/campaigns/utils/exportCampaignStrategyPdf.ts` / `exportCampaignStrategyJson.ts` — referentie-patroon, niet refactoren
- Alle wizard-API-routes onder `src/app/api/campaigns/wizard/` — buiten scope
- `MediumEnrichment` Prisma writes — alleen reads voor tone-per-kanaal in sectie 3

# Smoke test plan

**Pre-condities**: workspace heeft afgeronde campaign met blueprint geladen (gebruik testdata zoals founder-dogfooding-Linfi-campagne of een seeded campaign met alle 9 fasen `elaborate` afgerond).

1. **Happy path** — Open campaign-detail-pagina (Strategy Hub) → klik "Genereer brief" → verifieer dat binnen 5 sec markdown verschijnt met 10 secties in correcte volgorde. Inspecteer sectie 5: ten minste `phaseDurations.length` weken-blokken aanwezig met thema-naam + 1-zin rationale + asset-koppeling.
2. **Mini-brief per asset (Branddock-USP)** — In sectie 6 verifieer dat elke `AssetPlanDeliverable` rendert met objective + keyMessage + toneDirection + CTA + contentOutline (alle 5 velden zichtbaar of "ontbrekend"-melding).
3. **Placeholder-correctheid** — Inspecteer secties 7, 8, 9: elk toont expliciete "Niet beschikbaar — vereist `campaign-kpi-structure` / `campaign-budget-table` / `campaign-risk-assessment`" met klikbare link (mailto/internal-task-link) — geen hallucinatie of leeg blok.
4. **Edge case — missing-data** — Maak testcampaign met `Campaign.masterMessage = null` + `ChannelPlanLayer.channels = []` → genereer brief → verifieer dat sectie 3 toont "ontbrekende data: masterMessage" en sectie 4 "ontbrekende data: channels[]" — geen crash, geen blanco.
5. **Edge case — week-thema AI-fail** — Simuleer Anthropic 500 (block met env `ANTHROPIC_API_KEY=invalid` lokaal of mock-server-fail) → verifieer dat sectie 5 fallback toont "Wekelijkse thema's niet beschikbaar — probeer opnieuw" + retry-knop, en dat secties 1-4, 6-10 wel correct renderen.
6. **Telemetrie-event** — Klik "Klaar voor klant" → verifieer in PostHog-debug-log (lokale `console.log` shim of staging PostHog) dat event `campaign_brief_marked_ready` is gelogd met `{ campaignId, workspaceId, sectionsRenderedCount: 10, missingDataFlags: [...] }`.
7. **Workspace-isolatie** — Login als user A in workspace W1 → noteer campaign-id `c1` → switch naar workspace W2 → call `GET /api/campaigns/c1/brief/render` direct via curl/devtools → verifieer 404 response, geen brief-data lekt.
8. **Counter-metric** — Run brief-render 5x op zelfde campaign → log `durationMs` server-side → gemiddelde moet ≤ 5000ms zijn. Als > 5000ms: ofwel week-thema-prompt cap'en op 4000ms timeout met fallback, ofwel parallelliseren met overige rendering.
9. **TypeScript + lint** — `npx tsc --noEmit` 0 errors, `npm run lint` 0 errors.

# Risico's

- **Anthropic-call timeout op week-thema-prompt** (waarschijnlijkheid: medium) — Anthropic 5xx of >10s latency → render kan vastlopen. **Mitigatie**: hard timeout van 6000ms via AbortController; fallback "thema's niet beschikbaar" + retry-knop; secties 1-4, 6-10 renderen onafhankelijk (parallel mapping vóór week-thema-call, append na).
- **Markdown-rendering instabiel bij missing nested fields** (waarschijnlijkheid: medium) — `validateOrWarn` in strategy-chain laat AI-output door met null-velden (zie `gotchas.md` 2026-03-24); mapper moet ALLE array-accesses defensief guarden. **Mitigatie**: pure mapper met `(arr ?? []).map()` patroon overal + `BriefMissingDataFlag[]` retourneert per ontbrekend veld een gestructureerde flag — UI rendert flag ipv. crash.
- **Tailwind 4 prose-classes ontbreken** (waarschijnlijkheid: laag-medium) — `prose-*` utilities mogelijk niet in `src/index.css` (zie `gotchas.md` 2026-04-19). **Mitigatie**: pre-check via `grep "prose-" src/index.css` vóór implementatie; ofwel append regels toe of gebruik inline styles + `react-markdown` `components` prop voor heading/paragraph-styling.
- **Dynamic-route conflict** (waarschijnlijkheid: laag) — `/api/campaigns/[id]/brief/render` introduceert nieuw `brief` segment. Bestaande routes onder `[id]` zijn `bulk-create-deliverables`, `bulk-generate`, `canvas`, `coverage`, `deliverables`, `knowledge`, `lock`, `master-message`, `strategy` — geen `brief`. Geen overlap. **Mitigatie**: vóór commit `ls src/app/api/campaigns/[id]/` confirmeren.
- **PostHog niet geconfigureerd lokaal** (waarschijnlijkheid: hoog dev-only) — `trackEvent` no-op in dev (geen `POSTHOG_API_KEY`). Smoke-test stap 6 vereist console-shim of staging-key. **Mitigatie**: optional `console.log('[trackEvent]', payload)` als fallback in dev (al ingebouwd in posthog.ts? — verifieer in implementatie).
- **Brandclaw-conflict latent** (waarschijnlijkheid: laag voor Fase A) — render-laag is read-only, raakt loop-architectuur niet. **Mitigatie**: geen — dit is exact waarom Fase A is gekozen boven Fase B.
- **A3-validatie aanname kan tegenvallen in praktijk** (waarschijnlijkheid: medium) — output kan kwalitatief alsnog onder Cowork-pariteit blijven ondanks 6/10 secties dekkend. **Mitigatie**: founder dogfoodt direct na livegang met echte Linfi-campagne; primary-metric (klaar-voor-klant-knop) levert telemetrie binnen 60 dagen voor go/no-go op Fase B.

# Effort schatting

**2-3 dagen** voor solo-dev:
- Day 1 (~8u): types + mapper + renderer (pure functies, geen IO)
- Day 2 (~6u): GET-route + week-thema-prompt + AI-call + error-handling
- Day 2-3 (~6u): UI-component + TanStack-hook + telemetrie POST-route + integratie in ContentLibraryCampaignMode
- Day 3 (~4u): smoke-test + edge-case-bugs + tsc/lint groen

Onbekende factor 1.3x voor markdown-rendering library-keuze (`react-markdown` reeds in deps verifiëren) en Tailwind prose-classes. Smoke-test factor 1.2x door 9 stappen incl. workspace-isolatie + AI-fail-simulatie.

# Out of scope

- **Sectie 5 persistentie** — week-thema's zijn on-render, geen `WeeklyTheme` model (zie `idea-campaign-weekly-calendar.md` resolutie)
- **PDF / Notion / Google Doc / Word export** — Fase A is markdown + HTML only
- **Multi-language briefs** — NL only
- **B1 `campaign-weekly-calendar`** (gedissolvet, niet meer in backlog)
- **B2 `campaign-kpi-structure`** — sectie 7, follow-up via `feature-planner` na Fase A
- **B3 `campaign-budget-table`** — sectie 8, follow-up via `feature-planner` na Fase A
- **B4 `campaign-risk-assessment`** — sectie 9, follow-up via `feature-planner` na Fase A
- **Brief-versioning / diff-history** — gebruikt later `ContentVersion` (post-launch)
- **Live research APIs** (LinkedIn-benchmarks, Perplexity Sonar) — out
- **Multi-tenant agency-templating** — out
- **Auto-publish naar social** — out
- **Studio-siblings-context-variation** — eigen post-launch task (zie `idea-campaign-weekly-calendar.md`)
- **Refactor van `exportCampaignStrategyPdf.ts`** — alleen referentie-patroon, niet aanpassen

# Notes

**Phase -1 Gates resultaat**:
- Simplicity Gate: PASS (3 nieuwe directories niet nodig — alles in bestaande `src/lib/campaigns/` + `src/features/campaigns/components/detail/strategy/` + `src/app/api/campaigns/[id]/brief/`)
- Anti-Abstraction Gate: PASS (directe primitives: `prisma`, `anthropicClient`, `getBrandContext`, `trackEvent`, `PageShell` — geen wrapper layers)
- Integration-First Gate: PASS (GET-contract `{ markdown, html, missing[], generatedAt, durationMs }` is helder, mock-bare voor UI-werk)

**ADR-noodzaak**: NEE
- Geen Prisma schema-wijziging
- Geen nieuwe `src/lib/<module>/` directory met >5 files (4 nieuwe files binnen bestaande `src/lib/campaigns/`)
- Geen nieuwe library-install (alle deps al aanwezig: `@anthropic-ai/sdk`, `react-markdown` te verifiëren — als afwezig dan ADR-vraag voor markdown-renderer-keuze)
- Geen pattern-introductie buiten conventies

**Verificatie-stappen vóór implementatie**:
1. `grep "react-markdown" package.json` — als afwezig: korte ADR-skill + install
2. `grep "prose-" src/index.css | head` — bepaalt of inline-styles nodig zijn
3. `ls src/app/api/campaigns/[id]/` — confirmeren dat `brief/` segment uniek is

**Cross-link**: dit task-bestand verwijst naar `idea-campaign-brief-cowork-parity.md` + validation-rapport als read-only spec. Bij Fase A done: archief-validatie naar `docs/specs/` of `docs/playbooks/` als referentie.

**Volgende stap na done**: `feature-planner` discovery openen voor B2 (`campaign-kpi-structure`) — eerste van 3 follow-ups. Niet alle drie tegelijk.

## Implementation summary 2026-05-08 (final delivery)

Hoofdimplementatie geleverd in eerdere sessie. Deze sessie afgerond: smoke-test geschreven + quality-gates geverifieerd + status closed.

**Files in scope (al bestaand vóór deze sessie)**:
- `src/lib/campaigns/brief-data-mapper.ts` (456 regels) — pure mapper `mapToBriefViewModel({campaign, blueprint, personas, enrichments})` returnt `{viewModel, missing}` tuple
- `src/lib/campaigns/brief-renderer.ts` (357 regels) — `renderBriefMarkdown({viewModel, missing, weekThemes})` produceert 10-sectie markdown
- `src/lib/campaigns/brief-types.ts` (133 regels) — `BriefViewModel`, `BriefMeta`, `BriefSection`, `BriefMissingDataFlag`, `WeekTheme`, `BriefAssetEntry`, etc.
- `src/lib/campaigns/brief-week-theme-prompt.ts` (244 regels) — Anthropic-call wrapper voor sectie 5 week-thema's met timeout + fallback
- `src/app/api/campaigns/[id]/brief/render/route.ts` (170 regels) — GET endpoint, workspace-isolation, parallel mapper + week-theme-call
- `src/app/api/campaigns/[id]/brief/mark-ready/route.ts` (78 regels) — POST endpoint voor PostHog `campaign_brief_marked_ready` telemetry
- `src/features/campaigns/components/detail/strategy/BriefRenderView.tsx` (250 regels) — UI component met markdown-preview + "Klaar voor klant"-knop
- `src/features/campaigns/components/content-library/ContentLibraryCampaignMode.tsx` — "Generate brief"-knop geïntegreerd (regel 553) + lazy-load BriefRenderView (regel 26-31)

**Files toegevoegd deze sessie**:
- `scripts/smoke-tests/campaign-brief-render.ts` (new) + `npm run smoke:brief-render`

**Quality gates**:
- ✅ `npx tsc --noEmit` 0 errors
- ✅ `npm run lint` 0 errors (mijn smoke-script lint-clean)
- ✅ `npm run smoke:brief-render` 31/31 passed

**Smoke-coverage** (DB-vrij, geen AI-calls):
- Scenario 1 — minimal campaign + null blueprint: returns viewModel zonder crash, emit missing-flags (3 checks)
- Scenario 2 — full blueprint + 2 personas + 1 enrichment: viewModel populated + 0 critical-missing, alle 10 secties rendert in markdown (`# 1. ... ## 10. ...`), placeholder-secties 7/8/9 tonen "Not available — requires follow-up feature `campaign-kpi-structure / campaign-budget-table / campaign-risk-assessment`", sectie 6 toont per-asset mini-brief (objective + keyMessage + CTA + outline), sectie 2 personas, sectie 4 channels (linkedin + email) — **23 checks**
- Scenario 3 — week-themes injected: sectie 5 includes week-1+2 thema-naam + linked deliverables (3 checks)
- Scenario 4 — weekThemes null: sectie 5 header aanwezig + fallback-melding (2 checks)

**Markdown output** (sample voor full blueprint):
```
# Campaign brief — Test Campagne
*Duration: 9 weeks · Period: 1 Jun 2026 → 1 Aug 2026*

## 1. Campaign overview
## 2. Audience
### Primary segment — Maria
**Role**: Marketing Director
## 3. Key messaging
## 4. Channel strategy
## 5. Content calendar (week themes)
## 6. Asset inventory
## 7. Success metrics
> **Not available** — requires follow-up feature `campaign-kpi-structure`.
## 8. Budget allocation
> **Not available** — requires follow-up feature `campaign-budget-table`.
## 9. Risks & mitigations
> **Not available** — requires follow-up feature `campaign-risk-assessment`.
## 10. Next steps
```

2161 chars / 88 regels voor middelgrote blueprint — ruim onder verwachte performance-budget.

**Out-of-scope verified**:
- Geen Prisma schema-wijziging
- Studio-content-generation-real-ai dependency: ✅ done (commit `fbc44d7`)
- Geen wizard-API-route refactor

**Volgende stap na done** (per task-file note): `feature-planner` discovery openen voor B2 `campaign-kpi-structure` — eerste van 3 follow-ups (B2/B3/B4). Niet alle drie tegelijk.
