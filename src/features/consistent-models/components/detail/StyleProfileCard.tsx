"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Palette, Pen, Layers, Shapes, Users, Sparkles, Copy, Check } from "lucide-react";
import type { IllustrationStyleProfile } from "@/lib/consistent-models/style-profile.types";

interface StyleProfileCardProps {
  profile: IllustrationStyleProfile;
}

/** Displays the analyzed illustration style profile in collapsible sections */
export function StyleProfileCard({ profile }: StyleProfileCardProps) {
  return (
    <div className="space-y-3 rounded-lg border border-teal-200 bg-teal-50/30 p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-teal-600" />
        <h3 className="text-sm font-semibold text-gray-900">
          Style Analysis
        </h3>
        <span className="ml-auto text-xs text-gray-500">
          {profile.imageCount} images analyzed
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
      <Section icon={Pen} title="Line Work" defaultOpen>
        <ParamRow label="Outlines" value={profile.line.hasOutlines ? "Yes" : "No"} />
        <ParamRow label="Weight" value={profile.line.weight} />
        {profile.line.weightPx && <ParamRow label="Weight (px)" value={`~${profile.line.weightPx}px`} />}
        <ParamRow label="Consistency" value={profile.line.consistency} />
        <ParamRow label="Stroke Color" value={profile.line.strokeColor} color={profile.line.strokeColor.startsWith("#") ? profile.line.strokeColor : undefined} />
        <ParamRow label="Corners" value={profile.line.cornerStyle} />
        <ParamRow label="Confidence" value={profile.line.confidence} />
      </Section>

      <Section icon={Palette} title="Color Palette" defaultOpen>
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
        <ParamRow label="Saturation" value={profile.color.saturationLevel} />
        <ParamRow label="Contrast" value={profile.color.contrastLevel} />
        <ParamRow label="Temperature" value={profile.color.temperature} />
        <ParamRow label="Gradients" value={profile.color.usesGradients ? "Yes" : "No"} />
        <ParamRow label="Background" value={profile.color.backgroundTreatment} />
      </Section>

      <Section icon={Layers} title="Shading & Texture">
        <ParamRow label="Shading Type" value={profile.shading.type} />
        <ParamRow label="Shadows" value={profile.shading.shadowPresence ? "Yes" : "No"} />
        <ParamRow label="Dimensionality" value={profile.shading.dimensionality} />
        <ParamRow label="Fill Type" value={profile.texture.fillType} />
        <ParamRow label="Grain" value={profile.texture.grainPresence ? `Yes (${profile.texture.grainIntensity ?? "?"}%)` : "No"} />
        <ParamRow label="Surface" value={profile.texture.surfaceDetail} />
      </Section>

      <Section icon={Shapes} title="Shape Language">
        <ParamRow label="Geometry" value={profile.shape.primaryGeometry} />
        <ParamRow label="Simplification" value={`${profile.shape.simplificationLevel}/10`} />
        <ParamRow label="Edges" value={profile.shape.edgeTreatment} />
        <ParamRow label="Symmetry" value={profile.shape.symmetry} />
        <ParamRow label="Perspective" value={profile.composition.perspective} />
        <ParamRow label="Density" value={profile.composition.density} />
      </Section>

      {profile.character?.present && (
        <Section icon={Users} title="Character Style">
          {profile.character.headToBodyRatio && (
            <ParamRow label="Head:Body Ratio" value={`1:${profile.character.headToBodyRatio}`} />
          )}
          <ParamRow label="Face Detail" value={profile.character.facialDetail} />
          {profile.character.eyeStyle && <ParamRow label="Eye Style" value={profile.character.eyeStyle} />}
          {profile.character.handStyle && <ParamRow label="Hand Style" value={profile.character.handStyle} />}
          {profile.character.bodyType && <ParamRow label="Body Type" value={profile.character.bodyType} />}
        </Section>
      )}

      {/* Generated Prompts */}
      <PromptSection
        label="Style Prompt"
        value={profile.generatedPrompts.stylePrompt}
      />
      <PromptSection
        label="Negative Prompt"
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
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="text-xs text-gray-700 leading-relaxed break-words">
        {value}
      </p>
    </div>
  );
}
