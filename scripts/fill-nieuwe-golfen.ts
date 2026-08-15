/**
 * Fill Het Nieuwe Golfen (HNG) — verwerkt het Branddock_HNG_Invulboek
 * (14 augustus 2026) in de lokale workspace. Bron: ~/Downloads/Branddock_HNG_Invulboek.md
 *
 * Volgorde volgt blok 18 van het invulboek:
 *   1. Contenttaal → nl
 *   2. Brand assets (blokken 2-9)
 *   3. Voice guide + baseline + F-VAL-regels (blokken 10-12)
 *   4. (hertest via scripts/score-hng-referentieteksten.ts — apart script)
 *   5. Typografie en kleur (blok 13)
 *   6. Personas, producten, concurrenten (blokken 14-16)
 *   7. Kennisbronnen (blok 17 — alleen de 2 lokaal aanwezige documenten)
 *
 * Besluiten D1-D5 (blok 0) zijn overgenomen zoals voorgesteld.
 *
 * Run: npx tsx scripts/fill-nieuwe-golfen.ts
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const DATABASE_URL = 'postgresql://erikjager:@localhost:5432/branddock';
// '@/lib/prisma' singleton (gebruikt door brand-rule-sync) leest DATABASE_URL uit env.
process.env.DATABASE_URL = process.env.DATABASE_URL ?? DATABASE_URL;

const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const WORKSPACE_ID = 'cmpp4dxgc001w4ums9sttpg62'; // Het Nieuwe Golfen (lokaal)
const USER_ID = 'demo-user-erik-001';
const PEILDATUM = 'stand 14-08-2026';

// ────────────────────────────────────────────────────────────────
// BLOK 2 — BRAND ESSENCE
// ────────────────────────────────────────────────────────────────

const bewijspunten = [
  'De Impact First methodiek werkt vanuit effect in plaats van vanuit theorie, en maakt technische uitleg overbodig',
  'De ontwikkelladder Basis > Ontwikkel > Prestatie geeft elke golfer een zichtbaar startpunt en een volgende stap',
  'Diep Trainen en externe focus vervangen bewuste techniekcorrectie door aandacht op wat de bal doet',
  'De ontwikkelcommunity zorgt voor ritme, herhaling en onderlinge motivatie',
  'De methode werkt aantoonbaar ook bij spelers met fysieke beperkingen of decennialang ingesleten patronen',
];

const brandEssence = {
  essenceStatement: 'Logische bevrijding die leidt tot golfgeluk.',
  essenceNarrative:
    'Het Nieuwe Golfen bevrijdt golfers van de ruis, het jargon en de technische chaos van traditioneel golfonderwijs. Logica vervangt complexiteit, een gestructureerd pad vervangt losse lessen — en daaruit volgt echte vooruitgang en plezier.',
  functionalBenefit:
    'Sneller resultaat door een bewezen methodiek, een helder ontwikkelpad, zichtbare progressie en techniek die eenvoudiger is in plaats van ingewikkelder.',
  emotionalBenefit:
    'Vertrouwen boven de bal. Verlost van de frustratie van tegenstrijdige adviezen. De voldoening van echte vooruitgang, en het plezier dat daaruit volgt.',
  selfExpressiveBenefit:
    'Ik ben een golfer die logica verkiest boven traditie, resultaat boven complexiteit, en die weet welke stap hij zet.',
  discriminator:
    'Het enige complete golf-ontwikkelsysteem dat traditionele complexiteit vervangt door logische eenvoud, en dat resultaat levert via een gestructureerd pad in plaats van via losse lessen.',
  proofPoints: bewijspunten,
  attributes: [
    'Logisch',
    'Bevrijdend',
    'Gestructureerd',
    'Zelfverzekerd',
    'Eigenzinnig',
    'Resultaatgericht',
    'Community-gedreven',
  ],
  audienceInsight:
    'Ambitieuze golfers zijn niet gefrustreerd door golf zelf, maar door de ruis, het jargon en de technische chaos van traditioneel golfonderwijs. Ze willen een helder pad, een logische uitleg en echte vooruitgang — niet nog een losse les of nog een concurrerende waarheid.',
};

// ────────────────────────────────────────────────────────────────
// BLOK 3 — BRAND PROMISE
// ────────────────────────────────────────────────────────────────

const brandPromise = {
  promiseStatement:
    'Wij geven je een helder, logisch pad naar golfgeluk — met een bewezen methodiek, een gestructureerd ontwikkelpad en een community die je vooruit helpt. Zodat je vooruitgang ziet in je spel en het plezier terugkrijgt.',
  promiseOneLiner: 'Een helder, logisch pad naar golfgeluk.',
  functionalValue:
    'De Impact First methodiek, de ontwikkelladder Basis > Ontwikkel > Prestatie, een startpunt op basis van waar je echt staat, en een trainingssysteem dat past bij een druk leven.',
  emotionalValue:
    'Vertrouwen boven de bal. Rust in je hoofd. Minder frustratie op de baan. De voldoening van echte vooruitgang, en het gevoel dat iemand snapt waar je vastloopt.',
  selfExpressiveValue:
    'Onderdeel zijn van een groep golfers die logica verkiest boven complexiteit en resultaat boven traditie. Een golfer worden die zijn pad kent en zijn eigen progressie stuurt.',
  targetAudience:
    'Ambitieuze golfers — van starter tot gevorderd — die vastlopen op de complexiteit van traditioneel golfonderwijs en binnen een druk leven sneller en zichtbaarder resultaat willen.',
  coreCustomerNeed:
    'Een helder pad, een logische uitleg en echte vooruitgang — niet nog een losse les of nog een concurrerende waarheid.',
  differentiator:
    'Een compleet systeem — methodiek, structuur, begeleiding en community in één ontwikkeltraject — tegenover losse lessen. Impact First tegenover complexe swingtheorie. Een zichtbare ontwikkelladder tegenover een onduidelijk pad.',
  onlynessStatement:
    'Het Nieuwe Golfen is het enige golf-ontwikkelsysteem dat de Impact First methodiek combineert met een gestructureerde ontwikkelladder en een actieve community, en golfers zo bevrijdt van traditionele complexiteit — op elk niveau.',
  proofPoints: bewijspunten,
  measurableOutcomes: [
    'Consistenter contact met de bal, herkenbaar binnen enkele sessies',
    'Zichtbare doorstroom door de niveaus van de ontwikkelladder',
    'Minder tegenstrijdige technische gedachten tijdens de ronde',
    'Meer vertrouwen op de eerste tee en onder druk',
    'Handicapontwikkeling over 12 maanden lidmaatschap',
  ],
};

// ────────────────────────────────────────────────────────────────
// BLOK 4 — MISSIE & VISIE
// ────────────────────────────────────────────────────────────────

const missionVision = {
  missionStatement:
    'Het is onze missie om zoveel mogelijk ambitieuze spelers golfgeluk te bieden. Dat doen we door een ontwikkelcommunity te faciliteren waarin logica, een baanbrekende techniek (Impact First), een duidelijke ontwikkelladder (Basis > Ontwikkel > Prestatie) en plezier samenkomen. Zodat iedereen het maximale uit zijn of haar potentieel haalt. Niet met losse lessen, maar met een systeem dat werkt.',
  missionOneLiner: 'Wij bieden golfgeluk via een systeem dat werkt.',
  forWhom:
    'Ambitieuze golfers die sneller resultaat willen en echte vooruitgang willen ervaren — van wie nog moet beginnen tot wie al jaren speelt en vastloopt.',
  whatWeDo:
    'Wij faciliteren een ontwikkelcommunity die methodiek, structuur, begeleiding en gemeenschap samenbrengt in één persoonlijk ontwikkeltraject.',
  howWeDoIt:
    'Via de Impact First methodiek, Diep Trainen en externe focus, een duidelijke ontwikkelladder, een helder startpunt en een community die energie geeft.',
  visionStatement:
    'Wij zien een wereld waarin een veel grotere rol is weggelegd voor de eenvoud van Het Nieuwe Golfen. Een wereld zonder onnodige frustratie en complexe theorieën, waarin elke speler aanzienlijk sneller resultaat kan bereiken. En waarin logica leidt tot maximaal spelplezier. Het Nieuwe Golfen is daarin simpelweg de norm.',
  timeHorizon: '5-10 jaar',
  boldAspiration: 'Het Nieuwe Golfen tot de standaardaanpak in de golfwereld maken.',
  desiredFutureState:
    'Een golfwereld waarin logica de complexiteit vervangt, waarin elke speler een helder ontwikkelpad heeft, en waarin frustratie plaatsmaakt voor gestructureerde vooruitgang en echt plezier.',
  successIndicators: [
    'Zichtbare doorstroom door de niveaus van de ontwikkelladder',
    'Handicapontwikkeling over 12 maanden lidmaatschap',
    'Het Nieuwe Golfen wordt herkend als de logische standaard in golfontwikkeling',
  ],
  stakeholderBenefit:
    'Golfers krijgen vooruitgang, vertrouwen en plezier terug. De golfwereld wordt toegankelijker en leuker — voor iedereen die bereid is te groeien.',
  impactGoal: 'De golfwereld leuker achterlaten — voor iedereen die bereid is te groeien.',
  valuesAlignment:
    'De missie is geworteld in de kernwaarden: Rationeel (alles op logica), Vrijheid (bevrijden van ballast), Golfgeluk (plezier dat je verdient), Doelgericht (alles draait om resultaat) en Eigenzinnig (fundamenteel anders, omdat het werkt).',
  missionVisionTension:
    'De missie richt zich op de community en het systeem van vandaag. De visie duwt naar verandering van de hele golfwereld.',
};

// ────────────────────────────────────────────────────────────────
// BLOK 5 — ARCHETYPE (Hero 70% + Outlaw 30%)
// ────────────────────────────────────────────────────────────────

const brandArchetype = {
  primaryArchetype: 'Hero',
  subArchetype: 'Outlaw (70/30-verhouding)',
  coreDesire:
    'Golfers helpen hun spel fundamenteel te veranderen, en met een aanpak die tegen de stroom in gaat laten zien dat het anders kan.',
  coreFear: 'Golfers vast laten zitten in traditionele complexiteit.',
  brandGoal:
    'Golfers fundamenteel beter maken en Het Nieuwe Golfen tot de standaardaanpak in de golfwereld maken.',
  strategy:
    'Zo sterk en vakkundig mogelijk zijn, en tegelijk de status quo van het traditionele golfonderwijs uitdagen.',
  giftTalent:
    'Complexiteit terugbrengen tot logica: één principe — impact eerst — dat op elk niveau werkt en eenvoudig uit te leggen is.',
  shadowWeakness:
    'Arrogantie. De neiging onszelf steeds te moeten bewijzen. Het risico de traditionele golfwereld tegen ons in het harnas te jagen.',
  archetypeInAction:
    'Hero 70%: leiden met bewezen methodiek en zichtbaar resultaat. Outlaw 30%: de complexiteit van traditioneel golfonderwijs uitdagen — in wat we wél doen, niet in het afkraken van anderen.',
  marketingExpression:
    'De zelfverzekerde coach die de regels van het spel herschreven heeft. Taal die richting geeft en gaat over transformatie en meesterschap — niet over ons product. Visueel geïnspireerd op moderne sport-tech: Nike, Lululemon, Pas Normal Studios.',
  customerExperience:
    'Een helder startpunt op basis van waar je echt staat, zichtbare progressie op de ontwikkelladder en een community die energie geeft.',
  contentStrategy:
    'Leid met bewezen methodiek en zichtbaar resultaat (Hero). Daag de complexiteit van traditioneel golfonderwijs uit (Outlaw). Deel transformatieverhalen. Leg alles logisch en eenvoudig uit. Positioneer als de gids die een betere weg gevonden heeft — niet als de held zelf.',
  storytellingApproach:
    'De golfer is de held; Het Nieuwe Golfen is de gids die een betere weg gevonden heeft. Vertel transformatieverhalen en leg alles logisch en eenvoudig uit.',
  brandExamples: ['Nike', 'Lululemon', 'Pas Normal Studios'],
  positioningApproach: 'Guidance',
  competitiveLandscape:
    'Traditioneel golfonderwijs betekent complexe theorie, meerdere waarheden en frustratie. Het Nieuwe Golfen betekent eenvoudige logica, één bewezen methode en gestructureerde vooruitgang. Wij zijn de rebel met een systeem dat werkt, niet de tegendraadse stem.',
};

// ────────────────────────────────────────────────────────────────
// BLOK 6 — KERNWAARDEN (BrandHouse)
// ────────────────────────────────────────────────────────────────

const brandHouseValues = {
  anchorValue1: {
    name: 'Rationeel',
    description:
      'Wij doen niets zomaar. Alles wat we doen is gebaseerd op logica. Als we iets niet simpel kunnen uitleggen, dan onderwijzen we het niet.',
  },
  anchorValue2: {
    name: 'Vrijheid',
    description:
      'Wij bevrijden golfers van ballast. Wij halen de last van traditionele en complexe theorieën weg en geven de autonomie terug om met een leeg hoofd en vol vertrouwen boven de bal te staan.',
  },
  aspirationValue1: {
    name: 'Golfgeluk',
    description:
      'Golfen hoort leuk te zijn. Plezier dat je verdient, omdat je beter bent geworden. Vooruitgang is het middel om maximale voldoening uit de sport te halen. We willen de golfwereld leuker achterlaten, voor iedereen die bereid is te groeien.',
  },
  aspirationValue2: {
    name: 'Doelgericht',
    description:
      'Alles draait om resultaat. We zijn pragmatisch en resultaatgedreven. We doen beloftes waar je ons op mag afrekenen.',
  },
  ownValue: {
    name: 'Eigenzinnig',
    description:
      'We doen de dingen fundamenteel anders. We durven anders te zijn en tegen de stroom in te zwemmen. Dat doen we omdat we weten dat het werkt. We innoveren en wijzen jou de nieuwe weg, via een systeem dat stap voor stap bewezen resultaat levert.',
  },
  valueTension:
    'Golfgeluk (plezier) tegenover Doelgericht (resultaat) levert productieve spanning op: wij geloven dat echt plezier vóórtkomt uit resultaat, niet ondanks resultaat. Vrijheid (autonomie) tegenover Rationeel (structuur) balanceert bevrijding met een heldere methode.',
};

// ────────────────────────────────────────────────────────────────
// BLOK 7 — BRAND PERSONALITY
// ────────────────────────────────────────────────────────────────

const personalityProse =
  'Het Nieuwe Golfen is de coach die je liever de waarheid vertelt dan je te vriend houdt. Rustig maar stellig. Nuchter, met een droge ondertoon. Nooit schreeuwerig, nooit joviaal om het joviale.\n\n' +
  'Het is iemand die uitlegt in plaats van imponeert, die complexiteit als een gebrek ziet en niet als bewijs van vakmanschap. Iemand die je serieus neemt op elk niveau — of je nu je eerste bal slaat of al dertig jaar speelt.\n\n' +
  'Er zit een rebelse kant aan, maar die uit zich in wat we wél doen, niet in het afkraken van anderen. We zwemmen tegen de stroom in omdat we weten dat het werkt.\n\n' +
  'Wat het niet is: een gezellige golfclub, een enthousiaste verkoper, een goeroe.';

const brandPersonality = {
  dimensionScores: {
    sincerity: 4, // eerlijk, de waarheid boven te vriend houden
    excitement: 3, // eigenzinnig en vooruitstrevend, nooit schreeuwerig
    competence: 5, // vakkundig, bewezen methodiek, meesterschap
    sophistication: 3, // helder en toegankelijk, geen opsmuk
    ruggedness: 3, // tegen de stroom in, maar geen stoerdoenerij
  },
  primaryDimension: 'Competence',
  secondaryDimension: 'Sincerity',
  personalityTraits: [
    {
      name: 'Rustig maar stellig',
      description: 'Wij overtuigen met logica, niet met volume.',
      weAreThis: 'Kalm, zeker van de zaak, richtinggevend.',
      butNeverThat: 'Nooit schreeuwerig, nooit joviaal om het joviale.',
    },
    {
      name: 'Nuchter met droge ondertoon',
      description: 'De waarheid vertellen gaat boven je te vriend houden.',
      weAreThis: 'Eerlijk, direct, met een droge ondertoon.',
      butNeverThat: 'Nooit een enthousiaste verkoper, nooit een goeroe.',
    },
    {
      name: 'Uitlegger, geen imponeerder',
      description: 'Complexiteit is een gebrek, geen bewijs van vakmanschap.',
      weAreThis: 'Alles logisch en eenvoudig uitleggen.',
      butNeverThat: 'Nooit technisch jargon zonder uitleg, nooit imponeren met theorie.',
    },
    {
      name: 'Serieus op elk niveau',
      description: 'Of je nu je eerste bal slaat of al dertig jaar speelt.',
      weAreThis: 'Iedereen serieus nemen, beginners incluis.',
      butNeverThat: 'Nooit taal die beginners buitensluit of alleen jonge fanatieke golfers aanspreekt.',
    },
    {
      name: 'Rebels in daden',
      description: 'Tegen de stroom in zwemmen omdat we weten dat het werkt.',
      weAreThis: 'De rebelse kant uit zich in wat we wél doen.',
      butNeverThat: 'Nooit het afkraken van anderen.',
    },
  ],
  spectrumSliders: {
    friendlyFormal: 4,
    energeticThoughtful: 5, // beschouwend: eerst begrijpen, dan doen
    modernTraditional: 2, // moderne sport-tech, geen klassieke golfcultuur
    innovativeProven: 4, // eigenzinnig innoveren, maar bewezen resultaat
    playfulSerious: 5, // serieus over het werk, droge ondertoon
    inclusiveExclusive: 2, // serieus op elk niveau — expliciet inclusief
    boldReserved: 3, // stellig, maar rustig
  },
  colorDirection:
    'Navy (#1B1580) als primaire kleur, brand green (#00F09A) als accent. Lavender (#C4B0F5) en purple (#6B5BE8) als ladderkleuren (Basis en Ontwikkel), navy als Prestatie. Offwhite (#F5F4F0) en dark (#111018) voor rust en contrast.',
  typographyDirection:
    'Sport-tech grotesks, voorlopig vastgelegd tot de MooiMerk-fase (besluit D3): Neue Haas Grotesk Display voor display, Suisse Int\'l voor body, JetBrains Mono voor mono.',
  imageryDirection:
    'Beweging, snelheid en impact. Mensen die met elkaar in gesprek zijn en plezier hebben. Geen poserende modellen, geen stockgolf.',
};

// ────────────────────────────────────────────────────────────────
// BLOK 8 — BRAND STORY
// ────────────────────────────────────────────────────────────────

const storyProse =
  'Michel begon in 2015 met wat toen nog geen naam had. Geen swingtheorie, geen dertien verschillende bewegingen, maar één vraag: waar raak je de bal, en wat gebeurt er dan?\n\n' +
  'Dat bleek genoeg. Golfers die jarenlang vastzaten in tegenstrijdige adviezen sloegen binnen een uur beter — zonder dat er iets aan hun swing veranderd was. Ook spelers die dachten dat hun lichaam het niet meer toeliet. Ook spelers die het al vijftig jaar op hun eigen manier deden.\n\n' +
  'Daar zat de ontdekking: het probleem is nooit de golfer geweest. Het probleem is de manier waarop golf wordt onderwezen. Dertien clubs met dertien lengtes. Theorie stapelen op theorie. Elke pro een eigen waarheid. En de speler die daartussen zijn vertrouwen kwijtraakt.\n\n' +
  'Van die ene vraag groeide een systeem. Impact First als fundament. Diep Trainen als manier van oefenen. Externe focus in plaats van nadenken over je lichaam. Een ontwikkelladder die zichtbaar maakt waar je staat en wat je volgende stap is. En een community waarin golfers elkaar vooruit helpen in plaats van elkaar tips te geven.\n\n' +
  'Waar het naartoe gaat: een golfwereld waarin dit niet meer de uitzondering is, maar de norm.';

const brandStory = {
  originStory:
    'Michel begon in 2015 met wat toen nog geen naam had. Geen swingtheorie, geen dertien verschillende bewegingen, maar één vraag: waar raak je de bal, en wat gebeurt er dan? Dat bleek genoeg: golfers die jarenlang vastzaten in tegenstrijdige adviezen sloegen binnen een uur beter — zonder dat er iets aan hun swing veranderd was.',
  founderMotivation:
    'De ontdekking dat het probleem nooit de golfer is geweest, maar de manier waarop golf wordt onderwezen — en de overtuiging dat één logische vraag meer oplevert dan dertien theorieën.',
  coreBeliefStatement:
    'Het probleem is nooit de golfer geweest. Het probleem is de manier waarop golf wordt onderwezen.',
  worldContext:
    'Dertien clubs met dertien lengtes. Theorie stapelen op theorie. Elke pro een eigen waarheid. En de speler die daartussen zijn vertrouwen kwijtraakt.',
  customerExternalProblem:
    'Inconsistente slagen en uitblijvende vooruitgang, ondanks lessen, tips en oefening.',
  customerInternalProblem:
    'Vertrouwen kwijt boven de bal. Frustratie over tegenstrijdige adviezen. Twijfel of het lichaam het nog toelaat of dat het ooit nog beter wordt.',
  philosophicalProblem:
    'Waarom accepteren we dat golf ingewikkeld en frustrerend hoort te zijn, terwijl eenvoudige logica sneller resultaat geeft?',
  stakesCostOfInaction:
    'Wie na jaren proberen geen vooruitgang ziet, verliest het plezier — en stopt. Onnodige complexiteit is de grootste drempel van de sport.',
  brandRole: 'Gids',
  empathyStatement:
    'We erkennen de frustratie zonder de speler schuld te geven: het probleem is de manier van lesgeven, niet de golfer.',
  authorityCredentials:
    'Sinds 2015 in de praktijk bewezen: golfers slaan binnen een uur beter zonder dat er iets aan hun swing verandert — ook spelers met fysieke beperkingen of decennialang ingesleten patronen.',
  transformationPromise:
    'Van vastzitten in tegenstrijdige adviezen naar vertrouwen boven de bal, zichtbare vooruitgang en plezier dat je verdient.',
  customerSuccessVision:
    'Je weet waar je staat en wat je volgende stap is. Je traint doelgericht, ziet vooruitgang in je spel en staat met een leeg hoofd en vol vertrouwen boven de bal.',
  abtStatement:
    'Ambitieuze golfers willen echte vooruitgang EN krijgen overal tips en theorie, MAAR juist die stapeling van waarheden houdt ze klein, DAAROM vervangt Het Nieuwe Golfen de complexiteit door één logisch systeem: impact eerst, een zichtbare ontwikkelladder en een community die je vooruit helpt.',
  brandThemes: [
    'Logische bevrijding',
    'Impact eerst',
    'Zichtbare vooruitgang',
    'Community die je vooruit helpt',
  ],
  emotionalTerritory: ['Vertrouwen', 'Rust', 'Voldoening', 'Plezier'],
  keyNarrativeMessages: [
    'Stop met proberen, start met begrijpen',
    'Geen losse lessen, maar een systeem dat werkt',
    'Minder ruis. Meer richting.',
    'Je weet waar je staat en wat je volgende stap is',
  ],
  narrativeArc:
    'Overcoming the Monster: de golfer bevrijdt zich van de complexiteit van traditioneel golfonderwijs, met Het Nieuwe Golfen als gids.',
  proofPoints: bewijspunten,
  valuesInAction: [
    'Rationeel: als we iets niet simpel kunnen uitleggen, onderwijzen we het niet.',
    'Vrijheid: de last van complexe theorieën weghalen, met een leeg hoofd boven de bal.',
    'Golfgeluk: plezier dat je verdient, omdat je beter bent geworden.',
    'Doelgericht: beloftes doen waar je ons op mag afrekenen.',
    'Eigenzinnig: tegen de stroom in zwemmen, omdat we weten dat het werkt.',
  ],
  brandMilestones: [
    '2015 — Michel geeft de eerste lessen vanuit één vraag: waar raak je de bal, en wat gebeurt er dan?',
  ],
  elevatorPitch:
    'Het Nieuwe Golfen is het enige complete golf-ontwikkelsysteem dat traditionele complexiteit vervangt door logische eenvoud. Impact First als fundament, een zichtbare ontwikkelladder (Basis > Ontwikkel > Prestatie) en een community die je vooruit helpt. Geen losse lessen, maar een systeem dat werkt.',
  manifestoText: storyProse,
  audienceAdaptations: {
    customers:
      'Stop met proberen, start met begrijpen. Je ontdekt waar je staat, je weet wat je volgende stap is, en je traint doelgericht in een community die je vooruit helpt.',
    investors: '',
    employees: '',
    partners: '',
  },
};

// ────────────────────────────────────────────────────────────────
// BLOK 9 — SOCIAL RELEVANCY
// ────────────────────────────────────────────────────────────────

const socialProse =
  'Golf staat bekend als moeilijk, duur en gesloten. Dat is deels waar, en het houdt mensen buiten die er plezier aan zouden beleven. Onnodige complexiteit is daarin de grootste drempel: wie na twee jaar nog geen vooruitgang ziet, stopt.\n\n' +
  'Wij maken golf toegankelijker door het eenvoudiger te maken, niet door het te versimpelen. Een startersprogramma dat volledig online kan, zonder dat je twee dagen naar een locatie moet. Een methode die werkt zonder speciaal materiaal. Uitleg die iedereen begrijpt, ongeacht leeftijd, niveau of fysieke mogelijkheden.\n\n' +
  'Wij laten de golfwereld leuker achter dan we hem aantroffen. Voor iedereen die bereid is te groeien.';

const socialRelevancy = {
  impactStatement:
    'Wij maken golf toegankelijker door het eenvoudiger te maken, niet door het te versimpelen.',
  impactNarrative:
    'Golf staat bekend als moeilijk, duur en gesloten. Dat is deels waar, en het houdt mensen buiten die er plezier aan zouden beleven. Onnodige complexiteit is daarin de grootste drempel: wie na twee jaar nog geen vooruitgang ziet, stopt.',
  activismLevel: 'Vocal',
  milieu: {
    statements: [],
    pillarReflection:
      'Milieu is geen kernpijler van Het Nieuwe Golfen. Wij claimen hier niets dat we niet kunnen onderbouwen.',
  },
  mens: {
    statements: [
      {
        text: 'Wij maken de instap in golf toegankelijk met een startersprogramma dat volledig online kan.',
        score: 5,
        evidence:
          'Wanna Be a Golfer is het enige startersprogramma dat 100% online kan; elders moet je één of twee hele dagen naar een locatie voor €200 tot €300.',
        target: 'Elke starter kan beginnen zonder reistijd of vaste dag.',
        timeline: 'Doorlopend',
      },
      {
        text: 'Onze methode werkt voor iedereen, ongeacht leeftijd, niveau of fysieke mogelijkheden.',
        score: 5,
        evidence:
          'De methode werkt aantoonbaar ook bij spelers met fysieke beperkingen of decennialang ingesleten patronen.',
        target: 'Uitleg die iedereen begrijpt, techniek die eenvoudiger wordt in plaats van ingewikkelder.',
        timeline: 'Doorlopend',
      },
      {
        text: 'Wij nemen de frustratie uit de sport weg zonder de speler de schuld te geven.',
        score: 4,
        evidence:
          'Kern van de methodiek: het probleem is de manier van lesgeven, niet de golfer. Externe focus en Diep Trainen vervangen technische chaos.',
        target: 'Spelers ervaren rust en vooruitgang in plaats van ruis en twijfel.',
        timeline: 'Doorlopend',
      },
    ],
    pillarReflection:
      'Mens is de kernpijler: golf toegankelijker en leuker maken voor iedereen die bereid is te groeien.',
  },
  maatschappij: {
    statements: [
      {
        text: 'Wij verlagen de drempel van een sport die bekendstaat als moeilijk, duur en gesloten.',
        score: 4,
        evidence:
          'Volledig online startersprogramma, een methode zonder speciaal materiaal en uitleg zonder jargon.',
        target: 'Meer mensen die plezier beleven aan golf, minder uitval door uitblijvende vooruitgang.',
        timeline: 'Doorlopend',
      },
      {
        text: 'Wij laten de golfwereld leuker achter dan we hem aantroffen.',
        score: 4,
        evidence: 'Impactdoel van de missie; verankerd in de kernwaarde Golfgeluk.',
        target: 'Het Nieuwe Golfen als norm in plaats van uitzondering.',
        timeline: '5-10 jaar',
      },
    ],
    pillarReflection:
      'De maatschappelijke bijdrage is specifiek: onnodige complexiteit wegnemen als grootste drempel van de golfsport.',
  },
  authenticityScores: {
    walkTheTalk: 4,
    transparency: 4,
    consistency: 4,
    stakeholderTrust: 4,
    measurability: 3,
    longTermCommitment: 5,
  },
  proofPoints: [
    'Wanna Be a Golfer kan 100% online — elders kost de instap één of twee hele dagen op locatie',
    'De methode werkt zonder speciaal materiaal',
    'De methode werkt aantoonbaar ook bij spelers met fysieke beperkingen of decennialang ingesleten patronen',
  ],
  certifications: [],
  antiGreenwashingStatement:
    'Wij claimen geen breed maatschappelijk programma. Onze bijdrage is specifiek: golf toegankelijker maken door onnodige complexiteit weg te nemen. Cijfers die we niet kunnen onderbouwen, claimen we niet.',
  sdgAlignment: [],
  communicationPrinciples: [
    'Eenvoudiger maken, niet versimpelen',
    'Erken frustratie zonder de speler schuld te geven',
    'Claim alleen wat we kunnen onderbouwen',
  ],
  keyStakeholders: [
    'Ambitieuze golfers van starter tot gevorderd',
    'Spelers met fysieke beperkingen of ingesleten patronen',
    'De bredere golfwereld',
  ],
  activationChannels: [
    'Startersprogramma (volledig online)',
    'Ontwikkelcommunity',
    'Live events en proeftrainingen',
  ],
  annualCommitment: '',
};

// ────────────────────────────────────────────────────────────────
// BLOK 10 + 11 — BRAND VOICE GUIDE + VOICE BASELINE
// ────────────────────────────────────────────────────────────────

const contentGuidelines = [
  'Schrijf altijd voor één doelgroep tegelijk: de startende golfer óf de ervaren, vastgelopen golfer. Wie voor iedereen schrijft, schrijft voor niemand.',
  'Beantwoord in deze volgorde de vier vragen die de lezer onbewust stelt: Is dit voor mij? Wat heb ik eraan? Waarom zou ik jullie geloven? Wat moet ik nu doen?',
  'Beloof het resultaat, niet de inhoud. Niet "Niveau Basis: €249 per jaar", wel "Grip op je basisspel, in 12 maanden".',
  'Zet bewijs dicht bij de belofte: onderbouwing, ledenverhalen en aantallen in het zicht van de CTA.',
  'Elke primaire CTA krijgt een zachtere tweede optie eronder, voor wie nog niet zover is.',
  'Onder elke knop staat microcopy die twijfel wegneemt: "Geen verplichtingen. Geen verkoopgesprek."',
  'Merktermen (Impact First, Diep Trainen, externe focus, OneLength) krijgen bij eerste vermelding één zin plain-language uitleg. Daarna mogen ze los staan.',
  'Prijzen niet in de hero. Wel transparant lager op de pagina.',
  'Michel is de gids, niet het product. Het systeem staat centraal.',
];

const writingGuidelines = [
  'Rustig maar stellig. Wij overtuigen met logica, niet met volume.',
  'Korte zinnen. Actieve vorm. Taalniveau C1.',
  'De meerderheid van de zinnen begint met "jij" of "jouw", niet met "wij" of "ons".',
  'Nooit urgentie of kunstmatige schaarste. Feitelijke beperking mag: "beperkte plekken per locatie".',
  'Koppen op emotie en resultaat, niet op functie. "Stop met proberen, start met begrijpen" — niet "De drie pijlers van onze methode".',
  'Uitroeptekens spaarzaam en alleen waar echt iets te vieren valt.',
  'Schrap tot het scherp is: kan er 20 procent uit zonder verlies van betekenis, dan moet dat eruit.',
  'Erken frustratie zonder de lezer schuld te geven. Het probleem is de manier van lesgeven, niet de speler.',
  'Geen em-dash als losse toevoeging aan het zinseinde.',
  'Geen komma vóór "en" of "of".',
  'Eén boodschap per sectie.',
];

// Volgorde telt: de eerste 10 vormen de "Te vermijden termen (top 10)" van de
// Voice Baseline 1-pager (blok 11). Daarna expliciete meervouden die de
// NL-stem-expansie van de rule-sync niet betrouwbaar genereert, plus de
// persona-bijnamen uit blok 12 ("vis"/"vissen" bewust weggelaten — te veel
// valse treffers in gewone taal).
const wordsWeAvoid = [
  'golfles',
  'lespakket',
  'pakket',
  'gezelligheid',
  'gegarandeerd',
  'laatste kans',
  'nu of nooit',
  'geheim',
  'trucje',
  'swingtheorie',
  // — expliciete meervouden en persona-bijnamen (buiten de top-10-weergave) —
  'golflessen',
  'lespakketten',
  'pakketten',
  'swingtheorieën',
  'guppy',
  'guppies',
  'walvis',
  'walvissen',
];

// Multi-word anti-patterns → severity 'error' via rule-sync (blok 12).
// De eerste drie verschijnen als stijlregels in de Voice Baseline 1-pager.
const antiPatterns = [
  'Birdy time',
  'Fore right',
  'mis dit niet',
  'mis het niet',
  'Quantum Leap',
  'Wij geloven',
  'Bij HNG vinden we',
  'Onze missie is om',
];

const wordsWeUse = [
  'impact',
  'Impact First',
  'ontwikkelladder',
  'Basis / Ontwikkel / Prestatie',
  'grip',
  'rust',
  'ruis',
  'systeem',
  'logica',
  'jouw volgende stap',
];

const examplePhrases = [
  { text: 'Stop met proberen, start met begrijpen', type: 'do' },
  { text: 'De traditionele golfwereld houdt jou klein', type: 'do' },
  { text: 'Eén principe: impact eerst', type: 'do' },
  { text: 'Je weet waar je staat en wat je volgende stap is', type: 'do' },
  { text: 'Geen losse lessen, maar een systeem dat werkt', type: 'do' },
  { text: 'Minder ruis. Meer richting.', type: 'do' },
  { text: 'Geen verplichtingen. Geen verkoopgesprek.', type: 'do' },
  { text: 'Birdy time!', type: 'dont' },
  { text: 'Fore right!', type: 'dont' },
  { text: 'Gezelligheid als hoofdboodschap', type: 'dont' },
  { text: 'LAATSTE KANS', type: 'dont' },
  { text: 'Mis dit niet', type: 'dont' },
  { text: 'Gegarandeerd succes', type: 'dont' },
  { text: 'Wij geloven dat…', type: 'dont' },
  { text: 'Bij HNG vinden we…', type: 'dont' },
  { text: 'Technisch jargon zonder uitleg', type: 'dont' },
  { text: 'Taal die beginners buitensluit', type: 'dont' },
  { text: 'Taal die alleen jonge, fanatieke golfers aanspreekt', type: 'dont' },
];

const referentieTekstA =
  'Stop met proberen, start met begrijpen.\n\n' +
  'De traditionele golfwereld houdt jou klein. Dertien clubs, dertien swings, tegenstrijdige adviezen en een plan dat er nooit kwam. Je slaat de ene ronde 82, de andere 96 — en je weet niet waarom.\n\n' +
  'Het Nieuwe Golfen draait dat om. Eén principe: impact eerst. Eén ontwikkelpad: basis, ontwikkel, prestatie. Je ontdekt waar je staat, je weet wat je volgende stap is, en je traint doelgericht in een community die je vooruit helpt.\n\n' +
  'Geen vage theorie. Geen losse lessen. Een systeem dat werkt.\n\n' +
  'Ontdek jouw niveau. Geen verplichtingen, geen verkoopgesprek.';

const writingSamples = [
  referentieTekstA,
  storyProse,
  socialProse,
  'Basis is er voor de golfer die grip wil krijgen op zijn spel. Het fundament: consistente impact, logisch materiaal, helder begrip van hoe golf werkt. Minder ruis, meer richting. Ontwikkel is er voor de golfer die zijn spel wil verfijnen. Het fundament staat, nu gaat het om herhaling, diepgang en consistentie. Minder frustratie, meer vertrouwen in de eigen swing. Prestatie is er voor de golfer die wil presteren onder druk. In competitie, in de club of gewoon op het eerste tee-vak.',
  'Wanna Be a Golfer is het enige startersprogramma dat 100% online kan. Elders moet je één of twee hele dagen naar een locatie, voor €200 tot €300. Bij ons niet. Jij bepaalt waar en wanneer je leert, en je werkt stap voor stap richting baanpermissie. Slagkracht online belooft iets anders: je wordt aanzienlijk beter zonder dat er iets aan je swing verandert. Voor wie ver weg woont, of wie bang is om zijn swing overhoop te halen.',
];

const voiceSample =
  'De traditionele golfwereld houdt jou klein. Dertien clubs, dertien swings, tegenstrijdige adviezen en een plan dat er nooit kwam. Het Nieuwe Golfen draait dat om. Eén principe: impact eerst. Je ontdekt waar je staat, je weet wat je volgende stap is, en je traint doelgericht in een community die je vooruit helpt. Geen vage theorie. Geen losse lessen. Een systeem dat werkt.';

const voiceguideData = {
  source: 'manual',
  contentLocale: 'nl-NL',
  voiceDescription:
    'De coach die je liever de waarheid vertelt dan je te vriend houdt. Rustig maar stellig, nuchter met een droge ondertoon; nooit schreeuwerig, nooit joviaal om het joviale. Toon-attributen: rustig · stellig · rationeel · eigenzinnig · gidsend · direct · nuchter · zonder opsmuk. De rebelse kant zit in wat we wél doen, niet in het afkraken van anderen.',
  // NN/g 4-assen, 1-7 (4 = neutraal): 1=Formeel/Serieus/Respectvol/Zakelijk
  toneDimensions: { formalCasual: 4, seriousFunny: 2, respectfulIrreverent: 3, matterOfFactEnthusiastic: 2 },
  contentGuidelines,
  writingGuidelines,
  wordsWeUse,
  wordsWeAvoid,
  antiPatterns,
  vocabularyDo: [
    ...wordsWeUse,
    'Stop met proberen, start met begrijpen',
    'Minder ruis. Meer richting.',
    'Geen verplichtingen. Geen verkoopgesprek.',
    'Geen losse lessen, maar een systeem dat werkt',
  ],
  vocabularyDont: [
    'golfles',
    'lespakket',
    'gezelligheid',
    'gegarandeerd',
    'LAATSTE KANS',
    'Mis dit niet',
    'Birdy time!',
    'Fore right!',
    'technisch jargon zonder uitleg',
    'taal die beginners buitensluit',
  ],
  examplePhrases: examplePhrases as unknown as Prisma.InputJsonValue,
  writingSamples: writingSamples as unknown as Prisma.InputJsonValue,
  voiceSample,
  channelTones: Prisma.DbNull,
};

// ────────────────────────────────────────────────────────────────
// BLOK 12 — F-VAL-REGELS (handmatige set, naast de voiceguide-sync)
// ────────────────────────────────────────────────────────────────

interface ManualRule {
  ruleType: 'FORBIDDEN_WORD' | 'REQUIRED_PHRASE' | 'STYLE_LIMIT' | 'PILLAR_REFERENCE';
  pattern: string;
  patternIsRegex?: boolean;
  severity: 'info' | 'warning' | 'error';
  message: string;
  isActive?: boolean;
}

const manualRules: ManualRule[] = [
  {
    ruleType: 'PILLAR_REFERENCE',
    // "impact eerst" telt ook als pijlerverwijzing — de NL-formulering die de
    // referentietekst A (on-brand voorbeeld) zelf gebruikt.
    pattern: 'Impact First, Diep Trainen, externe focus, impact eerst',
    severity: 'warning',
    message:
      'Content hoort minstens één methodepijler te noemen: Impact First (impact eerst), Diep Trainen of externe focus.',
  },
  // Ontwikkelladder-productnamen: nooit vertalen.
  {
    ruleType: 'FORBIDDEN_WORD',
    pattern: 'Foundation',
    severity: 'warning',
    message: 'Productnaam niet vertalen — de ladder heet Basis, niet Foundation.',
  },
  {
    ruleType: 'FORBIDDEN_WORD',
    pattern: 'Development',
    severity: 'warning',
    message: 'Productnaam niet vertalen — de ladder heet Ontwikkel, niet Development.',
  },
  {
    ruleType: 'FORBIDDEN_WORD',
    pattern: 'Performance',
    severity: 'warning',
    message: 'Productnaam niet vertalen — de ladder heet Prestatie, niet Performance.',
  },
  // REQUIRED_PHRASE geldt in de rule-engine voor ÁLLE content; er is nog geen
  // onderwerp-scoping. Daarom inactief vastgelegd als documentatie van de regel
  // "alleen voor content over de ontwikkelladder" — handmatig activeren bij
  // ladder-campagnes.
  {
    ruleType: 'REQUIRED_PHRASE',
    pattern: 'Basis',
    severity: 'warning',
    isActive: false,
    message:
      'Alleen voor content over de ontwikkelladder (handmatig activeren): het niveau heet Basis — nooit Foundation.',
  },
  {
    ruleType: 'REQUIRED_PHRASE',
    pattern: 'Ontwikkel',
    severity: 'warning',
    isActive: false,
    message:
      'Alleen voor content over de ontwikkelladder (handmatig activeren): het niveau heet Ontwikkel — nooit Development.',
  },
  {
    ruleType: 'REQUIRED_PHRASE',
    pattern: 'Prestatie',
    severity: 'warning',
    isActive: false,
    message:
      'Alleen voor content over de ontwikkelladder (handmatig activeren): het niveau heet Prestatie — nooit Performance.',
  },
  // Stijlregels die de rule-engine mechanisch kan afdwingen. De overige
  // stijlregels uit blok 11 (jij/jouw-meerderheid, merkterm-uitleg, secundaire
  // CTA, C1) leven in BrandVoiceguide.writingGuidelines en wegen mee via de
  // F-VAL judge-pijler.
  {
    ruleType: 'STYLE_LIMIT',
    pattern: 'maxSentenceLength:25',
    severity: 'warning',
    message: 'Korte zinnen (taalniveau C1) — maximaal 25 woorden per zin.',
  },
  {
    ruleType: 'FORBIDDEN_WORD',
    pattern: ',\\s+(en|of)\\b',
    patternIsRegex: true,
    severity: 'info',
    message: 'Geen komma vóór "en" of "of" (schrijfwijzer HNG).',
  },
  {
    ruleType: 'FORBIDDEN_WORD',
    pattern: '\\s—\\s[^—.!?\\n]{1,60}[.!?]',
    patternIsRegex: true,
    severity: 'info',
    message: 'Geen em-dash als losse toevoeging aan het zinseinde (schrijfwijzer HNG).',
  },
];

// ────────────────────────────────────────────────────────────────
// BLOK 13 — TYPOGRAFIE EN KLEUR
// ────────────────────────────────────────────────────────────────

const fonts = [
  {
    name: 'Neue Haas Grotesk Display',
    role: 'DISPLAY' as const,
    source: 'DETECTED' as const,
    availability: 'COMMERCIAL' as const,
    fontFamily: "Neue Haas Grotesk Display, ABC Diatype Expanded, Aktiv Grotesk Extended, sans-serif",
    sortOrder: 0,
  },
  {
    name: "Suisse Int'l",
    role: 'BODY' as const,
    source: 'DETECTED' as const,
    availability: 'COMMERCIAL' as const,
    fontFamily: "Suisse Int'l, ABC Diatype, DM Sans, sans-serif",
    sortOrder: 1,
  },
  {
    name: 'JetBrains Mono',
    role: 'UI' as const,
    source: 'DETECTED' as const,
    availability: 'GOOGLE_FONTS' as const,
    fontFamily: 'JetBrains Mono, Fira Code, monospace',
    sortOrder: 2,
  },
];

const styleguideColors: Array<{
  name: string;
  hex: string;
  category: 'PRIMARY' | 'SECONDARY' | 'ACCENT' | 'NEUTRAL' | 'BACKGROUND';
  notes: string;
  sortOrder: number;
}> = [
  {
    name: 'Navy',
    hex: '#1B1580',
    category: 'PRIMARY',
    notes: 'Primaire merkkleur. Tevens ladderkleur van het niveau Prestatie.',
    sortOrder: 0,
  },
  {
    name: 'Brand green',
    hex: '#00F09A',
    category: 'ACCENT',
    notes: 'Accentkleur voor CTA\'s en highlights.',
    sortOrder: 1,
  },
  {
    name: 'Lavender',
    hex: '#C4B0F5',
    category: 'SECONDARY',
    notes: 'Ladderkleur van het niveau Basis.',
    sortOrder: 2,
  },
  {
    name: 'Purple',
    hex: '#6B5BE8',
    category: 'SECONDARY',
    notes: 'Ladderkleur van het niveau Ontwikkel.',
    sortOrder: 3,
  },
  {
    name: 'Offwhite',
    hex: '#F5F4F0',
    category: 'BACKGROUND',
    notes: 'Lichte basis — witruimte is rust, en rust is de belofte.',
    sortOrder: 4,
  },
  {
    name: 'Dark',
    hex: '#111018',
    category: 'NEUTRAL',
    notes: 'Donkere basis voor donkere secties.',
    sortOrder: 5,
  },
  {
    name: 'Deeper',
    hex: '#0D0C14',
    category: 'NEUTRAL',
    notes: 'Diepste achtergrondlaag.',
    sortOrder: 6,
  },
  {
    name: 'Muted',
    hex: '#6B6A78',
    category: 'NEUTRAL',
    notes: 'Gedempte tekst- en detailkleur.',
    sortOrder: 7,
  },
];

const designPhilosophy =
  'Sport-tech. Precisie. Radius 0-16px. Geometrische grids. Veel witruimte — witruimte is rust, en rust is de belofte. ' +
  'Typografie is voorlopig vastgelegd (besluit D3, 14-08-2026) en wordt herzien in de MooiMerk-fase.';

const photographyGuidelines = [
  'Beweging, snelheid en impact.',
  'Mensen die met elkaar in gesprek zijn en plezier hebben.',
];

const imageryDonts = ['Geen poserende modellen.', 'Geen stockgolf.'];

// ────────────────────────────────────────────────────────────────
// BLOK 14 — PERSONAS
// ────────────────────────────────────────────────────────────────

const personas = [
  {
    name: 'De startende golfer',
    tagline: 'Wil het goed leren, en heeft geen jaren om aan te modderen',
    occupation: 'Drukke professional, ondernemer of ambitieuze werknemer',
    age: '30-55',
    bio:
      'Net begonnen of serieus van plan te beginnen. Druk leven, weinig tijd, moderne verwachtingen, hoge ambitie. Wil geen ouderwetse sportomgeving met vage instructies en eindeloos proberen. Wil duidelijkheid, ritme, en snel ervaren dat golf leuk én beheersbaar is. Commercieel en strategisch de belangrijkste doelgroep voor 2026.',
    quote: 'Werkt dit echt voor iemand zoals ik?',
    frustrations: [
      'Geen structuur',
      'Niet weten waar te beginnen',
      'Twijfel of hij het goed doet',
      'Angst om tijd te verspillen',
      'Frustratie als vooruitgang uitblijft',
    ],
    goals: [
      'Snelle vooruitgang',
      'Duidelijkheid',
      'Zelfvertrouwen',
      'Een moderne manier van leren die past bij een druk leven',
    ],
    motivations: [
      'Functioneel: goed leren starten, snel basiscontrole opbouwen, weten wat belangrijk is en wat niet',
      'Emotioneel: vertrouwen opbouwen, frustratie voorkomen, ervaren dat golf haalbaar is',
      'Sociaal: mee kunnen doen, zich niet amateuristisch voelen, horen bij een moderne golfomgeving',
    ],
    behaviors: [
      'Beslist relatief snel',
      'Gevoelig voor logica, eenvoud en momentum',
      'Wil een modern en professioneel gevoel',
      'Prijs speelt mee, maar tijdverspilling is een grotere angst dan geldverlies',
    ],
    buyingTriggers: [
      'Efficiënt leren',
      'Tijdsbesef',
      'Niet fout willen beginnen',
      'Behoefte aan moderne begeleiding',
      'Frustratie met klassieke golfcultuur',
      'Snel zichtbare progressie',
    ],
    decisionCriteria: [
      '"Werkt dit echt voor iemand zoals ik?"',
      '"Heb ik hier genoeg tijd voor?"',
      '"Is dit niet te veel tegelijk?"',
      '"Moet ik meteen ergens volledig instappen?"',
      '"Ben ik al ver genoeg?"',
    ],
    strategicImplications:
      'Actief — primaire groeidoelgroep 2026. Wat werkt: slim, modern, zonder gedoe, snel grip, duidelijke structuur, begeleiding die in een druk leven past. Wat averechts werkt: trage traditionele taal, nadruk op senior golfers, gezelligheid zonder progressie, onduidelijke routes. Instap: startersprogramma, daarna Basis of direct Ontwikkel.',
  },
  {
    name: 'De ervaren, vastgelopen golfer',
    tagline: 'Speelt al jaren, heeft alles geprobeerd, wil dat golf weer logisch wordt',
    occupation: 'Professional, ondernemer of gepensioneerd',
    age: '50-80',
    bio:
      'Speelt al lang, vaak loyaal, vaak serieus, vaak gefrustreerd. Heeft veel geprobeerd, veel tips gehoord en daardoor veel verwarring opgebouwd. Zoekt geen revolutie en geen hype, maar rust, vertrouwen, eenvoud en weer plezier. Wil houvast.',
    quote: 'Het is vast weer te ingewikkeld.',
    frustrations: [
      'Gebrek aan vertrouwen',
      'Inconsistente slagen',
      'Frustratie en onrust',
      'Geen duidelijk plan',
      'Het gevoel dat golf moeilijker is dan nodig',
    ],
    goals: ['Rust', 'Begrijpelijkheid', 'Een herhaalbare basis', 'Plezier', 'Weer grip krijgen'],
    motivations: [
      'Functioneel: minder missers, begrijpen wat er misgaat, weten wat te trainen',
      'Emotioneel: frustratie verminderen, schaamte en twijfel wegnemen, met vertrouwen de baan in',
      'Sociaal: fijn meespelen, zich niet afgeschreven voelen, een veilige plek houden',
    ],
    behaviors: [
      'Beslist bedachtzaam',
      'Behoefte aan vertrouwen en helderheid',
      'Prijsgevoelig, maar vooral risicogevoelig',
      'Zoekt bevestiging dat dit niet te groot of te ingewikkeld is',
    ],
    buyingTriggers: [
      'Frustratie',
      'Verlangen naar plezier terug',
      'Herkenning',
      'Geruststelling',
      'Het gevoel serieus genomen te worden',
      'Eenvoud als belofte',
    ],
    decisionCriteria: [
      '"Het is vast weer te ingewikkeld."',
      '"Ik ben niet zo van al die systemen."',
      '"Dat is misschien te fanatiek voor mij."',
      '"Werkt dit nog wel voor mij?"',
      '"Ik wil geen druk."',
    ],
    strategicImplications:
      'Actief — retentiedoelgroep. Wat werkt: rust, begrip, eenvoud, vertrouwen, continuïteit, "je hoeft het niet alleen uit te zoeken". Wat averechts werkt: schreeuwerige ambitie, extreme prestatietaal, techniek als hoofdverhaal, te jonge en te snelle energie. Instap: Basis, soms Ontwikkel zodra vertrouwen en ritme er zijn; grootste risico is te lang in Basis blijven hangen. Let op: deze doelgroep moet zich herkennen, maar mag de energie, beeldtaal en ambitie van de communicatie niet domineren.',
  },
  {
    name: 'De ondernemende prestatiegolfer',
    tagline: 'Koopt geen uren, maar voorsprong',
    occupation: 'Ondernemer, directeur, partner, senior professional',
    age: '40-60',
    bio:
      'Geld, netwerk en ambitie, maar weinig tijd en weinig geduld. Golf is geen vrijblijvende hobby maar een mix van ontspanning, competitie, status en identiteit. Allergisch voor inefficiëntie en middelmaat.',
    quote: null,
    frustrations: ['Inefficiëntie', 'Middelmaat', 'Tijdgebrek'],
    goals: ['Voorsprong', 'Presteren onder druk'],
    motivations: [],
    behaviors: [],
    buyingTriggers: [],
    decisionCriteria: [],
    strategicImplications:
      'SLAPEND per 14 augustus 2026 — uit de etalage (besluit D5). Niet actief bespelen, geen content op richten. Alleen gebruiken voor individuele opvolging, niet voor gegenereerde marketingcontent. Blijft in het systeem omdat het aanbod bestaat en via persoonlijke aanbeveling doorloopt.',
  },
];

// ────────────────────────────────────────────────────────────────
// BLOK 15 — PRODUCTEN (prijzen conform 14 augustus 2026)
// ────────────────────────────────────────────────────────────────

const products = [
  {
    name: 'Weggever voor starters',
    slug: 'hng-weggever-starters',
    category: 'Leadmagneet',
    pricingModel: 'Gratis',
    pricingDetails: `Gratis — vorm nog te bepalen. Status: te ontwikkelen (${PEILDATUM}).`,
    description: 'Gratis weggever voor de startende golfer. Vorm nog te bepalen.',
    status: 'DRAFT' as const,
  },
  {
    name: 'Wanna Be a Golfer',
    slug: 'hng-wanna-be-a-golfer',
    category: 'Instapproduct',
    pricingModel: 'Eenmalig',
    pricingDetails: `€179 eenmalig. Status: in test (${PEILDATUM}).`,
    description:
      'Volledig online startersprogramma richting baanpermissie. Het enige startersprogramma dat 100% online kan: elders moet je één of twee hele dagen naar een locatie, voor €200 tot €300. Bij ons niet.',
    benefits: ['100% online — geen reistijd, geen vaste dag', 'Stap voor stap richting baanpermissie'],
    status: 'ANALYZED' as const,
  },
  {
    name: 'Starterssetje clubs',
    slug: 'hng-starterssetje-clubs',
    category: 'Materiaal',
    pricingModel: 'Eenmalig',
    pricingDetails: `€750. Status: actief (${PEILDATUM}).`,
    description: 'Starterssetje golfclubs voor de beginnende golfer.',
    status: 'ANALYZED' as const,
  },
  {
    name: 'Scorecard-weggever',
    slug: 'hng-scorecard-weggever',
    category: 'Leadmagneet',
    pricingModel: 'Gratis',
    pricingDetails: `Gratis. Status: te ontwikkelen (${PEILDATUM}).`,
    description: 'Gratis weggever voor de ervaren golfer.',
    status: 'DRAFT' as const,
  },
  {
    name: 'Proeftraining Slagkracht — live',
    slug: 'hng-proeftraining-slagkracht-live',
    category: 'Instapproduct',
    pricingModel: 'Eenmalig',
    pricingDetails: `€47. Status: actief (${PEILDATUM}).`,
    description: 'Live proeftraining Slagkracht voor de ervaren golfer.',
    status: 'ANALYZED' as const,
  },
  {
    name: 'Slagkracht online',
    slug: 'hng-slagkracht-online',
    category: 'Instapproduct',
    pricingModel: 'Nog te bepalen',
    pricingDetails: `Prijs n.t.b. Status: in ontwikkeling (${PEILDATUM}).`,
    description:
      'Online variant van Slagkracht. Belofte: je wordt aanzienlijk beter zonder dat er iets aan je swing verandert. Voor wie ver weg woont, of wie bang is om zijn swing overhoop te halen.',
    status: 'DRAFT' as const,
  },
  {
    name: 'Losse live events',
    slug: 'hng-losse-live-events',
    category: 'Instapproduct',
    pricingModel: 'Eenmalig',
    pricingDetails: `€89 per event. Status: actief (${PEILDATUM}).`,
    description: 'Losse live events voor kennismaking en verdieping.',
    status: 'ANALYZED' as const,
  },
  {
    name: 'Trackman nulmeting',
    slug: 'hng-trackman-nulmeting',
    category: 'Instapproduct',
    pricingModel: 'Eenmalig',
    pricingDetails: `€179. Status: actief (${PEILDATUM}).`,
    description: 'Trackman nulmeting: een helder startpunt op basis van waar je echt staat.',
    status: 'ANALYZED' as const,
  },
  {
    name: 'Lidmaatschap Basis',
    slug: 'hng-lidmaatschap-basis',
    category: 'Kernproduct',
    pricingModel: 'Jaarlijks',
    pricingDetails: `€249 per jaar. Status: in test (${PEILDATUM}).`,
    description:
      'Voor de golfer die grip wil krijgen op zijn spel. Fundament: consistente impact, logisch materiaal, helder begrip van hoe golf werkt. Minder ruis, meer richting.',
    status: 'ANALYZED' as const,
  },
  {
    name: 'Lidmaatschap Ontwikkel',
    slug: 'hng-lidmaatschap-ontwikkel',
    category: 'Kernproduct',
    pricingModel: 'Jaarlijks',
    pricingDetails: `€750 per jaar. Status: in test (${PEILDATUM}).`,
    description:
      'Voor de golfer die zijn spel wil verfijnen. Het fundament staat, nu gaat het om herhaling, diepgang en consistentie. Minder frustratie, meer vertrouwen in de eigen swing.',
    status: 'ANALYZED' as const,
  },
  {
    name: 'Lidmaatschap Prestatie',
    slug: 'hng-lidmaatschap-prestatie',
    category: 'Kernproduct',
    pricingModel: 'Jaarlijks',
    pricingDetails: `€1.250 per jaar. Status: in test (${PEILDATUM}).`,
    description:
      'Voor de golfer die wil presteren onder druk. In competitie, in de club of gewoon op het eerste tee-vak.',
    status: 'ANALYZED' as const,
  },
  {
    name: 'OneLength Golf Club Check',
    slug: 'hng-onelength-golf-club-check',
    category: 'Leadmagneet',
    pricingModel: 'Gratis',
    pricingDetails: `Gratis. Status: actief (${PEILDATUM}).`,
    description:
      'Gratis check als SEO-ingang op OneLength, Avoda en verwante termen. OneLength is gereedschap, geen methodepijler (besluit D2) — maar wel een volwaardige productlijn.',
    status: 'ANALYZED' as const,
  },
  {
    name: 'OneLength clubs',
    slug: 'hng-onelength-clubs',
    category: 'Materiaal',
    pricingModel: 'Op aanvraag',
    pricingDetails: `Op aanvraag. Status: actief (${PEILDATUM}).`,
    description:
      'OneLength clubs: logisch materiaal als gereedschap naast de methode. Commercieel gewicht: circa de helft van de omzet komt uit clubverkoop — vindbaarheid op OneLength, Avoda en verwante termen is geen bijzaak.',
    status: 'ANALYZED' as const,
  },
];

// ────────────────────────────────────────────────────────────────
// BLOK 16 — CONCURRENTEN (als categorie, niet op naam)
// ────────────────────────────────────────────────────────────────

const competitors = [
  {
    name: 'Lokale golfclubs met startersdagen',
    slug: 'lokale-golfclubs-startersdagen',
    tagline: 'Eén of twee dagen op locatie, €200-300',
    description:
      'Directe concurrent van Wanna Be a Golfer. Ons voordeel: volledig online, geen reistijd, geen vaste dag.',
    tier: 'DIRECT' as const,
  },
  {
    name: 'De klassieke golfpro',
    slug: 'klassieke-golfpro',
    tagline: 'Losse lessen per uur, techniek als uitgangspunt',
    description:
      'Onze structurele tegenhanger. Losse lessen zonder systeem, elke pro een eigen waarheid.',
    tier: 'DIRECT' as const,
  },
  {
    name: 'Swinganalyse-apps',
    slug: 'swinganalyse-apps',
    tagline: 'Film je swing, krijg een score en verbeterpunten',
    description:
      'Wijzen het probleem aan zonder oplossing te geven. Versterken interne focus en technisch denken — precies wat wij wegnemen.',
    tier: 'INDIRECT' as const,
  },
  {
    name: 'Data- en fittingaanbieders',
    slug: 'data-en-fittingaanbieders',
    tagline: 'Meten is weten',
    description:
      'Overlappen met ons materiaalverhaal, maar zonder methodiek eromheen. Data zonder pad.',
    tier: 'INDIRECT' as const,
  },
  {
    name: 'Gratis golfcontent op YouTube en social',
    slug: 'gratis-golfcontent-youtube-social',
    tagline: 'Duizend tips, geen volgorde',
    description:
      'Bron van de ruis waar onze doelgroep in vastloopt. Niet aanvallen — herkennen.',
    tier: 'INDIRECT' as const,
  },
];

// ────────────────────────────────────────────────────────────────
// BLOK 17 — KENNISBRONNEN (alleen de lokaal beschikbare documenten)
// ────────────────────────────────────────────────────────────────

const DOWNLOADS = join(homedir(), 'Downloads');

const knowledgeDocs = [
  {
    title: 'MooiMerk Branddoc HNG v2.1',
    category: 'Merkfundament',
    description:
      'Waardepropositie, waarden, archetype, StoryBrand, ladder, ecosysteem.',
    filePath: join(DOWNLOADS, 'MooiMerk Branddoc HNG - 2026.pdf'),
    fileType: 'pdf',
  },
  {
    title: 'Persona-document HNG 2026',
    category: 'Doelgroep',
    description: 'Volledige persona-uitwerking, ladder-fit, frictie.',
    filePath: join(DOWNLOADS, "Persona's Het Nieuwe Golfen 2026.md"),
    fileType: 'md',
  },
];

// ────────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────────

/** Neem bestaande score-/slider-velden over uit de oude frameworkData. */
function carryOver(
  existing: Prisma.JsonValue | null,
  keys: string[],
): Record<string, unknown> {
  if (!existing || typeof existing !== 'object' || Array.isArray(existing)) return {};
  const src = existing as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (src[key] !== undefined) out[key] = src[key];
  }
  return out;
}

async function main() {
  console.log('⛳ Fill Het Nieuwe Golfen — invulboek 14-08-2026\n');

  // ── Stap 1: contenttaal ─────────────────────────────────────
  await prisma.workspace.update({
    where: { id: WORKSPACE_ID },
    data: { contentLanguage: 'nl' },
  });
  console.log('1️⃣  Workspace.contentLanguage → nl');

  // ── Stap 2: brand assets (blokken 2-9) ──────────────────────
  console.log('\n2️⃣  Brand assets');
  const assets = await prisma.brandAsset.findMany({
    where: { workspaceId: WORKSPACE_ID },
    select: { id: true, slug: true, frameworkData: true },
  });
  const bySlug = new Map(assets.map((a) => [a.slug, a]));

  const assetUpdates: Array<{
    slug: string;
    data: Record<string, unknown>;
    scoreKeys: string[];
    description: string;
    content: string;
  }> = [
    {
      slug: 'brand-essence',
      data: brandEssence,
      scoreKeys: ['validationScores'],
      description:
        'Logische bevrijding die leidt tot golfgeluk. Het enige complete golf-ontwikkelsysteem dat traditionele complexiteit vervangt door logische eenvoud.',
      content:
        'De essentie van Het Nieuwe Golfen: logische bevrijding die leidt tot golfgeluk. Logica vervangt complexiteit, een gestructureerd pad vervangt losse lessen — en daaruit volgt echte vooruitgang en plezier.',
    },
    {
      slug: 'brand-promise',
      data: brandPromise,
      scoreKeys: [],
      description:
        'Een helder, logisch pad naar golfgeluk — met bewezen methodiek, gestructureerd ontwikkelpad en een community die je vooruit helpt.',
      content:
        'Wij geven je een helder, logisch pad naar golfgeluk — met een bewezen methodiek, een gestructureerd ontwikkelpad en een community die je vooruit helpt. Zodat je vooruitgang ziet in je spel en het plezier terugkrijgt.',
    },
    {
      slug: 'mission-statement',
      data: missionVision,
      scoreKeys: [],
      description:
        'Missie: golfgeluk via een systeem dat werkt. Visie: een golfwereld waarin de eenvoud van Het Nieuwe Golfen de norm is.',
      content:
        'Missie: wij bieden golfgeluk via een systeem dat werkt. Visie: een wereld zonder onnodige frustratie en complexe theorieën, waarin elke speler sneller resultaat bereikt en logica leidt tot maximaal spelplezier.',
    },
    {
      slug: 'brand-archetype',
      data: brandArchetype,
      scoreKeys: [],
      description:
        'Hero 70% + Outlaw 30%: de zelfverzekerde coach die de regels van het spel herschreven heeft en de status quo van traditioneel golfonderwijs uitdaagt.',
      content:
        'Het Nieuwe Golfen combineert Hero (bewezen methodiek, zichtbaar resultaat, meesterschap) met Outlaw (tegen de stroom in, de complexiteit van traditioneel golfonderwijs uitdagen). De rebel met een systeem dat werkt.',
    },
    {
      slug: 'core-values',
      data: brandHouseValues,
      scoreKeys: [],
      description:
        'Vijf kernwaarden: Rationeel en Vrijheid als anker (Roots), Golfgeluk en Doelgericht als ambitie (Wings), Eigenzinnig als eigen waarde (Fire).',
      content:
        'De waarden van Het Nieuwe Golfen: Rationeel (wij doen niets zomaar), Vrijheid (wij bevrijden golfers van ballast), Golfgeluk (golfen hoort leuk te zijn), Doelgericht (alles draait om resultaat) en Eigenzinnig (we doen de dingen fundamenteel anders).',
    },
    {
      slug: 'brand-personality',
      data: brandPersonality,
      scoreKeys: [],
      description:
        'De coach die je liever de waarheid vertelt dan je te vriend houdt. Rustig maar stellig, nuchter met een droge ondertoon.',
      content: personalityProse,
    },
    {
      slug: 'brand-story',
      data: brandStory,
      scoreKeys: [],
      description:
        'Michel begon in 2015 met één vraag: waar raak je de bal, en wat gebeurt er dan? Het probleem is nooit de golfer geweest — het probleem is hoe golf wordt onderwezen.',
      content: storyProse,
    },
    {
      slug: 'social-relevancy',
      data: socialRelevancy,
      scoreKeys: ['authenticityScores'],
      description:
        'Wij maken golf toegankelijker door het eenvoudiger te maken, niet door het te versimpelen. De golfwereld leuker achterlaten dan we hem aantroffen.',
      content: socialProse,
    },
  ];

  for (const { slug, data, scoreKeys, description, content } of assetUpdates) {
    const asset = bySlug.get(slug);
    if (!asset) {
      console.log(`  ⚠️  ${slug} — niet gevonden, overgeslagen`);
      continue;
    }
    const carried = carryOver(asset.frameworkData, scoreKeys);
    await prisma.brandAsset.update({
      where: { id: asset.id },
      data: {
        frameworkData: { ...carried, ...data } as Prisma.InputJsonValue,
        description,
        content: content as unknown as Prisma.InputJsonValue,
      },
    });
    console.log(`  ✅ ${slug}`);
  }

  // ── Stap 3a: voice guide + baseline (blokken 10-11) ─────────
  console.log('\n3️⃣  Brand Voiceguide (volledige vervanging van de gescrapete gids)');
  await prisma.brandVoiceguide.upsert({
    where: { workspaceId: WORKSPACE_ID },
    create: { workspaceId: WORKSPACE_ID, createdById: USER_ID, ...voiceguideData },
    update: {
      ...voiceguideData,
      // Centroid hoort bij de oude samples — wordt hierna opnieuw berekend.
      centroidComputedAt: null,
    },
  });
  console.log('  ✅ Voiceguide vervangen (voice-DNA, richtlijnen, vocabulaire, samples, nl-NL)');

  // ── Stap 3b: F-VAL-regels (blok 12) ─────────────────────────
  console.log('\n4️⃣  F-VAL-regels');
  // Auto-sync uit voiceguide (zelfde codepad als de app-UI gebruikt):
  const { syncVoiceguideToRules } = await import('../src/lib/brand-fidelity/brand-rule-sync');
  const syncResult = await syncVoiceguideToRules(WORKSPACE_ID, {
    wordsWeAvoid,
    antiPatterns,
  });
  console.log(
    `  ✅ Auto-sync: ${syncResult.wordsCreated} woord-regels (warning), ${syncResult.antiCreated} anti-pattern-regels (error)`,
  );

  // Handmatige regels (pijler-referentie, laddernamen, stijlregels):
  await prisma.brandRule.deleteMany({ where: { workspaceId: WORKSPACE_ID, source: 'manual' } });
  for (const rule of manualRules) {
    await prisma.brandRule.create({
      data: {
        workspaceId: WORKSPACE_ID,
        ruleType: rule.ruleType,
        pattern: rule.pattern,
        patternIsRegex: rule.patternIsRegex ?? false,
        message: rule.message,
        severity: rule.severity,
        isActive: rule.isActive ?? true,
        source: 'manual',
      },
    });
  }
  console.log(`  ✅ ${manualRules.length} handmatige regels (waarvan 3 REQUIRED_PHRASE inactief — zie script-commentaar)`);

  // FidelityConfig zodat de scoring-pijlers gewicht hebben:
  await prisma.fidelityConfig.upsert({
    where: { workspaceId: WORKSPACE_ID },
    create: { workspaceId: WORKSPACE_ID },
    update: {},
  });
  console.log('  ✅ FidelityConfig aanwezig (defaults 0.35/0.45/0.20)');

  // ── Stap 5: typografie en kleur (blok 13) ───────────────────
  console.log('\n5️⃣  Typografie en kleur');
  const styleguide = await prisma.brandStyleguide.findUnique({
    where: { workspaceId: WORKSPACE_ID },
    select: { id: true },
  });
  if (!styleguide) {
    console.log('  ⚠️  Geen styleguide gevonden — blok 13 overgeslagen');
  } else {
    await prisma.styleguideFont.deleteMany({ where: { styleguideId: styleguide.id } });
    for (const font of fonts) {
      await prisma.styleguideFont.create({
        data: { ...font, styleguideId: styleguide.id, workspaceId: WORKSPACE_ID },
      });
    }
    console.log('  ✅ Fonts vervangen (voorlopig — MooiMerk-fase, besluit D3)');

    await prisma.styleguideColor.deleteMany({ where: { styleguideId: styleguide.id } });
    for (const color of styleguideColors) {
      await prisma.styleguideColor.create({
        data: { ...color, styleguideId: styleguide.id },
      });
    }
    console.log(`  ✅ ${styleguideColors.length} kleuren gezet (incl. ladderkleuren in notes)`);

    await prisma.brandStyleguide.update({
      where: { id: styleguide.id },
      data: {
        primaryFontName: 'Neue Haas Grotesk Display',
        additionalFonts: ["Suisse Int'l (body)", 'JetBrains Mono (mono)'],
        designPhilosophy,
        photographyGuidelines,
        imageryDonts,
        colorsSavedForAi: true,
        typographySavedForAi: true,
        imagerySavedForAi: true,
      },
    });
    console.log('  ✅ Vormtaal + fotografie + font-namen bijgewerkt');
  }

  // ── Stap 6a: personas (blok 14) ─────────────────────────────
  console.log('\n6️⃣  Personas');
  for (const persona of personas) {
    const existing = await prisma.persona.findFirst({
      where: { workspaceId: WORKSPACE_ID, name: persona.name },
      select: { id: true },
    });
    const data = {
      name: persona.name,
      tagline: persona.tagline,
      occupation: persona.occupation,
      age: persona.age,
      bio: persona.bio,
      quote: persona.quote,
      frustrations: persona.frustrations,
      goals: persona.goals,
      motivations: persona.motivations,
      behaviors: persona.behaviors,
      buyingTriggers: persona.buyingTriggers as unknown as Prisma.InputJsonValue,
      decisionCriteria: persona.decisionCriteria as unknown as Prisma.InputJsonValue,
      strategicImplications: persona.strategicImplications,
    };
    if (existing) {
      await prisma.persona.update({ where: { id: existing.id }, data });
      console.log(`  ✅ ${persona.name} (bijgewerkt)`);
    } else {
      await prisma.persona.create({
        data: { ...data, workspaceId: WORKSPACE_ID, createdById: USER_ID },
      });
      console.log(`  ✅ ${persona.name}`);
    }
  }

  // ── Stap 6b: producten (blok 15) ────────────────────────────
  console.log('\n7️⃣  Producten');
  for (const product of products) {
    const { benefits, ...rest } = product as (typeof products)[number] & { benefits?: string[] };
    await prisma.product.upsert({
      where: { slug: product.slug },
      create: {
        ...rest,
        benefits: benefits ?? [],
        source: 'MANUAL',
        workspaceId: WORKSPACE_ID,
      },
      update: { ...rest, benefits: benefits ?? [] },
    });
    console.log(`  ✅ ${product.name} — ${product.pricingDetails}`);
  }
  console.log(
    '  ℹ️  Bewust NIET opgenomen (besluit D5): Business Golf Clinic, Netwerk, Executive, corporate golfdagen, 1-op-1 high performance coaching.',
  );

  // ── Stap 6c: concurrenten (blok 16) ─────────────────────────
  console.log('\n8️⃣  Concurrenten (als categorie, niet op naam)');
  for (const competitor of competitors) {
    await prisma.competitor.upsert({
      where: {
        workspaceId_slug: { workspaceId: WORKSPACE_ID, slug: competitor.slug },
      },
      create: {
        ...competitor,
        workspaceId: WORKSPACE_ID,
        createdById: USER_ID,
        source: 'MANUAL',
        status: 'ANALYZED',
      },
      update: { ...competitor, status: 'ANALYZED' },
    });
    console.log(`  ✅ ${competitor.name} (${competitor.tier})`);
  }

  // ── Stap 7: kennisbronnen (blok 17) ─────────────────────────
  console.log('\n9️⃣  Kennisbronnen');
  const { extractText } = await import('unpdf');
  for (const doc of knowledgeDocs) {
    let content: string;
    try {
      if (doc.fileType === 'pdf') {
        const buffer = readFileSync(doc.filePath);
        const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        const { text } = await extractText(uint8, { mergePages: true });
        content = text;
      } else {
        content = readFileSync(doc.filePath, 'utf8');
      }
    } catch (err) {
      console.log(`  ⚠️  ${doc.title} — bron niet leesbaar (${(err as Error).message}), overgeslagen`);
      continue;
    }
    const existing = await prisma.knowledgeResource.findFirst({
      where: { workspaceId: WORKSPACE_ID, title: doc.title },
      select: { id: true },
    });
    const data = {
      title: doc.title,
      description: doc.description,
      type: 'document',
      category: doc.category,
      source: 'MANUAL' as const,
      language: 'nl',
      fileName: doc.filePath.split('/').pop() ?? null,
      fileType: doc.fileType,
      content,
    };
    if (existing) {
      await prisma.knowledgeResource.update({ where: { id: existing.id }, data });
    } else {
      await prisma.knowledgeResource.create({
        data: { ...data, workspaceId: WORKSPACE_ID, createdBy: USER_ID },
      });
    }
    console.log(`  ✅ ${doc.title} (${content.length} tekens geëxtraheerd)`);
  }
  console.log(
    '  ℹ️  Nog niet lokaal beschikbaar: "Schrijven voor het brein — HNG-context" en "HNG Sitemap & Priority Guide 2026".',
  );
  console.log(
    '  ℹ️  Bewust NIET toegevoegd: Product_Ecosysteem_HNG_2026.xlsx (bevat interne bijnamen + vervallen vierde tier).',
  );

  console.log('\n🎉 Klaar. Vervolg: centroid herberekenen + hertest met de drie referentieteksten.');

  await prisma.$disconnect();
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await prisma.$disconnect();
    await pool.end();
  } catch {
    /* noop */
  }
  process.exit(1);
});
