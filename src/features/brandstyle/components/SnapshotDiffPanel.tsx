"use client";

import { useState } from "react";
import { Palette, Type, Square, Ruler, Layers, Blocks, Sparkles } from "lucide-react";
import type { SnapshotDiff } from "@/lib/brandstyle/snapshots/snapshot-diff";

interface Props {
  diff: SnapshotDiff;
  summary: string[];
}

export function SnapshotDiffPanel({ diff, summary }: Props) {
  const [showCosmetic, setShowCosmetic] = useState(false);
  const cosmeticCount = diff.colors.filter((c) => c.cosmetic).length;

  const sections = [
    {
      key: 'colors',
      label: 'Colors',
      icon: Palette,
      items: diff.colors
        .filter((c) => showCosmetic || !c.cosmetic)
        .map((c) => (
          <ColorRow key={c.role} change={c} />
        )),
      empty: diff.colors.filter((c) => showCosmetic || !c.cosmetic).length === 0,
    },
    {
      key: 'typography',
      label: 'Typography',
      icon: Type,
      items: diff.typography.map((t) => (
        <li key={t.role} className="flex items-baseline gap-2 text-xs">
          <code className="font-mono text-gray-500">{t.role}</code>
          <span className="text-gray-700">
            {!t.from ? `added: ${t.to?.fontFamily} ${t.to?.fontSize}` :
             !t.to ? `removed (was ${t.from.fontFamily})` :
             t.fields.map((f) => `${f}: ${t.from![f] ?? '—'} → ${t.to![f] ?? '—'}`).join(', ')}
          </span>
        </li>
      )),
      empty: diff.typography.length === 0,
    },
    {
      key: 'rounded',
      label: 'Rounded',
      icon: Square,
      items: diff.rounded.map((r) => (
        <li key={r.key} className="flex items-baseline gap-2 text-xs">
          <code className="font-mono text-gray-500">rounded.{r.key}</code>
          <span className="text-gray-700">{r.from ?? '—'}px → {r.to ?? '—'}px</span>
        </li>
      )),
      empty: diff.rounded.length === 0,
    },
    {
      key: 'spacing',
      label: 'Spacing',
      icon: Ruler,
      items: diff.spacing.map((s) => (
        <li key={s.key} className="flex items-baseline gap-2 text-xs">
          <code className="font-mono text-gray-500">spacing.{s.key}</code>
          <span className="text-gray-700">{s.from ?? '—'}px → {s.to ?? '—'}px</span>
        </li>
      )),
      empty: diff.spacing.length === 0,
    },
    {
      key: 'elevation',
      label: 'Elevation',
      icon: Layers,
      items: diff.elevation.map((e) => (
        <li key={e.level} className="flex items-baseline gap-2 text-xs">
          <code className="font-mono text-gray-500">elevation.{e.level}</code>
          <span className="text-gray-700 truncate">
            {!e.from ? 'added' : !e.to ? 'removed' : 'changed'}
          </span>
        </li>
      )),
      empty: diff.elevation.length === 0,
    },
    {
      key: 'components',
      label: 'Components',
      icon: Blocks,
      items: diff.components.map((c) => (
        <li key={c.variant} className="flex items-baseline gap-2 text-xs">
          <code className="font-mono text-gray-500">{c.variant}</code>
          <span className="text-gray-700">
            {!c.from ? 'added' : !c.to ? 'removed' : 'props changed'}
          </span>
        </li>
      )),
      empty: diff.components.length === 0,
    },
  ];

  const bf = diff.brandFoundation;
  const hasBrandFoundationChanges =
    bf.assetsAdded.length + bf.assetsRemoved.length + bf.assetsChanged.length +
    bf.personasAdded.length + bf.personasRemoved.length +
    bf.competitorsAdded.length + bf.competitorsRemoved.length > 0;

  if (diff.isTrivial && !showCosmetic) {
    return (
      <div className="rounded border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600 flex items-center justify-between">
        <span>No significant changes — only metadata or cosmetic adjustments.</span>
        {cosmeticCount > 0 && (
          <button
            type="button"
            onClick={() => setShowCosmetic(true)}
            className="text-teal-700 hover:underline"
          >
            Show {cosmeticCount} cosmetic
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {summary.length > 0 && (
        <div className="rounded border border-teal-100 bg-teal-50/50 p-3">
          <p className="text-xs font-medium text-teal-900 mb-1.5">Summary</p>
          <ul className="space-y-1 text-xs text-gray-800">
            {summary.map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sections.filter((s) => !s.empty).map((s) => (
          <div key={s.key} className="rounded border border-gray-200 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <s.icon className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-semibold text-gray-700">{s.label}</span>
            </div>
            <ul className="space-y-1">{s.items}</ul>
          </div>
        ))}

        {hasBrandFoundationChanges && (
          <div className="rounded border border-gray-200 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-semibold text-gray-700">Brand Foundation</span>
            </div>
            <ul className="space-y-1 text-xs text-gray-700">
              {bf.assetsAdded.length > 0 && <li>+ {bf.assetsAdded.length} brand assets</li>}
              {bf.assetsRemoved.length > 0 && <li>− {bf.assetsRemoved.length} brand assets</li>}
              {bf.assetsChanged.length > 0 && <li>~ {bf.assetsChanged.length} brand assets updated</li>}
              {bf.personasAdded.length > 0 && <li>+ {bf.personasAdded.length} personas</li>}
              {bf.personasRemoved.length > 0 && <li>− {bf.personasRemoved.length} personas</li>}
              {bf.competitorsAdded.length > 0 && <li>+ {bf.competitorsAdded.length} competitors</li>}
              {bf.competitorsRemoved.length > 0 && <li>− {bf.competitorsRemoved.length} competitors</li>}
            </ul>
          </div>
        )}
      </div>

      {cosmeticCount > 0 && (
        <button
          type="button"
          onClick={() => setShowCosmetic((v) => !v)}
          className="text-xs text-teal-700 hover:underline"
        >
          {showCosmetic ? 'Hide' : 'Show'} {cosmeticCount} cosmetic color change{cosmeticCount === 1 ? '' : 's'}
        </button>
      )}
    </div>
  );
}

function ColorRow({ change }: { change: SnapshotDiff['colors'][number] }) {
  return (
    <li className="flex items-baseline gap-2 text-xs">
      <div className="flex items-center gap-1 flex-shrink-0">
        {change.from && (
          <span
            className="w-3 h-3 rounded border border-gray-200"
            style={{ backgroundColor: change.from }}
            title={change.from}
          />
        )}
        <span className="text-gray-300">→</span>
        {change.to && (
          <span
            className="w-3 h-3 rounded border border-gray-200"
            style={{ backgroundColor: change.to }}
            title={change.to}
          />
        )}
      </div>
      <code className="font-mono text-gray-500">{change.role}</code>
      <span className="text-gray-700 font-mono">
        {change.from ?? '—'} → {change.to ?? '—'}
      </span>
      {change.cosmetic && (
        <span className="text-[10px] text-gray-400 italic">cosmetic</span>
      )}
    </li>
  );
}
