"use client";

import { useEffect, useState } from "react";
import { Globe, MessageCircle, Mail, Megaphone, Video } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
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

const CHANNELS: { key: ChannelKey; labelKey: string; icon: LucideIcon; placeholderKey: string }[] = [
  { key: "website", labelKey: "channelTones.channels.website", icon: Globe, placeholderKey: "channelTones.placeholders.website" },
  { key: "socialMedia", labelKey: "channelTones.channels.socialMedia", icon: MessageCircle, placeholderKey: "channelTones.placeholders.socialMedia" },
  { key: "email", labelKey: "channelTones.channels.email", icon: Mail, placeholderKey: "channelTones.placeholders.email" },
  { key: "ads", labelKey: "channelTones.channels.ads", icon: Megaphone, placeholderKey: "channelTones.placeholders.ads" },
  { key: "video", labelKey: "channelTones.channels.video", icon: Video, placeholderKey: "channelTones.placeholders.video" },
];

const AXIS_LABELS: { axis: ToneAxis; labelKey: string }[] = [
  { axis: "formalCasual", labelKey: "channelTones.axes.formalCasual" },
  { axis: "seriousFunny", labelKey: "channelTones.axes.seriousFunny" },
  { axis: "respectfulIrreverent", labelKey: "channelTones.axes.respectfulIrreverent" },
  { axis: "matterOfFactEnthusiastic", labelKey: "channelTones.axes.matterOfFactEnthusiastic" },
];

export function ChannelTonesSection({ voiceguide }: ChannelTonesSectionProps) {
  const { t } = useTranslation("brandvoice");
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
        <h3 className="text-sm font-semibold text-gray-900 mb-1">{t("channelTones.title")}</h3>
        <p className="text-xs text-gray-500">
          {t("channelTones.help")}
        </p>
      </div>

      <div className="space-y-4">
        {CHANNELS.map(({ key, labelKey, icon: Icon, placeholderKey }) => {
          const entry = draft[key] ?? { description: "", axisShift: null };
          const description = entry.description ?? "";
          const shiftAxis = entry.axisShift?.axis ?? "";
          const shiftDir = entry.axisShift?.direction ?? "increase";

          return (
            <div key={key} className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-4 h-4 text-teal-600" />
                <h4 className="text-sm font-semibold text-gray-900">{t(labelKey)}</h4>
              </div>

              <textarea
                value={description}
                onChange={(e) => handleChange(key, { description: e.target.value })}
                rows={2}
                placeholder={t(placeholderKey)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary-300 mb-3"
              />

              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span>{t("channelTones.axisShift")}</span>
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
                  <option value="">{t("channelTones.none")}</option>
                  {AXIS_LABELS.map((a) => (
                    <option key={a.axis} value={a.axis}>{t(a.labelKey)}</option>
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
                    <option value="increase">{t("channelTones.shiftRight")}</option>
                    <option value="decrease">{t("channelTones.shiftLeft")}</option>
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
            {t("channelTones.save")}
          </Button>
        </div>
      )}

      <AiContentBanner section="channel-tones" savedForAi={voiceguide.channelTonesSavedForAi} />
    </div>
  );
}
