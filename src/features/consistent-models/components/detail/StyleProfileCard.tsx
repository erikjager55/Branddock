"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, Palette, Pen, Layers, Shapes, Users, Sparkles, Copy, Check } from "lucide-react";
import type { IllustrationStyleProfile } from "@/lib/consistent-models/style-profile.types";

interface StyleProfileCardProps {
  profile: IllustrationStyleProfile;
}

/** Displays the analyzed illustration style profile in collapsible sections */
export function StyleProfileCard({ profile }: StyleProfileCardProps) {
  const { t } = useTranslation("consistent-models");
  return (
    <div className="space-y-3 rounded-lg border border-teal-200 bg-teal-50/30 p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-teal-600" />
        <h3 className="text-sm font-semibold text-gray-900">
          {t("styleProfile.heading")}
        </h3>
        <span className="ml-auto text-xs text-gray-500">
          {t("styleProfile.imagesAnalyzed", { count: profile.imageCount })}
        </span>
      </div>

      {/* Classification badge */}
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-800">
          {profile.classification.primaryStyle}
        </span>
        {profile.classification.subStyle && (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            {profile.classification.subStyle}
          </span>
        )}
        {profile.classification.moodTags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Sections */}
      <Section icon={Pen} title={t("styleProfile.sections.lineWork")} defaultOpen>
        <ParamRow label={t("styleProfile.params.outlines")} value={profile.line.hasOutlines ? "Yes" : "No"} />
        <ParamRow label={t("styleProfile.params.weight")} value={profile.line.weight} />
        {profile.line.weightPx && <ParamRow label={t("styleProfile.params.weightPx")} value={`~${profile.line.weightPx}px`} />}
        <ParamRow label={t("styleProfile.params.consistency")} value={profile.line.consistency} />
        <ParamRow label={t("styleProfile.params.strokeColor")} value={profile.line.strokeColor} color={profile.line.strokeColor.startsWith("#") ? profile.line.strokeColor : undefined} />
        <ParamRow label={t("styleProfile.params.corners")} value={profile.line.cornerStyle} />
        <ParamRow label={t("styleProfile.params.confidence")} value={profile.line.confidence} />
      </Section>

      <Section icon={Palette} title={t("styleProfile.sections.colorPalette")} defaultOpen>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {profile.color.palette.slice(0, 8).map((c, i) => (
            <div key={i} className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1">
              <div
                className="h-4 w-4 rounded-sm border border-gray-300"
                style={{ backgroundColor: c.hex }}
              />
              <span className="text-xs font-mono text-gray-700">{c.hex}</span>
              <span className="text-xs text-gray-400">{c.percentage}%</span>
            </div>
          ))}
        </div>
        <ParamRow label={t("styleProfile.params.saturation")} value={profile.color.saturationLevel} />
        <ParamRow label={t("styleProfile.params.contrast")} value={profile.color.contrastLevel} />
        <ParamRow label={t("styleProfile.params.temperature")} value={profile.color.temperature} />
        <ParamRow label={t("styleProfile.params.gradients")} value={profile.color.usesGradients ? "Yes" : "No"} />
        <ParamRow label={t("styleProfile.params.background")} value={profile.color.backgroundTreatment} />
      </Section>

      <Section icon={Layers} title={t("styleProfile.sections.shadingTexture")}>
        <ParamRow label={t("styleProfile.params.shadingType")} value={profile.shading.type} />
        <ParamRow label={t("styleProfile.params.shadows")} value={profile.shading.shadowPresence ? "Yes" : "No"} />
        <ParamRow label={t("styleProfile.params.dimensionality")} value={profile.shading.dimensionality} />
        <ParamRow label={t("styleProfile.params.fillType")} value={profile.texture.fillType} />
        <ParamRow label={t("styleProfile.params.grain")} value={profile.texture.grainPresence ? `Yes (${profile.texture.grainIntensity ?? "?"}%)` : "No"} />
        <ParamRow label={t("styleProfile.params.surface")} value={profile.texture.surfaceDetail} />
      </Section>

      <Section icon={Shapes} title={t("styleProfile.sections.shapeLanguage")}>
        <ParamRow label={t("styleProfile.params.geometry")} value={profile.shape.primaryGeometry} />
        <ParamRow label={t("styleProfile.params.simplification")} value={`${profile.shape.simplificationLevel}/10`} />
        <ParamRow label={t("styleProfile.params.edges")} value={profile.shape.edgeTreatment} />
        <ParamRow label={t("styleProfile.params.symmetry")} value={profile.shape.symmetry} />
        <ParamRow label={t("styleProfile.params.perspective")} value={profile.composition.perspective} />
        <ParamRow label={t("styleProfile.params.density")} value={profile.composition.density} />
      </Section>

      {profile.character?.present && (
        <Section icon={Users} title={t("styleProfile.sections.characterStyle")}>
          {profile.character.headToBodyRatio && (
            <ParamRow label={t("styleProfile.params.headBodyRatio")} value={`1:${profile.character.headToBodyRatio}`} />
          )}
          <ParamRow label={t("styleProfile.params.faceDetail")} value={profile.character.facialDetail} />
          {profile.character.eyeStyle && <ParamRow label={t("styleProfile.params.eyeStyle")} value={profile.character.eyeStyle} />}
          {profile.character.handStyle && <ParamRow label={t("styleProfile.params.handStyle")} value={profile.character.handStyle} />}
          {profile.character.bodyType && <ParamRow label={t("styleProfile.params.bodyType")} value={profile.character.bodyType} />}
        </Section>
      )}

      {/* Generated Prompts */}
      <PromptSection
        label={t("styleProfile.stylePromptLabel")}
        value={profile.generatedPrompts.stylePrompt}
      />
      <PromptSection
        label={t("styleProfile.negativePromptLabel")}
        value={profile.generatedPrompts.negativePrompt}
      />
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────

function Section({
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
    <div className="rounded-md border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <Icon className="h-3.5 w-3.5 text-gray-500" />
        {title}
        {isOpen ? (
          <ChevronDown className="ml-auto h-3.5 w-3.5 text-gray-400" />
        ) : (
          <ChevronRight className="ml-auto h-3.5 w-3.5 text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div className="border-t border-gray-100 px-3 py-2 space-y-1">
          {children}
        </div>
      )}
    </div>
  );
}

function ParamRow({
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

function PromptSection({ label, value }: { label: string; value: string }) {
  const { t } = useTranslation("consistent-models");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-md border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-gray-600">{label}</span>
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
          {copied ? t("styleProfile.copied") : t("styleProfile.copy")}
        </button>
      </div>
      <p className="text-xs text-gray-700 leading-relaxed break-words">
        {value}
      </p>
    </div>
  );
}
