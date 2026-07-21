/**
 * Werkbestand-import: merkonderdelen Adullam (21 juli 2026).
 *
 * Bron: Adullam_werkbestand_merkonderdelen.md — ingevuld vanuit de
 * contextbibliotheek (strategisch contextdocument Arbeidsmarktmerk Adullam,
 * Sterk werkgeversmerk voor Adullam, campagne-uitwerking 14-15 juli 2026,
 * Schrijfwijzer Adullam v1.0, kernwaardencirkel).
 *
 * Bewust NIET geïmporteerd (stond als n.v.t. / te-valideren in het werkbestand):
 * - Mission & Vision: alle visie-velden (nog op te stellen met MT)
 * - Transformative Goals: volledig (geen MTP geformuleerd)
 * - Social Relevancy: environmental-pijler; het stellingen+scores-deel van het
 *   ESG-framework vergt invulling via de app
 * - Deel 3 Brandstyle: indicatieve kleuren/design niet getoetst aan het
 *   huisstijlhandboek — brandstyle via de analyse-flow op de website draaien
 *
 * Run (lokaal, vanuit de repo-root):
 *   npx tsx scripts/import-merkonderdelen/adullam.ts
 *
 * Idempotent — veilig om opnieuw te draaien.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Type-only import (erased at runtime); de echte modules worden in main()
// dynamisch geïmporteerd — esbuild/tsx hoist statische imports boven de
// dotenv.config-call, waardoor src/lib/prisma anders al crasht op een
// ontbrekende DATABASE_URL vóór .env.local geladen is.
import type { BrandImportPayload } from "../../src/lib/api/public/brand-import";

const WORKSPACE_NAME = "Adullam";
const ACTOR_EMAIL = "erik@betterbrands.nl";

const payload: BrandImportPayload = {
  // Werkbestand deel 0: workspace stond op 'en' → nl. Voiceguide krijgt nl-NL.
  contentLanguage: "nl",

  brandAssets: [
    {
      slug: "purpose-statement",
      frameworkData: {
        statement:
          "Vanuit naastenliefde ieder mens — geschapen naar Gods beeld en van onschatbare waarde — het gewone leven laten ervaren.",
        impactType: "Enable Potential",
        impactDescription:
          "Cliënten met een (ernstig meervoudige) beperking of moeilijk verstaanbaar gedrag ervaren het gewone leven, aangepast aan hun mogelijkheden en talenten. Medewerkers ontwikkelen hun gekregen talenten om er beter te kunnen zijn voor de naaste (rentmeesterschap).",
        mechanism:
          "Identiteitsgebonden zorg en begeleiding volgens het ASBM (Adullam Schutse Begeleidings Model): relatie gaat voor prestatie, onvoorwaardelijke ondersteuning, gedragen door een geloofsgemeenschap van medewerkers, kerken en vrijwilligers.",
        pressureTest:
          "Als deze purpose waar is: investeren in medewerkers is geen HR-beleid maar overtuiging (toerusting); moeilijk gedrag wordt niet bestraft maar begrepen als uiting van stress of onmacht; beslissingen worden getoetst aan het Bijbelse fundament en niet louter aan bedrijfsmatige logica.",
      },
    },
    {
      slug: "golden-circle",
      frameworkData: {
        why: {
          statement:
            "God liefhebben boven alles en onze naaste als onszelf. Elke cliënt is een uniek schepsel van onschatbare waarde en verdient onze onverdeelde aandacht en de allerbeste zorg.",
          details:
            "Naastenliefde is bij Adullam geen abstract begrip maar een actieve opdracht — de motor achter alles, zonder er pocherig over te doen.",
        },
        how: {
          statement:
            "Identiteitsgebonden zorg vanuit een professioneel-methodisch kader (ASBM) én een dragende geloofsgemeenschap: groot hart, sterke rug.",
          details:
            "De warme, familiale cultuur (het grote hart) wordt gecombineerd met methodische scherpte, professionele distantie en standvastigheid bij complexe zorgvragen (de sterke rug). Vakmanschap is niet het doel maar het instrument om naastenliefde professioneel en verantwoord in praktijk te brengen.",
        },
        what: {
          statement:
            "Landelijk zorg, wonen en dagbesteding bieden aan mensen met een verstandelijke of meervoudige beperking, vanuit de reformatorische identiteit.",
          details:
            "Specialisatie in complexe zorgvragen: EMB (ernstig meervoudig beperkten) en MVG (moeilijk verstaanbaar gedrag).",
        },
      },
    },
    {
      slug: "brand-essence",
      frameworkData: {
        essenceStatement: "Goed dat je er bent",
        emotionalBenefit:
          "Gezien en gewaardeerd worden als schepsel van God. Voor medewerkers: een veilige haven waar geloof en werk samenvallen — men heeft aan een half woord genoeg. Voor cliënten en families: geborgenheid en onvoorwaardelijke ondersteuning.",
        functionalBenefit:
          "Professionele, identiteitsgebonden zorg volgens een beproefde methodiek (ASBM); voor medewerkers: toerusting, scholing en heldere professionele kaders bij complex werk.",
        attributes: ["Gelovig / geworteld", "Verzorgend", "Gemeenschapsgericht", "Doelgericht", "Nuchter"],
        proofPoints: [
          "Eigen zorgmethodiek ASBM (verwant aan Triple-C): relatie gaat voor prestatie",
          "Specialisatie in EMB en MVG — complexe zorgvragen waar anderen afhaken",
          "Structurele toerusting en scholing van medewerkers",
          "Dragend netwerk van kerken, vrijwilligers en achterban",
          "Verhalenformat 'Richting geven aan ___' met echte medewerkers",
        ],
      },
    },
    {
      slug: "brand-promise",
      // Werkbestand-notitie: ingevuld vanuit het werkgeversmerk; corporate
      // belofte richting cliënten/families is in de bronnen minder expliciet.
      frameworkData: {
        promiseStatement:
          "Bij Adullam krijg je toerusting om je gekregen talenten in te zetten voor de naaste — richting geven aan wat telt.",
        functionalValue:
          "Scholing en toerusting, heldere methodische kaders (ASBM), vakmanschap in complexe zorg — een sterke rug.",
        emotionalValue:
          "Werk met eeuwigheidswaarde vanuit een diepe roeping; psychologische veiligheid van een gedeeld geloofsfundament — een groot hart.",
        targetAudience:
          "(Toekomstige) medewerkers uit de reformatorische kring: zorgprofessionals, zij-instromers (o.a. uit bouw, ICT, retail) en starters.",
        differentiator:
          "De onlosmakelijke combinatie van identiteit én vakmanschap. Concurrenten in de christelijke zorg claimen naastenliefde (category-generic); Adullam verbindt het Bijbelse fundament aan methodische scherpte en specialisatie in complexe zorgvragen.",
      },
    },
    {
      slug: "mission-statement",
      // Visie-velden (visionStatement, timeHorizon, desiredFutureState,
      // boldAspiration) staan in het werkbestand op n.v.t. — nog op te stellen.
      frameworkData: {
        missionStatement: "Cliënten 'het gewone leven' laten ervaren, aangepast aan hun mogelijkheden en talenten.",
        whatWeDo: "Zorg, wonen en dagbesteding (leren, wonen en werken).",
        forWhom:
          "Mensen met een verstandelijke of meervoudige beperking — in het bijzonder EMB en MVG — en hun families, primair binnen de reformatorische gezindte.",
        howWeDoIt:
          "Identiteitsgebonden, vanuit Gods Woord en de Drie Formulieren van Enigheid, met het ASBM als methodisch kompas: onvoorwaardelijke begeleidingsrelatie, betekenisvolle dagbesteding, relatie gaat voor prestatie.",
        impactGoal: "Het gewone leven, ook waar dat door complexe beperkingen niet vanzelfsprekend is.",
        successIndicators: [
          "Duurzaam werkgeversmerk dat breed toepasbaar is (geen eenmalige campagne)",
          "Ambassadeurschap van medewerkers vanaf 2027",
        ],
      },
    },
    {
      slug: "brand-archetype",
      // Voorstel-status in het werkbestand — nog formeel te valideren.
      frameworkData: {
        primaryArchetype: "Caregiver",
        subArchetype:
          "Sage (de methodische wijsheid van ASBM: rust en kaders brengen in de chaos van moeilijk verstaanbaar gedrag)",
        coreDesire: "De naaste beschermen, dienen en laten floreren — vanuit de opdracht van naastenliefde.",
        brandVoiceDescription:
          "Warm én eerbiedig ('warm yet reverent'): pastorale zorg gecombineerd met praktische, professionele toerusting. Nuchter, gedragen, dienend — nooit speels, hip of overdreven energiek.",
        archetypeInAction:
          "ASBM als begeleidingsfilosofie (relatie voor prestatie); welkomstpakket met kaart 'Goed dat je er bent'; onboarding als 100-dagenreis; waarderingsritme voor medewerkers; de medewerker als rustbrenger en 'filter' in de prikkelchaos van de cliënt.",
      },
    },
    {
      slug: "brand-personality",
      frameworkData: {
        primaryDimension: "Sincerity",
        secondaryDimension: "Competence",
        personalityTraits: [
          {
            name: "Gelovig / geworteld",
            description: "",
            weAreThis: "",
            butNeverThat: "Vrijblijvend met theologische principes",
          },
          { name: "Verzorgend", description: "", weAreThis: "", butNeverThat: "Institutioneel of kil" },
          {
            name: "Gemeenschapsgericht",
            description: "",
            weAreThis: "",
            butNeverThat: "Los van de geloofsgemeenschap",
          },
          { name: "Doelgericht", description: "", weAreThis: "", butNeverThat: "Doelloos of louter custodial" },
          { name: "Nuchter en betrouwbaar", description: "", weAreThis: "", butNeverThat: "" },
        ],
      },
      // Tone-of-voice en personality-in-practice uit het werkbestand staan in
      // de Brand Voiceguide (voiceDescription, writingGuidelines, channelTones,
      // contentGuidelines) — BrandPersonalityFrameworkData kent die keys niet.
    },
    {
      slug: "brand-story",
      frameworkData: {
        elevatorPitch:
          "Bij Adullam werken we vanuit een diepe overtuiging: dat elke cliënt een mens van onschatbare waarde is, die de allerbeste zorg verdient. Dat klinkt misschien vanzelfsprekend, maar het bepaalt alles. Hoe we werken, hoe we naar elkaar kijken, en wat we verwachten van onszelf. Want hoe meer jij groeit als mens en professional, hoe meer jouw cliënt daarvan profiteert. Daarom investeren we in jou. In je vakmanschap, je persoonlijke groei en je welzijn. Niet als HR-beleid, maar als overtuiging. Zodat jij je talenten maximaal in kunt zetten voor de ander.",
        customerExternalProblem:
          "Zorgprofessionals raken uitgeput in een sector met stijgende agressie (57% ervaart agressie) en hoog verzuim (7-8%). Zij-instromers ontvluchten de kille, targetgestuurde commerciële wereld op zoek naar existentiële betekenis. Reformatorische professionals missen in een seculariserende maatschappij een werkomgeving waar hun geloofsovertuiging vanzelfsprekend is.",
        theChallenge:
          "Zorgprofessionals raken uitgeput in een sector met stijgende agressie (57% ervaart agressie) en hoog verzuim (7-8%). Zij-instromers ontvluchten de kille, targetgestuurde commerciële wereld op zoek naar existentiële betekenis. Reformatorische professionals missen in een seculariserende maatschappij een werkomgeving waar hun geloofsovertuiging vanzelfsprekend is.",
        theSolution:
          "Een werkgemeenschap met een gedeeld Bijbels fundament (psychologische veiligheid, 'aan een half woord genoeg'), het ASBM als professioneel kader tegen handelingsverlegenheid, en structurele toerusting om gekregen talenten te ontwikkelen.",
        transformationPromise:
          "Medewerkers die richting ervaren in hun vak, hun loopbaan en hun leven — en cliënten die daardoor het gewone leven ervaren.",
        theOutcome:
          "Medewerkers die richting ervaren in hun vak, hun loopbaan en hun leven — en cliënten die daardoor het gewone leven ervaren.",
        // [controleren] in het werkbestand: formulering checken tegen de
        // officiële organisatiegeschiedenis.
        originStory:
          "De naam Adullam verwijst naar de Bijbelse schuilplaats (de spelonk van Adullam, 1 Samuël 22) — een plek van toevlucht en bescherming. Die betekenis klinkt door in het Adullam Schutse Begeleidings Model.",
      },
    },
    {
      slug: "core-values",
      // BrandHouse-indeling (anker/aspiratie/eigen) is een voorstel-mapping van
      // de officiële kernwaardencirkel — de cirkel zelf staat in `content`.
      content:
        "Officiële kernwaardencirkel Adullam — hart van de cirkel: \"De Bijbel leert God lief te hebben boven alles en onze naaste als onszelf.\" De vijf waarden daaromheen: (1) Afhankelijkheid — we zijn in alles afhankelijk van God; we leven in eeuwigheidsperspectief en hebben geborgenheid in Christus nodig. (2) Veiligheid — we werken in een reformatorische omgeving waarin we menswaardigheid en veiligheid bieden. (3) Verbinding — we hebben andere mensen nodig om te groeien, om mens te zijn; we bieden onvoorwaardelijke ondersteuning door te zorgen voor respect, aandacht en vertrouwen; we zijn er voor elkaar: altijd en overal. (4) Verantwoordelijkheid — we dragen verantwoordelijkheid en zijn bereid verantwoording af te leggen; we hebben binnen eigen draagkracht genoeg ruimte om keuzes te maken. (5) Dienstbaarheid — we ontwikkelen onze gekregen talenten en zijn daarmee van betekenis; we zijn het elkaar verschuldigd perspectief te bieden. Gebruiksregel: verwijs in teksten naar deze kernwaarden, maar benoem ze niet steeds expliciet — de beleving moet voelbaar zijn (show, don't tell).",
      frameworkData: {
        anchorValue1: {
          name: "Verbinding",
          description:
            "Vandaag al waargemaakt in de onvoorwaardelijke ondersteuning (respect, aandacht, vertrouwen) en de dragende gemeenschap — 'we zijn er voor elkaar: altijd en overal'.",
        },
        anchorValue2: {
          name: "Veiligheid",
          description:
            "De reformatorische omgeving waarin menswaardigheid en veiligheid geboden worden — voor cliënten én medewerkers ('aan een half woord genoeg').",
        },
        aspirationValue1: {
          name: "Dienstbaarheid",
          description:
            "De beweging van het werkgeversmerk — gekregen talenten ontwikkelen en daarmee van betekenis zijn; elkaar perspectief bieden.",
        },
        aspirationValue2: {
          name: "Verantwoordelijkheid",
          description:
            "Verantwoordelijkheid dragen én verantwoording afleggen; professionele ruimte binnen eigen draagkracht (de 'sterke rug').",
        },
        ownValue: {
          name: "Afhankelijkheid",
          description:
            "Het meest onderscheidende — in alles afhankelijk van God, leven in eeuwigheidsperspectief, geborgenheid in Christus. Geen enkele seculiere werkgever kan dit bieden.",
        },
        valueTension:
          "Groot hart ↔ sterke rug: verbinding en veiligheid zonder verantwoordelijkheid en dienstbaarheid worden soft; professionele scherpte zonder verbinding wordt kil. Afhankelijkheid houdt beide geworteld: vakmanschap is instrument van naastenliefde, nooit doel op zich.",
      },
    },
    {
      slug: "social-relevancy",
      // Environmental staat op n.v.t.; het stellingen+scores-deel van het
      // framework vergt invulling via de app. impactStatement is het veld dat
      // de UI (SocialRelevancySection) en de AI-context daadwerkelijk lezen.
      // Governance heeft geen pijler in dit framework → asset-content.
      content:
        "Governance: identiteitsgebonden governance op grondslag van de Bijbel en de Drie Formulieren van Enigheid. (Verder aanvullen vanuit jaarverslag/governancecode.)",
      frameworkData: {
        impactStatement:
          "Zorg, wonen en dagbesteding voor een kwetsbare doelgroep (EMB/MVG); werkgelegenheid met structurele toerusting; hechte verbinding met kerken, vrijwilligers en de achterban; het mogelijk maken van 'het gewone leven' voor mensen voor wie dat niet vanzelfsprekend is.",
      },
    },
  ],

  voiceguide: {
    voiceDescription:
      "De stem van Adullam is warm én eerbiedig: pastorale zorg gecombineerd met praktische toerusting. Nuchter, ingetogen, gedragen, oprecht, betrouwbaar en vakkundig. Adullam spreekt met de rust van Bijbelse overtuiging en blijft daarbij toegankelijk en compassievol. In elke tekst klinken het grote hart (zorgzaamheid, gemeenschap) en de sterke rug (vakmanschap, methodische scherpte) samen. Vuistregel: schrijf zoals je praat tegen iemand die je vertrouwt — rustig, gemeend, zonder overdrijving of verkooptaal.",
    // Werkbestand gaf 0-100 (25/10/5/30); geconverteerd naar de NN/g 1-7-schaal.
    // formalCasual wijkt bewust af van de template-afrondingsformule (die 3 zou
    // geven): 25 ligt exact tussen 2 en 3 in, en de Schrijfwijzer ("formeel,
    // serieus, ingetogen") rechtvaardigt afronden richting het formele uiteinde.
    toneDimensions: {
      formalCasual: 2,
      seriousFunny: 2,
      respectfulIrreverent: 1,
      matterOfFactEnthusiastic: 3,
    },
    wordsWeUse: [
      "toerusting",
      "rentmeesterschap",
      "naastenliefde",
      "gemeenschap",
      "veilig",
      "talenten",
      "vakmanschap",
      "roeping",
      "gunnen",
    ],
    wordsWeAvoid: [
      "klant / consument (voor cliënten)",
      "empowerment",
      "zelfontplooiing",
      "inclusief (in brede, seculiere zin)",
      "diversiteit (als los containerbegrip)",
      "progressief",
      "seculier",
    ],
    vocabularyDo: [
      "identiteitsgebonden zorg",
      "Gods Woord / Bijbels fundament",
      "leren, wonen en werken",
      "het gewone leven (ervaren)",
      "gekregen talenten ontwikkelen",
      "onvoorwaardelijke ondersteuning / begeleidingsrelatie",
      "zorg en begeleiding",
      "Richting geven aan … (variabel invulbaar)",
      "Goed dat je er bent (corporate baseline)",
    ],
    vocabularyDont: [
      "de beste versie van jezelf (worden)",
      "zelfstandig wonen (zonder begeleiding)",
      "training / persoonlijke ontwikkeling (als kaal HR-begrip — gebruik 'toerusting')",
      "dienstverlening (onpersoonlijk, voor de zorgrelatie)",
    ],
    antiPatterns: [
      "\"Hoe rijk wil je worden?\" (afgewezen concept — associatie materialisme)",
      "\"Naastenliefde in de praktijk\" als centrale claim (afgewezen — te zacht, category-generic)",
      "\"Richting geven aan verlangen\" (expliciet afgewezen)",
      "\"Grote Opdrachtgever\" / \"Heilig werk\" (te zwaar, stichtelijk, pretentieus)",
      "Hypewoorden, uitroeptekens, jeugdig jargon",
      "Bonus/beloning als communicatieboodschap (frame is gunnen, niet verdienen)",
    ],
    examplePhrases: [
      { text: "Bij Adullam krijg je toerusting om je gekregen talenten te ontwikkelen — voor de ander.", type: "do" },
      { text: "Waar geef jij richting aan — in je vak, je loopbaan, je leven?", type: "do" },
      { text: "Wij zijn een gedreven en nuchtere zorgorganisatie, met een groot hart en een sterke rug.", type: "do" },
      {
        text: "Onze cliënten zijn mensen die, met onvoorwaardelijke ondersteuning, het gewone leven ervaren.",
        type: "do",
      },
      { text: "Adullam. Goed dat je er bent.", type: "do" },
      { text: "Bij Adullam kun je de beste versie van jezelf worden.", type: "dont" },
      { text: "Hoe rijk wil jij worden?", type: "dont" },
      { text: "Wij zijn een energieke, speelse en moderne zorgorganisatie.", type: "dont" },
      { text: "Onze cliënten zijn klanten die zelfstandig kunnen wonen.", type: "dont" },
      { text: "Adullam. Naastenliefde in de praktijk.", type: "dont" },
    ],
    voiceSample:
      "Bij Adullam geloven we dat ieder mens geschapen is naar Gods beeld en daarom van onschatbare waarde is. Of je nu een beperking hebt of niet, voor God zijn we allemaal gelijk. Daarom bieden we zorg en begeleiding die uitgaat van Gods Woord en de Drie Formulieren van Enigheid. In onze woonlocaties, werkplaatsen en leerprogramma's ervaar je een gewoon leven, aangepast aan jouw mogelijkheden en talenten. Goed dat je er bent.",
    writingSamples: [
      "Bij Adullam werken we vanuit een diepe overtuiging: dat elke cliënt een mens van onschatbare waarde is, die de allerbeste zorg verdient. Dat klinkt misschien vanzelfsprekend, maar het bepaalt alles. Hoe we werken, hoe we naar elkaar kijken, en wat we verwachten van onszelf. Want hoe meer jij groeit als mens en professional, hoe meer jouw cliënt daarvan profiteert. Jouw ontwikkeling ís naastenliefde in de praktijk. Daarom investeren we in jou. In je vakmanschap, je persoonlijke groei en je welzijn. Niet als HR-beleid, maar als overtuiging. Zodat jij je talenten maximaal in kunt zetten voor de ander.",
    ],
    contentGuidelines: [
      "Kernparadox in balans: elke tekst laat zowel het grote hart (zorgzaamheid) als de sterke rug (vakmanschap) zien — alleen hart wordt te zacht, alleen rug wordt kil.",
      "Medewerkersverhalen volgen het vaste format: kop 'Richting geven aan ___', drieluik vak (ASBM-casus) / loopbaan (toerusting, rentmeesterschap) / leven (het gewone leven). Lang: 600-800 woorden + fotoreportage + video 90-120 sec. Kort: één richtingmoment, 15-30 sec.",
      "Groei altijd koppelen aan de ander (rentmeesterschap), nooit aan zelfontplooiing.",
      "Kernwaarden beleven, niet benoemen: de vijf kernwaarden (afhankelijkheid, veiligheid, verbinding, verantwoordelijkheid, dienstbaarheid) klinken door in de beleving van de tekst, maar worden niet steeds expliciet genoemd of opgesomd — dan ligt het er te dik bovenop. Show, don't tell.",
      "De Bijbelse identiteit is invoelbaar aanwezig, maar nooit pretentieus of 'te zwaar'.",
      "Referral en waardering framen als gunnen, niet als verdienen.",
      "AVG bij verhalen: expliciete toestemming met gebruikstermijn, vertrekscenario vastgelegd, inzage vóór publicatie, cliënten alleen herkenbaar met toestemming van de wettelijk vertegenwoordiger.",
      "Crisiscommunicatie: rustig, transparant, gegrond in geloof (Gods soevereiniteit), met concrete verantwoordelijke actie.",
      "Zorgcontact: compassievol en geduldig, met oog voor identiteitsgebonden zorgprincipes.",
      "Interne communicatie: pastoraal en persoonlijk.",
    ],
    writingGuidelines: [
      "Geen uitroeptekens, hypewoorden of jeugdig jargon.",
      "Rustige, gemeende zinnen zonder overdrijving of verkooptaal; geen superlatieven.",
      "Vermijd zware, stichtelijke marketingtaal — respectvol en nuchter.",
      "Toon is nooit 'bold', 'playful', 'innovative', 'modern' of 'energetic' — die generieke marketingdimensies passen niet bij Adullam.",
      "Controleer elke tekst vóór publicatie met de 10-punts controlelijst uit de Schrijfwijzer Adullam v1.0.",
    ],
    channelTones: {
      website: {
        description:
          "Informatief en geruststellend; praktische informatie in balans met een heldere, ingetogen Bijbelse identiteit.",
      },
      socialMedia: {
        description:
          "Gemeenschapsgericht en dankbaar; verhalen uit het gewone leven, waardering voor collega's, vrijwilligers en donateurs — nooit hip of speels om zichzelf.",
      },
      email: {
        description:
          "Persoonlijk en pastoraal; families en betrokkenen aanspreken als leden van dezelfde geloofsgemeenschap.",
      },
      ads: {
        description:
          "Werving/vacatures: nuchter, concreet vakmanschap voorop; 'Richting geven aan …' als terugkerende kapstok, per doelgroep ingevuld.",
      },
      video: {
        description:
          "Het verhalenformat: lang 90-120 sec, kort richtingmoment 15-30 sec — echte medewerkers, geen acteurs of stockgevoel.",
      },
    },
    contentLocale: "nl-NL",
  },

  personas: [
    {
      name: "De zij-instromer",
      tagline: "Ik wil werk dat er echt toe doet — voor langer dan dit leven.",
      age: "30-50",
      gender: "m/v",
      location: "Biblebelt / omgeving Adullam-locaties",
      occupation: "Nu werkzaam in bouw, ICT of retail; oriënteert zich op de zorg",
      quote: "In mijn huidige werk draait alles om targets. Ik wil iets doen wat betekenis heeft.",
      coreValues: ["Geloof en kerkelijke betrokkenheid", "Dienstbaarheid aan de naaste", "Betrouwbaarheid en nuchterheid"],
      goals: [
        "Werk met existentiële betekenis (eeuwigheidswaarde)",
        "Een carrièreswitch die verantwoord is voor het gezin",
      ],
      frustrations: [
        "De kille, targetgestuurde commerciële wereld",
        "Onzekerheid: kan ik dit wel — zorg zonder zorgachtergrond?",
      ],
      preferredChannels: [
        "Reformatorische titels (advertorials)",
        "Kerkelijke netwerken",
        "Banenmarkten",
        "Referral via bekenden",
      ],
      strategicImplications:
        "Benadruk toerusting en het ASBM-kader: je hoeft het niet alleen te kunnen, je wordt toegerust. Route loopt altijd via een kennismakingsgesprek (belangstelling ≠ geschiktheid).",
    },
    {
      name: "De zorgprofessional-switcher",
      tagline: "Ik ben het vak niet moe — wel de omstandigheden.",
      age: "25-45",
      gender: "m/v",
      location: "Biblebelt / omgeving Adullam-locaties",
      occupation: "Begeleider/verpleegkundige/teamleider bij een (seculiere) zorgorganisatie",
      education: "MBO/HBO zorg & welzijn",
      quote: "Ik wil uitgedaagd worden op mijn vakmanschap, niet weggezet worden als oppas.",
      coreValues: ["Vakmanschap en professionele groei", "Geloofsidentiteit ook op het werk kunnen leven"],
      goals: [
        "Werken met heldere methodische kaders bij complexe zorgvragen",
        "Een team dat als gemeenschap draagt",
      ],
      frustrations: [
        "Agressie zonder professionele kaders (57% van zorgmedewerkers ervaart agressie)",
        "Hoog verzuim en uitputting in de sector (7-8%)",
        "Geloofsovertuiging steeds moeten uitleggen in een seculiere werkomgeving",
      ],
      preferredChannels: ["LinkedIn", "Vakinhoudelijke content", "Verhalen van collega's (referral)"],
      strategicImplications:
        "Leid met de sterke rug: ASBM, specialisatie EMB/MVG, toerusting. De identiteitslaag ('aan een half woord genoeg') is de doorslaggevende emotionele bonus.",
    },
    {
      name: "De starter",
      tagline: "Mijn eerste baan moet passen bij wie ik ben.",
      age: "17-25",
      gender: "m/v",
      location: "Biblebelt; reformatorisch onderwijs (VO/MBO/HBO)",
      occupation: "Student of net afgestudeerd (zorg & welzijn)",
      coreValues: ["Geloof", "Gemeenschap", "Veiligheid"],
      goals: ["Een goede start met begeleiding en ontwikkelruimte"],
      frustrations: ["Angst om in het diepe gegooid te worden bij complexe zorg"],
      preferredChannels: ["Instagram (stories-format)", "Banenmarkten en events", "Reformatorisch onderwijs"],
      strategicImplications:
        "Onboarding als 100-dagenreis en het welkomstpakket ('Goed dat je er bent') waarmaken wat de campagne belooft; korte verhalen (richtingmomenten, 15-30 sec) passen bij dit kanaalgebruik.",
    },
  ],

  products: [
    {
      name: "Wonen & zorg",
      category: "Gehandicaptenzorg — woonlocaties",
      description:
        "Woonlocaties waar cliënten met een verstandelijke of meervoudige beperking het gewone leven ervaren, met zorg en begeleiding volgens het ASBM en vanuit de reformatorische identiteit. Specialisatie in complexe zorgvragen (EMB, MVG).",
      features: [
        "Onvoorwaardelijke begeleidingsrelatie (relatie gaat voor prestatie)",
        "Huiselijke, veilige omgeving binnen de geloofsgemeenschap",
      ],
    },
    {
      name: "Dagbesteding (leren en werken)",
      category: "Gehandicaptenzorg — dagbesteding",
      description:
        "Betekenisvolle dagbesteding in werkplaatsen en leerprogramma's, aangepast aan de mogelijkheden en talenten van de cliënt — leren, wonen en werken als samenhangend geheel.",
      features: [
        "Betekenisvolle activiteiten die gekregen talenten ontwikkelen",
        "Onderdeel van de ASBM-driehoek: begeleidingsrelatie, dagbesteding, het gewone leven",
      ],
    },
  ],

  competitors: [
    {
      name: "Sirjon",
      tier: "DIRECT",
      description:
        "Christelijke/identiteitsgebonden gehandicaptenzorg met vergelijkbare doelgroep en achterban. Strategische notitie: Adullams onderscheid ten opzichte van identiteitsgenoten is de koppeling van identiteit aan methodisch vakmanschap (ASBM) en specialisatie in complexe zorgvragen (EMB/MVG).",
      toneOfVoice:
        "Gebruikt vergelijkbare naastenliefde-claims — reden waarom 'Naastenliefde in de praktijk' voor Adullam onvoldoende onderscheidend was (category-generic in de christelijke zorg).",
    },
  ],

  trends: [
    {
      title: "Secularisering en de behoefte aan psychologische veiligheid",
      description:
        "In een seculariserende maatschappij ervaren reformatorische professionals een groeiende behoefte aan een werkomgeving waar zij hun normen, waarden en geloofsovertuiging niet hoeven uit te leggen (Self-Determination Theory: relatedness — 'aan een half woord genoeg').",
      category: "CONSUMER_BEHAVIOR",
      impact: "HIGH",
      timeframe: "LONG_TERM",
      direction: "rising",
      keyInsights:
        "Adullams identiteit is geen beperking maar een uniek EVP-bestanddeel: een veilige haven die seculiere werkgevers niet kunnen bieden.",
    },
    {
      title: "Agressie, verzuim en uitputting in de zorgsector",
      description:
        "Hoge verzuimcijfers (7-8%) en stijgende agressie in de zorg (57% van de medewerkers ervaart agressie) zorgen voor uitstroom en handelingsverlegenheid bij zorgprofessionals.",
      category: "MARKET_DYNAMICS",
      impact: "HIGH",
      timeframe: "MEDIUM_TERM",
      direction: "rising",
      keyInsights:
        "Het ASBM-kader (sterke rug) en het dragende team (groot hart) zijn het directe antwoord op deze sectorpijn — centraal in de wervingscommunicatie zetten.",
    },
    {
      title: "Zij-instroom en de zoektocht naar betekenis",
      description:
        "Professionals uit commerciële sectoren (bouw, ICT, retail) ontvluchten de targetgestuurde wereld op zoek naar existentiële betekenis in hun werk.",
      category: "CONSUMER_BEHAVIOR",
      impact: "HIGH",
      timeframe: "MEDIUM_TERM",
      direction: "rising",
      keyInsights:
        "'Werk met eeuwigheidswaarde' en het frame van roeping en rentmeesterschap sluiten direct aan op deze motivatie; toerusting neemt de drempel ('kan ik dit wel?') weg.",
    },
  ],

  knowledgeResources: [
    {
      title: "Strategisch contextdocument: Arbeidsmarktmerk Adullam (2026)",
      type: "document",
      description:
        "Het definitieve strategische fundament: organisatieprofiel, kernparadox 'groot hart, sterke rug', ASBM, EVP-analyse, campagnehistorie (afgewezen concepten) en het merkconcept 'Richting'. Vindplaats: projectdoc 'Achtergrondinformatie' (Claude-project Adullam).",
    },
    {
      title: "Sterk werkgeversmerk voor Adullam",
      type: "document",
      description:
        "Onderbouwing van de 'why' (naastenliefde als Bijbels fundament), de werkgeverspitch en de conceptontwikkeling. Let op: het campagneconcept 'Naastenliefde in praktijk' uit dit document is inmiddels afgewezen. Vindplaats: 'Sterk werkgeversmerk voor Adullam.pdf' (Claude-project Adullam).",
    },
    {
      title: "Campagne-uitwerking 'Volg je hart, geef richting aan wat telt' (14-15 juli 2026)",
      type: "document",
      description:
        "Actuele campagnestructuur: zes werkstromen, verhalenformat, besluiten en planning (interne lancering september, externe lancering oktober 2026). Vindplaats: projectdoc 'claude/campagne-uitwerking-vervolgsessie-15juli.md'.",
    },
    {
      title: "Schrijfwijzer Adullam v1.0 (juli 2026)",
      type: "document",
      description:
        "De volledige tone of voice, terminologie (gebruiken/vermijden), het verhalenformat, kanaaltonen en de 10-punts controlelijst. Vindplaats: 'Adullam_Schrijfwijzer.docx' / projectdoc 'claude/schrijfwijzer-adullam-v1.md'.",
    },
    {
      title: "Kernwaardencirkel Adullam",
      type: "document",
      description:
        "De officiële vijf kernwaarden (afhankelijkheid, veiligheid, verbinding, verantwoordelijkheid, dienstbaarheid) rond het Bijbelse hart: God liefhebben boven alles en onze naaste als onszelf. Inclusief gebruiksregel 'kernwaarden beleven, niet benoemen'. Origineel beeldbestand nog toevoegen via de app-upload.",
    },
  ],
};

async function main() {
  const { prisma } = await import("../../src/lib/prisma");
  const { importBrandData } = await import("../../src/lib/api/public/brand-import");

  try {
    const workspace = await prisma.workspace.findFirst({
      where: { name: { equals: WORKSPACE_NAME, mode: "insensitive" } },
    });
    if (!workspace) {
      console.error(`Workspace '${WORKSPACE_NAME}' niet gevonden — controleer de naam in Branddock.`);
      process.exit(1);
    }
    const actor = await prisma.user.findFirst({ where: { email: ACTOR_EMAIL } });

    console.log(`[import] workspace=${workspace.id} (${workspace.name}) actor=${actor?.email ?? "org-owner fallback"}`);
    const report = await importBrandData(workspace.id, payload, { userId: actor?.id });

    console.log(`\n[import] klaar: ${report.created} aangemaakt, ${report.updated} bijgewerkt, ${report.skipped} overgeslagen`);
    for (const item of report.items) {
      console.log(`  - [${item.section}] ${item.name}: ${item.action}${item.reason ? ` (${item.reason})` : ""}`);
    }
    console.log(
      "\nLet op: brandstyle is bewust niet geïmporteerd — draai de brandstyle-analyse op www.adullamzorg.nl via de app (Brandstyle → analyseer website).",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
