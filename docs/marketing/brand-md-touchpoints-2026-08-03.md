# brand.md — touchpoint-strategie voor de funnel

> **Datum**: 2026-08-03 · **Status**: concept, hoort bij [`brand-md-launch-plan-2026-08-02.md`](brand-md-launch-plan-2026-08-02.md) §4b (funnel) en [`tasks/brand-md-open-standaard.md`](../../tasks/brand-md-open-standaard.md) (bouw)
> **Scope**: elk contactmoment van eerste ontdekking tot abonnement en daarna, met per touchpoint: taak, kanaal, boodschap, trigger en meting.

---

## Principes (gelden voor elk touchpoint)

1. **Eén taak per touchpoint.** Elk contactmoment beweegt de gebruiker precies één funnel-stap; nooit drie CTA's tegelijk.
2. **Eerlijkheid ís het verkoopargument.** De `unvalidated`-telling, de generatiedatum en de echte TTL zijn de conversiedrivers — geen kunstmatige schaarste, geen dark patterns. Dit spoort met het marketing-principe "autopilot pas claimen als het waar is".
3. **Waarde vóór vraag.** Elke e-mail en elk scherm levert eerst iets bruikbaars (hoe gebruik je het bestand) voordat er iets gevraagd wordt (claim, upgrade).
4. **Toon volgt de launch-wig**: het AI-marketingteam dat je merk écht kent — en dat kan bewijzen. Het bestand is de gratis kennismaking met dat "kennen"; F-VAL is het "bewijzen".
5. **Elk touchpoint is gemeten** (events uit launch-plan §8); een touchpoint zonder meetbaar doel vervalt.

---

## Fase 0 — Ontdekking (vóór de scan)

| # | Touchpoint | Kanaal | Taak + boodschap | Trigger/meting |
|---|---|---|---|---|
| 0.1 | Generator-landingspagina | Web | Eén URL-veld boven de vouw; "Give every AI agent your brand memory — free"; works-with-rij (Claude/ChatGPT/Cursor/n8n); voorbeeld-bestand zichtbaar | Bezoek → `brandmd_generator_run`-conversie is dé KPI van deze pagina |
| 0.2 | Launch-kanalen (Show HN, PH, LinkedIn, nieuwsbrieven, NL-pers) | Extern | Allemaal één bestemming: de generator. Geen versnipperde CTA's | UTM per kanaal → `brandmd_referral_visit` |
| 0.3 | **Bestanden van anderen in omloop** | Het bestand zelf | Het virale touchpoint: `provenance:`-regel + "living version maintained on Branddock". Wie andermans brand.md tegenkomt (in een repo, een briefing, een chat) vindt de weg terug | Canonical-URL-bezoeken |
| 0.4 | Validator + docs + badge | GitHub/npm/web | Developer-ingang; elke validator-run eindigt met "generate one for any site →" | `brandmd_validator_run` |
| 0.5 | SEO/GEO-content ("brand.md", "brand context for AI") | Web | Structurele vindbaarheid via de eigen long-form-pipeline (dogfooding) | Organisch verkeer → generator |

## Fase 1 — Het scan-moment (de eerste 60 seconden)

| # | Touchpoint | Kanaal | Taak + boodschap | Trigger/meting |
|---|---|---|---|---|
| 1.1 | Scan-progress | Web (UI) | De wachttijd (±10-30 s) is een vertelmoment: toon live wát er gevonden wordt ("voice-patronen gevonden… kleuren geëxtraheerd… archetype herkend") — dit bouwt de waardeperceptie op vóór het resultaat er is | Afhaakpercentage tijdens scan |
| 1.2 | Resultaatpagina | Web | Preview + **validated/unvalidated-telling prominent** ("14 velden gevuld, 5 nog open"). Primaire CTA: **Download (gratis, geen account)**. Secundair: "Claim & complete". Nooit omgedraaid — de gratis belofte is heilig | Download-rate; claim-vs-download-ratio |
| 1.3 | Het bestand zelf | Bestand | Drie regels die werken als het bestand verder reist: claim-URL, "X of Y fields unvalidated — complete on Branddock", generatiedatum. Verder géén marketing in het bestand — het moet als serieus artefact voelen, niet als flyer | `brandmd_download`; latere canonical-visits |
| 1.4 | E-mail-gate (vanaf run 2+) | Web | Ruil, geen muur: "bestand + updates in je inbox". Eerste run blijft altijd vrij | Opt-in-rate |

## Fase 2 — Post-download nurture (dag 0-90, alleen mét opt-in e-mail)

> Maximaal 4 mails; elke mail is los waardevol; elke mail heeft één CTA; afmelden per mail. Verzending via de bestaande Emailit-infra.

| # | Moment | Boodschap | CTA |
|---|---|---|---|
| 2.1 | Direct | Bestand als bijlage/link + 3 concrete gebruiksrecepten (plak in Claude-project / ChatGPT custom instructions / koppel via MCP) | Gebruik het bestand (geen verkoop) |
| 2.2 | Dag 3-7 | "Wat betekenen die unvalidated-velden?" — uitleg wat de scan wél/niet kon zien, met 1 voorbeeld van het verschil dat een compleet profiel maakt | Claim & complete (eerste zachte claim-vraag) |
| 2.3 | Dag 21-30 | "Je brand.md is een maand oud" — merken veranderen; wat een levende versie doet (auto-vers, gevalideerd, via MCP overal beschikbaar) | Claim of her-scan |
| 2.4 | Dag ~80 | TTL-bericht: "je draft verloopt over 10 dagen" — echte beleidsmededeling, zo gebracht (wij bewaren scans niet eeuwig), geen kunstgreep | Laatste claim-kans |

## Fase 3 — Claim & activatie (minuut 0 → dag 1)

| # | Touchpoint | Kanaal | Taak + boodschap | Trigger/meting |
|---|---|---|---|---|
| 3.1 | Claim-pagina (token) | Web | Toon concreet wat er klaarstaat: "We hebben 7 van je 11 brand assets, je kleuren, fonts en voice al voorbereid" → registratie voelt als oogsten, niet als invullen | `brandmd_claim_started` |
| 3.2 | First-run workspace | In-app | Géén generieke tour maar de **vul-de-gaten-checklist**: de unvalidated-velden als geordende to-do, hoogste merk-impact eerst | `brandmd_claim_completed` + checklist-progressie |
| 3.3 | Het aha-moment (≤10 min) | In-app | Direct na claim één zichtbaar resultaat: genereer een korte post over hun eigen product mét fidelity-score naast een vanilla-versie — het bewijs uit de launch-wig, ervaren i.p.v. verteld | Tijd-tot-eerste-generatie |
| 3.4 | Trial-start-mail | E-mail | Wat kan er in 28 dagen; wat kost níets (merk-DNA, F-VAL, chat, monitoring — de anti-Jasper-belofte expliciet) | Open/klik |

## Fase 4 — Trial-verdieping (dag 1-28)

| # | Touchpoint | Kanaal | Taak + boodschap | Bestaande mechaniek |
|---|---|---|---|---|
| 4.1 | Agents-inbox eerste voorstel | In-app | Bo/Milo leveren binnen de eerste week een concreet contentvoorstel in de inbox — "meer doen" getoond, niet uitgelegd | Agents + scheduling (live) |
| 4.2 | MCP-koppel-kaart | In-app | "Verbind Claude/ChatGPT met je levende merk" — de brug van bestand naar infrastructuur; hun oorspronkelijke brand.md-gebruik wordt nu automatisch vers | OAuth-connector (live) |
| 4.3 | Remi-weekrapport | E-mail/in-app | Het retentie-anker: wekelijks merkrapport, 0 credits | Remi (live) |
| 4.4 | Trial-ritme-mails | E-mail | Dag 7 (nog niet ontdekt), dag 25 (T-3) en dag 28 (T-0) — **hergebruik de bestaande Fase-4-meldingen** (T-3/T-0 read-only-lock, #380) | Trial-notificaties (live) |

## Fase 5 — Conversie en daarna

| # | Touchpoint | Kanaal | Taak + boodschap | Trigger/meting |
|---|---|---|---|---|
| 5.1 | Read-only-lock-scherm | In-app | Het eerlijke conversiemoment: wat blijft leesbaar (alles), wat weer kan per tier; bureaus met meerdere drafts/claims zien hier de Agency-route (gepoolde credits, 15 merken) | Lock → upgrade-conversie |
| 5.2 | Post-abonnement: "deel je brand.md" | In-app/e-mail | De klant wordt distributiekanaal: canonical-URL live, badge, straks directory-vermelding (golf 2). Elk gedeeld bestand is een nieuw fase-0-touchpoint (0.3) — de loop sluit | Gedeelde canonical-visits |
| 5.3 | Agency-detectie | In-app/e-mail | ≥2 scans/claims vanaf één account of e-maildomein → gericht Agency-aanbod + witlabel-weekrapport (€100k-plan Fase 5) | Multi-scan-patroon per account |

---

## Kanaal-matrix (samenvatting)

| Kanaal | Fase 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| Het bestand zelf | 0.3 | 1.3 | — | (claim-URL) | — | 5.2 |
| Web (generator/claim) | 0.1, 0.4, 0.5 | 1.1-1.4 | — | 3.1 | — | — |
| E-mail | — | — | 2.1-2.4 | 3.4 | 4.3, 4.4 | 5.3 |
| In-app | — | — | — | 3.2, 3.3 | 4.1-4.3 | 5.1-5.3 |
| Extern (HN/PH/pers/SEO) | 0.2, 0.5 | — | — | — | — | — |

**Het bestand is het bijzonderste kanaal**: het enige touchpoint dat je niet host maar dat overal komt — in repo's, briefings, chats en tools van derden. Daarom de harde regel uit 1.3: maximaal drie functionele regels (claim, unvalidated-telling, datum), verder geen marketing. Een bestand dat als flyer voelt, wordt niet doorgegeven.

## Anti-patronen (expliciet verboden)

- Download achter een account- of betaalmuur (doodt fase 0.3, de motor van alles)
- Valse urgentie — de TTL-mail mag alleen omdat het écht beleid is
- `validation:`-scores mooier voorstellen dan de scan rechtvaardigt
- Meer dan één CTA per mail; meer dan 4 nurture-mails; mailen zonder opt-in
- Marketing-copy ín het brand.md-bestand

## Bouwimpact

Grotendeels gedekt door bestaande mechaniek (trial-meldingen, Remi, agents-inbox, MCP-connector) en de lopende task-file (bestand-regels, claim-pagina, events). **Nieuw werk buiten de huidige task-scope**: de nurture-sequence 2.1-2.4 (Emailit-templates + scheduling op draft-leeftijd), de vul-de-gaten-checklist als claimed-workspace-onboarding (3.2), het geëngineerde aha-moment (3.3) en de agency-detectie (5.3). Voorstel: één follow-up-task `brand-md-touchpoints` ná de generator-launch, gated op de eerste echte funnel-data — eerst meten waar mensen nu afhaken, dan de touchpoints bouwen die dat lek dichten.
