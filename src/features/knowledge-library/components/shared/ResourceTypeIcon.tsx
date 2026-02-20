'use client';

import {
  BookOpen, FileText, Lightbulb, Headphones, Globe, Pencil, Play,
} from 'lucide-react';
import type { ResourceType } from '../../types/knowledge-library.types';

const ICON_MAP: Record<ResourceType, { icon: typeof BookOpen; color: string }> = {
  BOOK: { icon: BookOpen, color: 'text-blue-600' },
  ARTICLE: { icon: FileText, color: 'text-gray-600' },
  RESEARCH: { icon: FileText, color: 'text-indigo-600' },
  GUIDE: { icon: BookOpen, color: 'text-teal-600' },
  TEMPLATE: { icon: FileText, color: 'text-orange-500' },
  CASE_STUDY: { icon: FileText, color: 'text-purple-600' },
  WORKSHOP_RESOURCE: { icon: Lightbulb, color: 'text-yellow-500' },
  MASTERCLASS: { icon: Lightbulb, color: 'text-amber-600' },
  PODCAST: { icon: Headphones, color: 'text-pink-600' },
  WEBSITE: { icon: Globe, color: 'text-cyan-600' },
  DESIGN: { icon: Pencil, color: 'text-rose-500' },
  VIDEO: { icon: Play, color: 'text-red-600' },
};

interface ResourceTypeIconProps {
  type: ResourceType;
  size?: number;
  className?: string;
}

export function ResourceTypeIcon({ type, size = 20, className = '' }: ResourceTypeIconProps) {
  const config = ICON_MAP[type] ?? ICON_MAP.ARTICLE;
  const Icon = config.icon;
  return <Icon className={`${config.color} ${className}`} size={size} />;
}
