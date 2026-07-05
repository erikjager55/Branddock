"use client";

import { useTranslation } from "react-i18next";
import { Eye, Palette } from "lucide-react";
import { Badge } from "@/components/shared";
import type { StrategyLayer, StrategicChoice } from "@/lib/campaigns/strategy-blueprint.types";

/** Extract display text from a strategic choice (string or object) */
function getChoiceText(choice: string | StrategicChoice): string {
  return typeof choice === 'string' ? choice : choice.choice;
}

/** Check if a strategic choice is an object with rationale/tradeoff */
function isChoiceObject(choice: string | StrategicChoice): choice is StrategicChoice {
  return typeof choice === 'object' && choice !== null && 'choice' in choice;
}

interface StrategySectionProps {
  strategy: StrategyLayer;
}

/** Layer 1: Campaign Strategy — theme, positioning, messaging, JTBD, strategic choices */
export function StrategySection({ strategy }: StrategySectionProps) {
  const { t } = useTranslation('campaigns-core');
  return (
    <div className="space-y-6">
      {/* Human Insight */}
      {strategy.humanInsight && (
        <div className="p-4 bg-violet-50 border border-violet-200 rounded-lg">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Eye className="w-4 h-4 text-violet-500" />
            <h4 className="text-xs font-semibold text-violet-700 uppercase tracking-wider">
              {t('strategy.humanInsight')}
            </h4>
          </div>
          <p className="text-sm text-gray-800 italic leading-relaxed">
            &ldquo;{strategy.humanInsight}&rdquo;
          </p>
          {strategy.culturalTension && (
            <p className="text-xs text-violet-600 mt-2">
              <span className="font-medium">{t('strategy.culturalTension')}</span> {strategy.culturalTension}
            </p>
          )}
        </div>
      )}

      {/* Creative Platform (Big Idea) */}
      {strategy.creativePlatform && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Palette className="w-4 h-4 text-amber-500" />
            <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              {t('strategy.creativePlatform')}
            </h4>
          </div>
          <p className="text-lg font-semibold text-gray-900">{strategy.creativePlatform}</p>
        </div>
      )}

      {/* Creative Territory + Brand Role */}
      {(strategy.creativeTerritory || strategy.brandRole) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {strategy.creativeTerritory && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {t('strategy.creativeTerritory')}
              </h4>
              <p className="text-sm text-gray-700">{strategy.creativeTerritory}</p>
            </div>
          )}
          {strategy.brandRole && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {t('strategy.brandRole')}
              </h4>
              <p className="text-sm text-gray-700">{strategy.brandRole}</p>
            </div>
          )}
        </div>
      )}

      {/* Campaign Theme */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-1">{t('strategy.campaignTheme')}</h4>
        <p className="text-base font-medium text-gray-800">{strategy.campaignTheme}</p>
      </div>

      {/* Positioning Statement */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-1">{t('strategy.positioningStatement')}</h4>
        <p className="text-sm text-gray-700 leading-relaxed">{strategy.positioningStatement}</p>
      </div>

      {/* Strategic Intent */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('strategy.strategicIntent')}</h4>
        <div className="flex items-center gap-3">
          <Badge variant="teal">
            {strategy.strategicIntent === "brand_building"
              ? t('strategy.intent.brandBuilding')
              : strategy.strategicIntent === "sales_activation"
                ? t('strategy.intent.salesActivation')
                : t('strategy.intent.hybrid')}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {t('strategy.intentRatio', {
              brand: strategy.intentRatio?.brand ?? 50,
              activation: strategy.intentRatio?.activation ?? 50,
            })}
          </span>
        </div>
      </div>

      {/* Messaging Hierarchy */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">{t('strategy.messagingHierarchy')}</h4>
        <div className="space-y-3">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider mb-1">{t('strategy.brandMessage')}</p>
            <p className="text-sm text-gray-800">{strategy.messagingHierarchy?.brandMessage ?? ''}</p>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-medium text-blue-700 uppercase tracking-wider mb-1">{t('strategy.campaignMessage')}</p>
            <p className="text-sm text-gray-800">{strategy.messagingHierarchy?.campaignMessage ?? ''}</p>
          </div>
          {(strategy.messagingHierarchy?.proofPoints ?? []).length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{t('strategy.proofPoints')}</p>
              <ul className="space-y-1.5">
                {(strategy.messagingHierarchy?.proofPoints ?? []).map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* JTBD Framing */}
      {strategy.jtbdFraming && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">{t('strategy.jtbd')}</h4>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3">
            <p className="text-xs font-medium text-amber-700 mb-1">{t('strategy.jobStatement')}</p>
            <p className="text-sm text-gray-800 italic">&ldquo;{strategy.jtbdFraming.jobStatement}&rdquo;</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-1">{t('strategy.functionalJob')}</p>
              <p className="text-sm text-gray-700">{strategy.jtbdFraming.functionalJob}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-1">{t('strategy.emotionalJob')}</p>
              <p className="text-sm text-gray-700">{strategy.jtbdFraming.emotionalJob}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-1">{t('strategy.socialJob')}</p>
              <p className="text-sm text-gray-700">{strategy.jtbdFraming.socialJob}</p>
            </div>
          </div>
        </div>
      )}

      {/* Strategic Choices */}
      {(strategy.strategicChoices ?? []).length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">{t('strategy.strategicChoices')}</h4>
          <ul className="space-y-3">
            {(strategy.strategicChoices ?? []).map((choice, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium">{getChoiceText(choice)}</p>
                  {isChoiceObject(choice) && (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-gray-600">{t('strategy.rationale')}</span> {choice.rationale}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-gray-600">{t('strategy.tradeoff')}</span> {choice.tradeoff}
                      </p>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Effie Rationale */}
      {strategy.effieRationale && (
        <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-lg">
          <h4 className="text-xs font-medium text-emerald-700 uppercase tracking-wider mb-1">
            {t('strategy.awardPotential')}
          </h4>
          <p className="text-sm text-gray-700 leading-relaxed">{strategy.effieRationale}</p>
        </div>
      )}
    </div>
  );
}
