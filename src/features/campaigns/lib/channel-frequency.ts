/**
 * Research-backed channel capacity limits per beat (abstract time slot ≈ 1 week).
 *
 * Based on: Adobe Journey Optimizer frequency caps, Optimove AI arbitration,
 * Byron Sharp continuous presence, industry best practices for channel fatigue.
 */

export interface ChannelCapacity {
  maxPerBeat: number;
  label: string;
}

export const CHANNEL_FREQUENCY: Record<string, ChannelCapacity> = {
  linkedin: { maxPerBeat: 3, label: 'LinkedIn' },
  instagram: { maxPerBeat: 5, label: 'Instagram' },
  facebook: { maxPerBeat: 4, label: 'Facebook' },
  twitter: { maxPerBeat: 7, label: 'X / Twitter' },
  email: { maxPerBeat: 2, label: 'Email' },
  blog: { maxPerBeat: 2, label: 'Blog' },
  website: { maxPerBeat: 2, label: 'Website' },
  video: { maxPerBeat: 2, label: 'Video' },
  podcast: { maxPerBeat: 1, label: 'Podcast' },
  print: { maxPerBeat: 1, label: 'Print' },
  event: { maxPerBeat: 1, label: 'Event' },
  pr: { maxPerBeat: 2, label: 'PR' },
  default: { maxPerBeat: 3, label: 'Other' },
};

/** Canonical keys sorted by length descending so longer matches take priority */
const SORTED_KEYS = Object.keys(CHANNEL_FREQUENCY)
  .filter((k) => k !== 'default')
  .sort((a, b) => b.length - a.length);

/**
 * Normalize a free-form channel name to a canonical key.
 * E.g. "LinkedIn Post", "LinkedIn Ads", "LINKEDIN" → "linkedin"
 */
export function normalizeChannel(channel: string): string {
  const lower = channel.toLowerCase().trim();

  // Direct match
  if (CHANNEL_FREQUENCY[lower]) return lower;

  // Common aliases (checked before prefix matching for precision)
  if (lower.includes('x.com') || lower.includes('twitter') || lower === 'x') return 'twitter';
  if (lower.includes('youtube') || lower.includes('tiktok')) return 'video';
  if (lower.includes('newsletter') || lower.includes('mail')) return 'email';
  if (lower.includes('article')) return 'blog';
  if (lower.includes('webinar') || lower.includes('conference')) return 'event';
  if (lower.includes('press release') || lower.includes('media outreach')) return 'pr';
  if (lower.includes('landing') || lower.includes('site')) return 'website';

  // Prefix / substring match — longer keys checked first to avoid false matches
  // (e.g. "instagram" before "pr", preventing "product video" matching "pr")
  for (const key of SORTED_KEYS) {
    if (lower.startsWith(key) || lower.includes(key)) return key;
  }

  return 'default';
}

/** Get the capacity for a normalized channel key */
export function getChannelCapacity(normalizedChannel: string): ChannelCapacity {
  return CHANNEL_FREQUENCY[normalizedChannel] ?? CHANNEL_FREQUENCY.default;
}

/** Get the display label for a normalized channel key */
export function getChannelLabel(normalizedChannel: string): string {
  return (CHANNEL_FREQUENCY[normalizedChannel] ?? CHANNEL_FREQUENCY.default).label;
}
