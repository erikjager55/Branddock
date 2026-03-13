"use client";

import { Badge } from "@/components/shared";
import { Users, Clock, Cpu } from "lucide-react";
import type { CampaignBlueprint } from "@/lib/campaigns/strategy-blueprint.types";

interface BlueprintOverviewSectionProps {
  blueprint: CampaignBlueprint;
}

/** Overview tab: confidence, variant comparison, persona validation, quick stats */
export function BlueprintOverviewSection({ blueprint }: BlueprintOverviewSectionProps) {
  const {
    strategy,
    architecture,
    channelPlan,
    assetPlan,
    generatedAt,
  } = blueprint;

  // Nullable metadata fields — may be absent for freshly created or partial blueprints
  const personaValidation = blueprint.personaValidation ?? [];
  const variantAScore = blueprint.variantAScore ?? 0;
  const variantBScore = blueprint.variantBScore ?? 0;
  const pipelineDuration = blueprint.pipelineDuration ?? 0;
  const modelsUsed = blueprint.modelsUsed ?? [];

  const avgPersonaScore =
    personaValidation.length > 0
      ? personaValidation.reduce((sum, pv) => sum + (pv.overallScore ?? 0), 0) / personaValidation.length
      : 0;

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {architecture?.journeyPhases?.length ?? 0}
          </p>
          <p className="text-xs text-muted-foreground">Journey Phases</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {(architecture?.journeyPhases ?? []).reduce((sum, p) => sum + (p.touchpoints?.length ?? 0), 0)}
          </p>
          <p className="text-xs text-muted-foreground">Touchpoints</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {channelPlan?.channels?.length ?? 0}
          </p>
          <p className="text-xs text-muted-foreground">Channels</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {assetPlan?.totalDeliverables ?? 0}
          </p>
          <p className="text-xs text-muted-foreground">Deliverables</p>
        </div>
      </div>

      {/* Strategic Intent */}
      {strategy && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Strategic Intent</h4>
          <div className="flex items-center gap-3">
            <Badge variant="teal">
              {strategy.strategicIntent === "brand_building"
                ? "Brand Building"
                : strategy.strategicIntent === "sales_activation"
                  ? "Sales Activation"
                  : "Hybrid"}
            </Badge>
            {strategy.intentRatio && (
              <span className="text-sm text-muted-foreground">
                {strategy.intentRatio.brand}/{strategy.intentRatio.activation} brand/activation split
              </span>
            )}
          </div>
        </div>
      )}

      {/* Variant Comparison — only show when real data is available */}
      {(variantAScore > 0 || variantBScore > 0) && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Variant Comparison</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-medium text-blue-700 mb-1">Variant A (Organic)</p>
              <p className="text-xl font-bold text-blue-900">{variantAScore.toFixed(1)}</p>
              <p className="text-xs text-blue-600">Persona avg. score</p>
            </div>
            <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg">
              <p className="text-xs font-medium text-violet-700 mb-1">Variant B (Conversion)</p>
              <p className="text-xl font-bold text-violet-900">{variantBScore.toFixed(1)}</p>
              <p className="text-xs text-violet-600">Persona avg. score</p>
            </div>
          </div>
        </div>
      )}

      {/* Persona Validation — only show when real persona feedback exists */}
      {personaValidation.length > 0 && personaValidation.some((pv) => (pv.overallScore ?? 0) > 0 || pv.feedback) && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            <Users className="w-4 h-4 inline mr-1.5 text-muted-foreground" />
            Persona Validation ({personaValidation.length} personas{avgPersonaScore > 0 ? `, avg ${avgPersonaScore.toFixed(1)}/10` : ""})
          </h4>
          <div className="space-y-3">
            {personaValidation.map((pv) => {
              const concerns = pv.concerns ?? [];
              const score = pv.overallScore ?? 0;
              return (
                <div key={pv.personaId ?? pv.personaName} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{pv.personaName}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={score >= 7 ? "success" : score >= 5 ? "warning" : "danger"}>
                        {score}/10
                      </Badge>
                      {pv.preferredVariant && (
                        <Badge variant="default">
                          Preferred: {pv.preferredVariant}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {pv.feedback && (
                    <p className="text-xs text-gray-600 mb-2">{pv.feedback}</p>
                  )}
                  {concerns.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {concerns.map((concern, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded">
                          {concern}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        {generatedAt && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(generatedAt).toLocaleDateString()}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Cpu className="w-3 h-3" />
          {Math.round(pipelineDuration / 1000)}s pipeline
        </span>
        {modelsUsed.length > 0 && (
          <span>{modelsUsed.length} AI models used</span>
        )}
      </div>
    </div>
  );
}
