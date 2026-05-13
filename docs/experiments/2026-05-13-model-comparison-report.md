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
| T0 | Claude Opus 4.7 + thinking | **90** | 88 | 90 | 92 | 16.3s | $0.0962 | 862 |
| A2 | Sonnet 4.6 self-critique chain | **86** | 84 | 86 | 91 | 47.5s | $0.0485 | 2030 |
| E1 | Claude Sonnet 4.6 + thinking | **85** | 82 | 85 | 90 | 27.0s | $0.0314 | 1794 |
| E2 | GPT-5.4 | **83** | 80 | 83 | 88 | 11.3s | $0.0129 | 468 |
| A3 | Gemini 3 Flash best-of-3 | **79** | 76 | 79 | 83 | 22.2s | $0.0074 | 2134 |
| A1 | Haiku 4.5 × 3 (1 gen + 2 iter) | **77** | 75 | 78 | 80 | 14.1s | $0.0157 | 2000 |
| E3 | Gemini 3.1 Pro + thinking | **0** | 0 | 0 | 0 | 70.3s | $0.0000 | 0 |

## Per-conditie judge-motivatie

### T0 — Claude Opus 4.7 + thinking (composite 90)
- Approach: single-shot + extended thinking
- Judge: Strak ritme, korte declaratieve zinnen, rijke inzet van merkwoorden (vlekkeloos, smetteloos, kraakhelder, onberispelijk, afkeur, rejects, poule, zorgeloos, transparant, eindverantwoordelijk), concrete details (HACCP, 280+, vaste routes), geen verboden woorden of anti-patterns — de sterkste match met de Voice Fingerprint.

Sample output (eerste 500 chars):
```
Je hebt een restaurant te runnen. Gasten ontvangen, gerechten uitserveren, je team aansturen. Het laatste waar je tijd in wilt steken, is bestellingen plaatsen voor servetten of nagaan of er nog genoeg koksjassen in de kast hangen. Bij Napking hoef je dat ook niet. Wij beheren je horecatextiel van A tot Z, zodat jij je aandacht houdt waar die thuishoort: bij je gasten.

Het werkt via een flexibel abonnementsysteem. Wat je als vuile was inlevert, sturen wij een week later kraakhelder retour. Je h
```

### A2 — Sonnet 4.6 self-critique chain (composite 86)
- Approach: gen → critique → revise (3 calls)
- Judge: Korte, heldere zinnen, goede merkwoorddichtheid (smetteloos, vlekkeloos, kraakhelder, onberispelijk, rejects, poule, zorgeloos, eindverantwoordelijk), duurzaamheidsparagraaf goed ingebed als praktijk niet als deugd, geen verboden woorden — kleine zwakte: iets minder concrete operationele details (geen vaste routes/schema vermeld).

Sample output (eerste 500 chars):
```
Heb ik genoeg schone servetten voor het weekend? Liggen er voldoende tafellakens klaar voor die grote reservering? Als restauranthouder heb je wel wat anders aan je hoofd. Bij Napking heb je hier geen omkijken naar. Wij beheren je horecatextiel van begin tot eind — zodat jij je aandacht kunt houden bij je gasten en je gerechten.

Het systeem is eenvoudig en transparant. Wat je als vuile was inlevert, ontvang je een week later smetteloos schoon retour. Geen bestellingen plaatsen, geen voorraad bi
```

### E1 — Claude Sonnet 4.6 + thinking (composite 85)
- Approach: single-shot + extended thinking
- Judge: Goede vraagopening, consistent gebruik van merkwoorden (smetteloos, kraakhelder, onberispelijk, afkeur, poule, zorgeloos, transparant, uitblinkt, eindverantwoordelijk), iets langere zinnen dan T0 maar nog steeds strak; geen verboden woorden, lichte zwakte dat 280+ pas impliciet blijft.

Sample output (eerste 500 chars):
```
Hoeveel textiel heb je volgende week nodig? Hoeveel tafellinnen gaan er dit weekend door? En wat doe je als je voorraad niet klopt? Voor veel restauranthouders kosten dit soort vragen tijd en aandacht — tijd die je liever besteedt aan je gasten en je gerechten. Napking neemt dat textielbeheer van je over, zodat jij er geen omkijken meer naar hebt.

Dat begint bij het abonnement. Wat je als vuile was inlevert, staat een week later schoon en smetteloos bij je klaar. Je hoeft zelf geen bestellingen
```

### E2 — GPT-5.4 (composite 83)
- Approach: single-shot
- Judge: Sterke openingsvragen in ik-perspectief (dicht bij sample [1]), rijke merkwoorddichtheid, HACCP en 280+ aanwezig, maar zinnen worden op plaatsen iets langer en beschrijvender; 'HACCP-proof' is een lichte stijlafwijking, verder geen verboden woorden.

Sample output (eerste 500 chars):
```
Heb ik straks wel genoeg servetten op voorraad? Zijn de tafellakens op tijd schoon retour? En wat als er extra kokskleding nodig is voor een druk weekend? Met Napking heb je daar geen omkijken meer naar. Napking beheert het horecatextiel voor meer dan 280 restaurants in de Randstad. Dat betekent: vlekkeloos linnen, kraakheldere tafellakens, schone theedoeken en onberispelijke kleding voor de bediening. Altijd op het juiste moment afgeleverd. Zonder dat jij daar steeds achteraan hoeft.

Dat werkt
```

### A3 — Gemini 3 Flash best-of-3 (composite 79)
- Approach: parallel candidates + ranker
- Judge: Solide merkwoordgebruik en goede structuur, maar 'kwaliteit is bij ons geen abstract begrip' is een clichématige wending, 'koksbuizen' is een ongebruikelijk woord buiten de merkwoordenlijst, en 'uitstraling van je linnen' voelt iets te vaag; geen harde verboden woorden maar stijl is minder scherp dan T0/E1.

Sample output (eerste 500 chars):
```
Liggen er nog genoeg schone servetten? Is de kokskleding op tijd terug? Bij Napking heb je hier geen omkijken naar. Wij regelen het textielbeheer voor meer dan 280 restaurants in de Randstad. Onze aanpak is helder: wij zorgen dat jij altijd beschikt over vlekkeloos linnen, zodat jij je kunt richten op de keuken en je gasten. Geen vage beloftes, maar een strak geregelde logistiek die elke week opnieuw bewijst dat het werkt.

Napking werkt met een transparant abonnement. Dit betekent dat je nooit 
```

### A1 — Haiku 4.5 × 3 (1 gen + 2 iter) (composite 77)
- Approach: cheap iterative
- Judge: Opening sluit nauw aan op sample [1] en merkwoorden zijn aanwezig, maar 'uniek abonnementsysteem' raakt aan een anti-pattern-sfeer, 'core business' is een anglicisme buiten de merkstijl, en 'Zij merken het verschil' is iets te chatty; verder geen harde verboden woorden.

Sample output (eerste 500 chars):
```
Heb ik wel genoeg textiel op voorraad? Is er voldoende kokskleding? Bij Napking heb je hier geen omkijken naar. Napking is dé flexibele partner voor horecatextiel in de Randstad. Wij beheren en reinigen textiel voor meer dan 280 restaurants in de regio. Je kunt op ons rekenen voor vlekkeloze servetten, kraakheldere tafellakens, schone koksjassen, frisse theedoeken en onberispelijke kleding voor de bediening. Wij leveren je het juiste textiel op de juiste plek en op het juiste moment.

Hoe werkt 
```
