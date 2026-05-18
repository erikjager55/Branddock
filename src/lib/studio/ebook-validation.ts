/**
 * E-book output validation utility (long-form.ts EBOOK_SYSTEM companion).
 *
 * Achtergrond: handmatige test 2026-05-18 toonde chapter-title paraphrase-drift
 * (H4 "Van meting tot montage" + H6 "Van netting tot montage") + chapter-length
 * asymmetry (front-loading bias). Prompt-guards zijn primair, deze utility is
 * vangnet: detecteer overtredingen in LLM-output zodat smoke-tests/orchestrator
 * een warning-signal hebben.
 *
 * Scope: pure functions over generated text. Geen Prisma, geen AI-calls.
 */

export type EbookValidationIssue = {
  kind: 'duplicate-title' | 'paraphrase-title' | 'chapter-length-out-of-bounds' | 'missing-key-takeaway' | 'too-few-chapters' | 'too-many-chapters';
  severity: 'error' | 'warning';
  detail: string;
  chapterIndex?: number;
  chapterTitle?: string;
};

export type EbookValidationResult = {
  ok: boolean;
  issues: EbookValidationIssue[];
  chapters: Array<{ index: number; title: string; wordCount: number; hasKeyTakeaway: boolean }>;
};

/**
 * Hard word-count ranges per chapter (matches EBOOK_SYSTEM completeness checklist).
 * Tuple: [minWords, maxWords]. Index = chapter number (1-indexed; index 0 unused).
 */
const CHAPTER_WORD_BOUNDS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],         // index 0 placeholder
  [800, 1000],    // Ch1
  [600, 700],     // Ch2
  [600, 700],     // Ch3
  [400, 500],     // Ch4
  [300, 400],     // Ch5
];

const EXPECTED_CHAPTER_COUNT = 5;

/**
 * Pak H2 headings als chapter-markers. Match "## titel" of "Chapter N: titel"
 * style. Slaat de "Table of Contents" / "Introduction" / "Conclusion" headers
 * over door op chapter-pattern te filteren.
 */
function extractChapters(markdown: string): Array<{ index: number; title: string; body: string }> {
  const lines = markdown.split('\n');
  const chapterStarts: number[] = [];
  const chapterTitles: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^##\s+(?:Chapter\s+(\d+)[:\s—-]+)?(.+)$/i);
    if (!m) continue;
    const title = (m[2] ?? '').trim();
    if (!title) continue;
    // Filter out structural headers
    const lower = title.toLowerCase();
    if (
      lower === 'table of contents' ||
      lower === 'introduction' ||
      lower === 'conclusion' ||
      lower === 'inhoudsopgave' ||
      lower === 'inleiding' ||
      lower === 'conclusie' ||
      lower.startsWith('wat je leert') ||
      lower.startsWith('what you will learn')
    ) {
      continue;
    }
    chapterStarts.push(i);
    chapterTitles.push(title);
  }

  const chapters: Array<{ index: number; title: string; body: string }> = [];
  for (let i = 0; i < chapterStarts.length; i++) {
    const start = chapterStarts[i] + 1;
    const end = i + 1 < chapterStarts.length ? chapterStarts[i + 1] : lines.length;
    const body = lines.slice(start, end).join('\n').trim();
    chapters.push({ index: i + 1, title: chapterTitles[i], body });
  }
  return chapters;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * Bepaal of twee chapter-titels te dicht op elkaar zitten — exacte match,
 * normalized match, of paraphrase (>50% gedeelde woorden van 3+ chars).
 * Vangt zowel "Van meting tot montage" = "van meting tot montage" als
 * "Van meting tot montage" ≈ "Van netting tot montage" (4/4 → 3/4 shared).
 */
function titlesTooSimilar(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-zàâäæçéèêëîïôœùûüÿñ\s]/gi, '').trim();
  const na = norm(a);
  const nb = norm(b);
  if (na === nb) return true;
  const wordsA = new Set(na.split(/\s+/).filter((w) => w.length >= 3));
  const wordsB = new Set(nb.split(/\s+/).filter((w) => w.length >= 3));
  if (wordsA.size === 0 || wordsB.size === 0) return false;
  let shared = 0;
  for (const w of wordsA) if (wordsB.has(w)) shared++;
  const overlap = shared / Math.min(wordsA.size, wordsB.size);
  return overlap > 0.5;
}

function hasKeyTakeawayBox(body: string): boolean {
  // EBOOK_SYSTEM format: `> **Key Takeaway**: ...` — accept slight variants
  return /(^|\n)\s*>\s*\*\*key[\s-]?takeaway\*\*\s*:/i.test(body);
}

/**
 * Validate generated e-book markdown against EBOOK_SYSTEM prompt-rules.
 * Returns ok=false als er error-level issues zijn; warnings tellen niet mee.
 */
export function validateEbookOutput(markdown: string): EbookValidationResult {
  const chapters = extractChapters(markdown);
  const chapterData = chapters.map((c) => ({
    index: c.index,
    title: c.title,
    wordCount: countWords(c.body),
    hasKeyTakeaway: hasKeyTakeawayBox(c.body),
  }));
  const issues: EbookValidationIssue[] = [];

  // 1. Chapter count
  if (chapters.length < EXPECTED_CHAPTER_COUNT) {
    issues.push({
      kind: 'too-few-chapters',
      severity: 'error',
      detail: `Expected ${EXPECTED_CHAPTER_COUNT} chapters, found ${chapters.length}`,
    });
  } else if (chapters.length > EXPECTED_CHAPTER_COUNT) {
    issues.push({
      kind: 'too-many-chapters',
      severity: 'warning',
      detail: `Expected ${EXPECTED_CHAPTER_COUNT} chapters, found ${chapters.length} — possible structural drift`,
    });
  }

  // 2. Title uniqueness (paraphrase + exact)
  for (let i = 0; i < chapters.length; i++) {
    for (let j = i + 1; j < chapters.length; j++) {
      const a = chapters[i].title;
      const b = chapters[j].title;
      if (a.toLowerCase().trim() === b.toLowerCase().trim()) {
        issues.push({
          kind: 'duplicate-title',
          severity: 'error',
          detail: `Chapters ${i + 1} and ${j + 1} share the exact same title: "${a}"`,
          chapterIndex: j + 1,
          chapterTitle: b,
        });
      } else if (titlesTooSimilar(a, b)) {
        issues.push({
          kind: 'paraphrase-title',
          severity: 'error',
          detail: `Chapters ${i + 1} ("${a}") and ${j + 1} ("${b}") are paraphrase-duplicates (>50% shared content words)`,
          chapterIndex: j + 1,
          chapterTitle: b,
        });
      }
    }
  }

  // 3. Per-chapter word-count bounds (only check chapters 1-5)
  for (const c of chapterData.slice(0, EXPECTED_CHAPTER_COUNT)) {
    const bounds = CHAPTER_WORD_BOUNDS[c.index];
    if (!bounds) continue;
    const [min, max] = bounds;
    if (c.wordCount < min || c.wordCount > max) {
      issues.push({
        kind: 'chapter-length-out-of-bounds',
        severity: c.wordCount < min * 0.7 || c.wordCount > max * 1.3 ? 'error' : 'warning',
        detail: `Chapter ${c.index} "${c.title}" has ${c.wordCount} words; expected ${min}-${max}`,
        chapterIndex: c.index,
        chapterTitle: c.title,
      });
    }
  }

  // 4. Key Takeaway box per chapter
  for (const c of chapterData) {
    if (!c.hasKeyTakeaway) {
      issues.push({
        kind: 'missing-key-takeaway',
        severity: 'warning',
        detail: `Chapter ${c.index} "${c.title}" mist een "> **Key Takeaway**: ..." block`,
        chapterIndex: c.index,
        chapterTitle: c.title,
      });
    }
  }

  const hasErrors = issues.some((i) => i.severity === 'error');
  return { ok: !hasErrors, issues, chapters: chapterData };
}

/**
 * Formatteer een validation result voor logging / CLI output.
 */
export function formatEbookValidationReport(result: EbookValidationResult): string {
  const lines: string[] = [];
  lines.push(`E-book validation: ${result.ok ? 'PASS' : 'FAIL'}`);
  lines.push(`Chapters detected: ${result.chapters.length}`);
  for (const c of result.chapters) {
    const takeaway = c.hasKeyTakeaway ? '✓' : '✗';
    lines.push(`  Ch${c.index} "${c.title}" — ${c.wordCount} words — Key Takeaway: ${takeaway}`);
  }
  if (result.issues.length > 0) {
    lines.push(`\nIssues (${result.issues.length}):`);
    for (const issue of result.issues) {
      lines.push(`  [${issue.severity.toUpperCase()}] ${issue.kind}: ${issue.detail}`);
    }
  } else {
    lines.push('\nNo issues found.');
  }
  return lines.join('\n');
}
