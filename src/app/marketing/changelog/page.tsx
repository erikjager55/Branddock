// Publieke changelog (P1.2) — const-array-patroon, consistent met de rest van
// de marketing-site (geen MDX). Klanttaal, nieuwste eerst. Dit is de vaste bron
// voor de LinkedIn-cadans (P1.1): nieuwe release = nieuwe entry hier.

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { appHref } from '../app-url';
import SplitHeader from '../SplitHeader';

export const metadata: Metadata = {
  title: 'Changelog',
  description:
    'Wat er nieuw is in Branddock — nieuwe features, koppelingen en verbeteringen, in gewone taal.',
};

interface ChangelogEntry {
  /** Weergavedatum, bijv. "18 juli 2026". */
  date: string;
  title: string;
  /** Klanttaal-omschrijving: wat kun je er nu mee. */
  body: string;
  tag?: string;
}

const ENTRIES: ChangelogEntry[] = [
  {
    date: '18 juli 2026',
    title: 'Branddock in Claude en ChatGPT',
    body: 'Koppel Branddock als connector via branddock.app/mcp: log in met je Branddock-account en je agent kent je merk. 17 tools voor merkcontext, F-VAL-validatie en on-brand generatie — gegenereerd werk landt gescoord in je library.',
    tag: 'Koppelingen',
  },
  {
    date: '18 juli 2026',
    title: 'Browser-extensie: Branddock Everywhere (beta)',
    body: 'Herschrijf of beoordeel tekst in je merkstem, overal waar je schrijft — LinkedIn, e-mail, je CMS. Nu in beta; publicatie in de Web Store volgt.',
    tag: 'Koppelingen',
  },
  {
    date: '17 juli 2026',
    title: 'Brand Assistant maakt content-items direct aan',
    body: 'Vraag de Brand Assistant om een content-item en hij zet het meteen voor je klaar — van idee naar concept zonder de chat te verlaten.',
    tag: 'Assistant',
  },
  {
    date: '17 juli 2026',
    title: 'Publieke API met API-keys-beheer',
    body: 'Maak API-keys aan in Settings en bouw je eigen integraties op de Brand-API: merkcontext ophalen, teksten valideren en on-brand genereren vanuit je eigen tools.',
    tag: 'Platform',
  },
  {
    date: '17 juli 2026',
    title: 'Workspaces hernoemen',
    body: 'Een merk of klant wisselt van naam? Hernoem de workspace gewoon — alles blijft staan.',
    tag: 'Platform',
  },
  {
    date: '17 juli 2026',
    title: 'Facturering toont je echte cijfers',
    body: 'Settings → Facturering laat exact je plan, credits en verbruik zien — uit dezelfde bron als de prijzenpagina, dus altijd kloppend.',
    tag: 'Facturering',
  },
  {
    date: '15 juli 2026',
    title: 'Je AI-team is compleet: 9 agents',
    body: 'Van research-analist tot ads-watchdog: negen agents met eigen rollen signaleren, adviseren en leveren concepten in je inbox. Jij keurt goed.',
    tag: 'Agents',
  },
  {
    date: 'juni 2026',
    title: 'Web-page-builder en GEO-longform',
    body: 'Bouw en publiceer complete on-brand webpagina’s op je eigen URL, en schrijf long-form content die ook door AI-zoekmachines gevonden wordt (GEO).',
    tag: 'Content',
  },
];

export default function ChangelogPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <SplitHeader
        id="changelog-hero"
        family="product"
        eyebrow="Updates"
        title="Changelog"
        lead="Wat er nieuw is in Branddock — in gewone taal, nieuwste eerst."
        className="mb-12"
      />

      <div className="space-y-6">
        {ENTRIES.map((entry) => (
          <article
            key={`${entry.date}-${entry.title}`}
            className="rounded-xl border border-gray-200 bg-white p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <time className="text-xs font-medium text-gray-500 tabular-nums">{entry.date}</time>
              {entry.tag ? (
                <span className="text-xs font-semibold mkt-accent uppercase tracking-wide">
                  {entry.tag}
                </span>
              ) : null}
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{entry.title}</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{entry.body}</p>
          </article>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t border-gray-200 flex flex-wrap gap-3">
        <Link
          href={appHref('/?view=register&utm_source=marketing-site&utm_medium=changelog')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg mkt-btn-primary font-medium"
        >
          Probeer het nieuwste zelf <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/marketing/platform"
          className="inline-flex items-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
        >
          Bekijk het platform
        </Link>
      </div>
    </div>
  );
}
