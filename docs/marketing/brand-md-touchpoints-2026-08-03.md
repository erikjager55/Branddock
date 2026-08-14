# brand.md — touchpoint-strategie voor de funnel (v2, aangescherpt)

> **Datum**: 2026-08-03 · **v2 zelfde dag**: aangescherpt na campagne-onderzoek (zie §Onderzoek) — nieuwe elementen: Brand Score als grader-mechaniek, herziene gate-architectuur (bestand vrij / rapport achter e-mail), gedefinieerd activatie-event met 10-minuten- en 48-uurs-regel, concurrent-scan-hook, benchmarks per funnel-stap, en per touchpoint expliciete must-do's en don'ts.
> **Hoort bij**: [`brand-md-launch-plan-2026-08-02.md`](brand-md-launch-plan-2026-08-02.md) §4b (funnel) en [`tasks/brand-md-open-standaard.md`](../../tasks/brand-md-open-standaard.md) (bouw).
> **Uitvoeringslaag**: per touchpoint de gedragsstrategie + concrete copy-/contentvoorzet staat in [`brand-md-touchpoint-content-2026-08-03.md`](brand-md-touchpoint-content-2026-08-03.md).

---

## Onderzoek: drie campagne-lessen die deze journey aanscherpen

**1. HubSpot Website Grader (het archetype van dit genre — 4M+ gescande sites, 10M+ leads, duizenden backlinks).** Vier werkzame bestanddelen: (a) **zelf-kwalificatie** — alleen wie om zijn website geeft, graded zijn website; de tool genereert niet zomaar leads maar de júiste leads; (b) **een cijfer** — mensen willen een score, vergelijken hem en delen hem; (c) **partial reveal** — toon genoeg om de waarde te bewijzen, gate de volledige uitsplitsing achter e-mail; (d) **echte engineering** — de grade moest echt kloppen, en dat is precies waarom me-too-graders het nooit inhaalden. Plus: een gratis tool bouwt jaren door (backlinks, keyword-eigendom, terugkerend gebruik) waar een campagne stopt.

**2. PLG-activatie-benchmarks (2026).** De cijfers die onze journey-targets zetten: mediaan trial→betaald voor product-led = **19%** (top-kwartiel 25%); gemiddelde B2B-activatie = **37,5%**; het aha-moment moet binnen **3-10 minuten** na signup vallen; activatie later dan **48 uur** voorspelt churn. Twee bevindingen valideren onze architectuur direct: gebruikers die het product vóór signup al ervaren activeren **1,8-2×** beter (onze generator ís die pre-signup-ervaring), en trials die starten met vooraf gevulde, realistische data activeren **30-50%** beter dan blanco setups (onze claim-flow ís pre-seeding). Ontwerpregel eruit: definieer één activatie-event en bouw het kortste pad ernaartoe.

**3. Viral-loop-mechanica (Calendly, Typeform, Loom).** Loops werken als ze **bestaand gedrag versterken, geen nieuw gedrag vragen**: Calendly groeit doordat gebruiken = uitnodigen. Onze analogie: een brand.md wordt gedeeld en in tools gestopt omdat dat zijn functie is — de provenance-regel is onze "powered by"-watermark, en het bureau→klant-kanaal is ons multiplayer-effect. Tweede les: zoek het moment waarop de gebruiker al wíl delen (een trots resultaat) — dat is de score-card, niet het bestand.

**Wat dit concreet verandert t.o.v. v1:** (1) een **Brand Score** op de resultaatpagina (grader-psychologie + deelbaar trots-moment + kwalificatie-signaal); (2) een **herziene gate-architectuur**: het bestand blijft altijd vrij (het is de virale drager), het visuele score-rapport komt achter e-mail (partial reveal op de juiste laag); (3) een **hard gedefinieerd activatie-event** met tijdregels; (4) de **concurrent-scan** als tweede-run-hook; (5) **benchmarks per funnel-stap** zodat elk touchpoint een target heeft.

---

## De gate-architectuur (kernbesluit van v2 — **herzien per user-besluit 2026-08-14**)

> **User-besluit 2026-08-14 (na live test)**: **harde e-mail-gate op de download** (HubSpot-stijl), ter vervanging van "bestand altijd vrij". Score + hoofdbevindingen + use-teaser blijven vrij zichtbaar (partial reveal); het bestand wordt server-side pas geleverd ná e-mail (`/api/brandmd/download`). Consequenties: hero-copy zonder "no account"-belofte op de download, touchpoint 1.3's virale-drager-aanname verzwakt (bestanden circuleren alleen nog via mensen die de gate passeerden), en de Show HN-framing moet "free" houden maar "no email" niet claimen. De run→e-mail-target vervalt (wordt ~run→download); meet in het leads-dashboard of de download-conversie acceptabel blijft. De oorspronkelijke tabel hieronder blijft staan als ontwerp-referentie.

### Oorspronkelijke v2-tabel (referentie)

| Laag | Vrij/gated | Waarom |
|---|---|---|
| Het brand.md-bestand | **Altijd vrij**, eerste run zonder iets | De virale drager — elk circulerend bestand is een fase-0-touchpoint; een muur hier doodt de motor (v1-principe blijft) |
| Brand Score (het cijfer + 2-3 hoofdbevindingen) | **Vrij, direct zichtbaar** | Het bewijs dat de tool werkt (HubSpot-les c: toon genoeg) + het deelbare trots-moment |
| Volledig score-rapport (per-veld-uitsplitsing, benchmark, verbeterpunten) | **E-mail** | De partial-reveal-laag: hoge waarde, natuurlijke ruil, raakt de virale loop niet |
| Tweede+ scan (bv. concurrent) | **E-mail** | De gate valt op een hoog-intent-moment i.p.v. een willekeurige teller |
| Wijzigen, verversen, levende versie, MCP | **Account (trial)** | De claim-flow — pre-seeded workspace (+30-50%-les) |

**De Brand Score zelf — must**: methodologisch verdedigbaar (lichtgewicht afgeleide van de F-VAL-pijlers: compleetheid × consistentie × AI-leesbaarheid), met zichtbare uitleg. **Don't**: een gevoels-cijfer dat bij navraag niet uit te leggen is — dan wordt het HN-dag-één afgebrand en is de geloofwaardigheid van F-VAL meebeschadigd.

---

## Principes (v1-principes blijven, één toevoeging)

1. Eén taak per touchpoint. 2. Eerlijkheid ís het verkoopargument. 3. Waarde vóór vraag. 4. Toon volgt de launch-wig. 5. Elk touchpoint is gemeten.
6. **Nieuw — het 48-uurs-venster is heilig**: alles wat activatie kan opleveren gebeurt in de eerste twee dagen; lifecycle-communicatie is vanaf dag 3 onderhoud, geen redding.

---

## Fase 0 — Ontdekking

| # | Touchpoint | Taak | Must | Don't |
|---|---|---|---|---|
| 0.1 | Generator-landingspagina | Bezoek → run | URL-veld boven de vouw; een **live voorbeeld-score** van een bekend merk als demo (bewijs vóór de eerste klik); works-with-rij | Feature-opsomming van Branddock — deze pagina verkoopt de scan, niets anders |
| 0.2 | Launch-kanalen (HN/PH/LinkedIn/nieuwsbrieven/pers) | Verkeer met context | Elk kanaal → de generator, mét het frame (llms.txt/AGENTS.md-drie-eenheid); founder beantwoordt álles op launchdag | Meerdere bestemmingen per kanaal; gescheduled-en-weggelopen posts |
| 0.3 | **Circulerende bestanden** | De duurloop | Provenance-regel als "powered by"-watermark (Calendly-les: gebruiken = verspreiden) | Meer dan 3 functionele regels in het bestand; alles wat als advertentie leest |
| 0.4 | Validator/docs/badge | Dev-ingang | Elke validator-run eindigt met "generate one →" | Docs die alleen over Branddock gaan i.p.v. de standaard |
| 0.5 | SEO/GEO-content | Duurzaam verkeer | "brand.md"-keyword bezetten zoals HubSpot "website grader" bezette — de tool ís het linkbait (backlinks komen vanzelf naar iets nuttigs) | Content zonder de generator als CTA |
| 0.6 | **Score-cards van anderen** (nieuw) | Sociale loop | Gedeelde score-card linkt naar "scan je eigen site"; OG-image per score | Scores van derden publiceren zonder dat zíj deelden |

**Target**: bezoek→run ≥ 25%.

## Fase 1 — Het scan-moment

| # | Touchpoint | Taak | Must | Don't |
|---|---|---|---|---|
| 1.1 | Scan-progress (±10-30 s) | Waardeperceptie bouwen | Live vertellen wát er gevonden wordt; de wachttijd is het eerste bewijs van "echte engineering" (HubSpot-les d) | Kale spinner; nep-progress |
| 1.2 | Resultaatpagina | Het trots/schrik-moment | **Brand Score groot in beeld** + 2-3 hoofdbevindingen vrij; validated/unvalidated-telling; CTA-hiërarchie: ①Download (vrij) ②Volledig rapport (e-mail) ③Claim & complete (account) | Score verstoppen; download degraderen; drie even zware CTA's |
| 1.3 | Het bestand | De virale drager | Exact 3 functionele regels: claim-URL, unvalidated-telling, datum | Marketing-copy; tracking-links die het bestand verdacht maken |
| 1.4 | **Share-moment** (nieuw) | Trots-resultaat benutten | "Deel je score"-kaart (beeld + link), direct na de score getoond — het moment waarop delen intrinsiek is (viral-loop-les) | Delen vragen vóór het resultaat; incentives voor delen (voelt als schema) |
| 1.5 | **Concurrent-hook** (nieuw) | Tweede run + kwalificatie | "Benieuwd hoe [categorie]-concurrenten scoren? Scan er één" → e-mail-gate valt hier natuurlijk | Concurrent-scores tonen zonder dat de gebruiker die scan zelf deed |
| 1.6 | **Use-it-moment** (v2.1) | Eerste toepassing ≤60 s na download | Direct na download een "How to use it"-paneel: tabs per tool (Claude / ChatGPT / Cursor / any chat) met copy-paste-recept + 30-sec-clip; zelfde content als de publieke **use-hub** (`/brandmd/use`), waar de derde bestand-regel ook naar linkt — de tutorial werkt dus óók voor wie geen e-mail achterliet én voor ontvangers van andermans bestand | Tutorial achter e-mail zetten; de gebruiker met een bestand maar zonder plan laten vertrekken |

**Target**: run→download ≥ 60%; run→e-mail ≥ 25% (grader-genre-norm: gate op de rapport-laag converteert hoog omdat de waarde al bewezen is). **Nieuw (1.6)**: download→use-paneel-interactie ≥ 40% — de proxy voor "weet wat hij ermee moet".

## Fase 2 — Post-download lifecycle (opt-in; max 4 mails + 1 TTL)

> **Herzien ritme (48-uurs-les)**: de eerste twee contactmomenten zitten binnen 24 uur — dáár wordt activatie gewonnen, niet in week 2.

| # | Moment | Boodschap + CTA | Must | Don't |
|---|---|---|---|---|
| 2.1 | Direct | **LIVE (2026-08-14)** — Bestand + volledig rapport + 3 gebruiksrecepten (Claude-project / ChatGPT-instructions / MCP). Gebouwd: `templates/brandmd-report.ts`, trigger in `/api/brandmd/track` bij éérste e-mail-capture (dedupe zonder schema-wijziging), fail-soft via `trySendTransactional`. Zelfde bevindingen als de resultaatpagina (`lib/brandmd/findings.ts`) | Recepten copy-paste-klaar; het rapport waarmaken wat de gate beloofde | Verkooppraat in mail 1 |
| 2.2 | +24 u | "Werkte het? Eén tip die vandaag verschil maakt" + wat `unvalidated` betekent → eerste zachte claim-CTA | Binnen het 48-uurs-venster; concreet resultaat centraal | Wachten tot dag 3-7 (v1-fout — te laat) |
| 2.3 | Dag 7-14 | Concurrent-scan + benchmark ("waar sta jij in je categorie?") | De grader-vergelijkings-reflex benutten | Bang maken met concurrent-scores |
| 2.4 | Dag 21-30 | "Je brand.md veroudert" — wat een levende versie doet | Feitelijk (generatiedatum) | Herhaal-spam als 2.3 niet opende |
| 2.5 | Dag ~80 | TTL: draft verloopt over 10 dagen | Alleen omdat het écht beleid is; laatste mail, punt | Verlenging-trucjes ("we bewaren hem tóch nog even") |

**Target**: e-mail→claim ≥ 10% binnen 30 dagen.

## Fase 3 — Claim & activatie

**Het activatie-event (hard gedefinieerd, PLG-les):** *gebruiker bekijkt een eigen on-brand generatie mét fidelity-score naast een vanilla-versie* — binnen **10 minuten** na registratie, uiterlijk binnen **48 uur**. Alles in deze fase is het kortste pad daarnaartoe.

| # | Touchpoint | Taak | Must | Don't |
|---|---|---|---|---|
| 3.1 | Claim-pagina | Registratie = oogsten | "7 van je 11 assets staan klaar" concreet tonen (pre-seeding zichtbaar maken — de +30-50%-les werkt alleen als de gebruiker het zíet) | Generiek registratieformulier zonder de buit te tonen |
| 3.2 | First-run | Kortste pad naar activatie | Vul-de-gaten-checklist, maar **het aha-moment eerst**: genereer direct iets, gaten vullen daarna | Tour langs alle 55 secties; verplichte setup vóór het eerste resultaat |
| 3.3 | Het aha-moment | Activatie-event | Side-by-side eigen-merk vs. vanilla, fidelity-score zichtbaar; over hún product, in hún taal | Demo-content over een fictief merk; het bewijs vertellen i.p.v. tonen |
| 3.4 | Dag-0/1-mail | Terughalen wie afhaakte vóór activatie | Enige doel: terug naar 3.3; deeplink naar het klaarstaande resultaat | Feature-overzicht; "welkom bij Branddock"-proza |

**Target**: claim→activatie ≥ 40% (benchmark: gemiddeld 37,5%, en pre-seeded + pre-experienced hoort daarboven te zitten).

## Fase 4 — Trial-verdieping (dag 1-28)

| # | Touchpoint | Taak | Must | Don't |
|---|---|---|---|---|
| 4.1 | Agents-inbox eerste voorstel | "Meer doen" tonen | Binnen week 1 een concreet voorstel van Bo/Milo over hún merk | Agent-voorstellen vóór activatie (ruis in het kortste pad) |
| 4.2 | MCP-koppel-kaart | Van bestand naar infrastructuur | Framen als upgrade van hun bestaande brand.md-gebruik ("wordt nu automatisch vers") | MCP uitleggen als technologie i.p.v. als resultaat |
| 4.3 | Remi-weekrapport | Gewoonte + retentie | Week 1 al versturen, hoe dun ook — het ritme is het product | Wachten "tot er genoeg data is" |
| 4.4 | Trial-ritme | Conversie voorbereiden | Dag 7 (nog niet ontdekt), dag 25/28 = bestaande T-3/T-0-meldingen (#380) | Dagelijkse mails; korting aanbieden (devalueert vóór de prijs ooit gold) |

**Target**: trial→betaald ≥ 15% (PLG-mediaan 19% als doel na iteratie).

## Fase 5 — Conversie en daarna

| # | Touchpoint | Taak | Must | Don't |
|---|---|---|---|---|
| 5.1 | Read-only-lock | Eerlijke conversie | Alles blijft leesbaar; per tier tonen wat weer kan; Agency-route bij meerdere merken | Data gijzelen; countdown-theater |
| 5.2 | "Deel je brand.md" | Klant → kanaal | Canonical-URL + badge + score-card na abonnement — de loop sluit naar 0.3/0.6 | Delen verplichten of belonen met credits (vervuilt de loop) |
| 5.3 | Agency-detectie | Sterkste segment vangen | ≥2 scans/claims van één account of e-maildomein → persoonlijk Agency-aanbod + witlabel-rapport | Automatische tier-upsell zonder menselijke toon — bureaus zijn een saleskanaal, geen popup-doelgroep |

---

## Funnel-targets in één oog

| Stap | Target | Herkomst |
|---|---|---|
| Bezoek → run | ≥ 25% | Grader-genre |
| Run → download | ≥ 60% | Bestand is vrij |
| Run → e-mail | ≥ 25% | Partial-reveal op rapport-laag |
| E-mail → claim | ≥ 10% / 30d | Lead-magnet-norm |
| Claim → activatie | ≥ 40% (≤10 min pad, ≤48 u) | PLG 37,5% + pre-seeding-bonus |
| Trial → betaald | ≥ 15%, doel 19% | PLG-mediaan |

## Anti-patronen (uitgebreid in v2)

- Download achter een muur (doodt loop 0.3) · valse urgentie · opgepoetste scores · >1 CTA per mail · mailen zonder opt-in · marketing in het bestand
- **Nieuw**: een Brand Score die niet uitlegbaar is · activatie-werk naar week 2 schuiven (48-uurs-regel) · delen belonen met incentives (vervuilt de sociale loop) · korting in de trial · concurrent-data tonen die de gebruiker niet zelf opvroeg

## Bouwimpact (delta t.o.v. v1)

Nieuw in scope-discussie voor de task-file: **Brand Score + score-card + OG-image** op de resultaatpagina (kleine uitbreiding van bouwonderdeel 3; score-formule als lichtgewicht F-VAL-afgeleide) en de **rapport-laag achter e-mail** (vervangt de kale "e-mail-gate na N runs"). De rest ongewijzigd: nurture-sequence, vul-de-gaten-onboarding, aha-moment-engineering en agency-detectie blijven de follow-up-task `brand-md-touchpoints`, gated op echte funnel-data — met dank aan de targets hierboven is "waar lekt het?" straks in één dashboard-blik te zien.

## Bronnen

- [Outgrow — HubSpot Website Grader case study](https://outgrow.co/blog/hubspot-website-grader-case-study) · [B2B Growth Hacking — Website Grader teardown](https://b2bgrowthhacking.com/teardowns/hubspot-website-grader) · [Figuring Out AI — free tool SEO / 10M leads](https://www.figuringoutwithai.com/growth/free-tool-seo-hubspot-website-grader)
- [Userpilot — SaaS onboarding funnel 2026 (TTFV)](https://userpilot.com/blog/saas-user-onboarding-funnel/) · [Arcade — Free trial conversion playbook 2026](https://www.arcade.software/post/free-trial-conversion-playbook-2026) · [Appcues — PLG metrics](https://www.appcues.com/blog/product-led-growth-metrics) · [Mixpanel — PLG 2026](https://mixpanel.com/blog/product-led-growth/) · [Digital Applied — Time to Value framework 2026](https://www.digitalapplied.com/blog/customer-onboarding-time-to-value-2026-saas-metrics-framework)
- [OpenView — Calendly PLG & virality](https://openviewpartners.com/blog/how-calendly-harnesses-plg-and-virality-for-growth/) · [Growth Unhinged — guide to product virality](https://www.growthunhinged.com/p/your-guide-to-product-virality) · [Scalarly — viral loop design](https://scalarly.com/blog/viral-loop-design/) · [Sean Ellis — Calendly's viral loop](https://seanellis.substack.com/p/cracking-the-viral-loop-calendlys)
