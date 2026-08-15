// =============================================================
// Marketing-footer — gedeeld tussen de marketing-layout en de
// publieke brand.md-pagina's (/brandmd/*), zodat die volwaardig
// onderdeel van de website zijn (integratie-verzoek 2026-08-14).
// De Schema.org JSON-LD blijft in marketing/layout.tsx (site-level
// SEO, hoort niet dubbel op /brandmd).
// =============================================================

import Link from 'next/link';

export default function MarketingFooter() {
  return (
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
            <li>
              <Link href="/brandmd" className="hover:text-gray-900">
                brand.md-generator (gratis)
              </Link>
            </li>
            <li>
              <Link href="/brandmd/use" className="hover:text-gray-900">
                Hoe gebruik je brand.md
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
              <Link href="/marketing/voorwaarden" className="hover:text-gray-900">
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
  );
}
