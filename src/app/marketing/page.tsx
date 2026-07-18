// Homepage v2 — NL-first, in-house marketingteams, volledige platform-breedte.
// Zie website-verbeterplan v2. Bewust géén verzonnen klant-quote/logo's
// (volgen na de pilot); vertrouwen via tech-credibility + het echte product.

import Link from 'next/link';
import Image from 'next/image';
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
  ChevronDown,
  Cpu,
} from 'lucide-react';
import { appHref } from './app-url';
import BookDemoButton from './BookDemoButton';
import HowItWorks from './HowItWorks';
import Mosaic, { MOSAIC_PRODUCT } from './Mosaic';
import { PLAN_CONFIGS } from '@/lib/constants/plan-limits';
import { creditExampleLineCompact } from '@/lib/constants/credit-examples';

export default function MarketingHomePage() {
  return (
    <div>
      <Hero />
      <Problem />
      <HowSection />
      <PlatformBreadth />
      <ValuePillars />
      <ProofStrip />
      <SolutionsSplit />
      <PricingTeaser />
      <FAQ />
      <FinalCTA />
    </div>
  );
}

function Hero() {
  return (
    <section className="mkt-hero relative">
      <div className="mkt-hero__ink">
        <div className="max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm mb-6">
            <span style={{ color: 'var(--brand-lime)' }}>●</span> Jouw AI-marketingteam
          </div>
          <h1 className="mb-6" style={{ color: '#ffffff' }}>
            Een AI-marketingteam dat je merk écht kent.
          </h1>
          <p className="text-xl mb-8" style={{ color: 'rgba(255,255,255,0.9)' }}>
            Negen AI-agents doen het werk — onderzoek, strategie, content, merkbewaking — op jouw
            merk-DNA, en elke uiting krijgt een meetbare merk-check (F-VAL). Werkt in Branddock, in
            Claude en ChatGPT, en overal waar je schrijft. Jij keurt goed.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={appHref('/?utm_source=marketing-site&utm_medium=hero')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white font-medium hover:opacity-90"
              style={{ color: 'var(--brand-slate)' }}
            >
              Gratis proberen <ArrowRight className="w-4 h-4" />
            </Link>
            <BookDemoButton className="inline-flex items-center px-6 py-3 rounded-lg border border-white/40 text-white font-medium hover:bg-white/10" />
          </div>
        </div>
      </div>
      <div className="mkt-hero__mosaic">
        <Mosaic
          id="hero"
          cols={7}
          rows={5}
          palette={MOSAIC_PRODUCT}
          className="absolute inset-0 w-full h-full"
          style={{ opacity: 0.92 }}
        />
        <div className="mkt-hero__shot mkt-frame">
          <div className="mkt-frame__bar">
            <i></i>
            <i></i>
            <i></i>
          </div>
          <Image
            src="/marketing/features/content-canvas.png"
            alt="Branddock Content Canvas — on-brand content genereren met een merk-fideliteitsscore"
            width={2880}
            height={1800}
            className="w-full h-auto"
            priority
          />
        </div>
      </div>
      <div className="mkt-hero__meta">
        <div className="mkt-hero__meta-item">
          <b>Modellen</b>
          <span>Claude · GPT · Gemini</span>
        </div>
        <div className="mkt-hero__meta-item">
          <b>Data</b>
          <span>EU-hosting · AVG-proof</span>
        </div>
        <div className="mkt-hero__meta-item">
          <b>Start</b>
          <span>28 dagen gratis · geen creditcard</span>
        </div>
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16 md:py-20">
      <div className="max-w-3xl">
        <div className="text-sm font-semibold mkt-accent uppercase tracking-wide mb-3">
          Het probleem
        </div>
        <h2 className="text-gray-900 mb-4">Generieke AI kent je merk niet</h2>
        <p className="text-lg text-gray-600">
          AI-tools en -agents schrijven snel, maar clichématig. Je vult telkens opnieuw de context
          aan, herschrijft de output tot het eindelijk klinkt als jóú, en knoopt losse tools voor
          tekst, beeld en campagnes aan elkaar. De tijdwinst verdampt in de rework.
        </p>
      </div>
    </section>
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
            Van merk-DNA naar on-brand content — in vier stappen
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

const MODULES: { Icon: typeof Dna; title: string; desc: string }[] = [
  { Icon: Dna, title: 'Merk-DNA', desc: '12 canonieke merk-assets als fundament onder alles.' },
  { Icon: Palette, title: 'Brand voice & stijl', desc: 'De merkstem en visuele stijl, herbruikbaar in elke output.' },
  { Icon: Users, title: 'Persona’s', desc: 'Doelgroep-persona’s, inclusief persona-chat om te sparren.' },
  { Icon: Swords, title: 'Concurrent-analyse', desc: 'Concurrenten in beeld en meegewogen in je content.' },
  { Icon: Radar, title: 'Trend Radar', desc: 'Trendscan die kansen en signalen in je markt oppikt.' },
  { Icon: PenLine, title: 'Content Canvas', desc: 'On-brand tekst-generatie over alle kanalen.' },
  { Icon: Megaphone, title: 'Campagne-strategie', desc: 'Van strategie-blueprint tot concrete deliverables.' },
  { Icon: Images, title: 'Beeld & video', desc: 'On-brand visuals en video, direct in het platform.' },
  { Icon: LayoutTemplate, title: 'Landingspagina’s', desc: 'Publiceren op je eigen subdomein.' },
  { Icon: Bot, title: '9 AI-agents', desc: 'Collega’s met rollen — ze stellen voor, jij keurt goed.' },
  { Icon: BadgeCheck, title: 'Merk-check', desc: 'F-VAL-score bewaakt dat elke output op merk blijft.' },
  { Icon: Languages, title: 'Meertalig', desc: 'Multi-markt content voor internationale merken.' },
];

function PlatformBreadth() {
  return (
    <section id="platform" className="max-w-6xl mx-auto px-6 py-16 md:py-24 scroll-mt-20">
      <div className="max-w-2xl mb-10">
        <div className="text-sm font-semibold mkt-accent uppercase tracking-wide mb-3">
          Het platform
        </div>
        <h2 className="text-gray-900 mb-3">Je AI-team werkt op één merk-platform</h2>
        <p className="text-gray-600">
          Alles draait op hetzelfde merk-DNA-fundament: je agents onderzoeken, adviseren en maken —
          van persona’s en trends tot content, campagnes en beeld. Jij keurt goed.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map(({ Icon, title, desc }, i) => (
          <div
            key={title}
            className="rounded-xl border border-gray-200 bg-white p-5 hover:border-gray-300 transition-colors"
          >
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
            <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ValuePillars() {
  const pillars: { Icon: typeof Dna; title: string; body: string }[] = [
    {
      Icon: Cpu,
      title: 'Een team, geen tool',
      body: 'Negen agents met eigen rollen — onderzoek, strategie, content, merkbewaking, rapportage. Ze signaleren, adviseren en leveren concepten in je inbox.',
    },
    {
      Icon: Dna,
      title: 'Draait op jouw merk-DNA',
      body: 'Brand voice, persona’s, producten, concurrenten en trends — elke collega werkt met dezelfde merkcontext, in Branddock én daarbuiten.',
    },
    {
      Icon: BadgeCheck,
      title: 'Bewijsbaar on-brand — jij keurt goed',
      body: 'Elke uiting krijgt een F-VAL-merkscore — gemiddeld +7 punten on-brand versus vanilla-AI. Niets gaat live zonder jou.',
    },
  ];
  return (
    <section className="border-y border-gray-200 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {pillars.map(({ Icon, title, body }) => (
            <div key={title}>
              <div className="mkt-chip w-11 h-11 mb-4">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProofStrip() {
  const stats = [
    { big: '9', cap: 'AI-agents met eigen rollen — van onderzoek tot merkbewaking' },
    { big: '+7', cap: 'punten on-brand vs. vanilla-AI (gemiddeld; +12 op de nieuwsbrief)' },
    { big: '17', cap: 'agent-tools via de MCP-connector — je team werkt ook in Claude en ChatGPT' },
  ];
  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      {/* md:-varianten — bewust behouden na de purge-sweep van 2026-07-18
          (sm:-utilities bestaan inmiddels weer in index.css, maar dit
          breakpoint is de geldende layout-intentie). */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 md:p-8 grid gap-6 md:grid-cols-3">
        {stats.map((s) => (
          <div key={s.cap}>
            <div className="text-4xl font-bold mkt-accent tabular-nums">{s.big}</div>
            <div className="text-sm text-gray-600 mt-2">{s.cap}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-4 max-w-2xl">
        Eerlijke pilotmeting — geen opgeblazen cijfers. De merk-check is één van de garanties in het
        platform.
      </p>
    </section>
  );
}

function SolutionsSplit() {
  return (
    <section className="border-t border-gray-200 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border-2 border-primary/30 bg-white p-8">
            <div className="text-xs font-semibold mkt-accent uppercase tracking-wide mb-2">
              Voor marketingteams
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Schaal je content zonder je merk te verwateren
            </h3>
            <p className="text-gray-600 text-sm mb-5">
              Volume on-brand content over alle kanalen, uit één plek. Minder tools, minder rework,
              meetbare merkconsistentie voor je stakeholders.
            </p>
            <Link
              href="/marketing/solutions/marketingteams"
              className="inline-flex items-center gap-2 text-sm font-medium mkt-accent"
            >
              Bekijk voor marketingteams <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-8">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Voor bureaus
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Eén merk-DNA-workspace per klant
            </h3>
            <p className="text-gray-600 text-sm mb-5">
              Beheer meerdere klantmerken naast elkaar, elk met een eigen merk-DNA — en lever
              aantoonbaar on-brand werk.
            </p>
            <Link
              href="/marketing/solutions/bureaus"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-700"
            >
              Bekijk voor bureaus <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
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
          Credits meten alleen output — merk-context en de merk-check worden nooit gerekend. 28
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
              <span className="text-sm font-normal text-gray-400">/mnd</span>
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
          href={appHref('/?utm_source=marketing-site&utm_medium=pricing-teaser')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90"
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
      a: 'Je legt je merk-DNA één keer vast — brand voice, stijl, persona’s, producten en concurrenten. Dat fundament wordt in elke generatie meegenomen.',
    },
    {
      q: 'Is dit weer een losse AI-schrijftool?',
      a: 'Nee. Branddock bundelt onderzoek, content, campagnes, beeld en publicatie in één platform, allemaal op hetzelfde merk-DNA — met een team van AI-agents dat voorstelt en jou laat goedkeuren.',
    },
    {
      q: 'Werkt Branddock ook in Claude of ChatGPT?',
      a: 'Ja. Koppel Branddock als connector (branddock.app/api/mcp), log in met je Branddock-account en je agent kent je merk: context, merk-check en on-brand generatie. Er is ook een browser-extensie (beta) voor overal waar je schrijft.',
    },
    {
      q: 'Wat gebeurt er met mijn data?',
      a: 'Je data staat in de EU en we werken AVG-proof. Je merk-DNA wordt niet gebruikt om modellen van derden te trainen.',
    },
    {
      q: 'Kan ik gratis beginnen?',
      a: 'Ja — 28 dagen gratis, zonder creditcard. Daarna betaal je alleen voor de output die je maakt.',
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
      <div className="max-w-6xl mx-auto px-6 py-20 text-center relative">
        <h2 className="mb-4" style={{ color: '#ffffff' }}>
          Klaar om je marketingteam uit te breiden?
        </h2>
        <p className="mb-8 max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.9)' }}>
          Probeer Branddock 28 dagen gratis. Geen creditcard, geen verplichtingen — je agents staan
          direct voor je klaar.
        </p>
        <Link
          href={appHref('/?utm_source=marketing-site&utm_medium=final-cta')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white font-medium hover:opacity-90"
          style={{ color: 'var(--brand-slate)' }}
        >
          Gratis proberen <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
