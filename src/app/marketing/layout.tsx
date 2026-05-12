// =============================================================
// Marketing-site layout — wraps homepage / pricing / features /
// about / contact. Hosted op /marketing/* paths binnen dezelfde
// Next.js repo. Voor productie-deploy via www-subdomain: rewrites
// in next.config.ts of Vercel route-config.
// =============================================================

import type { Metadata } from 'next';
import Link from 'next/link';
import './marketing.css';

export const metadata: Metadata = {
  title: 'Branddock — AI-powered brand strategy + content generation',
  description:
    'Branddock combineert brand strategy, audience research en AI content generation in één platform. Voor B2B SaaS marketing teams.',
  openGraph: {
    title: 'Branddock — Brand strategy + AI content',
    description: 'AI-content die past bij jouw merk. Niet generiek. Niet AI-clichés.',
    type: 'website',
    locale: 'nl_NL',
    siteName: 'Branddock',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Branddock',
    description: 'AI-content die past bij jouw merk',
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-root min-h-screen flex flex-col bg-white text-gray-900">
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}

function MarketingNav() {
  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/marketing" className="font-semibold text-lg tracking-tight">
          Branddock
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
          <Link href="/marketing/features/brand-voice" className="hover:text-gray-900">
            Features
          </Link>
          <Link href="/marketing/pricing" className="hover:text-gray-900">
            Pricing
          </Link>
          <Link href="/marketing/about" className="hover:text-gray-900">
            About
          </Link>
          <Link href="/marketing/contact" className="hover:text-gray-900">
            Contact
          </Link>
        </nav>
        <Link
          href="/?utm_source=marketing-site&utm_medium=nav"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Start gratis
        </Link>
      </div>
    </header>
  );
}

function MarketingFooter() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="font-semibold text-gray-900 mb-3">Product</div>
          <ul className="space-y-1.5 text-gray-600">
            <li><Link href="/marketing/features/brand-voice" className="hover:text-gray-900">Brand Voice</Link></li>
            <li><Link href="/marketing/features/content-studio" className="hover:text-gray-900">Content Studio</Link></li>
            <li><Link href="/marketing/features/brand-alignment" className="hover:text-gray-900">Brand Alignment</Link></li>
            <li><Link href="/marketing/features/brandclaw" className="hover:text-gray-900">Brandclaw</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-gray-900 mb-3">Company</div>
          <ul className="space-y-1.5 text-gray-600">
            <li><Link href="/marketing/about" className="hover:text-gray-900">About</Link></li>
            <li><Link href="/marketing/contact" className="hover:text-gray-900">Contact</Link></li>
            <li><Link href="/marketing/pricing" className="hover:text-gray-900">Pricing</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-gray-900 mb-3">Legal</div>
          <ul className="space-y-1.5 text-gray-600">
            <li><Link href="/marketing/legal/terms" className="hover:text-gray-900">Terms</Link></li>
            <li><Link href="/marketing/legal/privacy" className="hover:text-gray-900">Privacy</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-gray-900 mb-3">Resources</div>
          <ul className="space-y-1.5 text-gray-600">
            <li><a href="mailto:hello@branddock.com" className="hover:text-gray-900">hello@branddock.com</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-200 px-6 py-4 text-xs text-gray-500 max-w-6xl mx-auto">
        © {new Date().getFullYear()} Branddock. Alle rechten voorbehouden.
      </div>
    </footer>
  );
}
