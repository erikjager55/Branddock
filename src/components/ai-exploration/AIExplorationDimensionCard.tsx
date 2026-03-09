'use client';

import {
  Users, Target, Heart, Zap, Brain, TrendingUp,
  Crown, Shield, ShieldCheck, MessageCircle, Palette, Activity, Moon,
  Compass, Leaf, Globe, Rocket, FileText, BarChart2, Cog, Package,
  Fingerprint, Sparkles, CheckCircle, AlertTriangle, AlertCircle, Eye, Mountain,
  Map, BookOpen, Award, User, Star, ArrowRight, Scale, Building, Sliders,
  Diamond, Lightbulb, Settings,
} from 'lucide-react';
import type { DimensionConfig, DimensionInsight } from './types';

const ICON_MAP: Record<string, React.ElementType> = {
  Users, Target, Heart, Zap, Brain, TrendingUp,
  Crown, Shield, ShieldCheck, MessageCircle, Palette, Activity, Moon,
  Compass, Leaf, Globe, Rocket, FileText, BarChart2, Cog, Package,
  Fingerprint, Sparkles, CheckCircle, AlertTriangle, AlertCircle, Eye, Mountain,
  Map, BookOpen, Award, User, Star, ArrowRight, Scale, Building, Sliders,
  Diamond, Lightbulb, Settings,
};

/** Map Tailwind color prefixes to inline style values for dimension cards. */
const COLOR_STYLES: Record<string, { bg: string; border: string; iconBg: string; iconColor: string }> = {
  blue:    { bg: '#eff6ff', border: '#bfdbfe', iconBg: '#dbeafe', iconColor: '#2563eb' },
  rose:    { bg: '#fff1f2', border: '#fecdd3', iconBg: '#ffe4e6', iconColor: '#e11d48' },
  amber:   { bg: '#fffbeb', border: '#fde68a', iconBg: '#fef3c7', iconColor: '#d97706' },
  purple:  { bg: '#faf5ff', border: '#e9d5ff', iconBg: '#f3e8ff', iconColor: '#9333ea' },
  emerald: { bg: '#ecfdf5', border: '#a7f3d0', iconBg: '#d1fae5', iconColor: '#059669' },
  teal:    { bg: '#f0fdfa', border: '#99f6e4', iconBg: '#ccfbf1', iconColor: '#0d9488' },
  violet:  { bg: '#f5f3ff', border: '#ddd6fe', iconBg: '#ede9fe', iconColor: '#7c3aed' },
  indigo:  { bg: '#eef2ff', border: '#c7d2fe', iconBg: '#e0e7ff', iconColor: '#4f46e5' },
  pink:    { bg: '#fdf2f8', border: '#fbcfe8', iconBg: '#fce7f3', iconColor: '#db2777' },
};

const DEFAULT_STYLE = { bg: '#f9fafb', border: '#e5e7eb', iconBg: '#f3f4f6', iconColor: '#6b7280' };

interface AIExplorationDimensionCardProps {
  dimension: DimensionInsight;
  dimensionConfigs: DimensionConfig[];
}

export function AIExplorationDimensionCard({ dimension, dimensionConfigs }: AIExplorationDimensionCardProps) {
  const IconComponent = ICON_MAP[dimension.icon] ?? Users;

  // Resolve style from the frontend dimension config's color, falling back to gray
  const matchingConfig = dimensionConfigs.find(c => c.key === dimension.key);
  const style = (matchingConfig?.color ? COLOR_STYLES[matchingConfig.color] : undefined) ?? DEFAULT_STYLE;

  return (
    <div
      className="rounded-xl transition-all hover:shadow-md"
      style={{
        padding: '20px',
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: style.iconBg }}
        >
          <IconComponent className="h-5 w-5" style={{ color: style.iconColor }} />
        </div>
        <div className="flex-1" style={{ minWidth: 0 }}>
          <h4 className="text-sm font-semibold" style={{ color: '#111827' }}>{dimension.title}</h4>
          <p className="text-sm" style={{ color: '#6b7280', marginTop: '4px' }}>{dimension.summary}</p>
        </div>
      </div>
    </div>
  );
}
