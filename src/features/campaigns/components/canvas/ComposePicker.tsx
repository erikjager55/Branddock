'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Search, X, Image as ImageIcon, Heart, Sparkles, AlertCircle } from 'lucide-react';
import { useMediaAssets } from '@/features/media-library/hooks';
import { generateCanvasVisualCompose, setHeroImage as persistHeroImage } from '../../api/canvas.api';
import { canvasKeys } from '../../hooks/canvas.hooks';
import { useCanvasStore } from '../../stores/useCanvasStore';
import type { MediaAssetWithMeta, MediaCategory } from '@/features/media-library/types/media.types';
import type { CanvasImageVariant } from '../../types/canvas.types';

const CATEGORY_CHIPS: MediaCategory[] = [
  'HERO_IMAGE',
  'LIFESTYLE',
  'PRODUCT_PHOTO',
  'TEAM_PHOTO',
  'EVENT_PHOTO',
  'PHOTOGRAPHY',
  'ILLUSTRATION',
  'INFOGRAPHIC',
];

interface ComposePickerProps {
  deliverableId: string;
  onCancel?: () => void;
  /** Called after a successful generation — used by Step 2 to dismiss the picker. */
  onGenerated?: () => void;
  /** 'hero' in de LP-flow → de route wiret de compositie server-side in puckData.BrandHero. */
  target?: 'hero';
}

const MIN_PICKS = 2;
const MAX_PICKS = 9;

/**
 * Inline picker for composing a new image from 2-9 reference MediaAssets
 * + a natural-language compose instruction. Wired to Visual Brief
 * source = 'compose' — feeds fal.ai FLUX Pro Kontext multi-reference.
 *
 * The selection + instruction are persisted to settings.visualBrief.compose
 * so they survive Canvas reopen and feed forward to the
 * generate-visual-compose endpoint (which reads them server-side).
 */
export function ComposePicker({ deliverableId, onCancel, onGenerated, target }: ComposePickerProps) {
  const { t } = useTranslation('campaigns-canvas');
  const visualBrief = useCanvasStore((s) => s.visualBrief);
  const setVisualBriefField = useCanvasStore((s) => s.setVisualBriefField);
  const setImageVariants = useCanvasStore((s) => s.setImageVariants);
  const setHeroImage = useCanvasStore((s) => s.setHeroImage);
  const setVisualFidelityRunning = useCanvasStore((s) => s.setVisualFidelityRunning);
  const queryClient = useQueryClient();

  const initialCompose = visualBrief.compose;
  const [picked, setPicked] = useState<string[]>(initialCompose?.referenceIds ?? []);
  const [instruction, setInstruction] = useState<string>(initialCompose?.instruction ?? '');

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState<MediaCategory | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 300ms debounce for search input — same pattern as LibraryAssetPicker.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isFetching } = useMediaAssets({
    mediaType: 'IMAGE',
    isArchived: false,
    search: debouncedSearch || undefined,
    category: category ?? undefined,
    isFavorite: favoritesOnly ? true : undefined,
    limit: 60,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const assets = useMemo(() => data?.assets ?? [], [data]);
  const total = data?.total ?? 0;
  const hasFilters =
    debouncedSearch.length > 0 || category !== null || favoritesOnly;

  // Persist picks + instruction to the Visual Brief so the endpoint can
  // read them server-side. Debounced PATCH fires automatically; we also
  // force-flush before generating.
  useEffect(() => {
    setVisualBriefField('compose', { referenceIds: picked, instruction });
  }, [picked, instruction, setVisualBriefField]);

  const togglePick = (assetId: string) => {
    setPicked((prev) => {
      if (prev.includes(assetId)) return prev.filter((id) => id !== assetId);
      if (prev.length >= MAX_PICKS) {
        // Replace the oldest pick when over the cap.
        return [...prev.slice(1), assetId];
      }
      return [...prev, assetId];
    });
  };

  const canGenerate =
    picked.length >= MIN_PICKS && picked.length <= MAX_PICKS && instruction.trim().length > 0;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setSubmitting(true);
    setError(null);
    try {
      // Force-flush the Visual Brief PATCH so the endpoint reads the
      // freshly-picked references + instruction.
      const flushResp = await fetch(`/api/studio/${deliverableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            visualBrief: { ...visualBrief, source: 'compose', compose: { referenceIds: picked, instruction } },
          },
        }),
      });
      // De source-persist IS de gate-garantie: faalt 'ie, dan zou generate met
      // een stale source 400'en met een misleidende melding. Surface 'm direct.
      if (!flushResp.ok) {
        throw new Error(t('trainedStyle.errSaveBrief', { status: flushResp.status }));
      }

      const result = await generateCanvasVisualCompose(deliverableId, target ? { target } : undefined);
      const mapped: CanvasImageVariant[] = result.variants.map((v, i) => ({
        index: i,
        url: v.url,
        prompt: v.prompt,
        isSelected: i === 0,
        componentId: v.id,
      }));
      setImageVariants(mapped);

      // G8 — show "Scoring…" badge immediately. The route fired
      // scoreImageFidelity in the background; refetch in 20s to pick up
      // persisted scores. Falls through naturally if the score takes
      // longer (next refetch interval / page interaction grabs it).
      const componentIds = result.variants
        .map((v) => v.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);
      if (componentIds.length > 0) {
        setVisualFidelityRunning(componentIds);
        setTimeout(() => {
          void queryClient.invalidateQueries({
            queryKey: canvasKeys.components(deliverableId),
          });
        }, 20_000);
      }

      const first = result.variants[0];
      if (first) {
        setHeroImage({ url: first.url, mediaAssetId: null });
        persistHeroImage(deliverableId, {
          imageUrl: first.url,
          imageSource: 'ai-generated',
          alt: null,
        }).catch((err) => {
          console.error('[Compose] hero image persist failed', err);
        });
      }
      onGenerated?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('compose.errGenerate');
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Compose instruction */}
      <div className="space-y-1.5">
        <label htmlFor="compose-instruction" className="block text-xs font-medium text-gray-700">
          {t('compose.instructionLabel')}
        </label>
        <textarea
          id="compose-instruction"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder={t('compose.instructionPlaceholder')}
          rows={2}
          maxLength={1000}
          disabled={submitting}
          className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-teal-400 disabled:opacity-50"
        />
        <p className="text-[11px] text-gray-500">
          {t('compose.instructionHint')}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t('compose.searchPlaceholder')}
          className="w-full pl-9 pr-9 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-400"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => setSearchInput('')}
            aria-label={t('compose.clearSearch')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Category chips + favorites */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setCategory(null)}
          className={
            category === null
              ? 'inline-flex items-center px-2 py-0.5 text-[11px] rounded-full bg-teal-50 text-teal-700 border border-teal-300'
              : 'inline-flex items-center px-2 py-0.5 text-[11px] rounded-full bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
          }
        >
          {t('compose.allCategories')}
        </button>
        {CATEGORY_CHIPS.map((cat) => {
          const active = category === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(active ? null : cat)}
              className={
                active
                  ? 'inline-flex items-center px-2 py-0.5 text-[11px] rounded-full bg-teal-50 text-teal-700 border border-teal-300'
                  : 'inline-flex items-center px-2 py-0.5 text-[11px] rounded-full bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
              }
            >
              {t(`compose.category.${cat}`)}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setFavoritesOnly((v) => !v)}
          className={
            favoritesOnly
              ? 'inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full bg-rose-50 text-rose-700 border border-rose-300'
              : 'inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
          }
          aria-pressed={favoritesOnly}
        >
          <Heart className={`h-3 w-3 ${favoritesOnly ? 'fill-current' : ''}`} />
          {t('compose.favorites')}
        </button>
      </div>

      {/* Result count */}
      {!isLoading && (
        <p className="text-[11px] text-gray-400">
          {total === 0
            ? t('compose.countNone')
            : total === 1
              ? t('compose.countOne')
              : `${t('compose.countMany', { total })}${assets.length < total ? t('compose.showingFirst', { shown: assets.length }) : ''}`}
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setCategory(null);
                setFavoritesOnly(false);
              }}
              className="ml-2 text-teal-700 hover:text-teal-800"
            >
              {t('compose.clearFilters')}
            </button>
          )}
          {isFetching && <span className="ml-2 text-gray-400">{t('compose.refreshing')}</span>}
        </p>
      )}

      {/* Empty / loading / grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('compose.loadingLibrary')}
        </div>
      ) : assets.length === 0 ? (
        <EmptyState hasFilters={hasFilters} search={debouncedSearch} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-80 overflow-y-auto pr-1">
          {assets.map((asset) => {
            const idx = picked.indexOf(asset.id);
            const isPicked = idx >= 0;
            return (
              <AssetTile
                key={asset.id}
                asset={asset}
                isPicked={isPicked}
                pickIndex={idx}
                onClick={() => togglePick(asset.id)}
              />
            );
          })}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-3 text-xs text-red-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          {picked.length === 0
            ? t('compose.pickPrompt', { min: MIN_PICKS, max: MAX_PICKS })
            : picked.length < MIN_PICKS
              ? t('compose.pickedAtLeast', { count: picked.length, min: MIN_PICKS })
              : t('compose.pickedSelected', { count: picked.length, max: MAX_PICKS })}
        </p>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              {t('actions.cancel')}
            </button>
          )}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate || submitting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-white text-xs font-medium bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t('compose.composing')}
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                {t('compose.generate')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssetTile({
  asset,
  isPicked,
  pickIndex,
  onClick,
}: {
  asset: MediaAssetWithMeta;
  isPicked: boolean;
  pickIndex: number;
  onClick: () => void;
}) {
  const thumbUrl = asset.thumbnailUrl ?? asset.fileUrl;
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative rounded-md overflow-hidden border-2 transition-all aspect-square bg-gray-50"
      style={{ borderColor: isPicked ? '#0d9488' : '#e5e7eb' }}
    >
      <img src={thumbUrl} alt={asset.name} className="w-full h-full object-cover" />
      {isPicked && (
        <div className="absolute top-1 right-1 rounded-full bg-teal-600 w-5 h-5 flex items-center justify-center text-white text-[10px] font-bold shadow">
          {pickIndex + 1}
        </div>
      )}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1">
        <p className="text-[10px] text-white truncate">{asset.name}</p>
      </div>
    </button>
  );
}

function EmptyState({ hasFilters, search }: { hasFilters: boolean; search: string }) {
  const { t } = useTranslation('campaigns-canvas');
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
      <div className="rounded-full bg-gray-100 p-3">
        <ImageIcon className="h-5 w-5 text-gray-400" />
      </div>
      <p className="text-sm text-gray-600 font-medium">{t('compose.emptyTitle')}</p>
      <p className="text-xs text-gray-500 max-w-xs">
        {hasFilters
          ? search
            ? t('compose.emptySearchFilters', { query: search })
            : t('compose.emptyFilters')
          : t('compose.emptyLibrary')}
      </p>
    </div>
  );
}
