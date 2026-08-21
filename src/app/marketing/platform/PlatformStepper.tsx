'use client';

// Stepper-rail + module-tegels + lightbox. Losgetrokken uit page.tsx omdat dit
// blok interactief is (lightbox-state + ?feature=<slug>-deep-link via
// useSearchParams) — page.tsx blijft daardoor een server component en behoudt
// zijn metadata-export. Hand-rolled lightbox i.p.v. de app-brede Radix-dialog
// (@/components/ui/dialog): de marketing-site importeert bewust nergens uit
// @/components/ui (eigen font/kleur-tokens, geen Inter/app-CSS).

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, X } from 'lucide-react';
import { appHref } from '../app-url';
import Mosaic from '../Mosaic';
import { GROUPS, MODULE_DETAILS, type Module, type ModuleDetail } from './module-details';

/** Icoon + stap-kleur per slug, voor de lightbox-header — ook nodig als de
 *  lightbox via een deep-link opent zonder dat er op een tegel geklikt is. */
const SLUG_VISUAL: Record<string, { Icon: Module['Icon']; grad: string }> = {};
for (const group of GROUPS) {
  for (const mod of group.modules) {
    if (mod.slug && !SLUG_VISUAL[mod.slug]) {
      SLUG_VISUAL[mod.slug] = { Icon: mod.Icon, grad: group.grad };
    }
  }
}

export default function PlatformStepper() {
  const searchParams = useSearchParams();
  // Lazy initializer i.p.v. een effect: dit leest de deep-link-slug precies
  // één keer, bij mount — geen cascading re-render voor state die zich prima
  // laat afleiden op het moment van initialiseren.
  const [openSlug, setOpenSlug] = useState<string | null>(() => {
    const slug = searchParams.get('feature');
    return slug && MODULE_DETAILS[slug] ? slug : null;
  });

  const openDetail = openSlug ? MODULE_DETAILS[openSlug] : undefined;

  return (
    <>
      <div>
        {GROUPS.map((group, i) => {
          const isLast = i === GROUPS.length - 1;
          return (
            <section key={group.key} className="flex gap-5 md:gap-8">
              {/* Rail: nummer-cirkel + lijn naar de volgende stap. De lijn is
                  een flex-child die de resthoogte van de rij opvult, dus hij
                  loopt vanzelf door tot precies waar de volgende cirkel begint. */}
              <div className="flex flex-col items-center flex-shrink-0" style={{ width: '2.75rem' }} aria-hidden>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ background: group.grad }}
                >
                  {i + 1}
                </div>
                {!isLast && <div className="w-px flex-1 mt-2" style={{ background: '#e5e7eb', minHeight: '2rem' }} />}
              </div>

              <div className={`flex-1 min-w-0 ${isLast ? '' : 'pb-14'}`}>
                <span className="sr-only">{group.label}: </span>
                <h2 className="text-gray-900 mb-2">{group.title}</h2>
                <p className="text-gray-600 max-w-2xl mb-6">{group.intro}</p>
                {/* UX-15: kolommen per module-aantal — geen orphan-rijen (4 → 2x2, 2 → 2 breed). */}
                <div className={`grid gap-4 ${group.modules.length === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'}`}>
                  {group.modules.map((mod) => (
                    <ModuleTile key={mod.title} groupKey={group.key} module={mod} onOpen={setOpenSlug} />
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {openSlug && openDetail && (
        <Lightbox
          slug={openSlug}
          detail={openDetail}
          icon={SLUG_VISUAL[openSlug]?.Icon}
          grad={SLUG_VISUAL[openSlug]?.grad}
          onClose={() => setOpenSlug(null)}
        />
      )}
    </>
  );
}

function ModuleTile({
  groupKey,
  module,
  onOpen,
}: {
  groupKey: string;
  module: Module;
  onOpen: (slug: string) => void;
}) {
  const { Icon, title, desc, href, slug } = module;
  const card = (
    <>
      <div className="mkt-tile mb-3">
        <Mosaic
          id={`tile-${groupKey}-${title}`}
          cols={2}
          rows={2}
          palette={[['#343CED', '#07E5AB']]}
          className="absolute inset-0 w-full h-full"
        />
        <div className="mkt-tile__badge">
          <i>
            <Icon className="w-3.5 h-3.5" style={{ color: 'var(--brand-slate)' }} />
          </i>
        </div>
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-1.5">
        {title}
        {href || slug ? <ArrowRight className="w-3.5 h-3.5 text-gray-500" /> : null}
      </h3>
      <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
    </>
  );

  const cardClass = 'rounded-xl border border-gray-200 bg-white p-5 hover:border-gray-300 transition-colors';

  if (href) {
    return (
      <Link href={href} className={`${cardClass} block`}>
        {card}
      </Link>
    );
  }

  if (slug) {
    return (
      <button type="button" onClick={() => onOpen(slug)} className={`${cardClass} block w-full text-left`}>
        {card}
      </button>
    );
  }

  return <div className={cardClass}>{card}</div>;
}

function Lightbox({
  slug,
  detail,
  icon: Icon,
  grad,
  onClose,
}: {
  slug: string;
  detail: ModuleDetail;
  icon?: Module['Icon'];
  grad?: string;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    // Achtergrond niet laten meescrollen terwijl de lightbox open staat.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.55)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`lightbox-${slug}-title`}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 md:p-8 shadow-2xl"
      >
        <button
          type="button"
          ref={closeRef}
          onClick={onClose}
          aria-label="Sluiten"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        >
          <X className="w-5 h-5" />
        </button>

        {Icon && (
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center mb-5"
            style={{ background: grad ?? 'var(--g-brand)' }}
          >
            <Icon className="w-7 h-7 text-white" />
          </div>
        )}

        <h2 id={`lightbox-${slug}-title`} className="text-gray-900 mb-1">
          {detail.title}
        </h2>
        <p className="text-gray-600 mb-5">{detail.tagline}</p>
        <p className="text-gray-700 leading-relaxed mb-6">{detail.description}</p>

        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Wat je krijgt</h3>
        {/* flex+gap i.p.v. space-y: space-y-* landt niet in de gecompileerde CSS
            (bekend, zie gotchas — CLAUDE.md-regel: flex flex-col gap-* gebruiken). */}
        <ul className="flex flex-col gap-2.5 mb-6">
          {detail.bullets.map((b) => (
            <li key={b} className="flex items-start gap-3 text-sm text-gray-700">
              <span className="text-primary mt-0.5">→</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={appHref(`/?view=register&utm_source=marketing-site&utm_medium=platform-lightbox-${slug}`)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg mkt-btn-primary text-sm font-medium"
          >
            Gratis proberen <ArrowRight className="w-4 h-4" />
          </Link>
          {detail.moreHref && (
            <Link href={detail.moreHref} className="inline-flex items-center gap-1.5 text-sm font-medium mkt-accent">
              {detail.moreLabel ?? 'Lees meer'} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
