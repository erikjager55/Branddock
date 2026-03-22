// =============================================================
// Long-Form Content Templates (7 types)
// Blog Post, Pillar Page, Whitepaper, Case Study,
// E-book, Feature Article, Thought Leadership
// =============================================================

import type { PromptTemplate } from './helpers';
import { buildBaseSystemPrompt, extractTextSettings, buildContextBlock, formatAdditionalSettings } from './helpers';

const BLOG_POST_SYSTEM = buildBaseSystemPrompt(
  `You are an expert blog writer and content strategist. Write engaging, SEO-optimized blog posts that educate and convert readers. Your posts should have:
- A compelling hook in the first paragraph
- Clear subheadings (H2) every 200-300 words for scannability
- Actionable takeaways
- A strong conclusion with a call-to-action
- Natural keyword usage without keyword stuffing`,
);

const PILLAR_PAGE_SYSTEM = buildBaseSystemPrompt(
  `You are an expert content strategist specializing in pillar content and topic clusters. Create comprehensive, authoritative pillar pages (2000+ words) that serve as the definitive resource on a topic. Structure with:
- Clear H2 sections covering all major subtopics
- Internal linking opportunities (suggest where cluster content could link)
- A table of contents at the top
- FAQ sections where appropriate
- Data points and statistics to build authority`,
);

const WHITEPAPER_SYSTEM = buildBaseSystemPrompt(
  `You are a thought leadership writer specializing in whitepapers and research-backed content. Create authoritative, data-driven whitepapers with:
- An executive summary
- Problem statement with industry context
- Methodology or approach section
- Key findings with supporting evidence
- Recommendations and actionable insights
- Professional, formal tone appropriate for B2B decision-makers`,
);

const CASE_STUDY_SYSTEM = buildBaseSystemPrompt(
  `You are a case study writer who creates compelling customer success stories. Write case studies that follow the proven Challenge-Solution-Results framework:
- **Challenge**: What problem did the customer face? Include specific pain points and context
- **Solution**: How was the problem addressed? Detail the approach and implementation
- **Results**: What measurable outcomes were achieved? Use specific metrics and quotes
- Include a customer quote or testimonial
- End with a clear next-step CTA`,
);

const EBOOK_SYSTEM = buildBaseSystemPrompt(
  `You are an expert e-book writer who creates compelling lead magnets and educational guides. Structure e-book content with:
- Chapter-by-chapter organization with clear H2 headings per chapter
- Engaging introduction that establishes the value proposition
- Practical examples and actionable frameworks
- Key takeaways at the end of each chapter
- A conclusion that reinforces the main thesis and includes a CTA`,
);

const ARTICLE_SYSTEM = buildBaseSystemPrompt(
  `You are a feature article writer with journalistic sensibility. Write in-depth feature pieces that combine storytelling with analysis:
- Open with a compelling narrative hook or anecdote
- Weave data and expert insights throughout
- Use storytelling techniques to maintain engagement
- Include counterpoints and nuanced perspectives
- Close with forward-looking insights or implications`,
);

const THOUGHT_LEADERSHIP_SYSTEM = buildBaseSystemPrompt(
  `You are a thought leadership ghostwriter for C-suite executives. Write executive-bylined opinion pieces and industry analyses:
- Bold, opinionated perspective (not generic advice)
- Supported by data points and industry trends
- Written in the executive's voice — authoritative yet accessible
- Include contrarian viewpoints where appropriate
- End with a vision for the future or a call-to-action for the industry`,
);

function buildLongFormUserPrompt(
  userPrompt: string,
  context: import('./helpers').UserPromptParams['context'],
  settings: import('./helpers').UserPromptParams['settings'],
  typeSpecific: string = '',
): string {
  const { tone, length, targetAudience } = extractTextSettings(settings);
  const contextBlock = buildContextBlock(context);

  const lengthGuide: Record<string, string> = {
    short: '500-800 words',
    medium: '1000-1500 words',
    long: '2000-3000 words',
  };

  const additionalSpecs = formatAdditionalSettings(settings);

  return `${contextBlock}

## CONTENT SPECIFICATIONS
Tone: ${tone}
Target Length: ${lengthGuide[length] || '1000-1500 words'}
${targetAudience ? `Target Audience: ${targetAudience}` : ''}
${typeSpecific}${additionalSpecs}

## USER PROMPT
${userPrompt}`;
}

export const LONG_FORM_TEMPLATES: Record<string, PromptTemplate> = {
  'blog-post': {
    systemPrompt: BLOG_POST_SYSTEM,
    buildUserPrompt: (params) =>
      buildLongFormUserPrompt(
        params.userPrompt,
        params.context,
        params.settings,
        'Format: Blog post with H1 title, H2 sections, conclusion, and CTA.',
      ),
  },
  'pillar-page': {
    systemPrompt: PILLAR_PAGE_SYSTEM,
    buildUserPrompt: (params) =>
      buildLongFormUserPrompt(
        params.userPrompt,
        params.context,
        params.settings,
        'Format: Pillar page with table of contents, comprehensive H2 sections (at least 6), and FAQ section. Minimum 2000 words.',
      ),
  },
  whitepaper: {
    systemPrompt: WHITEPAPER_SYSTEM,
    buildUserPrompt: (params) =>
      buildLongFormUserPrompt(
        params.userPrompt,
        params.context,
        params.settings,
        'Format: Whitepaper with executive summary, problem statement, methodology, findings, and recommendations.',
      ),
  },
  'case-study': {
    systemPrompt: CASE_STUDY_SYSTEM,
    buildUserPrompt: (params) =>
      buildLongFormUserPrompt(
        params.userPrompt,
        params.context,
        params.settings,
        'Format: Case study with Challenge, Solution, and Results sections. Include metrics and a customer quote.',
      ),
  },
  ebook: {
    systemPrompt: EBOOK_SYSTEM,
    buildUserPrompt: (params) =>
      buildLongFormUserPrompt(
        params.userPrompt,
        params.context,
        params.settings,
        'Format: E-book chapter outline with full content for each chapter. Include introduction and conclusion.',
      ),
  },
  article: {
    systemPrompt: ARTICLE_SYSTEM,
    buildUserPrompt: (params) =>
      buildLongFormUserPrompt(
        params.userPrompt,
        params.context,
        params.settings,
        'Format: Feature article with narrative hook, analysis sections, and forward-looking conclusion.',
      ),
  },
  'thought-leadership': {
    systemPrompt: THOUGHT_LEADERSHIP_SYSTEM,
    buildUserPrompt: (params) =>
      buildLongFormUserPrompt(
        params.userPrompt,
        params.context,
        params.settings,
        'Format: Executive opinion piece. Bold perspective, data-backed, written as if bylined by a senior executive.',
      ),
  },
};
