// Oplossingen-pagina's — per doelgroep (marketingteams primair, bureaus
// secundair). Eén bestand via [slug]. NL-first (Fase 2b).

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { appHref } from '../../app-url';
import SplitHeader from '../../SplitHeader';
import type { Metadata } from 'next';

interface SolutionSpec {
  slug: string;
  title: string;
  tagline: string;
  intro: string;
  pains: string[];
  gains: string[];
  screenshotPath?: string;
  screenshotAlt?: string;
  /** Smalle UI-detail-screenshot (bv. een dropdown) i.p.v. een volle app-schermafbeelding. */
  screenshotInset?: boolean;
}

const SOLUTIONS: Record<string, SolutionSpec> = {
  marketingteams: {
    slug: 'marketingteams',
    title: 'Voor in-house marketingteams',
    tagline: 'Schaal je content zonder je merk te verwateren.',
    intro:
      'Jij bent verantwoordelijk voor volume én merk. Branddock geeft je één platform dat je merk kent en het hele werk doet — van onderzoek tot content, campagnes en beeld — zodat je sneller publiceert zonder de eindeloze rework.',
    screenshotPath: '/marketing/features/brand-alignment.png',
    screenshotAlt: 'Branddock merk-check — een meetbare on-brand-score per generatie',
    pains: [
      'AI-output klinkt generiek en moet je telkens “humaniseren”',
      'Merkrichtlijnen leven in een PDF die niemand opent',
      'Losse tools voor tekst, beeld en campagnes die niet samenwerken',
      'Merkconsistentie bewijzen aan je stakeholders is giswerk',
    ],
    gains: [
      'Eén merk-DNA dat in elke generatie meegaat — per constructie on-brand',
      'Content, campagnes en beeld uit één plek, over alle kanalen',
      'Een merk-check die consistentie meetbaar maakt (+7 punten on-brand)',
      '9 agents die onderzoek, content en bewaking uit handen nemen',
    ],
  },
  bureaus: {
    slug: 'bureaus',
    title: 'Voor bureaus & merk-consultants',
    tagline: 'Eén merk-DNA-workspace per klant.',
    intro:
      'Elke klant heeft een eigen merk. Met Branddock beheer je meerdere klantmerken naast elkaar — elk met een eigen merk-DNA — en lever je aantoonbaar on-brand werk, sneller en met marge.',
    pains: [
      'Elk klantmerk opnieuw aanleren kost tijd',
      'Junior-output dwaalt af van de merkstem',
      '“Dit is on-brand” bewijzen aan de klant blijft subjectief',
      'Meerdere merksystemen naast elkaar beheren is rommelig',
    ],
    gains: [
      'Een aparte merk-DNA-workspace per klantmerk',
      'Multi-workspace-beheer voor je hele portfolio',
      'Een merk-check als objectief on-brand-bewijs richting de klant',
      'Snellere levering met minder rework — beter voor je marge',
    ],
    screenshotPath: '/marketing/solutions/bureaus-workspaces.png',
    screenshotAlt: 'Branddock workspace-switcher — meerdere klantmerken naast elkaar beheren',
    screenshotInset: true,
  },
};

export function generateStaticParams() {
  return Object.keys(SOLUTIONS).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const solution = SOLUTIONS[slug];
  if (!solution) return { title: 'Oplossing niet gevonden — Branddock' };
  return {
    title: `${solution.title} — Branddock`,
    description: solution.tagline,
  };
}

export default async function SolutionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const solution = SOLUTIONS[slug];
  if (!solution) notFound();

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <SplitHeader
        id={`sol-${solution.slug}`}
        family="people"
        eyebrow="Oplossingen"
        title={solution.title}
        lead={solution.tagline}
        className="mb-10"
      />

      <p className="text-gray-700 text-lg mb-8 leading-relaxed max-w-2xl">{solution.intro}</p>

      {solution.screenshotPath ? (
        solution.screenshotInset ? (
          <div className="mb-12 rounded-xl border border-gray-200 bg-gray-50 p-8 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- statische marketing-asset, geen next/image-optimalisatie nodig */}
            <img
              src={solution.screenshotPath}
              alt={solution.screenshotAlt ?? `${solution.title} — productschermafbeelding`}
              className="w-full max-w-xs h-auto rounded-lg border border-gray-200 shadow-sm"
            />
          </div>
        ) : (
          <div className="mb-12 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element -- statische marketing-asset, geen next/image-optimalisatie nodig */}
            <img
              src={solution.screenshotPath}
              alt={solution.screenshotAlt ?? `${solution.title} — productschermafbeelding`}
              className="w-full h-auto"
            />
          </div>
        )
      ) : null}

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
          <h2 className="text-gray-900 text-lg font-semibold mb-4">Herkenbaar?</h2>
          <ul className="space-y-3">
            {solution.pains.map((p) => (
              <li key={p} className="flex items-start gap-3 text-sm text-gray-600">
                <span className="text-gray-400 mt-0.5 shrink-0">—</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-primary/30 bg-white p-6">
          <h2 className="text-gray-900 text-lg font-semibold mb-4">Wat Branddock je geeft</h2>
          <ul className="space-y-3">
            {solution.gains.map((g) => (
              <li key={g} className="flex items-start gap-3 text-sm text-gray-700">
                <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="pt-8 border-t border-gray-200 flex flex-wrap gap-3">
        <Link
          href={appHref(`/?view=register&utm_source=marketing-site&utm_medium=solution-${solution.slug}`)}
          className="inline-flex items-center px-6 py-3 rounded-lg mkt-btn-primary font-medium"
        >
          Gratis proberen
        </Link>
        <Link
          href="/marketing/pricing"
          className="inline-flex items-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
        >
          Bekijk prijzen
        </Link>
      </div>
    </div>
  );
}
