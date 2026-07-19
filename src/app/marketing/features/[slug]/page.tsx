// Feature deep-dive pages — één bestand voor alle 4 features via [slug]. NL-first (Fase 2).

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { appHref } from '../../app-url';
import SplitHeader, { type SplitHeaderFamily } from '../../SplitHeader';
import type { Metadata } from 'next';

interface FeatureSpec {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  bullets: string[];
  screenshotPath: string | null;
}

const FEATURES: Record<string, FeatureSpec> = {
  'brand-voice': {
    slug: 'brand-voice',
    title: 'Brand Voice die écht klopt',
    tagline: 'Bouw je brand voice uit voorbeeldteksten — geen generieke prompts.',
    description:
      'Branddock leert je brand voice uit een voiceguide, voorbeeldteksten of allebei. Elke generatie wordt getoetst aan die basis — niet aan “klinkt het in het algemeen goed”.',
    bullets: [
      'Voiceguide-extractie uit 3 voorbeeldteksten in 5 minuten',
      'Voice-similariteitsscore per gegenereerde variant (W-1-full embedding)',
      'STRICT-mode herschrijft anti-AI-tells op verzoek',
      'Eigen drempels per contenttype (blog vs LinkedIn vs e-mail)',
    ],
    screenshotPath: '/marketing/features/brand-voice.png',
  },
  'content-canvas': {
    slug: 'content-canvas',
    title: 'Content Canvas — 25+ contenttypes',
    tagline: 'Van blogpost tot landingspagina tot LinkedIn-ad — één canvas, alle formats.',
    description:
      'Briefing erin, on-brand content eruit, met automatische kwaliteitscontroles bij elke stap. Multivariate output, deterministische property-checks en een merk-check (F-VAL) op elke variant — plus volledige webpagina’s en SEO/GEO-longform met een visuele page-builder.',
    bullets: [
      '25+ contenttypes, van blog en social tot ads, landingspagina’s en SEO/GEO-longform',
      'Multivariate output: meerdere invalshoeken + 1 voorkeursvariant per generatie',
      'Deterministische property-checks per variant (placeholders, PII, verboden zinnen, claims)',
      'Visuele page-builder met publiceerbare pagina’s op je eigen URL',
      'Auto-iteratie: bij een score onder de drempel een automatische, feedback-gedreven herschrijving',
    ],
    screenshotPath: '/marketing/features/content-canvas.png',
  },
  'brand-alignment': {
    slug: 'brand-alignment',
    title: 'Merk-check & inzichten',
    tagline: 'Zie waaróm content scoort zoals het scoort.',
    description:
      'Geen black box: per generatie een uitsplitsing van stijl-fit / merk-judge / regel-compliance. Bevindingen worden gecategoriseerd in VOICE / TERMINOLOGIE / CLAIMS / STIJL / BUSINESS / AI-TELL, met severity en concrete suggesties.',
    bullets: [
      '3-pijler F-VAL-score: stijl (35%) / judge (45%) / rules (20%)',
      'Categorisering van bevindingen met HOOG/MIDDEN/LAAG severity',
      'Compliance-dimensie: onderbouwing van claims + sectorspecifieke risicoflags',
      '30-daags trend-dashboard met slagingspercentage per contenttype',
      'Edit-distance-signaal voor het regressie-corpusfilter',
    ],
    screenshotPath: '/marketing/features/brand-alignment.png',
  },
  'agents': {
    slug: 'agents',
    title: 'AI-agents die je merk kennen',
    tagline: 'Negen specialisten — van onderzoek en strategie tot wekelijkse rapporten en 24/7-watchdogs.',
    description:
      'Branddock-agents doen echt werk bovenop je merk-DNA: marktonderzoek met bronnen, strategiefundamenten, contentvoorstellen, merk-checks en data-analyse. Elke agent stelt voor — jij keurt goed. Niets gaat live zonder jou.',
    bullets: [
      'Research-analist: marktonderzoek met bronnen (web + peer-reviewed) in je kennisbibliotheek',
      'Strateeg & contentmaker: strategiefundamenten en contentvoorstellen via de merk-gevalideerde pipeline',
      'Merk-bewaker: onafhankelijke merk-checks (F-VAL) op elke tekst',
      'Rapportage-analist: een klant-klaar wekelijks merkrapport, op schema',
      'SEO/GEO- & ads-watchdogs: signalen over content-veroudering en ad-moeheid, met verversvoorstellen',
      'Markt- & data-analisten: concurrentbewegingen en je eigen productiecijfers',
      'Human-in-the-loop by design: agents stellen voor, jij bevestigt',
    ],
    screenshotPath: '/marketing/features/agents.png',
  },
  'personas': {
    slug: 'personas',
    title: 'Persona’s die je doelgroep echt raken',
    tagline: 'Onderbouwde doelgroep-persona’s — en een chat om mee te sparren.',
    description:
      'Bouw persona’s op basis van onderzoek, niet onderbuik. Elke persona voedt je merk-DNA en je content: toon, pijnpunten en drijfveren kloppen. Spar direct met een persona in de persona-chat.',
    bullets: [
      'Persona’s uit onderzoek, gekoppeld aan je merk-DNA',
      'Persona-chat: test een boodschap direct tegen je doelgroep',
      'Pijnpunten, drijfveren en bezwaren per persona',
      'In elke generatie meegewogen — content die de juiste snaar raakt',
    ],
    screenshotPath: '/marketing/features/personas.png',
  },
  'trend-radar': {
    slug: 'trend-radar',
    title: 'Trend Radar — kansen vóór je concurrent',
    tagline: 'Een trendscan die signalen in je markt oppikt.',
    description:
      'Branddock scant je markt op opkomende thema’s, gesprekken en kansen — met bronnen. Van signaal naar contentkans, gekoppeld aan je merk-DNA en persona’s, zodat je meebeweegt zonder je merk te verliezen.',
    bullets: [
      'Trendscan met bronnen (web + wetenschappelijk)',
      'Signalen vertaald naar concrete contentkansen',
      'Gekoppeld aan je merk-DNA en persona’s',
      'Van radar naar campagne in één beweging',
    ],
    screenshotPath: '/marketing/features/trend-radar.png',
  },
  'campaigns': {
    slug: 'campaigns',
    title: 'Campagnes — van strategie tot deliverables',
    tagline: 'Bouw een campagnestrategie en zet ’m om in concrete content.',
    description:
      'De Campaign Strategy Builder maakt een strategisch blueprint — doel, boodschap, architectuur, kanalen en assets — en levert het warm over aan content-generatie. Alles op je merk-DNA, van strategie tot uitvoering.',
    bullets: [
      'Strategisch blueprint: doel, boodschap, architectuur, kanalen',
      'Warm handover naar content-generatie per asset',
      'Kanaalplan én asset-plan uit één strategie',
      'On-brand van eerste idee tot laatste post',
    ],
    screenshotPath: '/marketing/features/campaigns.png',
  },
};

// Kleur-familie per feature (compositie-herziening H2): brand-alignment is
// het merk-check-"bewijs", de rest is de productfamilie (blauw/mint).
const FEATURE_FAMILY: Record<string, SplitHeaderFamily> = {
  'brand-voice': 'product',
  'content-canvas': 'product',
  'brand-alignment': 'proof',
  agents: 'product',
  personas: 'product',
  'trend-radar': 'product',
  campaigns: 'product',
};

export function generateStaticParams() {
  return Object.keys(FEATURES).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const feature = FEATURES[slug];
  if (!feature) return { title: 'Feature niet gevonden — Branddock' };
  return {
    title: `${feature.title} — Branddock`,
    description: feature.tagline,
  };
}

export default async function FeaturePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const feature = FEATURES[slug];
  if (!feature) notFound();

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <SplitHeader
        id={`feat-${feature.slug}`}
        family={FEATURE_FAMILY[feature.slug] ?? 'product'}
        eyebrow="Platform"
        title={feature.title}
        lead={feature.tagline}
        className="mb-10"
      />

      {feature.screenshotPath ? (
        <div className="mb-10 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
          {/* eslint-disable-next-line @next/next/no-img-element -- statische marketing-asset, geen next/image-optimalisatie nodig */}
          <img
            src={feature.screenshotPath}
            alt={`${feature.title} — productschermafbeelding`}
            className="w-full h-auto"
          />
        </div>
      ) : null}

      <p className="text-gray-700 text-lg mb-8 leading-relaxed">{feature.description}</p>

      <h2 className="text-gray-900 mb-4">Wat je krijgt</h2>
      <ul className="space-y-3 mb-12">
        {feature.bullets.map((b) => (
          <li key={b} className="flex items-start gap-3 text-gray-700">
            <span className="text-primary mt-1">→</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <div className="pt-8 border-t border-gray-200 flex flex-wrap gap-3">
        <Link
          href={appHref(`/?view=register&utm_source=marketing-site&utm_medium=feature-${feature.slug}`)}
          className="inline-flex items-center px-6 py-3 rounded-lg mkt-btn-primary font-medium"
        >
          Branddock proberen
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
