/**
 * Generieke CSS-`var()`-resolver tegen de volledige gescrapete CSS.
 *
 * Spiegelt het var→definitie-lookup-patroon van de bestaande font-resolvers
 * in url-scraper.ts (resolveFontFamilyValue/resolveFontSizeValue), maar
 * property-agnostisch zodat ALLE profiel-extractoren (typografie/button/spacing)
 * `var(--bs-body-line-height)` e.d. naar concrete waarden kunnen resolven
 * i.p.v. de letterlijke "var(...)"-string te persisteren.
 *
 * Verbeterplan brand-fidelity Fase 1 — `docs/audits/2026-06-05-brandstyle-extraction-pipeline.md`.
 */

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Zoek de (eerste) definitie van `--name` in de volledige CSS. */
function findVarDefinition(name: string, fullCss: string): string | null {
  // Linker declaratie-grens zodat `--c` niet matcht in `--foo--c`.
  const re = new RegExp(`(?:^|[\\s;{(])${escapeRegex(name)}\\s*:\\s*([^;}]+)`);
  const m = fullCss.match(re);
  return m ? m[1].trim() : null;
}

// 1-niveau-balancerende fallback-capture: vangt fallbacks met eigen haakjes
// (rgb()/hsl()/calc()/geneste var()) i.p.v. te stoppen bij de eerste ')'.
const VAR_BAL = '(?:[^()]|\\([^()]*\\))*';

/**
 * Resolvet `var(--name[, fallback])`-referenties in `value` naar concrete
 * waarden, recursief tegen `fullCss`. Werkt voor een volledige var()-waarde
 * én voor var() ingebed in een expressie (bv. `calc(var(--x) * 2)`).
 *
 * @returns geresolveerde string, of `null` wanneer onresolveerbaar (geen
 *   definitie + geen fallback) — caller behandelt null als "geen signaal".
 */
export function resolveCssVar(value: string, fullCss: string, depth = 0): string | null {
  if (depth > 8) return null;
  let v = value.replace(/!important/gi, '').trim();
  if (!v) return null;

  // Hele waarde = één var(--name, fallback?)
  const whole = v.match(new RegExp(`^var\\(\\s*(--[\\w-]+)\\s*(?:,\\s*(${VAR_BAL}))?\\)$`));
  if (whole) {
    const def = findVarDefinition(whole[1], fullCss);
    if (def != null) {
      const r = resolveCssVar(def, fullCss, depth + 1);
      if (r != null) return r;
    }
    const fallback = whole[2]?.trim();
    if (fallback) {
      const r = resolveCssVar(fallback, fullCss, depth + 1);
      if (r != null) return r;
    }
    return null;
  }

  // var() ingebed in een grotere expressie → resolve elke referentie
  if (v.includes('var(')) {
    const replaced = v.replace(
      new RegExp(`var\\(\\s*(--[\\w-]+)\\s*(?:,\\s*(${VAR_BAL}))?\\)`, 'g'),
      (full, name: string, fb: string | undefined) => {
        const def = findVarDefinition(name, fullCss);
        const r = def != null
          ? resolveCssVar(def, fullCss, depth + 1)
          : (fb ? resolveCssVar(fb.trim(), fullCss, depth + 1) : null);
        return r != null ? r : full;
      },
    );
    if (replaced.includes('var(')) return null; // resteert onresolveerbaar
    return replaced.trim() || null;
  }

  return v;
}

/**
 * Resolvet een waarde, maar valt terug op de oorspronkelijke waarde wanneer
 * die GEEN var() bevat (zodat concrete waarden ongemoeid blijven) en op `null`
 * alleen wanneer een var()-waarde onresolveerbaar is.
 */
export function resolveOrKeep(value: string | null, fullCss: string): string | null {
  if (value == null) return null;
  if (!value.includes('var(')) return value;
  return resolveCssVar(value, fullCss);
}
