'use client';

import { useState, useEffect } from 'react';
import {
  Target, Heart, Package, ArrowRight,
  CheckCircle, AlertTriangle, HelpCircle,
} from 'lucide-react';
import type { GoldenCircleFrameworkData, GoldenCircleSection as GoldenCircleSectionData } from '../types/framework.types';

// ─── Types ──────────────────────────────────────────────────

type RingKey = 'why' | 'how' | 'what';

interface RingConfig {
  key: RingKey;
  label: string;
  subtitle: string;
  helperText: string;
  icon: React.ElementType;
  selectedFill: string;
  defaultFill: string;
  strokeColor: string;
  accent: string;
  labelSelectedFill: string;
  labelDefaultFill: string;
  panelBorder: string;
  panelBg: string;
}

// ─── Constants ──────────────────────────────────────────────

// Inline hex colors for SVG fills/strokes — Tailwind CSS 4 purges fill-* classes
const RING_MAP: Record<RingKey, RingConfig> = {
  what: {
    key: 'what',
    label: 'WHAT',
    subtitle: 'Proof & Offering',
    helperText: 'Products and services as tangible proof of your WHY',
    icon: Package,
    selectedFill: '#a7f3d0',
    defaultFill: '#ecfdf5',
    strokeColor: '#6ee7b7',
    accent: 'text-emerald-700',
    labelSelectedFill: '#065f46',
    labelDefaultFill: '#10b981',
    panelBorder: 'border-emerald-300',
    panelBg: 'bg-emerald-50',
  },
  how: {
    key: 'how',
    label: 'HOW',
    subtitle: 'Differentiating Approach',
    helperText: 'Principles and values that bring your WHY to life',
    icon: Heart,
    selectedFill: '#bfdbfe',
    defaultFill: '#eff6ff',
    strokeColor: '#93c5fd',
    accent: 'text-blue-700',
    labelSelectedFill: '#1e40af',
    labelDefaultFill: '#3b82f6',
    panelBorder: 'border-blue-300',
    panelBg: 'bg-blue-50',
  },
  why: {
    key: 'why',
    label: 'WHY',
    subtitle: 'Core Belief',
    helperText: 'Your purpose, belief, drive — never about products',
    icon: Target,
    selectedFill: '#fde68a',
    defaultFill: '#fef3c7',
    strokeColor: '#fcd34d',
    accent: 'text-amber-700',
    labelSelectedFill: '#92400e',
    labelDefaultFill: '#d97706',
    panelBorder: 'border-amber-300',
    panelBg: 'bg-amber-50',
  },
};

const EMPTY_SECTION: GoldenCircleSectionData = { statement: '', details: '' };

const EMPTY_DATA: GoldenCircleFrameworkData = {
  why: { ...EMPTY_SECTION },
  how: { ...EMPTY_SECTION },
  what: { ...EMPTY_SECTION },
};

// ─── Helpers ────────────────────────────────────────────────

function normalize(raw: GoldenCircleFrameworkData | null): GoldenCircleFrameworkData {
  if (!raw) return EMPTY_DATA;
  return {
    why: raw.why ? { ...EMPTY_SECTION, ...raw.why } : { ...EMPTY_SECTION },
    how: raw.how ? { ...EMPTY_SECTION, ...raw.how } : { ...EMPTY_SECTION },
    what: raw.what ? { ...EMPTY_SECTION, ...raw.what } : { ...EMPTY_SECTION },
  };
}

function getCoherenceLevel(data: GoldenCircleFrameworkData): {
  level: 'strong' | 'partial' | 'weak';
  label: string;
  color: string;
  bgColor: string;
  icon: React.ElementType;
} {
  const hasWhy = Boolean(data.why?.statement?.trim());
  const hasHow = Boolean(data.how?.statement?.trim());
  const hasWhat = Boolean(data.what?.statement?.trim());
  const hasWhyDetails = Boolean(data.why?.details?.trim());
  const hasHowDetails = Boolean(data.how?.details?.trim());
  const hasWhatDetails = Boolean(data.what?.details?.trim());

  const filled = [hasWhy, hasHow, hasWhat].filter(Boolean).length;
  const detailed = [hasWhyDetails, hasHowDetails, hasWhatDetails].filter(Boolean).length;

  if (filled === 3 && detailed >= 2) {
    return { level: 'strong', label: 'Strong coherence', color: 'text-emerald-700', bgColor: 'bg-emerald-50', icon: CheckCircle };
  }
  if (filled >= 2) {
    return { level: 'partial', label: 'Partially filled', color: 'text-amber-700', bgColor: 'bg-amber-50', icon: AlertTriangle };
  }
  return { level: 'weak', label: 'Incomplete', color: 'text-red-700', bgColor: 'bg-red-50', icon: AlertTriangle };
}

// ─── Props ──────────────────────────────────────────────────

interface GoldenCircleSectionProps {
  data: GoldenCircleFrameworkData | null;
  isEditing: boolean;
  onUpdate: (data: GoldenCircleFrameworkData) => void;
}

// ─── Component ──────────────────────────────────────────────

/**
 * Golden Circle (Simon Sinek) framework — inline editing on the detail page.
 * Renders concentric SVG circles (WHY inner, HOW middle, WHAT outer)
 * with a detail/edit panel and coherence indicator.
 */
export function GoldenCircleSection({ data, isEditing, onUpdate }: GoldenCircleSectionProps) {
  const [draft, setDraft] = useState<GoldenCircleFrameworkData>(() => normalize(data));
  const [selectedRing, setSelectedRing] = useState<RingKey>('why');

  useEffect(() => {
    setDraft(normalize(data));
  }, [data]);

  const handleFieldChange = (ring: RingKey, field: keyof GoldenCircleSectionData, value: string) => {
    const next = {
      ...draft,
      [ring]: { ...draft[ring], [field]: value },
    };
    setDraft(next);
    onUpdate(next);
  };

  const coherence = getCoherenceLevel(draft);
  const CoherenceIcon = coherence.icon;
  const selectedConfig = RING_MAP[selectedRing];
  const section = draft[selectedRing];

  // SVG dimensions — concentric circles centered at (160, 155)
  const cx = 160;
  const cy = 155;
  const outerR = 145; // WHAT
  const midR = 97;    // HOW
  const innerR = 53;  // WHY

  return (
    <div className="space-y-4">
      {/* Concentric circles + detail panel side by side */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Left: SVG concentric circles */}
        <div className="flex-shrink-0 flex flex-col items-center">
          <svg
            viewBox="0 0 320 330"
            className="w-64 h-64 md:w-72 md:h-72"
            role="img"
            aria-label="Golden Circle: WHY (innermost), HOW (middle), WHAT (outermost ring)"
          >
            {/* WHAT — outer ring */}
            <circle
              cx={cx} cy={cy} r={outerR}
              style={{
                fill: selectedRing === 'what' ? RING_MAP.what.selectedFill : RING_MAP.what.defaultFill,
                stroke: RING_MAP.what.strokeColor,
              }}
              className="cursor-pointer transition-colors duration-200"
              strokeWidth="2"
              onClick={() => setSelectedRing('what')}
            />
            {/* HOW — middle ring */}
            <circle
              cx={cx} cy={cy} r={midR}
              style={{
                fill: selectedRing === 'how' ? RING_MAP.how.selectedFill : RING_MAP.how.defaultFill,
                stroke: RING_MAP.how.strokeColor,
              }}
              className="cursor-pointer transition-colors duration-200"
              strokeWidth="2"
              onClick={() => setSelectedRing('how')}
            />
            {/* WHY — inner ring */}
            <circle
              cx={cx} cy={cy} r={innerR}
              style={{
                fill: selectedRing === 'why' ? RING_MAP.why.selectedFill : RING_MAP.why.defaultFill,
                stroke: RING_MAP.why.strokeColor,
              }}
              className="cursor-pointer transition-colors duration-200"
              strokeWidth="2"
              onClick={() => setSelectedRing('why')}
            />

            {/* Labels */}
            <text
              x={cx} y={cy + 2}
              textAnchor="middle"
              style={{ fill: selectedRing === 'why' ? RING_MAP.why.labelSelectedFill : RING_MAP.why.labelDefaultFill }}
              className="text-sm font-bold cursor-pointer"
              onClick={() => setSelectedRing('why')}
            >
              WHY
            </text>
            <text
              x={cx} y={cy - midR + 22}
              textAnchor="middle"
              style={{ fill: selectedRing === 'how' ? RING_MAP.how.labelSelectedFill : RING_MAP.how.labelDefaultFill }}
              className="text-xs font-semibold cursor-pointer"
              onClick={() => setSelectedRing('how')}
            >
              HOW
            </text>
            <text
              x={cx} y={cy - outerR + 22}
              textAnchor="middle"
              style={{ fill: selectedRing === 'what' ? RING_MAP.what.labelSelectedFill : RING_MAP.what.labelDefaultFill }}
              className="text-xs font-semibold cursor-pointer"
              onClick={() => setSelectedRing('what')}
            >
              WHAT
            </text>

            {/* Inside-out reminder */}
            <text
              x={cx} y={cy + outerR + 20}
              textAnchor="middle"
              style={{ fill: '#9ca3af' }}
              className="text-[9px]"
            >
              Start With Why
            </text>
          </svg>

          {/* Inside-out flow indicator */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
            <span className="font-semibold text-amber-600">WHY</span>
            <ArrowRight className="w-3 h-3" />
            <span className="font-semibold text-blue-500">HOW</span>
            <ArrowRight className="w-3 h-3" />
            <span className="font-semibold text-emerald-500">WHAT</span>
          </div>
        </div>

        {/* Right: Detail / Edit panel */}
        <div className="flex-1 min-w-0">
          <RingPanel
            ring={selectedConfig}
            section={section}
            isEditing={isEditing}
            onStatementChange={(v) => handleFieldChange(selectedRing, 'statement', v)}
            onDetailsChange={(v) => handleFieldChange(selectedRing, 'details', v)}
          />
        </div>
      </div>

      {/* Coherence indicator */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${coherence.bgColor}`}>
        <CoherenceIcon className={`w-4 h-4 ${coherence.color}`} />
        <span className={`text-sm font-medium ${coherence.color}`}>
          {coherence.label}
        </span>
        <span className="text-xs text-gray-500">
          {coherence.level === 'strong'
            ? 'WHY, HOW and WHAT are fully filled in and aligned with each other.'
            : coherence.level === 'partial'
              ? 'Not all rings are fully filled in. Complete all three for a strong Golden Circle.'
              : 'The Golden Circle is still mostly empty. Start with your WHY.'}
        </span>
      </div>
    </div>
  );
}

// ─── Sub-component ──────────────────────────────────────────

function RingPanel({
  ring,
  section,
  isEditing,
  onStatementChange,
  onDetailsChange,
}: {
  ring: RingConfig;
  section: GoldenCircleSectionData;
  isEditing: boolean;
  onStatementChange: (value: string) => void;
  onDetailsChange: (value: string) => void;
}) {
  const Icon = ring.icon;
  const statement = section?.statement?.trim();

  return (
    <div className={`border-l-4 rounded-r-lg p-4 ${ring.panelBorder} ${ring.panelBg}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${ring.accent}`} />
        <span className={`text-xs font-bold uppercase tracking-wider ${ring.accent}`}>
          {ring.label}
        </span>
        <span className="text-xs text-gray-500">{ring.subtitle}</span>
      </div>
      <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
        <HelpCircle className="w-3 h-3" />
        {ring.helperText}
      </p>

      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Statement
            </label>
            <textarea
              value={section.statement}
              onChange={(e) => onStatementChange(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder={`Enter your ${ring.label} statement...`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Details
            </label>
            <textarea
              value={section.details}
              onChange={(e) => onDetailsChange(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder={`Elaborate on your ${ring.label}...`}
            />
          </div>
        </div>
      ) : (
        <>
          {!statement ? (
            <p className="text-sm text-gray-400 italic">Not yet filled in</p>
          ) : (
            <>
              <p className="font-medium text-gray-900">{statement}</p>
              {section?.details && (
                <p className="text-sm text-gray-600 mt-1">{section.details}</p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
