'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { VIDEO_MODELS } from '../../../constants/medium-config-data';
import { ConfigSection } from './ConfigSection';

const FOOTAGE_TYPES = [
  { value: 'real-person', labelKey: 'visualStyle.footage.realPerson' },
  { value: 'stock', labelKey: 'visualStyle.footage.stock' },
  { value: 'animation', labelKey: 'visualStyle.footage.animation' },
  { value: 'mixed', labelKey: 'visualStyle.footage.mixed' },
] as const;

const TEXT_OVERLAY_STYLES = [
  { value: 'bold-headlines', labelKey: 'visualStyle.overlay.boldHeadlines' },
  { value: 'minimal', labelKey: 'visualStyle.overlay.minimal' },
  { value: 'dynamic-captions', labelKey: 'visualStyle.overlay.dynamicCaptions' },
] as const;

const COLOR_GRADES = [
  { value: 'warm', labelKey: 'visualStyle.grade.warm' },
  { value: 'cool', labelKey: 'visualStyle.grade.cool' },
  { value: 'vibrant', labelKey: 'visualStyle.grade.vibrant' },
  { value: 'natural', labelKey: 'visualStyle.grade.natural' },
] as const;

/** Visual style: footage type, model, text overlay, color grade */
export function VisualStyle() {
  const { t } = useTranslation('campaigns-canvas-medium');
  const configValues = useCanvasStore((s) => s.mediumConfigValues);
  const setConfigValue = useCanvasStore((s) => s.setMediumConfigValue);

  const footageType = (configValues.footageType as string) ?? 'mixed';
  const modelId = (configValues.modelId as string) ?? '';
  const textOverlay = (configValues.textOverlay as string) ?? 'bold-headlines';
  const colorGrade = (configValues.colorGrade as string) ?? 'natural';

  return (
    <ConfigSection title={t('visualStyle.title')}>
      {/* Footage Type */}
      <div>
        <label htmlFor="visual-footage-type" className="text-sm font-medium text-gray-700">{t('visualStyle.footageType')}</label>
        <select
          id="visual-footage-type"
          value={footageType}
          onChange={(e) => setConfigValue('footageType', e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          {FOOTAGE_TYPES.map((ft) => (
            <option key={ft.value} value={ft.value}>
              {t(ft.labelKey)}
            </option>
          ))}
        </select>
      </div>

      {/* Model Selector — only visible when footage type is real-person */}
      {footageType === 'real-person' && (
        <div>
          <label htmlFor="visual-model" className="text-sm font-medium text-gray-700">{t('visualStyle.model')}</label>
          <select
            id="visual-model"
            value={modelId}
            onChange={(e) => setConfigValue('modelId', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">{t('visualStyle.selectModel')}</option>
            {VIDEO_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — {m.type}, {m.age}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Text Overlay Style */}
      <div>
        <label htmlFor="visual-text-overlay" className="text-sm font-medium text-gray-700">{t('visualStyle.textOverlay')}</label>
        <select
          id="visual-text-overlay"
          value={textOverlay}
          onChange={(e) => setConfigValue('textOverlay', e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          {TEXT_OVERLAY_STYLES.map((s) => (
            <option key={s.value} value={s.value}>
              {t(s.labelKey)}
            </option>
          ))}
        </select>
      </div>

      {/* Color Grade — 4-column button grid */}
      <div>
        <span className="text-sm font-medium text-gray-700">{t('visualStyle.colorGrade')}</span>
        <div
          className="grid gap-2 mt-1.5"
          role="group"
          aria-label={t('visualStyle.colorGrade')}
          style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}
        >
          {COLOR_GRADES.map((cg) => (
            <button
              key={cg.value}
              type="button"
              aria-pressed={colorGrade === cg.value}
              onClick={() => setConfigValue('colorGrade', cg.value)}
              className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                colorGrade === cg.value
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {t(cg.labelKey)}
            </button>
          ))}
        </div>
      </div>
    </ConfigSection>
  );
}
