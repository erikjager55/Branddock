// =============================================================
// Marketing-site layout — wraps homepage / pricing / features /
// about / contact. Marketing draait op de apex (branddock.app),
// de app op app.branddock.app (zie host-router + custom-domain runbook).
// NL-first (website-verbeterplan v2).
// =============================================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { appHref } from './app-url';
import { PLAN_CONFIGS } from '@/lib/constants/plan-limits';
import './marketing.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://branddock.app'),
  // template: sub-pagina's zetten alleen hun eigen naam ('Prijzen' →
  // 'Prijzen — Branddock'); de homepage houdt de volledige default.
  title: {
    default: 'Branddock — Een AI-marketingteam dat je merk écht kent',
    template: '%s — Branddock',
  },
  description:
    'Negen AI-agents onderzoeken, adviseren en maken op jouw merk-DNA — met een meetbare merk-check (F-VAL) op elke uiting. Werkt in Branddock, in Claude en ChatGPT.',
  icons: { icon: '/marketing/branddock-icon.svg' },
  openGraph: {
    title: 'Branddock — Een AI-marketingteam dat je merk écht kent',
    description:
      'AI-agents op jouw merk-DNA, met een meetbare merk-check (F-VAL) op elke uiting. Werkt in Branddock, in Claude en ChatGPT.',
    type: 'website',
    locale: 'nl_NL',
    siteName: 'Branddock',
    url: 'https://branddock.app',
    images: [{ url: '/marketing/og-image.png', width: 1200, height: 630, alt: 'Branddock' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Branddock',
    description: 'Een AI-marketingteam dat je merk écht kent',
    images: ['/marketing/og-image.png'],
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-root min-h-screen flex flex-col bg-white text-gray-900">
      {/* Merk-font Halyard via Adobe Fonts (Typekit); CSP staat use.typekit.net toe. */}
      <link rel="stylesheet" href="https://use.typekit.net/idv8cqe.css" />
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}

function MarketingNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/marketing" className="flex items-center" aria-label="Branddock">
          {/* eslint-disable-next-line @next/next/no-img-element -- statische SVG-merkasset */}
          <img src="/marketing/branddock-logo.svg" alt="Branddock" className="h-6 w-auto" />
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
          <Link href="/marketing/platform" className="hover:text-gray-900">
            Platform
          </Link>
          <Link href="/marketing/solutions/marketingteams" className="hover:text-gray-900">
            Oplossingen
          </Link>
          <Link href="/marketing/guardrails" className="hover:text-gray-900">
            Voor AI-agents
          </Link>
          <Link href="/marketing/pricing" className="hover:text-gray-900">
            Prijzen
          </Link>
          <Link href="/marketing/about" className="hover:text-gray-900">
            Over ons
          </Link>
          <Link href="/marketing/contact" className="hover:text-gray-900">
            Contact
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href={appHref('/?utm_source=marketing-site&utm_medium=nav-login')}
            className="hidden sm:inline text-sm text-gray-600 hover:text-gray-900"
          >
            Inloggen
          </Link>
          <Link
            href={appHref('/?utm_source=marketing-site&utm_medium=nav')}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Gratis proberen
          </Link>
        </div>
      </div>
    </header>
  );
}

function MarketingFooter() {
  return (
    <>
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          <div>
            <div className="font-semibold text-gray-900 mb-3">Platform</div>
            <ul className="space-y-1.5 text-gray-600">
              <li>
                <Link href="/marketing/platform" className="hover:text-gray-900">
                  Platform-overzicht
                </Link>
              </li>
              <li>
                <Link href="/marketing/features/brand-voice" className="hover:text-gray-900">
                  Merk-DNA &amp; brand voice
                </Link>
              </li>
              <li>
                <Link href="/marketing/features/content-canvas" className="hover:text-gray-900">
                  Content Canvas
                </Link>
              </li>
              <li>
                <Link href="/marketing/features/brand-alignment" className="hover:text-gray-900">
                  Merk-check
                </Link>
              </li>
              <li>
                <Link href="/marketing/resources/f-val" className="hover:text-gray-900">
                  F-VAL uitgelegd
                </Link>
              </li>
              <li>
                <Link href="/marketing/features/agents" className="hover:text-gray-900">
                  AI-agents
                </Link>
              </li>
              <li>
                <Link href="/marketing/features/personas" className="hover:text-gray-900">
                  Persona’s
                </Link>
              </li>
              <li>
                <Link href="/marketing/features/trend-radar" className="hover:text-gray-900">
                  Trend Radar
                </Link>
              </li>
              <li>
                <Link href="/marketing/features/campaigns" className="hover:text-gray-900">
                  Campagnes
                </Link>
              </li>
              <li>
                <Link href="/marketing/guardrails" className="hover:text-gray-900">
                  Voor AI-agents
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-gray-900 mb-3">Bedrijf</div>
            <ul className="space-y-1.5 text-gray-600">
              <li>
                <Link href="/marketing/about" className="hover:text-gray-900">
                  Over ons
                </Link>
              </li>
              <li>
                <Link href="/marketing/pricing" className="hover:text-gray-900">
                  Prijzen
                </Link>
              </li>
              <li>
                <Link href="/marketing/changelog" className="hover:text-gray-900">
                  Changelog
                </Link>
              </li>
              <li>
                <Link href="/marketing/contact" className="hover:text-gray-900">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-gray-900 mb-3">Oplossingen</div>
            <ul className="space-y-1.5 text-gray-600">
              <li>
                <Link href="/marketing/solutions/marketingteams" className="hover:text-gray-900">
                  Voor marketingteams
                </Link>
              </li>
              <li>
                <Link href="/marketing/solutions/bureaus" className="hover:text-gray-900">
                  Voor bureaus
                </Link>
              </li>
            </ul>
            <div className="font-semibold text-gray-900 mt-6 mb-3">Vergelijk</div>
            <ul className="space-y-1.5 text-gray-600">
              <li>
                <Link href="/marketing/vergelijk/jasper" className="hover:text-gray-900">
                  vs. AI-schrijftools (Jasper)
                </Link>
              </li>
              <li>
                <Link href="/marketing/vergelijk/chatgpt" className="hover:text-gray-900">
                  vs. losse ChatGPT
                </Link>
              </li>
              <li>
                <Link href="/marketing/vergelijk/social-schedulers" className="hover:text-gray-900">
                  vs. social-schedulers
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-gray-900 mb-3">Contact</div>
            <ul className="space-y-1.5 text-gray-600">
              <li>
                <a href="mailto:hello@branddock.com" className="hover:text-gray-900">
                  hello@branddock.com
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-200 px-6 py-4 max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element -- statische SVG-merkasset */}
          <img src="/marketing/branddock-logo.svg" alt="Branddock" className="h-5 w-auto opacity-80" />
          <div className="text-xs text-gray-500">
            © {new Date().getFullYear()} Branddock. Alle rechten voorbehouden.
          </div>
        </div>
      </footer>

      {/* Schema.org JSON-LD (SEO): Organization + WebSite + Product. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Organization',
                name: 'Branddock',
                url: 'https://branddock.app',
              },
              {
                '@type': 'WebSite',
                name: 'Branddock',
                url: 'https://branddock.app',
              },
              {
                '@type': 'Product',
                name: 'Branddock',
                description:
                  'Een AI-marketingteam op jouw merk-DNA: onderzoek, content, campagnes en beeld — met een merk-check (F-VAL) op elke output.',
                // Prijzen uit PLAN_CONFIGS — zelfde bron als de pricing-pagina,
                // zodat de JSON-LD nooit meer kan driften (P4.2).
                offers: (['STARTER', 'GROWTH', 'AGENCY'] as const).map((tier) => ({
                  '@type': 'Offer',
                  name: PLAN_CONFIGS[tier].name,
                  price: String(PLAN_CONFIGS[tier].monthlyPriceEur),
                  priceCurrency: 'EUR',
                })),
              },
            ],
          }),
        }}
      />
    </>
  );
}
