import React from 'react';
import {
  Clock,
  ArrowLeft,
  CheckCircle,
  HelpCircle,
  // Page icons
  LayoutDashboard,
  Megaphone,
  FileText,
  Lightbulb,
  Target,
  Palette,
  Users,
  Package,
  TrendingUp,
  BookOpen,
  Shield,
  FlaskConical,
  Layers,
  Settings,
  Settings2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ─── Icon Registry ────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Megaphone,
  FileText,
  Lightbulb,
  Target,
  Palette,
  Users,
  Package,
  TrendingUp,
  BookOpen,
  Shield,
  FlaskConical,
  Layers,
  Settings,
  Settings2,
  HelpCircle,
  Clock,
};

function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] || HelpCircle;
}

// ─── Module Metadata ──────────────────────────────────────
// Maps sidebar section IDs to Coming Soon page content

interface ModuleInfo {
  title: string;
  description: string;
  icon: string;
  iconBgColor: string;
  iconColor: string;
  phase: string;
  features?: string[];
}

const MODULE_INFO: Record<string, ModuleInfo> = {
  'business-strategy': {
    title: 'Business Strategy',
    description: 'Define your business model, strategic objectives, competitive positioning, and growth roadmap to align your brand with long-term goals.',
    icon: 'Target',
    iconBgColor: 'bg-blue-50',
    iconColor: 'text-blue-500',
    phase: 'Fase 1B',
    features: ['Business model canvas', 'Strategic objectives', 'Competitive positioning', 'Growth roadmap'],
  },
  'personas': {
    title: 'Personas',
    description: 'Create detailed personas with AI-powered analysis, chat with your personas, and validate them through multiple research methods.',
    icon: 'Users',
    iconBgColor: 'bg-violet-50',
    iconColor: 'text-violet-500',
    phase: 'Fase 4',
    features: ['AI-powered persona creation', 'Chat with your personas', 'AI image generation', 'Impact badges & strategic implications'],
  },
  'products': {
    title: 'Products & Services',
    description: 'Document your products and services with feature matrices, pricing tiers, competitive positioning, and brand alignment scores.',
    icon: 'Package',
    iconBgColor: 'bg-orange-50',
    iconColor: 'text-orange-500',
    phase: 'Fase 5',
    features: ['Product catalog management', 'Feature matrices', 'Competitive positioning', 'Brand alignment scores'],
  },
  'trends': {
    title: 'Market Insights',
    description: 'AI-powered market analysis with competitor tracking, trend monitoring, and strategic opportunity identification.',
    icon: 'TrendingUp',
    iconBgColor: 'bg-cyan-50',
    iconColor: 'text-cyan-500',
    phase: 'Fase 6',
    features: ['Competitor tracking', 'Trend monitoring', 'AI market analysis', 'Strategic opportunities'],
  },
  'knowledge': {
    title: 'Knowledge Library',
    description: 'A searchable library of all your brand knowledge: documents, research findings, brand guidelines, and AI-generated insights.',
    icon: 'BookOpen',
    iconBgColor: 'bg-amber-50',
    iconColor: 'text-amber-500',
    phase: 'Fase 7',
    features: ['Document management', 'Smart import', 'AI-powered search', 'Research findings archive'],
  },
  'brand-alignment': {
    title: 'Brand Alignment',
    description: 'Automated brand consistency checker that identifies misalignments across your brand assets and provides AI-powered fix suggestions.',
    icon: 'Shield',
    iconBgColor: 'bg-rose-50',
    iconColor: 'text-rose-500',
    phase: 'Fase 8',
    features: ['Cross-asset consistency scan', 'AI fix suggestions', 'Alignment score tracking', 'Issue prioritization'],
  },
  'research': {
    title: 'Research Hub',
    description: 'Your research command center: plan studies, manage participants, analyze results, and track validation progress.',
    icon: 'Target',
    iconBgColor: 'bg-lime-50',
    iconColor: 'text-lime-600',
    phase: 'Fase 9',
  },
  'research-bundles': {
    title: 'Research Bundles',
    description: 'Purchase pre-configured research bundles that combine multiple validation methods for comprehensive brand insights.',
    icon: 'Layers',
    iconBgColor: 'bg-sky-50',
    iconColor: 'text-sky-500',
    phase: 'Fase 9',
  },
  'custom-validation': {
    title: 'Custom Validations',
    description: 'Design custom validation workflows tailored to your specific research needs and brand objectives.',
    icon: 'Settings2',
    iconBgColor: 'bg-slate-50',
    iconColor: 'text-slate-500',
    phase: 'Fase 9',
  },
  'active-campaigns': {
    title: 'Active Campaigns',
    description: 'Create, manage, and track your marketing campaigns with AI-powered content generation and performance analytics.',
    icon: 'Megaphone',
    iconBgColor: 'bg-purple-50',
    iconColor: 'text-purple-500',
    phase: 'Fase 10',
    features: ['Campaign wizard', 'AI content generation', 'Performance tracking', 'Multi-channel publishing'],
  },
  'content-library': {
    title: 'Content Library',
    description: 'Your centralized library for all AI-generated and manually created content assets, organized by campaign and type.',
    icon: 'FileText',
    iconBgColor: 'bg-indigo-50',
    iconColor: 'text-indigo-500',
    phase: 'Fase 10',
  },
  'settings': {
    title: 'Settings',
    description: 'Manage your account settings, team members, billing, notifications, and appearance preferences.',
    icon: 'Settings',
    iconBgColor: 'bg-gray-100',
    iconColor: 'text-gray-500',
    phase: 'Fase 12',
  },
  'help': {
    title: 'Help & Support',
    description: 'Browse help articles, watch tutorials, and contact our support team for assistance.',
    icon: 'HelpCircle',
    iconBgColor: 'bg-emerald-50',
    iconColor: 'text-emerald-500',
    phase: 'Fase 12',
  },
};

// ─── Props ────────────────────────────────────────────────

interface ComingSoonPageProps {
  /** Section ID from the sidebar (e.g. 'personas', 'products') */
  sectionId?: string;
  /** Override: page title */
  title?: string;
  /** Override: description */
  description?: string;
  /** Override: Lucide icon name */
  icon?: string;
  /** Override: icon circle bg color */
  iconBgColor?: string;
  /** Override: icon color */
  iconColor?: string;
  /** Override: phase label */
  phase?: string;
  /** Override: features list */
  features?: string[];
  /** Back navigation handler */
  onBack?: () => void;
}

// ─── Component ────────────────────────────────────────────

export function ComingSoonPage({
  sectionId,
  title: titleOverride,
  description: descOverride,
  icon: iconOverride,
  iconBgColor: bgOverride,
  iconColor: colorOverride,
  phase: phaseOverride,
  features: featuresOverride,
  onBack,
}: ComingSoonPageProps) {
  const info = sectionId ? MODULE_INFO[sectionId] : undefined;

  const title = titleOverride || info?.title || 'Coming Soon';
  const description = descOverride || info?.description || 'This feature is currently under development.';
  const iconName = iconOverride || info?.icon || 'Clock';
  const iconBgColor = bgOverride || info?.iconBgColor || 'bg-gray-100';
  const iconColor = colorOverride || info?.iconColor || 'text-gray-500';
  const phase = phaseOverride || info?.phase;
  const features = featuresOverride || info?.features;

  const Icon = getIcon(iconName);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      {/* Icon circle */}
      <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 ${iconBgColor}`}>
        <Icon className={`w-10 h-10 ${iconColor}`} />
      </div>

      {/* Title */}
      <h1 className="text-xl font-semibold text-gray-900 mb-2">{title}</h1>

      {/* Description */}
      <p className="text-sm text-gray-500 max-w-md mb-6 leading-relaxed">{description}</p>

      {/* Phase badge */}
      {phase && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
          <Clock className="w-3.5 h-3.5" />
          <span>{phase}</span>
        </div>
      )}

      {/* Planned features list */}
      {features && features.length > 0 && (
        <div className="mt-8 text-left max-w-sm w-full">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Planned Features
          </p>
          <ul className="space-y-2">
            {features.map((feature, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="mt-8 border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
      )}
    </div>
  );
}

export default ComingSoonPage;
