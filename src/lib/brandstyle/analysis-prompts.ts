// =============================================================
// AI Prompt Templates for Brandstyle Analysis
// =============================================================

/**
 * System prompt for brandstyle analysis.
 * Instructs the AI to act as a brand design expert.
 */
export const BRANDSTYLE_ANALYSIS_SYSTEM_PROMPT = `You are an expert brand designer and visual identity analyst. Your task is to analyze extracted website or document data and produce a comprehensive brand styleguide.

You must return a JSON object with the exact structure specified. Be specific, actionable, and professional in your guidelines. Base your analysis on the actual data provided — do not invent brand elements that aren't supported by the evidence.

Important rules:
- For colors: categorize them as PRIMARY, SECONDARY, ACCENT, NEUTRAL, or SEMANTIC based on their likely usage
- For colors: give each color a descriptive name (e.g., "Ocean Blue", "Warm Gray") not just the hex code
- For typography: identify the primary font and suggest a professional type scale
- For tone of voice: analyze the actual text content to determine the brand's communication style
- For imagery: provide realistic guidelines based on the brand's apparent industry and style
- All guidelines should be specific and actionable, not generic
- Always return valid JSON`;

/**
 * Build the analysis prompt for URL-scraped data
 */
export function buildUrlAnalysisPrompt(data: {
  url: string;
  title: string | null;
  description: string | null;
  bodyText: string;
  cssColors: string[];
  cssFonts: string[];
  logoUrls: string[];
}): string {
  return `Analyze the following website data and generate a complete brand styleguide.

## Source
URL: ${data.url}
Title: ${data.title || 'Unknown'}
Description: ${data.description || 'No description found'}

## Extracted Colors (from CSS)
${data.cssColors.length > 0 ? data.cssColors.join(', ') : 'No colors extracted from CSS'}

## Extracted Fonts (from CSS)
${data.cssFonts.length > 0 ? data.cssFonts.join(', ') : 'No fonts extracted from CSS'}

## Logo Candidates
${data.logoUrls.length > 0 ? data.logoUrls.join('\n') : 'No logos found'}

## Page Content (for tone analysis)
${data.bodyText || 'No text content extracted'}

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
  "typeScale": [
    { "level": "H1", "name": "Heading 1", "size": "36px", "lineHeight": "44px", "weight": "700" },
    { "level": "H2", "name": "Heading 2", "size": "28px", "lineHeight": "36px", "weight": "600" },
    { "level": "H3", "name": "Heading 3", "size": "22px", "lineHeight": "28px", "weight": "600" },
    { "level": "Body", "name": "Body", "size": "16px", "lineHeight": "24px", "weight": "400" },
    { "level": "Small", "name": "Small", "size": "14px", "lineHeight": "20px", "weight": "400" },
    { "level": "Caption", "name": "Caption", "size": "12px", "lineHeight": "16px", "weight": "500" }
  ],
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
  "colorDonts": ["don't 1", "don't 2"]
}

Important:
- Include ALL colors from the extracted CSS colors list, properly categorized and named
- If you can identify additional brand colors from the page content, include those too
- Maximum 12 colors total
- Adapt the type scale to match the detected font
- Make tone-of-voice guidelines specific to this brand's actual communication style`;
}

/**
 * Build the analysis prompt for PDF-extracted data
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
  "typeScale": [
    { "level": "H1", "name": "Heading 1", "size": "36px", "lineHeight": "44px", "weight": "700" },
    { "level": "H2", "name": "Heading 2", "size": "28px", "lineHeight": "36px", "weight": "600" },
    { "level": "H3", "name": "Heading 3", "size": "22px", "lineHeight": "28px", "weight": "600" },
    { "level": "Body", "name": "Body", "size": "16px", "lineHeight": "24px", "weight": "400" },
    { "level": "Small", "name": "Small", "size": "14px", "lineHeight": "20px", "weight": "400" },
    { "level": "Caption", "name": "Caption", "size": "12px", "lineHeight": "16px", "weight": "500" }
  ],
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
  "colorDonts": ["don't 1", "don't 2"]
}

Important:
- If the document contains explicit brand guidelines, extract them faithfully
- If colors are mentioned by name (e.g., "Brand Blue #2563EB"), use those exact values
- If fonts are explicitly specified, use those
- Infer tone-of-voice from the document's own writing style
- Maximum 12 colors total
- Be specific to this brand, not generic`;
}
