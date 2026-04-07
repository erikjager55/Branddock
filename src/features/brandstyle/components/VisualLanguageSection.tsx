"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  Layers,
  Square,
  Space,
  Maximize,
  Weight,
  Palette,
  LayoutGrid,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";
import { AiContentBanner } from "./AiContentBanner";
import type { VisualLanguageProfile } from "@/lib/brandstyle/visual-language.types";

interface VisualLanguageSectionProps {
  styleguide: {
    id: string;
    visualLanguage: unknown;
    visualLanguageSavedForAi: boolean;
  };
  canEdit: boolean;
}

export function VisualLanguageSection({
  styleguide,
  canEdit,
}: VisualLanguageSectionProps) {
  const profile = styleguide.visualLanguage as VisualLanguageProfile | null;

  if (!profile) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <Layers className="mx-auto h-10 w-10 text-gray-300 mb-3" />
        <h3 className="text-sm font-semibold text-gray-900 mb-1">
          No Visual Language Detected
        </h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Re-analyze your website to detect the visual language. The analysis extracts
          corners, shadows, spacing, depth, shape language, and component patterns.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-lg border border-teal-200 bg-teal-50/30 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              Visual Language Summary
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              {profile.summary}
            </p>
          </div>
        </div>
      </div>

      {/* 9 dimension cards */}
      <DimensionCard
        icon={CornerDownRight}
        title="Corners & Edges"
        defaultOpen
      >
        <Param label="Dominant" value={profile.cornerRadius.dominant} />
        <Param label="Radius" value={`${profile.cornerRadius.radiusPx}px`} />
        <Param label="Consistency" value={profile.cornerRadius.consistency} />
      </DimensionCard>

      <DimensionCard icon={Layers} title="Shadows & Depth">
        <Param label="Shadow Style" value={profile.shadow.style} />
        <Param label="Elevation" value={profile.shadow.elevation} />
        {profile.shadow.color && (
          <Param label="Shadow Color" value={profile.shadow.color} color={profile.shadow.color} />
        )}
        <Param label="Dimensionality" value={profile.depth.dimensionality} />
        <Param label="Overlapping" value={profile.depth.overlapping ? "Yes" : "No"} />
        <Param label="Glassmorphism" value={profile.depth.glassmorphism ? "Yes" : "No"} />
      </DimensionCard>

      <DimensionCard icon={Square} title="Lines & Borders">
        <Param label="Borders" value={profile.line.borders} />
        <Param label="Dividers" value={profile.line.dividers} />
        <Param label="Decorative Lines" value={profile.line.decorativeLines ? "Yes" : "No"} />
      </DimensionCard>

      <DimensionCard icon={LayoutGrid} title="Shape Language">
        <Param label="Primary" value={profile.shape.primary} />
        <Param label="Angularity" value={`${profile.shape.angularity}/10`} />
        <Param label="Symmetry" value={profile.shape.symmetry} />
      </DimensionCard>

      <DimensionCard icon={Space} title="Spatial Feel">
        <Param label="Density" value={profile.space.density} />
        <Param label="Whitespace" value={`${Math.round(profile.space.whitespaceRatio * 100)}%`} />
        <Param label="Section Spacing" value={profile.space.sectionSpacing} />
      </DimensionCard>

      <DimensionCard icon={Weight} title="Visual Weight">
        <Param label="Overall" value={profile.weight.overall} />
        <Param label="Text Density" value={profile.weight.textDensity} />
        <Param label="Ornaments" value={profile.weight.ornamentLevel} />
      </DimensionCard>

      <DimensionCard icon={Palette} title="Color Application">
        <Param label="Buttons" value={profile.colorApplication.buttonStyle} />
        <Param label="Backgrounds" value={profile.colorApplication.backgroundApproach} />
        <Param label="Accents" value={profile.colorApplication.accentUsage} />
        <Param label="Gradients" value={profile.colorApplication.gradientPresence} />
      </DimensionCard>

      <DimensionCard icon={Maximize} title="Components">
        <Param label="Cards" value={profile.components.cardStyle} />
        <Param label="Buttons" value={profile.components.buttonShape} />
        <Param label="Inputs" value={profile.components.inputStyle} />
        <Param label="Spacing System" value={profile.components.spacingSystem} />
      </DimensionCard>

      {/* Prompt Fragment — the practical output */}
      <PromptPreview value={profile.promptFragment} />

      {/* Save for AI */}
      <AiContentBanner section="visual-language" savedForAi={styleguide.visualLanguageSavedForAi} />
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────

function DimensionCard({
  icon: Icon,
  title,
  defaultOpen = false,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <Icon className="h-4 w-4 text-gray-500" />
        {title}
        {isOpen ? (
          <ChevronDown className="ml-auto h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="ml-auto h-4 w-4 text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-1.5">
          {children}
        </div>
      )}
    </div>
  );
}

function Param({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <div className="flex items-center gap-1.5">
        {color && (
          <div
            className="h-3 w-3 rounded-sm border border-gray-300"
            style={{ backgroundColor: color }}
          />
        )}
        <span className="font-medium text-gray-800 capitalize">{value}</span>
      </div>
    </div>
  );
}

function PromptPreview({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          AI Generation Instructions
        </h4>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
        >
          {copied ? (
            <Check className="h-3 w-3 text-emerald-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-md p-3 break-words">
        {value}
      </p>
      <p className="mt-2 text-[10px] text-gray-400">
        This text is automatically injected into all AI generation prompts when &quot;Save for AI&quot; is enabled.
      </p>
    </div>
  );
}
