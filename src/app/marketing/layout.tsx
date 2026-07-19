// =============================================================
// Marketing-site layout — wraps homepage / pricing / features /
// about / contact. Marketing draait op de apex (branddock.app),
// de app op app.branddock.app (zie host-router + custom-domain runbook).
// NL-first (website-verbeterplan v2).
// =============================================================

import type { Metadata } from 'next';
import Link from 'next/link';
import MarketingNav from './MarketingNav';
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
      {/* UX-18: skip-link als eerste focusbare element. */}
      <a href="#mkt-main" className="mkt-skip">
        Naar inhoud
      </a>
      <MarketingNav />
      <main id="mkt-main" className="flex-1">
        {children}
      </main>
      <MarketingFooter />
    </div>
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
                <Link href="/marketing/voor-ai-agents" className="hover:text-gray-900">
                  Voor AI-agents
                </Link>
              </li>
              <li>
                <Link href="/marketing/voor-ai-agents#api" className="hover:text-gray-900">
                  Voor developers (API)
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
            <div className="font-semibold text-gray-900 mb-3">Contact &amp; juridisch</div>
            <ul className="space-y-1.5 text-gray-600">
              <li>
                <a href="mailto:hello@branddock.com" className="hover:text-gray-900">
                  hello@branddock.com
                </a>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/company/branddock"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gray-900"
                >
                  LinkedIn
                </a>
              </li>
              {/* UX-05: juridische basis — pagina's zijn CONCEPT (review Erik, PR #161). */}
              <li>
                <Link href="/marketing/security" className="hover:text-gray-900">
                  Security &amp; AVG
                </Link>
              </li>
              <li>
                <Link href="/marketing/privacy" className="hover:text-gray-900">
                  Privacyverklaring
                </Link>
              </li>
              <li>
                <Link href="/marketing/terms" className="hover:text-gray-900">
                  Algemene voorwaarden
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-200 px-6 py-4 max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element -- statische SVG-merkasset */}
          <img src="/marketing/branddock-logo.svg" alt="Branddock" className="h-5 w-auto opacity-80" />
          <div className="text-xs text-gray-500">
            {/* TODO(Erik): KvK-nummer aanvullen zodra aangeleverd (UX-05/UX-20). */}
            © {new Date().getFullYear()} Branddock · een product van BetterBrands B.V. · Alle
            rechten voorbehouden.
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
