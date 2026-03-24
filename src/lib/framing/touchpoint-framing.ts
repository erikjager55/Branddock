/**
 * Touchpoint → System 1/2 Framing Guide
 *
 * Maps ~12 common marketing touchpoint types to their natural
 * System 1/System 2 fit, cognitive load budget, and best practices.
 * Used in concept-phase prompt injection for channel-specific messaging guidance.
 */

// ─── Types ──────────────────────────────────────────────

export interface TouchpointFramingGuide {
  touchpointType: string;
  systemFit: 1 | 2 | 'mixed';
  cognitiveLoadBudget: 'minimal' | 'low' | 'medium' | 'high';
  bestPractices: string[];
}

// ─── Touchpoint Framing Guide ───────────────────────────

export const TOUCHPOINT_FRAMING: Record<string, TouchpointFramingGuide> = {
  social_media_feed: {
    touchpointType: 'Social Media Feed',
    systemFit: 1,
    cognitiveLoadBudget: 'minimal',
    bestPractices: [
      'Stop the scroll with visual/emotional hook in first 0.5 seconds',
      'One message per post — no compound arguments',
      'Use processing fluency: simple words, high contrast, clean layout',
      'Emotional content outperforms informational 3:1 in feed contexts',
    ],
  },
  social_media_stories: {
    touchpointType: 'Social Media Stories',
    systemFit: 1,
    cognitiveLoadBudget: 'minimal',
    bestPractices: [
      'Full-screen immersion leverages affect heuristic',
      'Peak-end rule: strongest moment first or last in sequence',
      'Swipe-up CTA must be immediate and frictionless',
      'Ephemeral format creates natural scarcity',
    ],
  },
  email_marketing: {
    touchpointType: 'Email Marketing',
    systemFit: 'mixed',
    cognitiveLoadBudget: 'medium',
    bestPractices: [
      'Subject line is System 1 — emotional hook or curiosity gap',
      'Body can engage System 2 with detail and rational argument',
      'One primary CTA per email to avoid choice overload',
      'Personalization triggers endowment effect ("Your weekly report")',
    ],
  },
  landing_page: {
    touchpointType: 'Landing Page',
    systemFit: 'mixed',
    cognitiveLoadBudget: 'high',
    bestPractices: [
      'Hero section: System 1 emotional hook with clear value proposition',
      'Body: System 2 evidence (social proof, features, comparison)',
      'CTA: minimize choice overload — one primary action',
      'Anchor pricing high before revealing actual price',
    ],
  },
  display_advertising: {
    touchpointType: 'Display Advertising',
    systemFit: 1,
    cognitiveLoadBudget: 'minimal',
    bestPractices: [
      'Brand recognition in under 1 second (distinctive assets)',
      'Maximum processing fluency: simple message, high contrast',
      'Emotional resonance over information density',
      'Frequency builds availability heuristic',
    ],
  },
  video_content: {
    touchpointType: 'Video Content',
    systemFit: 1,
    cognitiveLoadBudget: 'medium',
    bestPractices: [
      'Peak-end rule: design for peak emotional moment and strong ending',
      'Affect heuristic: music and pacing create emotional context',
      'First 3 seconds determine System 1 continue/skip decision',
      'Brand integration throughout, not just logo at end',
    ],
  },
  podcast_audio: {
    touchpointType: 'Podcast / Audio',
    systemFit: 2,
    cognitiveLoadBudget: 'high',
    bestPractices: [
      'Listeners are in System 2 mode — deeper arguments work',
      'Authority principle amplified: the host voice IS the brand',
      'Availability heuristic: vivid stories outperform abstract concepts',
      'Repetition of key messages across episodes builds fluency',
    ],
  },
  blog_article: {
    touchpointType: 'Blog / Article',
    systemFit: 2,
    cognitiveLoadBudget: 'high',
    bestPractices: [
      'Headline is System 1 — curiosity or value hook',
      'Body is System 2 — structured argument with evidence',
      'Anchoring: lead with the most counterintuitive finding',
      'Processing fluency: scannable headings, short paragraphs, visual breaks',
    ],
  },
  in_store_retail: {
    touchpointType: 'In-Store / Retail',
    systemFit: 1,
    cognitiveLoadBudget: 'low',
    bestPractices: [
      'Packaging must be recognized in System 1 (< 1 second)',
      'Shelf positioning: anchoring effect from premium neighbors',
      'Choice overload: clear product hierarchy reduces decision effort',
      'Endowment effect: try-before-you-buy and sampling',
    ],
  },
  event_experiential: {
    touchpointType: 'Event / Experiential',
    systemFit: 1,
    cognitiveLoadBudget: 'medium',
    bestPractices: [
      'Design for peak moment that becomes shareable content',
      'Peak-end rule: closing moment should be the strongest brand impression',
      'Affect heuristic: positive emotions transfer to brand evaluation',
      'Physical experiences build stronger availability heuristic memories',
    ],
  },
  search_ppc: {
    touchpointType: 'Search / PPC',
    systemFit: 2,
    cognitiveLoadBudget: 'medium',
    bestPractices: [
      'Searchers are in System 2 — active problem-solving mode',
      'Processing fluency: match search intent in ad copy exactly',
      'Anchoring: lead with numbers (ratings, savings, users)',
      'Representativeness: match the expected format of authoritative results',
    ],
  },
  direct_mail: {
    touchpointType: 'Direct Mail / Print',
    systemFit: 'mixed',
    cognitiveLoadBudget: 'medium',
    bestPractices: [
      'Physical medium triggers endowment effect (tangibility = ownership)',
      'Envelope/outer: System 1 curiosity hook to drive opening',
      'Inner content: System 2 detail and rational persuasion',
      'Scarcity through physical limitation ("Only 500 printed")',
    ],
  },
};

// ─── Helpers ────────────────────────────────────────────

/**
 * Format the full touchpoint framing guide as a markdown table for AI consumption.
 */
export function getTouchpointFramingContext(): string {
  const lines = [
    '### Touchpoint Cognitive Framing Guide',
    '',
    '| Touchpoint | System Fit | Cognitive Budget | Key Principle |',
    '|:-----------|:----------:|:----------------:|:--------------|',
  ];

  for (const tp of Object.values(TOUCHPOINT_FRAMING)) {
    const systemLabel = tp.systemFit === 'mixed' ? 'S1+S2' : `S${tp.systemFit}`;
    lines.push(`| ${tp.touchpointType} | ${systemLabel} | ${tp.cognitiveLoadBudget} | ${tp.bestPractices[0]} |`);
  }

  lines.push('');
  lines.push('**Design principle**: Match message complexity to the touchpoint\'s cognitive load budget. System 1 touchpoints need emotional simplicity. System 2 touchpoints can carry rational argument.');

  return lines.join('\n');
}
