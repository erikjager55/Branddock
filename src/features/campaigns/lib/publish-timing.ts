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

export function getChecklistForPlatform(platform: string | null, format: string | null): ChecklistItem[] {
  const items: ChecklistItem[] = [
    { id: 'has-title', label: 'Title or headline is set', required: true },
    { id: 'has-body', label: 'Body content is complete', required: true },
  ];

  if (platform === 'linkedin' || platform === 'instagram' || platform === 'facebook' || platform === 'tiktok') {
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
