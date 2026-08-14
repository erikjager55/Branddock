// =============================================================
// Brand specimens (designbibliotheek-verbeterplan W4)
//
// Pure HTML-generators die de geëxtraheerde stijl toepassen op echte
// content (fixtureSamples) — het Relume/DTS-patroon: extractiefouten
// worden zichtbaar in een toegepaste pagina i.p.v. abstracte swatches.
// Zelfde generators voeden de Preview-tab (iframe srcDoc) én de
// Brand Kit Bundle (W6, statische bestanden). Geen IO.
//
// Eerlijkheidsregel (§1.3 M5): ontbreken de semantic tokens, dan levert
// de generator een expliciete "floor card" — nooit een verzonnen stijl.
// =============================================================

import type { SemanticTokensResolved } from './semantic-role-resolver';

export interface SpecimenFixtures {
  headlines?: string[];
  ctaLabels?: string[];
  featureTitles?: string[];
  testimonialQuotes?: string[];
}

export interface SpecimenInput {
  brandName: string;
  tokens: SemanticTokensResolved | null;
  primaryFontName?: string | null;
  fixtures?: SpecimenFixtures | null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface ResolvedStyle {
  primary: string;
  onPrimary: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  outline: string;
  fontFamily: string;
  radiusMd: number;
  spacingMd: number;
}

/** Tokens → concrete stijlwaarden; null wanneer de kern (primary/surface) ontbreekt. */
function resolveStyle(input: SpecimenInput): ResolvedStyle | null {
  const colors = input.tokens?.colors;
  if (!colors?.primary || !colors.surface) return null;
  return {
    primary: colors.primary,
    onPrimary: colors['on-primary'] ?? '#FFFFFF',
    surface: colors.surface,
    onSurface: colors['on-surface'] ?? '#1A1C1E',
    surfaceVariant: colors['surface-variant'] ?? colors.surface,
    outline: colors.outline ?? '#D1D5DB',
    fontFamily: input.primaryFontName
      ? `"${input.primaryFontName}", system-ui, sans-serif`
      : 'system-ui, sans-serif',
    radiusMd: input.tokens?.rounded?.md ?? 8,
    spacingMd: input.tokens?.spacing?.md ?? 16,
  };
}

/** Floor card — eerlijk "nog niet beschikbaar" i.p.v. een kapotte of verzonnen preview. */
function renderFloorCard(brandName: string, reason: string): string {
  return `<!doctype html><html><body style="margin:0;font-family:system-ui,sans-serif;background:#F9FAFB;display:flex;align-items:center;justify-content:center;min-height:100vh">
<div style="text-align:center;color:#6B7280;padding:48px">
  <div style="font-size:15px;font-weight:600;margin-bottom:8px">${escapeHtml(brandName)}</div>
  <div style="font-size:13px">Preview not yet available — ${escapeHtml(reason)}</div>
</div></body></html>`;
}

function pick(list: string[] | undefined, index: number, fallback: string): string {
  const value = list?.[index];
  return value && value.trim().length > 0 ? escapeHtml(value) : fallback;
}

/**
 * Volledige toegepaste voorbeeldpagina (hero + feature-kaarten + quote +
 * form + footer) in de merkstijl, gevuld met échte fixtureSamples waar
 * beschikbaar. Retourneert een self-contained HTML-document.
 */
export function renderUiKitHtml(input: SpecimenInput): string {
  const style = resolveStyle(input);
  if (!style) {
    return renderFloorCard(input.brandName, 'semantic tokens are missing (run the analyzer first)');
  }
  const fixtures = input.fixtures ?? undefined;
  const headline = pick(fixtures?.headlines, 0, `Welcome to ${escapeHtml(input.brandName)}`);
  const cta = pick(fixtures?.ctaLabels, 0, 'Get started');
  const ctaSecondary = pick(fixtures?.ctaLabels, 1, 'Learn more');
  const features = [0, 1, 2].map((i) => pick(fixtures?.featureTitles, i, `Feature ${i + 1}`));
  const quote = pick(fixtures?.testimonialQuotes, 0, '');

  return `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin:0; font-family:${style.fontFamily}; background:${style.surface}; color:${style.onSurface}; }
  .hero { background:${style.primary}; color:${style.onPrimary}; padding:${style.spacingMd * 4}px ${style.spacingMd * 2}px; }
  .hero h1 { margin:0 0 ${style.spacingMd}px; font-size:40px; line-height:1.1; max-width:640px; }
  .btn { display:inline-block; padding:10px 20px; border-radius:${style.radiusMd}px; font-size:14px; font-weight:600; text-decoration:none; }
  .btn-primary { background:${style.onPrimary}; color:${style.primary}; }
  .btn-ghost { border:1px solid ${style.onPrimary}; color:${style.onPrimary}; margin-left:8px; }
  .section { padding:${style.spacingMd * 3}px ${style.spacingMd * 2}px; }
  .cards { display:grid; grid-template-columns:repeat(3,1fr); gap:${style.spacingMd}px; }
  .card { border:1px solid ${style.outline}; border-radius:${style.radiusMd}px; padding:${style.spacingMd}px; background:${style.surfaceVariant}; }
  .card h3 { margin:0 0 8px; font-size:16px; }
  .card p { margin:0; font-size:13px; opacity:.75; line-height:1.5; }
  blockquote { margin:0; font-size:18px; line-height:1.5; font-style:italic; max-width:560px; }
  .form { max-width:420px; }
  .form input { width:100%; box-sizing:border-box; padding:10px 12px; margin-bottom:${style.spacingMd / 2}px; border:1px solid ${style.outline}; border-radius:${style.radiusMd}px; font-size:14px; background:${style.surface}; color:${style.onSurface}; }
  .form button { width:100%; padding:10px; border:0; border-radius:${style.radiusMd}px; background:${style.primary}; color:${style.onPrimary}; font-size:14px; font-weight:600; }
  footer { background:${style.onSurface}; color:${style.surface}; padding:${style.spacingMd * 2}px; font-size:13px; }
  </style></head><body>
  <section class="hero">
    <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.7;margin-bottom:12px">${escapeHtml(input.brandName)}</div>
    <h1>${headline}</h1>
    <a class="btn btn-primary" href="#">${cta}</a><a class="btn btn-ghost" href="#">${ctaSecondary}</a>
  </section>
  <section class="section"><div class="cards">
    ${features.map((f) => `<div class="card"><h3>${f}</h3><p>Applied brand style on a real component — border, radius, surface and type come straight from the extracted tokens.</p></div>`).join('')}
  </div></section>
  ${quote ? `<section class="section" style="background:${style.surfaceVariant}"><blockquote>“${quote}”</blockquote></section>` : ''}
  <section class="section"><div class="form">
    <input placeholder="Name" /><input placeholder="Email" /><button>${cta}</button>
  </div></section>
  <footer>© ${escapeHtml(input.brandName)} — specimen generated by Branddock</footer>
  </body></html>`;
}

/** Kleur-specimen: swatch-kaarten voor de semantische rollen. */
export function renderColorSpecimenHtml(input: SpecimenInput): string {
  const colors = input.tokens?.colors;
  if (!colors || Object.keys(colors).length === 0) {
    return renderFloorCard(input.brandName, 'no semantic colors resolved');
  }
  const swatches = Object.entries(colors)
    .map(
      ([role, hex]) => `<div style="border:1px solid #E5E7EB;border-radius:6px;overflow:hidden">
  <div style="height:64px;background:${hex}"></div>
  <div style="padding:8px;font-size:11px"><strong>${escapeHtml(role)}</strong><br><code>${hex}</code></div></div>`,
    )
    .join('');
  return `<!doctype html><html><body style="margin:0;padding:24px;font-family:system-ui,sans-serif;background:#fff">
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">${swatches}</div></body></html>`;
}

/** Typografie-specimen: schaal-preview in de merk-font. */
export function renderTypeSpecimenHtml(input: SpecimenInput): string {
  const typography = input.tokens?.typography;
  const font = input.primaryFontName
    ? `"${input.primaryFontName}", system-ui, sans-serif`
    : 'system-ui, sans-serif';
  const roles = Object.entries(typography ?? {});
  if (roles.length === 0) {
    return renderFloorCard(input.brandName, 'no typography roles resolved');
  }
  const rows = roles
    .map(
      ([role, token]) => `<div style="margin-bottom:16px">
  <div style="font-size:11px;color:#9CA3AF;margin-bottom:2px">${escapeHtml(role)} · ${escapeHtml(token.fontSize)} / ${token.fontWeight}</div>
  <div style="font-family:${font};font-size:${escapeHtml(token.fontSize)};font-weight:${token.fontWeight};line-height:${escapeHtml(token.lineHeight)}">${escapeHtml(input.brandName)}</div></div>`,
    )
    .join('');
  return `<!doctype html><html><body style="margin:0;padding:24px;font-family:system-ui,sans-serif;background:#fff">${rows}</body></html>`;
}
