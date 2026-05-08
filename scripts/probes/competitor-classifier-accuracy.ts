/**
 * A3 validatie-probe voor competitor-content-item-discovery
 * (idea-doc `tasks/_drafts/idea-competitor-content-item-discovery.md`).
 *
 * Doel: meten of een URL-only AI-classifier voldoende accuracy haalt
 * (≥ 80%) om in MVP-pad de format-detectie te dragen. Sitemap.xml geeft
 * alleen URL + lastmod — geen titel of beschrijving — dus de classifier
 * moet uit de URL-shape alleen kunnen concluderen.
 *
 * Sample: 25 URLs met hand-gelabelde ground-truth uit drie sitemaps:
 *   - Storax (NL industrieel; news + projecten)
 *   - Branding a Better World (NL agency; blog + cases)
 *   - Metaal Art (NL industrieel; projecten + statics + tools)
 *
 * Uitvoer:
 *   - Per URL: ground-truth vs AI-prediction
 *   - Confusion-matrix-style aggregaat
 *   - Overall accuracy
 *
 * Run: ANTHROPIC_API_KEY=... npx tsx scripts/probes/competitor-classifier-accuracy.ts
 */
import Anthropic from '@anthropic-ai/sdk';

const FORMATS = [
  'BLOG_POST',
  'PRESS_RELEASE',
  'CASE_STUDY',
  'EBOOK',
  'WEBINAR',
  'PODCAST',
  'VIDEO',
  'SOCIAL_POST',
  'DOC',
  'TOOL',
  'EVENT',
  'OTHER',
] as const;

type Format = (typeof FORMATS)[number];

interface SampleItem {
  url: string;
  truth: Format;
  source: string; // welke competitor — voor analyse
}

// Hand-gelabelde sample uit A2-probe sitemaps. 25 items, gespreid over
// Storax (NL B2B industrieel), BABW (NL agency), Metaal Art (B2C/B2B
// metalen-deuren). Mix van content-items en static/admin pagina's.
const SAMPLE: SampleItem[] = [
  // ─── Storax: news ─────────────────────────────────
  { url: 'https://www.storax.nl/nieuws/storax-is-verhuisd/', truth: 'PRESS_RELEASE', source: 'storax' },
  { url: 'https://www.storax.nl/nieuws/storax-goes-social/', truth: 'PRESS_RELEASE', source: 'storax' },
  { url: 'https://www.storax.nl/nieuws/asito-wint-duurzame-dinsdag-award-met-1-miljoen-druppels/', truth: 'PRESS_RELEASE', source: 'storax' },
  { url: 'https://www.storax.nl/nieuws/nieuwe-storax-documentatiemap/', truth: 'PRESS_RELEASE', source: 'storax' },
  // ─── Storax: projecten ────────────────────────────
  { url: 'https://www.storax.nl/projecten/roc-leiden/', truth: 'CASE_STUDY', source: 'storax' },
  { url: 'https://www.storax.nl/projecten/metro-rotterdam/', truth: 'CASE_STUDY', source: 'storax' },
  { url: 'https://www.storax.nl/projecten/sylvius-leiden/', truth: 'CASE_STUDY', source: 'storax' },
  // ─── BABW: branding-tips (blog) ──────────────────
  { url: 'https://brandingabetterworld.com/branding-tips/merkpositionering/duurzaamheidsstrategie/', truth: 'BLOG_POST', source: 'babw' },
  { url: 'https://brandingabetterworld.com/branding-tips/content/tips-krachtige-copy-online-community/', truth: 'BLOG_POST', source: 'babw' },
  { url: 'https://brandingabetterworld.com/branding-tips/merkstrategie/merkidentiteit-merkpersoonlijkheid/', truth: 'BLOG_POST', source: 'babw' },
  { url: 'https://brandingabetterworld.com/branding-tips/merkpositionering/communicatie-energietransitie/', truth: 'BLOG_POST', source: 'babw' },
  { url: 'https://brandingabetterworld.com/branding-tips/merkpositionering/purpose-marketing/', truth: 'BLOG_POST', source: 'babw' },
  // ─── BABW: cases ──────────────────────────────────
  { url: 'https://brandingabetterworld.com/branding-cases/campagne/bovenij-ziekenhuis/', truth: 'CASE_STUDY', source: 'babw' },
  { url: 'https://brandingabetterworld.com/branding-cases/strategie/gemeente-amsterdam/', truth: 'CASE_STUDY', source: 'babw' },
  { url: 'https://brandingabetterworld.com/branding-cases/campagne/weleda/', truth: 'CASE_STUDY', source: 'babw' },
  { url: 'https://brandingabetterworld.com/branding-cases/strategie/circularco/', truth: 'CASE_STUDY', source: 'babw' },
  // ─── Metaal Art: projecten (cases) ────────────────
  { url: 'https://www.metaal-art.nl/projecten/stalen-taatsdeuren-en-een-scharnierdeur-met-1-deel-glas/', truth: 'CASE_STUDY', source: 'metaal-art' },
  { url: 'https://www.metaal-art.nl/projecten/een-stalen-middenboomtrap-met-eiken-treden-en-glazen-balustrade/', truth: 'CASE_STUDY', source: 'metaal-art' },
  { url: 'https://www.metaal-art.nl/projecten/een-stalen-taatsdeur-met-slanke-profielen/', truth: 'CASE_STUDY', source: 'metaal-art' },
  // ─── Metaal Art: statics (OTHER / DOC / TOOL) ─────
  { url: 'https://www.metaal-art.nl/contact/', truth: 'OTHER', source: 'metaal-art' },
  { url: 'https://www.metaal-art.nl/over-ons/', truth: 'OTHER', source: 'metaal-art' },
  { url: 'https://www.metaal-art.nl/team/', truth: 'OTHER', source: 'metaal-art' },
  { url: 'https://www.metaal-art.nl/algemene-voorwaarden/', truth: 'DOC', source: 'metaal-art' },
  { url: 'https://www.metaal-art.nl/deurconfigurator/', truth: 'TOOL', source: 'metaal-art' },
  { url: 'https://www.metaal-art.nl/veelgestelde-vragen/', truth: 'DOC', source: 'metaal-art' },
];

const SYSTEM_PROMPT = `You are classifying URLs from competitor websites by their content format.

Given a single URL, determine which ContentFormat best describes the page.
Use ONLY URL-shape signals (path, slug-keywords) — you cannot fetch the page.

Pick exactly one of these formats:
- BLOG_POST       (article, opinion, branding tip, marketing how-to under /blog/, /branding-tips/, /article/, /post/)
- PRESS_RELEASE   (news, announcement, milestone under /news/, /nieuws/, /press/, /persbericht/)
- CASE_STUDY      (customer story, project showcase, case under /case/, /projecten/, /portfolio/, /stories/, /cases/)
- EBOOK           (whitepaper, downloadable guide, ebook)
- WEBINAR         (webinar, online seminar)
- PODCAST         (podcast episode)
- VIDEO           (standalone video page, /watch/, /video/)
- SOCIAL_POST     (link to LinkedIn/X/Instagram post)
- DOC             (documentation, FAQ, terms, policy, help-center, /docs/, /support/, /faq/, /voorwaarden/)
- TOOL            (interactive tool, configurator, calculator)
- EVENT           (event page, conference, meetup)
- OTHER           (homepage, /contact/, /about/, /team/, /careers/, listing/index pages — anything that is not itself a content-item)

Respond with EXACTLY one enum value on a single line. No explanation, no quotes.`;

function buildUserPrompt(url: string): string {
  return `URL: ${url}\n\nFormat:`;
}

interface ClassificationResult extends SampleItem {
  prediction: Format | 'PARSE_ERROR';
  correct: boolean;
}

async function classifyOne(client: Anthropic, item: SampleItem): Promise<ClassificationResult> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 20,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(item.url) }],
  });

  const text = response.content
    .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
    .toUpperCase();

  // Pak eerste regel, strip eventuele code-fences/quotes
  const cleaned = text.split('\n')[0]?.replace(/[`"']/g, '').trim() ?? '';

  const isValid = (FORMATS as readonly string[]).includes(cleaned);
  const prediction: Format | 'PARSE_ERROR' = isValid ? (cleaned as Format) : 'PARSE_ERROR';

  return {
    ...item,
    prediction,
    correct: prediction === item.truth,
  };
}

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is required');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  console.log('='.repeat(80));
  console.log(`A3 classifier-accuracy probe — ${SAMPLE.length} hand-labeled URLs`);
  console.log('  Model: claude-haiku-4-5-20251001 (URL-only classification)');
  console.log('='.repeat(80));
  console.log();

  const results: ClassificationResult[] = [];
  for (const item of SAMPLE) {
    try {
      const result = await classifyOne(client, item);
      results.push(result);
      const mark = result.correct ? '✓' : '✗';
      const truncatedUrl = item.url.length > 60 ? '...' + item.url.slice(-57) : item.url;
      console.log(
        `  ${mark} ${truncatedUrl.padEnd(60)} truth=${item.truth.padEnd(14)} pred=${result.prediction}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${item.url} — error: ${message}`);
      results.push({ ...item, prediction: 'PARSE_ERROR', correct: false });
    }
  }

  console.log();
  console.log('='.repeat(80));

  const total = results.length;
  const correct = results.filter((r) => r.correct).length;
  const parseErrors = results.filter((r) => r.prediction === 'PARSE_ERROR').length;
  const accuracy = total > 0 ? (correct / total) * 100 : 0;

  console.log(`Correct:        ${correct}/${total} (${accuracy.toFixed(1)}%)`);
  console.log(`Parse errors:   ${parseErrors}/${total}`);
  console.log();

  // Per-source breakdown
  const sources = Array.from(new Set(results.map((r) => r.source)));
  console.log('Per-source accuracy:');
  for (const source of sources) {
    const sub = results.filter((r) => r.source === source);
    const subCorrect = sub.filter((r) => r.correct).length;
    const subPct = sub.length > 0 ? ((subCorrect / sub.length) * 100).toFixed(1) : '-';
    console.log(`  ${source.padEnd(12)} ${subCorrect}/${sub.length} (${subPct}%)`);
  }
  console.log();

  // Per-truth-format breakdown (waar liggen de gaten?)
  const truthFormats = Array.from(new Set(results.map((r) => r.truth)));
  console.log('Per-format recall (van ground-truth):');
  for (const fmt of truthFormats) {
    const sub = results.filter((r) => r.truth === fmt);
    const subCorrect = sub.filter((r) => r.correct).length;
    const subPct = sub.length > 0 ? ((subCorrect / sub.length) * 100).toFixed(1) : '-';
    console.log(`  ${fmt.padEnd(15)} ${subCorrect}/${sub.length} (${subPct}%)`);
  }
  console.log();

  // Misclassified items voor inspectie
  const misses = results.filter((r) => !r.correct);
  if (misses.length > 0) {
    console.log('Misclassified URLs:');
    for (const m of misses) {
      console.log(`  truth=${m.truth.padEnd(14)} pred=${m.prediction.padEnd(14)} ${m.url}`);
    }
    console.log();
  }

  console.log('Verdict per idea-doc threshold:');
  if (accuracy >= 80) {
    console.log('  ✓ AI-classifier MVP-PAD (≥ 80% accuracy)');
  } else if (accuracy >= 65) {
    console.log('  ⚠ Acceptabel maar niet ideaal — overweeg URL+title-fetch enrichment');
  } else {
    console.log('  ✗ AI-classifier alleen niet voldoende — defer formats naar post-launch met enkel BLOG_POST detection');
  }
  console.log('='.repeat(80));
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
