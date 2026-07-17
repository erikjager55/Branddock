# Postiz-verbeterplan — 5 lessen → concrete producten

> **Datum**: 2026-07-17
> **Basis**: `docs/reports/postiz-analyse-2026-07-17.md` (zelfde worktree)
> **Kader**: Branddock zit in de launch-afhechtingsfase (kritiek pad = launch-rest + pilot-adoptie meten). Dit plan mag dat pad niet gijzelen: elk product heeft een fase-label (NU / LAUNCH / POST-LAUNCH) en de zwaarste bouwproducten staan bewust ná launch.
> **Status**: voorstel — nog geen task-files aangemaakt. Promotie naar `tasks/<id>.md` per product via de normale flow (feature-planner/technical-planner waar nodig).

---

## Overzicht: 20 producten uit 5 lessen

| # | Product | Les | Fase | Effort | Wie |
|---|---|---|---|---|---|
| P5.1 | Pilot-succes-definitie (criteria + kill-datum) | 5 Focus | **NU** | 2 uur | Erik + Claude |
| P5.2 | Kanaal-experimenten-register (template + eerste entry) | 5 Focus | **NU** | 2 uur | Claude |
| P5.3 | Launch-wig-besluit (één-zin-positionering, mini-ADR) | 5 Focus | **NU** | halve dag | Erik + Claude |
| P4.1 | Publieke credit-vertaaltabel op pricing-pagina | 4 Pricing | **NU** | 1 dag | Claude |
| P4.2 | "Je betaalt voor wat je maakt"-copy (pricing + onboarding) | 4 Pricing | **NU** | halve dag | Claude |
| P2.1 | Agent-first messaging-architectuur marketing-site | 2 Positionering | **LAUNCH** | 2-3 dagen | Erik + Claude |
| P2.2 | "Brand guardrails voor AI-agents"-pagina | 2 Positionering | LAUNCH | 1-2 dagen | Claude |
| P2.3 | Vergelijkingspagina's (vs Jasper / vs ChatGPT / vs schedulers) | 2 Positionering | LAUNCH | 2-3 dagen | Claude |
| P1.1 | Distributie-cadans-playbook (LinkedIn NL) | 1 Distributie | **LAUNCH** | 1 dag | Erik + Claude |
| P1.2 | Publieke changelog/release-notes op branddock.app | 1 Distributie | LAUNCH | 1-2 dagen | Claude |
| P1.3 | Content-agent "Lex" — build-in-public-posts uit eigen changelog | 1 Distributie | LAUNCH+ | 3-4 dagen | Claude |
| P3.0a | Headless content-service (create + generate als één functie) | 3 Product | **LAUNCH** | 1-2 dagen | Claude |
| P3.0b | Brand Assistant quick-create (chat vult velden + triggert generatie) | 3 Product | **LAUNCH** | 2-3 dagen | Claude |
| P3.1 | ADR publieke Brand-Context + F-VAL API | 3 Product | POST-LAUNCH | 1 dag (ADR) | Erik + Claude |
| P3.2 | Branddock MCP-server + API (volledige chain-dekking) | 3 Product | POST-LAUNCH | 3-4 weken | Claude |
| P3.3 | Webhooks + n8n/Make/Zapier-nodes | 3 Product | POST-LAUNCH | ~1 week | Claude |
| P3.4 | ClawHub-skill + MCP-directory-listings + per-platform-LP's | 3 Product | POST-LAUNCH | 3-4 dagen | Claude |
| P3.5 | Publish-integraties op de bestaande publish-keten | 3 Product | POST-LAUNCH | 1-2 weken | Claude |
| P3.6 | Brandclaw-convergentie (autonome loop als sluitstuk) | 3 Product | POST-LAUNCH | epic | Erik + Claude |
| P3.7 | Browser-extensie "Branddock Everywhere" + rewrite-primitief | 3 Product | POST-LAUNCH | 2-3 weken (MVP) | Claude |

Volgorde-logica: de drie NU-producten van les 5 kosten samen ~1 dag en verscherpen het bestaande kritieke pad (pilot-adoptie meten). Les 4 is klein en raakt de pricing-pagina die toch af moet. Les 2 lift mee op de lopende website-rebuild (G2/G3). Les 1 start pas als er een cadans vol te houden ís. Les 3 is expliciet post-launch.

---

## Les 1 — Distributie: herhaalbare launch-cadans

**Doel**: een distributie-systeem dat cumulatief werkt, zoals Postiz' release-ritme — maar op LinkedIn NL, waar Branddock's koper zit.

### P1.1 — Distributie-cadans-playbook
- **Wat**: `docs/playbooks/distributie-cadans.md` — één kanaal (LinkedIn NL), vast ritme (1-2 posts/week), vaste contentbronnen: (a) Better Brands-pilotverhalen, (b) F-VAL-benchmark (+7/+12 on-brand-gap, "magere briefing"-framing), (c) de 9 live agents, (d) elke user-facing merge. Per format een voorbeeldpost.
- **Resultaat/DoD**: playbook staat in de repo, eerste 4 weken aan posts zijn ingepland, meetcriterium gedefinieerd (bijv. impressies/volgers/inbound-leads na 8 weken) + kill/doorstart-datum.
- **Afhankelijkheid**: P5.2 (het register waarin dit experiment landt) en P5.3 (de wig bepaalt de toon).

### P1.2 — Publieke changelog op branddock.app
- **Wat**: een `/changelog`- of `/nieuw`-pagina op de marketing-site — de externe spiegel van `docs/changelog.md`. Elke user-facing release krijgt een korte NL-entry (wat + waarom het je helpt), die tegelijk de bron is voor de LinkedIn-post.
- **Resultaat/DoD**: pagina live, gevuld met de laatste ~10 user-facing releases, en een vast stapje in de task-finalize/release-flow ("publieke changelog-entry ja/nee").
- **Anti-scope**: geen aparte CMS-laag — platte MDX/markdown in de marketing-site-repo volstaat.

### P1.3 — Content-agent voor build-in-public ("Lex")
- **Wat**: 10e agent of routine die uit de interne changelog + pilot-metrics conceptposts genereert in Eriks stem (bestaat al infra voor: agents-framework + brand voice). Dogfooding als bewijs: "onze eigen distributie draait op Branddock".
- **Resultaat/DoD**: agent levert wekelijks 2-3 conceptposts in de inbox; Erik redigeert en publiceert handmatig (geen auto-posting — dat is Postiz' domein, niet het onze).
- **Fase**: LAUNCH+ — pas starten als P1.1 twee weken handmatig gedraaid heeft, zodat de agent een bewezen format kopieert i.p.v. een onbewezen format automatiseert.

---

## Les 2 — Positionering: agent-first herpositioneren

**Doel**: de externe messaging laten aansluiten op wat het product al is (9 agents live, Brandclaw-visie) en de onbezette wig claimen.

### P2.1 — Agent-first messaging-architectuur marketing-site
- **Wat**: herschreven hero + narratief voor branddock.app: hoofdverhaal "AI-marketingteam dat je merk écht kent" (agents voorop), merk-DNA + F-VAL als het waarom-wij. Volledige commitment zoals Postiz — geen "wij doen ook AI"-blogpost.
- **Resultaat/DoD**: messaging-doc (hero-copy, 3 pijlers, secundaire secties) + doorgevoerd op de site. Lift mee op de lopende G2/G3-beeldtaal-iteratie.
- **Besluit nodig van Erik**: dit is een merkbeslissing — go/no-go op agent-first framing vóór er gebouwd wordt.

### P2.2 — "Brand guardrails voor AI-agents"-pagina
- **Wat**: één pagina die de wig claimt die niemand bezet (niet Postiz, niet Jasper, niet OpenClaw): elke agent kan content genereren, geen enkele kan valideren of het on-brand is. F-VAL + context-stack als bewijs, pilot-cijfers als proof.
- **Resultaat/DoD**: pagina live + opgenomen in de site-navigatie; dient tegelijk als SEO/GEO-anker voor de agentic-zoektermen (dogfood: bouw hem met de eigen GEO-long-form-flow).

### P2.3 — Vergelijkingspagina's
- **Wat**: 2-3 programmatische vergelijkings-LP's (Branddock vs Jasper, vs ChatGPT-direct, vs scheduler-klasse) — Postiz' tactiek van per-segment-LP's vertaald naar NL B2B. Eerlijk gekaderd: wat zij beter doen, waar de merk-laag het verschil maakt.
- **Resultaat/DoD**: pagina's live, elk met de credit-vertaaltabel (P4.1) en één CTA (trial).
- **Fase**: LAUNCH — pas waardevol met werkende trial-flow erachter.

---

## Les 3 — Product: Branddock aanroepbaar maken

**Doel**: de merk-laag beschikbaar maken in andermans workflow (agents, automation) — Postiz' 7×-vector, maar bewust ná launch.

### P3.0 — Voorwerk: headless content-service + Brand Assistant quick-create

**Bevinding (codebase-analyse 2026-07-17)**: de generatie-motor is al headless — `orchestrateContentGeneration(deliverableId, workspaceId)` haalt alle context zelf uit de DB en `persistVariants()` schrijft het resultaat terug; een bewezen non-SSE-drain (`runDeliverableGeneration`) draait al in productie in de agents-confirm-route. Wat ontbreekt is dun: (1) de create+generate-bedrading zit inline in één route i.p.v. als herbruikbare service, (2) elk pad eist een bestaande `campaignId` (geen default-campagne), (3) de Brand Assistant-tool `create_deliverable` maakt een **leeg** item en triggert geen generatie. Herbruikbaarheid van de motor zonder refactor: ~90-95%.

**P3.0a — Headless content-service.**
- **Wat**: `createAndGenerateDeliverable({ workspaceId, campaignId?, contentType, title?, brief, contentTypeInputs?, contextSelection? })` in `src/lib/` — (1) deliverable-create met `settings.brief` (logica bestaat in `write-tools.ts`), (2) drain van `orchestrateContentGeneration` (verplaatsing van `runDeliverableGeneration` uit de confirm-route), (3) `ensureCampaign()`-helper (default CONTENT-campagne per workspace als er geen `campaignId` is — het content-mode-wizard-patroon). Pre-gates blijven: brief vereist objective/keyMessage, merknaam moet bestaan.
- **`contextSelection`** is de API-vorm van de kennis-aan/uit-toggles uit de UI: `{ personaIds?, productIds?, competitorIds?, knowledgeResourceIds? }` — expliciete ID-selectie per laag, met als default dezelfde context-stack als de UI (merk altijd aan). Zo is "blogartikel over product X voor doelgroep Y mét concurrent-info" één aanroep met drie ID's, en blijft de selectie-semantiek identiek tussen UI, chat, agents en API (tweede-deur-principe).
- **Prompts/chains blijven server-side en worden volledig hergebruikt**: de service drained de bestaande orchestrator, dus élke externe aanroep loopt door dezelfde prompt-chains, context-assembly, per-feature-model-selectie (`WorkspaceAiConfig`), F-VAL-scoring en credit-metering als de UI. De API exposeert **uitkomsten** van chains, nooit de chains zelf — de prompt-laag is en blijft de gesloten moat (analyse §4 les 5d). **Besluit Erik 2026-07-17: volledige chain-dekking, geen gefaseerde API.** De gespecialiseerde chains die nu eigen routes zijn (SEO-pipeline long-form, LP/Puck-builder, campaign-strategy-chain, video) horen volledig bij de P3.2-scope — de API levert pas op als álle chains ontsloten zijn. Elke chain krijgt dezelfde service-extractie als P3.0a; bijeffect: elke chain wordt daarmee ook headless aanroepbaar voor agents en de Brand Assistant.
- **Waarom nu**: dit ene stuk voorwerk bedient drie afnemers — de toekomstige API/MCP (P3.2), de Brand Assistant (P3.0b) en de agents (die de helft al gebruiken). Interne functie, geen nieuw aanvalsoppervlak — hoeft dus niet op de security-gate te wachten.
- **Resultaat/DoD**: service-functie + agents-confirm-route en Brand Assistant gebruiken hem beide (één bedrading, geen duplicaat) + smoke die headless een item genereert.

**P3.0b — Brand Assistant quick-create.**
- **Wat**: de chat kan een content-item van niets tot gegenereerd brengen: `create_deliverable`-tool krijgt een `generate`-optie (via P3.0a), en de assistant vraagt conversationeel de 3 verplichte inputs uit (contentType, campagne of "maak er een", objective/keyMessage) i.p.v. dat de user de wizard doorloopt. Bestaande tools `update_deliverable_brief`/`update_deliverable_content_inputs` dekken het "snel velden vullen".
- **Waarom nu**: dit adresseert de arbeidsintensiteit van de huidige flow (wizard: setup + knowledge ≥1 + strategie-score ≥80 + concept-keuzes; lichtste pad nog altijd 3 velden + 2 schermen) — en is daarmee ook een directe kandidaat-onboarding-fix als pilot-venster 1 oranje/rood wordt (C1-drempel).
- **Resultaat/DoD**: in de chat "maak een LinkedIn-post over X" → assistant vraagt door → item staat gegenereerd in de content-library; browser-smoke van de flow.

### P3.1 — ADR: publieke Brand-Context + F-VAL API
- **Wat**: architectuurbeslissing nú vastleggen, bouwen later. Scope-voorstel: twee endpoints — `GET brand-context` (read-only merkcontext van een workspace) en `POST fval/score` (tekst scoren tegen merk). Credits: context/score credit-vrij conform ADR-2026-07-07 ("kennen/beoordelen is gratis"), generatie via API kost gewoon credits. Auth via API-keys per workspace.
- **Kernprincipe (vast te leggen in het ADR)**: de API is een **tweede deur naar dezelfde kamer** — elke write via API/MCP loopt door dezelfde domein-modellen als de UI (`Deliverable`, `Campaign`, `MediaAsset`, `KnowledgeResource`) + dezelfde cache-invalidatie. Gevolg: alles wat extern wordt gemaakt is direct zichtbaar in de Branddock-UI (canvas, content-library, F-VAL-scores, credits-verbruik, pilot-metrics) — geen apart "API-silo". Externe scores op niet-Branddock-content mogen optioneel als score-record landen, maar reads (brand-context) laten geen sporen na.
- **Resultaat/DoD**: `docs/adr/<datum>-public-brand-api.md` met Y-statement, het tweede-deur-principe, scope-grens (níet alle 55 content-types — alleen context + validatie + generatie-v0) en de security-randvoorwaarden (hangt aan afronding `security-residual-hardening`).

### P3.2 — Branddock MCP-server + API (volledige chain-dekking)
- **Wat**: MCP-server + API die het volledige generatie-oppervlak ontsluit — geen v0-subset (besluit Erik 2026-07-17: geen halfwerk/fasering). Tools: `get_brand_context`, `score_against_brand`, `generate_on_brand` (basis tekst+beeld via P3.0a), én per gespecialiseerde chain een eigen tool: `generate_long_form_seo` (8-staps SEO-pipeline), `generate_web_page` (LP/Puck-builder), `generate_campaign_strategy` (strategy-chain), `generate_video`. Elke chain eerst als headless service geëxtraheerd (patroon P3.0a) — dat maakt ze meteen ook voor agents/chat aanroepbaar. Plus de discovery-lees-tools (`list_products`/`list_personas`/`list_competitors`/`search_knowledge`, spiegeling van de bestaande claw-read-registry) en `contextSelection` op elke generatie-tool.
- **OAuth-verduidelijking (drie rollen, niet verwarren)**: (1) social login/SSO voor Branddock-users (Google/Microsoft/Apple — gebouwd, bewust uit bij launch, post-launch "Google eerst"; bestaand plan, los van deze lijn), (2) Branddock als client naar externe platforms (Meta-tokens — draait al), (3) **nieuw hier**: Branddock als OAuth-*provider* zodat Claude/ChatGPT namens de user toegang krijgen. Better Auth heeft hiervoor provider-plugins (o.a. MCP-specifiek) — bij de bouw verifiëren; uitwerking hoort in de P3.1-ADR, niet eerder.
- **Koppel-mechaniek (expliciete scope)**: de MCP-server is een **gehoste remote server** (bijv. `mcp.branddock.app`, streamable-HTTP-transport) met **OAuth-login** bovenop Better Auth — de eindgebruiker koppelt in claude.ai/ChatGPT via Settings → Connectors → URL plakken → inloggen → workspace autoriseren; geen installatie of technische kennis. Dezelfde server bedient Claude én ChatGPT (beide spreken MCP). Aanvullend: (a) kale API-keys blijven bestaan voor developers/automation (n8n/Zapier, P3.3), (b) optionele OpenAPI-spec als Custom-GPT-Actions-fallback — een deelbare "Branddock Assistant"-GPT is tegelijk een distributiekanaal (hangt aan P3.4).
- **Gebruiks-principe (besluit Erik 2026-07-17)**: de connector is bewust generiek — organisaties mogen de merklaag voor élk doel inzetten (offertes, presentaties, mails, sparren), niet alleen content-items. Daarbij geldt: **inhoud opslaan is opt-in, gedrag meten is metadata.** Ephemeral gebruik (context-reads, rewrites) laat géén content-artefacten achter; alleen expliciete generate-tools maken een Deliverable. Wél logt élke tool-aanroep metadata (tool, workspace, timestamp, credits, latency, succes — nooit de inhoud) naar PostHog + een licht `ApiCallLog`-spoor. Privacy-framing als verkoopargument: "we meten wat je gebruikt, nooit wat je schrijft."
- **Connector-usage-analytics als roadmap-motor**: periodieke gedragsanalyse op die metadata (kandidaat: de data-analyst-agent maandelijks) — welke tools, welke intentie-categorieën, waar zit onvervulde vraag → voedt de uitbreidings-roadmap met gemeten vraag i.p.v. giswerk (zelfde mechaniek als Postiz' agentic-pivot: zien waar het verkeer heen wil en er vol op gaan staan).
- **Resultaat/DoD**: gehoste MCP-server + OAuth-connect-flow + API-keys-beheer in Settings + docs-pagina ("koppel Branddock aan Claude/ChatGPT in 3 stappen") + 2 werkende referentie-integraties (claude.ai-connector én ChatGPT-connector); álle bovengenoemde chains extern aanroepbaar; alle writes via het tweede-deur-principe (echte `Deliverable`s, zichtbaar in de UI, credits gemeterd); usage-metadata-logging + eerste gedragsrapport binnen 1 maand na livegang.
- **Effort-consequentie van het volledigheids-besluit**: 3-4 weken i.p.v. 1-2 (4 extra chain-extracties + tools + docs). De harde gate blijft onveranderd: pas ná launch én na afronding van de security-residual-taak (RBAC/Zod/SSRF) — een publieke API opent het aanvalsoppervlak dat daar juist dichtgezet wordt.

### P3.3 — Webhooks + automation-nodes (n8n / Make / Zapier)
- **Wat**: outbound webhooks (F-VAL-score onder drempel, merk-asset gewijzigd, deliverable gepubliceerd) + kant-en-klare nodes zodat marketeers Branddock zonder code in bestaande workflows slepen. Postiz' bewezen route: van bestemming naar infrastructuur.
- **Resultaat/DoD**: webhook-config in Settings + ≥1 gepubliceerde node (n8n eerst — meest gebruikt door NL-automation-bouwers) + docs-recepten ("valideer elke AI-output vóór publicatie").
- **Gate**: ≥1 externe klant gebruikt de P3.2-API actief. Geen gebruikers = niet bouwen (kill-discipline les 5).

### P3.4 — Distributie via agent-ecosystemen
- **Wat**: de MCP-server publiceren waar agent-gebruikers zoeken — skill op ClawHub (Postiz' 7×-vector), MCP-directory-listings, programmatische LP's per platform-combinatie ("Branddock + Claude", "on-brand guardrails voor je agent"). Hier krijgt de P2.2-positionering een installeerbaar product achter zich.
- **Resultaat/DoD**: ClawHub-skill live + ≥2 directory-listings + 3 per-platform-LP's (gebouwd met de eigen GEO-flow, dogfood).
- **Gate**: P3.2 live + P2.2-pagina staat (de LP's linken erheen).

### P3.5 — Publish-integraties: de laag vóór de scheduler
- **Wat**: de warme handover van gevalideerde content naar externe kanalen — géén eigen scheduler (anti-les: dat is Postiz' categorie), wél connectors (Postiz/Buffer/direct) als extra `PublishChannel`. **Integratie-principe**: dit bouwt vóórt op de bestaande publish-keten (studio-publish → `approvalStatus`/`publishedAt`/`publishedVia` + `content.published`-event + `PublishLog`); elke nieuwe connector is een kanaal ín die keten, nooit een derde pad ernaast (gotcha 2026-06-24: twee ketens = onzichtbare publicaties). Ook API-publishes lopen door deze keten en tellen dus mee in de online-lijst én pilot-metric C2.
- **Resultaat/DoD**: ≥1 externe connector live (kandidaat: Postiz — open API, maakt de "laag vóór je scheduler"-positionering tastbaar) + publish via de publieke API mogelijk.
- **Gate**: aantoonbare klantvraag naar een specifiek kanaal; anders blijft de bestaande handmatige/kanaal-publish volstaan.

### P3.6 — Brandclaw-convergentie (sluitstuk)
- **Wat**: de autonome marketing-loop als samenkomst van alles hierboven: triggers (P3.3) → generatie + validatie (P3.2) → kanalen (P3.5), met mens-goedkeuring als default en autonomie als opt-in-trap. Geen nieuw bouwwerk maar het sluitstuk van de API-lijn; dekt de bestaande `agents-brandclaw-convergentie`-task.
- **Resultaat/DoD**: per bestaande task-file; herijken zodra P3.3/P3.5 er staan.
- **Gate**: bewezen gebruik van de hele keten eronder + expliciet go-besluit van Erik (dit is de grootste product-belofte die er is — "autopilot" pas claimen als het waar is, zie wig-besluit).

### P3.7 — Browser-extensie "Branddock Everywhere" + rewrite-primitief
- **Wat**: Chrome/Edge-extensie (Grammarly-patroon) — zijpaneel of selectie-actie in Gmail/Outlook/LinkedIn: "beantwoord/herschrijf in merkstijl voor [persona]" → resultaat direct invoegen. Vereist een nieuw licht generatie-primitief **`rewrite_on_brand`**: tekst + intentie + `contextSelection` erin, on-brand tekst eruit — **bewust géén Deliverable** (ephemeral, geen library-vervuiling), wél credits-metering + optionele F-VAL-score. Bouwstenen bestaan (brand-voice-chains, strict-rewrite); het endpoint is nieuw en gaat óók de MCP-toolset in (mail-beantwoorden via Claude/ChatGPT-connector).
- **Interim zonder bouwwerk**: zodra de P3.2-connector leeft, werkt het scenario al via de browser-oppervlakken van Claude/ChatGPT zelf — de eigen extensie is de gepolijste merk-eigen variant ("Branddock overal waar je typt") en een tastbaar bewijs van de guardrails-wig.
- **Resultaat/DoD (MVP)**: extensie in de Chrome Web Store, login via de P3.2-OAuth-flow, reply-in-merkstijl werkend in Gmail-web, credits gemeterd.
- **Gate**: P3.2 live + bewezen connector-gebruik (kill-discipline les 5); auth hergebruikt de OAuth-provider-laag — geen eigen loginmechanisme.

---

## Les 4 — Pricing: credits vertalen naar klanttaal

**Doel**: de cognitieve frictie van de abstracte credit-metric wegnemen, zoals Postiz' zelf-uitleggende kanalen/posts-metric.

### P4.1 — Publieke credit-vertaaltabel
- **Wat**: pricing-pagina toont per tier wat je er concreet voor máákt: "Starter €39 ≈ 80 social posts óf 5 long-form artikelen óf 200 beelden per maand" naast "400 credits". De credit-per-actie-tabel uit ADR-2026-07-07 (kort 5 · long-form 80 · beeld 2 · video 20) wordt publiek.
- **Resultaat/DoD**: pricing-pagina + in-app upgrade-schermen tonen de vertaling; één bron-of-truth (constants-file) zodat marketing-site en app niet uiteenlopen.

### P4.2 — "Je betaalt voor wat je maakt"-copy
- **Wat**: het ADR-besluit output-only metering (merkcontext + F-VAL credit-vrij) expliciet tot marketing-differentiator maken: "Wij rekenen niets voor het kennen en bewaken van je merk — je betaalt alleen voor wat je maakt." Op pricing-pagina, in onboarding en in de trial-e-mails.
- **Resultaat/DoD**: copy live op de drie plekken; pre-flight-kostenschatting in de UI gecheckt op zichtbaarheid (bestaat al — alleen verifiëren/aanscherpen).
- **Anti-scope**: géén gratis tier, géén prijsverlaging richting $29 — andere COGS-structuur dan Postiz (zie analyse §4, les 4d).

---

## Les 5 — Focus: meet- en kill-discipline

**Doel**: Postiz' "kill channels fast when the data says no" institutionaliseren — criteria en houdbaarheidsdata vóóraf, zodat stoppen uitvoering is en geen discussie.

### P5.1 — Pilot-succes-definitie
- **Wat**: één pagina die vóóraf vastlegt wat "de Better Brands-pilot werkt" betekent: bijv. ≥X gegenereerde+gepubliceerde items/week, ≥Y F-VAL-runs/week, ≥Z actieve weken van de N — plus een peildatum en de consequentie per uitkomst (opschalen / onboarding fixen / framing herzien). Nuance uit de analyse: trage eerste weken zijn bij merk-DNA-opbouw een onboarding-signaal, geen doodvonnis — de criteria moeten die vertraagde payoff verdisconteren.
- **Resultaat/DoD**: `docs/playbooks/pilot-succes-definitie.md`, getallen door Erik bekrachtigd, peildatum in de agenda.
- **Fase**: NU — dit ís het kritieke pad ("pilot-adoptie meten") met Postiz-scherpte.

### P5.2 — Kanaal-experimenten-register
- **Wat**: `docs/marketing/experimenten-log.md` — per kanaal/experiment één rij: hypothese, meetcriterium, budget (geld + uren), startdatum, kill-datum, uitkomst. Eerste entries: de LinkedIn-cadans (P1.1) en de lopende marketing-site/SEO-inspanning.
- **Resultaat/DoD**: template + ≥1 ingevulde entry; afspraak dat geen kanaal start zonder rij.

### P5.3 — Launch-wig-besluit
- **Wat**: één communicatie-wig kiezen voor de launch en vastleggen (mini-ADR of marketing-doc). Kandidaat uit de analyse: "on-brand content die je kunt bewijzen" — of, als P2.1 doorgaat, de agent-first variant "AI-marketingteam dat je merk écht kent". De rest van de featurebreedte (12 assets, canvas, LP-builder, GEO/SEO, research, i18n) wordt in het product ontdekt, niet in de hero verteld — zoals Postiz zijn design-tool ook niet in de hero zet.
- **Resultaat/DoD**: besluit-doc met de gekozen wig + wat er expliciet NIET in de hoofdboodschap zit; P1.1 en P2.1 erven dit besluit.
- **Volgorde**: dit besluit eerst — het stuurt les 1 én les 2.

---

## Expliciet out-of-scope (anti-lessen uit de analyse)

1. **Kern niet open-sourcen** — de moat zit in de gesloten laag (context-stack, F-VAL, prompts); de NL-koper leeft niet op GitHub. Hooguit post-traction een smal zijkanaal (brand-audit-CLI als lead-magnet).
2. **Geen gratis tier** — elke actieve gratis gebruiker kost echte AI-COGS; de 28d reverse-trial is de juiste vorm.
3. **Geen auto-posting/scheduling bouwen** — dat is Postiz' categorie; Branddock's laag zit ervóór (strategie → generatie → validatie).
4. **Geen HN/Product Hunt als hoofdkanaal** — verkeerd publiek voor NL B2B.
5. **Brandclaw niet naar voren trekken in de bouwvolgorde** — herpositionering (les 2) is messaging, geen product-pivot; de post-launch-fasering blijft staan.

---

## Voorgestelde eerste stap

Week 1 (past naast het lopende kritieke pad): P5.3 (wig-besluit, stuurt alles) → P5.1 (pilot-criteria) → P5.2 (register) → P4.1/P4.2 (pricing-vertaling). Samen ~2-3 dagen, waarvan het meeste schrijfwerk dat Claude kan voorbereiden en Erik alleen hoeft te bekrachtigen. Daarna go/no-go op P2.1 (agent-first messaging) als onderdeel van de lopende website-iteratie.
