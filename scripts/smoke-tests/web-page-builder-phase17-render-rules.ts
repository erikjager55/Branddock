/**
 * Smoke-test voor Pad C Sub-Sprint B Phase 2 — brand-render-rules.
 *
 * Verifies decision-functies: pickHeroLayout, pickButtonStyle,
 * pickDisplayTypography, pickCardStyle, pickSectionVerticalPadding,
 * pickHeroImagePromptFragment, computeBrandRenderHints.
 *
 * Strategie: 4-5 fixture-personas (LINFI-RULER / Branddock-SAGE /
 * Notion-CREATOR / Patagonia-EXPLORER / null-archetype) door alle
 * decision-functies en check dat output meaningful different is.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase17-render-rules.ts
 */

import {
  pickHeroLayout,
  pickButtonStyle,
  pickDisplayTypography,
  pickCardStyle,
  pickSectionVerticalPadding,
  pickHeroImagePromptFragment,
  computeBrandRenderHints,
} from '../../src/lib/landing-pages/brand-render-rules';
import { getDesignSystemForLayoutStyle } from '../../src/lib/landing-pages/design-system';

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  PASS ${name}`);
    pass++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`);
    fail++;
  }
}

function group(name: string): void {
  console.log(`\n${name}`);
}

// ─── Fixture systems ─────────────────────────────────────

const MINIMAL_DS = getDesignSystemForLayoutStyle('MINIMAL');
const COMMERCIAL_DS = getDesignSystemForLayoutStyle('COMMERCIAL');
const EDITORIAL_DS = getDesignSystemForLayoutStyle('EDITORIAL');
const EXPERIENTIAL_DS = getDesignSystemForLayoutStyle('EXPERIENTIAL');
const PLAYFUL_DS = getDesignSystemForLayoutStyle('PLAYFUL');

// ─── Tests ─────────────────────────────────────────────

group('pickHeroLayout — archetype-driven beslissingen');
{
  // LINFI: RULER + MINIMAL → full-bleed-image + bottom-left + 100vh
  const linfi = pickHeroLayout('RULER', 'MINIMAL');
  assert('LINFI (RULER+MINIMAL): full-bleed-image', linfi.background === 'full-bleed-image');
  assert('LINFI: textVerticalPosition bottom', linfi.textVerticalPosition === 'bottom');
  assert('LINFI: fullViewportHeight true', linfi.fullViewportHeight);
  assert('LINFI: overlayOpacity 0.65', linfi.overlayOpacity === 0.65);

  // Branddock: SAGE + COMMERCIAL → solid-brand override (COMMERCIAL forceert)
  const branddock = pickHeroLayout('SAGE', 'COMMERCIAL');
  assert('Branddock (SAGE+COMMERCIAL): solid-brand override', branddock.background === 'solid-brand');
  assert('Branddock: centered text', branddock.textAlignment === 'center');

  // Same SAGE met EDITORIAL → surface
  const sageEditorial = pickHeroLayout('SAGE', 'EDITORIAL');
  assert('SAGE+EDITORIAL: solid-surface', sageEditorial.background === 'solid-surface');

  // OUTLAW: full-bleed met sterkere overlay
  const outlaw = pickHeroLayout('OUTLAW', 'EXPERIENTIAL');
  assert('OUTLAW: full-bleed', outlaw.background === 'full-bleed-image');
  assert('OUTLAW: overlayOpacity 0.85 (gritty)', outlaw.overlayOpacity === 0.85);

  // PLAYFUL forceert solid-brand of gradient
  const innocent = pickHeroLayout('INNOCENT', 'PLAYFUL');
  assert('INNOCENT+PLAYFUL: gradient-brand', innocent.background === 'gradient-brand');
  const jester = pickHeroLayout('JESTER', 'PLAYFUL');
  assert('JESTER+PLAYFUL: gradient-brand', jester.background === 'gradient-brand');

  // Null archetype → safe default
  const nullArch = pickHeroLayout(null, 'EDITORIAL');
  assert('null archetype: solid-brand fallback', nullArch.background === 'solid-brand');
}

group('pickButtonStyle — archetype + designSystem combineren');
{
  const ruler = pickButtonStyle('RULER', MINIMAL_DS);
  assert('RULER+MINIMAL: shape sharp', ruler.shape === 'sharp');
  assert('RULER+MINIMAL: radius 0', ruler.radiusPx === 0);
  assert('RULER: uppercase', ruler.textTransform === 'uppercase');
  assert('RULER: letterSpacing premium 0.1em', ruler.letterSpacing === '0.1em');
  assert('RULER: underlineHover true (sharp+premium)', ruler.underlineHover);

  const jester = pickButtonStyle('JESTER', PLAYFUL_DS);
  assert('JESTER+PLAYFUL: pill', jester.shape === 'pill');
  assert('JESTER: lowercase (friendly)', jester.textTransform === 'none');
  assert('JESTER: letterSpacing normal', jester.letterSpacing === 'normal');

  const hero = pickButtonStyle('HERO', COMMERCIAL_DS);
  assert('HERO+COMMERCIAL: rounded', hero.shape === 'rounded');
  assert('HERO: fontWeight 700 (bold action)', hero.fontWeight === 700);
}

group('pickDisplayTypography — emphasis-based size+weight');
{
  // LINFI RULER+MINIMAL → sparse (light weight, op 1-na grootste)
  // Sizes komen nu uit modularScale(16, 1.25, 4, 5) ≈ [48, 60, 76, 96].
  // Sparse pakt index 2 (op 1 na grootste).
  const linfi = pickDisplayTypography('RULER', MINIMAL_DS);
  assert('LINFI: weight = 300 (sparse, lichtste)', linfi.weight === 300);
  assert('LINFI: size in 60-80px (sparse MINIMAL modular)', linfi.size >= 60 && linfi.size <= 80, String(linfi.size));

  // HERO EXPERIENTIAL → dramatic (grootste, zwaarste)
  // Sizes uit modularScale(16, 1.5, 4, 4) ≈ [80, 120, 184, 272]
  const heroExp = pickDisplayTypography('HERO', EXPERIENTIAL_DS);
  assert('HERO+EXPERIENTIAL: dramatic >= 120 (max modular)', heroExp.size >= 120, String(heroExp.size));
  assert('HERO+EXPERIENTIAL: dramatic weight 900', heroExp.weight === 900);

  // COMMERCIAL → dense — modularScale(16, 1.2, 3, 4) ≈ [32, 40, 48]
  const denseTypo = pickDisplayTypography('SAGE', COMMERCIAL_DS);
  assert('SAGE+COMMERCIAL: dense in 32-48 (modular)', denseTypo.size >= 32 && denseTypo.size <= 48, String(denseTypo.size));

  // PLAYFUL → dense — modularScale(16, 1.333, 3, 4) ≈ [52, 68, 92]
  const playful = pickDisplayTypography('CREATOR', PLAYFUL_DS);
  assert('CREATOR+PLAYFUL: dense in 48-68 (modular)', playful.size >= 48 && playful.size <= 72, String(playful.size));
}

group('pickCardStyle — archetype-elevation mapping');
{
  const ruler = pickCardStyle('RULER', MINIMAL_DS);
  assert('RULER: border-only elevation', ruler.elevation === 'border-only');
  assert('RULER: borderWidth 1', ruler.borderWidth === 1);
  assert('RULER+MINIMAL: radius 0', ruler.radiusPx === 0);

  const sage = pickCardStyle('SAGE', COMMERCIAL_DS);
  assert('SAGE+COMMERCIAL: subtle-shadow', sage.elevation === 'subtle-shadow');
  assert('SAGE+COMMERCIAL: radius 12', sage.radiusPx === 12);

  const jester = pickCardStyle('JESTER', PLAYFUL_DS);
  assert('JESTER+PLAYFUL: strong-shadow', jester.elevation === 'strong-shadow');
  assert('JESTER+PLAYFUL: radius 16', jester.radiusPx === 16);

  const hero = pickCardStyle('HERO', EXPERIENTIAL_DS);
  assert('HERO+EXPERIENTIAL: flat', hero.elevation === 'flat');
}

group('pickSectionVerticalPadding — layoutStyle-based');
{
  // MINIMAL spacing = [4, 8, 16, 24, 48, 64, 96, 128, 160]. length-2 = 128
  const minimal = pickSectionVerticalPadding(MINIMAL_DS);
  assert('MINIMAL: padding 128 (lange-ruimte)', minimal === 128);

  // COMMERCIAL spacing = [4, 8, 12, 16, 20, 24, 32, 48, 64]. length-4 = 24
  const commercial = pickSectionVerticalPadding(COMMERCIAL_DS);
  assert('COMMERCIAL: padding 24 (tight)', commercial === 24);

  // EXPERIENTIAL spacing = [8, 16, 24, 32, 48, 64, 96, 128, 192]. length-2 = 128
  const experiential = pickSectionVerticalPadding(EXPERIENTIAL_DS);
  assert('EXPERIENTIAL: padding 128', experiential === 128);
}

group('pickHeroImagePromptFragment — archetype-aware');
{
  const ruler = pickHeroImagePromptFragment('RULER', MINIMAL_DS);
  assert('RULER: bevat premium-cue', ruler.includes('premium') || ruler.includes('refined') || ruler.includes('luxurious'));

  const jester = pickHeroImagePromptFragment('JESTER', PLAYFUL_DS);
  assert('JESTER: bevat playful-cue', jester.includes('playful') || jester.includes('vibrant') || jester.includes('joyful'));

  const explorer = pickHeroImagePromptFragment('EXPLORER', EXPERIENTIAL_DS);
  assert('EXPLORER: bevat outdoor-cue', explorer.includes('outdoor') || explorer.includes('landscape') || explorer.includes('journey'));

  const noArchetype = pickHeroImagePromptFragment(null, COMMERCIAL_DS);
  // Geen archetype-overlay; alleen base uit imageStrategy
  assert('null archetype: alleen base-style', noArchetype === COMMERCIAL_DS.imageStrategy.heroPhotographyStyle);
}

group('computeBrandRenderHints — bundle-output');
{
  const hints = computeBrandRenderHints('RULER', MINIMAL_DS);
  assert('hints.heroLayout aanwezig', hints.heroLayout !== undefined);
  assert('hints.buttonStyle aanwezig', hints.buttonStyle !== undefined);
  assert('hints.displayTypography aanwezig', hints.displayTypography !== undefined);
  assert('hints.cardStyle aanwezig', hints.cardStyle !== undefined);
  assert('hints.sectionPadding number', typeof hints.sectionPadding === 'number');
  assert('hints.heroImagePromptFragment string', typeof hints.heroImagePromptFragment === 'string');

  // Cross-check: RULER consistente premium-cues door bundle
  assert('hints heroLayout = full-bleed (premium)', hints.heroLayout.background === 'full-bleed-image');
  assert('hints buttonStyle = sharp (premium minimal)', hints.buttonStyle.shape === 'sharp');
  assert('hints cardStyle = border-only (premium)', hints.cardStyle.elevation === 'border-only');
}

group('Cross-archetype differentiation in hints');
{
  // Twee verschillende archetypes met zelfde designSystem moeten verschillen
  const rulerHints = computeBrandRenderHints('RULER', EDITORIAL_DS);
  const jesterHints = computeBrandRenderHints('JESTER', EDITORIAL_DS);
  // Hero-layout verschilt — RULER full-bleed, JESTER andere keuze
  assert(
    'RULER vs JESTER op zelfde DS: andere heroLayout',
    rulerHints.heroLayout.background !== jesterHints.heroLayout.background
    || rulerHints.heroLayout.textAlignment !== jesterHints.heroLayout.textAlignment,
  );
  // Button-typografie verschilt
  assert(
    'RULER uppercase vs JESTER lowercase buttons',
    rulerHints.buttonStyle.textTransform !== jesterHints.buttonStyle.textTransform,
  );
  // Card-style verschilt
  assert(
    'RULER border-only vs JESTER strong-shadow cards',
    rulerHints.cardStyle.elevation !== jesterHints.cardStyle.elevation,
  );
}

// ─── Resultaat ─────────────────────────────────────────

console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${pass + fail} | PASS: ${pass} | FAIL: ${fail}`);
console.log('='.repeat(50));

if (fail > 0) {
  process.exit(1);
}
