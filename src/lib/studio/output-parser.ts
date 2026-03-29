// =============================================================
// Studio Output Parser
//
// Converts raw AI text output into TipTap-compatible HTML.
// Handles:
//  - Markdown → HTML conversion (headings, lists, bold, italic, links)
//  - Code block / markdown fence cleanup
//  - Empty / malformed output fallback
// =============================================================

// ─── Markdown → HTML Converter ─────────────────────────────

/**
 * Convert markdown text to semantic HTML that TipTap can render.
 * Handles common markdown patterns: headings, bold, italic, links,
 * ordered/unordered lists, blockquotes, horizontal rules, paragraphs.
 */
export function markdownToHtml(md: string): string {
  let text = md.trim();

  // Strip markdown code fences (```html ... ``` or ``` ... ```)
  text = text.replace(/^```(?:html)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '');

  // If the AI returned raw HTML (starts with a tag), return as-is
  if (/^\s*<(?:h[1-6]|p|div|ul|ol|blockquote|section|article|header|hr)/i.test(text)) {
    return text.trim();
  }

  const lines = text.split('\n');
  const htmlLines: string[] = [];
  let inList: 'ul' | 'ol' | null = null;
  let inBlockquote = false;

  function closeList() {
    if (inList) {
      htmlLines.push(`</${inList}>`);
      inList = null;
    }
  }

  function closeBlockquote() {
    if (inBlockquote) {
      htmlLines.push('</blockquote>');
      inBlockquote = false;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Empty line — close lists and blockquotes, skip
    if (line.trim() === '') {
      closeList();
      closeBlockquote();
      continue;
    }

    // Headings: # through ######
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      closeList();
      closeBlockquote();
      const level = headingMatch[1].length;
      const content = inlineFormat(headingMatch[2]);
      htmlLines.push(`<h${level}>${content}</h${level}>`);
      continue;
    }

    // Horizontal rule: --- or *** or ___
    if (/^[-*_]{3,}\s*$/.test(line.trim())) {
      closeList();
      closeBlockquote();
      htmlLines.push('<hr>');
      continue;
    }

    // Blockquote: > text
    const bqMatch = line.match(/^>\s*(.*)$/);
    if (bqMatch) {
      closeList();
      if (!inBlockquote) {
        htmlLines.push('<blockquote>');
        inBlockquote = true;
      }
      const content = inlineFormat(bqMatch[1]);
      if (content) htmlLines.push(`<p>${content}</p>`);
      continue;
    } else if (inBlockquote) {
      closeBlockquote();
    }

    // Ordered list: 1. text, 2. text, etc.
    const olMatch = line.match(/^\d+[.)]\s+(.+)$/);
    if (olMatch) {
      closeBlockquote();
      if (inList !== 'ol') {
        closeList();
        htmlLines.push('<ol>');
        inList = 'ol';
      }
      htmlLines.push(`<li>${inlineFormat(olMatch[1])}</li>`);
      continue;
    }

    // Unordered list: - text, * text, + text
    const ulMatch = line.match(/^[-*+]\s+(.+)$/);
    if (ulMatch) {
      closeBlockquote();
      if (inList !== 'ul') {
        closeList();
        htmlLines.push('<ul>');
        inList = 'ul';
      }
      htmlLines.push(`<li>${inlineFormat(ulMatch[1])}</li>`);
      continue;
    }

    // Regular paragraph
    closeList();
    closeBlockquote();
    htmlLines.push(`<p>${inlineFormat(line)}</p>`);
  }

  closeList();
  closeBlockquote();

  return htmlLines.join('\n');
}

/**
 * Apply inline formatting: bold, italic, links, inline code.
 */
function inlineFormat(text: string): string {
  let result = text;

  // Links: [text](url)
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-primary underline cursor-pointer">$1</a>',
  );

  // Bold + Italic: ***text*** or ___text___
  result = result.replace(/\*{3}(.+?)\*{3}/g, '<strong><em>$1</em></strong>');
  result = result.replace(/_{3}(.+?)_{3}/g, '<strong><em>$1</em></strong>');

  // Bold: **text** or __text__
  result = result.replace(/\*{2}(.+?)\*{2}/g, '<strong>$1</strong>');
  result = result.replace(/_{2}(.+?)_{2}/g, '<strong>$1</strong>');

  // Italic: *text* or _text_
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
  result = result.replace(
    /(?<!\w)_(.+?)_(?!\w)/g,
    '<em>$1</em>',
  );

  // Inline code: `text`
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');

  return result;
}

// ─── Output Parsing ────────────────────────────────────────

/**
 * Parse raw AI output into clean HTML for TipTap.
 * Handles both raw HTML output and markdown output.
 */
export function parseGeneratedContent(rawOutput: string): string {
  if (!rawOutput || rawOutput.trim() === '') {
    return '<p>Content generation returned an empty result. Please try again.</p>';
  }

  return markdownToHtml(rawOutput);
}

/**
 * Parse AI output that may contain a JSON structure with text fields.
 * Falls back to treating the entire output as markdown if JSON parsing fails.
 */
export function parseStructuredOutput(rawOutput: string): {
  html: string;
  title?: string;
  metaDescription?: string;
  tags?: string[];
} {
  // Try to extract JSON
  try {
    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);

      // If the JSON has content/body/text fields, convert those
      const textContent =
        data.content || data.body || data.text || data.html || '';

      if (textContent) {
        return {
          html: markdownToHtml(textContent),
          title: data.title,
          metaDescription: data.metaDescription || data.meta_description,
          tags: data.tags || data.suggestedTags,
        };
      }

      // If the JSON has sections, build HTML from them
      if (Array.isArray(data.sections)) {
        const parts: string[] = [];
        if (data.title) parts.push(`<h1>${inlineFormat(data.title)}</h1>`);
        if (data.introduction || data.intro) {
          parts.push(markdownToHtml(data.introduction || data.intro));
        }
        for (const section of data.sections) {
          if (section.heading) parts.push(`<h2>${inlineFormat(section.heading)}</h2>`);
          if (section.body || section.content) {
            parts.push(markdownToHtml(section.body || section.content));
          }
        }
        if (data.conclusion) parts.push(markdownToHtml(data.conclusion));
        if (data.cta) parts.push(`<p><strong>${inlineFormat(data.cta)}</strong></p>`);

        return {
          html: parts.join('\n'),
          title: data.title,
          metaDescription: data.metaDescription || data.meta_description,
          tags: data.tags || data.suggestedTags,
        };
      }
    }
  } catch {
    // JSON parse failed — fall back to markdown
  }

  // Fallback: treat entire output as markdown
  return { html: markdownToHtml(rawOutput) };
}
