# Audit: workspace-cookie zombie-tabs — stille 404's op alle studio-persists

> **Datum**: 2026-06-10 · **Aanleiding**: hero-image "soms niet meegenomen" Step 2→3 (Napking LP `cmq7x00j1`, zelfde ochtend). Vervolg op de bevinding uit de brand-fit/hero-sessie: self-heal faalde met "Not found" terwijl de user gewoon in de canvas werkte.
> **Status**: ✅ **VOLLEDIG GEBOUWD + GEVERIFIEERD 2026-06-10** — zie `tasks/workspace-zombie-tab-fix.md`. F1 op álle 38 studio-routes: 5 canvas-kritieke via `requireDeliverableAccess` (onderscheid 401/403/404), 33 overige via drop-in `resolveDeliverableWorkspaceId()` (zelfde null-contract als `resolveWorkspaceId`, mechanische sweep). F2 = `WorkspaceSwitchGuard` (BroadcastChannel-overlay), bewezen met two-tab Playwright-smoke (`scripts/dev/f2-zombie-tab-smoke.mjs`). F3 vervallen (mismatch-pad bestaat niet meer). Helper: `src/lib/deliverable/deliverable-access.ts`.

---

## TL;DR

De actieve workspace is een **browser-globale httpOnly-cookie** (`branddock-workspace-id`). Een workspace-switch reload't alleen de eigen tab; **alle andere open tabs worden zombie-tabs**: hun UI toont nog workspace A, maar elke cookie-scoped API-call resolved naar workspace B en krijgt 404 "Not found". Omdat de LP-canvas twee route-families mengt — `/api/landing-pages/*` (membership-scoped, blijft werken) en `/api/studio/*` (cookie-scoped, faalt stil) — blijft de pagina er normaal uitzien terwijl persists verdwijnen. Dit verklaart het "soms geen header-image"-patroon én betekent **stille data-loss op de Step 3-autosave**.

---

## Bewijsketen (incident 2026-06-10, tijden lokaal)

Klok-kalibratie: dev-log loopt +1u op lokaal; Prisma schrijft UTC (= lokaal −2u) in timestamp-kolommen.

| Tijd | Gebeurtenis | Bewijs |
|---|---|---|
| 12:17 | User maakt LP `cmq7x00j1` aan in Napking. Campagne-lijst + creatie zijn **cookie-scoped** → cookie wees op dat moment naar Napking. | `Deliverable.createdAt` 10:17 UTC |
| 12:17–12:31 | **Cookie wijzigt naar een andere workspace.** Enige schrijver van de cookie is `POST /api/workspace/switch` (verificatie: grep), aangeroepen vanuit `OrganizationSwitcher.handleSwitchWorkspace` — dus ergens in een ándere tab/venster is geswitcht. | Eliminatie: geen andere cookie-writers |
| 12:31 | `[Step1Context] hero persist failed {}` — hero-persist (cookie-scoped studio-route) faalt; de variant-generatie zelf (landing-pages-route, membership-scoped) slaagde net daarvoor. `structuredVariant.hero.heroVisualUrl` blijft leeg. | dev-log 13:31 + DB-audit |
| 12:42–13:05 | `[PuckPageBuilder] hero self-heal failed {}` ×4 — snelle 4xx (≤150ms response, dus géén image-gen). Prisma-querypatroon direct ervoor toont: `getExplicitWorkspace` **slaagde volledig** (workspace-lookup + membership OK) en de daaropvolgende scoped deliverable-lookup vond niets → cookie wees naar een geldige workspace ≠ Napking. | dev-log 13:42/14:04/14:05 query-trace |
| 13:28 | Reproductie met expliciete `Cookie: branddock-workspace-id=<napking>`: identieke call slaagt in 24s, hero atomisch gepersist. | curl-repro + DB-verificatie |

De fout werd gemaskeerd doordat `console.warn('...', err)` met een kaal Error-object naar `{}` serialiseert in de doorgestuurde dev-log (inmiddels gefixt: gestructureerd `{ deliverableId, message }`).

## Architectuur-analyse

**Twee scoping-regimes door elkaar** (inventarisatie 2026-06-10):

| Route-familie | Scoping | Gedrag in zombie-tab |
|---|---|---|
| `/api/landing-pages/*` (11 routes: generate-structured-variant, auto-iterate-variant, lp-fidelity-check, …) | deliverable → campaign.workspaceId → **org-membership** | ✅ blijft werken |
| `/api/studio/*` (38 routes: GET/PATCH deliverable, context, generate-visual, hero-image, components, …) | `resolveWorkspaceId()` (cookie) **== campaign.workspaceId** | ❌ 404 "Not found" |

Gevolgen in een zombie-tab (LP-canvas):
1. **Step 2-generatie werkt** (landing-pages-routes) → user ziet volledige content, geen reden tot argwaan.
2. **Elke studio-persist faalt stil**: hero-persist (Step1Context), hero self-heal, én de **debounced puckData-autosave** (`PATCH /api/studio/[id]`) → handmatige Step 3-edits verdwijnen bij reload. Dit is de ernstigste consequentie.
3. De sidebar-switcher toont nog de oude workspace-naam (laadt alleen on-mount) — de UI liegt dus actief tegen de user.

**Waarom dit "soms" gebeurt**: de user werkt standaard met meerdere tabs/vensters en parallelle (Claude-)sessies die browser-verificatie op andere workspaces doen. Eén switch ergens = alle andere tabs zombie. Geen enkele vorm van cross-tab-sync aanwezig (grep: 0× BroadcastChannel, 0× storage-listener).

## Aanbevolen fix (gefaseerd)

**F1 — Resource-gebaseerde autorisatie voor studio-routes (kern, structureel).** Routes met een expliciete `deliverableId` moeten autoriseren op de workspace VAN het deliverable (`hasWorkspaceAccess(userId, deliverable.campaign.workspaceId)` — bestaat al in `workspace-resolver.ts`, gebouwd voor exact dit doel per 9.6 M9), niet op cookie-gelijkheid. De cookie is alléén legitiem voor lijst/creatie-endpoints zonder resource-ID. Prioriteit: de LP-canvas-kritieke persists eerst (studio GET/PATCH, context, generate-visual, hero-image, components), daarna de rest van de 38.

**F2 — Cross-tab-sync (defense-in-depth).** `BroadcastChannel('branddock-workspace')`: bij switch broadcast; andere tabs tonen een blocking overlay "Workspace gewijzigd naar X — herlaad" (geen stille reload midden in een edit).

**F3 — Diagnostiek (quick win).** Studio-routes geven bij workspace-mismatch een onderscheidende error (`{ error: "workspace-mismatch", expected, active }`) i.p.v. generiek "Not found"; client toont InfoBox met uitleg + reload-CTA.

**Risico zonder fix**: pre-launch testrondes verliezen stil werk (autosave), en de hero-klasse bugs blijven "spontaan" terugkomen ondanks dat de clobber-guards (2026-06-08/09) en de wiring zelf aantoonbaar correct zijn.

## Gerelateerd

- `gotchas.md` 2026-06-10 (brand-fit/screenshotter + `{}`-logging)
- `docs/audits/2026-06-08` orphaned-hero + `hero-visual-preserve.ts` (client/server clobber-guards — die laag is OK)
- DB-audit hero-wiring: 26 LP-deliverables, Step 2→3 transfer 100% correct sinds de guards; alle "lege hero"-gevallen zijn persist-failures vóór de transfer (deze audit verklaart waarom)
