"use client";

import { useTranslation } from "react-i18next";
import { Layers, Clock, Zap, Target, Gauge } from "lucide-react";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import {
  PRESET_LABELS,
  STRATEGY_DEPTH_OPTIONS,
  CREATIVE_RANGE_OPTIONS,
  MODEL_RIGOR_OPTIONS,
  computePresetFromConfig,
  estimatePipelineTimeSeconds,
  formatEstimatedTime,
  type StrategyDepth,
  type CreativeRange,
  type ModelRigor,
  type PipelinePreset,
} from "../../lib/pipeline-config";

/**
 * Pipeline Configuration Card
 *
 * Three independent parameters (Strategy Depth / Creative Range / Model Rigor)
 * plus three named presets for one-click selection. Live time estimator.
 *
 * When the user clicks a preset, all three sliders snap to that preset's
 * values. When the user adjusts an individual slider, the preset label
 * becomes "Custom" but the UI stays put.
 */
export function PipelineConfigCard() {
  const { t } = useTranslation("campaigns-wizard");
  const wizardMode = useCampaignWizardStore((s) => s.wizardMode);
  const pipelineConfig = useCampaignWizardStore((s) => s.pipelineConfig);
  const setStrategyDepth = useCampaignWizardStore((s) => s.setStrategyDepth);
  const setCreativeRange = useCampaignWizardStore((s) => s.setCreativeRange);
  const setModelRigor = useCampaignWizardStore((s) => s.setModelRigor);
  const applyPipelinePreset = useCampaignWizardStore((s) => s.applyPipelinePreset);

  const activePreset = computePresetFromConfig(pipelineConfig);
  const skipConceptStep = useCampaignWizardStore((s) => s.skipConceptStep);
  const estimatedSeconds = estimatePipelineTimeSeconds(pipelineConfig, wizardMode, skipConceptStep);
  const estimatedLabel = formatEstimatedTime(estimatedSeconds);

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-700">{t("pipelineConfig.title")}</h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Clock className="h-3.5 w-3.5" />
          <span>{t("pipelineConfig.estimated", { time: estimatedLabel })}</span>
        </div>
      </div>

      {/* Preset buttons */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">{t("pipelineConfig.quickPresets")}</p>
        <div className="grid grid-cols-3 gap-2">
          <PresetButton
            preset="quick"
            label={t("pipelineConfig.presets.quick")}
            subtitle={t("pipelineConfig.presets.quickTime")}
            isActive={activePreset === 'quick'}
            onClick={() => applyPipelinePreset('quick')}
          />
          <PresetButton
            preset="standard"
            label={t("pipelineConfig.presets.standard")}
            subtitle={t("pipelineConfig.presets.standardTime")}
            isActive={activePreset === 'standard'}
            onClick={() => applyPipelinePreset('standard')}
          />
          <PresetButton
            preset="award-grade"
            label={t("pipelineConfig.presets.awardGrade")}
            subtitle={t("pipelineConfig.presets.awardGradeTime")}
            isActive={activePreset === 'award-grade'}
            onClick={() => applyPipelinePreset('award-grade')}
          />
        </div>
      </div>

      <div className="h-px bg-gray-200" />

      {/* Individual parameters */}
      <SliderRow
        icon={<Target className="h-3.5 w-3.5 text-gray-500" />}
        label={t("pipelineConfig.strategyDepth")}
        helper={t("pipelineConfig.strategyDepthHelper")}
        nsGroup="strategyDepth"
        options={STRATEGY_DEPTH_OPTIONS}
        value={pipelineConfig.strategyDepth}
        onChange={(v) => setStrategyDepth(v as StrategyDepth)}
      />

      <SliderRow
        icon={<Zap className="h-3.5 w-3.5 text-gray-500" />}
        label={t("pipelineConfig.creativeRange")}
        helper={t("pipelineConfig.creativeRangeHelper")}
        nsGroup="creativeRange"
        options={CREATIVE_RANGE_OPTIONS}
        value={pipelineConfig.creativeRange}
        onChange={(v) => setCreativeRange(v as CreativeRange)}
      />

      <SliderRow
        icon={<Gauge className="h-3.5 w-3.5 text-gray-500" />}
        label={t("pipelineConfig.modelRigor")}
        helper={t("pipelineConfig.modelRigorHelper")}
        nsGroup="modelRigor"
        options={MODEL_RIGOR_OPTIONS}
        value={pipelineConfig.modelRigor}
        onChange={(v) => setModelRigor(v as ModelRigor)}
      />

      {/* Preset indicator */}
      <div className="pt-1 flex items-center justify-between text-xs">
        <span className="text-gray-500">
          {t("pipelineConfig.presetLabel")} <span className="font-medium text-gray-700">
            {activePreset === 'custom'
              ? t("pipelineConfig.custom")
              : t(`campaigns-pipeline:presetLabels.${activePreset}`, {
                  defaultValue: PRESET_LABELS[activePreset as Exclude<PipelinePreset, 'custom'>],
                })}
          </span>
        </span>
        <span className="text-gray-400">
          {t("pipelineConfig.modeDefaults")}
        </span>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────

interface PresetButtonProps {
  preset: 'quick' | 'standard' | 'award-grade';
  label: string;
  subtitle: string;
  isActive: boolean;
  onClick: () => void;
}

function PresetButton({ label, subtitle, isActive, onClick }: PresetButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2.5 rounded-lg border text-center transition-colors ${
        isActive
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-gray-700'}`}>
        {label}
      </div>
      <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>
    </button>
  );
}

interface SliderOption<T extends string> {
  value: T;
  label: string;
  description: string;
}

interface SliderRowProps<T extends string> {
  icon: React.ReactNode;
  label: string;
  helper: string;
  /** Catalog group in the `campaigns-pipeline` namespace (matches the registry name). */
  nsGroup: 'strategyDepth' | 'creativeRange' | 'modelRigor';
  options: SliderOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

function SliderRow<T extends string>({ icon, label, helper, nsGroup, options, value, onChange }: SliderRowProps<T>) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <label className="text-xs font-medium text-gray-700">{label}</label>
      </div>
      <p className="text-xs text-muted-foreground mb-2">{helper}</p>
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => {
          const isActive = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`px-3 py-2 rounded-md border text-left transition-colors ${
                isActive
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-gray-700'}`}>
                {t(`campaigns-pipeline:${nsGroup}.${option.value}`, { defaultValue: option.label })}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                {t(`campaigns-pipeline:${nsGroup}.${option.value}Desc`, { defaultValue: option.description })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
