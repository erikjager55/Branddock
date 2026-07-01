'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { ConfigSection } from './ConfigSection';

const DURATIONS = ['15s', '30s', '60s'] as const;
const ASPECT_RATIOS = [
  { value: '9:16', labelKey: 'videoSpecs.ratio.vertical' },
  { value: '16:9', labelKey: 'videoSpecs.ratio.landscape' },
  { value: '1:1', labelKey: 'videoSpecs.ratio.square' },
  { value: '4:5', labelKey: 'videoSpecs.ratio.portrait' },
] as const;
const QUALITIES = [
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' },
  { value: '4k', label: '4K' },
];

/** Video specifications: duration, aspect ratio, quality */
export function VideoSpecifications() {
  const { t } = useTranslation('campaigns-canvas-medium');
  const configValues = useCanvasStore((s) => s.mediumConfigValues);
  const setConfigValue = useCanvasStore((s) => s.setMediumConfigValue);

  const duration = (configValues.duration as string) ?? '30s';
  const aspectRatio = (configValues.aspectRatio as string) ?? '9:16';
  const quality = (configValues.quality as string) ?? '1080p';

  return (
    <ConfigSection title={t('videoSpecs.title')}>
      {/* Duration */}
      <div>
        <span className="text-sm font-medium text-gray-700">{t('videoSpecs.duration')}</span>
        <div className="grid grid-cols-3 gap-2 mt-1.5" role="group" aria-label={t('videoSpecs.duration')}>
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={duration === d}
              onClick={() => setConfigValue('duration', d)}
              className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                duration === d
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Aspect Ratio */}
      <div>
        <label htmlFor="video-aspect-ratio" className="text-sm font-medium text-gray-700">{t('videoSpecs.aspectRatio')}</label>
        <select
          id="video-aspect-ratio"
          value={aspectRatio}
          onChange={(e) => setConfigValue('aspectRatio', e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          {ASPECT_RATIOS.map((ar) => (
            <option key={ar.value} value={ar.value}>
              {t(ar.labelKey)}
            </option>
          ))}
        </select>
      </div>

      {/* Quality */}
      <div>
        <label htmlFor="video-quality" className="text-sm font-medium text-gray-700">{t('videoSpecs.quality')}</label>
        <select
          id="video-quality"
          value={quality}
          onChange={(e) => setConfigValue('quality', e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          {QUALITIES.map((q) => (
            <option key={q.value} value={q.value}>
              {q.label}
            </option>
          ))}
        </select>
      </div>
    </ConfigSection>
  );
}
