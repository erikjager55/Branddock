'use client';

// =============================================================
// Content-sources-kiezer voor agent-runs (agents-context-sources).
//
// Pariteit met de Brand Assistant: zelfde modulelijst en labels (claw-
// i18n-namespace). `selection === null` betekent "niet aangeraakt" — er
// wordt dan géén selectie meegestuurd en de agent draait op de volledige
// merkcontext (default-gedrag, byte-identiek aan vóór deze feature).
// =============================================================

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Database, RotateCcw } from 'lucide-react';
import { ALL_CONTEXT_MODULES, type ContextModule } from '@/lib/claw/claw.types';

export function ContentSourcesPicker({
  selection,
  onChange,
  disabled,
}: {
  selection: ContextModule[] | null;
  onChange: (selection: ContextModule[] | null) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation('agents');
  const { t: tClaw } = useTranslation('claw');
  const [expanded, setExpanded] = useState(false);

  const summary =
    selection === null
      ? t('detail.sources.defaultSummary')
      : t('detail.sources.customSummary', { count: selection.length });

  const toggleModule = (mod: ContextModule) => {
    // Eerste aanraking: start vanaf de volledige lijst zodat "verwijderen"
    // intuïtief werkt (alles stond immers aan).
    const base = selection ?? [...ALL_CONTEXT_MODULES];
    const next = base.includes(mod) ? base.filter((m) => m !== mod) : [...base, mod];
    onChange(next);
  };

  return (
    <div data-testid="content-sources" className="rounded-lg border border-gray-200 bg-gray-50/50">
      <button
        type="button"
        data-testid="content-sources-toggle"
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
        aria-expanded={expanded}
        aria-controls="content-sources-panel"
        onClick={() => setExpanded((v) => !v)}
        disabled={disabled}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
        )}
        <Database className="h-4 w-4 shrink-0 text-emerald-500" />
        <span className="font-medium">{t('detail.sources.title')}</span>
        <span className="ml-auto text-xs text-gray-500">{summary}</span>
      </button>
      {expanded && (
        <div id="content-sources-panel" className="border-t border-gray-200 px-3 py-2.5 space-y-2">
          <p className="text-xs text-gray-500">{t('detail.sources.hint')}</p>
          <div className="flex flex-wrap gap-1.5">
            {ALL_CONTEXT_MODULES.map((mod) => {
              const active = selection === null || selection.includes(mod);
              return (
                <button
                  key={mod}
                  type="button"
                  data-testid={`source-${mod}`}
                  aria-pressed={active}
                  disabled={disabled}
                  onClick={() => toggleModule(mod)}
                  className={
                    active
                      ? 'px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      : 'px-2.5 py-1 rounded-full text-xs font-medium bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                  }
                >
                  {tClaw(`context.modules.${mod}.label`)}
                </button>
              );
            })}
          </div>
          {selection !== null && (
            <button
              type="button"
              data-testid="content-sources-reset"
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
              onClick={() => onChange(null)}
              disabled={disabled}
            >
              <RotateCcw className="h-3 w-3" />
              {t('detail.sources.reset')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
