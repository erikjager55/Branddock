/**
 * Shared persona color palette for campaign visualizations.
 * Used by JourneyMatrixSection and DeploymentTimelineSection.
 */

export interface PersonaColorStyle {
  bg: string;
  text: string;
  border: string;
  dot: string;
  avatarBg: string;
  /** Hex color for active filter pill background (Tailwind 4 purge-safe) */
  activeHex: string;
}

export const PERSONA_COLORS: PersonaColorStyle[] = [
  { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', avatarBg: 'bg-blue-100', activeHex: '#3b82f6' },
  { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500', avatarBg: 'bg-rose-100', activeHex: '#f43f5e' },
  { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', avatarBg: 'bg-amber-100', activeHex: '#f59e0b' },
  { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500', avatarBg: 'bg-purple-100', activeHex: '#a855f7' },
  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', avatarBg: 'bg-emerald-100', activeHex: '#10b981' },
  { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-500', avatarBg: 'bg-cyan-100', activeHex: '#06b6d4' },
];

/** Shared color for "All Personas" / shared deliverables */
export const SHARED_COLOR: PersonaColorStyle = {
  bg: 'bg-gray-50',
  text: 'text-gray-700',
  border: 'border-gray-200',
  dot: 'bg-gray-400',
  avatarBg: 'bg-gray-100',
  activeHex: '#6b7280',
};

/** Get persona color style by index (cycles through palette) */
export function getPersonaColor(index: number): PersonaColorStyle {
  return PERSONA_COLORS[index % PERSONA_COLORS.length];
}
