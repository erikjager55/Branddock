"use client";

import { ProgressBar, Badge } from "@/components/shared";
import { Users, Clock, Cpu } from "lucide-react";
import type { CampaignBlueprint } from "@/lib/campaigns/strategy-blueprint.types";

interface BlueprintOverviewSectionProps {
  blueprint: CampaignBlueprint;
}

/** Overview tab: confidence, variant comparison, persona validation, quick stats */
export function BlueprintOverviewSection({ blueprint }: BlueprintOverviewSectionProps) {
  const {
    confidence,
    confidenceBreakdown,
    personaValidation,
    variantAScore,
    variantBScore,
    pipelineDuration,
    modelsUsed,
    strategy,
    architecture,
    channelPlan,
    assetPlan,
    generatedAt,
  } = blueprint;

  const avgPersonaScore =
    personaValidation.length > 0
      ? personaValidation.reduce((sum, pv) => sum + pv.overallScore, 0) / personaValidation.length
      : 0;

  return (
    <div className="space-y-6">
      {/* Confidence Banner */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900">Blueprint Confidence</h4>
          <span
            className={`text-2xl font-bold ${
              confidence >= 80 ? "text-emerald-600" : confidence >= 60 ? "text-amber-500" : "text-red-500"
            }`}
          >
            {Math.round(confidence)}%
          </span>
        </div>
        <ProgressBar
          value={confidence}
          color={confidence >= 80 ? "emerald" : confidence >= 60 ? "amber" : "red"}
          size="md"
        />
        {/* Breakdown */}
        {Object.keys(confidenceBreakdown).length > 0 && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(confidenceBreakdown).map(([key, value]) => (
              <div key={key} className="text-xs">
                <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                <span className="ml-1 font-medium text-gray-700">{Math.round(value)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {architecture.journeyPhases.length}
          </p>
          <p className="text-xs text-muted-foreground">Journey Phases</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {architecture.journeyPhases.reduce((sum, p) => sum + p.touchpoints.length, 0)}
          </p>
          <p className="text-xs text-muted-foreground">Touchpoints</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {channelPlan.channels.length}
          </p>
          <p className="text-xs text-muted-foreground">Channels</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {assetPlan.totalDeliverables}
          </p>
          <p className="text-xs text-muted-foreground">Deliverables</p>
        </div>
      </div>

      {/* Strategic Intent */}
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
          <span className="text-sm text-muted-foreground">
            {strategy.intentRatio.brand}/{strategy.intentRatio.activation} brand/activation split
          </span>
        </div>
      </div>

      {/* Variant Comparison */}
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

      {/* Persona Validation */}
      {personaValidation.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            <Users className="w-4 h-4 inline mr-1.5 text-muted-foreground" />
            Persona Validation ({personaValidation.length} personas, avg {avgPersonaScore.toFixed(1)}/10)
          </h4>
          <div className="space-y-3">
            {personaValidation.map((pv) => (
              <div key={pv.personaId} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{pv.personaName}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={pv.overallScore >= 7 ? "success" : pv.overallScore >= 5 ? "warning" : "danger"}>
                      {pv.overallScore}/10
                    </Badge>
                    <Badge variant="default">
                      Preferred: {pv.preferredVariant}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-2">{pv.feedback}</p>
                {pv.concerns.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {pv.concerns.map((concern, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded">
                        {concern}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
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
