/**
 * Platform-specific optimal publishing times based on industry research.
 * Returns suggested day + time for each platform/format combination.
 */

export interface PublishTimeSuggestion {
  day: string;
  time: string;
  reason: string;
  /** ISO date string of the next occurrence */
  nextOccurrence: string;
}

interface TimingRule {
  days: number[]; // 0=Sunday, 1=Monday, ... 6=Saturday
  hour: number;
  minute: number;
  reason: string;
}

const PLATFORM_TIMING: Record<string, TimingRule> = {
  // Social
  'linkedin': { days: [2, 3, 4], hour: 9, minute: 0, reason: 'LinkedIn engagement peaks Tuesday-Thursday 9-10 AM' },
  'instagram': { days: [1, 3, 5], hour: 12, minute: 0, reason: 'Instagram engagement peaks Mon/Wed/Fri around noon' },
  'facebook': { days: [3, 4], hour: 10, minute: 0, reason: 'Facebook reach peaks Wednesday-Thursday 10 AM' },
  'tiktok': { days: [2, 4], hour: 19, minute: 0, reason: 'TikTok views peak Tuesday/Thursday evenings 7 PM' },
  // Video
  'youtube': { days: [4, 5], hour: 15, minute: 0, reason: 'YouTube uploads perform best Thursday-Friday 3 PM' },
  // Email
  'email': { days: [2, 4], hour: 10, minute: 0, reason: 'Email open rates peak Tuesday/Thursday 10 AM' },
  // Web
  'web': { days: [2, 3], hour: 9, minute: 30, reason: 'Blog traffic peaks Tuesday-Wednesday morning' },
  // Podcast
  'podcast': { days: [1], hour: 6, minute: 0, reason: 'Podcast listeners check for new episodes Monday morning' },
};

/** Find the next occurrence of a specific weekday + time from today */
function nextOccurrence(dayOfWeek: number, hour: number, minute: number): Date {
  const now = new Date();
  const result = new Date(now);
  result.setHours(hour, minute, 0, 0);

  const currentDay = now.getDay();
  let daysUntil = dayOfWeek - currentDay;
  if (daysUntil < 0 || (daysUntil === 0 && result <= now)) {
    daysUntil += 7;
  }
  result.setDate(result.getDate() + daysUntil);
  return result;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function getSuggestedPublishTime(platform: string | null): PublishTimeSuggestion | null {
  if (!platform) return null;
  const rule = PLATFORM_TIMING[platform];
  if (!rule) return null;

  // Find the nearest optimal day
  let nearest: Date | null = null;
  let nearestDay = 0;
  for (const day of rule.days) {
    const date = nextOccurrence(day, rule.hour, rule.minute);
    if (!nearest || date < nearest) {
      nearest = date;
      nearestDay = day;
    }
  }

  if (!nearest) return null;

  const timeStr = `${String(rule.hour).padStart(2, '0')}:${String(rule.minute).padStart(2, '0')}`;

  return {
    day: DAY_NAMES[nearestDay],
    time: timeStr,
    reason: rule.reason,
    nextOccurrence: nearest.toISOString(),
  };
}

/**
 * Publication checklist items per medium category.
 * Each check reads from the canvas store to determine pass/fail.
 */
export interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
}

/**
 * Formats die structureel een aparte title/headline group produceren in de
 * prompt-output. Long-form web (blog-article + landing-page) heeft een
 * dedicated title; short-form social (organic-post / feed-post / carousel)
 * heeft géén separate title-group — de hook zit in de body zelf.
 *
 * 2026-05-19 fix: voorheen was `has-title` als universele required-check
 * toegevoegd voor alle platforms, wat altijd faalde voor short-form social
 * content (LinkedIn-post / Instagram-post / Facebook-post / TikTok-script
 * / Twitter-thread / carousels / polls / ads). Gerapporteerd:
 * "Title or headline is set niet uitgevoerd voor LinkedIn-post".
 * E-mail wordt al gedekt door has-subject hieronder; carousels embedden
 * de title in slide-1-content (geen separate group).
 */
const TITLE_REQUIRED_FORMATS = new Set([
  'blog-article',  // blog-post, pillar-page, case-study, whitepaper, ebook, article, thought-leadership
  'landing-page',  // landing-page, product-page, faq-page, comparison-page, microsite
]);

export function getChecklistForPlatform(
  platform: string | null,
  format: string | null,
  /**
   * Q4 (2026-05-19): adFormat sub-type voor LinkedIn-ad (en in toekomst
   * andere paid platforms). Bepaalt format-specific checklist-items zoals
   * has-thumbnail (video-ad), has-subject (message-ad). null/undefined =
   * generieke ad-checklist.
   */
  adFormat?: string | null,
  /**
   * 2026-05-20 — contentType fallback. When MediumEnrichment has no
   * matching row (e.g. linkedin/poll-post isn't seeded), platform/format
   * land null and platform-based branches all miss. ContentType is a
   * stable signal independent of enrichment seeding.
   */
  contentType?: string | null,
): ChecklistItem[] {
  // 2026-05-20 — LinkedIn poll has a fundamentally different group
  // structure (context / question / option-1..4 / follow-up-comment /
  // hashtags). The generic has-body / has-image checks both false-flag
  // because polls have no body group and can't attach images. Return a
  // poll-specific checklist instead of the generic post one.
  if ((platform === 'linkedin' && format === 'poll-post') || contentType === 'linkedin-poll') {
    return [
      { id: 'has-question', label: 'Poll question is set', required: true },
      { id: 'has-options', label: 'At least 2 options provided', required: true },
      { id: 'has-context', label: 'Context paragraph framing the poll', required: true },
      { id: 'has-follow-up-comment', label: 'Suggested first comment drafted', required: false },
      { id: 'has-hashtags', label: 'Hashtags included', required: false },
      { id: 'char-limit', label: 'Within character limit', required: true },
    ];
  }

  // 2026-05-22 — Google Search Ad (RSA) has its own group structure:
  // headline-1..3 (each ≤30), description-1..2 (each ≤90), path-1/2
  // (≤15), sitelink-N-title (≤25) + sitelink-N-description (≤35).
  // Text-only ad — no image. Generic has-body / has-image both
  // false-flag because the model emits per-field groups, not a
  // single body. Return a search-ad-specific checklist.
  if ((platform === 'google' && format === 'search-ad') || contentType === 'search-ad') {
    return [
      { id: 'has-search-headlines', label: 'At least 3 headlines provided (each ≤30 chars)', required: true },
      { id: 'has-search-descriptions', label: 'At least 2 descriptions provided (each ≤90 chars)', required: true },
      { id: 'has-search-paths', label: 'Display URL paths set (≤15 chars each)', required: false },
      { id: 'has-search-sitelinks', label: 'At least 1 complete sitelink (title + description)', required: false },
      { id: 'search-char-limits', label: 'All fields within Google RSA character limits', required: true },
    ];
  }

  // 2026-05-22 — Native-ad / sponsored article (publisher-side
  // editorial content). 7 named groups + image. Checklist enforces
  // editorial structure (headline + opening + body + brand-integration
  // + closing + disclosure) plus char-limits per asset.
  if ((platform === 'native' && format === 'sponsored-article') || contentType === 'native-ad') {
    return [
      { id: 'has-native-headline', label: 'Headline set (≤90 chars, editorial style)', required: true },
      { id: 'has-native-opening', label: 'Opening paragraph set (≤500 chars, no brand mention)', required: true },
      { id: 'has-native-body', label: 'Body content set (≤2500 chars, editorial markdown)', required: true },
      { id: 'has-native-brand-integration', label: 'Brand integration paragraph set (≤600 chars)', required: true },
      { id: 'has-native-closing', label: 'Closing takeaway set (≤300 chars)', required: true },
      { id: 'has-native-disclosure', label: 'Disclosure tag placement specified', required: true },
      { id: 'has-image', label: 'Hero image added', required: true },
      { id: 'native-char-limits', label: 'All assets within native-ad character limits', required: true },
    ];
  }

  // 2026-05-22 — Google Display Ad migrated to Responsive Display Ads
  // (RDA) asset-library paradigm. Checklist mirrors Google's own
  // Ad Strength score components: asset quantity (5 short headlines +
  // 5 descriptions for "Excellent") + required slots (long-headline,
  // business-name, image) + char-limits per asset type.
  if ((platform === 'google' && format === 'display-ad') || contentType === 'display-ad') {
    return [
      { id: 'has-rda-short-headline-min', label: 'At least 1 short headline (≤30 chars)', required: true },
      { id: 'has-rda-short-headlines-full', label: 'All 5 short headlines filled (Ad Strength "Excellent" requirement)', required: false },
      { id: 'has-rda-long-headline', label: 'Long headline filled (≤90 chars)', required: true },
      { id: 'has-rda-description-min', label: 'At least 1 description (≤90 chars)', required: true },
      { id: 'has-rda-descriptions-full', label: 'All 5 descriptions filled (boosts Ad Strength)', required: false },
      { id: 'has-rda-business-name', label: 'Business name set (≤25 chars)', required: true },
      { id: 'has-image', label: 'Image asset added (landscape 1.91:1 + square 1:1)', required: true },
      { id: 'rda-char-limits', label: 'All assets within Google RDA character limits', required: true },
    ];
  }

  const items: ChecklistItem[] = [
    { id: 'has-body', label: 'Body content is complete', required: true },
  ];
  if (format && TITLE_REQUIRED_FORMATS.has(format)) {
    // Title-check alleen bij formats die er structureel één produceren —
    // anders is het een gegarandeerde false-negative.
    items.unshift({ id: 'has-title', label: 'Title or headline is set', required: true });
  }

  // LinkedIn-ad sub-format aware checklist (Q4 2026-05-19). Andere social
  // platforms krijgen generic checklist hieronder. video-ad subformat is
  // split-out naar eigen content-type linkedin-video-ad met format 'video-ad'.
  if (platform === 'linkedin' && format === 'ad') {
    if (adFormat === 'message-ad') {
      items.push({ id: 'has-subject', label: 'Subject line is set', required: true });
      items.push({ id: 'has-cta', label: 'Call-to-action button label is set', required: true });
      // Message Ad heeft GEEN hero-image — InMail-format
    } else {
      // Default = single-image (of onbekend → fallback naar image-pattern)
      items.push({ id: 'has-image', label: 'Hero image added', required: true });
      items.push({ id: 'has-cta', label: 'Call-to-action included', required: true });
      items.push({ id: 'char-limit', label: 'Within character limit', required: true });
    }
  } else if (platform === 'linkedin' && format === 'video-ad') {
    // 2026-05-19: linkedin-video-ad (paid video-ad) — script + thumbnail
    // + landing-page CTA. Geen hashtags (ads). Char-limit op intro-caption.
    items.push({ id: 'has-image', label: 'Thumbnail added', required: true });
    items.push({ id: 'has-cta', label: 'Call-to-action included', required: true });
    items.push({ id: 'char-limit', label: 'Within character limit', required: true });
  } else if (platform === 'linkedin' || platform === 'instagram' || platform === 'facebook' || platform === 'tiktok') {
    items.push({ id: 'has-image', label: 'Hero image added', required: true });
    items.push({ id: 'has-hashtags', label: 'Hashtags included', required: false });
    if (platform === 'linkedin' || platform === 'instagram') {
      items.push({ id: 'char-limit', label: 'Within character limit', required: true });
    }
  }

  if (platform === 'email') {
    items.push({ id: 'has-subject', label: 'Subject line is set', required: true });
    items.push({ id: 'has-cta', label: 'Call-to-action included', required: true });
    items.push({ id: 'has-image', label: 'Header image added', required: false });
  }

  if (platform === 'web') {
    items.push({ id: 'has-image', label: 'Hero image added', required: true });
    items.push({ id: 'has-meta', label: 'Meta description set', required: format === 'blog-article' });
    items.push({ id: 'has-cta', label: 'Call-to-action included', required: false });
  }

  if (platform === 'podcast') {
    items.push({ id: 'has-shownotes', label: 'Show notes included', required: false });
  }

  if (platform === 'youtube' || platform === 'tiktok' || platform === 'video') {
    items.push({ id: 'has-image', label: 'Thumbnail added', required: true });
  }

  return items;
}

/** Character limits per platform */
export const CHAR_LIMITS: Record<string, number> = {
  linkedin: 3000,
  instagram: 2200,
  facebook: 63206,
  tiktok: 2200,
  twitter: 280,
};

/** Export format options per medium type */
export interface ExportFormat {
  id: string;
  label: string;
  icon: string;
}

export function getExportFormats(platform: string | null): ExportFormat[] {
  const formats: ExportFormat[] = [
    { id: 'clipboard', label: 'Copy to clipboard', icon: 'Copy' },
    { id: 'markdown', label: 'Download as Markdown', icon: 'FileText' },
    { id: 'html', label: 'Download as HTML', icon: 'Code' },
  ];

  if (platform === 'web') {
    formats.push({ id: 'pdf', label: 'Download as PDF', icon: 'FileDown' });
  }

  return formats;
}
