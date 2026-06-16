'use client';

/**
 * AnchorNav — sticky ankernavigatie met scroll-spy (W4, plan §4.3).
 *
 * Apart client-bestand: puck-config.tsx moet server-safe blijven (geen hooks
 * in de render-functies — de /p/[slug]-page rendert de Puck-tree als server
 * component). De puck-registratie geeft alleen serialiseerbare props door;
 * alle merk-styling komt voorberekend binnen via `styles`.
 *
 * A11y-spec (plan §4.3):
 *  - max 5 ankers + persistente CTA rechts (caller bewaakt; hier defensieve slice)
 *  - native <a href="#id"> (werkt zonder JS); click-handler verrijkt met
 *    scrollIntoView waarvan `smooth` alleen bij prefers-reduced-motion:
 *    no-preference, daarna focus op de sectie (die heeft tabindex="-1")
 *  - scroll-spy via IntersectionObserver → aria-current op de actieve link
 *  - mobiel hide-on-scroll-down (translateY), weer tonen bij scroll-up
 *  - geen scroll-snap, geen parallax
 */

import React, { useEffect, useRef, useState } from 'react';

export interface AnchorNavLinkItem {
  label: string;
  href: string;
}

/** Voorberekende merk-styling uit de puck-config (serialiseerbaar). */
export interface AnchorNavStyles {
  background: string;
  borderBottom: string;
  fontFamily: string;
  fontSize: string | number;
  color: string;
  /** Accent voor de actieve link (aria-current). */
  activeColor: string;
  headingFontFamily: string;
  cta: React.CSSProperties;
  /** W4-fix — URL van het merklogo voor het brand-slot; leeg → merknaam-tekst. */
  logoUrl?: string | null;
  /** W4-fix — sticky op de gepubliceerde pagina; false in de ingebedde preview
   *  (daar pint top:0 aan de panel-scrollcontainer → zwevende strook). */
  sticky?: boolean;
}

const MAX_ANCHORS = 5;

export function AnchorNavClient({
  brandName,
  links,
  ctaLabel,
  ctaHref,
  numbered,
  styles,
}: {
  brandName: string;
  links: AnchorNavLinkItem[];
  ctaLabel: string;
  ctaHref: string;
  numbered?: boolean;
  styles: AnchorNavStyles;
}) {
  const shownLinks = links.slice(0, MAX_ANCHORS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  // Intersectie-status per sectie-id; actief = de eerste (document-volgorde)
  // die in de kijk-band valt — deterministischer dan de entries-volgorde.
  const intersectingRef = useRef<Map<string, boolean>>(new Map());

  useEffect(() => {
    const ids = shownLinks
      .map((l) => (l.href.startsWith('#') ? l.href.slice(1) : null))
      .filter((id): id is string => !!id);
    const targets = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          intersectingRef.current.set(entry.target.id, entry.isIntersecting);
        }
        const current = ids.find((id) => intersectingRef.current.get(id));
        setActiveId(current ?? null);
      },
      // Kijk-band rond het bovenste derde van de viewport: een sectie is
      // "actief" zodra hij die band raakt.
      { rootMargin: '-25% 0px -65% 0px', threshold: 0 },
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
    // links als JSON-string in deps: array-identiteit wisselt per render in Puck.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(shownLinks)]);

  useEffect(() => {
    // Hide-on-scroll-down geldt alleen voor de sticky (gepubliceerde) nav.
    if (styles.sticky === false) return;
    let lastY = window.scrollY;
    const onScroll = () => {
      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      const y = window.scrollY;
      if (!isMobile) {
        setHidden(false);
      } else if (y > lastY + 8 && y > 120) {
        setHidden(true);
      } else if (y < lastY - 8) {
        setHidden(false);
      }
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [styles.sticky]);

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith('#')) return;
    const target = document.getElementById(href.slice(1));
    if (!target) return;
    e.preventDefault();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    // Focus de sectie (tabindex="-1") zodat screenreaders/keyboard meespringen.
    target.focus({ preventScroll: true });
    window.history.replaceState(null, '', href);
  };

  const isSticky = styles.sticky !== false;
  return (
    <nav
      aria-label="Sectienavigatie"
      style={{
        // W4-fix: alleen sticky op de gepubliceerde pagina; in de ingebedde
        // preview relatief (anders pint top:0 aan de panel-scroll → strook).
        position: isSticky ? 'sticky' : 'relative',
        top: isSticky ? 0 : undefined,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        padding: '12px 32px',
        background: styles.background,
        borderBottom: styles.borderBottom,
        fontFamily: styles.fontFamily,
        fontSize: styles.fontSize,
        color: styles.color,
        transform: isSticky && hidden ? 'translateY(-100%)' : 'translateY(0)',
        transition: 'transform 200ms ease',
      }}
    >
      {styles.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={styles.logoUrl}
          alt={brandName}
          style={{ height: 28, width: 'auto', maxWidth: 180, objectFit: 'contain', flexShrink: 0, display: 'block' }}
        />
      ) : (
        <span style={{ fontFamily: styles.headingFontFamily, fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
          {brandName}
        </span>
      )}
      {/* Eén regel: nowrap + horizontaal schuifbaar bij overflow i.p.v. naar een
          tweede regel wrappen (W4-fix — de microsite-nav wrapte met 4 lange
          labels + lange CTA). minWidth:0 laat de lijst krimpen binnen de flex. */}
      <ul style={{ display: 'flex', gap: 24, listStyle: 'none', margin: 0, padding: 0, flexWrap: 'nowrap', overflowX: 'auto', minWidth: 0, scrollbarWidth: 'none' }}>
        {shownLinks.map((link, i) => {
          const isActive = link.href === `#${activeId}`;
          return (
            <li key={i} style={{ flexShrink: 0 }}>
              <a
                href={link.href}
                onClick={(e) => handleAnchorClick(e, link.href)}
                aria-current={isActive ? 'true' : undefined}
                style={{
                  color: isActive ? styles.activeColor : 'inherit',
                  fontWeight: isActive ? 600 : undefined,
                  textDecoration: 'none',
                  borderBottom: isActive ? `2px solid ${styles.activeColor}` : '2px solid transparent',
                  paddingBottom: 2,
                  display: 'inline-flex',
                  alignItems: 'baseline',
                  gap: 6,
                  whiteSpace: 'nowrap',
                }}
              >
                {numbered ? (
                  <span aria-hidden="true" style={{ fontSize: '0.75em', opacity: 0.55, fontVariantNumeric: 'tabular-nums' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                ) : null}
                {link.label}
              </a>
            </li>
          );
        })}
      </ul>
      <a
        href={ctaHref}
        onClick={(e) => handleAnchorClick(e, ctaHref)}
        className="lp-interactive lp-btn"
        style={styles.cta}
      >
        {ctaLabel}
      </a>
    </nav>
  );
}
