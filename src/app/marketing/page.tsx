// Homepage v2 — NL-first, in-house marketingteams, volledige platform-breedte.
// Zie website-verbeterplan v2. Bewust géén verzonnen klant-quote/logo's
// (volgen na de pilot); vertrouwen via tech-credibility + het echte product.

import Link from 'next/link';
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
  ArrowRight,
  Building2,
  ChevronDown,
  Workflow,
} from 'lucide-react';
import { appHref } from './app-url';
import HeroModes from './HeroModes';
import HowItWorks from './HowItWorks';
import Mosaic, { MOSAIC_PRODUCT } from './Mosaic';
import { PLAN_CONFIGS } from '@/lib/constants/plan-limits';
import { creditExampleLineCompact } from '@/lib/constants/credit-examples';

// UX-12: '/' is de publieke homepage-URL (apex rewrite); /marketing 308't ernaar.
export const metadata = { alternates: { canonical: '/' } };

export default function MarketingHomePage() {
  return (
    <div>
      <HeroModes />
      <HowSection />
      <PlatformBreadth />
      <ForWho />
      <PricingTeaser />
      <FAQ />
      <FinalCTA />
    </div>
  );
}

function HowSection() {
  return (
    <section className="border-y border-gray-200 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
        <div className="max-w-2xl mb-10">
          <div className="text-sm font-semibold mkt-accent uppercase tracking-wide mb-3">
            Hoe het werkt
          </div>
          <h2 className="text-gray-900 mb-3">
            Van merk-DNA naar on-brand content in vier stappen
          </h2>
          <p className="text-gray-600">
            Leg je merk één keer vast. Branddock gebruikt het overal.
          </p>
        </div>
        <HowItWorks />
      </div>
    </section>
  );
}

// UX-08: kaarten mét detailpagina zijn klikbaar (href + pijl, zoals op de
// platform-pagina); kaarten zonder eigen pagina blijven bewust statisch
// zonder pijl — consistent onderscheid.
const MODULES: { Icon: typeof Dna; title: string; desc: string; href?: string }[] = [
  { Icon: Dna, title: 'Merk-DNA', desc: 'De basis van je merk, één keer vastgelegd en overal automatisch gebruikt.', href: '/marketing/platform?feature=merk-dna' },
  { Icon: Palette, title: 'Brand voice & stijl', desc: 'Hoe je merk klinkt en eruitziet, gehaald uit je eigen materiaal en overal herbruikbaar.', href: '/marketing/platform?feature=brand-voice' },
  { Icon: Users, title: 'Persona’s', desc: 'Een goed onderbouwd beeld van je doelgroep, en een chat om er vragen aan te stellen.', href: '/marketing/platform?feature=personas' },
  { Icon: Swords, title: 'Concurrent-analyse', desc: 'Wie je concurrenten zijn en wat ze doen, meegenomen in je content.' },
  { Icon: Radar, title: 'Trend Radar', desc: 'Een trendscan die kansen en signalen in je markt oppikt.', href: '/marketing/platform?feature=trend-radar' },
  { Icon: PenLine, title: 'Content Canvas', desc: 'On-brand teksten voor elk kanaal.', href: '/marketing/platform?feature=content-canvas' },
  { Icon: Megaphone, title: 'Campagne-strategie', desc: 'Van strategie tot kant-en-klare content, in één beweging.', href: '/marketing/platform?feature=campaigns' },
  { Icon: Images, title: 'Beeld', desc: 'On-brand beeld, direct in het platform.' },
  { Icon: LayoutTemplate, title: 'Landingspagina’s', desc: 'Bouwen en publiceren op je eigen subdomein.' },
  { Icon: Bot, title: '9 AI-agents', desc: 'Collega’s met rollen: ze stellen voor, jij keurt goed.', href: '/marketing/platform?feature=agents' },
  { Icon: BadgeCheck, title: 'Merk-check', desc: 'Elke tekst krijgt een score voor hoe goed die bij je merk past.', href: '/marketing/platform?feature=brand-alignment' },
  { Icon: Languages, title: 'Meertalig', desc: 'Content in meerdere talen en markten, op basis van hetzelfde merk-DNA.' },
];

function PlatformBreadth() {
  return (
    <section id="platform" className="max-w-6xl mx-auto px-6 py-16 md:py-24 scroll-mt-20">
      <div className="max-w-2xl mb-10">
        <div className="text-sm font-semibold mkt-accent uppercase tracking-wide mb-3">
          Het platform
        </div>
        <h2 className="text-gray-900 mb-3">Je AI-team werkt op één merkplatform</h2>
        <p className="text-gray-600">
          Alles draait op hetzelfde merk-DNA-fundament: je agents onderzoeken, adviseren en maken;
          van persona’s en trends tot content, campagnes en beeld. Jij keurt goed.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map(({ Icon, title, desc, href }, i) => {
          const card = (
            <>
              <div className="mkt-tile mb-3">
                <Mosaic
                  id={`tile-${i}`}
                  cols={2}
                  rows={2}
                  palette={MOSAIC_PRODUCT}
                  className="absolute inset-0 w-full h-full"
                />
                <div className="mkt-tile__badge">
                  <i>
                    <Icon className="w-3.5 h-3.5" style={{ color: 'var(--brand-slate)' }} />
                  </i>
                </div>
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-1.5">
                {title}
                {href ? <ArrowRight className="w-3.5 h-3.5 text-gray-500" /> : null}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
            </>
          );
          return href ? (
            <Link
              key={title}
              href={href}
              className="rounded-xl border border-gray-200 bg-white p-5 hover:border-gray-300 hover:shadow-md transition-all block"
            >
              {card}
            </Link>
          ) : (
            <div key={title} className="rounded-xl border border-gray-200 bg-white p-5">
              {card}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// TODO(Erik): vijfde voor-wie-kaart voor founders/kleine merken? (V2-08.4 — besluit)
const FOR_WHO: {
  Icon: typeof Dna;
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  featured?: boolean;
}[] = [
  {
    Icon: Megaphone,
    eyebrow: 'Marketingteams',
    title: 'Schaal je content zonder je merk te verwateren',
    body: 'Veel on-brand content over alle kanalen, uit één plek. Minder tools, minder dubbel werk, en aantoonbaar consistent voor iedereen die meekijkt.',
    href: '/marketing/solutions/marketingteams',
    cta: 'Bekijk voor marketingteams',
    featured: true,
  },
  {
    Icon: Building2,
    eyebrow: 'Bureaus',
    title: 'Eén merk-DNA-workspace per klant',
    body: 'Beheer meerdere klantmerken naast elkaar, elk met een eigen merk-DNA, en lever aantoonbaar on-brand werk. Klanten kijken mee met een eigen login.',
    href: '/marketing/solutions/bureaus',
    cta: 'Bekijk voor bureaus',
  },
  {
    Icon: Bot,
    eyebrow: 'Agentic',
    title: 'Werk vanuit Claude, ChatGPT of je eigen agent',
    body: 'Koppel Branddock als MCP-connector en je AI kent je merk: volledige merkcontext, on-brand genereren en een merk-check op elke uiting.',
    href: '/marketing/voor-ai-agents',
    cta: 'Bekijk de koppel-stappen',
  },
  {
    Icon: Workflow,
    eyebrow: 'Automatiseerders',
    title: 'Bouw je merk in je eigen workflows',
    body: 'Publieke API, webhooks met HMAC-signing en MCP voor n8n en andere tools: van generatie tot merk-check, machine-to-machine.',
    href: '/marketing/voor-ai-agents#api',
    cta: 'Bekijk de API & tools',
  },
];

function ForWho() {
  return (
    <section className="border-t border-gray-200 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="max-w-2xl mb-10">
          <div className="text-sm font-semibold mkt-accent uppercase tracking-wide mb-3">
            Voor wie
          </div>
          <h2 className="text-gray-900 mb-3">Voor wie is Branddock?</h2>
          <p className="text-gray-600">
            In het platform, vanuit je AI-agent of in je eigen workflows: iedereen werkt op
            hetzelfde merk-DNA.
          </p>
        </div>
        {/* UX-13: hele kaart klikbaar, één linkstijl (mkt-accent, na UX-01
            leesbaar); featured alleen op marketingteams — de primaire
            doelgroep uit het wig-besluit. */}
        <div className="grid md:grid-cols-2 gap-6">
          {FOR_WHO.map(({ Icon, eyebrow, title, body, href, cta, featured }) => (
            <Link
              key={eyebrow}
              href={href}
              className={`block rounded-2xl bg-white p-8 transition-all hover:shadow-md ${
                featured
                  ? 'border-2 border-primary/30 hover:border-primary/50'
                  : 'border border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="mkt-chip w-11 h-11 mb-4">
                <Icon className="w-5 h-5" />
              </div>
              <div
                className={`text-xs font-semibold uppercase tracking-wide mb-2 ${
                  featured ? 'mkt-accent' : 'text-gray-500'
                }`}
              >
                {eyebrow}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
              <p className="text-gray-600 text-sm mb-5">{body}</p>
              <span className="inline-flex items-center gap-2 text-sm font-medium mkt-accent">
                {cta} <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

const TEASER_LINE_SUFFIX: Record<'STARTER' | 'GROWTH' | 'AGENCY', string> = {
  STARTER: 'voor kleine teams',
  GROWTH: 'populairste keuze',
  AGENCY: 'meerdere merken',
};

function PricingTeaser() {
  const nl = new Intl.NumberFormat('nl-NL');
  const tiers = (['STARTER', 'GROWTH', 'AGENCY'] as const).map((key) => {
    const config = PLAN_CONFIGS[key];
    return {
      name: config.name,
      price: `€${config.monthlyPriceEur}`,
      line: `${nl.format(config.monthlyCredits)} credits · ${TEASER_LINE_SUFFIX[key]}`,
      example: creditExampleLineCompact(config.monthlyCredits),
      featured: key === 'GROWTH',
    };
  });
  return (
    <section className="max-w-6xl mx-auto px-6 py-16 md:py-20">
      <div className="max-w-2xl mb-10">
        <div className="text-sm font-semibold mkt-accent uppercase tracking-wide mb-3">Prijzen</div>
        <h2 className="text-gray-900 mb-3">Begin gratis. Betaal alleen voor wat je maakt.</h2>
        <p className="text-gray-600">
          Credits meten alleen output. Merk-context en de merk-check worden nooit gerekend. 28
          dagen gratis, geen creditcard.
        </p>
      </div>
      {/* md: bewust behouden na de purge-sweep van 2026-07-18 (sm:grid-cols-3
          bestaat inmiddels weer, maar md: is de geldende layout-intentie). */}
      <div className="grid md:grid-cols-3 gap-4">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`rounded-xl border bg-white p-6 ${
              t.featured ? 'border-primary/40 shadow-md ring-1 ring-primary/20' : 'border-gray-200'
            }`}
          >
            {t.featured ? (
              <div className="mkt-badge-popular mb-3">Populairste keuze</div>
            ) : null}
            <div className="text-sm font-semibold text-gray-900">{t.name}</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">
              {t.price}
              <span className="text-sm font-normal text-gray-500">/mnd</span>
            </div>
            <div className="text-sm text-gray-600 mt-2">{t.line}</div>
            <div className="text-xs text-gray-500 mt-1">{t.example}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/marketing/pricing"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
        >
          Alle prijzen bekijken
        </Link>
        <Link
          href={appHref('/?view=register&utm_source=marketing-site&utm_medium=pricing-teaser')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg mkt-btn-primary text-sm font-medium"
        >
          Gratis proberen
        </Link>
      </div>
    </section>
  );
}

function FAQ() {
  const qa = [
    {
      q: 'Hoe weet Branddock hoe mijn merk klinkt?',
      a: 'Je legt je merk-DNA één keer vast: brand voice, stijl, persona’s, producten en concurrenten. Dat fundament wordt in elke generatie meegenomen.',
    },
    {
      q: 'Is dit weer een losse AI-schrijftool?',
      a: 'Nee. Branddock bundelt onderzoek, content, campagnes, beeld en publicatie in één platform, allemaal op hetzelfde merk-DNA, met een team van AI-agents dat voorstelt en jou laat goedkeuren.',
    },
    {
      q: 'Werkt Branddock ook in Claude of ChatGPT?',
      a: 'Ja. Koppel Branddock als connector, log in met je Branddock-account en je agent kent je merk: context, merk-check en on-brand generatie. Er is ook een browser-extensie (beta) voor overal waar je schrijft.',
    },
    {
      q: 'Wat gebeurt er met mijn data?',
      a: 'Je data staat in de EU en we werken AVG-proof. Je merk-DNA wordt niet gebruikt om modellen van derden te trainen.',
    },
    {
      q: 'Ik heb geen marketingteam of merkdocumenten. Werkt Branddock dan?',
      a: 'Ja. De gratis setup-scan bouwt je merk-DNA vanaf je website, en een brand voice maak je uit 3 voorbeeldteksten in ±5 minuten. Starter is precies hiervoor bedoeld: de agents zijn dan je eerste marketingcollega\u2019s: zij stellen voor, jij keurt goed.',
    },
    {
      q: 'In welke talen werkt Branddock?',
      a: 'Je stelt de contenttaal per workspace in: Nederlands, Engels, Duits, Frans, Spaans, Portugees of Italiaans. Generatie én de merk-check werken in die taal; meertalige merken kunnen per merkprofiel een taal voeren.',
    },
    {
      q: 'Kan ik gratis beginnen?',
      a: 'Ja, 28 dagen gratis en zonder creditcard. Daarna betaal je alleen voor de output die je maakt.',
    },
  ];
  return (
    <section className="border-y border-gray-200 bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-gray-900 mb-8">Veelgestelde vragen</h2>
        <div className="divide-y divide-gray-200 border-t border-gray-200">
          {qa.map((item) => (
            <details key={item.q} className="group py-4">
              <summary className="flex cursor-pointer items-center justify-between text-gray-900 font-medium list-none">
                {item.q}
                <ChevronDown className="w-5 h-5 mkt-accent shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <p className="text-gray-600 text-sm mt-3 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="relative overflow-hidden" style={{ background: 'var(--g-brand)' }}>
      <Mosaic
        id="cta"
        cols={7}
        rows={2}
        tint={0.18}
        className="pointer-events-none absolute inset-0 w-full h-full"
        style={{ opacity: 0.22 }}
      />
      {/* UX-01: donkere overlay — witte tekst haalde geen 4.5:1 op het
          mint-uiteinde van de gradient. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'rgba(15, 23, 42, 0.45)' }}
        aria-hidden
      />
      <div className="max-w-6xl mx-auto px-6 py-20 text-center relative">
        <h2 className="mb-4" style={{ color: '#ffffff' }}>
          Klaar om je marketingteam uit te breiden?
        </h2>
        <p className="mb-8 max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.9)' }}>
          Probeer Branddock 28 dagen gratis. Geen creditcard, geen verplichtingen. Je agents staan
          direct voor je klaar.
        </p>
        <Link
          href={appHref('/?view=register&utm_source=marketing-site&utm_medium=final-cta')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white font-medium hover:opacity-90"
          style={{ color: 'var(--brand-slate)' }}
        >
          Gratis proberen <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
