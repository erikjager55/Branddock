# Voice Fingerprinting WS2 — Drift Measurement Protocol

**Versie**: v0.3 — pre-registratie (amendment vóór WS3 stap 3 scoring)
**Datum**: 2026-05-05
**Status**: pre-registratie — vastgelegd in git VÓÓR enige scoring of A.1-A.4 implementatie. Wijzigingen na deze commit vereisen expliciete versie-bump met motivatie.

---

## TL;DR

Wat we testen: of huidige Brand Voice Directive (BVD) drift vertoont op 3K-woord long-form output, en of vier propagation-fixes (A.1-A.4) die drift significant reduceren — **zonder dat we de stem geforceerd of opgelegd-stilistisch maken**.

Wat we NIET testen: of een nieuw voice-schema (oorspronkelijke Route A, nu A.5) beter werkt dan BVD. Schema-uitbreiding is post-launch beslissing en methodologisch geen terugvaloptie als A.1-A.4 onvoldoende blijkt — zie §5 branch (c).

Resultaten landen in één van drie pre-gespecificeerde branches die elk naar een andere strategische conclusie leiden. Branches zijn vóór scoring vastgelegd om post-hoc rationalisatie uit te sluiten.

---

## §1 Rubriek-dimensies (4 dimensies, 5-punts Likert)

Schaalkeuze 5-punts (1=poor, 2=below brand, 3=acceptable, 4=on-brand, 5=exemplary). Reden: bij ≤4 raters per brand × 12 stukken per conditie produceert een 1-10 schaal méér rater-variantie dan signaal. 5-punts comprimeert ratings naar interpreteerbare zones. Conventie in stylistic-judgment-research is 5- of 7-punt om dezelfde reden.

Totaal per stuk: 4 × 5 = 20 punten max.

### §1.1 Lexicale match

Gebruikt de output het lexicon van het merk?

**Anchor uit data**: `BrandPersonalityFrameworkData.wordsWeUse[]` en `wordsWeAvoid[]` (zie [framework.types.ts:333-334](../src/features/brand-asset-detail/types/framework.types.ts)).

**Operationalisering**: per stuk telt de rater (a) hoeveel "use"-woorden contextueel-natuurlijk landen vs. ontbreken waar ze hadden gepast, en (b) hoeveel "avoid"-woorden voorkomen.

**Anchors**:
- 5 = "use"-woorden landen natuurlijk waar relevant, 0 "avoid"-woorden
- 3 = "use"-woorden gemixt aanwezig/afwezig, 1-2 "avoid"-woorden
- 1 = "use"-woorden afwezig én/of mechanisch gestapeld + meerdere "avoid"-woorden

**Belangrijke nuance**: mechanisch word-stuffing scoort niet hoog. De rubric beloont natuurlijke deployment van brand-vocabulary, niet count-maximisatie.

### §1.2 Tone-consistentie (kerndrift-meting + tweezijdige hypothese)

Drift dit door de output heen, in beide richtingen — zowel naar generiek-LLM ALS naar geforceerd-gestileerd?

**Operationalisering**: splits output in 3 gelijke segmenten (begin/midden/einde). Rater scoort tone-match aan brand-target per segment op de 4 NN/g-dimensies die Branddock al gebruikt:
- formal ↔ casual
- authoritative ↔ conversational
- warm ↔ clinical
- journalistic ↔ persuasive

Score = laagste segment-score (niet gemiddelde). Drift zit in de zwakste plek.

**Anchors**:
- 5 = alle 3 segmenten ≤1 punt afstand van target én onderling, stem voelt natuurlijk geïntegreerd
- 3 = midden of eind drift ≥1 punt richting generiek-LLM, OF stem voelt geforceerd toegepast
- 1 = ≥2 segmenten zijn generieke marketing-LLM-stem, OF stem leest als caricature/checklist-afwerking

**Tweezijdige hypothese — expliciete rater-instructie** (toegevoegd v0.2):

> Score Tone-consistentie **lager** wanneer de stem geforceerd of opgelegd-stilistisch aanvoelt. Drift naar caricature is óók drift, maar in tegengestelde richting van generiek-LLM-drift. Vraag jezelf: "Voelt deze stem als de auteur die natuurlijk schrijft, of als een AI die een voice-checklist afwerkt?" Forceer-drift krijgt zelfde score-penalty als generiek-drift.

Dit is essentieel omdat A.3 (mid-prompt voice-reinforcement) een tweezijdige hypothese is: drift-reductie is gewenst, maar geforceerde/gestileerde output is een mogelijk neveneffect dat hier wordt gecontroleerd.

**Dit is de kerndimensie waar conditie B vs conditie A het zichtbaarst zou moeten verschillen.**

### §1.3 Anti-pattern aanwezigheid

Komen "niet ons"-patronen of generieke LLM-tics voor?

**Drie bronnen**:
- **A. Brand-specifieke anti-patterns** (uit `weSayNotThat[]` + `wordsWeAvoid[]` op de Brand Personality canonical asset). **Weight 3×.**
- **B. Generieke LLM-tells** (10-pattern lijst hieronder, op basis van Erik's observaties uit ≥1 jaar Branddock-output). **Weight 1×.**
- C. Tweezijdige drift (geforceerde voice). Niet hier dubbel meegenomen — zie §1.2.

Tellen per 1000 woorden output.

**Generieke LLM-tells (v0.2, finalized lijst)**:

| # | Patroon | Voorbeelden |
|---|---|---|
| 1 | **Wereld-in-verandering openers** | "In een wereld die steeds sneller verandert…", "In het huidige digitale landschap…", "In deze dynamische tijd…", "Tegenwoordig is het belangrijker dan ooit…", "In een tijd waarin…" |
| 2 | **Niet-alleen-maar-ook-constructies** | "Het is niet alleen X, maar ook Y", "We bieden niet slechts X, we bieden Y", "[brand] is niet zomaar X, het is Y" |
| 3 | **Voor-iedereen-die-X-of-Y formuleringen** | "Of je nu een ZZP'er bent of een grote organisatie…", "Of het nu gaat om kleine teams of complexe projecten…", "Of je nu starter bent of doorgewinterde professional…" — duidt op AI die geen specifieke doelgroep durft te kiezen |
| 4 | **Marketing-jargon dat in geen echt gesprek voorkomt** | Generiek: "innovatieve oplossingen", "schaalbare strategieën", "next-level resultaten", "doelgerichte aanpak", "naadloze integratie", "krachtige tools", "duurzame groei". Nederlands B2B-specifiek: "ontzorgen", "meedenken", "het verschil maken", "samen sterker", "uw stip op de horizon" |
| 5 | **Hedge-zinnen die niets toevoegen** | "Het is belangrijk om op te merken dat…", "Het is goed om te beseffen dat…", "Wat we niet uit het oog moeten verliezen is…", "Een belangrijk punt om mee te nemen is…" |
| 6 | **Conclusie-openers per sectie** | "Concluderend…", "Tot slot…", "Samenvattend kunnen we stellen dat…", "Al met al…" — vooral problematisch in long-form omdat AI elke sectie wil afsluiten met een mini-conclusie (5-7 conclusies per stuk) |
| 7 | **Drieledige opsommingen waar twee of vier zou kloppen** | "Snel, betrouwbaar en effectief", "Helder, scherp en op de man af", "Duurzaam, schaalbaar en toekomstbestendig" — triple-pattern is bijna een fingerprint |
| 8 | **Stel-je-voor openers en hypothetische lezer** | "Stel je voor: een klant belt op vrijdagmiddag met…", "Beeld je in dat je collega zegt…", "Denk eens aan de laatste keer dat je…" — incidenteel goed, maar AI gebruikt het structureel |
| 9 | **Wij-bij-X-geloven proclamaties** | "Bij [brand] geloven we dat…", "Wij van [brand] vinden dat…", "Hier bij [brand] staan we voor…" — uitgesleten brand-stem-variant; vorm is brand-specifiek maar als anti-pattern over alle merken generiek |
| 10 | **Em-dash-overschot + vraag-antwoord-zinnen** | "De oplossing — en dit is cruciaal — ligt in…", "Onze aanpak (uniek in zijn soort) zorgt voor…", "Het resultaat? Een ervaring die…" — em-dashes en parenthese-zinnen ver boven natuurlijke frequentie, vraag-antwoord constructie als specifieke fingerprint |

Bron: Erik's observaties uit Branddock-output 2025-2026, gedocumenteerd dag 2 van WS1.

**Anchors**:
- 5 = 0 brand-specifieke + ≤1 generieke per 1000w
- 4 = 0-1 brand-specifieke + 2-3 generieke per 1000w
- 3 = 1-2 brand-specifieke OF 3-4 generieke per 1000w
- 2 = 2-3 brand-specifieke OF 5 generieke per 1000w
- 1 = ≥3 brand-specifieke OF ≥6 generieke per 1000w

**Bij ambiguïteit**: rater verplicht een tekst-citaat noteren dat de score onderbouwt. Geen ankerloze cijfers.

### §1.4 Ritme & structuur

Cadans en retorische bewegingen.

**Anchor uit data**: `BrandPersonalityFrameworkData.spectrumSliders` (concise↔expansive), `writingSample`, en — als die er is — een snelle handmatige extractie van merk-corpus (zinslengte-mediaan, opening-pattern).

**Operationalisering**: 2 sub-checks.
- (a) Sentence-length distributie van output ligt binnen ±25% van merk-baseline (mediaan + std).
- (b) Subjectief: gebruikt het output-stuk merk-typische retorische bewegingen (bv. WRA: hierarchische-met-citaten, LINFI: technisch-narratief), of valt het terug op LLM-default 5-paragraaf-essay?

**Anchors**:
- 5 = beide (a) én (b) raken merk
- 3 = één raakt, ander drift
- 1 = generiek LLM-default in beide

### §1.5 Inter-rater reliability (per dimensie)

Cohen's weighted kappa (κ) over 2 raters × 12 stukken = 24 paren per conditie.
- κ ≥ 0.6 → dimensie is signaalgevend. Score telt mee in branch-beslissing.
- κ 0.4-0.6 → grijs, score telt half mee in branch-beslissing.
- κ < 0.4 → ruis, dimensie uit branch-beslissing gehaald, gemarkeerd voor rubric-revisie in eventuele v3.

---

## §2 Content-types per brand (2)

Twee content-types, beide 3.000 woorden, identieke topic-brief tussen condities.

- **Case study** (structureel format) — test structurele drift. Brief: bestaande klantsituatie van het merk (geanonimiseerd) of een gefabriceerde maar plausibele.
- **Thought leadership / opinie-stuk** (narratief format) — test narratieve drift. Brief: één scherpe opinie binnen het merk-domein die niet in eerder gepubliceerd materiaal voorkomt (anders herhaalt het model bestaand corpus).

Bewust géén derde length-control (1.5K) in v1. Reden: scope-controle. Als v1 drift bevestigt, draai v2 met length-gradient (1K/2K/3K/4K) om in te zoomen op waar het kantelt.

3 merken × 2 content-types × 2 condities = 12 stukken te genereren. Met 2 raters per stuk = 24 ratings per conditie (48 totaal).

---

## §3 Rater-protocol

### §3.1 Samenstelling per merk (minimaal 2 raters)

- **Rater 1**: merk-eigenaar voor LINFI / Nobox / WRA Juristen waar mogelijk. Zij zijn ground truth voor "voelt dit als ons?". Voor merken waar dit niet lukt: agency-strateeg die het merk al ≥3 maanden actief bedient.
- **Rater 2**: Branddock-medewerker zonder directe betrokkenheid bij de setup van dit specifieke merk. Pragmatische invulling — niet volledig extern, wel niet-self-correcting op het specifieke merk.

### §3.2 Erkende asymmetrie & limitation (toegevoegd v0.2)

**Pre-registreerd als bekende limitation**: Rater 2 (Branddock-medewerker) deelt organisatorische context met de rest van het Branddock-team. Mogelijke bias richting het narratief "voice-drift in long-form" (de hypothese die we testen). Niet uit te sluiten zonder externe paid copywriter — niet beschikbaar in deze WS2 binnen tijdlijn.

Eerlijker dan doen alsof rater 2 volledig extern is. Indien WS2 v2 nodig is, externe rater rekruteren.

### §3.3 κ apart per rater-type-paar (toegevoegd v0.2)

Naast de overall κ uit §1.5: bereken specifiek κ tussen merk-eigenaar (extern) en Branddock-medewerker (intern), vergeleken met κ binnen Branddock-medewerkers uit de kalibratie.

**Diagnostisch criterium**:
- Als κ_extern-vs-intern systematisch lager is dan κ_intern-vs-intern → signaal dat Branddock-raters een gedeelde bias hebben. Externe oordelen verdelen anders.
- Niet exclusiekriterium — wel input voor branch-interpretatie.

### §3.4 Asymmetrische weging in branch-criteria (toegevoegd v0.2)

Conditioneel op rater-1-type:
- **Wanneer rater 1 = merk-eigenaar**: gewogen score = 60% eigenaar + 40% Branddock-medewerker. Reden: eigenaar IS de klant die "voelt dit als ons?" beantwoordt; medewerker is methodologische support, geen primaire beslisser.
- **Wanneer rater 1 = agency-strateeg** (eigenaar niet beschikbaar): 50/50. Beide raters zijn dan effectief "intern" qua afstand tot merk-perceptie; asymmetrische weging mist grondslag.

Per-merk configuratie wordt apart vastgelegd in §8 dependencies.

### §3.5 Kalibratie vooraf

Anders is scoring een meting van rater-bias, niet drift.

- 2 kalibratie-stukken per merk: één historisch hand-gepicked als "clearly on-brand", één gegenereerd door GPT zonder enige voice-instructie als "clearly off-brand".
- Alle raters scoren beide blind. Verschil tussen raters per dimensie ≤1 punt → kalibratie geslaagd.
- Verschil ≥2 → eerst rubric-discussie tussen raters om operationalisering aan te scherpen, herhaal kalibratie. Pas na geslaagde kalibratie op echte outputs scoren.

### §3.6 Rater-framing voor outreach (toegevoegd v0.2)

Gebruik bij benadering van LINFI / Nobox / WRA-eigenaars de volgende framing:

> "We testen of we voice-instructies beter kunnen overdragen aan onze AI — geen nieuw systeem maar verbetering aan de bestaande motor."

Deze framing kalibreert verwachting correct: de scope is propagation-mechaniek, niet schema-uitbreiding. Voorkomt mismatch tussen wat raters verwachten en wat ze beoordelen.

### §3.7 Blind-procedure

- Outputs gelabeld "A" en "B", random toewijzing per merk-content-type combinatie. Toewijzing vooraf vastgelegd in een sealed CSV (niet zichtbaar voor raters tot na scoring).
- Raters zien geen voice-object, geen BVD-tekst, geen condition-label.
- Generatie-metadata (model, temperatuur) verborgen.

---

## §4 Prompt-template (identiek behalve voice-injectie)

```
[SYSTEM]
{voice_section}    ← varieert per conditie
{rest_of_brand_context}    ← identiek: brand foundation snapshot, persona, product context
{content_type_guidance}    ← identiek: type-specifieke prompt uit bestaande prompt-templates/

[USER]
Write a {content_type} for {brand} about: {topic}.
Audience: {persona_summary}.
Length: 3,000 words.
{structure_constraints}    ← case study: 5 sections; thought leadership: free narrative
```

### §4.1 Conditie A: huidige BVD (baseline)

`voice_section` = output van bestaande `buildBrandVoiceDirectiveFromContext()` ([brand-voice-directive.ts:74](../src/lib/studio/brand-voice-directive.ts)) voor die workspace, ongewijzigd. Geïnjecteerd eenmalig bovenaan system prompt.

### §4.2 Conditie B: BVD + A.1-A.4 propagation-fixes (HERZIEN v0.2)

`voice_section` = `buildBrandVoiceDirectiveFromContext()` + vier propagation-modificaties. **NIET een nieuw schema, NIET een uitgebreid voice-object.** Schema blijft `BrandPersonalityFrameworkData` (25+ velden, ongewijzigd). Wijzigingen zitten in injectie-mechaniek:

- **A.1 Channel-tone extraction**: in BVD-output, vervang referentiële instructie ("match the channel-specific communication style defined in the brand personality above") door directe insert van `data.channelTones[channelKey]` voor de actieve deliverable. Verwijder de andere 4 kanalen uit het prepended personality-blok.
- **A.2 Voice-bron deduplicatie**: precedence-regel canonical Brand Personality > Brandstyle Analyzer tone-of-voice. Bij conflict: alleen Brand Personality. Bij complementariteit: merge met label "Stylistic refinement: …". Voorkomt dubbele blokken in de prompt.
- **A.3 Mid-prompt voice-reinforcement**: voor 7 long-form types (whitepaper / case-study / blog-post / ebook / one-pager / pillar-page / research-paper / resource-guide), voeg sectie-niveau voice-anchor toe in de templates ([long-form.ts](../src/lib/studio/prompt-templates/long-form.ts)). Bij elke ## H2-sectie een korte herinnering aan dominant voice-trait (1-2 zinnen, niet meer).
- **A.4 End-of-prompt voice-summary**: voor long-form, na de structure-skeleton, een "## VOICE CHECK BEFORE OUTPUT"-blok dat top-3 voice-instructies herhaalt (primary trait, top-3 woorden-we-gebruiken, top anti-pattern uit `wordsWeAvoid`). Dichtst bij output-tokens om position-decay te mitigeren.

A.5 (schema-uitbreiding) is **niet** onderdeel van conditie B en **niet** een fallback — zie §5 branch (c).

### §4.3 Generation parameters (identiek beide condities)

- Model: Opus 4.7 (`claude-opus-4-7`)
- Temperatuur: default
- max_tokens: 4096
- Brand context: identiek (BrandContextBlock uit `getBrandContext()`)
- Persona, product, content-type-prompt, user-brief, structuur-constraints: identiek

Per conditie+topic: **één** generatie (niet median-of-3). Reden: stochastische variantie binnen één model+temperatuur is bij Opus 4.7 op long-form klein genoeg t.o.v. de inter-conditie-variantie die we willen meten. Als WS2 inconclusive blijkt, run v2 met n=3 per cel.

---

## §5 Acceptatiecriteria — falsificatie-branches

Score per stuk = som 4 dimensies × 5 = max 20. Per conditie middelen we over 12 ratings (2 content-types × 3 merken × 2 raters), met asymmetrische weging per §3.4.

### Branch (a) — geen drift met huidige BVD

**Criteria** (alle drie tegelijk):
- Conditie A (BVD baseline) mean ≥ 16/20 (80%)
- §1.2 Tone-consistentie sub-score ≥ 4 in conditie A
- Conditie B tilt < 1.5 punten boven A

**Conclusie**: huidige BVD is voldoende voor long-form bij Opus 4.7. Voice-investering verschuift naar fidelity-validatie (WS3) en andere prioriteiten. A.1-A.4 niet bouwen voor productie.

### Branch (b) — drift met BVD, niet met propagation-fixes

**Criteria** (alle vier tegelijk):
- Conditie A mean 12-16/20 (60-80%)
- Conditie B mean ≥ 16/20
- Conditie B tilt ≥ 1.5 punten boven A
- 2 raters eens over richting bij ≥ 9/12 stukken

**Conclusie**: A.1-A.4 propagation-fixes leveren measurable verbetering. Bouwen voor productie. Route B (fine-tuning) parken tenzij premium-segmentatie expliciet voice-zware reasoning-lichte content nodig heeft.

### Branch (c) — drift in beide condities (HERZIEN v0.2)

**Criteria** (beide tegelijk):
- Conditie B mean < 16/20
- §1.2 Tone-consistentie sub-score < 4 in beide condities (drift is structureel, niet conditie-afhankelijk)

**Conclusie** (expliciet pre-geregistreerd om post-hoc rationalisatie uit te sluiten): **voice-drift is via propagation-mechaniek niet oplosbaar.**

Echte conclusies — kies één:
1. **Accepteer huidige drift** als ondergrens van wat propagation kan leveren. Geen verdere voice-investering tot evidence anders zegt.
2. **Onderzoek Route B** (fine-tuning Llama/Mistral) met expliciete erkenning dat dat Claude's reasoning inruilt voor voice-consistentie. Voor smal segment "voice-zwaar, reasoning-licht" content.

**Wat branch (c) NIET betekent**: A.5 (schema-uitbreiding, oorspronkelijke Route A) is niet de terugvaloptie. Schema is in WS1-audit aangetoond als rijk en compleet (zie [voice-fingerprinting-ws1-audit.md](voice-fingerprinting-ws1-audit.md)). Extra velden toevoegen zonder geverifieerd schema-tekort is post-hoc rationalisatie en methodologisch ongeoorloofd.

### Inconclusief (geen van bovenstaande)

- Score-spread tussen condities < 1 punt en tone-consistentie ambigu, OF
- κ < 0.4 op meerdere dimensies, OF
- Grote tussen-merk-variantie maskeert tussen-conditie-effect

**Actie**: refine rubric, expand sample (verdubbel content-types of n=3 per cel), herhaal als WS2 v2. Géén Route A/B beslissing op inconclusieve data.

---

## §6 WS3 — Disagreement-meting (parallel workstream)

### §6.1 Doel

Meten of mStyleDistance embedding-afstand additieve informatie geeft t.o.v. de bestaande quality-scorer Voice-dimensie (25% weight in `quality-scorer.ts`). Zo niet, is een fidelity-score gebaseerd op style-embeddings dubbel werk en hoeft pijler 1 in F-VAL niet te worden gebouwd.

### §6.2 Scope (HERZIEN v0.2 op basis van DB-check)

DB-check op 2026-05-05 wees uit dat alleen LINFI long-form content heeft (27 stukken, 3 approved). WRA Juristen en Nobox: 0 deliverables. Aggregate Branddock-totaal: ~40 long-form over 6 workspaces.

**Gekozen scenario**: scenario B uit WS1-audit-discussie — multi-workspace pool met LINFI als brand-anker.

- LINFI 27 stukken: split 14 als brand-corpus (centroid-training) + 13 als test-set (brand-relatieve mStyleDistance)
- Overige 13 stukken uit Napking, Branddock Demo, People Masterminds, Zwarthout, Better brands: pure stylistic distance zonder brand-centroid
- **Totale pool**: ~40 stukken, ~6 brands

### §6.3 Approved-status losgelaten (HERZIEN v0.2)

Voor een correlation-meting tussen twee scoring-mechanismen op hetzelfde stuk doet approval-status niet mee. Inclusion: alle Deliverables met daadwerkelijk gegenereerde content (ongeacht status DRAFT / IN_PROGRESS / APPROVED / PUBLISHED).

Pre-registratie noteert deze ruimere inclusion expliciet om te voorkomen dat we later het verhaal aanpassen.

### §6.4 Disagreement-criterium (HERZIEN v0.3 op basis van WS3 stap 2 score-distributie)

WS3 stap 2 (commit `fce7bb6`, 2026-05-05) toonde dat de quality-scorer Voice-dimensie op n=16 long-form pieces slechts **3 unieke score-waarden** produceert (72, 78, 88). Claude Sonnet als scorer kiest ronde getallen — beperkte score-resolutie. Bij die thin distribution + n=16 is Pearson r overgevoelig voor ties en ruis: de coëfficiënt zwiept op kleine veranderingen en pusht makkelijk naar inconclusief-bucket ongeacht onderliggende waarheid.

Pre-registratie corrigeert dit **vóór stap 3 draait** — geen post-data tweaking. Deze amendment is gedaan met v0.2 commit `446f92b` als baseline en stap 3 + 4 nog niet gestart.

**Primair signaal: kwalitatieve disagreement-case inspectie**.

Voor elk stuk in de pool, vergelijk de twee genormaliseerde scores (quality-scorer Voice-dim 0-1, mStyleDistance similarity 0-1). Stukken waar de verschillende mechanismen **substantieel verschillen** — gedefinieerd als (a) verschil > 1 standaarddeviatie van de mean delta, of (b) opposite direction t.o.v. brand-anchor — worden als disagreement-cases gemarkeerd. Per case: stuk-id, beide genormaliseerde scores, content-snippet (eerste 500 woorden), beide explanations.

Twee onafhankelijke reviewers (rater 1 + rater 2 uit §3) lezen alle disagreement-cases en bepalen kwalitatief of het mStyleDistance signaal additief informatie levert die de quality-scorer mist, of dat het inconsistent is met de brand-perception. Beslissing op die kwalitatieve grond, gedocumenteerd.

**Secundair signaal: dual-correlation als directional indicator**.

Beide statistieken rapporteren — geen single-number gate meer.

| Metric | Functie |
|---|---|
| Pearson r | Lineaire correlatie. Bekend gevoelig voor ties bij thin distribution; bewust niet leidend bij n=16 + 3 unique values. |
| Spearman ρ | Rank correlation. Robuust voor ties en ordinal data. **Primaire correlation-metric** bij thin distribution. |

Spearman ρ is leidend voor directional interpretation. **Geen threshold-based branch decisie meer** — de kwalitatieve inspectie hierboven vervangt die rol.

| Spearman ρ | Directional richting (NIET conclusief alleen) |
|---|---|
| > 0.7 | Sterk gecorreleerd → kwalitatieve inspectie waarschijnlijk bevestigt redundantie |
| 0.4 – 0.7 | Matig — geen sterke richting, kwalitatieve inspectie volledig leidend |
| < 0.4 | Zwakke correlatie → kwalitatieve inspectie waarschijnlijk bevestigt additief signaal |

Onder n=16 met thin Pearson-distributie is een zelfstandige threshold-based correlation conclusie methodologisch niet verdedigbaar. Mixed-method (kwalitatief primair + correlation secundair) sluit aan bij gebruiker-keuze optie 4 uit pool-scope discussie.

### §6.5 Implementatie

mStyleDistance pipeline: 1-2 dagen bouwwerk (model download, corpus embedding, centroid berekening, scoring functie). Onderdeel van WS3-setup, niet F-VAL bouwwerk.

---

## §7 Pre-registratie & post-hoc rationalisatie-discipline

### §7.1 Wat is pre-geregistreerd

Door git-commit van dit document vóór enige scoring of A.1-A.4 implementatie:
- Rubriek (4 dimensies, 5-punts schaal, anchors per dimensie)
- Tweezijdige hypothese A.3 (rater-instructie in §1.2)
- 10-pattern generic LLM-tells lijst (§1.3)
- Brand-specific anti-patterns weight 3× (§1.3)
- Rater-protocol incl. asymmetric weging 60/40 vs 50/50 (§3.4)
- κ-criteria per dimensie en per rater-type-paar (§1.5, §3.3)
- Branch-criteria (§5) met expliciete clarificatie dat A.5 GEEN fallback is
- WS3 scope: scenario B, LINFI-anchored, approved-status losgelaten (§6)
- Random-toewijzing A/B-labels in sealed CSV vooraf

### §7.2 Wat NIET wijzigbaar is na commit

Na pre-registratie commit zonder versie-bump met motivatie:
- Anchors per dimensie
- Branch-criteria thresholds voor WS2 (16/20, 1.5 punten). WS3 correlation thresholds zijn in v0.3 omgezet naar directional indicators voor Spearman ρ; de primaire WS3-beslissing rust op kwalitatieve disagreement-case inspectie (zie §6.4)
- Inclusion-criteria voor WS3 pool
- Rubric-dimensies of weging

### §7.3 Wel wijzigbaar (ook zonder versie-bump)

- Specifieke topic-keuze per merk-content-type combinatie (operationeel, niet methodologisch)
- Random-toewijzing CSV (vooraf, eenmaal vastgelegd, niet aanpasbaar tijdens scoring)
- Rater-bezetting binnen §3.1 categorie (eigenaar of agency-strateeg of Branddock-medewerker)

### §7.4 Post-hoc rationalisatie blocklist

Concreet wat we niet doen na het zien van de data:
- ❌ A.5 alsnog bouwen "omdat het toch nuttig kan zijn" → branch (c) leidt naar acceptatie of Route B, niet schema-uitbreiding
- ❌ Branch-thresholds aanpassen om in een andere branch uit te komen
- ❌ Dimensies uit branch-beslissing weghalen omdat ze "tegen" de hypothese werken
- ❌ Inconclusieve resultaten als "neigt naar branch (b)" interpreteren

---

## §8 Open afhankelijkheden & sequence

### §8.1 Geleverd (binnen op 2026-05-05)

- ✅ WS3 scenario-keuze: scenario B
- ✅ Generieke LLM-tells lijst (10 patterns, geïntegreerd in §1.3)
- ✅ Brand Foundation completeness-check + APPROVED count (Erik, separately)
- ✅ Rater-bevestigingen LINFI / Nobox / WRA (Erik, separately — per-merk configuratie volgt)

### §8.2 Per-merk configuratie (vast te leggen vóór generatie)

| Merk | Rater 1 (extern/intern) | Rater 2 (intern) | Weging A/B |
|---|---|---|---|
| LINFI | TBD: eigenaar of agency-strateeg | TBD Branddock-medewerker zonder LINFI-betrokkenheid | 60/40 of 50/50 |
| Nobox | TBD: eigenaar of agency-strateeg | TBD Branddock-medewerker zonder Nobox-betrokkenheid | 60/40 of 50/50 |
| WRA Juristen | TBD: eigenaar of agency-strateeg | TBD Branddock-medewerker zonder WRA-betrokkenheid | 60/40 of 50/50 |

Vul in zodra rater-bevestigingen finaal zijn.

### §8.3 Implementatie-pad

Na pre-registratie commit:
1. **Dag 3-4**: A.1-A.4 candidate implementatie. Research-tooling, niet F-VAL bouwwerk. Doel: conditie B genereerbaar maken voor WS2-generatie.
2. **Parallel dag 3-4**: WS3 setup (mStyleDistance pipeline ~1-2 dagen).
3. **Dag 5-6**: Generatie 12 stukken (3 merken × 2 content-types × 2 condities). Random A/B-toewijzing CSV vastleggen.
4. **Dag 5-9**: Scoring door 2 raters per stuk. Kalibratie eerst, dan blinde scoring. WS3 disagreement-meting in parallel.
5. **Dag 10-11**: Synthese, branch-beslissing, scope-conclusie F-VAL.

### §8.4 Wat dit document niet bepaalt

- F-VAL architectuur: wacht op WS2 + WS3 outputs
- Replicate text fine-tune economics: geparkeerd tot branch (c)
- WS2 v2 design: bij inconclusief uitkomen herzien

---

## §9 Geraakte bestanden & referenties

- WS1-audit: [voice-fingerprinting-ws1-audit.md](voice-fingerprinting-ws1-audit.md) (2026-05-05)
- BVD utility: [src/lib/studio/brand-voice-directive.ts](../src/lib/studio/brand-voice-directive.ts)
- Brand context: [src/lib/ai/brand-context.ts](../src/lib/ai/brand-context.ts)
- Long-form templates: [src/lib/studio/prompt-templates/long-form.ts](../src/lib/studio/prompt-templates/long-form.ts)
- BrandPersonalityFrameworkData type: [src/features/brand-asset-detail/types/framework.types.ts](../src/features/brand-asset-detail/types/framework.types.ts) (regels 318-344)

---

## §10 Versiehistorie

- **v0.1** (2026-05-05, inline in chat, niet gecommit): initiele rubriek + 4 dimensies + 5-punts vs 1-10 keuze + 3 content-types + falsificatie-branches.
- **v0.2** (2026-05-05, commit `446f92b`): toegevoegd asymmetrie-erkenning rater 2 (§3.2), κ per rater-type-paar (§3.3), asymmetrische weging (§3.4), rater-framing (§3.6), tweezijdige hypothese A.3 (§1.2), 10 LLM-tells (§1.3), brand-specific weight 3× (§1.3), branch (c) clarificatie geen A.5 fallback (§5), WS2 conditie B redefinitie BVD+A.1-A.4 i.p.v. nieuw schema (§4.2), WS3 scenario B + LINFI-anchored + approved losgelaten (§6.2-6.3), post-hoc rationalisatie blocklist (§7.4).
- **v0.3** (2026-05-05, dit commit): WS3 disagreement-criterium herzien op basis van WS3 stap 2 score-distributie observatie (commit `fce7bb6`: 3 unieke waarden 72/78/88 over 16 pieces — thin distribution noopt tot Spearman ρ + kwalitatieve inspectie als primair signaal). Pearson r en Spearman ρ beide rapporteren; kwalitatieve disagreement-case inspectie wordt primair signaal voor F-VAL pijler 1 beslissing; correlation-thresholds gedegradeerd naar directional indicators (§6.4). §7.2 non-modifiable lijst aangepast om Pearson 0.4/0.7 te verwijderen en kwalitatieve inspectie als de gefixeerde primary methodology vast te leggen. **Pre-data amendment**: WS3 stap 3 (mStyleDistance embeddings) en stap 4 (correlation calc) waren nog niet gestart op moment van deze versie-bump. Modelverificatie `StyleDistance/mstyledistance` op HuggingFace bevestigd in dezelfde sessie (sentence-transformers, xlm-roberta-base, multilingual incl. Nederlands).
