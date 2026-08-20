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
  alternates: { canonical: '/marketing/platform' },
  title: 'Platform',
  description:
    'Eén merkplatform: merk-DNA, onderzoek, content, campagnes, beeld en AI-agents, met een merk-check op elke output.',
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
  modules: Module[];
}

const GROUPS: Group[] = [
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
        href: '/marketing/features/brand-voice',
      },
      {
        Icon: Palette,
        title: 'Brand voice & stijl',
        desc: 'De merkstem en visuele stijl, uit jouw materiaal, herbruikbaar in elke output.',
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
    title: 'Onderzoek: ken je markt',
    intro: 'Persona’s, concurrenten en trends: je merk-DNA staat niet op giswerk.',
    grad: 'var(--g-cool)',
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
        desc: 'Een trendscan die kansen en signalen in je markt oppikt, met bronnen.',
        href: '/marketing/features/trend-radar',
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
        title="Eén merkplatform, van fundament tot bewaking"
        lead="Alles draait op hetzelfde merk-DNA: leg je merk één keer vast, onderzoek je markt, genereer on-brand en laat agents het bewaken."
        className="mb-14"
      />

      {/* Stepper: de 4 stappen van de merk-loop lopen na elkaar, met een
          genummerde rail + doorlopende lijn zodat de volgorde zichtbaar is
          i.p.v. losse blokken (besluit Erik: geen productshots meer, wél de
          stap-voor-stap-opbouw benadrukken). */}
      <div>
        {GROUPS.map((group, i) => {
          const isLast = i === GROUPS.length - 1;
          return (
            <section key={group.key} className="flex gap-5 md:gap-8">
              {/* Rail: nummer-cirkel + lijn naar de volgende stap. De lijn is
                  een flex-child die de resthoogte van de rij opvult, dus hij
                  loopt vanzelf door tot precies waar de volgende cirkel begint. */}
              <div className="flex flex-col items-center flex-shrink-0" style={{ width: '2.75rem' }} aria-hidden>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ background: group.grad }}
                >
                  {i + 1}
                </div>
                {!isLast && <div className="w-px flex-1 mt-2" style={{ background: '#e5e7eb', minHeight: '2rem' }} />}
              </div>

              <div className={`flex-1 min-w-0 ${isLast ? '' : 'pb-14'}`}>
                <span className="sr-only">{group.label}: </span>
                <h2 className="text-gray-900 mb-2">{group.title}</h2>
                <p className="text-gray-600 max-w-2xl mb-6">{group.intro}</p>
                {/* UX-15: kolommen per module-aantal — geen orphan-rijen (4 → 2x2, 2 → 2 breed). */}
                <div className={`grid gap-4 ${group.modules.length === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'}`}>
                  {group.modules.map(({ Icon, title, desc, href }) => {
                    const card = (
                      <>
                        <div className="mkt-tile mb-3">
                          <Mosaic
                            id={`tile-${group.key}-${title}`}
                            cols={2}
                            rows={2}
                            palette={[['#343CED', '#07E5AB']]}
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
              </div>
            </section>
          );
        })}
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
