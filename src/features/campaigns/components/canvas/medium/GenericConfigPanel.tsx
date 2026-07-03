'use client';

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { MEDIUM_CATEGORY_CONFIGS } from '../../../constants/medium-config-registry';
import type { MediumCategory } from '../../../types/medium-config.types';
import { MediumConfigLayout } from './MediumConfigLayout';
import { WebPageLayout } from './WebPageLayout';
import { PuckLayoutWrapper } from './PuckLayoutWrapper';
// Web-page content-types die naar de Puck-builder routeren — centrale bron
// (per ADR 2026-05-22-landing-page-builder-architectuur).
import { isPuckRenderable } from '@/lib/landing-pages/webpage-types';
import { ConfigSection } from './ConfigSection';
import { ConfigFieldRenderer } from './ConfigFieldRenderer';

interface GenericConfigPanelProps {
  category: MediumCategory;
  onAdvance: () => void;
  deliverableId?: string;
}

/** Registry-driven config panel for non-video categories */
export function GenericConfigPanel({ category, onAdvance, deliverableId }: GenericConfigPanelProps) {
  const { t } = useTranslation('campaigns-canvas-medium');
  const config = MEDIUM_CATEGORY_CONFIGS[category];
  const contentType = useCanvasStore((s) => s.contentType);
  const contentTypeInputs = useCanvasStore((s) => s.contentTypeInputs);
  const pollDuration = useCanvasStore((s) => s.mediumConfigValues.pollDuration as string | undefined);
  const setConfigValue = useCanvasStore((s) => s.setMediumConfigValue);
  const isLinkedInPoll = contentType === 'linkedin-poll';

  // Initialize defaults on mount / category change; reset stale keys from previous category
  useEffect(() => {
    const current = useCanvasStore.getState().mediumConfigValues;

    // Collect valid keys for this category
    const validKeys = new Set<string>();
    const defaults: Record<string, unknown> = {};
    for (const section of config.sections) {
      for (const field of section.fields) {
        validKeys.add(field.key);
        defaults[field.key] = field.defaultValue;
      }
    }

    // 2026-05-19 — LinkedIn poll-specific config-key. Mirrors the 4 poll-
    // duration options the LinkedIn composer offers (1 day / 3 days /
    // 1 week / 2 weeks). Default 1 week matches LinkedIn's pre-selected
    // value and the poll-prompt's "1 week performs best" guidance.
    if (isLinkedInPoll) {
      validKeys.add('pollDuration');
      defaults.pollDuration = '1w';
    }

    // Build new config: defaults first, then current values for valid keys only
    const merged: Record<string, unknown> = { ...defaults };
    for (const [key, value] of Object.entries(current)) {
      if (validKeys.has(key)) {
        merged[key] = value;
      }
    }

    // Only write if something changed
    const currentKeys = Object.keys(current);
    const needsUpdate =
      currentKeys.length !== Object.keys(merged).length ||
      currentKeys.some((k) => !validKeys.has(k)) ||
      Object.keys(defaults).some((k) => !(k in current));

    if (needsUpdate) {
      useCanvasStore.getState().setMediumConfigValues(merged);
    }
  }, [category, isLinkedInPoll]); // eslint-disable-line react-hooks/exhaustive-deps -- config is derived from category

  // Web-page split path:
  //   - 5 Puck-powered types (landing-page / product-page / faq-page /
  //     comparison-page / microsite) → PuckLayoutWrapper with drag-drop editor
  //   - blog-article web-page types (blog-post / pillar-page / etc.) →
  //     legacy WebPageLayout with EditableArticleSection rendering
  //   - All non-web categories → unified MediumConfigLayout
  // GEO/SEO Fase 2: long-form-GEO (isPuckRenderable, andere categorie dan 'web-page')
  // krijgt óók de Puck-editor; de 5 web-page-types impliceren category==='web-page'.
  const isPuckWebPage = isPuckRenderable(contentType, contentTypeInputs);
  const Layout = isPuckWebPage
    ? PuckLayoutWrapper
    : category === 'web-page'
      ? WebPageLayout
      : MediumConfigLayout;

  return (
    <Layout onAdvance={onAdvance} deliverableId={deliverableId}>
      {config.sections.map((section) => (
        <ConfigSection key={section.id} title={section.title}>
          {section.fields.map((field) => (
            <ConfigFieldRenderer key={field.key} field={field} />
          ))}
        </ConfigSection>
      ))}
      {/* 2026-05-19 — LinkedIn poll duration picker. Lives outside the
          category registry because it's specific to one content-type
          (linkedin-poll), not the whole social-post category. */}
      {isLinkedInPoll && (
        <ConfigSection title={t('poll.title')}>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1.5 block">{t('poll.duration')}</label>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { value: '1d', labelKey: 'poll.options.oneDay' },
                { value: '3d', labelKey: 'poll.options.threeDays' },
                { value: '1w', labelKey: 'poll.options.oneWeek' },
                { value: '2w', labelKey: 'poll.options.twoWeeks' },
              ].map((opt) => {
                const active = (pollDuration ?? '1w') === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setConfigValue('pollDuration', opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      active ? 'text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={active ? { backgroundColor: '#0d9488' } : undefined}
                  >
                    {t(opt.labelKey)}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-500 mt-1.5">
              {t('poll.help')}
            </p>
          </div>
        </ConfigSection>
      )}
    </Layout>
  );
}
