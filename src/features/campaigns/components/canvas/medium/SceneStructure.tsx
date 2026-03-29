'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { ConfigSection } from './ConfigSection';
import { Film, MessageSquare, MousePointerClick } from 'lucide-react';

const SCENE_CARDS = [
  {
    id: 'hook',
    label: 'Hook',
    description: 'Opening scene that grabs attention in the first 3 seconds.',
    icon: Film,
    color: 'text-amber-600 bg-amber-50',
    trackColor: '#f59e0b',
  },
  {
    id: 'body',
    label: 'Body Script',
    description: 'Main content that delivers the message and builds engagement.',
    icon: MessageSquare,
    color: 'text-blue-600 bg-blue-50',
    trackColor: '#3b82f6',
  },
  {
    id: 'cta',
    label: 'Call to Action',
    description: 'Closing scene with a clear directive for the viewer.',
    icon: MousePointerClick,
    color: 'text-emerald-600 bg-emerald-50',
    trackColor: '#10b981',
  },
] as const;

/** Parse duration string (e.g. "30s") to number of seconds */
function parseDuration(d: string): number {
  const num = parseInt(d, 10);
  return isNaN(num) ? 30 : num;
}

/** Scene structure: scene cards + optional timeline editor */
export function SceneStructure() {
  const configValues = useCanvasStore((s) => s.mediumConfigValues);
  const setConfigValue = useCanvasStore((s) => s.setMediumConfigValue);
  const variantGroups = useCanvasStore((s) => s.variantGroups);
  const selections = useCanvasStore((s) => s.selections);

  const duration = parseDuration((configValues.duration as string) ?? '30s');
  const [showTimeline, setShowTimeline] = useState(false);

  // Split points stored as seconds from start (handle 1 divides into 3 sections)
  const rawSplit1 = (configValues.timelineSplit1 as number) ?? Math.round(duration * 0.1);
  const rawSplit2 = (configValues.timelineSplit2 as number) ?? Math.round(duration * 0.6);

  // Clamp splits to valid range when duration changes
  const split1 = Math.max(1, Math.min(rawSplit1, duration - 2));
  const split2 = Math.max(split1 + 1, Math.min(rawSplit2, duration - 1));

  // Persist split defaults to store on mount and re-clamp when duration changes
  useEffect(() => {
    const store = useCanvasStore.getState();
    const current = store.mediumConfigValues;
    const storedSplit1 = current.timelineSplit1 as number | undefined;
    const storedSplit2 = current.timelineSplit2 as number | undefined;
    const needsUpdate1 = storedSplit1 === undefined || storedSplit1 !== split1;
    const needsUpdate2 = storedSplit2 === undefined || storedSplit2 !== split2;
    if (needsUpdate1 || needsUpdate2) {
      store.setMediumConfigValues({
        ...current,
        ...(needsUpdate1 ? { timelineSplit1: split1 } : {}),
        ...(needsUpdate2 ? { timelineSplit2: split2 } : {}),
      });
    }
  }, [duration]); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally persist defaults and re-clamp on duration change

  const hookDuration = split1;
  const bodyDuration = split2 - split1;
  const ctaDuration = duration - split2;

  const handleSplit1Change = useCallback(
    (value: number) => {
      const clamped = Math.max(1, Math.min(value, split2 - 1));
      setConfigValue('timelineSplit1', clamped);
    },
    [split2, setConfigValue],
  );

  const handleSplit2Change = useCallback(
    (value: number) => {
      const clamped = Math.max(split1 + 1, Math.min(value, duration - 1));
      setConfigValue('timelineSplit2', clamped);
    },
    [split1, duration, setConfigValue],
  );

  // Get selected content from variant groups for scene display
  const getSceneContent = (group: string): string | null => {
    const variants = variantGroups.get(group);
    if (!variants) return null;
    const idx = selections.get(group) ?? 0;
    return variants[idx]?.content ?? null;
  };

  // Generate time markers for the timeline
  const timeMarkers: number[] = [];
  const step = duration <= 15 ? 5 : 10;
  for (let t = 0; t <= duration; t += step) {
    timeMarkers.push(t);
  }
  if (timeMarkers[timeMarkers.length - 1] !== duration) {
    timeMarkers.push(duration);
  }

  return (
    <ConfigSection title="Scene Structure">
      {/* Scene Cards */}
      <div className="space-y-3">
        {SCENE_CARDS.map((scene) => {
          const Icon = scene.icon;
          const content = getSceneContent(scene.id);
          return (
            <div
              key={scene.id}
              className="rounded-lg border border-gray-200 bg-white p-3"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`p-1.5 rounded-md ${scene.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-semibold text-gray-800">
                  {scene.label}
                </span>
              </div>
              <p className="text-xs text-gray-500">{scene.description}</p>
              {content && (
                <p className="text-xs text-gray-600 mt-2 line-clamp-2 italic">
                  &ldquo;{content}&rdquo;
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Timeline Toggle */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-sm font-medium text-gray-700">
          Customize Timeline
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={showTimeline}
          aria-label="Customize Timeline"
          onClick={() => setShowTimeline(!showTimeline)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            showTimeline ? 'bg-primary' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              showTimeline ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Timeline Editor */}
      {showTimeline && (
        <div className="space-y-3 pt-1">
          {/* Track visualization */}
          <div className="relative h-8 rounded-lg overflow-hidden flex">
            <div
              className="h-full flex items-center justify-center text-xs font-medium text-white"
              style={{
                width: `${(hookDuration / duration) * 100}%`,
                backgroundColor: SCENE_CARDS[0].trackColor,
              }}
            >
              {hookDuration}s
            </div>
            <div
              className="h-full flex items-center justify-center text-xs font-medium text-white"
              style={{
                width: `${(bodyDuration / duration) * 100}%`,
                backgroundColor: SCENE_CARDS[1].trackColor,
              }}
            >
              {bodyDuration}s
            </div>
            <div
              className="h-full flex items-center justify-center text-xs font-medium text-white"
              style={{
                width: `${(ctaDuration / duration) * 100}%`,
                backgroundColor: SCENE_CARDS[2].trackColor,
              }}
            >
              {ctaDuration}s
            </div>
          </div>

          {/* Time markers */}
          <div className="flex justify-between px-1">
            {timeMarkers.map((t) => (
              <span key={t} className="text-[10px] text-gray-400">
                {t}s
              </span>
            ))}
          </div>

          {/* Range inputs for split points */}
          <div className="space-y-2">
            <div>
              <label htmlFor="timeline-split1" className="text-xs text-gray-500">
                Hook → Body split ({split1}s)
              </label>
              <input
                id="timeline-split1"
                type="range"
                min={1}
                max={split2 - 1}
                step={1}
                value={split1}
                onChange={(e) => handleSplit1Change(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
            <div>
              <label htmlFor="timeline-split2" className="text-xs text-gray-500">
                Body → CTA split ({split2}s)
              </label>
              <input
                id="timeline-split2"
                type="range"
                min={split1 + 1}
                max={duration - 1}
                step={1}
                value={split2}
                onChange={(e) => handleSplit2Change(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>

          {/* Section durations summary */}
          <div className="flex gap-3 text-xs text-gray-500">
            <span>Hook: {hookDuration}s</span>
            <span>Body: {bodyDuration}s</span>
            <span>CTA: {ctaDuration}s</span>
          </div>
        </div>
      )}
    </ConfigSection>
  );
}
