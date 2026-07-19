// Platform-overzicht — de volle breedte op één pagina, gegroepeerd langs de
// merk-loop: fundament → onderzoek → genereren → bewaken. Elke module linkt
// naar de bestaande feature-pagina's. NL-first (Fase 3, website-verbeterplan v2).

import type { Metadata } from 'next';
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
} from 'lucide-react';
import { appHref } from '../app-url';
import Mosaic from '../Mosaic';
import SplitHeader from '../SplitHeader';
import TrialNote from '../TrialNote';

export const metadata: Metadata = {
  title: 'Platform — Branddock',
  description:
    'Eén merk-platform: merk-DNA, onderzoek, content, campagnes, beeld en AI-agents — met een merk-check op elke output.',
};

interface Module {
  Icon: typeof Dna;
  title: string;
  desc: string;
  href?: string;
}

interface Group {
  key: string;
  label: string;
  title: string;
  intro: string;
  grad: string;
  gradPair: [string, string];
  modules: Module[];
}

const GROUPS: Group[] = [
  {
    key: 'fundament',
    label: 'Stap 1',
    title: 'Fundament — leg je merk vast',
    intro: 'Het complete merk in één workspace. Dit fundament gaat in élke generatie mee.',
    grad: 'var(--g-brand)',
    gradPair: ['#343CED', '#07E5AB'],
    modules: [
      {
        Icon: Dna,
        title: 'Merk-DNA',
        desc: '12 canonieke merk-assets als fundament onder alles wat je maakt.',
        href: '/marketing/features/brand-voice',
      },
      {
        Icon: Palette,
        title: 'Brand voice & stijl',
        desc: 'De merkstem en visuele stijl, uit jouw materiaal — herbruikbaar in elke output.',
        href: '/marketing/features/brand-voice',
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
    title: 'Onderzoek — ken je markt',
    intro: 'Persona’s, concurrenten en trends: je merk-DNA staat niet op giswerk.',
    grad: 'var(--g-cool)',
    gradPair: ['#343CED', '#FECFBD'],
    modules: [
      {
        Icon: Users,
        title: 'Persona’s',
        desc: 'Onderbouwde doelgroep-persona’s, inclusief persona-chat om te sparren.',
        href: '/marketing/features/personas',
      },
      {
        Icon: Swords,
        title: 'Concurrent-analyse',
        desc: 'Concurrenten in beeld en meegewogen in strategie en content.',
      },
      {
        Icon: Radar,
        title: 'Trend Radar',
        desc: 'Een trendscan die kansen en signalen in je markt oppikt — met bronnen.',
        href: '/marketing/features/trend-radar',
      },
    ],
  },
  {
    key: 'genereren',
    label: 'Stap 3',
    title: 'Genereren — maak on-brand',
    intro: 'Content, campagnes, beeld en landingspagina’s — allemaal in jouw merk-DNA.',
    grad: 'var(--g-warm)',
    gradPair: ['#FF7F4D', '#D8FD48'],
    modules: [
      {
        Icon: PenLine,
        title: 'Content Canvas',
        desc: 'On-brand tekst-generatie over 25+ contenttypes en alle kanalen.',
        href: '/marketing/features/content-canvas',
      },
      {
        Icon: Megaphone,
        title: 'Campagne-strategie',
        desc: 'Van strategisch blueprint tot concrete deliverables, warm overgedragen.',
        href: '/marketing/features/campaigns',
      },
      {
        Icon: Images,
        title: 'Beeld & video',
        desc: 'On-brand visuals en video, direct in het platform.',
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
    title: 'Bewaken — houd het op merk',
    intro: 'Agents doen het werk, de merk-check bewaakt dat alles on-brand blijft.',
    grad: 'var(--g-fresh)',
    gradPair: ['#07E5AB', '#D8FD48'],
    modules: [
      {
        Icon: Bot,
        title: '9 AI-agents',
        desc: 'Van onderzoek en strategie tot wekelijkse rapporten en 24/7-watchdogs.',
        href: '/marketing/features/agents',
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

export default function PlatformPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <SplitHeader
        id="platform-hero"
        family="product"
        eyebrow="Platform"
        title="Eén merk-platform, van fundament tot bewaking"
        lead="Alles draait op hetzelfde merk-DNA: leg je merk één keer vast, onderzoek je markt, genereer on-brand en laat agents het bewaken."
        className="mb-14"
      />

      {/* Modules per stap van de merk-loop */}
      <div className="space-y-14">
        {GROUPS.map((group) => (
          <section key={group.key}>
            <div className="flex items-baseline gap-3 mb-2">
              <span
                className="text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded text-white"
                style={{ background: group.grad }}
              >
                {group.label}
              </span>
              <h2 className="text-gray-900">{group.title}</h2>
            </div>
            <p className="text-gray-600 mb-6 max-w-2xl">{group.intro}</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.modules.map(({ Icon, title, desc, href }) => {
                const card = (
                  <>
                    <div className="mkt-tile mb-3">
                      <Mosaic
                        id={`tile-${group.key}-${title}`}
                        cols={2}
                        rows={2}
                        palette={[group.gradPair]}
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
                      {href ? <ArrowRight className="w-3.5 h-3.5 text-gray-400" /> : null}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
                  </>
                );
                return href ? (
                  <Link
                    key={title}
                    href={href}
                    className="rounded-xl border border-gray-200 bg-white p-5 hover:border-gray-300 transition-colors block"
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
        ))}
      </div>

      {/* CTA */}
      <div className="mt-16 pt-10 border-t border-gray-200 flex flex-wrap gap-3">
        <Link
          href={appHref('/?view=register&utm_source=marketing-site&utm_medium=platform-overview')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg mkt-btn-primary font-medium"
        >
          Gratis proberen <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/marketing/pricing"
          className="inline-flex items-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
        >
          Bekijk prijzen
        </Link>
        <TrialNote />
      </div>
    </div>
  );
}
