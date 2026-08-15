// =============================================================
// brand.md-pagina's layout — volwaardig onderdeel van de
// marketing-site (integratie-verzoek 2026-08-14): zelfde nav,
// footer, merk-font en kleurstelling als branddock.app. De routes
// blijven op /brandmd/* (korte publieke URLs; claim-links in
// uitgegeven bestanden en mails mogen nooit breken).
// =============================================================

import MarketingNav from '../marketing/MarketingNav';
import MarketingFooter from '../marketing/MarketingFooter';
import '../marketing/marketing.css';

export default function BrandMdLayout({ children }: { children: React.ReactNode }) {
  return (
    // `lang="nl"` op de wrapper (2026-08-15): de root-layout leidt <html lang>
    // af uit de UI-locale-cookie, en een anonieme bezoeker van de publieke
    // generator heeft die niet — die zou dus als `en` renderen terwijl de copy
    // Nederlands is. Een lang-attribuut op een subtree is valide HTML en wordt
    // door screenreaders en zoekmachines gevolgd.
    <div lang="nl" className="marketing-root min-h-screen flex flex-col bg-white text-gray-900">
      {/* Merk-font Halyard via Adobe Fonts (Typekit); CSP staat use.typekit.net toe. */}
      <link rel="stylesheet" href="https://use.typekit.net/idv8cqe.css" />
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
