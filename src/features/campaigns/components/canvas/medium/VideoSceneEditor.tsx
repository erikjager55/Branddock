'use client';

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useCanvasStore, type SceneId, type SceneSourceMode, type SceneVideoConfig } from '../../../stores/useCanvasStore';
import { useVideoGeneration } from '../../../hooks/useVideoGeneration';
import { FAL_VIDEO_PROVIDERS } from '@/lib/integrations/fal/fal-video-providers';
import { ConfigSection } from './ConfigSection';
import { STUDIO } from '@/lib/constants/design-tokens';
import {
  Video, Film, MessageSquare, MousePointerClick,
  Loader2, AlertCircle, RefreshCw, Play, X,
  Wand2, Image as ImageIcon, FileVideo,
  Mic, Volume2, ChevronDown, ChevronUp,
} from 'lucide-react';

// ─── Scene metadata ──────────────────────────────────────────

const SCENE_META: Record<SceneId, { label: string; icon: typeof Film; color: string; bgColor: string; trackColor: string }> = {
  hook: { label: 'Hook', icon: Film, color: 'text-amber-600', bgColor: 'bg-amber-50', trackColor: '#f59e0b' },
  body: { label: 'Body', icon: MessageSquare, color: 'text-blue-600', bgColor: 'bg-blue-50', trackColor: '#3b82f6' },
  cta:  { label: 'CTA', icon: MousePointerClick, color: 'text-emerald-600', bgColor: 'bg-emerald-50', trackColor: '#10b981' },
};

const SOURCE_OPTIONS: { id: SceneSourceMode; label: string; icon: typeof Wand2 }[] = [
  { id: 'text-to-video', label: 'AI Generate', icon: Wand2 },
  { id: 'image-to-video', label: 'From Image', icon: ImageIcon },
  { id: 'existing', label: 'Existing', icon: FileVideo },
];

const SCENE_IDS: SceneId[] = ['hook', 'body', 'cta'];

// ─── Main Component ──────────────────────────────────────────

export function VideoSceneEditor() {
  const deliverableId = useCanvasStore((s) => s.deliverableId);
  const sceneVideos = useCanvasStore((s) => s.sceneVideos);
  const variantGroups = useCanvasStore((s) => s.variantGroups);
  const selections = useCanvasStore((s) => s.selections);
  const mediumConfigValues = useCanvasStore((s) => s.mediumConfigValues);
  const composedVideoUrl = useCanvasStore((s) => s.composedVideoUrl);
  const composedVideoStatus = useCanvasStore((s) => s.composedVideoStatus);
  const videoProviderConfig = useCanvasStore((s) => s.videoProviderConfig);
  const setConfigValue = useCanvasStore((s) => s.setMediumConfigValue);

  const { generateVideo } = useVideoGeneration(deliverableId);

  // Parse total duration and split points from medium config
  const totalDuration = useMemo(() => {
    const d = mediumConfigValues.duration as string | undefined;
    return d ? parseInt(d, 10) || 30 : 30;
  }, [mediumConfigValues.duration]);

  const split1 = Math.max(1, Math.min(
    (mediumConfigValues.timelineSplit1 as number) ?? Math.round(totalDuration * 0.1),
    totalDuration - 2,
  ));
  const split2 = Math.max(split1 + 1, Math.min(
    (mediumConfigValues.timelineSplit2 as number) ?? Math.round(totalDuration * 0.6),
    totalDuration - 1,
  ));

  const sceneDurations: Record<SceneId, number> = {
    hook: split1,
    body: split2 - split1,
    cta: totalDuration - split2,
  };

  // Get script text per scene from variant groups (orchestrator generates hook/body/cta groups)
  const getSceneScript = useCallback((sceneId: SceneId): string => {
    const variants = variantGroups.get(sceneId);
    if (!variants) return '';
    const idx = selections.get(sceneId) ?? 0;
    return variants[idx]?.content ?? '';
  }, [variantGroups, selections]);

  const allScenesComplete = sceneVideos.every((s) => s.status === 'complete' || s.sourceMode === 'none');
  const scenesWithVideo = sceneVideos.filter((s) => s.videoUrl);
  const hasAnyScript = SCENE_IDS.some((id) => getSceneScript(id).length > 0);

  // Auto-clamp fal.ai duration per scene to provider max
  const selectedProvider = FAL_VIDEO_PROVIDERS.find((p) => p.id === videoProviderConfig.provider);
  const getSceneFalDuration = useCallback((sceneId: SceneId): number => {
    const sceneDur = sceneDurations[sceneId];
    const maxDur = selectedProvider?.maxDuration ?? 10;
    const allowed = selectedProvider?.allowedDurations ?? [6, 8, 10];
    // Pick the closest allowed duration that doesn't exceed scene duration
    const best = allowed.filter((d) => d <= Math.max(sceneDur, allowed[0])).pop() ?? allowed[0];
    return Math.min(best, maxDur);
  }, [sceneDurations, selectedProvider]);

  const handleCompose = useCallback(async () => {
    if (!deliverableId || scenesWithVideo.length === 0) return;
    useCanvasStore.getState().setComposedVideoStatus('composing');
    try {
      const res = await fetch(`/api/studio/${deliverableId}/compose-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenes: scenesWithVideo.map((s) => ({
            sceneId: s.sceneId,
            videoUrl: s.videoUrl,
            voiceoverUrl: s.voiceoverUrl,
            duration: sceneDurations[s.sceneId],
          })),
          transition: 'cut',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }));
        useCanvasStore.getState().setComposedVideoStatus('error', err.error);
        return;
      }
      const data = await res.json();
      useCanvasStore.getState().setComposedVideo(data.composedVideoUrl);
    } catch (error) {
      useCanvasStore.getState().setComposedVideoStatus('error', error instanceof Error ? error.message : 'Failed');
    }
  }, [deliverableId, scenesWithVideo, sceneDurations]);

  if (!hasAnyScript) {
    return (
      <ConfigSection title="Scene Video Builder">
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-xs text-amber-700">No script variants available. Complete step 2 first.</p>
        </div>
      </ConfigSection>
    );
  }

  return (
    <ConfigSection title="Scene Video Builder">
      {/* ─── Timeline visualization + split sliders ─────── */}
      <div className="space-y-2 mb-4">
        <div className="relative h-7 rounded-lg overflow-hidden flex">
          {SCENE_IDS.map((sceneId) => {
            const scene = sceneVideos.find((s) => s.sceneId === sceneId);
            const meta = SCENE_META[sceneId];
            const dur = sceneDurations[sceneId];
            const pct = (dur / totalDuration) * 100;
            const isReady = scene?.status === 'complete';
            return (
              <div
                key={sceneId}
                className="h-full flex items-center justify-center text-[11px] font-medium text-white transition-opacity"
                style={{ width: `${pct}%`, backgroundColor: meta.trackColor, opacity: isReady ? 1 : 0.4 }}
              >
                {meta.label} {dur}s {isReady ? '✓' : ''}
              </div>
            );
          })}
        </div>

        {/* Compact split sliders */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-gray-500">Hook→Body at {split1}s</label>
            <input
              type="range" min={1} max={split2 - 1} step={1} value={split1}
              onChange={(e) => setConfigValue('timelineSplit1', Number(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500">Body→CTA at {split2}s</label>
            <input
              type="range" min={split1 + 1} max={totalDuration - 1} step={1} value={split2}
              onChange={(e) => setConfigValue('timelineSplit2', Number(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>
      </div>

      {/* ─── Provider selector (shared across scenes) ──── */}
      <div className="mb-4">
        <span className="text-xs font-medium text-gray-700 mb-1.5 block">Video Model</span>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {FAL_VIDEO_PROVIDERS.filter((p) => p.supportsTextToVideo).map((p) => {
            const isSelected = videoProviderConfig.provider === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => useCanvasStore.getState().setVideoProviderConfig({ provider: p.id })}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  isSelected ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {p.label} <span className="text-gray-400 ml-1">{p.cost}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Scene cards ─────────────────────────────────── */}
      <div className="space-y-3">
        {SCENE_IDS.map((sceneId) => (
          <SceneCard
            key={sceneId}
            sceneId={sceneId}
            scriptText={getSceneScript(sceneId)}
            duration={sceneDurations[sceneId]}
            falDuration={getSceneFalDuration(sceneId)}
            deliverableId={deliverableId}
            onGenerate={(sourceImageUrl) => {
              generateVideo(getSceneScript(sceneId), sceneId, sourceImageUrl);
            }}
          />
        ))}
      </div>

      {/* ─── Render Final Video ──────────────────────────── */}
      {allScenesComplete && scenesWithVideo.length > 0 && composedVideoStatus !== 'complete' && (
        <div className="mt-4">
          <button
            type="button"
            onClick={handleCompose}
            disabled={composedVideoStatus === 'composing'}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium disabled:opacity-50 ${STUDIO.generateButton}`}
          >
            {composedVideoStatus === 'composing' ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Composing...</>
            ) : (
              <><Play className="h-4 w-4" /> Render Final Video</>
            )}
          </button>
        </div>
      )}

      {composedVideoStatus === 'complete' && composedVideoUrl && (
        <div className="mt-4 rounded-lg overflow-hidden bg-black">
          <video src={composedVideoUrl} controls playsInline className="w-full" style={{ maxHeight: 320 }} />
        </div>
      )}
    </ConfigSection>
  );
}

// ─── Scene Card ──────────────────────────────────────────────

function SceneCard({
  sceneId, scriptText, duration, falDuration, deliverableId, onGenerate,
}: {
  sceneId: SceneId;
  scriptText: string;
  duration: number;
  falDuration: number;
  deliverableId: string | null;
  onGenerate: (sourceImageUrl?: string) => void;
}) {
  const scene = useCanvasStore((s) => s.sceneVideos.find((sv) => sv.sceneId === sceneId)) as SceneVideoConfig;
  const updateScene = useCanvasStore((s) => s.updateScene);

  const meta = SCENE_META[sceneId];
  const Icon = meta.icon;
  const isGenerating = scene.status === 'generating';

  const [expanded, setExpanded] = useState(true);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [voiceoverLoading, setVoiceoverLoading] = useState(false);

  useEffect(() => {
    if (isGenerating) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isGenerating]);

  const handleVoiceover = useCallback(async () => {
    if (!deliverableId || !scriptText) return;
    setVoiceoverLoading(true);
    try {
      const res = await fetch(`/api/studio/${deliverableId}/generate-voiceover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: scriptText, voiceId: 'default', sceneId }),
      });
      if (res.ok) {
        const data = await res.json();
        updateScene(sceneId, { voiceoverUrl: data.audioUrl, voiceoverText: scriptText });
      }
    } catch { /* non-blocking */ } finally {
      setVoiceoverLoading(false);
    }
  }, [deliverableId, scriptText, sceneId, updateScene]);

  return (
    <div className={`rounded-lg border ${scene.status === 'complete' ? 'border-emerald-200' : 'border-gray-200'} bg-white transition-colors`}>
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5"
      >
        <div className="flex items-center gap-2">
          <div className={`p-1 rounded-md ${meta.bgColor} ${meta.color}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-semibold text-gray-800">{meta.label}</span>
          <span className="text-xs text-gray-400">{duration}s</span>
          {scene.status === 'complete' && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>Ready</span>
          )}
          {isGenerating && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> {elapsed}s
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
      </button>

      {!expanded && scriptText && (
        <p className="px-3 pb-2 text-[11px] text-gray-500 line-clamp-1 italic">&ldquo;{scriptText}&rdquo;</p>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-gray-50">
          {/* Script fragment */}
          {scriptText && (
            <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2 mt-2 leading-relaxed italic line-clamp-3">
              &ldquo;{scriptText}&rdquo;
            </p>
          )}

          {/* Video preview (if complete) */}
          {scene.status === 'complete' && scene.videoUrl && (
            <div className="space-y-2">
              <div className="rounded-lg overflow-hidden bg-black">
                <video src={scene.videoUrl} controls playsInline className="w-full" style={{ maxHeight: 180 }} />
              </div>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => updateScene(sceneId, { videoUrl: null, status: 'idle', prompt: null })}
                  className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700"
                >
                  <RefreshCw className="h-3 w-3" /> Redo
                </button>
                {scene.voiceoverUrl ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
                    <Volume2 className="h-3 w-3" /> Voiceover
                  </span>
                ) : (
                  <button
                    onClick={handleVoiceover}
                    disabled={voiceoverLoading}
                    className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700 disabled:opacity-50"
                  >
                    {voiceoverLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mic className="h-3 w-3" />}
                    Voiceover
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {scene.status === 'error' && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-2 flex items-start gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[11px] text-red-700">{scene.error || 'Failed'}</p>
                <button onClick={() => onGenerate()} className="text-[11px] text-red-600 underline mt-0.5">Retry</button>
              </div>
            </div>
          )}

          {/* Generation config (idle only) */}
          {scene.status === 'idle' && (
            <>
              {/* Source mode pills */}
              <div className="flex gap-1">
                {SOURCE_OPTIONS.map((opt) => {
                  const SrcIcon = opt.icon;
                  const isActive = scene.sourceMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateScene(sceneId, { sourceMode: opt.id, sourceUrl: null, videoUrl: null })}
                      className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                        isActive ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      style={isActive ? { backgroundColor: '#0d9488' } : undefined}
                    >
                      <SrcIcon className="h-3 w-3" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Image URL input */}
              {scene.sourceMode === 'image-to-video' && !scene.sourceUrl && (
                <div className="flex gap-1.5">
                  <input
                    type="url" value={imageUrlInput} onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="Image URL..." className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <button onClick={() => { if (imageUrlInput) { updateScene(sceneId, { sourceUrl: imageUrlInput }); setImageUrlInput(''); } }}
                    disabled={!imageUrlInput} className="px-2 py-1 rounded-lg text-[11px] font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#0d9488' }}>
                    Set
                  </button>
                </div>
              )}

              {scene.sourceMode === 'image-to-video' && scene.sourceUrl && (
                <div className="relative rounded-lg overflow-hidden border border-gray-200">
                  <img src={scene.sourceUrl} alt="Source" className="w-full h-20 object-cover" />
                  <button onClick={() => updateScene(sceneId, { sourceUrl: null })} className="absolute top-1 right-1 p-0.5 rounded-full bg-black/50 text-white">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Video URL input */}
              {scene.sourceMode === 'existing' && !scene.videoUrl && (
                <div className="flex gap-1.5">
                  <input
                    type="url" value={videoUrlInput} onChange={(e) => setVideoUrlInput(e.target.value)}
                    placeholder="Video URL..." className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <button onClick={() => { if (videoUrlInput) { updateScene(sceneId, { videoUrl: videoUrlInput, status: 'complete' }); setVideoUrlInput(''); } }}
                    disabled={!videoUrlInput} className="px-2 py-1 rounded-lg text-[11px] font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#0d9488' }}>
                    Use
                  </button>
                </div>
              )}

              {/* Generate button */}
              {scene.sourceMode !== 'existing' && scene.sourceMode !== 'none' && (
                <button
                  type="button"
                  onClick={() => onGenerate(scene.sourceMode === 'image-to-video' ? scene.sourceUrl ?? undefined : undefined)}
                  disabled={!scriptText || (scene.sourceMode === 'image-to-video' && !scene.sourceUrl)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50 transition-colors"
                  style={{ backgroundColor: '#0d9488' }}
                >
                  <Play className="h-3 w-3" />
                  Generate {meta.label} ({falDuration}s)
                </button>
              )}
            </>
          )}

          {/* Generating indicator */}
          {isGenerating && (
            <div className="flex items-center justify-center gap-2 py-3">
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#0d9488' }} />
              <span className="text-xs text-gray-600">Generating {meta.label.toLowerCase()}... {elapsed}s</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
