"use client";

import { useEffect, useState } from "react";
import { Globe, MessageCircle, Mail, Megaphone, Video } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/shared";
import { AiContentBanner } from "../AiContentBanner";
import { useUpdateVoiceguide } from "../../hooks";
import type {
  BrandVoiceguide,
  ChannelKey,
  ChannelTones,
  ChannelToneEntry,
  ToneAxis,
} from "../../types/voiceguide.types";

interface ChannelTonesSectionProps {
  voiceguide: BrandVoiceguide;
}

const CHANNELS: { key: ChannelKey; label: string; icon: LucideIcon; placeholder: string }[] = [
  { key: "website", label: "Website", icon: Globe, placeholder: "Authoritative, structured. Lean towards explanation, not persuasion." },
  { key: "socialMedia", label: "Social Media", icon: MessageCircle, placeholder: "Casual, punchy. One idea per post. Lean into personality." },
  { key: "email", label: "Email", icon: Mail, placeholder: "Personal, warm. Direct opening line. Conversational throughout." },
  { key: "ads", label: "Ads", icon: Megaphone, placeholder: "Concise. Strong hook. Benefit-led, not feature-led." },
  { key: "video", label: "Video", icon: Video, placeholder: "Spoken cadence. Short sentences. Lean into personality." },
];

const AXIS_LABELS: { axis: ToneAxis; label: string }[] = [
  { axis: "formalCasual", label: "Casual ↔ Formal" },
  { axis: "seriousFunny", label: "Funny ↔ Serious" },
  { axis: "respectfulIrreverent", label: "Irreverent ↔ Respectful" },
  { axis: "matterOfFactEnthusiastic", label: "Enthusiastic ↔ Matter-of-fact" },
];

export function ChannelTonesSection({ voiceguide }: ChannelTonesSectionProps) {
  const update = useUpdateVoiceguide();
  const [draft, setDraft] = useState<ChannelTones>(voiceguide.channelTones ?? {});

  useEffect(() => {
    setDraft(voiceguide.channelTones ?? {});
  }, [voiceguide.channelTones]);

  const handleChange = (key: ChannelKey, patch: Partial<ChannelToneEntry>) => {
    const current = draft[key] ?? { description: "", axisShift: null };
    setDraft({
      ...draft,
      [key]: { ...current, ...patch },
    });
  };

  const handleSave = () => {
    update.mutate({ channelTones: draft });
  };

  const dirty = JSON.stringify(voiceguide.channelTones ?? {}) !== JSON.stringify(draft);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Channel-specific tone</h3>
        <p className="text-xs text-gray-500">
          Free-text overrides per channel + an optional dominant axis-shift relative
          to the global Voice DNA baseline. Empty channels fall back to baseline.
        </p>
      </div>

      <div className="space-y-4">
        {CHANNELS.map(({ key, label, icon: Icon, placeholder }) => {
          const entry = draft[key] ?? { description: "", axisShift: null };
          const description = entry.description ?? "";
          const shiftAxis = entry.axisShift?.axis ?? "";
          const shiftDir = entry.axisShift?.direction ?? "increase";

          return (
            <div key={key} className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-4 h-4 text-teal-600" />
                <h4 className="text-sm font-semibold text-gray-900">{label}</h4>
              </div>

              <textarea
                value={description}
                onChange={(e) => handleChange(key, { description: e.target.value })}
                rows={2}
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary-300 mb-3"
              />

              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span>Optional axis shift:</span>
                <select
                  value={shiftAxis}
                  onChange={(e) => {
                    const axis = e.target.value as ToneAxis | "";
                    if (!axis) {
                      handleChange(key, { axisShift: null });
                    } else {
                      handleChange(key, { axisShift: { axis, direction: shiftDir } });
                    }
                  }}
                  className="px-2 py-1 border border-gray-300 rounded text-xs"
                >
                  <option value="">— none —</option>
                  {AXIS_LABELS.map((a) => (
                    <option key={a.axis} value={a.axis}>{a.label}</option>
                  ))}
                </select>
                {shiftAxis && (
                  <select
                    value={shiftDir}
                    onChange={(e) =>
                      handleChange(key, {
                        axisShift: { axis: shiftAxis as ToneAxis, direction: e.target.value as "increase" | "decrease" },
                      })
                    }
                    className="px-2 py-1 border border-gray-300 rounded text-xs"
                  >
                    <option value="increase">↑ shift right</option>
                    <option value="decrease">↓ shift left</option>
                  </select>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {dirty && (
        <div className="sticky bottom-4 flex justify-end">
          <Button variant="primary" size="md" onClick={handleSave} isLoading={update.isPending}>
            Save Channel Tones
          </Button>
        </div>
      )}

      <AiContentBanner section="channel-tones" savedForAi={voiceguide.channelTonesSavedForAi} />
    </div>
  );
}
