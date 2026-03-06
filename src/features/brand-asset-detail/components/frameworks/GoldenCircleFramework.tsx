"use client";

import { useState } from "react";
import { Target, Heart, Package, ArrowRight, CheckCircle, AlertTriangle, HelpCircle } from "lucide-react";
import type { GoldenCircleFrameworkData, GoldenCircleSection } from "../../types/framework.types";

type RingKey = "why" | "how" | "what";

interface RingConfig {
  key: RingKey;
  label: string;
  subtitle: string;
  helperText: string;
  icon: React.ElementType;
  /** Ring fill color when selected (hex) */
  selectedFill: string;
  /** Ring fill color default (hex) */
  defaultFill: string;
  /** SVG stroke color (hex) */
  strokeColor: string;
  /** Text/border accent class */
  accent: string;
  /** SVG label fill when selected (hex) */
  labelSelectedFill: string;
  /** SVG label fill when default (hex) */
  labelDefaultFill: string;
  /** Detail panel accent class */
  panelBorder: string;
  panelBg: string;
}

// Inline hex colors for SVG fills/strokes — Tailwind CSS 4 purges fill-* classes
// when they're only referenced in JS config objects.
const RING_MAP: Record<RingKey, RingConfig> = {
  what: {
    key: "what",
    label: "WHAT",
    subtitle: "Proof & Offering",
    helperText: "Products and services as tangible proof of your WHY",
    icon: Package,
    selectedFill: "#a7f3d0",   // emerald-200
    defaultFill: "#ecfdf5",    // emerald-50
    strokeColor: "#6ee7b7",    // emerald-300
    accent: "text-emerald-700",
    labelSelectedFill: "#065f46", // emerald-800
    labelDefaultFill: "#10b981",  // emerald-500
    panelBorder: "border-emerald-300",
    panelBg: "bg-emerald-50",
  },
  how: {
    key: "how",
    label: "HOW",
    subtitle: "Differentiating Approach",
    helperText: "Principles and values that bring your WHY to life",
    icon: Heart,
    selectedFill: "#bfdbfe",   // blue-200
    defaultFill: "#eff6ff",    // blue-50
    strokeColor: "#93c5fd",    // blue-300
    accent: "text-blue-700",
    labelSelectedFill: "#1e40af", // blue-800
    labelDefaultFill: "#3b82f6",  // blue-500
    panelBorder: "border-blue-300",
    panelBg: "bg-blue-50",
  },
  why: {
    key: "why",
    label: "WHY",
    subtitle: "Core Belief",
    helperText: "Your purpose, belief, drive \u2014 never about products",
    icon: Target,
    selectedFill: "#fde68a",   // amber-200
    defaultFill: "#fef3c7",    // amber-100
    strokeColor: "#fcd34d",    // amber-300
    accent: "text-amber-700",
    labelSelectedFill: "#92400e", // amber-800
    labelDefaultFill: "#d97706",  // amber-600
    panelBorder: "border-amber-300",
    panelBg: "bg-amber-50",
  },
};

/**
 * Assess coherence between WHY, HOW, and WHAT.
 * Returns a simple score based on content presence.
 */
function getCoherenceLevel(data: GoldenCircleFrameworkData): {
  level: "strong" | "partial" | "weak";
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
    return { level: "strong", label: "Strong coherence", color: "text-emerald-700", bgColor: "bg-emerald-50", icon: CheckCircle };
  }
  if (filled >= 2) {
    return { level: "partial", label: "Partially filled", color: "text-amber-700", bgColor: "bg-amber-50", icon: AlertTriangle };
  }
  return { level: "weak", label: "Incomplete", color: "text-red-700", bgColor: "bg-red-50", icon: AlertTriangle };
}

/** Detail panel for a selected ring */
function RingDetailPanel({
  ring,
  section,
}: {
  ring: RingConfig;
  section: GoldenCircleSection | undefined;
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
    </div>
  );
}

/**
 * Golden Circle (Simon Sinek) framework visualization.
 * Renders three concentric circles (WHY inner, HOW middle, WHAT outer)
 * with a clickable detail panel and coherence indicator.
 */
export function GoldenCircleFramework({
  data,
}: {
  data: GoldenCircleFrameworkData;
}) {
  const [selectedRing, setSelectedRing] = useState<RingKey>("why");
  const coherence = getCoherenceLevel(data);
  const CoherenceIcon = coherence.icon;

  const selectedConfig = RING_MAP[selectedRing];

  const whatRing = RING_MAP.what;
  const howRing = RING_MAP.how;
  const whyRing = RING_MAP.why;

  // SVG dimensions — concentric circles centered at (160, 155)
  // Extra vertical room at bottom for "Start With Why" label
  const cx = 160;
  const cy = 155;
  const outerR = 145; // WHAT
  const midR = 97; // HOW
  const innerR = 53; // WHY

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
              cx={cx}
              cy={cy}
              r={outerR}
              style={{
                fill: selectedRing === "what" ? whatRing.selectedFill : whatRing.defaultFill,
                stroke: whatRing.strokeColor,
              }}
              className="cursor-pointer transition-colors duration-200"
              strokeWidth="2"
              onClick={() => setSelectedRing("what")}
            />
            {/* HOW — middle ring */}
            <circle
              cx={cx}
              cy={cy}
              r={midR}
              style={{
                fill: selectedRing === "how" ? howRing.selectedFill : howRing.defaultFill,
                stroke: howRing.strokeColor,
              }}
              className="cursor-pointer transition-colors duration-200"
              strokeWidth="2"
              onClick={() => setSelectedRing("how")}
            />
            {/* WHY — inner ring */}
            <circle
              cx={cx}
              cy={cy}
              r={innerR}
              style={{
                fill: selectedRing === "why" ? whyRing.selectedFill : whyRing.defaultFill,
                stroke: whyRing.strokeColor,
              }}
              className="cursor-pointer transition-colors duration-200"
              strokeWidth="2"
              onClick={() => setSelectedRing("why")}
            />

            {/* Labels */}
            <text
              x={cx}
              y={cy + 2}
              textAnchor="middle"
              style={{ fill: selectedRing === "why" ? whyRing.labelSelectedFill : whyRing.labelDefaultFill }}
              className="text-sm font-bold cursor-pointer"
              onClick={() => setSelectedRing("why")}
            >
              WHY
            </text>
            <text
              x={cx}
              y={cy - midR + 22}
              textAnchor="middle"
              style={{ fill: selectedRing === "how" ? howRing.labelSelectedFill : howRing.labelDefaultFill }}
              className="text-xs font-semibold cursor-pointer"
              onClick={() => setSelectedRing("how")}
            >
              HOW
            </text>
            <text
              x={cx}
              y={cy - outerR + 22}
              textAnchor="middle"
              style={{ fill: selectedRing === "what" ? whatRing.labelSelectedFill : whatRing.labelDefaultFill }}
              className="text-xs font-semibold cursor-pointer"
              onClick={() => setSelectedRing("what")}
            >
              WHAT
            </text>

            {/* Inside-out reminder (bottom, within viewBox) */}
            <text
              x={cx}
              y={cy + outerR + 20}
              textAnchor="middle"
              style={{ fill: "#9ca3af" }}
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

        {/* Right: Detail panel */}
        <div className="flex-1 min-w-0">
          <RingDetailPanel
            ring={selectedConfig}
            section={data[selectedRing]}
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
          {coherence.level === "strong"
            ? "WHY, HOW and WHAT are fully filled in and aligned with each other."
            : coherence.level === "partial"
              ? "Not all rings are fully filled in. Complete all three for a strong Golden Circle."
              : "The Golden Circle is still mostly empty. Start with your WHY."}
        </span>
      </div>
    </div>
  );
}
