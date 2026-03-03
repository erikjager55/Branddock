// ─── Map Backend Dimensions → Frontend DimensionConfig ─────
// Converts { key, title, icon? } from the API into the full
// DimensionConfig shape used by the progress bar UI.
// Uses a static color palette and Lucide icon lookup.

import {
  Heart, Settings, Package, Target, Compass, Leaf, Globe, Lightbulb,
  Rocket, FileText, BarChart2, Zap, Cog, FlaskConical, Fingerprint,
  Sparkles, Layers, Shield, CheckCircle, AlertTriangle, TrendingUp,
  Users, Eye, Mountain, Map, Crown, Activity, Moon, BookOpen, Award,
  User, MessageCircle, AlertCircle, Star, ArrowRight, Scale, Building,
  type LucideIcon,
} from 'lucide-react';
import type { BackendDimension, DimensionConfig } from '../types';

// ─── Icon Lookup ────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  Heart, Settings, Package, Target, Compass, Leaf, Globe, Lightbulb,
  Rocket, FileText, BarChart2, Zap, Cog, FlaskConical, Fingerprint,
  Sparkles, Layers, Shield, CheckCircle, AlertTriangle, TrendingUp,
  Users, Eye, Mountain, Map, Crown, Activity, Moon, BookOpen, Award,
  User, MessageCircle, AlertCircle, Star, ArrowRight, Scale, Building,
};

// ─── Color Palette (static lookup, Tailwind-safe) ───────────

interface ColorEntry {
  color: string;
  bg: string;
  text: string;
}

const COLOR_PALETTE: ColorEntry[] = [
  { color: 'teal',    bg: 'bg-teal-100',    text: 'text-teal-600' },
  { color: 'blue',    bg: 'bg-blue-100',    text: 'text-blue-600' },
  { color: 'emerald', bg: 'bg-emerald-100', text: 'text-emerald-600' },
  { color: 'purple',  bg: 'bg-purple-100',  text: 'text-purple-600' },
  { color: 'amber',   bg: 'bg-amber-100',   text: 'text-amber-600' },
  { color: 'rose',    bg: 'bg-rose-100',    text: 'text-rose-600' },
];

// ─── Mapper ─────────────────────────────────────────────────

export function mapBackendDimensions(
  backendDims: BackendDimension[],
): DimensionConfig[] {
  return backendDims.map((dim, i) => {
    const palette = COLOR_PALETTE[i % COLOR_PALETTE.length];
    return {
      key: dim.key,
      label: dim.title,
      icon: ICON_MAP[dim.icon ?? ''] ?? FileText,
      color: palette.color,
      bgClass: palette.bg,
      textClass: palette.text,
      defaultQuestions: [],
    };
  });
}
