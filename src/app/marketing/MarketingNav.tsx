'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ChevronDown, Menu, X } from 'lucide-react';
import { appHref } from './app-url';

// Header-upgrade (Postiz-inspiratie, besluit Erik 2026-07-19):
// aankondigingsbalk (cadans-surface, dismissbaar per bericht-id) ·
// wig vooraan ("Voor AI-agents" positie 1 met Nieuw-dot) · Platform- en
// Oplossingen-dropdowns als breedte-bewijs · Nieuws (changelog) in de nav ·
// Over ons/Contact naar de footer · mobiel hamburger-menu (was: géén nav
// op mobiel). Alle links bestaan al — geen nieuwe pagina's.

/** Actuele aankondiging — nieuw bericht = nieuw id (dismissal is per id). */
const ANNOUNCEMENT = {
  id: 'mcp-connector-2026-07',
  label: 'Nieuw: koppel je merk aan Claude & ChatGPT',
  href: '/marketing/guardrails',
  cta: 'Bekijk hoe',
};

const PLATFORM_ITEMS: { label: string; href: string }[] = [
  { label: 'Platform-overzicht', href: '/marketing/platform' },
  { label: 'Merk-DNA & brand voice', href: '/marketing/features/brand-voice' },
  { label: 'Content Canvas', href: '/marketing/features/content-canvas' },
  { label: 'Merk-check (F-VAL)', href: '/marketing/features/brand-alignment' },
  { label: 'AI-agents', href: '/marketing/features/agents' },
  { label: 'Trend Radar', href: '/marketing/features/trend-radar' },
  { label: 'Campagnes', href: '/marketing/features/campaigns' },
  { label: 'Persona’s', href: '/marketing/features/personas' },
];

const SOLUTION_ITEMS: { label: string; href: string }[] = [
  { label: 'Voor marketingteams', href: '/marketing/solutions/marketingteams' },
  { label: 'Voor bureaus', href: '/marketing/solutions/bureaus' },
];

const COMPARE_ITEMS: { label: string; href: string }[] = [
  { label: 'vs. AI-schrijftools (Jasper)', href: '/marketing/vergelijk/jasper' },
  { label: 'vs. losse ChatGPT', href: '/marketing/vergelijk/chatgpt' },
  { label: 'vs. social-schedulers', href: '/marketing/vergelijk/social-schedulers' },
];

export default function MarketingNav() {
  return (
    <>
      <AnnouncementBar />
      <NavBar />
    </>
  );
}

// localStorage als external store (useSyncExternalStore): SSR toont de balk
// altijd (server-snapshot false); direct na hydratie verdwijnt hij voor wie
// hem eerder wegklikte — zonder setState-in-effect-cascade.
const dismissListeners = new Set<() => void>();
const announceKey = `bd-announce-${ANNOUNCEMENT.id}`;

function subscribeDismiss(cb: () => void) {
  dismissListeners.add(cb);
  return () => dismissListeners.delete(cb);
}

function dismissAnnouncement() {
  window.localStorage.setItem(announceKey, '1');
  dismissListeners.forEach((cb) => cb());
}

function AnnouncementBar() {
  const dismissed = useSyncExternalStore(
    subscribeDismiss,
    () => window.localStorage.getItem(announceKey) === '1',
    () => false,
  );

  if (dismissed) return null;

  return (
    <div className="relative text-center text-sm text-white px-10 py-2" style={{ background: 'var(--brand-slate)' }}>
      <span style={{ color: 'var(--brand-lime)' }}>●</span>{' '}
      <span style={{ color: 'rgba(255,255,255,0.9)' }}>{ANNOUNCEMENT.label}</span>{' '}
      <Link href={ANNOUNCEMENT.href} className="font-medium underline underline-offset-2 hover:opacity-80">
        {ANNOUNCEMENT.cta} →
      </Link>
      <button
        type="button"
         
        aria-label="Aankondiging sluiten"
        onClick={dismissAnnouncement}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-white/10"
      >
        <X className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.7)' }} />
      </button>
    </div>
  );
}

type OpenMenu = 'platform' | 'solutions' | null;

function NavBar() {
  const [open, setOpen] = useState<OpenMenu>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  // Buiten de header klikken sluit een open dropdown.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <header ref={navRef} className="sticky top-0 z-20 border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        {/* UX-12: logo naar de canonieke '/' (op de apex = de homepage; op
            previews/localhost redirect /marketing dáár niet, zie next.config). */}
        <Link href="/" className="flex items-center" aria-label="Branddock">
          {/* eslint-disable-next-line @next/next/no-img-element -- statische SVG-merkasset */}
          <img src="/marketing/branddock-logo.svg" alt="Branddock" className="h-6 w-auto" />
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
          <Link href="/marketing/guardrails" className="inline-flex items-center gap-1.5 hover:text-gray-900">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden />
            Voor AI-agents
          </Link>
          <Dropdown
            label="Platform"
            isOpen={open === 'platform'}
            onToggle={() => setOpen(open === 'platform' ? null : 'platform')}
            onEnter={() => setOpen('platform')}
          >
            <DropdownPanel items={PLATFORM_ITEMS} onNavigate={() => setOpen(null)} />
          </Dropdown>
          <Dropdown
            label="Oplossingen"
            isOpen={open === 'solutions'}
            onToggle={() => setOpen(open === 'solutions' ? null : 'solutions')}
            onEnter={() => setOpen('solutions')}
          >
            <DropdownPanel
              items={SOLUTION_ITEMS}
              divider="Vergelijk"
              extraItems={COMPARE_ITEMS}
              onNavigate={() => setOpen(null)}
            />
          </Dropdown>
          <Link href="/marketing/pricing" className="hover:text-gray-900">
            Prijzen
          </Link>
          <Link href="/marketing/changelog" className="hover:text-gray-900">
            Nieuws
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href={appHref('/?view=login&utm_source=marketing-site&utm_medium=nav-login')}
            className="hidden sm:inline text-sm text-gray-600 hover:text-gray-900"
          >
            Inloggen
          </Link>
          <Link
            href={appHref('/?view=register&utm_source=marketing-site&utm_medium=nav')}
            title="28 dagen gratis · geen creditcard"
            className="inline-flex items-center px-4 py-2 rounded-lg mkt-btn-primary text-sm font-medium"
          >
            Start gratis
          </Link>
          <button
            type="button"
             
            aria-label={mobileOpen ? 'Menu sluiten' : 'Menu openen'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && <MobileMenu onNavigate={() => setMobileOpen(false)} />}
    </header>
  );
}

function Dropdown({
  label,
  isOpen,
  onToggle,
  onEnter,
  children,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  onEnter: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative" onMouseEnter={onEnter}>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
        className={`inline-flex items-center gap-1 hover:text-gray-900 ${isOpen ? 'text-gray-900' : ''}`}
      >
        {label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && children}
    </div>
  );
}

function DropdownPanel({
  items,
  divider,
  extraItems,
  onNavigate,
}: {
  items: { label: string; href: string }[];
  divider?: string;
  extraItems?: { label: string; href: string }[];
  onNavigate: () => void;
}) {
  return (
    <div className="absolute left-0 top-full pt-3">
      <div className="w-64 rounded-xl border border-gray-200 bg-white shadow-lg p-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
          >
            {item.label}
          </Link>
        ))}
        {divider && extraItems && (
          <>
            <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              {divider}
            </div>
            {extraItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              >
                {item.label}
              </Link>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function MobileMenu({ onNavigate }: { onNavigate: () => void }) {
  const section = 'px-6 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400';
  const item = 'block px-6 py-2 text-sm text-gray-700 hover:bg-gray-50';

  return (
    <nav className="md:hidden border-t border-gray-200 bg-white pb-4 max-h-[75vh] overflow-y-auto">
      <Link href="/marketing/guardrails" onClick={onNavigate} className={`${item} inline-flex items-center gap-1.5 font-medium`}>
        <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden />
        Voor AI-agents
      </Link>
      <div className={section}>Platform</div>
      {PLATFORM_ITEMS.map((i) => (
        <Link key={i.href} href={i.href} onClick={onNavigate} className={item}>
          {i.label}
        </Link>
      ))}
      <div className={section}>Oplossingen</div>
      {[...SOLUTION_ITEMS, ...COMPARE_ITEMS].map((i) => (
        <Link key={i.href} href={i.href} onClick={onNavigate} className={item}>
          {i.label}
        </Link>
      ))}
      <div className={section}>Meer</div>
      <Link href="/marketing/pricing" onClick={onNavigate} className={item}>
        Prijzen
      </Link>
      <Link href="/marketing/changelog" onClick={onNavigate} className={item}>
        Nieuws
      </Link>
      <Link href={appHref('/?view=login&utm_source=marketing-site&utm_medium=nav-login')} className={item}>
        Inloggen
      </Link>
      <div className="px-6 pt-3">
        <Link
          href={appHref('/?view=register&utm_source=marketing-site&utm_medium=nav')}
          className="inline-flex w-full items-center justify-center px-4 py-2.5 rounded-lg mkt-btn-primary text-sm font-medium"
        >
          Start gratis
        </Link>
        <p className="text-center text-xs text-gray-400 mt-2">28 dagen gratis · geen creditcard</p>
      </div>
    </nav>
  );
}
