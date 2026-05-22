---
id: 2026-05-22-ad-publishing-integration
title: Ad-publishing integration met Meta/LinkedIn/Google APIs (gefaseerd, HITL, measurement-foundation nu)
status: accepted
date: 2026-05-22
supersedes: -
superseded-by: -
---

# Context

Branddock genereert ad-content (linkedin-ad, facebook-ad, search-ad, display-ad, retargeting-ad, native-ad, video-ad) maar heeft op dit moment geen pad om die content rechtstreeks naar advertising-platforms te publiceren. User-wens: vanuit Content Canvas direct kunnen "schieten" naar Meta / LinkedIn / Google ad-accounts, vervolgens performance kunnen meten en daarop laten itereren met AI-suggesties.

De volle ambitie (closed-loop met auto-publish, dashboard en AI-improvement-engine) is bewust getemperd in deze beslissing — externe blokkers en scope-risico maken een gefaseerde aanpak noodzakelijk:

- **Externe app-approvals** met meerwekelijke wachttijd: Meta Business Verification (2-8 wk), LinkedIn Marketing Developer Platform (langer, partnership-vereiste), Google Ads developer-token (2-3 wk basic level).
- **Pre-launch fase**: Branddock draait nog op localhost; Vercel + custom domain + Stripe staan voor livegang in voorbereiding. Pre-launch eindigt bij livegang (CLAUDE.md). Approval-spoor kan parallel met pre-launch starten zonder dev-werk, bouw-fases zijn in essentie post-launch.
- **Vertrouwen + risico**: brand-merken laten direct ad-spend uitzetten via een net-gelanceerd platform is een trust-investering. HITL ("Publish" knop per ad) is veiliger dan autopilot.
- **Tech stack al aanwezig**: Next.js 16.1.6, Prisma 7.4 + PostgreSQL 17, Better Auth + Organization plugin, `TOKEN_ENCRYPTION_KEY` env-var voor OAuth-token encryption.
- **Bestaande infra herbruikbaar**: `WorkspaceIntegration` model wordt al gebruikt door Better Auth voor OAuth tokens (sync via databaseHooks per [[2026-02-12-better-auth-organization]]).

Drie zwaartepunten in scope:
- **Generatie polish** — alle ad-types moeten clean renderen in Content Canvas (mirror facebook-post / twitter-thread 6-laagse routing-pattern uit Ronde 1 social-media testronde).
- **Publish-pipeline** — OAuth account-link + creative/ad-set/campaign aanmaken via Marketing API.
- **Measurement-foundation** — data-model NU bouwen (geen dashboard, geen AI-engine) zodat performance-fetch + improvement-engine later plug-in werk zijn, niet refactor.

# Decision

Adopteer **gefaseerd closed-loop ads-platform met HITL-publish, sandbox-first, Meta-first** als architectuur. Concreet:

1. **OAuth account-linking per workspace** — nieuw `ConnectedAdAccount` model met `platform`, `externalAccountId`, encrypted `accessToken`/`refreshToken` (via bestaande `TOKEN_ENCRYPTION_KEY`), `expiresAt`, `scopes[]`, `status`. Uitbreidbaar dezelfde laag als `WorkspaceIntegration` voor andere OAuth-integraties — separate table omdat ad-accounts platform-specifieke metadata hebben (business-id, ad-account-id, currency, timezone).
2. **Platform-volgorde Meta → LinkedIn → Google** — Meta heeft snelste approval-curve, breedste creative-types (single-image, carousel, video, story), en de eerste test-workspaces (Linfi, Napking) hebben FB-doelgroepen. LinkedIn na Meta-pijler werkt en MDP-approval binnen is. Google parked tot na Meta+LinkedIn werken.
3. **Sandbox-first development** — bouwen tegen Meta dev-mode + LinkedIn test-accounts vóór live ad-spend. Vereist test-ad-account + test-creditcard setup per platform.
4. **Human-in-the-loop "Publish" per ad** — geen autopilot, geen scheduled auto-publish in initiële release. User klikt expliciet "Publish to Meta" op Content Canvas; status-sync (pending/active/paused/rejected) terug.
5. **Measurement-foundation NU, dashboard/AI later** — `AdCampaign` model met external IDs (`externalCampaignId`, `externalAdSetId`, `externalCreativeId`) + `AdMetricSnapshot` table (capturedAt, impressions, clicks, ctr, cpm, cpc, conversions, spend, raw JSON) worden direct gebouwd. Geen polling-job, geen UI, geen suggestion-engine in scope.
6. **3-fase phasing**:
   - **Fase A — Ads-generation polish**: per ad-type (facebook-ad, display-ad, native-ad, video-ad, retargeting-ad) mirror van 6-laagse pattern uit [[branddock-round1-social-2026-05-20]]. Schat 30-60 min per type. linkedin-ad is al klaar.
   - **Fase B — Account-link + publish-pipeline**: OAuth-flow, `ConnectedAdAccount` model, "Publish to Meta" knop, creative-spec validatie per platform, scheduled token-refresh job. Meta eerst, LinkedIn na MDP-approval.
   - **Fase C — Measurement-foundation (overlap met B)**: `AdCampaign` + `AdMetricSnapshot` schema, externe-ID storage in publish-flow. Geen fetch/dashboard/AI.

Parallel approval-spoor (geen dev-werk, alleen account-werk door user):
- Meta Business Verification (kan nu starten)
- LinkedIn Marketing Developer Platform (start na Meta-pijler werkend bewijs)
- Google Ads developer-token (parked, start in Fase D-toekomst)

# Y-statement

In de context van **een pre-launch SaaS-platform dat een werkende content-to-ads pipeline wil bieden**, facing **multi-weekse externe app-approval-cycli en aanzienlijk scope-risico op een ongebouwde closed-loop**, I decided **een gefaseerde HITL-publish-architectuur met Meta-first, sandbox-first, en een measurement-data-model dat nu wordt gelegd maar geen UI/AI krijgt**, to achieve **een geloofwaardige publish-pijler bij livegang met de fundering klaar voor latere performance-engine zonder schema-refactor**, accepting tradeoff **dat de eerste release geen automatische improvement-suggesties, geen performance-dashboard, en geen autopilot heeft — die volgen pas in een vervolg-ADR**.

# Consequences

## Positief

- Branddock wordt een echt ads-platform met content-to-live-campagne pipeline, niet alleen een copy-generator.
- Approval-spoor kan parallel met pre-launch werk starten zonder developer-uren te kosten — geen tijd verloren aan wachttijden.
- Measurement-data-model is dag-1 aanwezig, performance-fetch + improvement-engine kunnen later additieve features zijn in plaats van schema-migratie.
- HITL-publish bouwt trust met merken vóór automation wordt aangeboden — risico-minderend en marktrijp-oogend.
- Sandbox-first ontwikkelingsmodel voorkomt onbedoelde ad-spend tijdens build/demo.
- Mirror van Ronde 1's 6-laagse routing-pattern (uit [[branddock-round1-social-2026-05-20]]) maakt Fase A voorspelbaar en snel.
- `TOKEN_ENCRYPTION_KEY` bestaat al en heeft een productie-back-up procedure (CLAUDE.md) — geen nieuwe sleutel-management.

## Negatief / tradeoffs

- Externe blokkers (Meta Business Verification 2-8 wk, LinkedIn MDP nog langer) sturen de bouw-timing aanzienlijk — kan kritisch-pad-risico worden als verifications afgewezen worden.
- Sandbox-first vereist per platform een test-ad-account + test-creditcard configuratie; voor LinkedIn vereist dit een toegekende test-account-pool.
- Per-platform creative-spec-validatie (image-dimensions, char-limits, video-codecs, file-sizes) verdubbelt de bestaande F-VAL validation-laag met platform-specifieke regels.
- Token-refresh complexity verschilt per platform (Meta long-lived 60d, LinkedIn 60d met refresh, Google refresh-tokens met OAuth2) — vereist nieuwe scheduled refresh-job.
- Initiële release mist de "wow" van AI-improvement-suggesties + dashboard. Marketing-narratief wordt "publish + dashboard later".
- Future improvement-engine + dashboard zijn nog niet architectonisch ontworpen — refactor-risico als measurement-foundation onvoldoende info opslaat (mitigated door raw-JSON kolom in AdMetricSnapshot).
- Google Ads parked betekent dat search-ad als ad-type in Fase A klaar maakt maar pas in een latere release effectief publishbaar wordt — verwachtingsmanagement nodig richting user.

## Neutraal

- `ConnectedAdAccount` wordt een aparte table naast `WorkspaceIntegration` ondanks overlap — platform-specifieke metadata (business-id, currency, timezone, ad-account-id, ad-account-status, creative-library-id) rechtvaardigt eigen model.
- `AdCampaign` is een aparte entity, geen extensie van bestaande `Deliverable` — een Deliverable kan meerdere campagnes spawnen (zelfde creative naar Meta én LinkedIn).
- Improvement-engine architectuur wordt opzettelijk uitgesteld tot na de eerste data-collectie — beslissingen rond suggestion-types, confidence-scoring en HITL-bevestiging zijn data-gedreven beter te nemen.
- Status-sync gebeurt via polling in initiële release; webhook-receivers per platform zijn future work in vervolg-ADR.

# Alternatives considered

- **Full closed-loop direct (publish + dashboard + AI-improvement-engine in één release)**: te groot scope, te duur en te risicovol voor pre-launch fase. Verworpen ten gunste van getemperde 3-fase aanpak; AI-engine vereist eerst real-world performance-data om suggestion-quality te kunnen tunen.
- **Google Ads eerst**: langste approval-curve (developer-token + verificatie van API-gebruik), complexere SEM-domein (RSA met multi-field componenten, conversion-tracking, keyword-match-types), schat traagste time-to-first-publish. Verworpen ten gunste van Meta-first.
- **Geen sandbox, direct tegen live API's bouwen**: risico op ongewenste ad-spend tijdens development en bij demo's, blokkerend voor reproduceerbare tests. Verworpen — sandbox-overhead is klein vergeleken met deze risico's.
- **Geen token-encryption**: schending van basis-security en platform ToS (alle drie expliciet verbieden plaintext token storage). Verworpen — `TOKEN_ENCRYPTION_KEY` is al beschikbaar voor exact dit doel.
- **Autopilot publishing (cron-driven publish-on-schedule zonder klik)**: te gevaarlijk voor brand-merken op een net-gelanceerd platform; één bug → ongewenste live ad bij klant. Verworpen voor initiële release; opt-in autopilot per workspace is potentiële vervolg-ADR na trust opgebouwd.
- **Measurement helemaal parkeren tot Fase D**: blokkeert post-launch iteratie omdat ofwel schema-migratie nodig is om `AdCampaign` external-IDs te kunnen koppelen aan metrics, ofwel performance-data niet gerelateerd kan worden aan content-items. Verworpen — data-model NU bouwen is goedkoop (~1 wk binnen Fase B), kosten van later refactoren zijn substantieel.
- **`ConnectedAdAccount` als extensie van `WorkspaceIntegration`**: overlap is reëel, maar ad-account metadata (business-id, ad-account-id, currency, timezone, creative-library-id) en het volume aan platform-specifieke velden maken een polymorphic-extension model onhandig. Verworpen ten gunste van separate table met expliciete velden + foreign-key naar Workspace.

# Notes

Verwante artefacten:
- Feature-spec wordt opgesteld in `docs/specs/ad-publishing.md` met data-model details, API-endpoint contracten, Fase A/B/C task-breakdown en test-strategie.
- Memory: [[branddock-round1-social-2026-05-20]] — Ronde 1 social testronde, geparkeerd ten gunste van deze feature.
- Memory: [[branddock-pre-launch-tracks]] — overall pre-launch sprint tracking; deze ADR vormt input voor track-planning.
- Memory: [[brand-voice-future-extraction]] — brand-voice infra wordt hergebruikt in copy-generatie van ads (al klaar).
- Verwante eerdere ADR: [[2026-02-12-better-auth-organization]] — OAuth-flow patroon voor token-sync via Better Auth databaseHooks, herbruikbaar voor ad-account OAuth.

Externe referenties (te raadplegen tijdens spec-fase):
- Meta Marketing API documentation — https://developers.facebook.com/docs/marketing-apis
- LinkedIn Marketing Developer Platform — https://learn.microsoft.com/en-us/linkedin/marketing/
- Google Ads API — https://developers.google.com/google-ads/api/docs/start (geparkeerd voor nu)

Approval-spoor kickoff items (kunnen vandaag al door user gestart worden, geen dev-werk):
- Meta Business Verification aanvragen vanuit Branddock Business Manager
- Branddock-app aanmelden voor Meta Marketing API toegang met use-case beschrijving
- LinkedIn MDP-aanvraag voorbereiden (wacht op Meta-pijler bewijs)

Toekomstige vervolg-ADRs te verwachten (niet nu schrijven):
- AI improvement-engine architecture (suggestion-types, confidence-scoring, HITL-bevestiging)
- Performance-dashboard UI (metrics-aggregation, brand-fidelity ↔ performance correlatie)
- Webhook-receivers per platform (status-sync, conversion-events)
- Autopilot opt-in per workspace (mits trust-bewezen)
