/**
 * Channel color mapping for consistent channel pill styling across the app.
 * Each canonical channel gets a distinct color for visual differentiation.
 */

export interface ChannelColorStyle {
  /** Tailwind background class for the pill */
  bg: string;
  /** Tailwind text class for the pill */
  text: string;
  /** Tailwind border class for the pill */
  border: string;
  /** Hex color for inline styles (Tailwind 4 purge safe) */
  hex: string;
}

const CHANNEL_COLORS: Record<string, ChannelColorStyle> = {
  linkedin: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    hex: '#2563eb',
  },
  instagram: {
    bg: 'bg-pink-50',
    text: 'text-pink-700',
    border: 'border-pink-200',
    hex: '#db2777',
  },
  facebook: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    hex: '#4f46e5',
  },
  twitter: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    hex: '#0284c7',
  },
  email: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    hex: '#b45309',
  },
  blog: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    hex: '#047857',
  },
  website: {
    bg: 'bg-primary-50',
    text: 'text-primary-700',
    border: 'border-primary-200',
    hex: '#0f766e',
  },
  video: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    hex: '#b91c1c',
  },
  podcast: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    hex: '#7e22ce',
  },
  print: {
    bg: 'bg-stone-50',
    text: 'text-stone-700',
    border: 'border-stone-200',
    hex: '#57534e',
  },
  event: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    hex: '#c2410c',
  },
  pr: {
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    hex: '#6d28d9',
  },
  default: {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
    hex: '#374151',
  },
};

/** Get the color style for a normalized channel key */
export function getChannelColor(normalizedChannel: string): ChannelColorStyle {
  return CHANNEL_COLORS[normalizedChannel] ?? CHANNEL_COLORS.default;
}
