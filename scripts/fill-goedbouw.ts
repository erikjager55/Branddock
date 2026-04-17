/**
 * Fill Goed-Bouw brand assets with data from the brand document PDF.
 * Run: DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" npx tsx scripts/fill-goedbouw.ts
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: 'postgresql://erikjager:@localhost:5432/branddock' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const WORKSPACE_ID = 'cmneamaqw000ig3ms1eam4ga0';

// ── Golden Circle ──────────────────────────────────────────────
const goldenCircle = {
  why: {
    statement: 'Wij geloven dat goed bouwen begint bij mensen die trots zijn op wat ze neerzetten.',
    details: 'Wij geloven dat goed bouwen begint bij mensen die trots zijn op wat ze neerzetten. Daarom investeren wij in een cultuur waar vakmanschap, eigenaarschap en samenwerking centraal staan.',
  },
  how: {
    statement: 'Door uitdagende projecten aan te gaan met een hechte, gedreven groep.',
    details: 'Door uitdagende projecten aan te gaan met een hechte, gedreven groep. Dat doen we door: eerlijke afspraken te maken en die na te komen — geen gedoe, gewoon duidelijk; de mensen op de bouwplaats de vrijheid en het vertrouwen te geven om het beste uit zichzelf te halen; als één team te werken, van werkvoorbereiding tot oplevering; pas te stoppen als het klopt.',
  },
  what: {
    statement: 'Wij realiseren nieuwbouw, renovatie en transformatieprojecten.',
    details: 'Wij realiseren nieuwbouw, renovatie en transformatieprojecten. Van woningbouw en villabouw tot appartementencomplexen en utiliteitsbouw. Van grondwerk tot oplevering.',
  },
};

// ── Transformative Goals ───────────────────────────────────────
const transformativeGoals = {
  massiveTransformativePurpose: 'Goed bouwen begint bij mensen die trots zijn op wat ze neerzetten.',
  mtpNarrative: 'Bij Goed-bouw geloven we dat de kwaliteit van een bouwproject staat of valt met de mensen die het maken. Onze ambitie is om een bouwcultuur te creëren waarin vakmanschap, vertrouwen en samenwerking leiden tot projecten waar iedereen trots op is.',
  goals: [
    {
      title: 'Denken: Betrouwbare partner',
      description: 'Goed-bouw is een aannemer die zijn vak verstaat en zijn afspraken nakomt. Een bedrijf met korte lijnen en mensen die weten wat ze doen. Geen gedoe, geen verrassingen. Gewoon een partner die levert wat is afgesproken en die net zo trots is op het eindresultaat als de opdrachtgever.',
      impactDomain: 'People',
      timeframe: '2025-2030',
      measurableCommitment: 'Klanten ervaren Goed-bouw als betrouwbare partner die levert wat is afgesproken.',
      milestones: [],
      sdgAlignment: [],
    },
    {
      title: 'Voelen: Vertrouwen en rust',
      description: 'Goed-bouw geeft een gevoel van vertrouwen. De opdrachtgever weet dat het project in goede handen is. Dat geeft rust. Tegelijk voelt men de betrokkenheid van het team. Dit zijn mensen die er echt voor gaan. Dat maakt samenwerken prettig. Je hoeft niet te controleren. Je kunt bouwen op Goed-Bouw.',
      impactDomain: 'People',
      timeframe: '2025-2030',
      measurableCommitment: 'Opdrachtgevers voelen vertrouwen en rust bij de samenwerking met Goed-bouw.',
      milestones: [],
      sdgAlignment: [],
    },
    {
      title: 'Handelen: Heldere afspraken, trots resultaat',
      description: 'De opdrachtgever kiest voor Goed-bouw omdat hij weet wat hij krijgt. Contact opnemen, heldere afspraken maken en daarna draait het gewoon. Bij vragen weet je wie je moet bellen. En aan het einde van het project sta je te kijken naar iets om trots op te zijn.',
      impactDomain: 'People',
      timeframe: '2025-2030',
      measurableCommitment: 'Elk project eindigt met een resultaat waar opdrachtgever én team trots op zijn.',
      milestones: [],
      sdgAlignment: [],
    },
  ],
  authenticityScores: {
    ambition: 4,
    authenticity: 5,
    clarity: 5,
    measurability: 3,
    integration: 4,
    longevity: 4,
  },
  stakeholderImpact: [
    { stakeholder: 'Opdrachtgevers', role: 'Klanten', expectedImpact: 'Vertrouwen, rust en trots op het eindresultaat.' },
    { stakeholder: 'Medewerkers', role: 'Vakmensen', expectedImpact: 'Vrijheid, eigenaarschap en trots op hun werk.' },
    { stakeholder: 'Partners', role: 'Onderaannemers en leveranciers', expectedImpact: 'Eerlijke afspraken en samenwerking als één team.' },
  ],
  brandIntegration: {
    positioningLink: 'Goed-bouw positioneert zich als de aannemer waar vakmanschap en mensgerichtheid samenkomen.',
    themes: ['Trots op je werk', 'Geen gedoe', 'Als één team'],
    campaigns: [],
    internalActivation: 'De transformationele doelen worden intern verankerd via de cultuur van vrijheid, vertrouwen en vakmanschap op de bouwplaats.',
  },
};

// ── BrandHouse Values ──────────────────────────────────────────
const brandHouseValues = {
  anchorValue1: {
    name: 'Vakmanschap',
    tagline: 'Goed werk begint bij mensen die er trots op zijn',
    description: 'Wij leveren niet wat net voldoende is. We leveren werk waar we achter staan. Dat vakmanschap zit in de voorbereiding, de uitvoering en de manier waarop we een project opleveren.',
  },
  anchorValue2: {
    name: 'Samenwerking',
    tagline: 'Hand in hand, van begin tot eind',
    description: 'Goed bouwen doe je samen. Met het team, met de opdrachtgever en met de partijen om ons heen. Korte lijnen, open communicatie en wederzijds vertrouwen vormen daarvoor de basis.',
  },
  aspirationValue1: {
    name: 'Gedrevenheid',
    tagline: 'Gas blijven geven',
    description: 'Wij halen energie uit de uitdaging. Hoe groter het project, hoe meer wij er de schouders onder zetten. Die drang om door te gaan, tot het resultaat er staat, zit in ons allemaal.',
  },
  aspirationValue2: {
    name: 'Vrijheid',
    tagline: 'De ruimte om jezelf te zijn',
    description: 'Bij Goed-Bouw krijgen mensen de ruimte om te handelen, te groeien en zichzelf te zijn. We vertrouwen op de mensen die het werk doen. Die vrijheid maakt ons beter en het werken bij Goed-bouw de moeite waard.',
  },
  ownValue: {
    name: 'Aanpakken',
    tagline: 'Gewoon doen',
    description: 'Bij Goed-Bouw pakken we aan. We nemen verantwoordelijkheid, lossen op en gaan door totdat het klopt. Geen omwegen, geen smoesjes. Wat we zeggen, doen we.',
  },
  hechtValue: {
    name: 'Hechtheid',
    tagline: 'Een groep waar je bij wilt horen',
    description: 'Wij zijn geen anoniem bedrijf. We zijn een hechte groep mensen die samen bouwen aan iets om trots op te zijn. Dat betekent ook dat je niet altijd bij ons past en dat is precies de kracht van Goed-bouw.',
  },
  valueTension: 'De spanning tussen Vrijheid (individuele ruimte) en Hechtheid (de groep). Goed-bouw geeft mensen vrijheid, maar verwacht ook dat je past bij de hechte groep. Je hoort erbij of je hoort er niet bij — en dat is precies de kracht.',
};

// ── Brand Archetype ────────────────────────────────────────────
const brandArchetype = {
  primaryArchetype: 'Creator',
  subArchetype: 'Outlaw',
  coreDesire: 'Iets blijvends neerzetten — vakwerk waar je trots op bent.',
  coreFear: 'Middelmatigheid. Werk afleveren dat net voldoende is.',
  brandGoal: 'Projecten realiseren die getuigen van vakmanschap en waar iedereen trots op is.',
  strategy: 'Investeren in een hechte groep vakmensen die de vrijheid en het vertrouwen krijgen om het beste uit zichzelf te halen.',
  giftTalent: 'Het vermogen om met een gedreven team projecten neer te zetten die boven verwachting uitkomen.',
  shadowWeakness: 'Perfectionisme dat kan leiden tot conflicten met planning en budget. De Outlaw-kant kan leiden tot frictie met gevestigde processen.',
  brandVoiceDescription: '',
  voiceAdjectives: [],
  languagePatterns: '',
  weSayNotThat: [],
  archetypeInAction: 'Corporate communicatie: Creator 70% / Outlaw 30% — focus op vakmanschap, kwaliteit en trots. Wervingscommunicatie: Creator 30% / Outlaw 70% — focus op vrijheid, eigenheid en de rebelse kant van bouwen.',
  marketingExpression: 'Beelden van ruw vakwerk in uitvoering, teams op de bouwplaats, trots op het eindresultaat. Toon: direct, eerlijk, geen franje.',
  customerExperience: 'Korte lijnen, eerlijke afspraken, één team van werkvoorbereiding tot oplevering. De klant voelt vertrouwen en betrokkenheid.',
  contentStrategy: 'Projectverhalen vanuit het perspectief van de vakmensen. Behind-the-scenes content. Testimonials van opdrachtgevers over het vertrouwen en het eindresultaat.',
  storytellingApproach: 'Authentiek, vanuit de bouwplaats. Geen gepolijste marketing maar echte verhalen van echte mensen.',
  brandExamples: ['Volvo (Creator: veiligheid en vakmanschap)', 'Harley-Davidson (Outlaw: vrijheid en eigenheid)', 'Patagonia (Creator + Outlaw: kwaliteit met een rebel edge)'],
  positioningApproach: 'De aannemer die niet voor iedereen is, maar die wél levert wat beloofd is — met een team dat er écht voor gaat.',
  competitiveLandscape: 'In de bouwsector is betrouwbaarheid schaars. Goed-bouw onderscheidt zich door een cultuur van aanpakken, vakmanschap en hechtheid die de meeste aannemers niet bieden.',
};

// ── Brand Story ────────────────────────────────────────────────
const brandStory = {
  originStory: 'De bouw is een vak vol beloftes. Over planning, kwaliteit en samenwerking. Maar wie ooit iets heeft laten bouwen weet hoe makkelijk die beloftes sneuvelen.',
  founderMotivation: 'De overtuiging dat het succes van een project bepaald wordt door de mensen die het maken. Niet door systemen, niet door processen — maar door vakmensen die trots zijn op wat ze neerzetten.',
  coreBeliefStatement: 'Wij geloven dat goed bouwen begint bij mensen die trots zijn op wat ze neerzetten.',
  worldContext: 'De bouwsector wordt gekenmerkt door gebroken beloftes, miscommunicatie en projecten die niet naar verwachting worden opgeleverd. Opdrachtgevers zijn het vertrouwen verloren in aannemers.',
  customerExternalProblem: 'Een bouwproject realiseren dat op tijd, binnen budget en naar verwachting wordt opgeleverd.',
  customerInternalProblem: 'De angst dat je niet kunt vertrouwen op je aannemer. De stress van niet weten wat je krijgt.',
  philosophicalProblem: 'Waarom is het zo moeilijk om gewoon goed te bouwen? Waarom is betrouwbaarheid in de bouw zo schaars?',
  stakesCostOfInaction: 'Zonder een betrouwbare partner: vertragingen, budgetoverschrijdingen, frustratie en een eindresultaat waar niemand trots op is.',
  brandRole: 'De vakkundige, betrouwbare partner die levert wat is afgesproken — met een team dat er écht voor gaat.',
  empathyStatement: 'We begrijpen dat bouwen spannend is. Dat je wilt weten waar je aan toe bent. Dat je wilt vertrouwen op de mensen die jouw project realiseren.',
  authorityCredentials: 'Een hechte groep vakmensen met jarenlange ervaring in nieuwbouw, renovatie en transformatieprojecten — van woningbouw tot utiliteitsbouw.',
  transformationPromise: 'Van onzekerheid naar vertrouwen. Van gedoe naar duidelijkheid. Van een bouwproject naar een resultaat om trots op te zijn.',
  customerSuccessVision: 'Aan het einde van het project sta je te kijken naar iets om trots op te zijn. Je wist wat je ging krijgen, en dat is precies wat er staat.',
  abtStatement: 'De bouw is vol beloftes, MAAR weinig aannemers komen die na. DAAROM werkt Goed-bouw met een hechte groep vakmensen die pas stoppen als het klopt.',
  brandThemes: ['Trots', 'Vakmanschap', 'Vertrouwen', 'Hechtheid', 'Aanpakken'],
  emotionalTerritory: ['Trots', 'Vertrouwen', 'Rust', 'Betrokkenheid'],
  keyNarrativeMessages: [
    'Goed bouwen begint bij mensen die trots zijn op wat ze neerzetten.',
    'Wij zijn niet voor iedereen — en dat is precies de kracht.',
    'Eerlijke afspraken. Gewoon nakomen.',
    'Pas stoppen als het klopt.',
    'Gewoon dóén.',
  ],
  narrativeArc: 'De bouw is vol gebroken beloftes → Goed-bouw kiest een andere weg → Een hechte groep vakmensen die aanpakken → Projecten om trots op te zijn.',
  proofPoints: [
    'Hechte, vaste groep vakmensen — geen wisselende ploegen.',
    'Eerlijke afspraken die worden nagekomen.',
    'Korte lijnen — je weet wie je moet bellen.',
    'Van grondwerk tot oplevering, als één team.',
  ],
  valuesInAction: [
    'Aanpakken: geen smoesjes, gewoon doen.',
    'Vakmanschap: werk waar we achter staan.',
    'Samenwerking: als één team, van begin tot eind.',
    'Vrijheid: vertrouwen op de mensen die het werk doen.',
    'Hechtheid: een groep waar je bij wilt horen.',
    'Gedrevenheid: gas blijven geven.',
  ],
  brandMilestones: [],
  elevatorPitch: 'Goed-bouw is een aannemer die werkt met een hechte, gedreven groep vakmensen. Wij maken eerlijke afspraken, geven mensen de vrijheid om het beste uit zichzelf te halen, en stoppen pas als het klopt. Het resultaat? Projecten om trots op te zijn.',
  manifestoText: 'De bouw is een vak vol beloftes. Over planning, kwaliteit en samenwerking. Maar wie ooit iets heeft laten bouwen weet hoe makkelijk die beloftes sneuvelen. Bij Goed-bouw doen we wat we zeggen en nemen we onze verantwoordelijkheid. Zonder gedoe, zonder kleine lettertjes.\n\nDat kunnen we, omdat we weten wat een project écht maakt: de mensen die het bouwen. Daarom werken we met een hechte groep vakmensen. Mensen die energie halen uit het werk, trots zijn op wat ze neerzetten en pas stoppen als het klopt.\n\nGoed-bouw\nGewoon dóén',
  tagline: 'Gewoon dóén',
  audienceAdaptations: {
    customers: 'Je weet wat je krijgt: een team dat er écht voor gaat en een eindresultaat om trots op te zijn.',
    investors: '',
    employees: 'Wij zijn een aannemer voor mensen die écht willen bouwen. We realiseren nieuwbouw, renovatie en transformatieprojecten. Van woningbouw tot villabouw, van grondwerk tot oplevering. Wat ons onderscheidt? De groep mensen die het doet. Wij zijn een hechte, gedreven club die eerlijke afspraken maakt en die nakomt. We geven mensen op de bouwplaats de vrijheid en het vertrouwen om het beste uit zichzelf te halen. En we stoppen pas als het klopt. Het resultaat? Een eindresultaat om trots op te zijn. Voor de opdrachtgever. En voor jezelf. Goed-bouw is niet voor iedereen. Maar als jij iemand bent die trots is op zijn vak en die gas blijft geven totdat het resultaat er staat, dan weet je wat je bij ons krijgt en wat we van je verwachten.',
    partners: 'Korte lijnen, eerlijke afspraken, samen als één team. Van werkvoorbereiding tot oplevering.',
  },
  evp: {
    contractueel: 'Eerlijke afspraken die worden nagekomen. Heldere verwachtingen. Je weet wat je krijgt.',
    beleving: 'Een hechte, gedreven club. Selectief gezelschap als kracht. Samenwerken prettig. Je hoeft niet te controleren.',
    emotioneel: 'Trots op je vak. Vakmanschap als identiteit. Verbinding met de visie en missie van Goed-bouw.',
    narrative: 'Wij zijn een aannemer voor mensen die écht willen bouwen. We realiseren nieuwbouw, renovatie en transformatieprojecten. Van woningbouw tot villabouw, van grondwerk tot oplevering. Wat ons onderscheidt? De groep mensen die het doet. Wij zijn een hechte, gedreven club die eerlijke afspraken maakt en die nakomt. We geven mensen op de bouwplaats de vrijheid en het vertrouwen om het beste uit zichzelf te halen. En we stoppen pas als het klopt. Het resultaat? Een eindresultaat om trots op te zijn. Voor de opdrachtgever. En voor jezelf. Goed-bouw is niet voor iedereen. Maar als jij iemand bent die trots is op zijn vak en die gas blijft geven totdat het resultaat er staat, dan weet je wat je bij ons krijgt en wat we van je verwachten.',
  },
};

// ── Brand Essence ──────────────────────────────────────────────
const brandEssence = {
  essenceStatement: 'Trots bouwen.',
  essenceNarrative: 'De essentie van Goed-bouw is trots: trots op het vak, trots op het team, trots op het resultaat. Alles wat we doen — van de manier waarop we samenwerken tot de kwaliteit die we leveren — is geworteld in die trots.',
  functionalBenefit: 'Betrouwbare realisatie van nieuwbouw, renovatie en transformatieprojecten. Eerlijke afspraken die worden nagekomen, korte lijnen en één vast team van begin tot eind.',
  emotionalBenefit: 'Vertrouwen en rust. De zekerheid dat je project in goede handen is bij mensen die er écht voor gaan.',
  selfExpressiveBenefit: 'Door te kiezen voor Goed-bouw laat je zien dat je waarde hecht aan kwaliteit, vakmanschap en mensen die hun woord nakomen.',
  discriminator: 'Een hechte, vaste groep vakmensen die de vrijheid en het vertrouwen krijgen om het beste uit zichzelf te halen — en die pas stoppen als het klopt.',
  proofPoints: [
    'Vaste kern van vakmensen, geen wisselende ploegen.',
    'Eerlijke afspraken die worden nagekomen.',
    'Korte lijnen — je weet altijd wie je moet bellen.',
    'Van grondwerk tot oplevering als één team.',
  ],
  attributes: ['Vakkundig', 'Betrouwbaar', 'Hecht', 'Gedreven', 'Direct', 'Eerlijk'],
  audienceInsight: 'Opdrachtgevers in de bouw willen één ding: weten waar ze aan toe zijn. Ze zijn het zat om achter hun aannemer aan te moeten zitten en willen een partner die gewoon levert wat is afgesproken.',
  validationScores: {
    unique: 4,
    intangible: 3,
    meaningful: 5,
    authentic: 5,
    enduring: 4,
    scalable: 3,
  },
};

// ── Brand Promise ──────────────────────────────────────────────
const brandPromise = {
  promiseStatement: 'Wij leveren wat we afspreken — met een team dat er écht voor gaat.',
  promiseOneLiner: 'Eerlijke afspraken. Vakwerk. Een resultaat om trots op te zijn.',
  functionalValue: 'Betrouwbare oplevering van bouwprojecten: op tijd, volgens afspraak, met korte lijnen en een vast team.',
  emotionalValue: 'Vertrouwen en rust. Je weet dat je project in goede handen is.',
  selfExpressiveValue: 'Kiezen voor Goed-bouw betekent kiezen voor kwaliteit en integriteit in een sector waar dat niet vanzelfsprekend is.',
  targetAudience: 'Opdrachtgevers in nieuwbouw, renovatie en transformatieprojecten: particulieren, projectontwikkelaars en bedrijven die waarde hechten aan betrouwbaarheid en vakmanschap.',
  coreCustomerNeed: 'Een aannemer die zijn woord nakomt en projecten oplevert waar je trots op kunt zijn.',
  differentiator: 'Een hechte, gedreven groep vakmensen die de vrijheid en het vertrouwen krijgen om het beste uit zichzelf te halen.',
  onlynessStatement: 'Alleen Goed-bouw kan bouwen met een hechte groep vakmensen die eerlijke afspraken nakomt en pas stopt als het klopt, omdat we investeren in een cultuur van vrijheid, vertrouwen en vakmanschap.',
  proofPoints: [
    'Vaste kern vakmensen — geen wisselende onderaannemers.',
    'Korte lijnen: je weet wie je moet bellen.',
    'Van grondwerk tot oplevering als één team.',
    'Projecten in woningbouw, villabouw, appartementen en utiliteitsbouw.',
  ],
  measurableOutcomes: [
    'Oplevering conform afspraak — in planning en kwaliteit.',
    'Klanttevredenheid gebaseerd op vertrouwen en samenwerking.',
    'Behoud van vaste vakmensen door de cultuur van vrijheid en hechtheid.',
  ],
};

// ── Purpose Statement (Purpose Wheel) ──────────────────────────
const purposeWheel = {
  statement: 'Wij geloven dat goed bouwen begint bij mensen die trots zijn op wat ze neerzetten.',
  impactType: 'Enable Potential',
  impactDescription: 'Goed-bouw stelt vakmensen in staat het beste uit zichzelf te halen door hen vrijheid, vertrouwen en uitdagende projecten te bieden.',
  mechanismCategory: 'Empowerment',
  mechanism: 'Door een cultuur van vrijheid en vertrouwen creëren we een omgeving waarin vakmensen eigenaarschap nemen en trots zijn op hun werk.',
  pressureTest: 'Zonder Goed-bouw mist de bouwsector een aannemer die écht investeert in zijn mensen en de vrijheid geeft om vakmanschap centraal te stellen. De sector blijft gevangen in een cultuur van gebroken beloftes en middelmatigheid.',
};

async function main() {
  const assets = await prisma.brandAsset.findMany({
    where: { workspaceId: WORKSPACE_ID },
    select: { id: true, slug: true, frameworkType: true },
  });

  const bySlug = Object.fromEntries(assets.map((a) => [a.slug, a]));

  const updates: Array<{ slug: string; data: Record<string, unknown>; description?: string }> = [
    { slug: 'golden-circle', data: goldenCircle, description: 'De Golden Circle van Goed-bouw: WHY (trots op wat je neerzet), HOW (hechte gedreven groep, eerlijke afspraken), WHAT (nieuwbouw, renovatie, transformatie).' },
    { slug: 'transformative-goals', data: transformativeGoals, description: 'De transformationele doelen van Goed-bouw: wat opdrachtgevers moeten denken, voelen en doen na contact met het merk.' },
    { slug: 'core-values', data: brandHouseValues, description: 'De 6 kernwaarden van Goed-bouw: Aanpakken (fire), Vakmanschap & Samenwerking (roots), Gedrevenheid & Vrijheid (wings), met Hechtheid als verbindende kracht.' },
    { slug: 'brand-archetype', data: brandArchetype, description: 'Creator (70%) / Outlaw (30%) archetype voor corporate communicatie. Omgekeerd voor werving: Outlaw 70% / Creator 30%.' },
    { slug: 'brand-story', data: brandStory, description: 'Het merkverhaal van Goed-bouw: van gebroken beloftes in de bouw naar een hechte groep vakmensen die pas stoppen als het klopt.' },
    { slug: 'brand-essence', data: brandEssence, description: 'De merkessentie van Goed-bouw: Trots bouwen. Functioneel: betrouwbare realisatie. Emotioneel: vertrouwen en rust.' },
    { slug: 'brand-promise', data: brandPromise, description: 'De merkbelofte van Goed-bouw: eerlijke afspraken, vakwerk, en een resultaat om trots op te zijn.' },
    { slug: 'purpose-statement', data: purposeWheel, description: 'Het purpose statement van Goed-bouw: goed bouwen begint bij mensen die trots zijn op wat ze neerzetten.' },
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
        ...(description ? { description } : {}),
      },
    });

    console.log(`✅ ${slug} — framework data populated`);
  }

  console.log('\n🎉 Done! 8 brand assets populated for Goed-Bouw.');
  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
