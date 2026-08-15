// =============================================================
// Marketing-site layout — wraps homepage / pricing / features /
// about / contact. Marketing draait op de apex (branddock.app),
// de app op app.branddock.app (zie host-router + custom-domain runbook).
// NL-first (website-verbeterplan v2).
// =============================================================

import type { Metadata } from 'next';
import MarketingNav from './MarketingNav';
import MarketingFooter from './MarketingFooter';
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
      <MarketingJsonLd />
    </div>
  );
}

function MarketingJsonLd() {
  return (
    <>
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
