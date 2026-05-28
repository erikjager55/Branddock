/**
 * Accessibility-styles voor LP-renderer (#4 design-quality verbeterplan).
 *
 * Levert globale CSS die met inline-styles niet kan: :focus-visible,
 * :hover, prefers-reduced-motion. Wordt 1x per LP geïnjecteerd via een
 * <style>-tag bovenaan de Puck-render zodat alle interactive elementen
 * (button/a/input) keyboard-navigable zijn en hover-states tonen.
 *
 * WCAG 2.1 SC 2.4.7 Focus Visible — verplicht voor publieke websites.
 *
 * @param brandColor — primary brand-color voor focus-ring (default teal).
 *                     Krijgt rgba-alpha zodat het op zowel licht als
 *                     donker subtiel zichtbaar is.
 */
export function buildA11yStyleBlock(brandColor: string = '#1FD1B2'): string {
  // Strip leading # voor rgba-conversie
  const cleaned = brandColor.replace(/^#/, '');
  let rgb = '31,209,178';
  if (cleaned.length === 6) {
    const num = parseInt(cleaned, 16);
    if (!Number.isNaN(num)) {
      const r = (num >> 16) & 0xff;
      const g = (num >> 8) & 0xff;
      const b = num & 0xff;
      rgb = `${r},${g},${b}`;
    }
  }

  return `
/* a11y + interaction-states — LP-renderer (gegenereerd) */
.lp-interactive {
  outline: 2px solid transparent;
  outline-offset: 2px;
  transition: outline-color 120ms ease, transform 120ms ease, opacity 120ms ease;
}
.lp-interactive:focus-visible {
  outline-color: rgba(${rgb}, 0.85);
  outline-offset: 3px;
}
.lp-interactive:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
.lp-interactive:active {
  transform: translateY(0);
  opacity: 0.95;
}
.lp-interactive[aria-disabled="true"],
.lp-interactive[data-loading="true"] {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

/* Reduced-motion: respect user preference */
@media (prefers-reduced-motion: reduce) {
  .lp-interactive { transition: none; }
  .lp-reveal { animation: none !important; opacity: 1 !important; transform: none !important; }
}

/* Skip-link helper voor keyboard-nav */
.lp-skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px 16px;
  z-index: 999;
  text-decoration: none;
}
.lp-skip-link:focus { top: 0; }

/* Component-states matrix (#9 design-quality). Card-elements krijgen
   subtiele hover (lift + shadow-intensify) zodat de page leeft maar
   niet stoort. Loading-state via [data-loading="true"] dimming. */
.lp-card {
  transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 200ms ease;
}
.lp-card:hover {
  transform: translateY(-2px);
}
.lp-card[data-loading="true"] {
  opacity: 0.6;
  pointer-events: none;
}

/* Orchestrated page-load entrance (#7 design-quality). Staggered reveals
   geven het Anthropic-aanbevolen 'one high-impact moment' i.p.v. scattered
   micro-animations. Respect prefers-reduced-motion (override above). */
@keyframes lp-fade-up {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
.lp-reveal {
  animation: lp-fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.lp-reveal-1 { animation-delay: 0.05s; }
.lp-reveal-2 { animation-delay: 0.15s; }
.lp-reveal-3 { animation-delay: 0.25s; }
.lp-reveal-4 { animation-delay: 0.35s; }
.lp-reveal-5 { animation-delay: 0.45s; }
`.trim();
}
