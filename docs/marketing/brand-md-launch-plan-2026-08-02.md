# brand.md — wereldwijd lanceringsplan

> **Datum**: 2026-08-02 · **Herzien**: 2026-08-03 (**v2 — omarm-strategie**) · **Status**: concept ter besluitvorming (Erik-gates in §9)
> **Hoort bij**: [`tasks/brand-md-open-standaard.md`](../../tasks/brand-md-open-standaard.md) (de bouw) · [`docs/reports/concurrentieanalyse-2026-08-02.md`](../reports/concurrentieanalyse-2026-08-02.md) (de waarom) · [`docs/reports/100k-plan-fasering-2026-07-20.md`](../reports/100k-plan-fasering-2026-07-20.md) Fase 4 (de oorsprong) · [`docs/marketing/launch-wig-besluit.md`](launch-wig-besluit.md) (de hoofdboodschap waar dit onder valt)
>
> **Wat er in v2 veranderde**: onderzoek op 2026-08-03 wees uit dat `brand.md` al bestáát als open standaard (Caio Pizzol, thebrand.md, spec v0.2 draft, MIT — zie §3). v1 ging uit van een eigen standaard-claim; v2 kiest **omarmen + compatibele superset**: Branddock wordt de referentie-implementatie van de bestaande standaard in plaats van de lanceerder van een nieuwe. §3, §4, §5, §7 en §9 zijn herzien; Bijlage A (veldmapping) is nieuw. **Aanvulling 2026-08-03b**: bouw sluit aan op de bestaande design-system-exportlaag (zie noot bij §4) — brand.md wordt een emitter in het bestaande Export Format Registry. **Aanvulling 2026-08-03c (user-besluit)**: funnel scan → claim → trial → abonnement uitgewerkt in §4b.

---

## 1. Doel en definitie van succes

**Missie**: `brand.md` wordt dé manier waarop een merk zijn merk-DNA aan AI-agents geeft — en Branddock is de **referentie-implementatie** van die (bestaande) open standaard en het "levende fundament" waar elk bestand naar terugverwijst.

**Noordster**: het aantal geldige `brand.md`-bestanden in omloop × het aantal tools dat ze leest. Beide kanten tellen — een standaard met alleen producenten is een dud (zie §2).

**90-dagen-doelen** (vanaf publieke launch, te herijken bij golf 1):

| KPI | Doel 90d | Waarom dit getal |
|---|---|---|
| Gegenereerde bestanden (generator + export) | 1.000 | Bewijst producer-vraag; voedt de "State of brand.md"-PR-motor |
| Externe consumers (tools die het formaat lezen, niet van ons) | ≥ 5 | De llms.txt-les: zonder consumers is het een dode letter |
| Upstream: geaccepteerde spec-bijdragen | ≥ 2 PR's | Maakt de omarm-strategie zichtbaar en stuurt de spec onze kant op |
| Agencies die brand.md standaard bij klant-oplevering leveren | ≥ 3 | Multiplier + het bureau-kanaal is Branddocks sterkste niche |
| Google top-3 op "brand.md generator" (EN) | ja | De generator-positie is vrij; wie die bezit, bezit de funnel |
| Signups met bron = generator/docs | meetbaar > 0, trend ↑ | De commerciële rechtvaardiging (funnel naar workspace) |

---

## 2. De empirische lessen waarop dit plan leunt

**llms.txt (Jeremy Howard, sept 2024)** — het waarschuwende voorbeeld én het bewijs dat een eenling een bestandsstandaard kan lanceren. Het spreidde via één kanteelmoment: Mintlify zette het aan voor álle gehoste docs-sites tegelijk (platform-seeding). Resultaat 2026: ~10% adoptie over 300k domeinen — maar analisten noemen het "a low-cost, low-yield bet", want de grote crawlers *consumeren* het bestand nauwelijks. Producenten zonder consumenten = optiek zonder waarde.

**MCP (Anthropic, nov 2024)** — het succesvoorbeeld. Won niet door producenten te werven maar door de consumer-kant dag één te leveren (Claude las het), met SDK's, een registry en snelle adoptie door grote spelers; neutrale governance (Linux Foundation, dec 2025) versnelde de rest. Van 0 naar 400M+ SDK-downloads/maand in ~2 jaar.

**Markdown/CommonMark** — de les voor v2: Gruber schreef de originele (vage) Markdown-spec; CommonMark werd de feitelijke standaard zonder de naam ooit te "bezitten" — puur door de beste spec-uitwerking, tooling en adoptie. **Governance volgt implementatie, niet andersom.**

**Vertaling naar brand.md — vier principes:**
1. **Launch vraag- en aanbodkant tegelijk.** Dag één zijn er consumers: onze eigen MCP-tool, Claude Skill, browser-extensie en n8n-nodes lezen het formaat — plus de belangrijkste van allemaal: **plak-het-in-elke-chat**. Klein, leesbaar Markdown werkt vandaag al in élke LLM zonder integratie: **direct nut zonder netwerkeffect**.
2. **Zoek het Mintlify-moment.** Eén platform dat brand.md automatisch genereert of leest voor al zijn gebruikers is meer waard dan duizend individuele adopters (WordPress-plugin, website-builders, agency-suites — §5 golf 2).
3. **Klein en af.** De kernspec is al klein (dat deed Pizzol goed); onze full-profile-documentatie moet net zo compact blijven.
4. **Word het zwaartepunt, niet de eigenaar.** De naam is niet te bezitten (beschrijvend, generiek); de referentiepunt-positie wel — via de beste generator, validator, documentatie en de meeste bestanden in omloop.

---

## 3. Strategie: omarmen + superset ("embrace and extend")

### De feiten (per 2026-08-03)

- `brand.md` bestaat als open standaard: **Caio Pizzol** (Head of DX bij SuperDoc), site **thebrand.md**, GitHub `caiopizzol/brand.md`, spec **v0.2.0 (draft)**, MIT-licentie. Pitch: *"Like AGENTS.md for coding agents, brand.md gives AI tools your brand context."* Structuur: YAML-frontmatter + secties **Strategy / Voice / Visual**; v0.2 voegt merk-hiërarchie toe (master brand → productmerken).
- Tractie is minimaal: ~19 stars, 4 forks, 15 commits, solo-maintainer, tooling beperkt tot een Claude-plugin met interview-generator.
- Er borrelt een veldje varianten: brandbook.md, brandkit.md (360vier), brand-guidelines.md (Branding5); Sameness publiceert gidsen. Het frame is gevalideerd; de naam-race is feitelijk beslecht ten gunste van `brand.md`.

### Het besluit (aanbeveling)

**Adopteer de bestaande spec als kern en publiceer een compatibele superset: het "brand.md full profile".** Geen eigen standaard, geen concurrerende spec onder dezelfde naam (fragmentatie is dodelijk voor een formaat en levert publiek de kaper-rol op). In plaats daarvan:

1. **Compatibiliteit als wet**: elk bestand dat Branddock genereert valideert tegen de upstream v0.2-kern. Onze extra's zijn additieve secties en genamespacede frontmatter — parsers die ze niet kennen, slaan ze over. Volledige veldmapping: **Bijlage A**.
2. **Upstream-bijdragen**: de algemeen-nuttige uitbreidingen (Audience/personas, `provenance:`, gestructureerde guardrails) dienen we als PR's in. Geaccepteerd = de spec groeit onze kant op; geweigerd = ons full profile bestaat toch al en de markt kiest op tooling.
3. **Outreach naar de maintainer** (golf 0): constructief — "we bouwden een generator + validator + levende implementatie en willen bijdragen". Co-stewardship is de beste uitkomst; een vriendelijke co-existentie is prima; een fork is de terugvaloptie, maar dan **vanuit kracht** (mét adoptie), nooit als startpunt.
4. **Wat "eigen" blijft zonder de spec te bezitten**: de velden `validation:` en `provenance:` kunnen alleen betekenisvol gevuld worden door een *levende, gevalideerde* implementatie — iedereen kan het bestand namaken, alleen Branddock kan het bijhouden en bewijzen. Plus: onze generator is één URL-veld (die van Pizzol vereist een Claude-plugin en een interview), en ons ecosysteem is dag één de enige dat de full-profile-velden ook léést.
5. **Moat-grens ongewijzigd**: het bestand bevat merk-DNA-output; de prompt-/chain-laag en de F-VAL-methodologie blijven gesloten (ADR public-brand-api). Scores mógen in het bestand (als neutraal `validation:`-veld dat elke tool zou kunnen stempelen); hoe ze tot stand komen niet.
6. **Publiek vs privaat profiel**: het publieke brand.md bevat nooit concurrentiegevoelige interne context (concurrenten, OKR's, trends). Die zitten in het **extended/private profiel** dat de MCP-server achter auth aan eigen agents serveert.

### Dag-1-claims (afgeslankt t.o.v. v1)

Geen standaard-domeinen meer nodig. Nog wél schaars en zinvol: de npm-naam voor de validator, de generator-URL onder branddock.app (bv. `/brandmd` of `/generate`), en snelheid — de "URL → brand.md"-generator-positie is op dit moment volledig vrij.

---

## 4. Launch-assets (bouwlijst)

> **Bouwfundament (inventarisatie 2026-08-03)**: de exportlaag bestaat al — een Export Format Registry met 7 design-system-formaten, werkende `designmd`- (Google Stitch) en `brand-brief`-emitters (die laatste is feitelijk een proto-brand.md: "AGENTS.md-style, om als BRAND.md in je repo-root te droppen", incl. assets/personas/concurrenten), een canoniek `DesignSystemModel` + resolver + linter, en de endpoint-conventie `/api/export/design-system/[format]`. brand.md wordt dus een **nieuwe emitter in een bewezen patroon**, geen greenfield; `validation:` is dag één vulbaar uit `BrandAsset.status` + coverage. Details: task-file §Bestanden.
>
> **Productbeslissing daarbij (Erik, bij bouw)**: brand.md wordt het primaire markdown-exportformaat (publiek profiel, standaard-conform, zónder concurrenten); `brand-brief` blijft de "extended agent brief" voor privégebruik (bevat wél concurrenten — mag nooit de publieke variant worden) en verwijst in zijn header naar brand.md.

| # | Asset | Golf | Notitie |
|---|---|---|---|
| 1 | **Full-profile-documentatie** (≤2 pag.): kern v0.2 + onze extensies, conformance-tekst, 3-5 voorbeeldbestanden van herkenbare merken | 0 | Geen eigen spec — documentatie van een compatibel profiel (Bijlage A) |
| 2 | **Validator** (CLI + web): valideert upstream v0.2-kern én full profile; npm-pakket + "brand.md ready"-badge | 0 | De nuttigste tool in het ecosysteem = de zwaartepunt-maker |
| 3 | **Gratis generator**: website-URL → brand.md-superset via bestaande scan-pipeline (rate-limited, e-mail-gate na N runs) | 0 | Dé vrije positie; hun generator vereist plugin + interview. Zelfde `brandmd`-emitter als de export — één codebron voor beide smaken |
| 4 | Workspace-export (UI-knop + REST + MCP) — levende versie met `validation:`/`provenance:` gevuld | 0 | Het commerciële hart: bestand → levend fundament. Implementatie: `brandmd`-emitter in het bestaande Export Format Registry (naast DESIGN.md/brand-brief), zelfde endpoint-conventie |
| 4b | **Claim-flow**: elke generator-run bewaart een claimbaar draft-profiel (TTL ~90d); accountactivatie materialiseert het naar een voor-ingevulde workspace | 0-1 | De brug van bestand naar product — funnel in §4b |
| 5 | Landingspagina EN (+ NL): uitleg, generator-CTA, "works with"-rij, link naar upstream spec | 0 | Ruimhartig linken naar thebrand.md — omarmen moet zichtbaar zijn |
| 6 | **Upstream-PR-pakket**: Audience-sectie, `provenance:`, gestructureerde guardrails | 0-1 | Volgorde van algemene nuttigheid; vergezeld van werkende tooling |
| 7 | Eigen consumers dag 1: MCP-tool serveert; Claude Skill, browser-extensie en n8n-nodes lezen full profile; "paste in any chat"-instructie | 0 | De anti-llms.txt-maatregel |
| 8 | Demo-video 60-90 sec: zelfde prompt mét vs. zónder brand.md | 1 | Sterkste bewijs in 1 asset |
| 9 | PR-kit: one-pager, founder-story, llms.txt/MCP/AGENTS.md-context | 1 | |
| 10 | Directory "who has a brand.md" + badge-programma | 2 | Pas bij >50 bestanden |
| 11 | WordPress-plugin "serve your brand.md" | 2 | Kandidaat-Mintlify-moment; Eriks eigen WP-omgevingen als showcase |
| 12 | "State of brand.md"-rapport (generator-data) | 3 | Terugkerende PR-motor |

---

## 4b. De funnel: gratis bestand → levend merk → abonnement (user-besluit 2026-08-03)

> Richting bepaald door Erik: de scan-informatie landt in Branddock en de funnel loopt van gratis download naar abonnement. Vrijwel alle mechaniek bestaat al live — het nieuwe stuk is de claim-brug.

| Stap | Gebruiker | Product | Bestaande mechaniek |
|---|---|---|---|
| 1. Scan | Plakt URL, ziet resultaat | Scan-output bewaard als **claimbaar draft-profiel** (géén workspace; TTL ~90 dagen) | Scan-pipeline; 0-credit per pricing-ADR |
| 2. Gratis download | Downloadt brand.md zonder account | Bestand bevat `provenance:` + claim-URL + per veld `unvalidated` | `brandmd`-emitter; rate-limit + e-mail-gate op herhaalruns |
| 3. Wijzigen/verversen → activeren | Wil gaten vullen of verversen → "Claim dit merk" | Account + gratis trial; draft materialiseert naar **voor-ingevulde workspace** — onboarding in minuten i.p.v. lege intake | Reverse trial 28d no-card + FREE 300 credits (live) |
| 4. Meer doen | Ontdekt MCP-koppeling, agents, trend-radar, F-VAL, content | Trial-credits dekken het proeven; brand.md krijgt gevulde `validation:` + canonical-URL | Credit-model Fase 0-6 (live) |
| 5. Abonnement | Loopt tegen dag-28 read-only-lock of credit-plafond aan | Starter €39 / Growth €89 / Agency €299 + top-up | Fase 4-lock + tiers (live) |

**Ontwerpregels:**
- **Downloaden blijft écht gratis en accountloos** — de viraliteit sterft als stap 2 een muur wordt; de e-mail-gate zit op herhaalruns, niet op de eerste.
- **Géén workspace per anonieme run** — een HN-piek zou duizenden spook-workspaces creëren en het multi-tenant-model vereist een owner. Draft-profiel met TTL; materialisatie pas bij activatie.
- **De wijzig-trigger zit ín het bestand**: "X van Y velden unvalidated — claim & complete on Branddock" + de generatiedatum als ververs-reden. Het bestand verkoopt zijn eigen upgrade.
- **Merk-eigendom**: iedereen kan elke URL scannen, ook andermans merk. Claimen ≠ eigendomsbewijs — acceptabel voor de trial (het betreft publieke website-informatie), mits drafts nooit publiek vindbaar zijn en de claim-link alleen bestaat in het gegenereerde bestand en de e-mail van de aanvrager. Domein-verificatie pas bij directory/badge (golf 2).

---

## 5. Golfplan

### Golf 0 — Seed + aansluiting (week 1-2, vóór elke publiciteit)
- Erik-gates afhechten (§9): akkoord op de omarm-strategie en de outreach-toon.
- **Outreach naar Pizzol**: werkende generator + validator + PR's als openingszet, niet een leeg "laten we samenwerken". Uitkomsten a) co-stewardship, b) vriendelijke co-existentie, c) geen reactie — alle drie werkbaar.
- Bouw conform task-file; alles EN-first.
- **15-25 bestanden seeden** via Better Brands-klanten en het NL-netwerk; eigen ecosysteem leest het full profile vóór de launch.
- Feedbackronde met 3-5 bevriende marketeers/developers.

### Golf 1 — Publieke launch (week 3-4, één gecoördineerde dag + naweek)
- **Show HN, geherformuleerd**: *"Show HN: Turn any website into a brand.md — free generator for the open brand-identity standard"*. We lanceren geen standaard (geen fragmentatie-kritiek mogelijk) maar dé tooling voor een bestaande — de sympathieke rol. Founder de hele dag in de comments.
- **Product Hunt** dezelfde week; generator als interactieve hook.
- **llms.txt/AGENTS.md-discourse aanhaken**: *llms.txt = je site voor AI, AGENTS.md = je repo voor AI, brand.md = je merk voor AI.* Drie-eenheid die journalisten het frame gratis geeft.
- LinkedIn (EN + NL), X-thread met demo-video, r/marketing, r/artificial, r/SaaS, dev.to/Medium-longread.
- Nieuwsbrief-outreach: Ben's Bites, TLDR AI/Marketing, The Rundown, Marketing AI Institute, GEO/search-nieuwsbrieven.
- NL-pers parallel (Emerce, Frankwatching, MarketingTribune).

### Golf 2 — Consumer-adoptie (maand 2-3) — het echte werk
- **Outreach naar 20-30 tools** die brand.md zouden moeten *lezen*: agent-builders, contenttools, website-builders, niet-Frontify DAM's. Pitch: open formaat (niet van ons — dat is nu een voordeel!), gratis kwaliteitswinst, wij linken terug vanuit de directory.
- WordPress-plugin live + MCP-registry-listings.
- **Agency-programma**: bureaus genereren een brand.md bij elke klant-oplevering; koppelt aan witlabel-klantrapport (€100k-plan Fase 5) en de Agency-tier.
- Directory + badge live zodra >50 bestanden.
- Wekelijkse GEO/SEO-cadans met de eigen long-form-pipeline op "brand.md", "brand context for AI agents" — dogfooding als bewijs.

### Golf 3 — Verankeren (maand 3-6)
- Upstream-relatie uitbouwen: geaccepteerde PR's zichtbaar maken; bij co-stewardship een publieke roadmap voor de spec.
- **"State of brand.md"-rapport** uit generator-data — terugkerend PR-moment (kwartaal).
- **Governance**: bij ≥3 serieuze externe consumers een neutrale werkgroep-stap voorstellen (samen met Pizzol — de MCP-les). **Fork-vanuit-kracht** blijft de stille terugvaloptie als stewardship stilvalt én de spec ons blokkeert; nooit eerder.
- Webinars/talks; integratiegesprekken met grotere platforms zodra er tractie-bewijs is.

**Doorlopend**: elk gegenereerd bestand blijft de beste advertentie — `provenance:` met canonical-URL leidt verouderde bestanden terug naar de bron.

---

## 6. Kanalen en geografie

Open standaarden lanceren niet per land maar via wereldwijde internet-kanalen; **EN-first**, NL parallel als thuismarkt-bewijs en pershaakje. Lokalisatie volgt de bestaande 7 content-talen pas bij bewezen tractie. HN/PH-timing op VS-uren.

| Kanaal | Rol |
|---|---|
| Show HN + Product Hunt | Piek-awareness bij developers/founders, backlink-basis |
| llms.txt/AGENTS.md-discourse | Frame-liften: het publiek dat dit meteen snapt |
| LinkedIn | Marketeers + agencies (de kopers), founder-verhaal |
| Nieuwsbrieven AI/marketing | De multiplicator na de piek |
| SEO/GEO op "brand.md generator" e.o. | Structurele vindbaarheid; de generator-positie is vrij |
| Agency-netwerk (NL start) | Wereldwijd schaalbaar zaai-kanaal via klant-opleveringen |
| GitHub/MCP-registry + upstream-PR's | Developer-vindbaarheid + geloofwaardigheid |

---

## 7. Verdediging

- **Maintainer weigert of verdwijnt**: PR's afgewezen → full profile bestaat toch, markt kiest op tooling; stewardship valt stil → fork vanuit kracht (MIT), mét de bestanden-in-omloop achter ons. Vooraf niets forceren.
- **Iemand anders bouwt de generator eerst**: de positie is vandaag vrij maar zichtbaar (het veldje varianten groeit). Snelheid is de verdediging — daarom staat deze taak vooraan.
- **Frontify reageert** (enterprise "machine-readable brand"-push of eigen formaat): onze verdediging is gratis + open + niet-van-ons + voor iedereen; een enterprise-speler kan moeilijk een open standaard dragen die zijn ACV ondergraaft. Dat het formaat niet van Branddock is, maakt dit verhaal in v2 stérker.
- **Spec verandert onder ons**: pin de kern-versie per generator-release; validator toont tegen welke versie is gevalideerd.
- **"Lege standaard"-kritiek**: claim nooit adoptie die er niet is; publiceer de consumer-lijst eerlijk; direct nut zonder netwerkeffect (paste-in-chat) als antwoord. Spoort met "autopilot pas claimen als het waar is".
- **Kwaliteitskritiek**: `validation: unvalidated`-markering + zichtbaar upgrade-pad (workspace = gevalideerd, levend).
- **Kill-/pivot-criterium**: als na 90 dagen publieke launch de generator loopt maar er **0 externe consumers** zijn ondanks golf-2-outreach, schaal terug naar lead-magnet-functie en bevries de standaard-ambitie tot een Mintlify-moment zich wél aandient.

---

## 8. Meetfundament

Aansluiten op de KPI-boom uit €100k-plan Fase 1. Events dag 1:
`brandmd_generator_run` (+ bron-URL-domein), `brandmd_download`, `brandmd_export` (per workspace), `brandmd_mcp_fetch` (server-side — direct meetbare *consumptie*), `brandmd_referral_visit` (via `provenance:`-canonical), `signup_source=brandmd`, `brandmd_validator_run` (npm/web), plus de funnel-events `brandmd_claim_started` en `brandmd_claim_completed` (draft → workspace) — de conversie per funnel-stap uit §4b is daarmee volledig meetbaar. Wekelijkse review; Remi neemt het blok mee in het weekrapport zodra de events lopen.

---

## 9. Besluiten van Erik (gates, in volgorde)

| # | Besluit | Wanneer | Aanbeveling |
|---|---|---|---|
| 1 | **Akkoord omarm-strategie** (v2): superset i.p.v. eigen standaard-claim | vóór bouw-afronding | Ja — zie §3; de v1-gates over naming/domein/licentie vervallen |
| 2 | Outreach-toon + afzender richting maintainer | golf 0 | Erik persoonlijk, met werkende tooling als openingszet |
| 3 | EN-kernzin akkoord | golf 0 | *"Give every AI agent your brand memory."* (blijft; is implementatie-, niet spec-claim) |
| 4 | Launch-datum + publiek gezicht | eind golf 0 | Erik als founder — HN en PH vereisen een mens |
| 5 | Budget | eind golf 0 | Vrijwel nihil: geen domeinen meer nodig; npm gratis; generator-AI-kosten per kostenparagraaf/chat 2026-08-03 (~€100-500 eerste 90d, gecapt via rate-limits) |
| 6 | Governance-/werkgroep-stap (samen met maintainer) | pas bij ≥3 externe consumers | Niet eerder beslissen |

---

## 10. Relatie met bestaande plannen

Dit plan vervángt niets: het is de uitvoeringsverdieping van €100k-plan Fase 4 (nu als omarm-strategie), uitgevoerd vóór Fase 3/5 in de wetenschap dat die erop inhaken (agent-LP's krijgen de generator als CTA; het witlabel-rapport wordt het agency-programma-anker). Bouwscope: [`tasks/brand-md-open-standaard.md`](../../tasks/brand-md-open-standaard.md). De ontdekking van de bestaande standaard hoort ook thuis in de Competitors-/watchlist-hygiëne (thebrand.md + het varianten-veldje monitoren).

---

## Bijlage A — Veldmapping: Branddock merk-DNA → brand.md full profile

**Compatibiliteitsregel**: de kern (frontmatter-basisvelden + Strategy/Voice/Visual) volgt upstream v0.2 letterlijk; alle Branddock-uitbreidingen zijn additieve secties of nieuwe frontmatter-blokken die bestaande parsers negeren. Elk gegenereerd bestand valideert tegen de upstream-kern.

**Implementatienoot**: de mapping wordt gerealiseerd als `brandmd`-emitter op het bestaande canonieke `DesignSystemModel` (patroon van de `designmd`-emitter: deterministisch, snapshot-getest), met een publiek/privaat-parameter. `validation:` komt uit `BrandAsset.status` + coverage; `provenance:`/canonical-URL uit de workspace. Canonical/resolver worden alleen uitgebreid waar velden ontbreken (persona-JTBD, channel tones).

### Past in de bestaande kern (v0.2)

| Branddock merk-DNA | brand.md-kern |
|---|---|
| Purpose, Golden Circle, Mission & Vision, Brand Essence, Core Values | `## Strategy` (overview, positioning) |
| Brand Archetype, Brand Personality | `## Strategy` (personality) |
| Brand Promise | `## Strategy` (promise) |
| Anti-patronen (deels), verboden claims (deels) | `## Strategy` (guardrails) — zie ook uitbreiding hieronder |
| Voice-DNA, tonal rules, `wordsWeUse`, taglines, brand story (verkort) | `## Voice` |
| Brandstyle: kleuren, typografie, fotografie-/design-stijl | `## Visual` |
| Brand → productmerken-structuur | v0.2-hiërarchie (architecture types, inheritance) |

### Branddock-uitbreidingen (het "full profile")

| Uitbreiding | Vorm | Waarom | Upstream-kandidaat? |
|---|---|---|---|
| **Personas** | `## Audience` — per persona: profiel, jobs-to-be-done, taal die wel/niet werkt | Grootste omissie upstream; elke copy-schrijvende agent heeft dit nodig | **Ja — PR #1** |
| **Provenance** | frontmatter `provenance:` — generated_by, generated_at, bron-URL, **canonical-URL naar levende versie** | Veroudering zichtbaar + de lead-loop | **Ja — PR #2** |
| **Gestructureerde guardrails** | `## Guardrails` als machine-checkbare do/don't-lijst (anti-patronen, verboden claims, BrandRules) | Maakt de validator écht toetsend i.p.v. alleen structureel | **Ja — PR #3** |
| **Validation** | frontmatter `validation:` — per sectie status (`validated`/`unvalidated` + datum) en optionele score | Eerlijkheid over scan-kwaliteit + kwaliteitsstempel; **neutraal geformuleerd** (elke tool mag stempelen; alleen een levende implementatie kán het) | Later — eerst zelf bewijzen |
| **Products & Services** | `## Products & Services` — catalogus: wat, voor wie, kernclaims | v0.2-hiërarchie dekt productmérken, niet de catalogus | Later |
| **Channel tones** | `## Channel Tones` — per kanaal de toon-afwijking | Upstream heeft alleen social bios | Later |
| **Locales** | frontmatter `locales:` (meervoud) naast upstream `language` | Multi-markt-as (7 content-talen) | Later |

### NIET in het publieke bestand

Concurrenten, OKR's/business-strategy, trends, F-VAL-methodologie/prompts. Interne context zit in het **extended/private profiel** dat de MCP-server achter auth serveert; de prompt-/chain-laag wordt nooit geëxporteerd (ADR public-brand-api).

### Skelet

```markdown
---
name: Acme                    # kern
tagline: ...                  # kern
version: 0.2                  # kern (upstream-versie waartegen gevalideerd)
language: en                  # kern
locales: [en, nl]             # + full profile
validation:                   # + full profile
  voice: {status: validated, score: 87, date: 2026-08-02}
  visual: {status: unvalidated}
provenance:                   # + full profile
  generated_by: Branddock
  generated_at: 2026-08-02
  canonical: https://branddock.app/b/acme/brand.md
---
## Strategy        ← kern
## Voice           ← kern
## Visual          ← kern
## Audience        ← + full profile (personas)
## Products & Services   ← + full profile
## Channel Tones   ← + full profile
## Guardrails      ← kern-begrip, + machine-checkbaar gestructureerd
```

---

## Bronnen (extern)

- **De bestaande standaard**: [thebrand.md](https://thebrand.md/) · [GitHub caiopizzol/brand.md](https://github.com/caiopizzol/brand.md) (spec v0.2 draft, MIT, ~19 stars per 2026-08-03) · varianten-veld: [brandbook.md landscape](https://brandbook.md/landscape/), [brandkit.md](https://github.com/360vier/brandkit.md), [Branding5 brand-guidelines.md](https://www.branding5.com/brand-guidelines-md-the-file-every-ai-tool-needs), [Sameness brand.md-gids](https://www.sameness.co/resource/brand-md)
- [Presenc — State of llms.txt 2026](https://presenc.ai/research/state-of-llms-txt-2026) · [Codersera — llms.txt honest guide 2026](https://codersera.com/blog/llms-txt-complete-guide-2026/) · [Search Engine Land — llms.txt proposal](https://searchengineland.com/llms-txt-proposed-standard-453676) · [Kai Spriestersbach — "llms.txt is a dud"](https://medium.com/@kaispriestersbach/the-llms-txt-is-dead-more-precisely-a-dud-ab7bee4f469c) (het consumer-gat)
- [MCP blog — One Year of MCP](https://blog.modelcontextprotocol.io/posts/2025-11-25-first-mcp-anniversary/) · [Zuplo — One Year of MCP](https://zuplo.com/blog/one-year-of-mcp) · [Anthropic — Introducing MCP](https://www.anthropic.com/news/model-context-protocol) · [Pento — A Year of MCP](https://www.pento.ai/blog/a-year-of-mcp-2025-review) (consumer-first + governance-les)
