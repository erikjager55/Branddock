// Data voor de platform-overzichtspagina: de 4 stepper-stappen (GROUPS) en de
// detailinhoud per module (MODULE_DETAILS), getoond in een lightbox i.p.v. een
// losse pagina (besluit Erik: de 7 detailpagina's onder /marketing/features/[slug]
// zijn hierin opgegaan). Elke tegel met eigen inhoud opent een lightbox — ook
// Merk-check (F-VAL), met een link naar de volledige uitleg als extra optie
// (besluit Erik: consistent, geen tegel die naar een hele pagina doorlinkt).
// Merk-DNA heeft nu zijn eigen entry (was eerst gedeeld met Brand voice &
// stijl, wat het verkeerde label toonde — besluit Erik). Alle teksten hier
// zijn bewust in gewone taal geschreven: geen interne product-termen zoals
// "voiceguide", "W-1-embedding" of "compliance-dimensie" — die vertellen een
// bezoeker niet wat hij ervoor terugkrijgt (besluit Erik).

import {
  Dna,
  Palette,
  Users,
  Swords,
  Radar,
  PenLine,
  Megaphone,
  Images,
  LayoutTemplate,
  Bot,
  BadgeCheck,
  Languages,
} from 'lucide-react';

export interface Module {
  Icon: typeof Dna;
  title: string;
  desc: string;
  /** Opent de lightbox voor deze module-slug (moet een key in MODULE_DETAILS zijn). */
  slug?: string;
  /** Linkt regelrecht door (bv. naar de F-VAL-resourcepagina), i.p.v. een lightbox. */
  href?: string;
}

export interface Group {
  key: string;
  label: string;
  title: string;
  intro: string;
  grad: string;
  modules: Module[];
}

export const GROUPS: Group[] = [
  {
    key: 'fundament',
    label: 'Stap 1',
    title: 'Fundament: leg je merk vast',
    intro: 'Het complete merk in één workspace. Dit fundament gaat in élke generatie mee.',
    grad: 'var(--g-brand)',
    modules: [
      {
        Icon: Dna,
        title: 'Merk-DNA',
        desc: 'De basis van je merk, één keer vastgelegd en overal automatisch gebruikt.',
        slug: 'merk-dna',
      },
      {
        Icon: Palette,
        title: 'Brand voice & stijl',
        desc: 'Hoe je merk klinkt en eruitziet, gehaald uit je eigen materiaal en overal herbruikbaar.',
        slug: 'brand-voice',
      },
      {
        Icon: Languages,
        title: 'Meertalig',
        desc: 'Content in meerdere talen en markten, op basis van hetzelfde merk-DNA.',
      },
    ],
  },
  {
    key: 'onderzoek',
    label: 'Stap 2',
    title: 'Onderzoek: ken je markt',
    intro: 'Persona’s, concurrenten en trends: je merk-DNA staat niet op giswerk.',
    grad: 'var(--g-cool)',
    modules: [
      {
        Icon: Users,
        title: 'Persona’s',
        desc: 'Een goed onderbouwd beeld van je doelgroep, en een chat om er vragen aan te stellen.',
        slug: 'personas',
      },
      {
        Icon: Swords,
        title: 'Concurrent-analyse',
        desc: 'Wie je concurrenten zijn en wat ze doen, meegenomen in je strategie en content.',
      },
      {
        Icon: Radar,
        title: 'Trend Radar',
        desc: 'Een trendscan die kansen en signalen in je markt oppikt, met bronnen.',
        slug: 'trend-radar',
      },
    ],
  },
  {
    key: 'genereren',
    label: 'Stap 3',
    title: 'Genereren: maak on-brand',
    intro: 'Content, campagnes, beeld en landingspagina’s, allemaal in jouw merk-DNA.',
    grad: 'var(--g-warm)',
    modules: [
      {
        Icon: PenLine,
        title: 'Content Canvas',
        desc: 'On-brand teksten voor 25+ soorten content, op elk kanaal.',
        slug: 'content-canvas',
      },
      {
        Icon: Megaphone,
        title: 'Campagne-strategie',
        desc: 'Van strategie tot kant-en-klare content, in één beweging.',
        slug: 'campaigns',
      },
      {
        Icon: Images,
        title: 'Beeld',
        desc: 'On-brand beeld, direct in het platform.',
      },
      {
        Icon: LayoutTemplate,
        title: 'Landingspagina’s',
        desc: 'Bouwen en publiceren op je eigen subdomein, zonder extra software.',
      },
    ],
  },
  {
    key: 'bewaken',
    label: 'Stap 4',
    title: 'Bewaken: houd het op merk',
    intro: 'Agents doen het werk, de merk-check bewaakt dat alles on-brand blijft.',
    grad: 'var(--g-fresh)',
    modules: [
      {
        Icon: Bot,
        title: '9 AI-agents',
        desc: 'Van onderzoek en strategie tot wekelijkse rapporten en agents die dag en nacht meekijken.',
        slug: 'agents',
      },
      {
        Icon: BadgeCheck,
        title: 'Merk-check (F-VAL)',
        desc: 'Elke tekst krijgt een score voor hoe goed die bij je merk past; te laag, dan herschrijft Branddock hem automatisch.',
        slug: 'brand-alignment',
      },
    ],
  },
];

export interface ModuleDetail {
  title: string;
  tagline: string;
  description: string;
  bullets: string[];
  /** Optionele link naar een volledige uitlegpagina, voor wie dieper wil. */
  moreHref?: string;
  moreLabel?: string;
}

export const MODULE_DETAILS: Record<string, ModuleDetail> = {
  'merk-dna': {
    title: 'Je complete merk-DNA, op één plek',
    tagline: 'Alles wat je merk uniek maakt, één keer vastgelegd en overal automatisch gebruikt.',
    description:
      'Je vult je merk één keer in: waar het voor staat, hoe het klinkt, hoe het eruitziet en voor wie het is. Branddock gebruikt dat daarna bij alles wat het voor je maakt, zodat je nooit opnieuw hoeft uit te leggen wie je bent.',
    bullets: [
      'Eén centrale plek voor missie, waarden, doelgroep, merkstem en huisstijl',
      'Automatisch meegenomen in elke tekst, elk beeld en elke pagina die je maakt',
      'Eén keer invullen, overal consistent: geen losse briefing meer per kanaal',
      'Altijd aan te vullen of bij te werken naarmate je merk groeit',
    ],
  },
  'brand-alignment': {
    title: 'Merk-check & inzichten',
    tagline: 'Zie waaróm content scoort zoals het scoort.',
    description:
      'Geen black box: elke tekst krijgt een uitsplitsing van drie dingen. Hoe goed de schrijfstijl past, wat een AI-beoordelaar ervan vindt, en of je eigen merkregels worden gevolgd. Bevindingen komen met een duidelijke prioriteit en concrete suggesties om ze op te lossen.',
    bullets: [
      'Eén score, opgebouwd uit schrijfstijl, een AI-beoordeling en je eigen merkregels',
      'Bevindingen ingedeeld naar type: bijvoorbeeld toon, woordkeuze of een claim die onderbouwing mist',
      'Checkt of beweringen kloppen en of er risico’s spelen die in jouw sector gevoelig liggen',
      'Een dashboard dat laat zien hoe vaak content de norm haalt, per contentsoort',
    ],
    moreHref: '/marketing/resources/f-val',
    moreLabel: 'Lees de volledige F-VAL-uitleg',
  },
  'brand-voice': {
    title: 'Brand Voice die écht klopt',
    tagline: 'Bouw je merkstem uit je eigen voorbeeldteksten, geen generieke prompts.',
    description:
      'Branddock leert je merkstem uit een schrijfprofiel, voorbeeldteksten of allebei. Elke nieuwe tekst wordt vergeleken met die basis, niet met de vraag "klinkt dit in het algemeen goed".',
    bullets: [
      'Een schrijfprofiel uit 3 voorbeeldteksten, klaar in 5 minuten',
      'Automatische check hoe goed elke gegenereerde tekst op je merkstem lijkt',
      'Een strengere modus die AI-taalpatronen actief wegschrijft, op aanvraag',
      'Eigen richtlijnen per contentsoort (een blog leest anders dan een LinkedIn-post of e-mail)',
    ],
  },
  'content-canvas': {
    title: 'Content Canvas: 25+ soorten content',
    tagline: 'Van blogpost tot landingspagina tot LinkedIn-post: één plek, alle formats.',
    description:
      'Briefing erin, on-brand content eruit, met automatische kwaliteitscontroles bij elke stap. Je krijgt meerdere versies om uit te kiezen, elk gecheckt op fouten en gescoord op merkfit, plus complete webpagina’s en lange, goed vindbare artikelen met een visuele pagina-bouwer.',
    bullets: [
      '25+ soorten content, van blog en social tot advertenties, landingspagina’s en lange artikelen',
      'Meerdere versies per generatie, zodat je kunt kiezen wat het beste past',
      'Automatische checks op fouten, zoals vergeten invulvelden, gevoelige gegevens of verboden woorden',
      'Sleep zelf webpagina’s in elkaar en publiceer ze direct op je eigen URL',
      'Scoort een tekst te laag, dan herschrijft Branddock hem automatisch opnieuw',
    ],
  },
  agents: {
    title: 'AI-agents die je merk kennen',
    tagline: 'Negen specialisten, van marktonderzoek tot wekelijkse rapporten en 24/7-bewaking.',
    description:
      'Branddock-agents doen echt werk bovenop je merk-DNA: marktonderzoek, strategie, contentvoorstellen, merk-checks en cijferanalyse. Elke agent stelt voor, jij keurt goed. Niets gaat live zonder jou.',
    bullets: [
      'Onderzoekt de markt met bronnen en legt dat vast in je eigen kennisbibliotheek',
      'Bouwt strategie en contentvoorstellen die al op je merk-DNA zijn afgestemd',
      'Checkt zelfstandig of teksten op merk blijven',
      'Levert elke week een kant-en-klaar merkrapport',
      'Houdt bij wanneer content of advertenties verouderen en stelt een update voor',
      'Volgt concurrenten en je eigen resultaten',
      'Jij blijft de baas: agents doen voorstellen, jij keurt ze goed',
    ],
  },
  personas: {
    title: 'Persona’s die je doelgroep echt raken',
    tagline: 'Een goed onderbouwd beeld van je doelgroep, en een chat om mee te sparren.',
    description:
      'Bouw persona’s op basis van onderzoek, niet op onderbuikgevoel. Elke persona voedt je merk-DNA en je content, zodat toon, pijnpunten en drijfveren kloppen. Spar er direct mee in de persona-chat.',
    bullets: [
      'Persona’s uit onderzoek, gekoppeld aan je merk-DNA',
      'Persona-chat: test een boodschap direct tegen je doelgroep',
      'Pijnpunten, drijfveren en bezwaren per persona in beeld',
      'Automatisch meegewogen in elke tekst die je maakt',
    ],
  },
  'trend-radar': {
    title: 'Trend Radar: kansen vóór je concurrent',
    tagline: 'Een trendscan die signalen in je markt oppikt.',
    description:
      'Branddock houdt je markt in de gaten op opkomende thema’s, gesprekken en kansen, met bronnen erbij. Van signaal naar concreet content-idee, afgestemd op je merk-DNA en persona’s.',
    bullets: [
      'Trendscan met bronnen, zowel van het web als wetenschappelijk',
      'Signalen vertaald naar concrete content-ideeën',
      'Afgestemd op je merk-DNA en persona’s',
      'Van signaal naar campagne in één beweging',
    ],
  },
  campaigns: {
    title: 'Campagnes: van strategie tot kant-en-klare content',
    tagline: 'Bouw een campagnestrategie en zet die direct om in content.',
    description:
      'De campagnetool maakt een strategie met een duidelijk doel, boodschap, opbouw en kanalen, en zet die direct om in concrete content. Alles op je merk-DNA, van eerste idee tot uitvoering.',
    bullets: [
      'Een strategie met doel, boodschap, opbouw en kanalen',
      'Elk onderdeel van de strategie wordt direct concrete content',
      'Een kanaalplan én een lijst content-stukken, uit dezelfde strategie',
      'On-brand van eerste idee tot laatste post',
    ],
  },
};
