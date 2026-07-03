"use client";

import { useTranslation } from "react-i18next";
import { Badge } from "@/components/shared";
import type { ChannelPlanLayer } from "@/lib/campaigns/strategy-blueprint.types";

interface ChannelPlanSectionProps {
  channelPlan: ChannelPlanLayer;
}

/** Layer 3: Channel & Media Plan — channels with HHH roles, budget, timing */
export function ChannelPlanSection({ channelPlan }: ChannelPlanSectionProps) {
  const { t } = useTranslation('campaigns-core');
  const roleColors: Record<string, "success" | "info" | "default"> = {
    hero: "success",
    hub: "info",
    hygiene: "default",
  };

  const budgetLabels: Record<string, string> = {
    high: t('channelPlan.budget.high'),
    medium: t('channelPlan.budget.medium'),
    low: t('channelPlan.budget.low'),
  };

  return (
    <div className="space-y-6">
      {/* Timing Strategy */}
      {channelPlan.timingStrategy && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs font-medium text-blue-700 mb-1">{t('channelPlan.timingStrategy')}</p>
          <p className="text-sm text-gray-800">{channelPlan.timingStrategy}</p>
        </div>
      )}

      {/* Phase Durations */}
      {channelPlan.phaseDurations.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('channelPlan.phaseDurations')}</h4>
          <div className="flex gap-2 flex-wrap">
            {channelPlan.phaseDurations.map((pd) => (
              <div
                key={pd.phaseId}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
              >
                <span className="font-medium text-gray-900 capitalize">{pd.phaseId}</span>
                <span className="text-muted-foreground ml-1">
                  {t('channelPlan.weeks', { count: pd.suggestedWeeks })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Channels */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          {t('channelPlan.channelsHeading', { count: channelPlan.channels.length })}
        </h4>
        <div className="space-y-3">
          {channelPlan.channels
            .sort((a, b) => a.priority - b.priority)
            .map((channel) => (
              <div
                key={channel.name}
                className="p-4 bg-white border border-gray-200 rounded-lg"
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900">{channel.name}</span>
                  <Badge variant={roleColors[channel.role] ?? "default"}>
                    {channel.role.toUpperCase()}
                  </Badge>
                  <Badge variant="default">{budgetLabels[channel.budgetAllocation] ?? channel.budgetAllocation}</Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {t('channelPlan.priority', { priority: channel.priority })}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-3">{channel.objective}</p>

                {/* Target Personas */}
                {channel.targetPersonas.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-1">{t('channelPlan.targetPersonas')}</p>
                    <div className="flex gap-1 flex-wrap">
                      {channel.targetPersonas.map((persona) => (
                        <Badge key={persona} variant="teal">{persona}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Content Mix */}
                {channel.contentMix.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('channelPlan.contentMix')}</p>
                    <div className="space-y-1">
                      {channel.contentMix.map((mix, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="font-medium">{mix.contentType}</span>
                          <span className="text-muted-foreground">{mix.frequency}</span>
                          <span className="text-muted-foreground">({mix.phase})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
