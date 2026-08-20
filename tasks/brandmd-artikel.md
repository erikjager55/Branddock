---
id: brandmd-artikel
title: Artikel over brand.md live op de marketing-site — de eerste steen van de acquisitie-golf
fase: post-launch
priority: now
effort: 3-5 uur (artikel via eigen pipeline; pagina volgt het bestaande resources-patroon)
owner: claude-code
status: in-progress
created: 2026-08-20
completed: -
related-adr: docs/adr/2026-07-17-public-brand-api.md
related-spec: docs/marketing/brand-md-launch-plan-2026-08-02.md (v2, omarm-strategie) + docs/marketing/launch-wig-besluit.md (optie C) + docs/marketing/brand-md-launch-kit-2026-08-15.md
worktree: branddock-brandmd-artikel
---

# Probleem

De brand.md-funnel is technisch compleet — generator, Brand Score, rapport-mail,
lifecycle-reeks, claim-flow en leads-dashboard staan live — en leverde in vier dagen
**4 page-events en 0 leads** op. Dat is geen infra-probleem meer maar een
distributie-probleem (`START_HERE.md`, 19-08).

Tegelijk heeft de marketing-site **geen enkele inhoudelijke pagina over brand.md**.
`/brandmd` is de tool zelf en `/brandmd/use` het recept; er is niets dat uitlegt
wáárom het formaat bestaat, hoe het zich verhoudt tot `llms.txt` en `AGENTS.md`, en
waarom Branddock een bestaande standaard omarmt in plaats van een eigen te lanceren.
Er is één vergelijkbaar precedent: `/marketing/resources/f-val`.

Zonder zo'n pagina heeft de generator geen organisch instroomkanaal — en is de enige
route naar bezoekers de geparkeerde publiciteitsgolf.

# Voorstel

Eén cornerstone-artikel op `/marketing/resources/brand-md`, Nederlands, volgens het
bestaande `resources/f-val`-patroon (SplitHeader + Mosaic + TrialNote + CTA).

Het artikel wordt geschreven door **Branddocks eigen long-form SEO/GEO-pipeline** op de
Branddock-workspace via de MCP-connector. Dat is geen gemak maar een keuze uit het
launch-plan §5 golf 2: *"Wekelijkse GEO/SEO-cadans met de eigen long-form-pipeline op
'brand.md' — dogfooding als bewijs."* De F-VAL-score op het resultaat is daarmee zelf
een proof-point.

Toon en scope volgen de drie vastgelegde besluiten:
- **Launch-wig optie C** (`launch-wig-besluit.md`): agent-first frame, bewijs als onderbouwing.
- **Omarm-strategie** (launch-plan v2 §3): we lanceren tooling voor een bestaande standaard,
  we claimen de standaard niet.
- **Transparant verdienmodel** (user-besluit 2026-08-20): het bestand is gratis, de
  onderhouden versie is het product — expliciet benoemd, zoals de Show HN-tekst dat al doet.

# Acceptatiecriteria

- [x] `/marketing/resources/brand-md` rendert, NL, met `metadata` incl. canonical + description
- [x] Artikel gegenereerd via `generate_long_form_seo` op de Branddock-workspace (deliverable-id in Notes)
- [x] F-VAL-score van de gepubliceerde tekst vastgelegd in Notes (`score_against_brand`)
- [x] Geen enkel woord uit `vocabularyDont` in de definitieve tekst (autopilot, revolutionair, game-changer, magisch, 10x, moeiteloos, synergy, unlock, leverage, empoweren, disruptie)
- [x] Elke claim draagt een cijfer of concreet voorbeeld (voice-regel "geen cijfer = geen claim")
- [x] Pad toegevoegd aan `MARKETING_SITEMAP_PATHS` — anders vindt Google 'm niet
- [x] Vindbaar vanaf de site: link in `MarketingFooter` naast `/marketing/resources/f-val`
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` 0 errors
- [x] Smoke-test uitgevoerd (zie plan)
- [x] Changelog-entry

# Bestanden die ik aanraak

- `src/app/marketing/resources/brand-md/page.tsx` — nieuw
- `src/app/marketing/sitemap-pages.ts` — pad toevoegen
- `src/app/marketing/MarketingFooter.tsx` — link toevoegen
- `tasks/brandmd-artikel.md` — dit bestand
- `docs/changelog.md` — entry

# Bestanden die ik NIET aanraak

- `src/app/brandmd/**` — de generator zelf is af en live; dit artikel leidt ernaartoe
- `src/lib/brandmd/**` — geen wijziging aan scan, score of emitter
- `docs/marketing/brand-md-launch-kit-2026-08-15.md` — outreach blijft geparkeerd; dit
  artikel is géén golf 0/1 en verstuurt niets naar buiten
- `integrations/brandmd-validator/**` — npm-publish is een Erik-besluit (launch-kit §1.1)

# Smoke test plan

1. `npm run build` in de worktree (Turbopack vereist een échte node_modules — die staat er)
2. `npm run dev` → `http://localhost:3000/marketing/resources/brand-md` rendert zonder console-fouten
3. Rauwe serverrespons controleren op `lang="nl"` (gotcha 18-08: de client repareert de DOM ná
   hydratie, dus een browsercheck alleen is geen bewijs) — `curl -s ... | grep -o '<html[^>]*'`
4. `<title>` en `<meta name="description">` aanwezig in de rauwe respons
5. Alle links in het artikel volgen (`/brandmd`, `/brandmd/use`, `/marketing/resources/f-val`,
   de upstream GitHub-URL) — elk een 200
6. Verwacht resultaat: pagina rendert NL, zit in de sitemap, en de CTA leidt naar de generator

# Risico's

- **De publiciteits-pauze.** De launch-kit parkeert outreach bewust ("geen slapende honden
  wakker maken"). Een pagina op de eigen site is passief — hij wacht op bezoek in plaats van
  het op te zoeken — maar hij is wel openbaar en indexeerbaar. Erik heeft dit op 2026-08-20
  expliciet in gang gezet. *Mitigatie*: geen outreach, geen Show HN, geen persbericht; alleen
  de pagina.
- **De pipeline kan van de boodschap afdrijven.** `generate_long_form_seo` doet eigen
  keyword-research en outline; hij kent de omarm-strategie en het verdienmodel niet.
  *Mitigatie*: output beoordelen tegen de drie besluiten hierboven vóór publicatie, en
  desnoods de pipeline-tekst als grondstof gebruiken in plaats van als eindtekst. Dat wordt
  eerlijk in Notes vastgelegd.
- **Claims die de meting niet dragen.** De pilot-claim is +6,8 (hermeting 21-07), niet +7,
  en is gemeten op een workspace met `published = false` — vermoedelijk een ondergrens (zie
  [[pilot-fval-claim]]). *Mitigatie*: "+7 gemiddeld" alleen met de bestaande nuancering, of
  weglaten. Geen nieuw cijfer verzinnen.
- **Positioning staat op "Not yet defined"** in Branddocks eigen BRAND.md — als het artikel
  naar het eigen bestand als voorbeeld linkt, is dat zichtbaar. *Mitigatie*: benoemen als
  eerlijkheid (het bestand markeert wat niet gevalideerd is) óf niet naar het eigen bestand
  linken. Erik-besluit, staat in launch-kit §1.2.

# Out of scope

- Een EN-versie (launch-plan is EN-first; Erik koos 2026-08-20 bewust NL eerst)
- Een `/marketing/resources`-index — er zijn straks twee pagina's, dat is nog geen hub
- Show HN, Product Hunt, outreach naar Caio Pizzol, npm-publish van de validator
- Wijzigingen aan de generator, de scan-pipeline of het scoremodel
- De rate-limit-verhoging uit launch-kit §1.3 (hoort bij een launch-datum, niet bij een artikel)

# Notes

- Branddock-workspace (prod, via MCP): `cmrrgfox0000009j3vhyjnpea`
- Deliverable: `cmt152esi000304l1jp5duzva` · job `cmt152evu000404l1a8fqb6jh`
- Live geverifieerd 2026-08-20: `branddock.app/brandmd` en `/brandmd/use` geven beide 200

## Uitkomst van de dogfooding — de pipeline schreef het verkeerde artikel

De long-form-pipeline draaide af (8/8, ±35 min, 2.664 woorden). **Structureel sterk,
inhoudelijk niet publiceerbaar.** Gemeten, niet aangenomen:

| Bevinding | Bewijs |
|---|---|
| 6 interne links verzonnen | `/f-val` `/mcp` `/pilot` `/merk-dna` `/brand-md-sjabloon` `/blog/...` — **alle 6 een 404** |
| "F-VAL van 61 naar 84", 3× als pilotmeting gepresenteerd | geen enkele bron in `docs/` |
| "+12 punten op nieuwsbrieven" | `pilot-hermeting-2026-07-21.md` zegt zelf: *"tegen de nieuwe baseline is dit +9,5; bijstellen"* |
| Verzonnen casus ("B2B-SaaS-founder, één middag, 61 → 84") | dat is persona **Jesse Kramer**, geen klant — publiceren zou een vals testimonial zijn |
| Omarm-strategie | Caio Pizzol, MIT en spec v0.3.0 komen **niet voor**; het stuk presenteert de standaard impliciet als de onze |
| De gratis generator | **niet genoemd**; de CTA was "Vraag een pilot aan" naar een 404 |

Dat laatste is de kern: de pipeline schreef precies het artikel dat de omarm-strategie
(launch-plan v2 §3) moet vóórkomen — de kaper-rol, met een ongedekte "eerste Nederlandse
platform"-claim erbij.

**Aanpak**: pipeline-output als grondstof, niet als eindtekst — de mitigatie die vooraf in
Risico's stond. Overgenomen: de FAQ-vraagvormen (antwoorden herschreven op geverifieerde
feiten) en de sectie "wat het niet oplost". Niet overgenomen: elk cijfer, elke link, de
casus en het framing.

**De les is generaliseerbaar**: de pipeline kent de merkstem wél (de toon klopte) maar de
merk*strategie* niet. Wat in `docs/marketing/` staat, bereikt de generatie niet. Voor elk
volgend strategisch stuk geldt dus: pipeline voor structuur en SEO, mens voor de claims.

## F-VAL op de eindtekst

| Meting | Score | Verdict | Baseline-positie |
|---|---|---|---|
| Eerste versie | 78 | AI_LEANING | 31 |
| Na verwerking van de bevindingen | 92 | TOP_TIER | 6 |
| Na Eriks review (FAQ + CTA's) | **93** | **TOP_TIER** | **6** |

Weggewerkt: 7 em-dash-treffers (Engels patroon in NL), `indrukwekkend` 2× (buzzword-adjectief,
HIGH/hard), `10 procent` zonder bron (schijnprecisie, hard), en op de tweede ronde ook
"honderdduizenden sites" — dezelfde klasse, door de judge aangewezen.

⚠️ **Beide scores zijn op TWEE van de drie pijlers gemeten.** De stijl-pijler had gewicht 0
(`voiceSimilarity: null`, `declaredSignalCount: 0`). Nagemeten op prod, en het is **niet** de
styleguide: die staat op `published = true` met 9 regels. De **voiceguide** is niet
gepubliceerd (`publishedAt` null) en heeft **geen centroid** (`centroidEmbedding` null) —
terwijl er wel 6 `wordsWeUse` en 5 `wordsWeAvoid` in staan. Eigen actiepunt voor Erik: het
eigen merk scoort zichzelf op 2/3 pijlers.

## Reviewronde Erik (2026-08-20)

Drie punten, alle drie terecht:

1. **FAQ-styling weekt af.** Ik bouwde statische kaarten; de site heeft al twee FAQ's
   (homepage en pricing) die allebei `<details>`/`<summary>` met een roterende
   `ChevronDown` gebruiken. Omgezet naar het homepage-patroon (`divide-y`-lijst).
2. **De trial-regel hing aan de verkeerde knop.** `TrialNote` stond onder een rij van drie
   knoppen, terwijl de primaire knop juist het **gratis, accountloze** pad is. De microcopy
   beloofde dus een trial bij een actie waar geen account aan te pas komt. Slot-CTA herbouwd
   als twee kolommen: gratis pad met "Gratis · geen account nodig", betaald pad met `TrialNote`.
3. **Geen CTA halverwege.** Toegevoegd na "Wat er in het bestand staat" — daar weet de lezer
   wát hij krijgt, dus dat is het natuurlijke conversiemoment.

## Bijvangst: CLAUDE.md geeft achterhaald CSS-advies

`CLAUDE.md` zegt nog: *"Voor missende utilities: append regel aan `src/index.css`"*. Sinds
PR #323 (18-08) is dat bestand een echte bron met `@import "tailwindcss"`, en het bestand
zelf zegt: *"Voeg hier GEEN handgeschreven utility-klassen toe."* Het advies stuurt een
volgende sessie regelrecht tegen ADR `2026-08-18-tailwind-bronpijplijn.md` in. Niet in deze
taak gerepareerd (buiten scope), wel gemeld.
