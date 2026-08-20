// Data voor de platform-overzichtspagina: de 4 stepper-stappen (GROUPS) en de
// detailinhoud per module (MODULE_DETAILS), getoond in een lightbox i.p.v. een
// losse pagina (besluit Erik: de 7 detailpagina's onder /marketing/features/[slug]
// zijn hierin opgegaan). brand-alignment zit hier bewust niet in — die tegel
// linkt al naar de bestaande, rijkere /marketing/resources/f-val-pagina.

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
        desc: '12 canonieke merk-assets als fundament onder alles wat je maakt.',
        slug: 'brand-voice',
      },
      {
        Icon: Palette,
        title: 'Brand voice & stijl',
        desc: 'De merkstem en visuele stijl, uit jouw materiaal, herbruikbaar in elke output.',
        slug: 'brand-voice',
      },
      {
        Icon: Languages,
        title: 'Meertalig',
        desc: 'Multi-markt content voor internationale merken, op hetzelfde merk-DNA.',
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
        desc: 'Onderbouwde doelgroep-persona’s, inclusief persona-chat om te sparren.',
        slug: 'personas',
      },
      {
        Icon: Swords,
        title: 'Concurrent-analyse',
        desc: 'Concurrenten in beeld en meegewogen in strategie en content.',
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
        desc: 'On-brand tekst-generatie over 25+ contenttypes en alle kanalen.',
        slug: 'content-canvas',
      },
      {
        Icon: Megaphone,
        title: 'Campagne-strategie',
        desc: 'Van strategisch blueprint tot concrete deliverables, warm overgedragen.',
        slug: 'campaigns',
      },
      {
        Icon: Images,
        title: 'Beeld',
        desc: 'On-brand visual, direct in het platform.',
      },
      {
        Icon: LayoutTemplate,
        title: 'Landingspagina’s',
        desc: 'Bouwen en publiceren op je eigen subdomein, zonder extra tooling.',
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
        desc: 'Van onderzoek en strategie tot wekelijkse rapporten en 24/7-watchdogs.',
        slug: 'agents',
      },
      {
        Icon: BadgeCheck,
        title: 'Merk-check (F-VAL)',
        desc: 'Elke output een merk-fideliteitsscore; onder de norm wordt automatisch herschreven.',
        href: '/marketing/resources/f-val',
      },
    ],
  },
];

export interface ModuleDetail {
  title: string;
  tagline: string;
  description: string;
  bullets: string[];
}

export const MODULE_DETAILS: Record<string, ModuleDetail> = {
  'brand-voice': {
    title: 'Brand Voice die écht klopt',
    tagline: 'Bouw je brand voice uit voorbeeldteksten, geen generieke prompts.',
    description:
      'Branddock leert je brand voice uit een voiceguide, voorbeeldteksten of allebei. Elke generatie wordt getoetst aan die basis, niet aan “klinkt het in het algemeen goed”.',
    bullets: [
      'Voiceguide-extractie uit 3 voorbeeldteksten in 5 minuten',
      'Voice-similariteitsscore per gegenereerde variant (W-1-full embedding)',
      'STRICT-mode herschrijft anti-AI-tells op verzoek',
      'Eigen drempels per contenttype (blog vs LinkedIn vs e-mail)',
    ],
  },
  'content-canvas': {
    title: 'Content Canvas: 25+ contenttypes',
    tagline: 'Van blogpost tot landingspagina tot LinkedIn-ad: één canvas, alle formats.',
    description:
      'Briefing erin, on-brand content eruit, met automatische kwaliteitscontroles bij elke stap. Multivariate output, deterministische property-checks en een merk-check (F-VAL) op elke variant, plus volledige webpagina’s en SEO/GEO-longform met een visuele page-builder.',
    bullets: [
      '25+ contenttypes, van blog en social tot ads, landingspagina’s en SEO/GEO-longform',
      'Multivariate output: meerdere invalshoeken + 1 voorkeursvariant per generatie',
      'Deterministische property-checks per variant (placeholders, PII, verboden zinnen, claims)',
      'Visuele page-builder met publiceerbare pagina’s op je eigen URL',
      'Auto-iteratie: bij een score onder de drempel een automatische, feedback-gedreven herschrijving',
    ],
  },
  agents: {
    title: 'AI-agents die je merk kennen',
    tagline: 'Negen specialisten, van onderzoek en strategie tot wekelijkse rapporten en 24/7-watchdogs.',
    description:
      'Branddock-agents doen echt werk bovenop je merk-DNA: marktonderzoek met bronnen, strategiefundamenten, contentvoorstellen, merk-checks en data-analyse. Elke agent stelt voor, jij keurt goed. Niets gaat live zonder jou.',
    bullets: [
      'Research-analist: marktonderzoek met bronnen (web + peer-reviewed) in je kennisbibliotheek',
      'Strateeg & contentmaker: strategiefundamenten en contentvoorstellen via de merk-gevalideerde pipeline',
      'Merk-bewaker: onafhankelijke merk-checks (F-VAL) op elke tekst',
      'Rapportage-analist: een klant-klaar wekelijks merkrapport, op schema',
      'SEO/GEO- & ads-watchdogs: signalen over content-veroudering en ad-moeheid, met verversvoorstellen',
      'Markt- & data-analisten: concurrentbewegingen en je eigen productiecijfers',
      'Human-in-the-loop by design: agents stellen voor, jij bevestigt',
    ],
  },
  personas: {
    title: 'Persona’s die je doelgroep echt raken',
    tagline: 'Onderbouwde doelgroep-persona’s, en een chat om mee te sparren.',
    description:
      'Bouw persona’s op basis van onderzoek, niet onderbuik. Elke persona voedt je merk-DNA en je content: toon, pijnpunten en drijfveren kloppen. Spar direct met een persona in de persona-chat.',
    bullets: [
      'Persona’s uit onderzoek, gekoppeld aan je merk-DNA',
      'Persona-chat: test een boodschap direct tegen je doelgroep',
      'Pijnpunten, drijfveren en bezwaren per persona',
      'In elke generatie meegewogen: content die de juiste snaar raakt',
    ],
  },
  'trend-radar': {
    title: 'Trend Radar: kansen vóór je concurrent',
    tagline: 'Een trendscan die signalen in je markt oppikt.',
    description:
      'Branddock scant je markt op opkomende thema’s, gesprekken en kansen, met bronnen. Van signaal naar contentkans, gekoppeld aan je merk-DNA en persona’s, zodat je meebeweegt zonder je merk te verliezen.',
    bullets: [
      'Trendscan met bronnen (web + wetenschappelijk)',
      'Signalen vertaald naar concrete contentkansen',
      'Gekoppeld aan je merk-DNA en persona’s',
      'Van radar naar campagne in één beweging',
    ],
  },
  campaigns: {
    title: 'Campagnes: van strategie tot deliverables',
    tagline: 'Bouw een campagnestrategie en zet ’m om in concrete content.',
    description:
      'De Campaign Strategy Builder maakt een strategisch blueprint (doel, boodschap, architectuur, kanalen en assets) en levert het warm over aan content-generatie. Alles op je merk-DNA, van strategie tot uitvoering.',
    bullets: [
      'Strategisch blueprint: doel, boodschap, architectuur, kanalen',
      'Warm handover naar content-generatie per asset',
      'Kanaalplan én asset-plan uit één strategie',
      'On-brand van eerste idee tot laatste post',
    ],
  },
};
