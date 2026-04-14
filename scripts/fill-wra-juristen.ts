/**
 * Fill WRA Juristen knowledge section (brand assets, brandstyle, trends)
 * with data from the brand documents:
 *   - docs/Branddoc WRA Juristen.pdf
 *   - docs/Logo 2026 WRA Juristen.pdf
 *
 * Run: DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" npx tsx scripts/fill-wra-juristen.ts
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: 'postgresql://erikjager:@localhost:5432/branddock' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const WORKSPACE_ID = 'cmnslwqwv0000akmswepx1gsq';
const USER_ID = 'demo-user-erik-001';

// ────────────────────────────────────────────────────────────────
// BRAND ASSETS
// ────────────────────────────────────────────────────────────────

// ── Golden Circle ───────────────────────────────────────────────
const goldenCircle = {
  why: {
    statement:
      'Wij geloven dat eerlijk werkgeverschap bescherming verdient.',
    details:
      'Wij geloven dat eerlijk werkgeverschap bescherming verdient. De werknemer heeft die al lang. De ondernemer verdient een gelijkwaardige partner aan zijn kant.',
  },
  how: {
    statement:
      'Door naast je te staan. Niet als afstandelijk adviseur, maar als iemand die meedenkt, meekijkt en meevecht wanneer het nodig is.',
    details:
      'Door naast je te staan. Niet als afstandelijk adviseur, maar als iemand die meedenkt, meekijkt en meevecht wanneer het nodig is. Laagdrempelig, in heldere taal en tegen een eerlijke prijs. Wij kennen de markt en snappen dat een ondernemer geen "juridisch gedoe" wil, maar een oplossing.',
  },
  what: {
    statement:
      'Wij begeleiden MKB-bedrijven bij arbeidsrechtelijke vraagstukken.',
    details:
      'Wij begeleiden MKB-bedrijven bij arbeidsrechtelijke vraagstukken. Van vaststellingsovereenkomst en ontslagtrajecten tot contracten en reorganisaties. Praktisch, persoonlijk en resultaatgericht.',
  },
};

// ── Transformative Goals ────────────────────────────────────────
const transformativeGoals = {
  massiveTransformativePurpose:
    'Eerlijk werkgeverschap verdient een gelijkwaardige partner aan zijn kant.',
  mtpNarrative:
    'WRA Juristen wil dat MKB-ondernemers nooit meer alleen staan bij arbeidsrechtelijke beslissingen. Wij willen het standaardbeeld van de afstandelijke jurist doorbreken en bewijzen dat juridische bijstand laagdrempelig, eerlijk en menselijk kan zijn.',
  goals: [
    {
      title: 'Denken: Iemand die het begrijpt',
      description:
        'WRA Juristen is iemand die begrijpt wat ik als werkgever meemaak. WRA Juristen staat naast mij, doet niet ingewikkeld, maar is nuchter, eerlijk en benaderbaar.',
      impactDomain: 'People',
      timeframe: '2026-2030',
      measurableCommitment:
        'Klanten ervaren WRA Juristen als nuchtere, eerlijke en benaderbare partner die hun situatie begrijpt.',
      milestones: [],
      sdgAlignment: [],
    },
    {
      title: 'Voelen: Rust en vertrouwen',
      description:
        'WRA Juristen geeft mij rust. De onzekerheid over wat ik wel en niet mag, wat iets gaat kosten en hoe het afloopt is verdwenen. Ik voel me gesteund en serieus genomen.',
      impactDomain: 'People',
      timeframe: '2026-2030',
      measurableCommitment:
        'Ondernemers voelen rust en steun in trajecten waar ze normaal alleen voor zouden staan.',
      milestones: [],
      sdgAlignment: [],
    },
    {
      title: 'Handelen: Zorgvuldig en doortastend',
      description:
        'WRA Juristen helpt me de juiste beslissingen te nemen. Ik stel geen gesprekken meer uit en laat situaties niet escaleren. WRA geeft mij de handvatten om zorgvuldig en doortastend te handelen.',
      impactDomain: 'People',
      timeframe: '2026-2030',
      measurableCommitment:
        'Werkgevers nemen tijdig actie in plaats van situaties te laten escaleren of beslissingen uit te stellen.',
      milestones: [],
      sdgAlignment: [],
    },
  ],
  authenticityScores: {
    ambition: 4,
    authenticity: 5,
    clarity: 5,
    measurability: 3,
    integration: 5,
    longevity: 4,
  },
  stakeholderImpact: [
    {
      stakeholder: 'MKB-werkgevers',
      role: 'Klanten',
      expectedImpact:
        'Rust, vertrouwen en handvatten om zorgvuldig en doortastend te handelen.',
    },
    {
      stakeholder: 'Werknemers',
      role: 'Tegenpartij in arbeidsconflicten',
      expectedImpact:
        'Een gelijkwaardig speelveld waarin ook werkgevers professioneel vertegenwoordigd zijn.',
    },
    {
      stakeholder: 'Brancheorganisaties MKB',
      role: 'Partners',
      expectedImpact:
        'Een betrouwbare verwijzing voor leden die juridische bijstand nodig hebben.',
    },
  ],
  brandIntegration: {
    positioningLink:
      'WRA Juristen positioneert zich als de gelijkwaardige juridische partner voor MKB-werkgevers — naast je, niet boven je.',
    themes: [
      'Jouw recht. Onze zaak.',
      'Wie staat er aan jouw kant?',
      'Eerlijk werkgeverschap verdient bescherming',
    ],
    campaigns: [],
    internalActivation:
      'De transformationele doelen worden intern verankerd via de waarden Gelijkwaardigheid, Meesterschap, Slagvaardig, Voorsprong en Ontzorging — en doorvertaald naar elk klantcontact.',
  },
};

// ── BrandHouse Values (Core Values) ─────────────────────────────
const brandHouseValues = {
  anchorValue1: {
    name: 'Gelijkwaardigheid',
    description:
      'Wij zijn geen partij die boven je staat en uitlegt hoe het zit. Wij zitten naast je. Op ooghoogte, in gewone taal, met oprechte interesse in wat de jou als ondernemer bezighoudt. Die gelijkwaardigheid geldt ook aan de onderhandelingstafel: wij zorgen dat de werkgever met dezelfde juridische kracht aan tafel zit als de tegenpartij.',
  },
  anchorValue2: {
    name: 'Ontzorging',
    description:
      'Als MKB-ondernemer heb je vaak geen juridische afdeling, HR-manager of tijd om je in wetgeving te verdiepen. Dat hoeft ook niet. Wij nemen het juridische gewicht over. Volledig, zorgvuldig en zonder dat je als ondernemer er wakker van hoeft te liggen. Wij regelen het.',
  },
  aspirationValue1: {
    name: 'Voorsprong',
    description:
      'De arbeidsrechtmarkt verandert sneller dan ooit. Nieuwe wetgeving, strengere handhaving, hogere vergoedingen; het houdt niet op. Wij wachten niet af. Wij lopen vooraan in kennis, signaleren risico\'s voordat ze problemen worden en zorgen dat onze klanten nooit worden verrast. Proactief denken is geen luxe, het is een noodzaak.',
  },
  aspirationValue2: {
    name: 'Slagvaardig',
    description:
      'Wij twijfelen niet, dralen niet en wachten niet af. Wij lezen de situatie, bepalen de strategie en handelen. In gesprek met anderen en aan de onderhandelingstafel maakt dat het verschil: we weten wanneer we moeten duwen en wanneer we moeten wachten om het beste resultaat binnen te halen.',
  },
  ownValue: {
    name: 'Meesterschap',
    description:
      'Wij willen niet de grootste zijn, maar wel de scherpste. De onderhandeling is ons speelveld. Wij kennen de regels, de tactieken en de valkuilen. Die kennis en ervaring gebruiken we om het beste resultaat te realiseren.',
  },
  valueTension:
    'De spanning tussen Ontzorging (volledige overname) en Gelijkwaardigheid (op ooghoogte naast de klant). WRA Juristen lost dit op door de ondernemer juist informatie en grip te geven, terwijl wij het juridische werk wegnemen. De klant blijft regisseur, wij doen het uitvoerende werk.',
};

// ── Brand Archetype ─────────────────────────────────────────────
// Caregiver primary (naast je staan, beschermen, ontzorgen, "wie staat er aan jouw kant")
// Hero secondary (meevechten, slagvaardig, "we kennen het spel", scherp aan de onderhandelingstafel)
const brandArchetype = {
  primaryArchetype: 'Caregiver',
  subArchetype: 'Hero',
  coreDesire:
    'Bescherming bieden aan ondernemers die het verdienen — eerlijk werkgeverschap met een professionele partner naast zich.',
  coreFear:
    'Dat MKB-werkgevers er alleen voor staan tegenover beter bewapende werknemers en escalerende juridische risico\'s.',
  brandGoal:
    'De juridische partner zijn die naast de MKB-ondernemer staat, het juridische gewicht overneemt en het beste resultaat aan de onderhandelingstafel realiseert.',
  strategy:
    'Combineer de zorgzame, ontzorgende kant (Caregiver) met de scherpte en slagvaardigheid van een Hero die het spel beheerst en pas stopt als het resultaat er staat.',
  giftTalent:
    'Het vermogen om complexe arbeidsrechtelijke situaties te begrijpen en te vertalen naar heldere, menselijke begeleiding zonder juridisch jargon.',
  shadowWeakness:
    'De Caregiver-kant kan leiden tot overmatige verantwoordelijkheid nemen. De Hero-kant kan leiden tot een te confronterende toon waar samenwerken effectiever was.',
  brandVoiceDescription:
    'Nuchter, eerlijk en benaderbaar. We praten in heldere taal, met oprechte interesse en zonder juridisch jargon. Aan de onderhandelingstafel scherp en strategisch.',
  voiceAdjectives: ['Nuchter', 'Eerlijk', 'Benaderbaar', 'Helder', 'Scherp', 'Betrokken'],
  languagePatterns:
    'Korte zinnen, directe taal. Eerstepersoons "wij" om partnerschap te benadrukken. Vragen die de ondernemer centraal stellen ("Wie staat er eigenlijk aan jouw kant?"). Zelden juridische termen zonder uitleg.',
  weSayNotThat: [
    { weSay: 'Wij regelen het.', notThat: 'Ons kantoor zal de aangelegenheid in behandeling nemen.' },
    { weSay: 'Wat is jouw situatie?', notThat: 'Kunt u de feiten en omstandigheden uiteenzetten?' },
    { weSay: 'Naast je staan.', notThat: 'Juridische bijstand verlenen.' },
    { weSay: 'Geen gedoe. Een oplossing.', notThat: 'Wij streven naar een efficiënte resolutie.' },
  ],
  archetypeInAction:
    'Klantcommunicatie: Caregiver 70% / Hero 30% — focus op begrip, rust en ontzorging. Onderhandelingen: Caregiver 30% / Hero 70% — focus op scherpte, strategie en resultaat.',
  marketingExpression:
    'Beelden van werkgevers in gesprek met een betrokken adviseur. Geen kantoor-stockfoto\'s, geen gepolijste advocaten. Authentieke ondernemers in hun eigen omgeving. Tone: warm én strategisch.',
  customerExperience:
    'Korte lijnen, eerlijke prijsafspraken, geen onaangename verrassingen. Eén vast aanspreekpunt dat het hele traject overziet en ontzorgt.',
  contentStrategy:
    'Praktische uitleg van arbeidsrechtelijke onderwerpen in begrijpelijke taal. Casestudies over reële MKB-situaties. Tips over wanneer je actie moet ondernemen om escalatie te voorkomen.',
  storytellingApproach:
    'Vertel vanuit het perspectief van de ondernemer die voor een lastige beslissing staat. Toon de twijfel, de zorgen — en hoe WRA daar verandering in brengt.',
  brandExamples: [
    'Achmea / Centraal Beheer (Caregiver: "Even Apeldoorn bellen")',
    'BOVAG (Hero: zekerheid en bescherming met vakkennis)',
    'ARAG Rechtsbijstand (Caregiver+Hero: bescherming met juridische kracht)',
  ],
  positioningApproach:
    'De toegankelijke arbeidsrechtjurist voor MKB-werkgevers. Niet een afstandelijk advocatenkantoor met wachttijden en uurtarieven, maar een gelijkwaardige partner met heldere taal en scherpe inzet.',
  competitiveLandscape:
    'In een markt vol gespecialiseerde advocatenkantoren, AI-tools en abonnementsformules onderscheidt WRA Juristen zich door menselijke betrokkenheid gecombineerd met scherpte aan de onderhandelingstafel — gericht op één specifieke doelgroep: de MKB-werkgever.',
};

// ── Brand Story ─────────────────────────────────────────────────
const brandStory = {
  originStory:
    'Voor een werknemer is duidelijk wie aan zijn kant staat: vakbonden, juridisch adviseurs en platforms die zijn vaststellingsovereenkomst checken. Maar wie kijkt er eigenlijk mee met de werkgever? WRA Juristen ontstond uit de overtuiging dat MKB-ondernemers, die verantwoordelijkheid nemen voor hun mensen, óók een professionele partner verdienen.',
  founderMotivation:
    'De overtuiging dat eerlijk werkgeverschap bescherming verdient — en dat MKB-ondernemers niet alleen mogen staan tegenover steeds beter bewapende werknemers en steeds complexer wordende wetgeving.',
  coreBeliefStatement:
    'Wij geloven dat eerlijk werkgeverschap bescherming verdient. De werknemer heeft die al lang. De ondernemer verdient een gelijkwaardige partner aan zijn kant.',
  worldContext:
    'Het arbeidsrecht is in beweging: VBAR, Wet Meer Zekerheid Flexwerkers, EU-Loontransparantie, een transitievergoeding van €102.000 bruto en een tienjaarsrecord aan reorganisatiemeldingen. Werknemers hebben gratis VSO-checks en no cure no pay-juristen. MKB-werkgevers staan er vaak alleen voor.',
  customerExternalProblem:
    'Een arbeidsrechtelijk traject (vaststellingsovereenkomst, ontslag, reorganisatie of contractbeoordeling) zorgvuldig en zonder onnodig gedoe doorlopen.',
  customerInternalProblem:
    'De zorg om iets fout te doen, de stress over de kosten en de afloop, en het gevoel er als werkgever alleen voor te staan in een steeds complexer juridisch landschap.',
  philosophicalProblem:
    'Waarom is het zelfsprekend dat werknemers professionele bijstand krijgen, maar moet de werkgever het zelf maar uitzoeken? Wie kijkt er eigenlijk mee met de ondernemer die verantwoordelijkheid neemt voor zijn mensen?',
  stakesCostOfInaction:
    'Zonder een eigen adviseur staat de werkgever per definitie op achterstand: hogere transitievergoedingen, juridische missers, gefrustreerde trajecten, escalerende conflicten en uiteindelijk schade aan het bedrijf én aan de werkrelaties.',
  brandRole:
    'De gelijkwaardige juridische partner die naast de werkgever staat — die meedenkt, meekijkt en meevecht wanneer het nodig is.',
  empathyStatement:
    'We begrijpen dat afscheid nemen van mensen misschien wel het zwaarste is wat er is. Niet omdat je het niet kunt, maar omdat je het goed wíl doen. Zorgvuldig. Zonder gedoe achteraf.',
  authorityCredentials:
    'Specialisten in arbeidsrecht voor het MKB. Diepgaande kennis van vaststellingsovereenkomsten, ontslagtrajecten, contracten en reorganisaties. Wij kennen de markt, de tactieken en de valkuilen.',
  transformationPromise:
    'Van alleen staan naar gesteund worden. Van onzekerheid naar rust. Van uitstellen naar zorgvuldig en doortastend handelen.',
  customerSuccessVision:
    'De ondernemer die de juiste beslissingen neemt, situaties niet laat escaleren en met vertrouwen de onderhandelingstafel benadert — wetende dat er iemand naast hem staat die het spel beheerst.',
  abtStatement:
    'MKB-ondernemers nemen verantwoordelijkheid voor hun mensen, MAAR staan er juridisch vaak alleen voor terwijl werknemers wel professionele bijstand hebben. DAAROM staat WRA Juristen naast de werkgever — als gelijkwaardige partner met scherpte en menselijkheid.',
  brandThemes: [
    'Aan jouw kant',
    'Gelijkwaardig',
    'Eerlijk werkgeverschap',
    'Ontzorging',
    'Scherpte aan de onderhandelingstafel',
  ],
  emotionalTerritory: ['Rust', 'Vertrouwen', 'Steun', 'Erkenning', 'Grip'],
  keyNarrativeMessages: [
    'Jouw recht. Onze zaak.',
    'Wie staat er eigenlijk aan jouw kant?',
    'Eerlijk werkgeverschap verdient bescherming.',
    'Geen ingewikkelde trajecten. Geen juridisch jargon. Gewoon iemand die het regelt.',
  ],
  narrativeArc:
    'De werkgever staat er alleen voor → WRA Juristen kiest expliciet zijn kant → Met begrip én scherpte → Zorgvuldige en doortastende beslissingen → Eerlijk werkgeverschap dat beschermd wordt.',
  proofPoints: [
    'Specialisatie in MKB-arbeidsrecht — geen versnipperde generalist.',
    'Heldere taal, eerlijke prijs, geen verrassingen.',
    'Eén vast aanspreekpunt door het hele traject.',
    'Scherpte aan de onderhandelingstafel — meesterschap in onderhandelen.',
  ],
  valuesInAction: [
    'Gelijkwaardigheid: gesprekken op ooghoogte, in gewone taal.',
    'Ontzorging: het juridische gewicht volledig overnemen.',
    'Voorsprong: vooraan in kennis, risico\'s signaleren voordat ze problemen worden.',
    'Slagvaardig: beslissen en handelen, niet dralen.',
    'Meesterschap: de regels, tactieken en valkuilen kennen.',
  ],
  brandMilestones: [],
  elevatorPitch:
    'WRA Juristen begeleidt MKB-bedrijven bij arbeidsrechtelijke vraagstukken — van vaststellingsovereenkomst en ontslag tot contracten en reorganisaties. Niet als afstandelijk advocatenkantoor, maar als gelijkwaardige partner die naast je staat: in heldere taal, tegen een eerlijke prijs en met scherpte aan de onderhandelingstafel.',
  manifestoText:
    'Als werkgever neem jij beslissingen die er voor jou echt toe doen. Je neemt mensen aan, investeert in ze, en soms moet je afscheid nemen. Dat is misschien wel het zwaarste wat er is. Niet omdat je het niet kunt, maar omdat je het goed wil doen. Zorgvuldig, zonder gedoe achteraf. Maar wie staat er eigenlijk aan jouw kant?\n\nVoor een werknemer is dat duidelijk. Een vakbond of juridisch adviseur. Platforms die zijn vaststellingsovereenkomst checken. Juristen die op no cure no pay werken. Maar wie kijkt er eigenlijk mee met jou?\n\nOp al deze onderdelen komt WRA Juristen in beeld. Niet als advocatenkantoor met wachttijden en uurtarieven waar je van schrikt. Maar als iemand die naast je staat. Die snapt wat je meemaakt, gewone taal spreekt en je helpt om de juiste keuze te maken. Met kennis van het spel, scherpte in de onderhandeling en altijd met jouw belang voorop.\n\nWant wij geloven dat eerlijk werkgeverschap bescherming verdient. Dat jij als ondernemer, die verantwoordelijkheid neemt voor zijn mensen, recht heeft op iemand die verantwoordelijkheid neemt voor hem. Geen ingewikkelde trajecten. Geen juridisch jargon. Gewoon iemand die het regelt, zodat jij kunt ondernemen.\n\nWRA Juristen — Jouw recht. Onze zaak.',
  audienceAdaptations: {
    customers:
      'Jij hoeft niet alleen te staan. Wij nemen het juridische gewicht over en zorgen dat je met vertrouwen de juiste beslissingen kunt nemen.',
    investors: '',
    employees:
      'Bij WRA werken we naast onze klanten, niet erboven. Wij combineren juridische scherpte met oprechte betrokkenheid bij ondernemers.',
    partners:
      'Wij zijn de gespecialiseerde MKB-arbeidsrechtpartner waar brancheorganisaties en accountants op kunnen rekenen voor hun klanten.',
  },
};

// ── Brand Essence ───────────────────────────────────────────────
const brandEssence = {
  essenceStatement: 'Naast jou. Voor jou.',
  essenceNarrative:
    'De essentie van WRA Juristen is partnerschap: niet boven de klant, niet tegenover de klant, maar naast de klant. Met begrip én scherpte, met menselijkheid én meesterschap. WRA staat aan de kant van de MKB-werkgever — altijd.',
  functionalBenefit:
    'Specialistische arbeidsrechtelijke begeleiding voor MKB-werkgevers: vaststellingsovereenkomsten, ontslagtrajecten, contracten en reorganisaties. Heldere taal, eerlijke prijs, één vast aanspreekpunt.',
  emotionalBenefit:
    'Rust en grip. De zekerheid dat er iemand met je meekijkt en het spel beheerst, zodat jij kunt ondernemen.',
  selfExpressiveBenefit:
    'Door te kiezen voor WRA Juristen laat je zien dat je eerlijk werkgeverschap serieus neemt en zorgvuldig wilt handelen — met een professionele partner aan je kant.',
  discriminator:
    'De combinatie van menselijke benaderbaarheid en scherpte aan de onderhandelingstafel — exclusief gericht op de MKB-werkgever.',
  proofPoints: [
    'Identity evidence: gespecialiseerd in MKB-arbeidsrecht.',
    'Identity evidence: gelijkwaardige partner — naast de klant, niet erboven.',
    'Identity evidence: heldere taal in plaats van juridisch jargon.',
    'Identity evidence: één vast aanspreekpunt door het hele traject.',
  ],
  attributes: ['Gelijkwaardig', 'Ontzorgend', 'Scherp', 'Slagvaardig', 'Eerlijk', 'Benaderbaar'],
  audienceInsight:
    'MKB-werkgevers willen geen "juridisch gedoe", maar een oplossing. Ze willen iemand die hun situatie begrijpt, hun taal spreekt en hen helpt om de juiste beslissingen te nemen — zonder dat ze de jurist achteraan moeten zitten of voor onverwachte rekeningen komen te staan.',
  validationScores: {
    unique: 4,
    intangible: 4,
    meaningful: 5,
    authentic: 5,
    enduring: 5,
    scalable: 4,
  },
};

// ── Brand Promise ───────────────────────────────────────────────
const brandPromise = {
  promiseStatement: 'Jouw recht. Onze zaak.',
  promiseOneLiner:
    'Werkgevers verdienen ook een sterke partij aan hun kant. WRA Juristen staat naast je: betrokken, scherp en altijd met jouw belang voorop.',
  functionalValue:
    'Specialistische begeleiding bij arbeidsrechtelijke vraagstukken: vaststellingsovereenkomsten, ontslagtrajecten, contracten en reorganisaties — met heldere taal en een eerlijke prijs.',
  emotionalValue:
    'Het gevoel dat je er niet alleen voor staat. Rust over wat je wel en niet mag, wat het kost en hoe het afloopt.',
  selfExpressiveValue:
    'Kiezen voor WRA Juristen betekent kiezen voor zorgvuldig en doortastend werkgeverschap, ondersteund door een gelijkwaardige professionele partner.',
  targetAudience:
    'MKB-werkgevers (eigenaren, directeuren, HR-verantwoordelijken) die geconfronteerd worden met arbeidsrechtelijke vraagstukken en geen eigen juridische afdeling hebben.',
  coreCustomerNeed:
    'Een arbeidsrechtjurist die naast de werkgever staat, in heldere taal communiceert en het juridische gewicht overneemt — zonder dat de ondernemer er wakker van hoeft te liggen.',
  differentiator:
    'De enige specialist die exclusief de MKB-werkgever vertegenwoordigt — met de menselijkheid van een Caregiver en de scherpte van een Hero.',
  onlynessStatement:
    'Alleen WRA Juristen begeleidt MKB-werkgevers in arbeidsrechtelijke trajecten met de combinatie van gelijkwaardige partnerschap, heldere taal en scherpte aan de onderhandelingstafel — omdat wij geloven dat eerlijk werkgeverschap bescherming verdient.',
  proofPoints: [
    'Delivery proof: één vast aanspreekpunt door het hele traject.',
    'Delivery proof: heldere prijsafspraken — geen verrassingen achteraf.',
    'Delivery proof: signaleren risico\'s voordat ze problemen worden.',
    'Delivery proof: meesterschap in onderhandelen — we kennen het spel.',
  ],
  measurableOutcomes: [
    'Klanten ervaren de samenwerking als gelijkwaardig en ontzorgend.',
    'Trajecten worden afgesloten zonder onnodige escalatie.',
    'Onderhandelingsresultaten die meetbaar beter zijn dan de uitgangspositie.',
  ],
};

// ── Brand Personality ───────────────────────────────────────────
const brandPersonality = {
  dimensionScores: {
    sincerity: 5,        // eerlijk, oprecht, "geen gedoe"
    excitement: 3,       // gedreven en slagvaardig, niet flashy
    competence: 5,       // meesterschap, voorsprong, vakkennis
    sophistication: 3,   // helder en toegankelijk, niet elitair
    ruggedness: 3,       // doortastend en strijdbaar maar niet stoer
  },
  primaryDimension: 'Sincerity',
  secondaryDimension: 'Competence',
  personalityTraits: [
    {
      name: 'Gelijkwaardig',
      description: 'We staan naast je, niet boven je. Op ooghoogte, in gewone taal.',
      weAreThis: 'Toegankelijk, in jip-en-janneketaal, met oprechte interesse.',
      butNeverThat: 'Nooit hooghartig, neerbuigend of onbereikbaar.',
    },
    {
      name: 'Nuchter',
      description: 'We doen niet ingewikkeld. We benoemen wat er is en wat er moet gebeuren.',
      weAreThis: 'Realistisch, helder, no-nonsense.',
      butNeverThat: 'Nooit dramatisch, vaag of opgeklopt.',
    },
    {
      name: 'Slagvaardig',
      description: 'We dralen niet. We lezen de situatie en handelen.',
      weAreThis: 'Doortastend, daadkrachtig, beslist.',
      butNeverThat: 'Nooit afwachtend, traag of ontwijkend.',
    },
    {
      name: 'Scherp',
      description: 'Aan de onderhandelingstafel kennen we de regels, tactieken en valkuilen.',
      weAreThis: 'Strategisch, alert, vakkundig.',
      butNeverThat: 'Nooit slordig, naïef of overgeleverd.',
    },
    {
      name: 'Betrokken',
      description: 'We snappen wat een ondernemer meemaakt en staan echt aan zijn kant.',
      weAreThis: 'Empathisch, present, oprecht.',
      butNeverThat: 'Nooit afstandelijk, transactioneel of ongeïnteresseerd.',
    },
  ],
  spectrumSliders: {
    friendlyFormal: 3,         // vriendelijker dan formeel, maar professioneel
    energeticThoughtful: 4,    // beschouwend met energie waar het moet
    modernTraditional: 4,      // mix: modern in toon, traditioneel in vakmanschap
    playfulSerious: 6,         // serieus over het werk
    boldSubtle: 4,             // assertief maar niet overdreven
    abstractConcrete: 6,       // concreet: situaties, beslissingen, resultaten
    eliteAccessible: 6,        // expliciet toegankelijk
  },
  toneDimensions: {
    funnySerious: 5,             // serieus
    formalCasual: 4,             // helt naar casual
    respectfulIrreverent: 2,     // respectvol
    enthusiasticMatterOfFact: 5, // matter-of-fact
  },
  brandVoiceDescription:
    'De stem van WRA Juristen is nuchter, eerlijk en benaderbaar. We praten zoals we werken: in heldere taal, zonder juridisch jargon, met oprechte interesse in de situatie van de ondernemer. Aan de onderhandelingstafel klinkt diezelfde stem strategisch en scherp.',
  wordsWeUse: [
    'naast je',
    'gelijkwaardig',
    'het regelen',
    'jouw recht',
    'onze zaak',
    'helder',
    'eerlijke prijs',
    'meedenken',
    'scherp',
    'nuchter',
  ],
  wordsWeAvoid: [
    'cliënt',
    'aangelegenheid',
    'conform',
    'derhalve',
    'rechtsverhouding',
    'jurisprudentie zonder uitleg',
    'estate',
    'compliance-jargon',
    'wij streven naar',
    'ons kantoor',
  ],
  writingSample:
    'Je hebt een werknemer die niet meer functioneert. Je hebt het er al maandenlang over. Je weet dat het zo niet langer kan, maar je stelt het gesprek uit. Begrijpelijk. Want wat als je een misstap maakt? Wij snappen dat. Wij leggen je uit waar je staat, wat je opties zijn en wat het betekent. Daarna regelen we het. Eerlijke prijs, helder traject, jij houdt de regie.',
  channelTones: {
    website:
      'Toegankelijk en geruststellend. Beantwoord direct de vraag "wie staat er aan jouw kant?" en laat zien hoe WRA werkt.',
    socialMedia:
      'Praktische tips en korte cases. Authentiek, geen marketingpraat. Laat zien dat we de wereld van de MKB-ondernemer kennen.',
    customerSupport:
      'Persoonlijk, kort en helder. Eén vast aanspreekpunt dat de situatie kent.',
    email:
      'Heldere koppen, korte alinea\'s, concrete vervolgstappen. Geen juridische lappen tekst.',
    crisis:
      'Eerlijk en snel. Probleem benoemen, opties uitleggen, aanbevelen wat te doen — en doen wat is afgesproken.',
  },
  colorDirection:
    'Donkerblauw (#233e59) als basis voor vertrouwen en autoriteit. Mintgroen (#0bd8a2) als accent voor energie, beweging en de "groene" weegschaal. Off-white (#f2f8f4) als lichte basis. Felrood (#ff4f40) als spaarzame highlight voor urgentie.',
  typographyDirection:
    'Adelle Sans Condensed Bold voor headlines (stoer, condens en eigen). Adelle Sans Regular voor body (helder, leesbaar). Reenie Beanie als handgeschreven highlight-font voor een persoonlijke noot.',
  imageryDirection:
    'Echte ondernemers in hun eigen omgeving — geen kantoorstockfoto\'s. Lichte settings. Gezichten met emotie: opluchting, focus, vertrouwen. Symboliek van het schild en de weegschaal subtiel verwerkt.',
};

// ── Mission & Vision ────────────────────────────────────────────
const missionVision = {
  missionStatement:
    'WRA Juristen begeleidt MKB-werkgevers bij arbeidsrechtelijke vraagstukken — als gelijkwaardige partner die naast de ondernemer staat, in heldere taal en met scherpte aan de onderhandelingstafel.',
  missionOneLiner: 'Jouw recht. Onze zaak.',
  forWhom:
    'Voor MKB-werkgevers die verantwoordelijkheid nemen voor hun mensen en een professionele juridische partner aan hun kant verdienen.',
  whatWeDo:
    'Wij begeleiden bij vaststellingsovereenkomsten, ontslagtrajecten, contracten en reorganisaties. Praktisch, persoonlijk en resultaatgericht.',
  howWeDoIt:
    'Door naast de werkgever te staan, het juridische gewicht over te nemen, in heldere taal te communiceren en aan de onderhandelingstafel het beste resultaat te realiseren.',
  visionStatement:
    'Een arbeidsmarkt waarin eerlijk werkgeverschap dezelfde professionele bescherming geniet als werknemerschap — zodat MKB-ondernemers nooit meer alleen hoeven te staan.',
  timeHorizon: '5-10 jaar',
  boldAspiration:
    'De vanzelfsprekende juridische partner zijn voor de MKB-werkgever in heel Nederland — net zoals vakbonden dat zijn voor werknemers.',
  desiredFutureState:
    'Werkgevers stellen geen gesprekken meer uit en laten situaties niet escaleren, omdat ze weten dat WRA Juristen naast hen staat als gelijkwaardige partner.',
  successIndicators: [
    'MKB-werkgevers herkennen WRA als de juridische partner die expliciet voor hen kiest.',
    'Klanten ervaren rust en grip in trajecten waarin ze normaal alleen zouden staan.',
    'Onderhandelingsresultaten die de werkgever meetbaar verder helpen.',
    'Brancheorganisaties verwijzen actief door naar WRA Juristen.',
  ],
  stakeholderBenefit:
    'Werkgevers krijgen rust en scherpte. Werknemers krijgen een professioneel, eerlijk speelveld. De arbeidsmarkt krijgt minder onnodige escalaties.',
  impactGoal:
    'Bewijzen dat eerlijk werkgeverschap bescherming verdient — door het iedere dag te leveren.',
  valuesAlignment:
    'De missie is direct geworteld in de kernwaarden: Gelijkwaardigheid (op ooghoogte), Ontzorging (het juridische gewicht overnemen), Voorsprong (vooraan in kennis), Slagvaardig (handelen, niet dralen) en Meesterschap (het spel beheersen aan tafel).',
  missionVisionTension:
    'De spanning zit tussen de menselijkheid van de Caregiver-zijde (naast de klant staan, ontzorgen, rust geven) en de strijdvaardigheid van de Hero-zijde (scherpte, meevechten, het spel beheersen). WRA lost dit op door beide kanten expliciet te activeren in verschillende contexten — warm in de relatie, scherp aan de onderhandelingstafel.',
};

// ── Purpose Statement (Purpose Wheel) ───────────────────────────
const purposeWheel = {
  statement:
    'Wij geloven dat eerlijk werkgeverschap bescherming verdient.',
  impactType: 'Provide Protection',
  impactDescription:
    'WRA Juristen biedt MKB-werkgevers de juridische bescherming die werknemers al lang hebben — zodat ondernemers met vertrouwen verantwoordelijkheid kunnen blijven nemen voor hun mensen.',
  mechanismCategory: 'Empowerment',
  mechanism:
    'Door naast de werkgever te staan, complexe regelgeving te vertalen naar heldere taal, en met scherpte aan de onderhandelingstafel het beste resultaat te realiseren — neemt WRA het juridische gewicht over en geeft de ondernemer grip.',
  pressureTest:
    'Zonder WRA Juristen blijft de MKB-werkgever per definitie op achterstand tegenover beter bewapende werknemers en steeds complexer wordende wetgeving. Het gevolg: uitgestelde beslissingen, geëscaleerde conflicten, en juridische missers die schade doen aan zowel het bedrijf als de werkrelaties.',
};

// ── Social Relevancy (formerly ESG) ─────────────────────────────
const socialRelevancy = {
  impactStatement:
    'WRA Juristen draagt bij aan een eerlijker arbeidsmarkt door MKB-werkgevers de professionele juridische bescherming te bieden die werknemers al lang hebben.',
  impactNarrative:
    'Onze maatschappelijke bijdrage zit in het herstellen van het juridische evenwicht op de arbeidsmarkt. Door naast de MKB-werkgever te staan, voorkomen we onnodige escalaties, beschermen we eerlijk werkgeverschap en geven we ondernemers de ruimte om verantwoordelijkheid te blijven nemen voor hun mensen.',
  activismLevel: 'Conscious',
  milieu: {
    statements: [
      {
        text: 'Wij werken zoveel mogelijk papierloos en digitaal.',
        score: 3,
        evidence: '',
        target: 'Volledig digitale werkstroom voor alle dossiers.',
        timeline: '',
      },
      {
        text: 'Wij beperken onnodig reizen door slim gebruik van digitale overlegvormen.',
        score: 3,
        evidence: '',
        target: '',
        timeline: '',
      },
      {
        text: 'Wij nemen onze CO2-voetafdruk waar mogelijk in beschouwing in onze bedrijfsvoering.',
        score: 2,
        evidence: '',
        target: '',
        timeline: '',
      },
    ],
    pillarReflection:
      'Milieu is geen kernpijler van het merk WRA Juristen, maar wij zijn ons bewust van onze ecologische voetafdruk en handelen waar relevant.',
  },
  mens: {
    statements: [
      {
        text: 'Wij staan naast MKB-werkgevers die er anders alleen voor zouden staan.',
        score: 5,
        evidence:
          'Kernpositionering: "Wie staat er eigenlijk aan jouw kant?" Onze hele dienstverlening is gericht op het herstellen van de juridische balans voor de werkgever.',
        target: 'Iedere MKB-werkgever die ons benadert ervaart een gelijkwaardige partner.',
        timeline: 'Doorlopend',
      },
      {
        text: 'Wij voorkomen onnodige escalatie van arbeidsconflicten door tijdige en heldere begeleiding.',
        score: 5,
        evidence:
          'De waarde Slagvaardig en de transformationele doelen "Handelen": klanten stellen gesprekken niet meer uit en laten situaties niet escaleren.',
        target: 'Conflicten worden opgelost voordat ze escaleren naar de rechter.',
        timeline: 'Doorlopend',
      },
      {
        text: 'Wij geven ondernemers grip en rust in een steeds complexer arbeidsrechtelijk landschap.',
        score: 5,
        evidence:
          'De waarde Voorsprong: vooraan in kennis, signaleren risico\'s voordat ze problemen worden.',
        target: 'Klanten voelen rust en weten waar ze staan.',
        timeline: 'Doorlopend',
      },
    ],
    pillarReflection:
      'Mens is de absolute kernpijler van WRA Juristen. Het hele merk is gebouwd rond de overtuiging dat MKB-werkgevers — die verantwoordelijkheid nemen voor hun mensen — recht hebben op iemand die verantwoordelijkheid neemt voor hen.',
  },
  maatschappij: {
    statements: [
      {
        text: 'Wij dragen bij aan een eerlijker speelveld op de arbeidsmarkt.',
        score: 5,
        evidence:
          'Onze missie: eerlijk werkgeverschap verdient bescherming — als tegenwicht voor de bestaande infrastructuur die werknemers al hebben (vakbonden, no cure no pay-juristen, gratis VSO-checkdiensten).',
        target: 'Het standaardbeeld doorbreken dat alleen werknemers professionele juridische bijstand verdienen.',
        timeline: '5-10 jaar',
      },
      {
        text: 'Wij vergroten het juridische bewustzijn van MKB-ondernemers door in heldere taal uit te leggen wat hun rechten en plichten zijn.',
        score: 4,
        evidence:
          'Gelijkwaardigheid en heldere taal als kernwaarden — geen juridisch jargon.',
        target: 'MKB-ondernemers begrijpen hun positie en kunnen zorgvuldig handelen.',
        timeline: 'Doorlopend',
      },
      {
        text: 'Wij voorkomen dat ondernemers door onwetendheid of kostenangst afhaken op noodzakelijke juridische bijstand ("rechtmijders").',
        score: 4,
        evidence:
          'Trend: slechts 25% van MKB-ondernemers vindt het makkelijk goede juridische hulp te vinden. Onze toegankelijkheid en eerlijke prijs adresseren dit direct.',
        target: 'Geen MKB-werkgever hoeft af te haken vanwege drempel of prijs.',
        timeline: 'Doorlopend',
      },
    ],
    pillarReflection:
      'De maatschappelijke bijdrage van WRA Juristen zit in het herstellen van het juridische evenwicht tussen werkgever en werknemer in het MKB. Niet door tegen werknemers te zijn, maar door expliciet vóór de werkgever te kiezen.',
  },
  authenticityScores: {
    walkTheTalk: 5,
    transparency: 5,
    consistency: 5,
    stakeholderTrust: 4,
    measurability: 3,
    longTermCommitment: 5,
  },
  proofPoints: [
    'Evidence (Social Relevancy): exclusieve focus op MKB-werkgevers — geen verwatering naar andere doelgroepen.',
    'Evidence (Social Relevancy): heldere taal en eerlijke prijs als anti-drempel voor "rechtmijders".',
    'Evidence (Social Relevancy): proactief signaleren van risico\'s voordat ze escaleren.',
    'Evidence (Social Relevancy): één vast aanspreekpunt door het hele traject.',
  ],
  certifications: [],
  antiGreenwashingStatement:
    'WRA Juristen claimt geen breed maatschappelijk programma. Onze bijdrage is helder en specifiek: het herstellen van het juridische evenwicht voor MKB-werkgevers. Daar zijn we expliciet, daar handelen we naar — zonder pretenties op andere terreinen.',
  sdgAlignment: [8, 16],
  communicationPrinciples: [
    'Spreek de taal van de ondernemer, niet die van de jurist.',
    'Wees expliciet over voor wie we wel en niet werken.',
    'Bewijs onze positie door consistentie, niet door slogans.',
  ],
  keyStakeholders: [
    'MKB-werkgevers (eigenaren, directeuren, HR-verantwoordelijken)',
    'Brancheorganisaties MKB',
    'Accountants en bedrijfsadviseurs',
  ],
  activationChannels: [
    'Klantcommunicatie en cases',
    'Brancheverenigingen MKB',
    'Vakbladen voor ondernemers',
  ],
  annualCommitment: '',
};

// ────────────────────────────────────────────────────────────────
// BRANDSTYLE (uit Logo 2026 PDF)
// ────────────────────────────────────────────────────────────────

const styleguideData = {
  status: 'COMPLETE' as const,
  sourceType: 'PDF' as const,
  sourceFileName: 'Logo 2026 WRA Juristen.pdf',
  analysisStatus: 'COMPLETE' as const,
  logoVariations: [
    {
      label: 'Primair logo (donker)',
      description:
        'Hoofdvariant: WRA JURISTEN in donkerblauw (#233e59) met groen weegschaalbeeldmerk in het hart.',
    },
    {
      label: 'Logo op groen vlak (wit)',
      description: 'Witte typografie op #0bd8a2 mintgroen achtergrond, geschikt voor uitingen in primaire accentkleur.',
    },
    {
      label: 'Logo op donker vlak (mintgroen)',
      description: 'Mintgroene typografie op #233e59 donkerblauwe achtergrond met wit beeldmerk.',
    },
    {
      label: 'Beeldmerk / favicon',
      description:
        'Schildvorm met driehoek (weegschaal). Bedoeld als monogram voor digitale toepassingen waar weinig ruimte is — social media profielicoon, app-icon, favicon.',
    },
  ],
  logoGuidelines: [
    'Gebruik altijd voldoende witruimte rond het logo.',
    'Het beeldmerk staat als schild voor bescherming en richting.',
    'De driehoek met de ronde onderzijde symboliseert de weegschaal waarin het recht wordt afgewogen.',
    'Adelle Sans Condensed geeft het logo een onderscheidend en modern karakter.',
  ],
  logoDonts: [
    'Niet uitrekken, vervormen of roteren.',
    'Niet plaatsen op rommelige of onrustige achtergronden.',
    'Beeldmerk niet los van het woordmerk gebruiken in formele toepassingen — alleen als favicon/profielicoon.',
    'De groene accentkleur niet vervangen door andere kleuren.',
  ],
  logoSavedForAi: true,
  colorDonts: [
    'Gebruik de rode accentkleur (#ff4f40) niet in combinatie met groen (#0bd8a2) als hoofdcombinatie.',
    'Vermijd pastellen of andere kleuren buiten het palet.',
    'Gebruik niet de hele groen-pixel als grote vlakken zonder donkerblauw of wit als rust.',
  ],
  colorsSavedForAi: true,
  primaryFontName: 'Adelle Sans Condensed Bold',
  primaryFontUrl: '',
  typeScale: {
    h1: { font: 'Adelle Sans Condensed Bold', size: '48px', lineHeight: '1.1' },
    h2: { font: 'Adelle Sans Condensed Bold', size: '36px', lineHeight: '1.2' },
    h3: { font: 'Adelle Sans Condensed Bold', size: '24px', lineHeight: '1.3' },
    body: { font: 'Adelle Sans Regular', size: '16px', lineHeight: '1.5' },
    highlight: { font: 'Reenie Beanie Regular', size: '24px', lineHeight: '1.2' },
  },
  typographySavedForAi: true,
  contentGuidelines: [
    'Spreek de taal van de ondernemer, niet die van de jurist.',
    'Vermijd juridisch jargon zonder uitleg.',
    'Stel de werkgever centraal — gebruik tweede persoon ("jij/jou") en partnerschap-taal ("wij staan naast je").',
    'Wees nuchter en helder; geen dramatische framing.',
  ],
  writingGuidelines: [
    'Korte zinnen, actieve vorm, concrete voorbeelden.',
    'Laat het beste gevoel (rust, grip, vertrouwen) doorklinken in de toon.',
    'Gebruik headlines die direct herkenning oproepen ("Wie staat er aan jouw kant?").',
    'Sluit af met een duidelijke vervolgstap of geruststelling.',
  ],
  examplePhrases: {
    do: [
      'Jouw recht. Onze zaak.',
      'Wij staan naast je.',
      'Wij regelen het, zodat jij kunt ondernemen.',
      'Geen ingewikkelde trajecten. Geen juridisch jargon.',
    ],
    dont: [
      'Wij behartigen uw belangen conform de geldende rechtspraak.',
      'Onze rechtsverhouding zal worden vastgelegd.',
      'Wij streven ernaar de aangelegenheid in goede orde af te wikkelen.',
    ],
  },
  toneSavedForAi: true,
  photographyGuidelines: [
    'Echte MKB-ondernemers in hun eigen omgeving (bedrijfspand, kantoor, werkvloer).',
    'Geen geposeerde stockfoto\'s van advocaten of juridische kantoren.',
    'Lichte, natuurlijke settings met gezichten die emoties tonen: opluchting, focus, vertrouwen.',
    'Gebruik beeld waarin de mens centraal staat — geen close-ups van paragrafen of contracten.',
  ],
  illustrationGuidelines: [
    'Gebruik symboliek van schild en weegschaal subtiel — niet overdreven juridisch.',
    'Mintgroene accenten als energiek tegenwicht voor het donkerblauw.',
  ],
  imageryDonts: [
    'Geen klassieke gerechtsbeelden (hamer, balans, toga\'s).',
    'Geen anonieme stockmodellen in pakken.',
    'Geen donkere, intimiderende beelden van rechtszalen.',
  ],
  imagerySavedForAi: true,
};

const styleguideColors: Array<{
  name: string;
  hex: string;
  rgb: string;
  cmyk: string;
  category: 'PRIMARY' | 'SECONDARY' | 'ACCENT' | 'BACKGROUND';
  notes: string;
  sortOrder: number;
}> = [
  {
    name: 'Donkerblauw',
    hex: '#233e59',
    rgb: '35, 62, 89',
    cmyk: '61, 30, 0, 65',
    category: 'PRIMARY',
    notes:
      'Hoofdkleur: geeft autoriteit, professionaliteit en vertrouwen. Gebruik voor headlines, logo en grote vlakken.',
    sortOrder: 0,
  },
  {
    name: 'Mintgroen',
    hex: '#0bd8a2',
    rgb: '11, 216, 162',
    cmyk: '95, 0, 25, 15',
    category: 'SECONDARY',
    notes:
      'Accentkleur: geeft energie, beweging en menselijkheid. De groene weegschaalvorm in het beeldmerk. Gebruik als accent en voor call-to-actions.',
    sortOrder: 1,
  },
  {
    name: 'Off-white',
    hex: '#f2f8f4',
    rgb: '242, 248, 244',
    cmyk: '2, 0, 2, 3',
    category: 'BACKGROUND',
    notes: 'Lichte basis voor pagina-achtergronden en rust in het ontwerp.',
    sortOrder: 2,
  },
  {
    name: 'Highlight rood',
    hex: '#ff4f40',
    rgb: '255, 79, 64',
    cmyk: '0, 69, 75, 0',
    category: 'ACCENT',
    notes:
      'Spaarzame highlight voor urgentie of attentie. Niet combineren met mintgroen als hoofdcombinatie.',
    sortOrder: 3,
  },
];

// ────────────────────────────────────────────────────────────────
// TRENDS (uit Branddoc — Trends en Ontwikkelingen)
// ────────────────────────────────────────────────────────────────

const detectedTrends: Array<{
  slug: string;
  title: string;
  description: string;
  category:
    | 'CONSUMER_BEHAVIOR'
    | 'TECHNOLOGY'
    | 'MARKET_DYNAMICS'
    | 'COMPETITIVE'
    | 'REGULATORY';
  impactLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  scope: 'MICRO' | 'MESO' | 'MACRO';
  timeframe: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
  relevanceScore: number;
  whyNow: string;
  industries: string[];
  tags: string[];
  howToUse: string[];
}> = [
  {
    slug: 'wra-trend-stijging-ontslagen',
    title: 'Stijging aantal ontslagen',
    description:
      'Het aantal reorganisatiemeldingen bereikte in 2025 een tienjaarsrecord (+42%) en UWV-ontslagaanvragen groeiden met 30%. Economische onzekerheid, stijgende loonkosten en automatisering maken dit een structurele trend.',
    category: 'MARKET_DYNAMICS',
    impactLevel: 'HIGH',
    scope: 'MESO',
    timeframe: 'SHORT_TERM',
    relevanceScore: 92,
    whyNow:
      'Economische onzekerheid, stijgende loonkosten en automatisering zorgen voor een structurele groei van reorganisaties en individuele ontslagen — precies de situaties waar MKB-werkgevers professionele begeleiding nodig hebben.',
    industries: ['MKB algemeen', 'Arbeidsrecht'],
    tags: ['ontslag', 'reorganisatie', 'UWV', 'economie'],
    howToUse: [
      'Gebruik als urgentie-haakje in campagnes richting MKB-werkgevers.',
      'Positioneer WRA als de eerste hulp bij reorganisatie en ontslag.',
      'Maak content die werkgevers helpt voorbereid te zijn voordat het zover is.',
    ],
  },
  {
    slug: 'wra-trend-toenemende-wetgeving',
    title: 'Toenemende wetgeving 2025-2028',
    description:
      'Er komt meer arbeidsrechtelijke wetgeving op werkgevers af. VBAR, Wet Meer Zekerheid Flexwerkers, EU-Richtlijn Loontransparantie en verplichte gedragscode raken elk MKB-bedrijf met personeel en dwingen tot herziening van contracten en beleid.',
    category: 'REGULATORY',
    impactLevel: 'CRITICAL',
    scope: 'MESO',
    timeframe: 'MEDIUM_TERM',
    relevanceScore: 96,
    whyNow:
      'Een ongekende stapeling van nieuwe regelgeving (VBAR, Wet Meer Zekerheid Flexwerkers, EU-Loontransparantie, verplichte gedragscode) vraagt elke MKB-werkgever om herziening van contracten en HR-beleid in 2025-2028.',
    industries: ['MKB algemeen', 'HR', 'Arbeidsrecht'],
    tags: ['VBAR', 'flexwerkers', 'loontransparantie', 'gedragscode', 'EU'],
    howToUse: [
      'Bouw een "wet-update"-serie waarin elke nieuwe wet in heldere taal wordt uitgelegd.',
      'Bied compliance-checks aan voor MKB-werkgevers met personeel.',
      'Positioneer Voorsprong: WRA loopt vooraan in deze ontwikkelingen.',
    ],
  },
  {
    slug: 'wra-trend-bewapende-werknemer',
    title: 'De beter bewapende werknemer',
    description:
      'Gratis VSO-checkdiensten en no cure no pay-modellen geven werknemers risicovrij toegang tot professionele juridische bijstand. Werkgevers die zonder eigen adviseur een VSO opstellen, staan per definitie op achterstand.',
    category: 'COMPETITIVE',
    impactLevel: 'HIGH',
    scope: 'MESO',
    timeframe: 'SHORT_TERM',
    relevanceScore: 95,
    whyNow:
      'De infrastructuur voor werknemers (gratis VSO-checks, no cure no pay-juristen, vakbonden) is beter dan ooit. Werkgevers zonder eigen adviseur staan per definitie op een juridische achterstand.',
    industries: ['MKB algemeen', 'Arbeidsrecht'],
    tags: ['VSO', 'no cure no pay', 'asymmetrie', 'werknemers'],
    howToUse: [
      'Kernpositioneringsverhaal: "Wie staat er eigenlijk aan jouw kant?"',
      'Maak het asymmetrie-verhaal concreet met cijfers.',
      'Gebruik dit als bewijs voor de noodzaak van een eigen werkgeversadviseur.',
    ],
  },
  {
    slug: 'wra-trend-juridische-complexiteit',
    title: 'Stijgende juridische complexiteit en kosten',
    description:
      'De maximale transitievergoeding steeg naar €102.000 bruto en de compensatieregeling wordt beperkt. Recente rechtspraak rondom verlofopbouw en gelijke kansen maakt ontslagtrajecten zonder begeleiding steeds risicovoller.',
    category: 'REGULATORY',
    impactLevel: 'HIGH',
    scope: 'MESO',
    timeframe: 'SHORT_TERM',
    relevanceScore: 90,
    whyNow:
      'De financiële stakes van een verkeerd uitgevoerd ontslagtraject zijn nog nooit zo hoog geweest. €102.000 bruto transitievergoeding en strengere rechtspraak maken professionele begeleiding bijna onontkoombaar.',
    industries: ['MKB algemeen', 'Arbeidsrecht'],
    tags: ['transitievergoeding', 'rechtspraak', 'verlofopbouw', 'gelijke kansen'],
    howToUse: [
      'Maak de financiële risico\'s tastbaar in salescommunicatie.',
      'Gebruik recente jurisprudentie als haakje voor inhoudelijke content.',
      'Versterk het meesterschap-narratief: WRA kent het hele speelveld.',
    ],
  },
  {
    slug: 'wra-trend-ai-prijsinnovatie',
    title: 'AI en prijsinnovatie veranderen de markt',
    description:
      'Abonnementsmodellen, vaste tarieven en juridische AI-tools transformeren hoe juridische dienstverlening wordt aangeboden. De prijs voor routinewerk daalt, waardoor het onderscheid verschuift naar strategisch advies en persoonlijke begeleiding.',
    category: 'TECHNOLOGY',
    impactLevel: 'HIGH',
    scope: 'MESO',
    timeframe: 'MEDIUM_TERM',
    relevanceScore: 88,
    whyNow:
      'AI-tools en abonnementen halen de marges uit standaard juridisch werk. Het onderscheidend vermogen verschuift naar relatie, strategie en persoonlijke begeleiding — exact waar WRA Juristen op gepositioneerd is.',
    industries: ['Arbeidsrecht', 'Juridische dienstverlening'],
    tags: ['AI', 'abonnementen', 'prijsmodellen', 'legal tech'],
    howToUse: [
      'Versterk het persoonlijke, relationele profiel van WRA tegenover gecommodificeerde AI-diensten.',
      'Onderzoek of een eigen abonnementsvariant past bij MKB-doelgroep.',
      'Maak strategisch advies en menselijk contact het onderscheidend vermogen.',
    ],
  },
  {
    slug: 'wra-trend-rechtmijders',
    title: 'MKB-ondernemers als "rechtmijders"',
    description:
      'Slechts 25% van de MKB-ondernemers vindt het makkelijk goede juridische hulp te vinden. Er is een grote latente vraag van ondernemers die wel hulp nodig hebben maar afhaken op kostenangst, tijdgebrek of scepsis.',
    category: 'CONSUMER_BEHAVIOR',
    impactLevel: 'MEDIUM',
    scope: 'MESO',
    timeframe: 'SHORT_TERM',
    relevanceScore: 84,
    whyNow:
      '75% van de MKB-ondernemers vindt het moeilijk om goede juridische hulp te vinden. Er ligt een enorme onbenutte markt voor een aanbieder die kostenangst, tijdgebrek en scepsis kan wegnemen.',
    industries: ['MKB algemeen', 'Arbeidsrecht'],
    tags: ['drempel', 'rechtmijders', 'kostenangst', 'toegankelijkheid'],
    howToUse: [
      'Maak van toegankelijkheid en heldere prijzen een expliciet positioneringspunt.',
      'Adresseer de drie afhaakmotieven (kostenangst, tijdgebrek, scepsis) in marketing.',
      'Bouw een laagdrempelig instapproduct (intake of risicoscan).',
    ],
  },
];

// ────────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────────

async function main() {
  console.log('🏗️  Filling WRA Juristen knowledge section...\n');

  // 1. Brand Assets
  console.log('📚 Brand Assets');
  const assets = await prisma.brandAsset.findMany({
    where: { workspaceId: WORKSPACE_ID },
    select: { id: true, slug: true, frameworkType: true },
  });
  const bySlug = Object.fromEntries(assets.map((a) => [a.slug, a]));

  type Update = {
    slug: string;
    data: Record<string, unknown>;
    description: string;
    content: string;
  };

  const updates: Update[] = [
    {
      slug: 'golden-circle',
      data: goldenCircle,
      description:
        'WHY: eerlijk werkgeverschap verdient bescherming. HOW: naast je staan met heldere taal en eerlijke prijs. WHAT: arbeidsrechtelijke begeleiding voor MKB-werkgevers.',
      content:
        'WRA Juristen begeleidt MKB-bedrijven bij arbeidsrechtelijke vraagstukken vanuit de overtuiging dat eerlijk werkgeverschap bescherming verdient. Wij staan naast de werkgever — niet als afstandelijk adviseur, maar als gelijkwaardige partner met heldere taal en scherpte aan de onderhandelingstafel.',
    },
    {
      slug: 'transformative-goals',
      data: transformativeGoals,
      description:
        'Drie transformationele doelen voor MKB-werkgevers: denken (iemand die het begrijpt), voelen (rust en vertrouwen) en handelen (zorgvuldig en doortastend).',
      content:
        'WRA Juristen verandert hoe MKB-werkgevers denken, voelen en handelen rondom arbeidsrechtelijke vraagstukken. Van alleen staan naar gesteund worden, van uitstellen naar zorgvuldig handelen.',
    },
    {
      slug: 'core-values',
      data: brandHouseValues,
      description:
        'Vijf kernwaarden: Gelijkwaardigheid en Ontzorging als anker, Voorsprong en Slagvaardig als aspiratie, Meesterschap als onderscheidende fire.',
      content:
        'De waarden van WRA Juristen: Gelijkwaardigheid, Ontzorging, Voorsprong, Slagvaardig en Meesterschap. Samen vormen ze het kompas voor hoe wij werken naast en voor de MKB-werkgever.',
    },
    {
      slug: 'brand-archetype',
      data: brandArchetype,
      description:
        'Caregiver primair (naast je staan, beschermen, ontzorgen) gecombineerd met Hero secundair (meevechten, slagvaardig, het spel beheersen aan de onderhandelingstafel).',
      content:
        'WRA Juristen combineert het Caregiver-archetype (naast de klant staan, beschermen, ontzorgen) met het Hero-archetype (slagvaardig, scherp, meevechten waar het nodig is). Warm in de relatie, scherp aan de onderhandelingstafel.',
    },
    {
      slug: 'brand-story',
      data: brandStory,
      description:
        'Het merkverhaal: voor werknemers staat duidelijk wie hun belangen behartigt, maar voor MKB-werkgevers is dat veel minder vanzelfsprekend. WRA Juristen vult dat gat.',
      content:
        'Voor werknemers is duidelijk wie aan hun kant staat — vakbonden, juridisch adviseurs, no cure no pay-juristen. Maar wie kijkt er mee met de MKB-werkgever? WRA Juristen koos expliciet die kant. Niet als advocatenkantoor met wachttijden en uurtarieven, maar als gelijkwaardige partner die naast de ondernemer staat. Jouw recht. Onze zaak.',
    },
    {
      slug: 'brand-essence',
      data: brandEssence,
      description:
        'Naast jou. Voor jou. De essentie van WRA Juristen is partnerschap met menselijkheid én meesterschap aan de zijde van de MKB-werkgever.',
      content:
        'De essentie van WRA Juristen is partnerschap: niet boven de klant, niet tegenover de klant, maar naast de klant. Met begrip én scherpte, met menselijkheid én meesterschap.',
    },
    {
      slug: 'brand-promise',
      data: brandPromise,
      description:
        'Jouw recht. Onze zaak. WRA Juristen belooft MKB-werkgevers een gelijkwaardige, ontzorgende en scherpe juridische partner.',
      content:
        'Jouw recht. Onze zaak. Werkgevers verdienen ook een sterke partij aan hun kant. WRA Juristen staat naast je: betrokken, scherp en altijd met jouw belang voorop.',
    },
    {
      slug: 'brand-personality',
      data: brandPersonality,
      description:
        'Sincerity (eerlijk, gelijkwaardig) en Competence (meesterschap, voorsprong) als primaire dimensies. Nuchter, slagvaardig, scherp en betrokken.',
      content:
        'WRA Juristen is nuchter, eerlijk en benaderbaar in de relatie — strategisch en scherp aan de onderhandelingstafel. Onze stem klinkt zoals we werken: in heldere taal, zonder jargon, met oprechte interesse.',
    },
    {
      slug: 'mission-statement',
      data: missionVision,
      description:
        'Missie: gelijkwaardig partnerschap voor MKB-werkgevers. Visie: een arbeidsmarkt waarin eerlijk werkgeverschap dezelfde bescherming geniet als werknemerschap.',
      content:
        'Missie: WRA Juristen begeleidt MKB-werkgevers bij arbeidsrechtelijke vraagstukken als gelijkwaardige partner. Visie: een arbeidsmarkt waarin eerlijk werkgeverschap dezelfde professionele bescherming geniet als werknemerschap.',
    },
    {
      slug: 'purpose-statement',
      data: purposeWheel,
      description:
        'Purpose: eerlijk werkgeverschap verdient bescherming. Impact type: Provide Protection. Mechanisme: empowerment door naast de werkgever te staan en het juridische gewicht over te nemen.',
      content:
        'Wij geloven dat eerlijk werkgeverschap bescherming verdient. WRA Juristen biedt MKB-werkgevers de juridische bescherming die werknemers al lang hebben — zodat ondernemers met vertrouwen verantwoordelijkheid kunnen blijven nemen voor hun mensen.',
    },
    {
      slug: 'social-relevancy',
      data: socialRelevancy,
      description:
        'Maatschappelijke relevantie: het herstellen van het juridische evenwicht tussen werkgever en werknemer in het MKB. Mens als kernpijler.',
      content:
        'WRA Juristen draagt bij aan een eerlijker arbeidsmarkt door MKB-werkgevers de professionele juridische bescherming te bieden die werknemers al lang hebben. Niet door tegen werknemers te zijn, maar door expliciet vóór de werkgever te kiezen.',
    },
  ];

  for (const { slug, data, description, content } of updates) {
    const asset = bySlug[slug];
    if (!asset) {
      console.log(`  ⚠️  ${slug} — not found, skipping`);
      continue;
    }
    await prisma.brandAsset.update({
      where: { id: asset.id },
      data: {
        frameworkData: data as Prisma.InputJsonValue,
        description,
        content,
      },
    });
    console.log(`  ✅ ${slug}`);
  }

  // 2. BrandStyleguide + colors
  console.log('\n🎨 Brandstyle');
  await prisma.styleguideColor.deleteMany({
    where: { styleguide: { workspaceId: WORKSPACE_ID } },
  });
  await prisma.brandStyleguide.deleteMany({ where: { workspaceId: WORKSPACE_ID } });

  const styleguide = await prisma.brandStyleguide.create({
    data: {
      ...styleguideData,
      workspaceId: WORKSPACE_ID,
      createdById: USER_ID,
      logoVariations: styleguideData.logoVariations as Prisma.InputJsonValue,
      typeScale: styleguideData.typeScale as Prisma.InputJsonValue,
      examplePhrases: styleguideData.examplePhrases as Prisma.InputJsonValue,
    },
  });
  console.log(`  ✅ BrandStyleguide created (${styleguide.id})`);

  for (const color of styleguideColors) {
    await prisma.styleguideColor.create({
      data: { ...color, styleguideId: styleguide.id },
    });
    console.log(`  ✅ Color: ${color.name} (${color.hex})`);
  }

  // 3. Detected Trends
  console.log('\n📈 Trends');
  await prisma.detectedTrend.deleteMany({
    where: { workspaceId: WORKSPACE_ID, slug: { startsWith: 'wra-trend-' } },
  });

  for (const trend of detectedTrends) {
    await prisma.detectedTrend.create({
      data: {
        ...trend,
        workspaceId: WORKSPACE_ID,
        detectionSource: 'MANUAL',
      },
    });
    console.log(`  ✅ ${trend.title}`);
  }

  console.log('\n🎉 Done! WRA Juristen knowledge section is filled.');
  console.log(`   - 11 brand assets`);
  console.log(`   - 1 brandstyle + 4 colors`);
  console.log(`   - 6 trends`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await prisma.$disconnect();
    await pool.end();
  } catch {}
  process.exit(1);
});
