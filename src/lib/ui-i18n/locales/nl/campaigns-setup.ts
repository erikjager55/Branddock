// Dutch UI strings — `campaigns-setup` namespace.
// Render-edge catalog voor de Setup-stap van de campagnewizard: doelcategorieën,
// doeltypes en campagnetypes. Gekoppeld aan de stabiele id/key-velden van de
// registries (goal-types.ts, campaign-types.ts) — niet aan de labels.
const campaignsSetup = {
  // GOAL_CATEGORIES — gekoppeld aan category.key
  categories: {
    growth: 'Groei & bekendheid',
    engagement: 'Betrokkenheid & loyaliteit',
    culture: 'Merk & cultuur',
    conversion: 'Conversie & activatie',
  },
  // GOAL_CATEGORIES types — gekoppeld aan goal id; `${id}Desc` voor de omschrijving
  goals: {
    BRAND_AWARENESS: 'Merkbekendheid',
    BRAND_AWARENESSDesc:
      'Vergroot de zichtbaarheid en herkenning van je merk bij je doelgroep. Ideaal voor nieuwe merken die zich vestigen of bestaande merken die hun share of voice willen vergroten.',
    PRODUCT_LAUNCH: 'Productlancering',
    PRODUCT_LAUNCHDesc:
      'Plan en voer de introductie van een nieuw product of dienst uit. Beslaat de volledige lanceertijdlijn, van pre-launch teasers via het lanceermoment tot de post-launch fase.',
    MARKET_EXPANSION: 'Marktuitbreiding',
    MARKET_EXPANSIONDesc:
      'Betreed een nieuwe geografische markt, klantsegment of branche. Past je boodschap en kanaalstrategie aan om aan te sluiten bij een nieuwe doelgroep terwijl je lokale geloofwaardigheid opbouwt.',
    REBRANDING: 'Rebranding / merkvernieuwing',
    REBRANDINGDesc:
      'Herpositioneer of moderniseer je merkidentiteit. Begeleidt de gefaseerde uitrol van interne afstemming tot externe communicatie, met consistentie op alle touchpoints.',
    CONTENT_MARKETING: 'Contentmarketing',
    CONTENT_MARKETINGDesc:
      'Bouw een duurzame contentmotor die klanten aantrekt en behoudt. Richt zich op waardevolle, always-on content in Hero-, Hub- en Hygiene-formats voor organische groei.',
    AUDIENCE_ENGAGEMENT: 'Publieksbetrokkenheid',
    AUDIENCE_ENGAGEMENTDesc:
      'Verdiep de band tussen je merk en je publiek. Zet in op tweerichtingsinteractie via polls, UGC-campagnes, community-events en conversationele content.',
    COMMUNITY_BUILDING: 'Community-opbouw',
    COMMUNITY_BUILDINGDesc:
      'Creëer en verzorg een community rond de gedeelde waarden van je merk. Richt zich op langdurige connecties tussen leden en exclusieve content in plaats van korte-termijnstatistieken.',
    LOYALTY_RETENTION: 'Loyaliteit & retentie',
    LOYALTY_RETENTIONDesc:
      'Versterk de relatie met bestaande klanten om de lifetime value te verhogen. Ontwerpt persoonlijke communicatie, loyaliteitsprogramma’s en feedbackloops om churn te verlagen.',
    LINKEDIN_GROWTH: 'LinkedIn-groei',
    LINKEDIN_GROWTHDesc:
      'Vergroot je professionele aanwezigheid en autoriteit op LinkedIn. Combineert personal branding, bedrijfspaginastrategie, employee advocacy en LinkedIn-native formats (carrousels, polls, artikelen) om een betrokken B2B-publiek op te bouwen.',
    EMPLOYER_BRANDING: 'Employer branding',
    EMPLOYER_BRANDINGDesc:
      'Trek toptalent aan en versterk je reputatie als werkgever. Toont je bedrijfscultuur, verhalen van medewerkers en carrièrekansen via recruitmentkanalen.',
    INTERNAL_BRANDING: 'Interne branding',
    INTERNAL_BRANDINGDesc:
      'Breng je medewerkers op één lijn rond de purpose, waarden en cultuur van je merk. Gebruikt interne kanalen en ambassadeursprogramma’s om het merkverhaal persoonlijk relevant te maken.',
    THOUGHT_LEADERSHIP: 'Thought leadership',
    THOUGHT_LEADERSHIPDesc:
      'Positioneer je merk of sleutelfiguren als autoriteit in je branche. Creëert opiniestukken, onderzoeksrapporten en expertcommentaar waarbij diepgang boven frequentie gaat.',
    CSR_IMPACT: 'MVO & maatschappelijke impact',
    CSR_IMPACTDesc:
      'Communiceer je inspanningen rond duurzaamheid en maatschappelijk verantwoord ondernemen op een authentieke manier. Zet meetbare acties en resultaten voorop, in samenwerking met geloofwaardige organisaties.',
    LEAD_GENERATION: 'Leadgeneratie',
    LEAD_GENERATIONDesc:
      'Verzamel gekwalificeerde leads via gerichte content en conversiefunnels. Optimaliseert lead magnets, landingspagina’s en nurture-sequenties op cost-per-lead en kwaliteit.',
    SALES_ACTIVATION: 'Salesactivatie',
    SALES_ACTIVATIONDesc:
      'Genereer directe conversies en omzet via tijdelijke campagnes. Gebruikt direct-response boodschappen met duidelijke calls-to-action en meetbare ROAS.',
    EVENT_SEASONAL: 'Event / seizoensgebonden',
    EVENT_SEASONALDesc:
      'Maak campagnes rond specifieke events, feestdagen of seizoenen. Bouwt verwachting op via teaser-tot-opvolgfases met urgentie-gedreven boodschappen.',
  },
  // CAMPAIGN_TYPES — gekoppeld aan type id; `${id}Desc` omschrijving, `${id}Approach` creativeApproach
  campaignTypes: {
    brand: 'Merkcampagne',
    brandDesc: 'Bouw bekendheid, emotie en onderscheidend vermogen op met grote creatieve ideeën.',
    brandApproach: 'Emotie & bekendheid',
    content: 'Contentcampagne',
    contentDesc: 'Bouw autoriteit en vertrouwen op met waardevolle, expertgedreven content.',
    contentApproach: 'Expertise & waarde',
    activation: 'Activatiecampagne',
    activationDesc: 'Zet aan tot directe actie met gerichte conversiemechanismen.',
    activationApproach: 'Conversie & urgentie',
  },
} as const;

export default campaignsSetup;
