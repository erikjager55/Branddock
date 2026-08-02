# brand.md — wereldwijd lanceringsplan

> **Datum**: 2026-08-02 · **Status**: concept ter besluitvorming (Erik-gates in §9)
> **Hoort bij**: [`tasks/brand-md-open-standaard.md`](../../tasks/brand-md-open-standaard.md) (de bouw) · [`docs/reports/concurrentieanalyse-2026-08-02.md`](../reports/concurrentieanalyse-2026-08-02.md) (de waarom) · [`docs/reports/100k-plan-fasering-2026-07-20.md`](../reports/100k-plan-fasering-2026-07-20.md) Fase 4 (de oorsprong) · [`docs/marketing/launch-wig-besluit.md`](launch-wig-besluit.md) (de hoofdboodschap waar dit onder valt)

---

## 1. Doel en definitie van succes

**Missie**: `brand.md` wordt dé manier waarop een merk zijn merk-DNA aan AI-agents geeft — en Branddock is de referentie-implementatie en het "levende fundament" waar elk bestand naar terugverwijst.

**Noordster**: het aantal geldige `brand.md`-bestanden in omloop × het aantal tools dat ze leest. Beide kanten tellen — een standaard met alleen producenten is een dud (zie §2).

**90-dagen-doelen** (vanaf publieke launch, te herijken bij golf 1):

| KPI | Doel 90d | Waarom dit getal |
|---|---|---|
| Gegenereerde bestanden (generator + export) | 1.000 | Bewijst producer-vraag; voedt de "State of brand.md"-PR-motor |
| Externe consumers (tools die het formaat lezen, niet van ons) | ≥ 5 | De llms.txt-les: zonder consumers is het een dode letter |
| Agencies die brand.md standaard bij klant-oplevering leveren | ≥ 3 | Multiplier + het bureau-kanaal is Branddocks sterkste niche |
| Google top-3 op "brand.md" (EN) | ja | Unieke term, winbaar; wie de term bezit, bezit de categorie |
| Signups met bron = generator/spec-site | meetbaar > 0, trend ↑ | De commerciële rechtvaardiging (funnel naar workspace) |

---

## 2. De twee empirische lessen waarop dit plan leunt

**llms.txt (Jeremy Howard, sept 2024)** — het waarschuwende voorbeeld én het bewijs dat een eenling een bestandsstandaard kan lanceren. Het spreidde via één kanteelmoment: Mintlify zette het aan voor álle gehoste docs-sites tegelijk (platform-seeding). Resultaat 2026: ~10% adoptie over 300k domeinen — maar analisten noemen het "a low-cost, low-yield bet", want de grote crawlers *consumeren* het bestand nauwelijks. Producenten zonder consumenten = optiek zonder waarde.

**MCP (Anthropic, nov 2024)** — het succesvoorbeeld. Won niet door producenten te werven maar door de consumer-kant dag één te leveren (Claude las het), met SDK's, een registry en snelle adoptie door grote spelers; neutrale governance (Linux Foundation, dec 2025) versnelde de rest. Van 0 naar 400M+ SDK-downloads/maand in ~2 jaar.

**Vertaling naar brand.md — drie principes:**
1. **Launch vraag- en aanbodkant tegelijk.** Dag één zijn er consumers: onze eigen MCP-tool, Claude Skill, browser-extensie en n8n-nodes lezen het formaat — plus de belangrijkste van allemaal: **plak-het-in-elke-chat**. Omdat brand.md klein, leesbaar Markdown is, werkt het vandaag al in élke LLM zonder enige integratie. Dat is het structurele voordeel boven llms.txt (dat crawler-medewerking nodig had): brand.md heeft **direct nut zonder netwerkeffect**.
2. **Zoek het Mintlify-moment.** Eén platform dat brand.md automatisch genereert of leest voor al zijn gebruikers is meer waard dan duizend individuele adopters. Kandidaten: website-builders, WordPress (plugin), agency-suites, agent-frameworks (§5 golf 2).
3. **Klein en af.** llms.txt en robots.txt wonnen mede doordat de spec op één A4 past. Spec v0.1 = maximaal ~2 pagina's, verplichte kern + optionele secties, expliciete versionering en `unvalidated`-markering.

---

## 3. Positionering en naming

**One-liner (EN)**: *"Give every AI agent your brand memory."* (al akkoord-plichtig gemaakt in €100k-plan Fase 3.)
**Frame**: *"the robots.txt for your brand in the AI era"* — robots.txt vertelt crawlers wat mág, brand.md vertelt agents wie je bént.

**Verhouding tot de launch-wig** (besluit 2026-07-17): dit wordt géén tweede hoofdboodschap. De wig blijft *"Een AI-marketingteam dat je merk écht kent — en dat kan bewijzen"*; brand.md is de **open voordeur naar hetzelfde huis** — de gratis, deelbare belichaming van "je merk écht kennen". Hero verandert niet; brand.md krijgt een eigen oppervlak (spec-site + landingspagina + generator).

**Naming en eigenaarschap (Erik-gate)** — aanbeveling:
- Naam: `brand.md` (bestandsnaam-als-naam, conform llms.txt/README-conventie; geen rebrand-fantasienaam).
- Spec op een **neutraal adres**: eigen GitHub-organisatie (bv. `brandmd`) + kort domein voor de spec-site (bv. brandmd.org); niet onder branddock.app. De MCP-les: neutraliteit verlaagt de adoptiedrempel voor partijen die geen Branddock-klant willen lijken. Branddock staat er prominent op als initiator en referentie-implementatie.
- Licentie: spec onder CC BY 4.0, validator/tooling onder MIT.
- Dag-1-claims vastleggen: domein(en), GitHub-org, npm-pakketnaam voor de validator, X/LinkedIn-handle.
- **Moat-grens**: de spec beschrijft merk-DNA-velden (voice, style, personas, kernassets, do's & don'ts). De prompt-/chain-laag en F-VAL-methodologie blijven gesloten (ADR public-brand-api). Het bestand mag F-VAL-scores *bevatten* (als kwaliteitsstempel); hoe ze tot stand komen niet.

---

## 4. Launch-assets (bouwlijst)

| # | Asset | Golf | Notitie |
|---|---|---|---|
| 1 | Spec v0.1 (≤2 pag.) + 3-5 voorbeeldbestanden van herkenbare merken (op basis van publieke info) | 0 | Kern van alles; voorbeelden zijn de halve documentatie |
| 2 | GitHub-repo: spec + voorbeelden + validator (CLI + web) + "brand.md ready"-badge | 0 | Validator maakt de standaard serieus; badge is gratis distributie |
| 3 | Gratis generator: website-URL → brand.md via bestaande scan-pipeline (rate-limited, e-mail-gate pas na N runs) | 0 | De lead-magnet uit €100k-plan Fase 3/4 |
| 4 | Landingspagina EN (+ NL): uitleg, generator-CTA, "works with"-rij (Claude, ChatGPT, Cursor, n8n), demo | 0 | |
| 5 | Eigen consumers dag 1: MCP-tool serveert brand.md; Claude Skill, browser-extensie en n8n-nodes lezen het; "paste in any chat"-instructie | 0 | De anti-llms.txt-maatregel |
| 6 | Demo-video 60-90 sec: zelfde prompt mét vs. zónder brand.md, zichtbaar verschil | 1 | Sterkste bewijs in 1 asset; overal herbruikbaar |
| 7 | PR-kit: one-pager, founder-story (bureau-achtergrond), llms.txt/MCP-context, beeldmateriaal | 1 | |
| 8 | Directory "who has a brand.md" + badge-programma | 2 | Adoptie-vliegwiel + backlinks; pas bij >50 bestanden |
| 9 | WordPress-plugin "serve your brand.md" | 2 | Kandidaat-Mintlify-moment; Eriks eigen WP-omgevingen als eerste showcase |
| 10 | "State of brand.md"-rapport (data uit generator) | 3 | Terugkerende PR-motor |

---

## 5. Golfplan

### Golf 0 — Seed (week 1-2, vóór elke publiciteit)
- Erik-gates afhechten: naming, domein, licentie, launch-datum (§9).
- Bouw conform task-file; alles EN-first, NL ernaast.
- **15-25 bestanden seeden** via Better Brands-klanten en het NL-netwerk; elk gegenereerd bestand verwijst naar de spec + Branddock.
- Eigen ecosysteem eet het formaat (asset 5) — bij launch is de "works with"-rij geen belofte maar een feit.
- Spec-feedbackronde met 3-5 bevriende marketeers/developers; itereren vóór het publiek wordt.

### Golf 1 — Publieke launch (week 3-4, één gecoördineerde dag + naweek)
- **Show HN** ("Show HN: brand.md — an open file format that gives AI agents your brand") — founder post zelf, is de hele dag aanwezig in de comments. HN afgestemd op VS-ochtend.
- **Product Hunt** dezelfde week (niet dezelfde dag); generator als interactieve hook.
- **llms.txt-community aanhaken**: positioneer als zusje, niet als concurrent — *llms.txt = je site voor AI, brand.md = je merk voor AI*. Dat lift mee op een bestaand discourse en geeft journalisten het frame gratis.
- LinkedIn (EN + NL), X-thread met de demo-video, r/marketing, r/artificial, r/SaaS, dev.to/Medium-longread ("why brands need a file format").
- Nieuwsbrief-outreach: Ben's Bites, TLDR AI/Marketing, The Rundown, Marketing AI Institute, search-/GEO-nieuwsbrieven (die schreven massaal over llms.txt — dit is hun natuurlijke vervolgverhaal).
- NL-pers parallel (Emerce, Frankwatching, MarketingTribune): "Nederlandse startup lanceert open standaard" is daar een verhaal.

### Golf 2 — Consumer-adoptie (maand 2-3) — het echte werk
- **Outreach naar 20-30 tools** die brand.md zouden moeten *lezen*: agent-builders, contenttools, website-builders (Framer/Webflow-community-plugins), niet-Frontify DAM's, e-mailtools. Pitch: gratis kwaliteitswinst voor jullie output, open formaat, geen lock-in, wij linken terug vanuit de directory.
- WordPress-plugin live (asset 9) + MCP-registry-listings.
- **Agency-programma**: bureaus genereren een brand.md bij elke klant-oplevering; koppelt aan het witlabel-klantrapport (€100k-plan Fase 5) en de Agency-tier. Dit is tegelijk het wereldwijde distributiekanaal met de laagste kosten: elk bureau zaait het formaat bij al zijn klanten.
- Directory + badge live zodra >50 bestanden.
- Wekelijkse GEO/SEO-cadans met de eigen long-form-pipeline: EN-content op "brand.md", "brand context for AI agents", vergelijkings-LP's (o.a. de Frontify-pagina uit €100k-plan Fase 3). Het eigen product is hier het marketingkanaal — dogfooding als bewijs.

### Golf 3 — Verankeren (maand 3-6)
- Spec v1.0 met publieke changelog; community-input via GitHub issues; RFC-achtig proces licht houden.
- **"State of brand.md"-rapport** uit generator-data — terugkerend PR-moment (kwartaal).
- **Governance-optie**: zodra ≥3 serieuze externe consumers meedoen, overweeg een neutrale stichting/werkgroep-stap (de MCP-les: Anthropic's Linux Foundation-donatie versnelde enterprise-adoptie). Niet eerder — governance zonder adoptie is theater.
- Webinars/conference-talks; integratiegesprekken met grotere platforms zodra er tractie-bewijs is.

**Doorlopend**: elk gegenereerd bestand blijft de beste advertentie — verwijzing naar spec + "living version maintained on Branddock" + generatiedatum, zodat verouderde bestanden zichzelf terugleiden naar de bron.

---

## 6. Kanalen en geografie

Open standaarden lanceren niet per land maar via wereldwijde internet-kanalen; **EN-first is de enige juiste keuze**, met NL parallel als thuismarkt-bewijs en pershaakje. Lokalisatie van spec-site/landingspagina volgt de bestaande 7 content-talen pas bij bewezen tractie. Praktisch: HN/PH-timing op VS-uren; LinkedIn-posts dubbel (EN + NL); de spec zelf is Engels.

| Kanaal | Rol |
|---|---|
| Show HN + Product Hunt | Piek-awareness bij developers/founders, backlink-basis |
| llms.txt/GEO-discourse | Frame-liften: het bestaande publiek dat dit meteen snapt |
| LinkedIn | Marketeers + agencies (de kopers), founder-verhaal |
| Nieuwsbrieven AI/marketing | De multiplicator na de piek |
| SEO/GEO op "brand.md" | Structurele vindbaarheid; unieke term, winbaar |
| Agency-netwerk (NL start) | Wereldwijd schaalbaar zaai-kanaal via klant-opleveringen |
| GitHub/MCP-registry | Developer-vindbaarheid + geloofwaardigheid |

---

## 7. Verdediging

- **Frontify reageert** (waarschijnlijkst scenario: "machine-readable brand" enterprise-push of een eigen formaat): onze verdediging is gratis + open + klein + voor iedereen — een enterprise-speler kan moeilijk geloofwaardig een gratis open standaard dragen die zijn eigen ACV ondergraaft. Snelheid en eerlijke openheid zijn de moat; daarom staat deze taak vooraan.
- **Naam-/frame-kaping**: dag-1-claims (domeinen, GitHub-org, npm, handles) vóór enige publiciteit.
- **"Lege standaard"-kritiek** (de llms.txt-kater): claim nooit adoptie die er niet is; publiceer de consumer-lijst eerlijk; leid elk gesprek terug naar het directe nut zonder netwerkeffect (paste-in-chat werkt vandaag). Dit spoort met het bestaande marketing-principe "autopilot pas claimen als het waar is".
- **Kwaliteitskritiek** ("mijn gegenereerde brand.md is mager"): `unvalidated`-veldmarkering + zichtbaar upgrade-pad (workspace = gevalideerd, F-VAL-gedekt, levend).
- **Kill-/pivot-criterium** (vooraf afgesproken, tegen sunk-cost): als na 90 dagen publieke launch de generator loopt maar er **0 externe consumers** zijn ondanks golf-2-outreach, schaal terug naar lead-magnet-functie (de funnel blijft renderen) en bevries de standaard-claim tot een Mintlify-moment zich wél aandient.

---

## 8. Meetfundament

Aansluiten op de KPI-boom uit €100k-plan Fase 1. Events die er dag 1 in moeten:
`brandmd_generator_run` (+ bron-URL-domein), `brandmd_download`, `brandmd_export` (per workspace), `brandmd_mcp_fetch` (server-side — de enige direct meetbare *consumptie*), `brandmd_referral_visit` (UTM in elk bestand), `signup_source=brandmd`.
Wekelijkse review in de bestaande cadans; Remi kan het brand.md-blok in het weekrapport meenemen zodra de events lopen.

---

## 9. Besluiten van Erik (gates, in volgorde)

| # | Besluit | Wanneer | Aanbeveling |
|---|---|---|---|
| 1 | Naming + positionering ("publieke standaard-claim") | vóór bouw-afronding | `brand.md`, frame "robots.txt for your brand" |
| 2 | Domein + GitHub-org + licentie | vóór bouw-afronding | neutraal (bv. brandmd.org / gh:brandmd), CC BY 4.0 + MIT |
| 3 | EN-kernzin akkoord | golf 0 | *"Give every AI agent your brand memory."* (stond al in Fase 3) |
| 4 | Launch-datum + wie is het publieke gezicht | eind golf 0 | Erik als founder — HN en PH vereisen een mens, geen merk |
| 5 | Budget | eind golf 0 | Minimaal: domeinen + evt. kleine video-editing; kanalen zijn gratis |
| 6 | Governance-stap (stichting/werkgroep) | pas bij ≥3 externe consumers | Niet eerder beslissen |

---

## 10. Relatie met bestaande plannen

Dit plan vervángt niets: het is de uitvoeringsverdieping van €100k-plan Fase 4, uitgevoerd vóór Fase 3/5 in de wetenschap dat die twee erop inhaken (agent-LP's krijgen de generator als CTA; het witlabel-rapport wordt het agency-programma-anker). De bouwscope staat in [`tasks/brand-md-open-standaard.md`](../../tasks/brand-md-open-standaard.md); dit document stuurt wat er ná de merge gebeurt.

---

## Bronnen (extern)

- [Presenc — State of llms.txt 2026](https://presenc.ai/research/state-of-llms-txt-2026) · [Codersera — llms.txt honest guide 2026](https://codersera.com/blog/llms-txt-complete-guide-2026/) · [Search Engine Land — llms.txt proposal](https://searchengineland.com/llms-txt-proposed-standard-453676) · [Kai Spriestersbach — "llms.txt is a dud"](https://medium.com/@kaispriestersbach/the-llms-txt-is-dead-more-precisely-a-dud-ab7bee4f469c) (het consumer-gat)
- [MCP blog — One Year of MCP](https://blog.modelcontextprotocol.io/posts/2025-11-25-first-mcp-anniversary/) · [Zuplo — One Year of MCP](https://zuplo.com/blog/one-year-of-mcp) · [Anthropic — Introducing MCP](https://www.anthropic.com/news/model-context-protocol) · [Pento — A Year of MCP](https://www.pento.ai/blog/a-year-of-mcp-2025-review) (consumer-first + governance-les)
