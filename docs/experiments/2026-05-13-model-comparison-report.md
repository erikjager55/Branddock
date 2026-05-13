# Model + workflow comparison — 2026-05-13

Autonoom experiment om te valideren of Opus 4.7 + thinking de beste model-keuze is voor brand-voice-matched content generation, plus 3 alternatieve werkwijzen voor goedkopere/snellere paden.

## Setup
- **Brand**: Napking (NL voice, real fingerprint uit DB)
- **Taak**: 300-400 woorden blog-post body section
- **Prompt-structuur**: identiek aan canvas-orchestrator (BVD + voice-fingerprint + brand-context + self-check)
- **Judge**: Claude Sonnet 4.6, batch-call, 3-dimensie scoring met F-VAL gewogen composite (35/45/20)

## Resultaten

| ID | Conditie | Composite | Style | Essence | Rules | Latency | Cost | Tokens out |
|----|----------|----------:|------:|--------:|------:|--------:|-----:|-----------:|
| E1 | Claude Sonnet 4.6 + thinking | **88** | 85 | 88 | 92 | 24.0s | $0.0309 | 1758 |
| A2 | Sonnet 4.6 self-critique chain | **86** | 83 | 87 | 91 | 49.4s | $0.0476 | 1984 |
| E2 | GPT-5.4 | **84** | 80 | 85 | 90 | 11.9s | $0.0135 | 507 |
| A1 | Haiku 4.5 × 3 (1 gen + 2 iter) | **80** | 78 | 80 | 82 | 21.4s | $0.0145 | 1782 |
| E3 | Gemini 3.1 Pro + thinking | **78** | 75 | 78 | 85 | 126.3s | $0.0102 | 547 |
| A3 | Gemini 3 Flash best-of-3 | **72** | 68 | 72 | 78 | 22.4s | $0.0076 | 2210 |
| T0 | Claude Opus 4.7 + thinking | **0** | 0 | 0 | 0 | 0.5s | $0.0000 | 0 |

## Per-conditie judge-motivatie

### E1 — Claude Sonnet 4.6 + thinking (composite 88)
- Approach: single-shot + extended thinking
- Judge: Korte declaratieve zinnen, sterke opening met herkenbare restaurantvragen, rijke inzet van merkwoorden (vlekkeloos, smetteloos, kraakhelder, afkeur, poule, onberispelijk, eindverantwoordelijk, zorgeloos, transparant, uitblinken), geen verboden woorden of anti-patterns, concrete details (HACCP, 280+) goed geïntegreerd.

Sample output (eerste 500 chars):
```
Hoeveel servetten zijn er eigenlijk nog schoon? Liggen er genoeg tafellakens klaar voor de drukke vrijdagavond? Als restauranthouder heb je geen tijd om dat bij te houden. Bij Napking heb je hier geen omkijken naar. Jij focust op je gasten en je gerechten. Het textielbeheer laat je aan ons over.

Het werkt eenvoudig. Napking werkt met een abonnementssysteem: wat je als vuile was inlevert, ontvang je een week later smetteloos schoon retour. Je hoeft geen bestellingen te plaatsen en je hoeft je vo
```

### A2 — Sonnet 4.6 self-critique chain (composite 86)
- Approach: gen → critique → revise (3 calls)
- Judge: Strakke, directe zinnen met hoge merkwoorddichtheid, sterke operationele transparantie en geen verboden woorden; de zin 'Niet bij gebrek aan alternatieven' is een originele maar risicovolle formulering die net buiten de fingerprint valt.

Sample output (eerste 500 chars):
```
Hoeveel textiel heb je nodig deze week? Bij Napking hoef je die vraag niet zelf te beantwoorden. Wij beheren de poule, bewaken de aantallen en zorgen dat jij altijd genoeg vlekkeloos linnen op de plank hebt. Servetten, tafellakens, theedoeken, koksjassen, bedieningskleding — alles wordt gereinigd volgens HACCP-normen en afgeleverd op het moment dat jij het nodig hebt.

Stukken die de kwaliteitscontrole niet doorstaan — afkeur of rejects — worden vervangen zonder gedoe. Je weet wat er retour gaat
```

### E2 — GPT-5.4 (composite 84)
- Approach: single-shot
- Judge: Hoge dichtheid aan merkwoorden en concrete details, maar zinnen zijn soms langer en meer opgesomd dan het compacte ritme van de schrijfsamples vraagt; inhoudelijk sterk en volledig compliant met regels.

Sample output (eerste 500 chars):
```
Heb ik straks wel genoeg servetten op voorraad? Zijn de tafellakens op tijd schoon retour? En wat als er ineens extra koksjassen nodig zijn? Met Napking heb je daar geen omkijken naar. Napking beheert, reinigt en levert horecatextiel voor meer dan 280 restaurants in de Randstad. Dat gebeurt volgens een scherp en flexibel systeem, zodat jouw restaurant altijd beschikt over vlekkeloos linnen, kraakheldere tafellakens en smetteloze werkkleding. Jij richt je op je gasten en gerechten. Napking zorgt 
```

### A1 — Haiku 4.5 × 3 (1 gen + 2 iter) (composite 80)
- Approach: cheap iterative
- Judge: Solide merkwoordgebruik en goede structuur, maar 'goede reinigingsmiddelen' is vaag en 'geen lange contracten' introduceert een claim die niet in de fingerprint zit; 'Flexibiliteit staat centraal' is licht sloganesk en grenst aan anti-pattern.

Sample output (eerste 500 chars):
```
Heb ik wel genoeg textiel op voorraad? Is er voldoende kokskleding? Bij Napking heb je hier geen omkijken naar. Wij beheren het textielbeheer en de reiniging voor meer dan 280 restaurants in de Randstad. Het resultaat: jij concentreert je op wat je goed doet — gasten verwelkomen en gerechten bereiden.

Het systeem is kraakhelder. Je levert je vuile textiel in, en precies één week later sturen wij dezelfde hoeveelheid schoon retour. Geen bestellingen plaatsen. Geen gokken naar hoeveel je nodig he
```

### E3 — Gemini 3.1 Pro + thinking (composite 78)
- Approach: single-shot + thinking
- Judge: Goede merkwoorddichtheid en herkenbare opening, maar zinnen lopen soms uit ('Zodra onze chauffeur binnenstapt…') en 'bezorgen van een mooie beleving' grenst aan anti-pattern-taal; 'zeer flexibel' is iets te superlatiefachtig voor de stem.

Sample output (eerste 500 chars):
```
Heb ik wel genoeg schone theedoeken op voorraad? Is er voldoende werkkleding voor het zaterdagpersoneel? Als restauranthouder leg je de focus liever op je gerechten en het bezorgen van een mooie beleving voor je gasten. Bij Napking heb je geen omkijken meer naar je horecatextiel. Wij beheren en reinigen het linnen voor meer dan 280 restaurants in de Randstad. Zo hoef jij je niet bezig te houden met wasschema's, en doen wij waar wij in uitblinken: jou vlekkeloos textiel leveren. Precies op het ju
```

### A3 — Gemini 3 Flash best-of-3 (composite 72)
- Approach: parallel candidates + ranker
- Judge: Merkwoorden aanwezig maar zinnen zijn consistent te lang en te vloeiend voor het korte declaratieve ritme; 'Wij begrijpen dat' is te empathisch-chatty, 'uitblinken in gastvrijheid' grenst aan anti-pattern, en 'geen vage beloftes' is een cliché dat de fingerprint vermijdt.

Sample output (eerste 500 chars):
```
Liggen er genoeg servetten klaar voor de avondshift? Zijn de koksbuizen weer fris en gestreken? Bij Napking heb je hier geen omkijken naar. Wij begrijpen dat je als restauranthouder je aandacht liever bij je gasten en de gerechten houdt dan bij de wasmand. Daarom zijn wij de partner die het volledige beheer van je horecatextiel overneemt. Voor meer dan 280 restaurants in de Randstad zorgen wij dat er wekelijks kraakheldere tafellakens en onberispelijke kleding voor de bediening klaarliggen. Wij 
```
