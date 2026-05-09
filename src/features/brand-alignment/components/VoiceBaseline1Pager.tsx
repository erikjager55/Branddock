'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { useVoiceBaseline1Pager } from '../hooks/use-voice-baseline-1pager';
import type { VoiceAttribute, VoiceBaseline1Pager as VoiceBaseline1PagerData } from '@/lib/brand-fidelity/voice-baseline-1pager';

/**
 * Δ-3 sub-cluster B: read-only header view in Brand Alignment.
 *
 * Renders the derived 1-pager (5 axes + top-10 preferred/avoid + 3 rules) so
 * users see exactly what F-VAL judge + Strategy Analyst (Phase 3) take as
 * baseline. Auto-updates via the same TanStack Query (5-min staleTime matches
 * getBrandContext cache).
 *
 * Empty-state path: when BrandVoiceguide is not yet completed, prompt to fill
 * with deeplink to BV editor (route TBD — placeholder until BV-editor settings
 * page is wired into App.tsx).
 */
export function VoiceBaseline1Pager() {
  const { data, isLoading, isError } = useVoiceBaseline1Pager();
  const [collapsed, setCollapsed] = useState(false);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 mb-6 animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-48 mb-3" />
        <div className="h-3 bg-gray-100 rounded w-full mb-2" />
        <div className="h-3 bg-gray-100 rounded w-3/4" />
      </div>
    );
  }

  if (isError || !data) {
    return null; // Silent fail — page still works without baseline-header
  }

  const isFullyEmpty =
    data.attributes.length === 0 &&
    data.preferredTermsTop10.length === 0 &&
    data.avoidTermsTop10.length === 0 &&
    data.styleRules.length === 0;

  if (isFullyEmpty) {
    return <EmptyVoiceBaseline />;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white mb-6 overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">Brand Voice Baseline</span>
          <span className="text-xs text-gray-500">
            (zoals F-VAL + Strategy Analyst de baseline lezen)
          </span>
        </div>
        {collapsed ? (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {!collapsed && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Section 1: Tone-attributes */}
          <Section
            title="Tone-attributes"
            empty={data.attributes.length === 0}
            emptyHint={`${data.derivedFromCount.attributesAvailable}/4 axes vastgelegd`}
          >
            <div className="space-y-2">
              {data.attributes.map((attr) => (
                <AttributeRow key={attr.name} attr={attr} />
              ))}
            </div>
          </Section>

          {/* Section 2: Preferred + avoid termen */}
          <Section title="Termen" empty={false}>
            <div className="space-y-3">
              <TermGroup
                label="Voorkeur (top 10)"
                terms={data.preferredTermsTop10}
                tone="positive"
              />
              <TermGroup
                label="Vermijden (top 10)"
                terms={data.avoidTermsTop10}
                tone="negative"
              />
            </div>
          </Section>

          {/* Section 3: Style rules */}
          <Section
            title="Style rules"
            empty={data.styleRules.length === 0}
            emptyHint="Voltooi BV anti-patterns"
          >
            <ol className="space-y-1.5 text-sm text-gray-700 list-decimal list-inside">
              {data.styleRules.map((rule, i) => (
                <li key={i}>{rule}</li>
              ))}
            </ol>
          </Section>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────

function Section({
  title,
  empty,
  emptyHint,
  children,
}: {
  title: string;
  empty: boolean;
  emptyHint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
        {title}
      </h3>
      {empty ? (
        <p className="text-sm text-gray-400 italic">
          Nog niet vastgelegd
          {emptyHint ? ` (${emptyHint})` : ''}
        </p>
      ) : (
        children
      )}
    </div>
  );
}

function AttributeRow({ attr }: { attr: VoiceAttribute }) {
  const value = attr.value ?? 0.5;
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
        <span>{attr.poleNeg}</span>
        <span className="font-medium text-gray-900">{attr.name}</span>
        <span>{attr.polePos}</span>
      </div>
      <div className="relative h-2 bg-gray-100 rounded-full">
        <div
          className="absolute top-0 h-2 w-1.5 bg-gray-700 rounded-full"
          style={{ left: `calc(${pct}% - 3px)` }}
          aria-label={`${attr.name}: ${pct}%`}
        />
      </div>
    </div>
  );
}

function TermGroup({
  label,
  terms,
  tone,
}: {
  label: string;
  terms: string[];
  tone: 'positive' | 'negative';
}) {
  if (terms.length === 0) {
    return (
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
        <p className="text-sm text-gray-400 italic">Nog niet vastgelegd</p>
      </div>
    );
  }
  const chipClass =
    tone === 'positive'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'bg-red-50 text-red-700 border-red-200 line-through';
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <div className="flex flex-wrap gap-1">
        {terms.map((term) => (
          <span
            key={term}
            className={`inline-block text-xs px-2 py-0.5 rounded border ${chipClass}`}
          >
            {term}
          </span>
        ))}
      </div>
    </div>
  );
}

function EmptyVoiceBaseline() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-6 flex items-start gap-3">
      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-semibold text-amber-900 mb-1">Voice baseline nog niet vastgelegd</p>
        <p className="text-amber-800">
          F-VAL judge en Strategy Analyst (toekomstig) hebben de Brand Voiceguide
          nodig als baseline. Voltooi de Voice DNA + Vocabulary + Anti-patterns
          secties om hier het werkkader te zien.
        </p>
      </div>
    </div>
  );
}

// Re-export underlying type for consumers that want typed access (default export
// is intentionally unused — components import the named export directly).
export type { VoiceBaseline1PagerData };
