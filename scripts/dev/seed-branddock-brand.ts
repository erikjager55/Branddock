// Seed: het volledige merk-DNA van Branddock zélf (dogfood-workspace).
// Bouwt lokaal de workspace "Branddock HQ" (org demo-org-branddock-001)
// volledig op — 11 canonieke brand-assets (content + frameworkData),
// brand voice, brandstyle (brandbook v3), 3 persona's, 3 producten,
// 3 concurrenten, launch-strategie met OKR's. Daarna migreren naar prod:
//   npx tsx scripts/migrate-brand-dna/export.ts "Branddock HQ" <bundle.json>
//   npx tsx scripts/migrate-brand-dna/import.ts <bundle.json> --email ... --slug ... --confirm-host ...
// Idempotent: bestaande "branddock-hq"-workspace wordt eerst verwijderd.
// Draaien vanuit de worktree-root:
//   node --env-file-if-exists=.env.local node_modules/.bin/tsx scripts/dev/seed-branddock-brand.ts

import { prisma } from "../../src/lib/prisma";
import type { AssetCategory, KeyResultStatus, MetricType, ObjectiveStatus, Priority, Prisma } from "@prisma/client";
import { CANONICAL_BRAND_ASSETS } from "../../src/lib/constants/canonical-brand-assets";

const ORG_ID = "demo-org-branddock-001";
const USER_ID = "demo-user-erik-001";
const WS_SLUG = "branddock-hq";
const WS_NAME = "Branddock HQ";
const SITE = "https://branddock.app";

async function main() {
  console.log("# Seed: Branddock HQ merk-DNA\n");

  // ── 0. Verse workspace ────────────────────────────────────────────────
  const existing = await prisma.workspace.findFirst({ where: { slug: WS_SLUG } });
  if (existing) {
    await prisma.workspace.delete({ where: { id: existing.id } });
    console.log("bestaande branddock-hq-workspace verwijderd");
  }
  const workspace = await prisma.workspace.create({
    data: { name: WS_NAME, slug: WS_SLUG, organizationId: ORG_ID, contentLanguage: "nl" },
  });
  const brand = await prisma.brand.upsert({
    where: { workspaceId: workspace.id },
    create: { workspaceId: workspace.id },
    update: {},
  });
  await prisma.brandLocaleProfile.upsert({
    where: { workspaceId_locale: { workspaceId: workspace.id, locale: "nl-NL" } },
    create: { brandId: brand.id, workspaceId: workspace.id, locale: "nl-NL", isDefault: true },
    update: { isDefault: true },
  });
  console.log(`workspace ${workspace.id} (${WS_NAME}, nl)`);

  // ── 1. De 11 canonieke brand-assets ───────────────────────────────────
  for (const asset of CANONICAL_BRAND_ASSETS) {
    await prisma.brandAsset.create({
      data: {
        name: asset.name,
        slug: asset.slug,
        category: asset.category as AssetCategory,
        description: asset.description,
        frameworkType: asset.frameworkType,
        status: "READY",
        coveragePercentage: 90,
        validatedCount: 1,
        aiValidated: true,
        workspaceId: workspace.id,
      },
    });
  }

  const fd = (slug: string, frameworkData: Record<string, unknown>, content?: string) =>
    prisma.brandAsset.updateMany({
      where: { slug, workspaceId: workspace.id },
      data: { frameworkData: frameworkData as object, ...(content ? { content } : {}) },
    });

  await fd("purpose-statement", {
    statement: "Elk merk verdient een stem die overal als zichzelf klinkt — óók als AI het werk doet.",
    impactType: "Enable Potential",
    impactDescription:
      "AI maakt marketing sneller, maar vervlakt merken: alles gaat hetzelfde klinken. Wij zorgen dat organisaties de snelheid van AI kunnen benutten zónder hun merk te verliezen — omdat het merk zelf het fundament onder elke uiting is.",
    mechanism:
      "Eén merk-DNA-fundament (assets, voice, stijl, persona's, producten, concurrenten) dat in elke AI-generatie wordt geïnjecteerd, plus een meetbare merk-check (F-VAL) op elke uiting — in Branddock, in Claude en ChatGPT, en in eigen workflows.",
    pressureTest:
      "Als deze purpose waar is, weigeren we features die snelheid boven merkzekerheid stellen.\nElke productbeslissing wordt getoetst aan: maakt dit het merk sterker of alleen de output sneller?\nWe claimen nooit autonomie die we niet kunnen bewijzen — de mens keurt goed.",
  });

  await fd("golden-circle", {
    why: {
      statement: "Wij geloven dat AI marketing versnelt, maar merken vervlakt — tenzij het merk het fundament is",
      details:
        "Generieke AI kent je merk niet. Wie AI inzet zonder merkfundament, wint tijd en verliest onderscheid. Dat vinden wij de verkeerde ruil.",
    },
    how: {
      statement: "Door één merk-DNA onder elke AI-uiting te leggen en elke uiting meetbaar te toetsen",
      details:
        "Gelaagde merkcontext in elke generatie, een F-VAL-merkscore op elk resultaat, en een team van AI-agents dat voorstelt terwijl de mens goedkeurt.",
    },
    what: {
      statement: "Een AI-marketingteamplatform dat je merk écht kent",
      details:
        "Onderzoek, strategie, content, beeld en merkbewaking op één merk-DNA — werkend in Branddock, in Claude en ChatGPT via de MCP-connector, en in eigen workflows via API en webhooks.",
    },
  });

  await fd("brand-essence", {
    essenceStatement: "Bewijsbaar on-brand",
    essenceNarrative:
      "Branddock reduceert de kern van merkvoering in het AI-tijdperk tot één belofte: alles wat er namens jouw merk ontstaat, is aantoonbaar van jouw merk. Niet als gevoel, maar als meetbare score.",
    functionalBenefit:
      "Volume on-brand content over alle kanalen uit één merkfundament — met een F-VAL-merkscore die per uiting laat zien hoe on-brand hij is, en agents die het werk voorbereiden.",
    emotionalBenefit:
      "Rust: je kunt AI omarmen zonder de angst dat je merk verwatert. Je hoeft niet elke output te herschrijven — je keurt goed wat al klopt.",
    selfExpressiveBenefit:
      "Wie Branddock gebruikt laat zien: wij nemen ons merk serieus, óók nu AI het werk versnelt. Modern én zorgvuldig.",
    discriminator:
      "Alleen Branddock combineert een volledig merk-DNA-fundament met een meetbare merk-check op elke uiting — waar die uiting ook ontstaat: in het platform, in Claude of ChatGPT, of in een eigen workflow.",
    proofPoints: [
      "11 canonieke merk-assets als fundament onder elke generatie",
      "F-VAL-merkscore (0-100) op elke uiting, met concrete bevindingen",
      "9 AI-agents met rollen — signaleren, adviseren, voorstellen; de mens keurt goed",
      "MCP-connector: je merk werkt in Claude, ChatGPT en n8n (branddock.app/mcp)",
      "Eerlijke pilotmeting: gemiddeld +7 punten on-brand versus vanilla-AI",
    ],
    attributes: ["Bewijsbaar", "Merk-eerst", "Nuchter", "Integraal", "Mens-in-de-loop"],
    audienceInsight:
      "Marketingteams in het MKB en bureaus willen de snelheid van AI, maar zijn bang dat hun merk (of dat van hun klant) verwatert tot gemiddelde AI-taal. Ze zoeken geen zoveelste schrijftool, maar zekerheid.",
    validationScores: { unique: 4, intangible: 3, meaningful: 5, authentic: 4, enduring: 4, scalable: 4 },
  });

  await fd(
    "brand-promise",
    {
      promiseStatement:
        "Een AI-marketingteam dat je merk écht kent — en dat kan bewijzen. Elke uiting die via Branddock ontstaat draagt jouw merk-DNA en krijgt een meetbare merk-check; niets gaat live zonder jouw goedkeuring.",
      promiseOneLiner: "Een AI-marketingteam dat je merk écht kent — en dat kan bewijzen.",
      functionalValue:
        "On-brand onderzoek, strategie, content en beeld uit één merkfundament, met een F-VAL-score per uiting.",
      emotionalValue: "Vertrouwen dat AI-tempo niet ten koste gaat van je merk.",
      selfExpressiveValue: "Een organisatie die AI professioneel inzet: snel én merkvast.",
      targetAudience:
        "Nederlandse marketingteams in het MKB (5-50 marketeers) en bureaus die meerdere klantmerken voeren.",
      coreCustomerNeed:
        "AI-schaal benutten zonder merkverwatering — en dat kunnen aantonen richting directie of klant.",
      differentiator:
        "De merk-check: geen enkel alternatief maakt on-brand meetbaar per uiting, over platform én externe AI-tools heen.",
      onlynessStatement:
        "Alleen Branddock geeft elke AI-uiting een meetbare merk-check op je eigen merk-DNA — waar die uiting ook ontstaat: in het platform, in Claude of ChatGPT, of in je eigen workflow.",
      proofPoints: [
        "F-VAL-merkscore met drie pijlers (stijl, beoordeling, regels) op elke uiting",
        "Eerlijke pilotmeting: +7 punten on-brand gemiddeld, bijna +10 op nieuwsbrieven",
        "MCP-connector met 17 merk-tools voor Claude/ChatGPT/n8n",
        "9 AI-agents die voorstellen — de mens keurt goed",
        "EU-hosting, AVG-proof, merkdata traint geen modellen van derden",
      ],
      measurableOutcomes: [
        "Meetbaar hogere merkconsistentie per kanaal (F-VAL-trend per week)",
        "Meer content per fte zonder extra reviewdruk",
        "Aantoonbaar on-brand rapportage richting directie of klant",
      ],
    },
    "Doelgroep: Nederlandse MKB-marketingteams en bureaus die AI willen inzetten zonder merkverwatering — en dat willen kunnen aantonen.",
  );

  await fd("mission-statement", {
    missionStatement:
      "Organisaties on-brand laten groeien in het AI-tijdperk: wij leggen één merk-DNA-fundament onder al hun AI-werk en maken elke uiting meetbaar on-brand.",
    missionOneLiner: "AI-tempo, merkvast.",
    forWhom:
      "Nederlandse marketingteams in het MKB en bureaus met meerdere klantmerken — en iedereen die vanuit Claude, ChatGPT of eigen workflows merkwerk doet.",
    whatWeDo:
      "Wij bundelen merkfundament, AI-generatie en merkbewaking in één platform: onderzoek, strategie, content, beeld en publicatie op hetzelfde merk-DNA.",
    howWeDoIt:
      "Gelaagde merkcontext in elke AI-call, een F-VAL-merkscore op elke uiting, AI-agents die voorstellen, en open koppelingen (MCP, API, webhooks) zodat het merk overal meereist.",
    visionStatement: "Het merkfundament onder elke AI-workflow.",
    timeHorizon: "5 jaar",
    boldAspiration:
      "De standaard worden voor merkbewaking in AI-workflows: waar AI namens een merk spreekt, toetst Branddock.",
    desiredFutureState:
      "Merken durven AI volledig te benutten omdat merkzekerheid is ingebouwd — 'is dit on-brand?' is geen gevoel meer maar een score.",
    successIndicators: [
      "Elke pilotklant publiceert wekelijks via Branddock",
      "F-VAL-scores per klant structureel boven de merkdrempel",
      "Connector actief in Claude/ChatGPT bij het merendeel van de workspaces",
      "Van pilot naar betalende NL-MKB-klantenbasis in 2026",
    ],
    stakeholderBenefit:
      "Marketeers krijgen tempo zonder rework; directies krijgen meetbare merkconsistentie; bureaus leveren aantoonbaar on-brand klantwerk.",
    impactGoal:
      "AI-marketing die merken versterkt in plaats van vervlakt — te beginnen in Nederland.",
    valuesAlignment:
      "Bewijs boven belofte: we meten onze eigen claims (eerlijke pilotcijfers) zoals we merkconsistentie voor klanten meten.",
    missionVisionTension:
      "Vandaag bedienen we pilots hands-on; de visie vraagt dat merkbewaking geruisloos in elke AI-workflow zit. De brug: open koppelingen (MCP/API) in plaats van een gesloten platform.",
  });

  await fd("brand-archetype", {
    primaryArchetype: "sage",
    coreDesire:
      "Waarheid en bewijs: precies begrijpen wat een merk is, en bewaken dat elke uiting daaraan trouw blijft.",
    brandVoiceDescription:
      "Nuchter, deskundig en concreet. We onderbouwen met cijfers en voorbeelden, vermijden hype, en zeggen eerlijk wat iets niet kan. Nederlands-direct, nooit belerend.",
    archetypeInAction:
      "We publiceren eerlijke pilotcijfers (+7, niet '10x'), tonen per uiting wáárom een score is wat hij is, en claimen nergens autonomie zonder mens-goedkeuring. De Sage bewijst; met een vleug Creator: we bouwen het gereedschap zelf.",
  });

  await fd(
    "transformative-goals",
    {},
    "Transformatieve doelen (2026-2028):\n\n1. **Pilot → betalende basis (2026):** van de eerste pilotmerken naar een betalende Nederlandse MKB-klantenbasis, met wekelijkse publicatie-cadans per klant als bewijs van waarde.\n\n2. **Het merk reist overal mee (2026-2027):** de MCP-connector, browser-extensie en API maken Branddock het merkfundament in Claude, ChatGPT, n8n en eigen workflows — het platform is niet de grens.\n\n3. **Brandclaw — begrensde autonomie (2027-2028):** de content-loop groeit in bewezen stappen van voorstellen-met-goedkeuring (BC-1, live) naar goedgekeurd-is-gepubliceerd (BC-2) naar begrensde autonomie met budget, F-VAL-drempels en kill-switch (BC-3). Pas als elk niveau incident-vrij draait, claimt de marketing het volgende.",
  );

  await fd(
    "brand-personality",
    {},
    "Merkpersoonlijkheid — vijf trekken:\n\n1. **Nuchter** — wij zijn het tegengif tegen AI-hype: eerlijke cijfers, bescheiden claims, concrete voorbeelden.\n2. **Deskundig** — merkstrategie is ons vak; frameworks, F-VAL en agents zijn gereedschap, geen magie.\n3. **Transparant** — open over wat werkt en wat nog niet; publieke changelog; eerlijke vergelijkingspagina's.\n4. **Nederlands-direct** — helder, zonder omhaal, professioneel maar menselijk.\n5. **Waakzaam** — wij bewaken het merk als een goede collega: kritisch op elke uiting, nooit op de persoon.\n\nIn de praktijk: 'jij keurt goed' staat in elke belofte; 'autopilot' komt in onze taal niet voor tot het bewezen waar is.",
  );

  await fd(
    "brand-story",
    {},
    "Branddock is geboren in de bureau-praktijk van Better Brands. Daar zagen we van dichtbij wat AI met merken doet: teams produceerden ineens tien keer zoveel content — en alles begon hetzelfde te klinken. Generieke AI kent je merk niet. Elke prompt begon opnieuw, elke output moest herschreven, en niemand kon aantonen of het resultaat nog wel 'des merks' was.\n\nWe bouwden eerst gereedschap voor onszelf: één plek waar het volledige merk-DNA leeft — assets, stem, stijl, persona's, producten, concurrenten — en dat fundament automatisch onder elke AI-generatie schuift. Daarna kwam de vraag die alles veranderde: kun je on-brand ook méten? Zo ontstond F-VAL, de merk-check die elke uiting een score en concrete bevindingen geeft.\n\nInmiddels is Branddock een AI-marketingteam: negen agents die onderzoeken, adviseren, signaleren en voorstellen — terwijl de mens goedkeurt. En omdat merkwerk niet in één tool gebeurt, reist het merk mee: via de MCP-connector werkt je merk-DNA in Claude en ChatGPT, via de API en webhooks in elke workflow.\n\nDe overtuiging is dezelfde als op dag één: AI mag het werk versnellen, maar het merk bepaalt hoe het klinkt. En dat moet je kunnen bewijzen.",
  );

  await fd("core-values", {
    anchorValue1: {
      name: "Bewijs boven belofte",
      description:
        "We claimen alleen wat we kunnen meten — van F-VAL-scores tot onze eigen pilotcijfers. Eerlijke bescheiden cijfers verslaan opgeblazen beloftes.",
    },
    anchorValue2: {
      name: "Merk-eerst",
      description:
        "Elke feature begint bij het merkfundament, niet bij de output. Snelheid die het merk verwatert is geen feature.",
    },
    aspirationValue1: {
      name: "Toegankelijk vakwerk",
      description:
        "Professionele merkstrategie en merkbewaking horen niet alleen bij enterprises met bureaus — het MKB verdient hetzelfde fundament.",
    },
    aspirationValue2: {
      name: "Autonomie met toezicht",
      description:
        "Agents mogen steeds meer, in bewezen stappen — maar de mens keurt goed. Autonomie is verdiend vertrouwen, geen marketingclaim.",
    },
    ownValue: {
      name: "Nuchter Nederlands",
      description:
        "Direct, concreet en zonder hype — in ons product, onze marketing en onze cijfers. We schrijven zoals Nederlandse marketeers denken.",
    },
    valueTension:
      "Het AI-tempo van de markt versus de zorgvuldigheid van merkbewaking: wij kiezen bewust voor bewezen stappen, ook als de markt sneller roept.",
  });

  await fd("social-relevancy", {
    impactStatement:
      "Wij houden merkcommunicatie eerlijk en menselijk in het AI-tijdperk: meetbaar on-brand, AVG-proof en zonder loze claims.",
    impactNarrative:
      "AI-marketing groeit sneller dan het toezicht erop. Branddock bouwt de bewakingslaag: merken die via ons publiceren doen dat met een meetbare merk-check, met menselijke goedkeuring en met data die in de EU blijft. Onze eigen claims houden we aan dezelfde meetlat als die van onze klanten.",
    activismLevel: "Ingetogen",
    milieu: {
      statements: [
        {
          text: "We kiezen bewust voor een compacte, efficiënte infrastructuur.",
          score: 3,
          evidence: "Serverless-first (geen idle servers), EU-datacenters, remote-first team zonder kantoorpand.",
          target: "Inzicht in CO2-voetafdruk per workspace",
          timeline: "2027",
        },
      ],
      pillarReflection:
        "Als digitaal platform is onze directe voetafdruk beperkt; onze keuzes zitten in efficiënte infrastructuur en het vermijden van onnodige AI-calls (caching, zero-cost-acties).",
    },
    mens: {
      statements: [
        {
          text: "Ons product vermindert werkdruk en beslismoeheid bij marketeers.",
          score: 4,
          evidence: "Agents bereiden werk voor; F-VAL vervangt eindeloze review-rondes door één duidelijke score met bevindingen.",
          target: "Werkdruk-effect meten in klantonderzoek",
          timeline: "2027",
        },
        {
          text: "De mens houdt zeggenschap over wat er namens een merk naar buiten gaat.",
          score: 5,
          evidence: "Goedkeurings-flow is verplicht in elke agent-keten; autonomie groeit alleen in bewezen, begrensde stappen.",
          target: "Kill-switch en budgetgrenzen standaard bij elke autonomie-trap",
          timeline: "doorlopend",
        },
      ],
      pillarReflection:
        "Onze grootste maatschappelijke bijdrage is dat AI-marketing menselijk toezicht houdt — by design, niet als optie.",
    },
    maatschappij: {
      statements: [
        {
          text: "We maken merkcommunicatie eerlijker en herkenbaarder in plaats van uniformer.",
          score: 4,
          evidence: "De merk-check beloont eigenheid boven generieke AI-taal; vergelijkingspagina's zijn eerlijk over alternatieven.",
          target: "Publieke F-VAL-benchmark over anonieme workspaces",
          timeline: "2027",
        },
      ],
      pillarReflection:
        "Een markt vol AI-content wordt leefbaarder als merken herkenbaar blijven — daar werken wij direct aan.",
    },
    authenticityScores: {
      walkTheTalk: 4,
      transparency: 4,
      consistency: 4,
      stakeholderTrust: 3,
      measurability: 3,
      longTermCommitment: 4,
    },
    proofPoints: [
      "EU-hosting en AVG-proof verwerking; merkdata traint geen modellen van derden",
      "Eerlijke pilotcijfers gepubliceerd (+7 gemiddeld — geen '10x'-claims)",
      "Publieke changelog en transparante prijzen",
      "Mens-goedkeuring verplicht in elke agent-keten",
    ],
    certifications: [],
    antiGreenwashingStatement:
      "We zijn een jong bedrijf: onze impactmeting is in opbouw en we hebben nog geen externe certificeringen. We rapporteren eerlijk over wat we wél en nog niet meten.",
    sdgAlignment: [8, 9],
    communicationPrinciples: [
      "Cijfers eerst, bijvoeglijke naamwoorden daarna",
      "Benoem beperkingen vóór successen",
      "Claim geen autonomie die niet bewezen is",
      "Vergelijk eerlijk — ook als het alternatief ergens beter is",
    ],
    keyStakeholders: ["MKB-marketingteams", "Bureaus", "Pilotklanten", "Medewerkers"],
    activationChannels: ["Platform", "Changelog/Nieuws", "LinkedIn", "Pilotrapportages"],
    annualCommitment:
      "Eind 2026 publiceren we onze eerste eerlijke impactnotitie: pilotresultaten, F-VAL-effect en wat nog niet lukte.",
  });

  console.log("11 brand-assets gevuld (content + frameworks)");

  // ── 2. Brand voice ────────────────────────────────────────────────────
  await prisma.brandVoiceguide.create({
    data: {
      workspaceId: workspace.id,
      source: "manual",
      contentLocale: "nl-NL",
      createdById: USER_ID,
      voiceDescription:
        "Branddock klinkt als een nuchtere Nederlandse vakgenoot: deskundig zonder jargon, direct zonder botheid, en altijd concreet. We onderbouwen met cijfers en voorbeelden, benoemen eerlijk wat iets niet kan, en vermijden elke vorm van AI-hype. De lezer is een drukke professional — we respecteren diens tijd met korte zinnen en een duidelijke kern.",
      // NN/g-schaal 1-7 (4 = neutraal) — de UI-sliders en formatBrandVoiceguide
      // rekenen hiermee; 0-100-waarden lazen als "funny/irreverent/enthousiast".
      toneDimensions: {
        formalCasual: 4,
        seriousFunny: 2,
        respectfulIrreverent: 2,
        matterOfFactEnthusiastic: 3,
      },
      contentGuidelines: [
        "Leid met het resultaat of de kern — de lezer beslist in de eerste zin of hij doorleest",
        "Elke claim krijgt een cijfer of concreet voorbeeld; geen cijfer = geen claim",
        "Benoem de mens-in-de-loop ('jij keurt goed') bij elke agent- of automatiseringsbelofte",
        "Schrijf vanuit het merk van de klant, niet vanuit onze technologie",
      ],
      writingGuidelines: [
        "Korte zinnen, actieve vorm, Nederlands-direct",
        "Technische termen (F-VAL, MCP, merk-DNA) bij eerste gebruik in één bijzin uitleggen",
        "Geen uitroeptekens, geen superlatieven, geen emoji's",
        "Getallen als cijfers (9 agents, +7 punten), bedragen met €",
      ],
      vocabularyDo: [
        "merk-DNA",
        "on-brand",
        "merk-check",
        "bewijsbaar",
        "jij keurt goed",
        "meetbaar",
        "fundament",
        "nuchter",
      ],
      vocabularyDont: [
        "autopilot",
        "revolutionair",
        "game-changer",
        "magisch",
        "10x",
        "moeiteloos",
        "AI-powered (als bijvoeglijk naamwoord zonder inhoud)",
      ],
      wordsWeUse: ["merkvast", "agents", "voorstellen", "goedkeuren", "merkcontext", "cadans"],
      wordsWeAvoid: ["synergy", "unlock", "leverage", "empoweren", "disruptie"],
      voiceSample:
        "Generieke AI kent je merk niet. Branddock legt je volledige merk-DNA onder elke uiting en geeft elk resultaat een meetbare merk-check: de F-VAL-score. Negen agents bereiden het werk voor — onderzoek, content, bewaking — en jij keurt goed. In een eerlijke pilotmeting scoorde content via Branddock gemiddeld +7 punten on-brand ten opzichte van vanilla-AI. Geen magie, wel bewijs.",
      examplePhrases: [
        { text: "Elke uiting krijgt een meetbare merk-check — jij keurt goed.", type: "do" },
        { text: "Eerlijke pilotmeting: +7 punten on-brand versus vanilla-AI.", type: "do" },
        { text: "Koppel je merk aan Claude en ChatGPT via branddock.app/mcp.", type: "do" },
        { text: "Revolutionaire AI-magie die je marketing 10x't!", type: "dont" },
        { text: "Zet je marketing op autopilot en kijk nooit meer om.", type: "dont" },
      ],
      antiPatterns: [
        "Hype-taal of superlatieven zonder onderbouwing",
        "Autonomie claimen waar mens-goedkeuring in de flow zit",
        "Engelse buzzwords waar een gewoon Nederlands woord bestaat",
        "Angst als verkoopargument ('je merk gaat kapot zonder ons')",
      ],
      voiceDnaSavedForAi: true,
      vocabularySavedForAi: true,
      antiPatternsSavedForAi: true,
      guidelinesSavedForAi: true,
      examplePhrasesSavedForAi: true,
    },
  });
  console.log("brand voice gevuld");

  // ── 3. Brandstyle (brandbook v3) ──────────────────────────────────────
  const styleguide = await prisma.brandStyleguide.create({
    data: {
      status: "COMPLETE",
      sourceType: "URL",
      sourceUrl: SITE,
      analysisStatus: "COMPLETE",
      // Publish-gate: zonder published voedt de styleguide getBrandContext niet.
      published: true,
      designPhilosophy:
        "Nuchter en levendig tegelijk: een strak, licht basisraster (wit, veel ruimte, slate-tekst) met het merkgroen als enige vaste accentkleur, verlevendigd door geometrische mozaïeken, merk-gradients en lucht-fotografie uit het brandbook.",
      logos: {
        create: [
          {
            workspaceId: workspace.id,
            variant: "PRIMARY",
            fileUrl: `${SITE}/marketing/branddock-logo.svg`,
            fileName: "branddock-logo.svg",
            fileType: "svg",
            description: "Primair logo — groen campsite-B-beeldmerk + wordmark, voor lichte achtergronden",
            sortOrder: 0,
          },
          {
            workspaceId: workspace.id,
            variant: "LIGHT",
            fileUrl: `${SITE}/marketing/branddock-logo-white.svg`,
            fileName: "branddock-logo-white.svg",
            fileType: "svg",
            description: "Witte variant voor donkere (slate/gradient) achtergronden",
            sortOrder: 1,
          },
          {
            workspaceId: workspace.id,
            variant: "ICON",
            fileUrl: `${SITE}/marketing/branddock-icon.svg`,
            fileName: "branddock-icon.svg",
            fileType: "svg",
            description: "Beeldmerk-only (campsite-B) — favicons, avatars en kleine formaten",
            sortOrder: 2,
          },
        ],
      },
      logoGuidelines: [
        "Primair logo op lichte achtergronden; witte variant op slate of gradients",
        "Beeldmerk-only onder 32px of als avatar/favicon",
        "Vrije ruimte rondom minimaal de hoogte van de B",
      ],
      logoDonts: [
        "Niet uitrekken, roteren of van kleur veranderen",
        "Geen schaduwen of effecten toevoegen",
        "Niet op drukke fotografie zonder contrastvlak plaatsen",
      ],
      logoSavedForAi: true,
      colorDonts: [
        "Merkgroen niet als grote achtergrondvlakken — het is een accent- en actiekleur",
        "Accentkleuren (peach/oranje/lime) nooit combineren zonder neutrale scheiding",
        "Geen tekst in accentkleuren op wit (contrast)",
      ],
      colorsSavedForAi: true,
      primaryFontName: "Halyard (Adobe Fonts)",
      primaryFontUrl: "https://fonts.adobe.com/fonts/halyard",
      additionalFonts: ["Hanken Grotesk (open-source fallback, zelf-gehost)"],
      typeScale: [
        { level: "H1", name: "Hero-kop", size: "56px", lineHeight: "60px", weight: "700", letterSpacing: "-0.02em" },
        { level: "H2", name: "Sectiekop", size: "36px", lineHeight: "42px", weight: "700", letterSpacing: "-0.01em" },
        { level: "H3", name: "Kaartkop", size: "20px", lineHeight: "28px", weight: "600", letterSpacing: "0" },
        { level: "Body", name: "Body", size: "16px", lineHeight: "26px", weight: "400", letterSpacing: "0" },
        { level: "Caption", name: "Meta/eyebrow", size: "12px", lineHeight: "16px", weight: "600", letterSpacing: "0.06em" },
      ],
      typographySavedForAi: true,
      photographyStyle: {
        style: "Lucht-fotografie: wolkenluchten en open hemels als rustgevend, optimistisch basismateriaal",
        mood: "Open, optimistisch, kalm — ruimte om te denken",
        composition: "Veel lucht, lage horizon, merk-gradient-overlay voor consistentie",
      },
      photographyGuidelines: [
        "Luchten en open ruimtes boven kantoor-stockfotografie",
        "Altijd de merk-gradient-overlay toepassen voor kleurconsistentie",
        "Mensen alleen in authentieke werkcontext, nooit geposeerd",
      ],
      illustrationGuidelines: [
        "Geometrisch mozaïek (cirkels, sterren, halve rondingen) in merkkleuren als signatuur-patroon",
        "Gradients uitsluitend uit merkkleur-paren (groen→blauw, peach→oranje)",
        "Plat en geometrisch; geen 3D, geen schaduwen",
      ],
      imageryDonts: [
        "Geen generieke AI-gegenereerde mensen of robots-met-laptops",
        "Geen stockbeelden met geforceerde poses",
        "Geen mix van illustratiestijlen binnen één uiting",
      ],
      imagerySavedForAi: true,
      workspaceId: workspace.id,
      createdById: USER_ID,
    },
  });

  const colors = [
    { name: "Merkgroen (mint)", hex: "#07E5AB", rgb: "rgb(7, 229, 171)", hsl: "hsl(164, 94%, 46%)", category: "PRIMARY", tags: ["brand", "primary", "CTA"], contrastWhite: "Fail", contrastBlack: "AA", sortOrder: 0 },
    { name: "Slate", hex: "#1F2937", rgb: "rgb(31, 41, 55)", hsl: "hsl(215, 28%, 17%)", category: "NEUTRAL", tags: ["text", "hero-achtergrond"], contrastWhite: "AAA", contrastBlack: "Fail", sortOrder: 1 },
    { name: "Blauw", hex: "#343CED", rgb: "rgb(52, 60, 237)", hsl: "hsl(237, 84%, 57%)", category: "SECONDARY", tags: ["gradient", "accent"], contrastWhite: "AA", contrastBlack: "Fail", sortOrder: 2 },
    { name: "Peach", hex: "#FECFBD", rgb: "rgb(254, 207, 189)", hsl: "hsl(17, 97%, 87%)", category: "ACCENT", tags: ["mozaïek", "zacht"], contrastWhite: "Fail", contrastBlack: "AAA", sortOrder: 3 },
    { name: "Oranje", hex: "#FF7F4D", rgb: "rgb(255, 127, 77)", hsl: "hsl(17, 100%, 65%)", category: "ACCENT", tags: ["mozaïek", "warm"], contrastWhite: "Fail", contrastBlack: "AA", sortOrder: 4 },
    { name: "Lime", hex: "#D8FD48", rgb: "rgb(216, 253, 72)", hsl: "hsl(72, 98%, 64%)", category: "ACCENT", tags: ["mozaïek", "signaal-dot"], contrastWhite: "Fail", contrastBlack: "AAA", sortOrder: 5 },
    { name: "Wit", hex: "#FFFFFF", rgb: "rgb(255, 255, 255)", hsl: "hsl(0, 0%, 100%)", category: "BACKGROUND", tags: ["basis", "ruimte"], contrastWhite: "Fail", contrastBlack: "AAA", sortOrder: 6 },
  ] as const;
  for (const color of colors) {
    await prisma.styleguideColor.create({
      data: { ...color, tags: [...color.tags], styleguideId: styleguide.id },
    });
  }
  console.log("brandstyle gevuld (brandbook v3: 7 kleuren, Halyard, mozaïek/gradients/lucht)");

  // ── 4. Persona's ──────────────────────────────────────────────────────
  const personas = [
    {
      name: "Merel de Vries",
      tagline: "Marketing Manager MKB — wil AI-tempo zonder merkverwatering",
      age: "34",
      gender: "Vrouw",
      location: "Utrecht",
      occupation: "Marketing Manager (MKB, 50-200 medewerkers)",
      education: "HBO Communicatie",
      income: "€55.000-€70.000",
      familyStatus: "Samenwonend, 1 kind",
      personalityType: "Pragmatische doener met kwaliteitsbewaking",
      coreValues: ["Kwaliteit", "Efficiëntie", "Eerlijkheid"],
      interests: ["Marketing-automation", "Merkstrategie", "AI-tools", "Vakwebinars"],
      goals: [
        "Meer content leveren zonder extra headcount",
        "Merkconsistentie aantoonbaar maken richting directie",
        "AI inzetten zonder dat alles hetzelfde gaat klinken",
      ],
      motivations: [
        "Trots op een herkenbaar merk",
        "Grip houden terwijl het tempo omhoog gaat",
        "Serieus genomen worden aan de directietafel (met cijfers)",
      ],
      frustrations: [
        "AI-output klinkt generiek en moet altijd herschreven",
        "Elke tool opnieuw merkcontext voeren",
        "Review-cycli vreten de tijdwinst van AI weer op",
        "Geen bewijs kunnen leveren dat content on-brand is",
      ],
      behaviors: [
        "Werkt dagelijks met ChatGPT/Claude naast de vaste toolstack",
        "Beslist op demo's en peer-reviews, niet op advertenties",
        "Leest vakcontent op LinkedIn tijdens forenzen",
      ],
      strategicImplications:
        "Merel is de kernkoper: overtuig haar met de merk-check als bewijs richting directie en met tijdwinst zonder rework. Demo = nieuwsbrief-vergelijking Branddock vs. vanilla-AI.",
      quote: "Ik wil AI gebruiken, maar niet klinken als iedereen.",
      bio: "Merel runt marketing met een klein team en een grote kalender. Ze omarmde AI vroeg, maar werd er ook door teleurgesteld: sneller, maar vlakker. Ze zoekt geen nieuwe schrijftool — ze zoekt zekerheid dat het tempo haar merk niet sloopt.",
      preferredChannels: ["LinkedIn", "E-mailnieuwsbrieven", "Google-zoekopdrachten", "Vakwebinars"],
      workspaceId: "",
      createdById: USER_ID,
    },
    {
      name: "Bas Hendriks",
      tagline: "Bureau-eigenaar — voert acht klantmerken en moet ze allemaal bewaken",
      age: "42",
      gender: "Man",
      location: "Eindhoven",
      occupation: "Eigenaar marketingbureau (8 fte)",
      education: "WO Bedrijfskunde",
      income: "€90.000+",
      familyStatus: "Getrouwd, 2 kinderen",
      personalityType: "Ondernemende kwaliteitsbewaker",
      coreValues: ["Klantvertrouwen", "Vakmanschap", "Rendement per fte"],
      interests: ["Bureau-groei", "AI in klantwerk", "Positionering", "Pricing"],
      goals: [
        "Meer klantwerk per fte zonder kwaliteitsverlies",
        "Aantoonbaar on-brand werk leveren per klantmerk",
        "Junioren senior-kwaliteit laten leveren met het merkfundament als vangrail",
      ],
      motivations: [
        "Klanten die blijven omdat het werk klopt",
        "Marge verbeteren met AI zonder het eerlijke verhaal te verliezen",
      ],
      frustrations: [
        "Merkkennis van klanten zit in hoofden en verspreide documenten",
        "Klanten vragen kritisch of het bureau 'gewoon ChatGPT' gebruikt",
        "Elke wissel van medewerker kost merk-inwerkweken",
      ],
      behaviors: [
        "Voert meerdere klant-workspaces naast elkaar",
        "Deelt resultaten met klanten in rapportages",
        "Test tools eerst op één klant voordat het bureau-breed gaat",
      ],
      strategicImplications:
        "Bas is de multi-workspace-koper (Agency-tier): één merk-DNA-workspace per klant, F-VAL-rapportage als klantbewijs, en klant-meekijk-toegang via eigen login.",
      quote: "Als ik AI inzet, moet ik kunnen laten zien dat het het merk van de klant is — niet ChatGPT.",
      bio: "Bas bouwde zijn bureau op degelijk merkwerk. AI verhoogt zijn marge, maar hij weigert het eerlijke verhaal kwijt te raken: klanten betalen voor húń merk. Hij zoekt infrastructuur die merkkennis vastlegt en bewijsbaar maakt.",
      preferredChannels: ["LinkedIn", "Bureau-netwerken", "Referenties van vakgenoten"],
      workspaceId: "",
      createdById: USER_ID,
    },
    {
      name: "Jesse Kramer",
      tagline: "Founder — doet marketing er solo bij, het liefst vanuit Claude",
      age: "29",
      gender: "Non-binair",
      location: "Amsterdam",
      occupation: "Founder B2B-SaaS (6 medewerkers, geen marketingteam)",
      education: "WO Informatica",
      income: "Wisselend (startup)",
      familyStatus: "Alleenstaand",
      personalityType: "Bouwer die marketing als systeem ziet",
      coreValues: ["Autonomie", "Efficiëntie", "Authenticiteit"],
      interests: ["AI-agents", "MCP/automation", "n8n", "Product-led growth"],
      goals: [
        "Professionele marketing zonder marketingteam",
        "Alles vanuit de eigen AI-workflow (Claude, n8n) kunnen doen",
        "Consistent klinken terwijl de agent het schrijfwerk doet",
      ],
      motivations: [
        "Tijd voor product houden",
        "Een merk dat groter oogt dan het team is",
      ],
      frustrations: [
        "Geen tijd én geen merkbewaker",
        "Agent-output wisselt per dag van toon",
        "Marketingtools voelen als een tweede baan",
      ],
      behaviors: [
        "Leeft in Claude/ChatGPT en automatiseert alles wat kan",
        "Koppelt tools via MCP en n8n in plaats van dashboards te openen",
        "Publiceert in bursts wanneer er even tijd is",
      ],
      strategicImplications:
        "Jesse is de agentic-first-gebruiker: de MCP-connector ís het product. Onboarding moet volledig via de connector kunnen; het platform is de plek waar hij goedkeurt en het merk beheert.",
      quote: "Mijn agent schrijft alles — ik wil dat het als mijn bedrijf klinkt.",
      bio: "Jesse bouwt een SaaS en doet marketing ertussendoor, vrijwel volledig vanuit Claude. De vraag is nooit óf AI het werk doet, maar of het resultaat het merk waard is. Branddock is voor Jesse de merk-laag onder een bestaande agent-workflow.",
      preferredChannels: ["X/Twitter", "LinkedIn", "Founder-communities", "GitHub/technische blogs"],
      workspaceId: "",
      createdById: USER_ID,
    },
  ];
  for (const p of personas) {
    await prisma.persona.create({ data: { ...p, workspaceId: workspace.id } });
  }
  console.log("3 persona's gevuld (Merel, Bas, Jesse)");

  // ── 5. Producten ──────────────────────────────────────────────────────
  const products: Prisma.ProductUncheckedCreateInput[] = [
    {
      name: "Branddock Platform",
      slug: "branddock-platform",
      description:
        "Het AI-marketingteamplatform: één workspace met het volledige merk-DNA (11 canonieke assets, brand voice, brandstyle, persona's, producten, concurrenten) als fundament onder onderzoek, campagnestrategie, content-, beeld- en videogeneratie — met de F-VAL-merk-check op elke uiting en 9 AI-agents die voorstellen terwijl jij goedkeurt.",
      category: "SaaS-platform",
      categoryIcon: "LayoutDashboard",
      pricingModel: "Maandabonnement met output-credits",
      pricingDetails:
        "Starter €39/mnd (400 credits) · Growth €89/mnd (1.200) · Agency €299/mnd (4.000, meerdere workspaces). 28 dagen gratis proberen zonder creditcard; merkcontext en merk-check kosten nooit credits.",
      source: "MANUAL",
      status: "ANALYZED",
      features: [
        "11 canonieke merk-assets met frameworks en validatie",
        "F-VAL-merkscore (stijl 35% / beoordeling 45% / regels 20%) op elke uiting",
        "9 AI-agents: onderzoek, strategie, content, merkbewaking, rapportage, loop",
        "Content Canvas, campagne-wizard, beeld/video, landingspagina's",
        "Trend Radar en concurrent-monitoring",
      ],
      benefits: [
        "AI-tempo zonder merkverwatering",
        "Bewijsbare merkconsistentie richting directie of klant",
        "Minder rework: goedkeuren in plaats van herschrijven",
      ],
      useCases: [
        "Wekelijkse content-cadans voor een MKB-merk",
        "Bureau dat meerdere klantmerken aantoonbaar on-brand bedient",
        "Campagne van strategie-blueprint tot deliverables",
      ],
      workspaceId: "",
    },
    {
      name: "Brand-API & MCP-connector",
      slug: "branddock-mcp-connector",
      description:
        "Het merk reist mee naar buiten: via de MCP-connector (branddock.app/mcp) werkt het volledige merk-DNA in Claude, ChatGPT en n8n — 17 merk-tools van get_brand_context tot generate_on_brand en score_against_brand. Voor eigen workflows: publieke REST-API en webhooks met HMAC-signing.",
      category: "Integratie",
      categoryIcon: "Plug",
      pricingModel: "Inbegrepen in het abonnement",
      pricingDetails:
        "Zelfde credits als in het platform; lezen van merkcontext en scoren is gratis. OAuth-login of API-keys per workspace.",
      source: "MANUAL",
      status: "ANALYZED",
      features: [
        "17 MCP-tools met merkcontext, generatie en merk-check",
        "OAuth-login (merk volgt je actieve organisatie) of merk-vergrendelde API-keys",
        "Webhooks: deliverable.generated, content.published, fidelity-events",
        "n8n-nodes en browser-extensie (beta)",
      ],
      benefits: [
        "Werk in de AI waar je al zit — met je merk als fundament",
        "Automatiseer merkwerk machine-to-machine, metadata-only gelogd",
      ],
      useCases: [
        "LinkedIn-post schrijven in Claude, on-brand en gescoord",
        "n8n-workflow die content genereert en na goedkeuring publiceert",
        "E-mail beantwoorden in merkstem via de browser-extensie",
      ],
      workspaceId: "",
    },
    {
      name: "F-VAL merk-check",
      slug: "branddock-fval-merk-check",
      description:
        "De meetlat onder alles: F-VAL scoort elke uiting 0-100 op merkgetrouwheid via drie pijlers — stijl (35%), AI-beoordeling (45%) en merkregels (20%) — met concrete bevindingen en een STRICT-modus die herschrijft tot de drempel gehaald is. Gratis op elke uiting, ook via de API.",
      category: "Merkbewaking",
      categoryIcon: "BadgeCheck",
      pricingModel: "Altijd gratis",
      pricingDetails: "De merk-check kost nooit credits — bewaken hoort geen meter te hebben.",
      source: "MANUAL",
      status: "ANALYZED",
      features: [
        "Drie-pijler-score met per-pijler-uitsplitsing",
        "Concrete bevindingen per uiting (wat wél/niet on-brand is)",
        "Drempels per content-type, STRICT-rewrite-modus",
        "Werkt op eigen én externe content (score_against_brand)",
      ],
      benefits: [
        "'Is dit on-brand?' is een score, geen discussie",
        "Rapporteerbaar bewijs per kanaal en per week",
      ],
      useCases: [
        "Externe copy toetsen vóór publicatie",
        "Wekelijkse F-VAL-trend in het merkrapport",
        "Agent-output automatisch langs de merkdrempel leggen",
      ],
      workspaceId: "",
    },
  ];
  for (const prod of products) {
    await prisma.product.create({ data: { ...prod, workspaceId: workspace.id } });
  }
  console.log("3 producten gevuld");

  // ── 6. Concurrenten ───────────────────────────────────────────────────
  const competitors: Prisma.CompetitorUncheckedCreateInput[] = [
    {
      name: "Jasper",
      slug: "jasper",
      websiteUrl: "https://www.jasper.ai",
      description:
        "Amerikaans AI-content-platform voor marketingteams, gegroeid van AI-schrijftool naar 'AI voor marketing' met campagne-features en een brand-voice-functie.",
      tagline: "AI built for marketing",
      foundingYear: 2021,
      headquarters: "Austin, VS",
      employeeRange: "100-250",
      valueProposition: "Snel veel marketingcontent produceren met AI, getraind op je merkstem.",
      targetAudience: "Marketingteams in het mid-market en enterprise, primair VS/EN-talig.",
      differentiators: ["Groot feature-aanbod voor contentproductie", "Sterke merkbekendheid in AI-marketing", "Brand-voice-training"],
      mainOfferings: ["AI-copywriting", "Campagne-content", "Brand voice", "Chrome-extensie"],
      pricingModel: "Abonnement per gebruiker",
      pricingDetails: "Vanaf ~$39-59/gebruiker/mnd, enterprise op aanvraag",
      toneOfVoice: "Energiek, Amerikaans, groei-gericht",
      messagingThemes: ["Sneller content maken", "AI-copiloot voor marketing", "On-brand AI"],
      visualStyleNotes: "Kleurrijk, speels, Amerikaanse SaaS-stijl",
      strengths: [
        "Volwassen product met brede content-features",
        "Sterke distributie en merkbekendheid",
        "Brand-voice als bekend concept gevestigd",
      ],
      weaknesses: [
        "Brand voice is een instelling, geen meetbaar bewijs — geen F-VAL-equivalent",
        "EN/VS-first; beperkte NL-taligheid en geen NL-marktfocus",
        "Geen open agent-koppeling (MCP) — het platform is de grens",
      ],
      socialLinks: { linkedin: "https://www.linkedin.com/company/heyjasperai" },
      hasBlog: true,
      hasCareersPage: true,
      competitiveScore: 72,
      tier: "DIRECT",
      status: "ANALYZED",
      source: "WEBSITE_URL",
      lastScrapedAt: new Date(),
      createdById: USER_ID,
      workspaceId: "",
    },
    {
      name: "Frontify",
      slug: "frontify",
      websiteUrl: "https://www.frontify.com",
      description:
        "Zwitsers brand-management-platform: digitale brand guidelines, asset-bibliotheek en samenwerking voor grote merkorganisaties.",
      tagline: "A home for every brand",
      foundingYear: 2013,
      headquarters: "St. Gallen, Zwitserland",
      employeeRange: "250-500",
      valueProposition: "Eén thuis voor merkrichtlijnen en assets, zodat grote organisaties consistent blijven.",
      targetAudience: "Enterprise brand- en designteams.",
      differentiators: ["Marktleider in digitale brand guidelines", "Sterk in DAM en governance-workflows", "Enterprise-integraties"],
      mainOfferings: ["Brand guidelines", "Digital Asset Management", "Templates", "Samenwerking"],
      pricingModel: "Enterprise-abonnement",
      pricingDetails: "Op aanvraag; instap doorgaans vanaf duizenden euro's per jaar",
      toneOfVoice: "Professioneel, design-gedreven, enterprise",
      messagingThemes: ["Brand consistency", "Eén merkbron", "Samenwerking"],
      visualStyleNotes: "Strak, design-first, veel wit",
      strengths: [
        "Gevestigde enterprise-klantenbasis en governance-diepgang",
        "Merkrichtlijnen als product volwassen neergezet",
      ],
      weaknesses: [
        "Richtlijnen beschrijven het merk maar genereren en toetsen niet — geen AI-generatie of merkscore per uiting",
        "Enterprise-prijspunt; onbereikbaar voor MKB",
        "Statisch: het merk leeft in documentatie, niet in de workflow van de maker",
      ],
      socialLinks: { linkedin: "https://www.linkedin.com/company/frontify" },
      hasBlog: true,
      hasCareersPage: true,
      competitiveScore: 58,
      tier: "INDIRECT",
      status: "ANALYZED",
      source: "WEBSITE_URL",
      lastScrapedAt: new Date(),
      createdById: USER_ID,
      workspaceId: "",
    },
    {
      name: "Postiz",
      slug: "postiz",
      websiteUrl: "https://postiz.com",
      description:
        "Open-source social-media-scheduler die zich in 2026 herpositioneerde als agentic tool: agents plannen en publiceren via CLI en MCP naar 30+ kanalen. Groeide daarmee naar ~$173K MRR (Stripe-geverifieerd).",
      tagline: "The ultimate agentic social media scheduling tool",
      foundingYear: 2023,
      headquarters: "Remote / Israël",
      employeeRange: "1-10",
      valueProposition: "Laat je AI-agent je social media draaien: plannen, genereren en publiceren naar 30+ netwerken.",
      targetAudience: "Agentic-first makers, developers en automation-teams.",
      differentiators: ["Open-source distributie (32K+ GitHub-stars)", "Agent-first positionering met MCP/CLI", "30+ kanalen"],
      mainOfferings: ["Social scheduling", "Agent-CLI en MCP-server", "n8n/Make-integraties"],
      pricingModel: "Freemium + abonnement",
      pricingDetails: "Zelf-hosten gratis; cloud gemiddeld ~$34/mnd per abonnement",
      toneOfVoice: "Bouwers-taal, direct, build-in-public",
      messagingThemes: ["Agentic scheduling", "Open source", "Autopilot voor social"],
      visualStyleNotes: "Donker, developer-esthetiek, meme-vriendelijk",
      strengths: [
        "Bewezen agent-distributiestrategie (8x MRR in 4 maanden)",
        "Enorme open-source-funnel met $0 advertentiebudget",
        "Snelle featurevelocity",
      ],
      weaknesses: [
        "Publiceert zonder merkfundament: geen merk-DNA, geen merkscore, geen bewaking",
        "Social-only; geen strategie-, campagne- of contentdiepte",
        "'Autopilot'-framing zonder kwaliteitsvangrails — precies het gat dat Branddock vult",
      ],
      socialLinks: { github: "https://github.com/gitroomhq/postiz-app" },
      hasBlog: true,
      hasCareersPage: false,
      competitiveScore: 64,
      tier: "INDIRECT",
      status: "ANALYZED",
      source: "WEBSITE_URL",
      lastScrapedAt: new Date(),
      createdById: USER_ID,
      workspaceId: "",
    },
  ];
  for (const comp of competitors) {
    await prisma.competitor.create({ data: { ...comp, workspaceId: workspace.id } });
  }
  console.log("3 concurrenten gevuld (Jasper, Frontify, Postiz — ANALYZED)");

  // ── 7. Business-strategie + OKR's ─────────────────────────────────────
  const strategy = await prisma.businessStrategy.create({
    data: {
      name: "Launch 2026 — het bewijsbare AI-marketingteam",
      slug: "launch-2026-bewijsbaar-ai-marketingteam",
      description:
        "Van pre-launch naar betalende Nederlandse MKB-basis met één wig: een AI-marketingteam dat je merk écht kent — en dat kan bewijzen. Pilotbewijs eerst, daarna distributie via de agent-kanalen (MCP-connector, n8n, ClawHub) naast een wekelijkse content-cadans.",
      type: "BRAND_BUILDING",
      status: "ACTIVE",
      vision:
        "Elke uiting die namens een merk ontstaat — in Branddock of in een externe AI — is meetbaar on-brand en door een mens goedgekeurd.",
      rationale:
        "AI-adoptie in marketing explodeert, maar bewaking ontbreekt: tools maken content zonder merkfundament. Postiz bewees dat agent-distributie werkt (8x MRR in 4 maanden); Branddock combineert diezelfde distributie met het onbezette gat — bewijsbare merkgetrouwheid.",
      keyAssumptions: [
        "NL-MKB betaalt voor bewijs van merkconsistentie, niet voor nóg een schrijftool",
        "De agent-kanalen (Claude/ChatGPT/n8n) worden een primair werkoppervlak voor marketeers",
        "Een eerlijke bescheiden claim (+7 on-brand) overtuigt beter dan hype",
        "Wekelijkse publicatie-cadans per klant is de beste voorspeller van retentie",
      ],
      startDate: new Date("2026-06-01"),
      endDate: new Date("2026-12-31"),
      progressPercentage: 70,
      workspaceId: workspace.id,
      createdById: USER_ID,
    },
  });

  const focusAreas = [
    { name: "Pilotbewijs", description: "Betterbrands-pilot naar aantoonbare waarde", icon: "FlaskConical", color: "#07E5AB" },
    { name: "Agent-distributie", description: "MCP-connector, n8n, ClawHub, extensie", icon: "Plug", color: "#343CED" },
    { name: "Cadans & zichtbaarheid", description: "Wekelijkse content-cadans + changelog", icon: "CalendarClock", color: "#FF7F4D" },
  ];
  const faIds: Record<string, string> = {};
  for (const fa of focusAreas) {
    const created = await prisma.focusArea.create({ data: { ...fa, strategyId: strategy.id } });
    faIds[fa.name] = created.id;
  }

  const objectives: Array<{
    title: string; description: string; status: ObjectiveStatus; priority: Priority;
    metricType: MetricType; startValue: number; targetValue: number; currentValue: number;
    focusArea: string;
    keyResults: Array<{ description: string; status: KeyResultStatus; progressValue: string }>;
  }> = [
    {
      title: "Pilot bewijst de wig vóór de peildatum",
      description: "De pilot-workspace laat zien dat Branddock wekelijks on-brand output oplevert die ook echt gepubliceerd wordt.",
      status: "AT_RISK",
      priority: "HIGH",
      metricType: "NUMBER",
      startValue: 0,
      targetValue: 5,
      currentValue: 3,
      focusArea: "Pilotbewijs",
      keyResults: [
        { description: "Wekelijks ≥2 gegenereerde deliverables in de pilot-workspace", status: "COMPLETE", progressValue: "loopt" },
        { description: "≥1 publicatie per week vanuit de pilot (C2)", status: "BEHIND", progressValue: "0 — dé gap" },
        { description: "F-VAL-gemiddelde boven de merkdrempel", status: "ON_TRACK", progressValue: "~75+" },
      ],
    },
    {
      title: "Het merk werkt in elke AI-workflow",
      description: "De connector-lijn volledig live en vindbaar: MCP, n8n, extensie en publicaties in de agent-directories.",
      status: "ON_TRACK",
      priority: "HIGH",
      metricType: "PERCENTAGE",
      startValue: 0,
      targetValue: 100,
      currentValue: 80,
      focusArea: "Agent-distributie",
      keyResults: [
        { description: "MCP-connector live op branddock.app/mcp (OAuth + keys)", status: "COMPLETE", progressValue: "live" },
        { description: "n8n-package + ClawHub-publicatie", status: "ON_TRACK", progressValue: "publish-klaar" },
        { description: "Browser-extensie in Chrome Web Store", status: "BEHIND", progressValue: "wacht op privacy-pagina" },
      ],
    },
    {
      title: "Wekelijkse cadans maakt Branddock zichtbaar",
      description: "Branddock gebruikt zichzelf: wekelijkse LinkedIn-cadans vanuit de eigen workspace, gevoed door de publieke changelog.",
      status: "ON_TRACK",
      priority: "MEDIUM",
      metricType: "NUMBER",
      startValue: 0,
      targetValue: 12,
      currentValue: 0,
      focusArea: "Cadans & zichtbaarheid",
      keyResults: [
        { description: "12 opeenvolgende weken ≥1 LinkedIn-post via Branddock", status: "ON_TRACK", progressValue: "start 21-07" },
        { description: "Changelog/Nieuws wekelijks bijgewerkt + aankondigingsbalk ververst", status: "ON_TRACK", progressValue: "ingericht" },
      ],
    },
  ];
  for (let i = 0; i < objectives.length; i++) {
    const { keyResults, focusArea, ...objData } = objectives[i];
    const obj = await prisma.objective.create({
      data: { ...objData, sortOrder: i, focusAreaId: faIds[focusArea], strategyId: strategy.id },
    });
    for (let j = 0; j < keyResults.length; j++) {
      await prisma.keyResult.create({ data: { ...keyResults[j], sortOrder: j, objectiveId: obj.id } });
    }
  }
  console.log("strategie + 3 focusgebieden + 3 OKR's gevuld");

  console.log(`\n✅ Klaar. Workspace-id: ${workspace.id}`);
  console.log(`Volgende stap: npx tsx scripts/migrate-brand-dna/export.ts "${WS_NAME}" branddock-hq-bundle.json`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
