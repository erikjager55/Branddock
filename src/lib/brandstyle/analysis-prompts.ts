// =============================================================
// AI Prompt Templates for Brandstyle Analysis
//
// Two-phase approach:
// 1. Visual Identity — colors + typography + logo (data-driven)
// 2. Voice & Imagery — tone + photography + illustration (text-driven)
// =============================================================

import type { CssVariable, ColorFrequency, FontSizeEntry, ScrapedBrandImage } from './url-scraper';
import type { CssVisualHeuristics } from './visual-language.types';

// ─── Processed Data Interface ─────────────────────────

export interface ProcessedColorGroup {
  /** Colors from CSS variables (highest confidence) */
  fromVariables: Array<{ name: string; hex: string }>;
  /** Colors by frequency (framework-filtered) */
  byFrequency: ColorFrequency[];
  /** Remaining unique colors not in the above */
  other: string[];
}

/**
 * Authoritative palette entry — the exact hex that will be written
 * to the database. The AI is only allowed to annotate these entries
 * (name / category / tags / notes), it cannot change the hex value
 * nor drop or add colors.
 */
export interface AuthoritativeColor {
  hex: string;
  source: 'css-variable' | 'frequency' | 'other';
  /** CSS variable name if available, e.g. `--primary-500` */
  variableName?: string;
  /** Number of occurrences across scraped CSS, if known */
  frequency?: number;
  /** CSS properties where this color was seen, e.g. ['background-color'] */
  contexts?: string[];
}

export interface ProcessedData {
  url?: string;
  title: string | null;
  description: string | null;
  bodyText: string;
  colorGroups: ProcessedColorGroup;
  /** Authoritative palette — exact hex values, capped at 12 */
  authoritativeColors: AuthoritativeColor[];
  fonts: string[];
  fontSizes: FontSizeEntry[];
  logoUrls: string[];
  cssVariables: CssVariable[];
  brandImages?: ScrapedBrandImage[];
  visualHeuristics?: CssVisualHeuristics;
  isPdf?: boolean;
  pdfFileName?: string;
  pdfMetadata?: { title: string | null; author: string | null };
}

// ─── Visual Identity Prompt (Call 1) ──────────────────

const VISUAL_IDENTITY_SYSTEM_PROMPT = `You are an expert brand designer specializing in visual identity systems. You are annotating a fixed palette of colors that were extracted from a website/document. You do not choose colors — you describe the ones you are given.

CRITICAL RULES:
1. For COLORS: You are given an AUTHORITATIVE PALETTE list of exact hex values. You MUST return an entry for EVERY hex in that list, with the EXACT same hex (uppercase, 6 digits). You may not add colors, drop colors, merge colors, or change any hex value — not even by a single digit.
2. For COLORS: For each hex, choose a category that best describes its role — PRIMARY (main brand color), SECONDARY (supporting), ACCENT (CTA/highlight), NEUTRAL (grays/backgrounds/text), or SEMANTIC (success/error/warning). Use the provided usage contexts (CSS variable name, property usage, frequency) to decide.
3. For COLORS: Give each color a short, human-friendly name (e.g., "Ocean Blue", "Warm Coral"). Never use the hex string as the name.
4. For COLORS: If the palette contains neutrals (grays / near-black / near-white), categorize them as NEUTRAL — do not refuse them. Preserving the exact scraped palette is more important than aesthetic curation.
5. For TYPOGRAPHY: You are given a FONT LIST detected from CSS. Set \`primaryFontName\` to the FIRST font in that list verbatim. Do not rename, pretty-print, or substitute. If the list is empty, return null.
6. For TYPOGRAPHY: Set \`primaryFontUrl\` to the Google Fonts URL for that font if it is a known Google Font (e.g., "https://fonts.google.com/specimen/Inter"), otherwise null.
7. For TYPOGRAPHY: ONLY report font sizes that are actually found in the extracted data. If no font sizes were extracted, set typeScale to an EMPTY array []. Never invent or hallucinate font sizes.
8. For LOGOS: Base guidelines on the logo URLs found. If no logos were found, state that and suggest the brand add visible logo markup.
9. Return ONLY valid JSON. No markdown, no explanation.`;

/**
 * Build the Visual Identity prompt (colors + typography + logo).
 * Input: structured color groups, fonts, sizes, logos.
 */
export function buildVisualIdentityPrompt(data: ProcessedData): string {
  const { fonts, fontSizes, logoUrls, authoritativeColors } = data;

  // Build the AUTHORITATIVE palette section — this is what the AI must echo back verbatim.
  const paletteSection = authoritativeColors.length > 0
    ? authoritativeColors
        .map((c, i) => {
          const parts: string[] = [];
          parts.push(`  ${i + 1}. ${c.hex}`);
          if (c.variableName) parts.push(`var: ${c.variableName}`);
          if (typeof c.frequency === 'number' && c.frequency > 0) parts.push(`${c.frequency}×`);
          if (c.contexts && c.contexts.length > 0) parts.push(`in ${c.contexts.join(', ')}`);
          parts.push(`(source: ${c.source})`);
          return parts.join(' — ');
        })
        .join('\n')
    : '  (no colors detected)';

  // Format fonts — the first one is PINNED as primary
  const fontsSection = fonts.length > 0
    ? fonts.map((f, i) => `  ${i === 0 ? '→ PRIMARY:' : '  additional:'} ${f}`).join('\n')
    : '  (no fonts detected)';

  // Format font sizes
  const fontSizesSection = fontSizes.length > 0
    ? fontSizes
      .slice(0, 20)
      .map((fs) => `  ${fs.value} — ${fs.selector}`)
      .join('\n')
    : 'No font sizes extracted from CSS';

  // Format logos
  const logosSection = logoUrls.length > 0 ? logoUrls.join('\n  ') : 'No logos found';

  const source = data.isPdf
    ? `File: ${data.pdfFileName || 'Unknown'}\nTitle: ${data.pdfMetadata?.title || 'Unknown'}\nAuthor: ${data.pdfMetadata?.author || 'Unknown'}`
    : `URL: ${data.url || 'Unknown'}\nTitle: ${data.title || 'Unknown'}\nDescription: ${data.description || 'No description'}`;

  return `Annotate this brand's visual identity. You MUST preserve every hex value and the primary font exactly as given.

## Source
${source}

## AUTHORITATIVE COLOR PALETTE (${authoritativeColors.length} colors — ANNOTATE EVERY ENTRY, NEVER CHANGE A HEX)
${paletteSection}

## Detected Fonts (order matters — first is primary)
${fontsSection}

## Observed Font Sizes from CSS
${fontSizesSection}

## Logo Candidates
  ${logosSection}

---

Return a JSON object with this exact structure:
{
  "colors": [
    {
      "hex": "#RRGGBB",  // MUST match an entry from the AUTHORITATIVE COLOR PALETTE above, character-for-character
      "name": "Descriptive Color Name",
      "category": "PRIMARY|SECONDARY|ACCENT|NEUTRAL|SEMANTIC",
      "tags": ["tag1", "tag2"],
      "notes": "How this color is used on the site"
    }
  ],
  "primaryFontName": "First font from the Detected Fonts list, verbatim",
  "primaryFontUrl": "https://fonts.google.com/specimen/<Font> or null if not a Google Font",
  "typeScale": [],
  "logoGuidelines": ["guideline 1", "guideline 2"],
  "logoDonts": ["don't 1", "don't 2"],
  "colorDonts": ["don't 1", "don't 2"]
}

IMPORTANT:
- You MUST return ${authoritativeColors.length} color entries — one for EVERY hex in the palette above, in the same order, with the EXACT SAME hex value (6-digit, uppercase, prefixed with '#'). Do not drop, add, merge, or alter hex values.
- For primaryFontName: copy the first font from "Detected Fonts" verbatim. Do not rename or substitute. If no fonts detected, return null.
- For typeScale: ONLY populate with font sizes from the "Observed Font Sizes" section above. Map observed sizes to their semantic level (H1, H2, H3, Body, Small, Caption) based on the selector context and size. If no font sizes were extracted, return an EMPTY array [].
- Each typeScale entry: { "level": "H1", "name": "Heading 1", "size": "36px", "lineHeight": "calculated", "weight": "estimated", "color": "#333333" }
- For logo guidelines: if no logos found, say "No logo elements detected — consider adding structured logo markup (JSON-LD, og:image, or img with alt='logo')"`;
}

// ─── Voice & Imagery Prompt (Call 2) ──────────────────

const VOICE_IMAGERY_SYSTEM_PROMPT = `You are an expert brand strategist specializing in tone of voice and visual communication guidelines. Analyze the provided text content and produce actionable brand communication and imagery guidelines.

CRITICAL RULES:
1. Base tone analysis ONLY on the actual text content provided. Do not invent characteristics that aren't supported by the text.
2. Use the NN/g (Nielsen Norman Group) Four Dimensions of Tone framework for structured analysis:
   - Formal ↔ Casual
   - Serious ↔ Funny
   - Respectful ↔ Irreverent
   - Matter-of-fact ↔ Enthusiastic
3. For photography/imagery: Clearly distinguish between OBSERVED (found on site) and RECOMMENDED (your suggestion based on the brand's tone and industry).
4. All guidelines must be specific to THIS brand — not generic advice.
5. Return ONLY valid JSON. No markdown, no explanation.`;

/**
 * Build the Voice & Imagery prompt (tone of voice + photography + illustration).
 * Input: body text content, site metadata.
 */
export function buildVoiceImageryPrompt(data: ProcessedData): string {
  const source = data.isPdf
    ? `File: ${data.pdfFileName || 'Unknown'}\nTitle: ${data.pdfMetadata?.title || 'Unknown'}`
    : `URL: ${data.url || 'Unknown'}\nTitle: ${data.title || 'Unknown'}\nDescription: ${data.description || 'No description'}`;

  return `Analyze the following text content and generate brand communication and imagery guidelines.

## Source
${source}

## Text Content (headings, paragraphs, copy)
${data.bodyText || 'No text content available'}

---

Return a JSON object with this exact structure:
{
  "contentGuidelines": [
    "OBSERVED: guideline based on actual content",
    "RECOMMENDED: guideline you suggest"
  ],
  "writingGuidelines": [
    "OBSERVED: writing pattern found in the content",
    "RECOMMENDED: writing guideline you suggest"
  ],
  "examplePhrases": [
    { "text": "actual phrase from the content or a phrase in the brand's voice", "type": "do" },
    { "text": "example of what this brand should avoid", "type": "dont" }
  ],
  "photographyStyle": {
    "mood": "OBSERVED or RECOMMENDED mood description",
    "subjects": "Typical subjects for this brand",
    "composition": "Composition guidelines"
  },
  "photographyGuidelines": [
    "OBSERVED: guideline based on visible imagery",
    "RECOMMENDED: guideline you suggest for this brand"
  ],
  "illustrationGuidelines": [
    "RECOMMENDED: illustration style guideline"
  ],
  "imageryDonts": [
    "imagery don't specific to this brand"
  ]
}

IMPORTANT:
- For contentGuidelines and writingGuidelines: Prefix each guideline with "OBSERVED:" if based on actual content, or "RECOMMENDED:" if it's your suggestion.
- For examplePhrases: Include 3-4 "do" examples (preferably actual phrases from the text) and 2-3 "dont" examples.
- For photographyStyle: If no photography is visible, describe likely direction based on the brand's tone and industry. Mark as RECOMMENDED.
- For photographyGuidelines: Provide 3-5 specific guidelines. Label each as OBSERVED or RECOMMENDED.
- Analyze the text for: sentence length patterns, active vs passive voice, technical vs accessible language, personalization level (we/you vs third person), energy level, formality.
- Be specific — "Use short, punchy sentences under 15 words for CTAs" is better than "Write clearly".`;
}

// ─── PDF Analysis Prompt (combined, since PDF has less data) ──

/**
 * Build the combined analysis prompt for PDF data.
 * PDFs typically have explicit brand guidelines, so we use a single combined call.
 */
export function buildPdfAnalysisPrompt(data: {
  fileName: string;
  text: string;
  hexColors: string[];
  fontMentions: string[];
  metadata: { title: string | null; author: string | null };
}): string {
  return `Analyze the following PDF document data and generate a complete brand styleguide. This is likely a brand guidelines document, visual identity manual, or marketing material.

## Source
File: ${data.fileName}
Title: ${data.metadata.title || 'Unknown'}
Author: ${data.metadata.author || 'Unknown'}

## Colors Found in Document
${data.hexColors.length > 0 ? data.hexColors.join(', ') : 'No hex colors found in text'}

## Fonts Mentioned in Document
${data.fontMentions.length > 0 ? data.fontMentions.join(', ') : 'No font names detected'}

## Document Text Content
${data.text || 'No text content extracted'}

---

Return a JSON object with this exact structure:
{
  "colors": [
    {
      "name": "Color Name",
      "hex": "#RRGGBB",
      "category": "PRIMARY|SECONDARY|ACCENT|NEUTRAL|SEMANTIC",
      "tags": ["tag1", "tag2"],
      "notes": "How this color is used"
    }
  ],
  "primaryFontName": "Font Name or null",
  "primaryFontUrl": "Google Fonts URL or null",
  "typeScale": [],
  "logoGuidelines": ["guideline 1", "guideline 2", "guideline 3"],
  "logoDonts": ["don't 1", "don't 2", "don't 3"],
  "contentGuidelines": ["guideline 1", "guideline 2", "guideline 3"],
  "writingGuidelines": ["guideline 1", "guideline 2", "guideline 3"],
  "examplePhrases": [
    { "text": "example phrase in brand voice", "type": "do" },
    { "text": "example of what to avoid", "type": "dont" }
  ],
  "photographyStyle": {
    "mood": "Description of photo mood",
    "subjects": "Typical subjects",
    "composition": "Composition guidelines"
  },
  "photographyGuidelines": ["guideline 1", "guideline 2"],
  "illustrationGuidelines": ["guideline 1", "guideline 2"],
  "imageryDonts": ["don't 1", "don't 2"],
  "colorDonts": ["don't 1", "don't 2"],
  "graphicElements": {
    "brandShapes": ["shape 1"],
    "decorativeElements": ["element 1"],
    "visualDevices": ["device 1"],
    "usageNotes": "How graphic elements are used"
  },
  "graphicElementsDonts": ["don't 1"],
  "patternsTextures": {
    "patterns": ["pattern 1"],
    "textures": ["texture 1"],
    "backgrounds": ["background 1"],
    "usageNotes": "How patterns/textures are used"
  },
  "iconographyStyle": {
    "style": "line|fill|duo-tone|custom",
    "strokeWeight": "1.5px",
    "cornerRadius": "2px",
    "sizing": "16/20/24/32px",
    "colorUsage": "Primary for active, gray for inactive",
    "usageNotes": "Icon approach"
  },
  "iconographyDonts": ["don't 1"],
  "gradientsEffects": [
    { "name": "Gradient Name", "type": "linear", "colors": ["#hex1", "#hex2"], "angle": "135deg", "usage": "Where used" }
  ],
  "layoutPrinciples": {
    "gridSystem": "Grid description",
    "spacingScale": "Spacing values",
    "whitespacePhilosophy": "Whitespace approach",
    "compositionRules": ["rule 1"],
    "usageNotes": "Layout approach"
  }
}

IMPORTANT:
- If the document contains explicit brand guidelines, extract them faithfully.
- If colors are mentioned by name (e.g., "Brand Blue #2563EB"), use those exact values.
- If specific fonts are mentioned, use those — do not guess.
- For typeScale: ONLY include font sizes that are explicitly mentioned in the document text (e.g., "H1: 36px"). If no sizes are mentioned, return an EMPTY array [].
- For tone-of-voice: Analyze the document's own writing style. Prefix guidelines with "OBSERVED:" or "RECOMMENDED:" to distinguish facts from suggestions.
- For photography: If the document describes photography guidelines, extract them faithfully. Otherwise mark as RECOMMENDED.
- For design language: If the document describes graphic elements, iconography, gradients, or layout rules, extract them. Otherwise provide recommendations based on the brand's visual identity.
- For iconographyStyle: strokeWeight and cornerRadius MUST be numeric CSS values (e.g., "1.5px", "2px"). sizing MUST list numeric sizes like "16/20/24/32px". Never use descriptive words like "Rounded".
- For layoutPrinciples.gridSystem: MUST include the column count with "column", e.g. "12-column grid with 24px gutters".
- Maximum 12 colors total. Maximum 4 gradients.
- Be specific to this brand, not generic.`;
}

// ─── Design Language Prompt (Call 3) ─────────────────

const DESIGN_LANGUAGE_SYSTEM_PROMPT = `You are an expert brand designer specializing in design systems and visual design language. You are analysing a set of OBSERVED CSS values (border-radius samples, box-shadow samples, spacing values, gradient strings, border data). Your output must be grounded in those values — never invent numbers that contradict the data.

CRITICAL RULES:
1. Base EVERY field on the observed CSS values provided. If the data says "most common border-radius: 12px", the iconographyStyle.cornerRadius MUST be "12px" — not "2px" or "4px".
2. For GRADIENTS: If the "Gradients — observed from CSS" section lists real gradient strings, extract the colors and angles from those exact strings. Do NOT invent new gradients when real ones are observed. If no gradients are observed, you may propose 1-2 RECOMMENDED gradients using the Brand Color Palette — label them with "RECOMMENDED:" in the usage field.
3. For ICONOGRAPHY: strokeWeight must come from observed border widths. cornerRadius must come from the observed border-radius median. Sizing must be a numeric CSS value chain like "16/20/24/32px".
4. For LAYOUT: spacingScale must be derived from the observed grid base and spacing samples (e.g., "4px base unit: 4, 8, 12, 16, 24, 32, 48"). gridSystem MUST include the word "column" with a count.
5. For GRAPHIC ELEMENTS and PATTERNS: Identify recurring visual motifs supported by the evidence (rounded cards, soft shadows, etc.). If no evidence, provide a single concise RECOMMENDED entry. Never list generic advice that could apply to any brand.
6. Return ONLY valid JSON. No markdown, no explanation.`;

/**
 * Build the Design Language prompt (graphic elements + patterns + iconography + gradients + layout).
 * Input: CSS data, body text, site metadata.
 */
export function buildDesignLanguagePrompt(data: ProcessedData): string {
  const source = data.isPdf
    ? `File: ${data.pdfFileName || 'Unknown'}\nTitle: ${data.pdfMetadata?.title || 'Unknown'}`
    : `URL: ${data.url || 'Unknown'}\nTitle: ${data.title || 'Unknown'}\nDescription: ${data.description || 'No description'}`;

  // CSS variables that might indicate spacing, radius, gradients
  const designVars = (data.cssVariables ?? [])
    .filter((v) => /radius|spacing|gap|gradient|shadow|border|grid|icon/i.test(v.name))
    .map((v) => `  ${v.name}: ${v.value}`)
    .join('\n') || 'None found';

  // Font info for consistency reference
  const fontsSection = data.fonts.length > 0 ? data.fonts.join(', ') : 'No fonts detected';

  // Brand palette (authoritative) — gives AI the real colors to reference in gradients
  const paletteSection = data.authoritativeColors.length > 0
    ? data.authoritativeColors.slice(0, 10).map((c) => `  ${c.hex}`).join('\n')
    : '  (none)';

  // ─── CSS Visual Heuristics (real observed values, not guesses) ───
  const heuristics = data.visualHeuristics;

  const borderRadiusSection = heuristics?.borderRadius
    ? `  count: ${heuristics.borderRadius.values.length}\n` +
      `  median: ${heuristics.borderRadius.median}px\n` +
      `  most common: ${heuristics.borderRadius.mostCommon}px\n` +
      `  has variation: ${heuristics.borderRadius.hasVariation}\n` +
      `  samples: ${heuristics.borderRadius.values.slice(0, 10).join(', ')}px`
    : '  (no border-radius data)';

  const boxShadowSection = heuristics?.boxShadow
    ? `  count: ${heuristics.boxShadow.count}\n` +
      `  subtle: ${heuristics.boxShadow.hasSubtle}, bold: ${heuristics.boxShadow.hasBold}, colored: ${heuristics.boxShadow.hasColored}\n` +
      (heuristics.boxShadow.samples.length > 0
        ? `  samples:\n${heuristics.boxShadow.samples.map((s) => `    - ${s}`).join('\n')}`
        : '  samples: (none)')
    : '  (no box-shadow data)';

  const bordersSection = heuristics?.borders
    ? `  count: ${heuristics.borders.count}\n` +
      `  median width: ${heuristics.borders.medianWidth}px\n` +
      (heuristics.borders.colors.length > 0
        ? `  colors: ${heuristics.borders.colors.join(', ')}`
        : '  colors: (none)')
    : '  (no border data)';

  const spacingSection = heuristics?.spacing
    ? `  grid base: ${heuristics.spacing.gridBase ?? 'unknown'}px\n` +
      `  median: ${heuristics.spacing.median}px\n` +
      `  samples: ${heuristics.spacing.values.slice(0, 20).join(', ')}px`
    : '  (no spacing data)';

  const gradientsSection = heuristics?.gradients && heuristics.gradients.count > 0
    ? `  count: ${heuristics.gradients.count}\n` +
      `  samples:\n${heuristics.gradients.samples.map((s) => `    - ${s}`).join('\n')}`
    : '  (no gradients observed in CSS)';

  const glassmorphismSection = heuristics?.glassmorphism
    ? `  detected: ${heuristics.glassmorphism.detected}\n` +
      `  backdrop-filter: ${heuristics.glassmorphism.backdropFilter}, semi-transparent bg: ${heuristics.glassmorphism.semiTransparentBg}`
    : '  (not analyzed)';

  return `Analyze this data and generate Design Language guidelines. BASE EVERY FIELD ON THE REAL CSS DATA BELOW — do not invent values that aren't supported by the evidence.

## Source
${source}

## Brand Color Palette (use these hex values for gradient descriptions)
${paletteSection}

## CSS Design Variables (spacing, radius, grid, shadow, gradient)
${designVars}

## Detected Fonts (for icon style consistency)
${fontsSection}

## Border Radius — observed from CSS
${borderRadiusSection}

## Box Shadow — observed from CSS
${boxShadowSection}

## Borders — observed from CSS
${bordersSection}

## Spacing (padding / margin / gap) — observed from CSS
${spacingSection}

## Gradients — observed from CSS (use these exact values in the gradientsEffects output)
${gradientsSection}

## Glassmorphism (backdrop-filter + semi-transparent backgrounds)
${glassmorphismSection}

---

Return a JSON object with this exact structure:
{
  "graphicElements": {
    "brandShapes": ["e.g., Rounded rectangles", "Circular badges"],
    "decorativeElements": ["e.g., Gradient overlays", "Subtle line dividers"],
    "visualDevices": ["e.g., Card-based layouts", "Icon+text pairings"],
    "usageNotes": "Brief description of how graphic elements are used"
  },
  "graphicElementsDonts": [
    "e.g., Avoid sharp geometric shapes that clash with the rounded brand style"
  ],
  "patternsTextures": {
    "patterns": ["e.g., Subtle dot grid for backgrounds"],
    "textures": ["e.g., Smooth gradients, no heavy textures"],
    "backgrounds": ["e.g., Light neutral backgrounds with white cards"],
    "usageNotes": "Brief description of pattern/texture approach"
  },
  "iconographyStyle": {
    "style": "line|fill|duo-tone|custom",
    "strokeWeight": "e.g., 1.5px",
    "cornerRadius": "e.g., 2px",
    "sizing": "e.g., 16/20/24/32px",
    "colorUsage": "e.g., Primary brand color for active, gray-500 for inactive",
    "usageNotes": "Brief description of icon approach"
  },
  "iconographyDonts": [
    "e.g., Don't mix filled and outlined icons in the same context"
  ],
  "gradientsEffects": [
    {
      "name": "Primary Gradient",
      "type": "linear",
      "colors": ["#hex1", "#hex2"],
      "angle": "135deg",
      "usage": "Hero sections, CTA buttons"
    }
  ],
  "layoutPrinciples": {
    "gridSystem": "e.g., 12-column grid with max-width 1280px",
    "spacingScale": "e.g., 4px base unit (4, 8, 12, 16, 24, 32, 48, 64)",
    "whitespacePhilosophy": "e.g., Generous whitespace for a premium, clean feel",
    "compositionRules": [
      "e.g., Content sections use consistent 64px vertical spacing",
      "Cards use 24px internal padding with 16px gap between items"
    ],
    "usageNotes": "Brief description of layout approach"
  }
}

IMPORTANT:
- For graphicElements: identify 2-4 items per sub-array. Focus on distinctive, recurring elements.
- For iconographyStyle.style: choose from "line", "fill", "duo-tone", or "custom". If a known icon library is detected (Lucide, Heroicons, FontAwesome, Material Icons), mention it in usageNotes.
- For iconographyStyle.strokeWeight: MUST be a numeric CSS value like "1.5px" or "2px". Never descriptive words.
- For iconographyStyle.cornerRadius: MUST be a numeric CSS value like "0px" (sharp), "2px" (slightly rounded), or "4px" (rounded). Never descriptive words like "Rounded".
- For iconographyStyle.sizing: MUST list numeric sizes separated by "/" like "16/20/24/32px". These are the icon size steps used in the design system.
- For layoutPrinciples.gridSystem: MUST include the column count with the word "column", e.g. "12-column grid with 24px gutters" or "8-column responsive grid". This is used for visual grid previews.
- For gradientsEffects: extract ACTUAL gradients from CSS if found. If no gradients detected, provide 1-2 recommendations based on the brand colors. Maximum 4 gradients.
- For layoutPrinciples: extract actual spacing/grid values from CSS variables if available. If not, analyze the visual rhythm.
- Prefix recommendations with "RECOMMENDED:" to distinguish from observed patterns.
- Be specific to THIS brand. Generic advice like "use consistent spacing" is not helpful.`;
}

// Re-export the system prompts for the analysis engine
export const VISUAL_IDENTITY_SYSTEM = VISUAL_IDENTITY_SYSTEM_PROMPT;
export const VOICE_IMAGERY_SYSTEM = VOICE_IMAGERY_SYSTEM_PROMPT;
export const DESIGN_LANGUAGE_SYSTEM = DESIGN_LANGUAGE_SYSTEM_PROMPT;

// Legacy combined prompt for PDF (simpler than two-phase since PDFs have less structured data)
export const PDF_ANALYSIS_SYSTEM_PROMPT = `You are an expert brand designer and visual identity analyst. Analyze the extracted PDF document data and produce a comprehensive brand styleguide.

CRITICAL RULES:
- Extract guidelines faithfully from the document if they exist.
- For colors: categorize as PRIMARY, SECONDARY, ACCENT, NEUTRAL, or SEMANTIC.
- For colors: give descriptive names (e.g., "Ocean Blue") not just hex codes.
- For typeScale: ONLY report sizes explicitly mentioned in the document. If none mentioned, return empty array [].
- For tone-of-voice: analyze the document's writing style. Prefix with OBSERVED: or RECOMMENDED:.
- For imagery: distinguish between what's described in the document (OBSERVED) and your suggestions (RECOMMENDED).
- All guidelines must be specific, not generic.
- Return ONLY valid JSON.`;
