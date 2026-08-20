// Publieke changelog (P1.2) — const-array-patroon, consistent met de rest van
// de marketing-site (geen MDX). Klanttaal, nieuwste eerst. Dit is de vaste bron
// voor de LinkedIn-cadans (P1.1): nieuwe release = nieuwe entry hier.

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { appHref } from '../app-url';
import SplitHeader from '../SplitHeader';
import TrialNote from '../TrialNote';

export const metadata: Metadata = {
  alternates: { canonical: '/marketing/changelog' },
  title: 'Changelog',
  description:
    'Wat er nieuw is in Branddock: nieuwe features, koppelingen en verbeteringen, in gewone taal.',
};

interface ChangelogEntry {
  /** Weergavedatum, bijv. "18 juli 2026". */
  date: string;
  title: string;
  /** Klanttaal-omschrijving: wat kun je er nu mee. */
  body: string;
  tag?: string;
  /** Optionele verdiepingslink, bijv. naar een uitleg-pagina. */
  href?: string;
  linkLabel?: string;
}

const ENTRIES: ChangelogEntry[] = [
  {
    date: '18 augustus 2026',
    title: 'Content die leeg leek, is weer zichtbaar',
    body:
      'Lange pagina’s en GEO-artikelen kwamen via de API, de MCP-connector en de ZIP-export als leeg item terug, terwijl de tekst er gewoon stond. Dat is opgelost: 13 opgeslagen pagina’s die 0 woorden gaven, leveren er nu 497 tot 1.306. De ZIP-export deed dit voor élk content-type.',
    tag: 'Content',
  },
  {
    date: '18 augustus 2026',
    title: 'Gepubliceerde pagina’s hebben weer een titel',
    body:
      'Pagina’s uit de webpage-builder gingen zonder titel en zonder meta-omschrijving live: naamloos in elk zoekresultaat, elke browsertab en elke gedeelde link. Ze halen de titel nu uit je eigen H1, dus ook zonder ingevulde SEO-checklist staat er iets zinnigs.',
    tag: 'Content',
  },
  {
    date: '18 augustus 2026',
    title: 'Weglopen tijdens een generatie kost je niets meer',
    body:
      'Verliet je de Canvas terwijl er varianten werden gemaakt, dan liep de generatie op de achtergrond door tot het einde. Nu stopt hij. Een tabwissel breekt bewust níet af, want dan zou je net betaalde varianten kwijtraken.',
    tag: 'Facturering',
  },
  {
    date: '17 augustus 2026',
    title: 'Campagnewizard levert weer complete campagnes',
    body:
      'Achter de briefing-gate zaten vijf fouten. "Approve Concept" gaf een campagne zonder AI-deliverables, stap 4 faalde stil, en de briefing-score wees je naar het verkeerde veld. Dezelfde wizard en briefing geven nu 8 deliverables in plaats van 1, en de doorlooptijd ging van 18-24 minuten naar 6.',
    tag: 'Campagnes',
  },
  {
    date: '15 augustus 2026',
    title: 'Je merkregels tellen mee in de merk-check',
    body:
      'Regels uit je styleguide bereikten de regel-pijler van F-VAL niet, waardoor een deel van je merkafspraken niet werd getoetst. Dat is aangesloten. Overtredingen leveren nu ook curatie-suggesties op, zodat je bibliotheek leert van haar eigen gebruik.',
    tag: 'Merk-check',
  },
  {
    date: '12 augustus 2026',
    title: 'Gratis brand.md-generator',
    body:
      'Plak je URL en je krijgt je brand.md: een bestand dat je merk beschrijft en dat je zelf meeneemt naar ChatGPT, Claude, Cursor of welke AI-tool dan ook. Open standaard, gratis, geen account nodig. Wat een scan niet kan bevestigen, staat er eerlijk als onbevestigd bij. Let op het verschil met de MCP-connector hieronder: dat is een live koppeling naar je merk in Branddock, dit is een los bestand dat je overal kunt plakken.',
    tag: 'brand.md',
    href: '/marketing/resources/brand-md',
    linkLabel: 'Lees wat brand.md is',
  },
  {
    date: '18 juli 2026',
    title: 'Branddock in Claude en ChatGPT',
    body: 'Koppel Branddock als connector via branddock.app/mcp: log in met je Branddock-account en je agent haalt je merk lévend op, dus altijd de actuele versie in plaats van een gedownload bestand. 17 tools voor merkcontext, F-VAL-validatie en on-brand generatie. Gegenereerd werk landt gescoord in je library.',
    tag: 'Koppelingen',
  },
  {
    date: '18 juli 2026',
    title: 'Browser-extensie: Branddock Everywhere (beta)',
    body: 'Herschrijf of beoordeel tekst in je merkstem, overal waar je schrijft: LinkedIn, e-mail, je CMS. Nu in beta; publicatie in de Web Store volgt.',
    tag: 'Koppelingen',
  },
  {
    date: '17 juli 2026',
    title: 'Brand Assistant maakt content-items direct aan',
    body: 'Vraag de Brand Assistant om een content-item en hij zet het meteen voor je klaar: van idee naar concept zonder de chat te verlaten.',
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
    body: 'Een merk of klant wisselt van naam? Hernoem de workspace gewoon, alles blijft staan.',
    tag: 'Platform',
  },
  {
    date: '17 juli 2026',
    title: 'Facturering toont je echte cijfers',
    body: 'Settings → Facturering laat exact je plan, credits en verbruik zien, uit dezelfde bron als de prijzenpagina, dus altijd kloppend.',
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
        lead="Wat er nieuw is in Branddock, in gewone taal en nieuwste eerst."
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
            {entry.href ? (
              <p className="mt-3 text-sm">
                <Link
                  href={entry.href}
                  className="mkt-accent underline underline-offset-2 font-medium"
                >
                  {entry.linkLabel ?? 'Lees meer'}
                </Link>
              </p>
            ) : null}
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
        <TrialNote />
      </div>
    </div>
  );
}
