'use client';

import React, { useEffect } from 'react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { MEDIUM_CATEGORY_CONFIGS } from '../../../constants/medium-config-registry';
import type { MediumCategory } from '../../../types/medium-config.types';
import { MediumConfigLayout } from './MediumConfigLayout';
import { WebPageLayout } from './WebPageLayout';
import { ConfigSection } from './ConfigSection';
import { ConfigFieldRenderer } from './ConfigFieldRenderer';

interface GenericConfigPanelProps {
  category: MediumCategory;
  onAdvance: () => void;
  deliverableId?: string;
}

/** Registry-driven config panel for non-video categories */
export function GenericConfigPanel({ category, onAdvance, deliverableId }: GenericConfigPanelProps) {
  const config = MEDIUM_CATEGORY_CONFIGS[category];

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
  }, [category]); // eslint-disable-line react-hooks/exhaustive-deps -- config is derived from category

  // Web-page has its own layout with article-specific rendering (hero
  // styles, layout modes, CTA). All other categories use the unified
  // MediumConfigLayout (config top, preview bottom).
  const Layout = category === 'web-page' ? WebPageLayout : MediumConfigLayout;

  return (
    <Layout onAdvance={onAdvance} deliverableId={deliverableId}>
      {config.sections.map((section) => (
        <ConfigSection key={section.id} title={section.title}>
          {section.fields.map((field) => (
            <ConfigFieldRenderer key={field.key} field={field} />
          ))}
        </ConfigSection>
      ))}
    </Layout>
  );
}
