// =============================================================
// AI Prompt Templates for Brandstyle Analysis
//
// Two-phase approach:
// 1. Visual Identity — colors + typography + logo (data-driven)
// 2. Voice & Imagery — tone + photography + illustration (text-driven)
// =============================================================

import type { CssVariable, ColorFrequency, FontSizeEntry, ScrapedBrandImage } from './url-scraper';

// ─── Processed Data Interface ─────────────────────────

export interface ProcessedColorGroup {
  /** Colors from CSS variables (highest confidence) */
  fromVariables: Array<{ name: string; hex: string }>;
  /** Colors by frequency (framework-filtered) */
  byFrequency: ColorFrequency[];
  /** Remaining unique colors not in the above */
  other: string[];
}

export interface ProcessedData {
  url?: string;
  title: string | null;
  description: string | null;
  bodyText: string;
  colorGroups: ProcessedColorGroup;
  fonts: string[];
  fontSizes: FontSizeEntry[];
  logoUrls: string[];
  cssVariables: CssVariable[];
  brandImages?: ScrapedBrandImage[];
  isPdf?: boolean;
  pdfFileName?: string;
  pdfMetadata?: { title: string | null; author: string | null };
}

// ─── Visual Identity Prompt (Call 1) ──────────────────

const VISUAL_IDENTITY_SYSTEM_PROMPT = `You are an expert brand designer specializing in visual identity systems. Analyze the extracted website/document data and produce structured color, typography, and logo guidelines.

CRITICAL RULES:
1. For COLORS: Prioritize CSS variables (highest confidence of being intentional brand colors). Frequency data shows how often colors appear — higher frequency = more important.
2. For COLORS: Categorize as PRIMARY (main brand color, 1-2 max), SECONDARY (supporting color), ACCENT (CTAs/highlights), NEUTRAL (grays/backgrounds, MAX 2-3), or SEMANTIC (success/error/warning states).
3. For COLORS: Give each color a descriptive name (e.g., "Ocean Blue", "Warm Coral") — never just the hex code.
4a. For COLORS: STRONGLY LIMIT neutral/gray colors. Only include neutrals that are intentionally branded (e.g., a specific dark gray used for body text). Do NOT include generic grays, near-white backgrounds (#F5F5F5, #FAFAFA), or near-black text (#111, #222, #333). Focus on distinctive brand colors.
4. For TYPOGRAPHY: ONLY report font sizes that are actually found in the extracted data. If no font sizes were extracted, set typeScale to an EMPTY array []. Never invent or hallucinate font sizes.
5. For LOGOS: Base guidelines on the logo URLs found. If no logos were found, state that and suggest the brand add visible logo markup.
6. Return ONLY valid JSON. No markdown, no explanation.`;

/**
 * Build the Visual Identity prompt (colors + typography + logo).
 * Input: structured color groups, fonts, sizes, logos.
 */
export function buildVisualIdentityPrompt(data: ProcessedData): string {
  const { fonts, fontSizes, logoUrls, cssVariables } = data;
  // Defensive: ensure colorGroups and sub-arrays are always valid
  const colorGroups: ProcessedColorGroup = {
    fromVariables: data.colorGroups?.fromVariables ?? [],
    byFrequency: data.colorGroups?.byFrequency ?? [],
    other: data.colorGroups?.other ?? [],
  };

  // Format CSS variables (highest confidence brand colors)
  const varsSection = (cssVariables ?? []).length > 0
    ? cssVariables
      .filter((v) => v.context === 'root' && /^#[0-9A-Fa-f]{3,6}$/i.test(v.value))
      .map((v) => `  ${v.name}: ${v.value}`)
      .join('\n') || 'None with resolved hex values'
    : 'No CSS variables found';

  // Format from-variables colors
  const fromVarsSection = colorGroups.fromVariables.length > 0
    ? colorGroups.fromVariables.map((c) => `  ${c.name} → ${c.hex}`).join('\n')
    : 'None';

  // Format frequency colors (top 20)
  const freqSection = colorGroups.byFrequency.length > 0
    ? colorGroups.byFrequency
      .slice(0, 20)
      .map((c) => `  ${c.hex} (${c.count}× in ${c.contexts.join(', ')})`)
      .join('\n')
    : 'No color frequency data';

  // Format other colors
  const otherSection = colorGroups.other.length > 0
    ? colorGroups.other.slice(0, 15).join(', ')
    : 'None';

  // Format fonts
  const fontsSection = fonts.length > 0 ? fonts.join(', ') : 'No fonts detected';

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

  return `Analyze this data and generate a Visual Identity styleguide.

## Source
${source}

## CSS Custom Properties (HIGHEST CONFIDENCE — these are intentional brand colors)
${varsSection}

## Colors Resolved from Variables
${fromVarsSection}

## Color Frequency Analysis (framework colors already filtered out)
${freqSection}

## Other Extracted Colors
${otherSection}

## Detected Fonts
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
      "name": "Descriptive Color Name",
      "hex": "#RRGGBB",
      "category": "PRIMARY|SECONDARY|ACCENT|NEUTRAL|SEMANTIC",
      "tags": ["tag1", "tag2"],
      "notes": "How this color is used on the site"
    }
  ],
  "primaryFontName": "Font Name or null",
  "primaryFontUrl": "Google Fonts URL or null",
  "typeScale": [],
  "logoGuidelines": ["guideline 1", "guideline 2"],
  "logoDonts": ["don't 1", "don't 2"],
  "colorDonts": ["don't 1", "don't 2"]
}

IMPORTANT:
- Maximum 10 colors total. At most 2-3 NEUTRAL colors (only if they are distinctive branded grays). Focus on PRIMARY, SECONDARY, and ACCENT colors that define the brand. Prioritize CSS variable colors, then high-frequency colors, then others.
- For typeScale: ONLY populate with font sizes from the "Observed Font Sizes" section above. Map observed sizes to their semantic level (H1, H2, H3, Body, Small, Caption) based on the selector context and size. If no font sizes were extracted, return an EMPTY array [].
- Each typeScale entry: { "level": "H1", "name": "Heading 1", "size": "36px", "lineHeight": "calculated", "weight": "estimated", "color": "#333333" }
- For color in typeScale: Extract the actual text color used for that level from the CSS (e.g., headings might use #1A1A1A, body text #333333). If not found, use the most common text color.
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
    "cornerRadius": "Rounded",
    "sizing": "16px inline, 24px standalone",
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
- Maximum 12 colors total. Maximum 4 gradients.
- Be specific to this brand, not generic.`;
}

// ─── Design Language Prompt (Call 3) ─────────────────

const DESIGN_LANGUAGE_SYSTEM_PROMPT = `You are an expert brand designer specializing in design systems and visual design language. Analyze the extracted website/document data and produce structured design language guidelines covering graphic elements, patterns, iconography, gradients, and layout principles.

CRITICAL RULES:
1. Base analysis on the ACTUAL CSS, HTML structure, and visual patterns found in the data.
2. For GRADIENTS: Extract real CSS gradients if found. Include the exact colors and angles.
3. For ICONOGRAPHY: Determine icon style from icon libraries detected (e.g., Lucide, FontAwesome, Material Icons, Heroicons) or SVG patterns.
4. For LAYOUT: Extract actual spacing values, grid patterns, and border-radius values from CSS.
5. For GRAPHIC ELEMENTS: Identify decorative shapes, dividers, overlays, or recurring visual motifs.
6. For PATTERNS: Identify background patterns, textures, or surface treatments.
7. If something is NOT detected, you may RECOMMEND based on the brand's existing visual identity (colors, typography, tone). Prefix with "RECOMMENDED:".
8. Return ONLY valid JSON. No markdown, no explanation.`;

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

  return `Analyze this data and generate Design Language guidelines.

## Source
${source}

## CSS Design Variables (spacing, radius, grid, shadow, gradient)
${designVars}

## Detected Fonts (for icon style consistency)
${fontsSection}

## Number of Brand Colors Available
${data.colorGroups?.fromVariables?.length ?? 0} from CSS variables, ${data.colorGroups?.byFrequency?.length ?? 0} by frequency

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
    "cornerRadius": "e.g., Rounded",
    "sizing": "e.g., 16px inline, 24px standalone, 48px feature",
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
- For iconographyStyle.style: choose from "line", "fill", "duo-tone", or "custom". If a known icon library is detected (Lucide, Heroicons, FontAwesome, Material Icons), mention it.
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
