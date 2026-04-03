/**
 * Fill remaining 3 Goed-Bouw brand assets derived from the brand document.
 * Run: DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" npx tsx scripts/fill-goedbouw-remaining.ts
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: 'postgresql://erikjager:@localhost:5432/branddock' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const WORKSPACE_ID = 'cmneamaqw000ig3ms1eam4ga0';

// ── Brand Personality (afgeleid uit waarden, archetype en tone) ──
const brandPersonality = {
  dimensionScores: {
    sincerity: 4,      // eerlijk, direct, "geen gedoe"
    excitement: 3,     // gedreven, energiek maar niet flashy
    competence: 5,     // vakmanschap, betrouwbaar, levert wat beloofd
    sophistication: 2, // niet chic of verfijnd, juist nuchter
    ruggedness: 5,     // bouw, aanpakken, fysiek, stoer
  },
  primaryDimension: 'Ruggedness',
  secondaryDimension: 'Competence',
  personalityTraits: [
    {
      name: 'Direct',
      description: 'We zeggen wat we bedoelen en doen wat we zeggen. Geen omwegen.',
      weAreThis: 'Eerlijk, helder, geen gedoe.',
      butNeverThat: 'Nooit vaag, ontwijkend of wollig.',
    },
    {
      name: 'Vakkundig',
      description: 'We verstaan ons vak en leveren werk waar we achter staan.',
      weAreThis: 'Deskundig, grondig, kwaliteitsgericht.',
      butNeverThat: 'Nooit slordig, haastig of "net voldoende".',
    },
    {
      name: 'Gedreven',
      description: 'We halen energie uit uitdagingen en stoppen pas als het klopt.',
      weAreThis: 'Energiek, doortastend, resultaatgericht.',
      butNeverThat: 'Nooit passief, afwachtend of lui.',
    },
    {
      name: 'Hecht',
      description: 'We zijn een vaste groep die samen bouwt. Geen anoniem bedrijf.',
      weAreThis: 'Teamgericht, loyaal, betrokken.',
      butNeverThat: 'Nooit afstandelijk, onpersoonlijk of inwisselbaar.',
    },
    {
      name: 'Nuchter',
      description: 'We maken het niet mooier dan het is. Gewoon goed bouwen.',
      weAreThis: 'Down-to-earth, geen franje, realistisch.',
      butNeverThat: 'Nooit opschepperig, overdreven of pretentieus.',
    },
  ],
  spectrumSliders: {
    friendlyFormal: 2,       // informeel, direct
    energeticThoughtful: 3,  // meer energiek/actie dan contemplatief
    modernTraditional: 4,    // mix: modern aanpak, traditioneel vakmanschap
    playfulSerious: 5,       // serieus over het werk
    boldSubtle: 3,           // eerder bold: aanpakken, niet terughoudend
    abstractConcrete: 6,     // zeer concreet: bouw, resultaat
    eliteAccessible: 6,      // toegankelijk, niet elitair
  },
  toneDimensions: {
    funnySerious: 5,         // serieus
    formalCasual: 3,         // eerder casual
    respectfulIrreverent: 3, // respectvol maar niet onderdanig
    enthusiasticMatterOfFact: 4, // meer matter-of-fact
  },
  brandVoiceDescription: 'De stem van Goed-bouw is direct, nuchter en vakkundig. We praten zoals we bouwen: geen omwegen, geen smoesjes, gewoon goed werk. De toon is eerlijk en betrokken, nooit afstandelijk of overdreven verkoopachtig.',
  wordsWeUse: ['aanpakken', 'vakmanschap', 'trots', 'klopt', 'team', 'afspraken', 'gewoon doen', 'hecht', 'vrijheid', 'gedreven'],
  wordsWeAvoid: ['uniek', 'innovatief', 'state-of-the-art', 'exclusief', 'ongeëvenaard', 'oplossingen', 'partnerships', 'synergy', 'stakeholders'],
  writingSample: 'De bouw is een vak vol beloftes. Maar wie een project heeft laten bouwen weet: het is makkelijker gezegd dan gedaan. Bij Goed-bouw werken we met een hechte groep vakmensen die energie halen uit de uitdagingen van het werk. Die trots zijn op wat ze neerzetten. En die pas stoppen als het klopt.',
  channelTones: {
    website: 'Direct en informatief. Laat het werk spreken. Korte zinnen, concrete projecten.',
    socialMedia: 'Behind-the-scenes op de bouwplaats. Trots op het team. Rauw en echt, geen stockfoto\'s.',
    customerSupport: 'Persoonlijk en kort. Je spreekt met mensen die het project kennen.',
    email: 'Helder en to-the-point. Geen marketing-taal. Gewoon wat je moet weten.',
    crisis: 'Eerlijk en snel. Probleem benoemen, oplossing bieden, afspraak nakomen.',
  },
  colorDirection: 'Donkere, aardse tinten: donkergrijs, zwart, warm hout. Accentkleur: oranje of geel voor de energie en gedrevenheid.',
  typographyDirection: 'Stevige, no-nonsense lettertypes. Sans-serif voor koppen (stoer, direct), leesbaar serif of sans voor lopende tekst.',
  imageryDirection: 'Echte beelden van de bouwplaats: vakmensen aan het werk, ruw materiaal, teamwork. Geen geposeerde foto\'s. Warm licht, aardse kleuren.',
};

// ── Mission & Vision (afgeleid uit Golden Circle + Transformative Goals) ──
const missionVision = {
  missionStatement: 'Goed-bouw realiseert bouwprojecten met een hechte groep vakmensen die eerlijke afspraken nakomt en pas stopt als het klopt.',
  missionOneLiner: 'Gewoon goed bouwen.',
  forWhom: 'Voor opdrachtgevers die waarde hechten aan betrouwbaarheid, vakmanschap en een persoonlijke aanpak — in nieuwbouw, renovatie en transformatieprojecten.',
  whatWeDo: 'Wij realiseren nieuwbouw, renovatie en transformatieprojecten. Van woningbouw en villabouw tot appartementencomplexen en utiliteitsbouw. Van grondwerk tot oplevering.',
  howWeDoIt: 'Door uitdagende projecten aan te gaan met een hechte, gedreven groep. Eerlijke afspraken maken en nakomen. Mensen de vrijheid en het vertrouwen geven. Als één team werken. Pas stoppen als het klopt.',
  visionStatement: 'Een bouwsector waarin vakmanschap, eerlijkheid en trots de norm zijn — niet de uitzondering.',
  timeHorizon: '5-10 jaar',
  boldAspiration: 'De standaard zetten voor hoe goed bouwen eruitziet: een sector waarin je kunt vertrouwen op je aannemer.',
  desiredFutureState: 'Opdrachtgevers kiezen voor Goed-bouw omdat ze weten dat ze een team krijgen dat er écht voor gaat. Het merk staat synoniem voor betrouwbaar bouwen.',
  successIndicators: [
    'Klanten bevelen Goed-bouw actief aan op basis van vertrouwen.',
    'Vakmensen willen bij Goed-bouw werken vanwege de cultuur van vrijheid en hechtheid.',
    'Projecten worden consistent opgeleverd conform afspraak.',
    'Goed-bouw wordt herkend als de aannemer die zijn beloftes nakomt.',
  ],
  stakeholderBenefit: 'Opdrachtgevers krijgen vertrouwen en een resultaat om trots op te zijn. Medewerkers krijgen vrijheid en een team waar ze bij horen. Partners krijgen eerlijke samenwerking.',
  impactGoal: 'Het bewijs leveren dat goed bouwen wél kan — door het gewoon te doen.',
  valuesAlignment: 'De missie is direct geworteld in de kernwaarden: aanpakken (gewoon doen), vakmanschap (kwaliteit leveren), samenwerking (als één team), gedrevenheid (pas stoppen als het klopt), vrijheid (vertrouwen geven), hechtheid (een groep waar je bij hoort).',
  missionVisionTension: 'De spanning zit tussen de eenvoud van de missie ("gewoon goed bouwen") en de ambitie van de visie (de norm veranderen in een hele sector). Goed-bouw lost dit op door klein te beginnen: project voor project bewijzen dat het anders kan.',
};

// ── Social Relevancy (afgeleid uit waarden en EVP) ──
const socialRelevancy = {
  impactStatement: 'Goed-bouw draagt bij aan een betere bouwsector door te investeren in mensen, vakmanschap en eerlijke samenwerking.',
  impactNarrative: 'Onze maatschappelijke impact begint bij onze mensen. Door vakmensen vrijheid en vertrouwen te geven, creëren we een werkplek waar mensen groeien en trots zijn op hun werk. Dit leidt tot betere bouwkwaliteit en duurzamere relaties met opdrachtgevers en partners.',
  activismLevel: 'Silent',
  milieu: {
    statements: [
      {
        text: 'Wij bouwen met aandacht voor materiaalgebruik en afvalreductie op de bouwplaats.',
        score: 2,
        evidence: '',
        target: 'Bewuster omgaan met materialen en afval.',
        timeline: '',
      },
      {
        text: 'Wij realiseren projecten die voldoen aan geldende duurzaamheidsnormen.',
        score: 3,
        evidence: 'Naleving van bouwbesluit en energienormen.',
        target: '',
        timeline: '',
      },
      {
        text: 'Wij staan open voor duurzamere bouwmethoden wanneer dit past bij het project.',
        score: 2,
        evidence: '',
        target: '',
        timeline: '',
      },
    ],
    pillarReflection: 'Milieu is geen kernthema in de merkpositionering van Goed-bouw, maar als bouwbedrijf zijn we ons bewust van onze impact. We voldoen aan normen en staan open voor verbetering.',
  },
  mens: {
    statements: [
      {
        text: 'Wij investeren in een cultuur van vrijheid en vertrouwen voor onze vakmensen.',
        score: 5,
        evidence: 'De EVP van Goed-bouw draait om vrijheid, hechtheid en trots op het vak.',
        target: 'Behoud van vaste vakmensen door een sterke bedrijfscultuur.',
        timeline: 'Doorlopend',
      },
      {
        text: 'Wij bieden een werkomgeving waar vakmanschap wordt gewaardeerd en mensen trots kunnen zijn op hun werk.',
        score: 5,
        evidence: 'Kernwaarden: vakmanschap, aanpakken, gedrevenheid.',
        target: 'Medewerkerstevredenheid en -behoud.',
        timeline: 'Doorlopend',
      },
      {
        text: 'Wij zijn een hechte groep — niet voor iedereen, maar voor wie past bij onze cultuur.',
        score: 4,
        evidence: 'Selectieve werving gebaseerd op cultuurfit, niet alleen competentie.',
        target: 'Een team waar iedereen bij wil horen.',
        timeline: 'Doorlopend',
      },
    ],
    pillarReflection: 'Mens is de kern van het merk Goed-bouw. Alles draait om de mensen die het project maken. De EVP (Employee Value Proposition) bevestigt dit: contractueel (eerlijke afspraken), beleving (hechte gedreven club) en emotioneel (trots op je vak).',
  },
  maatschappij: {
    statements: [
      {
        text: 'Wij dragen bij aan de kwaliteit van de gebouwde omgeving door vakwerk te leveren.',
        score: 4,
        evidence: 'Projecten in woningbouw, villabouw, appartementen en utiliteitsbouw.',
        target: 'Elk project is een resultaat om trots op te zijn.',
        timeline: 'Per project',
      },
      {
        text: 'Wij bewijzen dat eerlijkheid en betrouwbaarheid in de bouw wél mogelijk zijn.',
        score: 4,
        evidence: 'Merkpositionering gericht op het nakomen van afspraken.',
        target: 'Bijdragen aan een betrouwbaardere bouwsector.',
        timeline: '5-10 jaar',
      },
      {
        text: 'Wij bieden vakmensen een werkplek waar ze zich gewaardeerd voelen en kunnen groeien.',
        score: 4,
        evidence: 'Vrijheid, vertrouwen en hechtheid als kernwaarden.',
        target: 'Voorbeeldfunctie als werkgever in de bouw.',
        timeline: 'Doorlopend',
      },
    ],
    pillarReflection: 'De maatschappelijke bijdrage van Goed-bouw zit in het bewijzen dat goed bouwen wél kan. Door project voor project te laten zien dat vakmanschap, eerlijkheid en mensgerichtheid samengaan.',
  },
  authenticityScores: {
    walkTheTalk: 5,
    transparency: 4,
    consistency: 5,
    stakeholderTrust: 4,
    measurability: 2,
    longTermCommitment: 4,
  },
  proofPoints: [
    'Vaste groep vakmensen — lage personeelsverloop.',
    'Eerlijke afspraken als kernbelofte, niet als marketingpraat.',
    'Selectieve werving: niet iedereen past bij Goed-bouw.',
    'EVP gebouwd op emotionele verbinding, niet alleen contractuele voordelen.',
  ],
  certifications: [],
  antiGreenwashingStatement: 'Goed-bouw claimt geen duurzaamheidslabel. We zijn een bouwbedrijf dat investeert in mensen en vakmanschap. Onze maatschappelijke impact zit in hoe we werken, niet in wat we beweren.',
  sdgAlignment: [8, 11],  // SDG 8: Decent Work, SDG 11: Sustainable Cities
  communicationPrinciples: [
    'Laat het werk spreken, niet de woorden.',
    'Wees eerlijk over wat we wel en niet doen.',
    'Toon de mensen achter het project.',
  ],
  keyStakeholders: ['Vakmensen / medewerkers', 'Opdrachtgevers', 'Onderaannemers en leveranciers', 'Lokale gemeenschappen'],
  activationChannels: ['Projectcommunicatie', 'Werving en employer branding', 'Bouwplaatscommunicatie'],
  annualCommitment: '',
};

async function main() {
  const assets = await prisma.brandAsset.findMany({
    where: { workspaceId: WORKSPACE_ID },
    select: { id: true, slug: true },
  });

  const bySlug = Object.fromEntries(assets.map((a) => [a.slug, a]));

  const updates = [
    {
      slug: 'brand-personality',
      data: brandPersonality,
      description: 'De persoonlijkheid van Goed-bouw: direct, vakkundig, gedreven, hecht en nuchter. Ruggedness en Competence als primaire Aaker-dimensies.',
    },
    {
      slug: 'mission-statement',
      data: missionVision,
      description: 'Missie: Gewoon goed bouwen. Visie: Een bouwsector waarin vakmanschap, eerlijkheid en trots de norm zijn.',
    },
    {
      slug: 'social-relevancy',
      data: socialRelevancy,
      description: 'De maatschappelijke relevantie van Goed-bouw: mens als kernpijler (vrijheid, vakmanschap, hechtheid), eerlijkheid in de bouw als maatschappelijke bijdrage.',
    },
  ];

  for (const { slug, data, description } of updates) {
    const asset = bySlug[slug];
    if (!asset) {
      console.log(`⚠️  Asset "${slug}" not found — skipping`);
      continue;
    }

    await prisma.brandAsset.update({
      where: { id: asset.id },
      data: {
        frameworkData: data as any,
        description,
      },
    });

    console.log(`✅ ${slug} — framework data populated`);
  }

  console.log('\n🎉 Done! All 11 brand assets now populated for Goed-Bouw.');
  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
