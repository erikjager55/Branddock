// Security & AVG — gebaseerd op verifieerbare feiten uit de codebase/infra
// (Vercel fra1, token-encryptie, CSP, sub-verwerkers uit de dependencies).
// ⚠️ CONCEPT: items gemarkeerd met "wordt bevestigd" wachten op Eriks
// verificatie (o.a. Neon-regio, DPA-status) — PR niet mergen zonder review.

import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, Lock, Server, Eye, FileCheck, ArrowRight } from 'lucide-react';
import { appHref } from '../app-url';

export const metadata: Metadata = {
  title: 'Security & AVG — Branddock',
  description:
    'Hoe Branddock met je data omgaat: EU-hosting, versleuteling, AVG-uitgangspunten en een transparante lijst van sub-verwerkers.',
};

const PRACTICES = [
  {
    Icon: Server,
    title: 'EU-hosting',
    body: 'De applicatie draait op Vercel in regio Frankfurt (fra1). De database draait bij Neon in een EU-regio (exacte regio wordt bevestigd).',
  },
  {
    Icon: Lock,
    title: 'Versleuteling',
    body: 'Al het verkeer loopt over TLS (HSTS, 2 jaar, preload). Gekoppelde OAuth-tokens (bv. ad-accounts) worden versleuteld opgeslagen met een aparte sleutel, gescheiden van de database-credentials.',
  },
  {
    Icon: ShieldCheck,
    title: 'Hardening',
    body: 'Strikte Content-Security-Policy, security-headers op elke response, input-sanitisatie en bestandsvalidatie. Betalingen raken onze servers niet: die lopen volledig via Stripe.',
  },
  {
    Icon: Eye,
    title: 'Je merk-DNA blijft van jou',
    body: 'Je merkdata wordt gebruikt om jóúw content te genereren — niet om modellen van derden te trainen. AI-verzoeken lopen server-side; je browser praat nooit rechtstreeks met AI-providers.',
  },
  {
    Icon: FileCheck,
    title: 'Toegang & rollen',
    body: 'Multi-tenant isolatie per organisatie en workspace, met vier rollen (owner, admin, member, viewer). Sessies en authenticatie via een modern, open-source auth-framework.',
  },
];

// Sub-verwerkers — afgeleid uit de daadwerkelijke integraties in de codebase.
const SUBPROCESSORS: { name: string; purpose: string; region: string }[] = [
  { name: 'Vercel', purpose: 'Hosting & CDN', region: 'EU (Frankfurt, fra1)' },
  { name: 'Neon', purpose: 'PostgreSQL-database', region: 'EU (regio wordt bevestigd)' },
  { name: 'Anthropic', purpose: 'AI-tekstgeneratie (Claude)', region: 'VS · server-side' },
  { name: 'OpenAI', purpose: 'AI-tekstgeneratie & embeddings', region: 'VS · server-side' },
  { name: 'Google', purpose: 'AI-analyse & beeld (Gemini)', region: 'VS/EU · server-side' },
  { name: 'fal.ai', purpose: 'AI-beeld- en videogeneratie', region: 'VS · server-side' },
  { name: 'ElevenLabs', purpose: 'Tekst-naar-spraak (brand voices)', region: 'VS · server-side' },
  { name: 'Stripe', purpose: 'Betalingen & facturatie', region: 'EU-entiteit, wereldwijd' },
  { name: 'Emailit', purpose: 'Transactionele e-mail', region: 'EU' },
  { name: 'Upstash', purpose: 'Redis (rate-limiting/queue)', region: 'EU' },
  { name: 'PostHog', purpose: 'Productanalytics', region: 'EU-cloud' },
  { name: 'Sentry', purpose: 'Foutmonitoring', region: 'EU/VS' },
  { name: 'Exa & Semantic Scholar', purpose: 'Research-bronnen (agents)', region: 'VS · server-side' },
];

export default function SecurityPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="mb-10 max-w-2xl">
        <div className="text-sm font-semibold mkt-accent uppercase tracking-wide mb-3">
          Security &amp; AVG
        </div>
        <h1 className="text-gray-900 mb-4">Jouw merkdata, serieus genomen</h1>
        <p className="text-xl text-gray-600">
          Branddock draait op EU-infrastructuur, versleutelt wat gevoelig is en is transparant over
          welke diensten we gebruiken — en waarvoor.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-14">
        {PRACTICES.map(({ Icon, title, body }) => (
          <div key={title} className="rounded-xl border border-gray-200 bg-white p-5">
            <div
              className="w-10 h-10 mb-3 rounded-xl flex items-center justify-center text-white"
              style={{ background: 'var(--g-brand)' }}
            >
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      <h2 className="text-gray-900 mb-2">AVG-uitgangspunten</h2>
      <ul className="space-y-2 mb-14 max-w-2xl text-gray-700 text-sm leading-relaxed list-disc pl-5">
        <li>
          Branddock (een product van BetterBrands B.V.) verwerkt persoonsgegevens als verwerker
          voor jouw workspace-data en als verwerkingsverantwoordelijke voor account- en
          factuurgegevens.
        </li>
        <li>
          Je kunt je data laten exporteren of verwijderen; bij het verwijderen van een workspace
          verdwijnt de bijbehorende merkdata uit de actieve database.
        </li>
        <li>
          Een verwerkersovereenkomst (DPA) is beschikbaar voor zakelijke klanten — neem contact op
          via{' '}
          <a href="mailto:hello@branddock.com" className="underline hover:text-gray-900">
            hello@branddock.com
          </a>
          .
        </li>
        <li>
          Vragen of een datalek melden? Mail{' '}
          <a href="mailto:hello@branddock.com" className="underline hover:text-gray-900">
            hello@branddock.com
          </a>{' '}
          — we reageren binnen 1 werkdag.
        </li>
      </ul>

      <h2 className="text-gray-900 mb-2">Sub-verwerkers</h2>
      <p className="text-gray-600 text-sm mb-4 max-w-2xl">
        Diensten die we gebruiken om Branddock te leveren. AI-verzoeken bevatten alleen de context
        die nodig is voor jouw generatie en lopen altijd server-side.
      </p>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-2.5 font-semibold">Dienst</th>
              <th className="px-4 py-2.5 font-semibold">Doel</th>
              <th className="px-4 py-2.5 font-semibold">Regio</th>
            </tr>
          </thead>
          <tbody>
            {SUBPROCESSORS.map((s) => (
              <tr key={s.name} className="border-t border-gray-200">
                <td className="px-4 py-2.5 font-medium text-gray-900">{s.name}</td>
                <td className="px-4 py-2.5 text-gray-600">{s.purpose}</td>
                <td className="px-4 py-2.5 text-gray-600">{s.region}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mb-14 max-w-2xl">
        Laatst bijgewerkt: juli 2026. Wijzigingen in deze lijst kondigen we aan via e-mail aan
        workspace-owners.
      </p>

      <div className="pt-8 border-t border-gray-200 flex flex-wrap gap-3">
        <Link
          href={appHref('/?utm_source=marketing-site&utm_medium=security')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-white font-medium hover:opacity-90"
        >
          Gratis proberen <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/marketing/privacy"
          className="inline-flex items-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
        >
          Privacyverklaring
        </Link>
      </div>
    </div>
  );
}
