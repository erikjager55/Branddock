'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, Check, X, Image as ImageIcon, Heart } from 'lucide-react';
import { useMediaAssets } from '@/features/media-library/hooks';
import { selectCanvasVisualFromLibrary } from '../../api/canvas.api';
import { useCanvasStore } from '../../stores/useCanvasStore';
import type { MediaAssetWithMeta, MediaCategory } from '@/features/media-library/types/media.types';
import type { CanvasImageVariant } from '../../types/canvas.types';
import { setHeroImage as persistHeroImage } from '../../api/canvas.api';
import type { InsertImageSelection } from './insert-image/types';

// Image-relevant subset of MediaCategory — surfaces the categories users
// actually pick from in a Canvas visual context. A "More" expand button
// could open the full 25-item enum if needed; for now the curated 8 cover
// the typical use cases (hero / lifestyle / product / team / etc.).
const CATEGORY_CHIPS: Array<{ value: MediaCategory; label: string }> = [
  { value: 'HERO_IMAGE', label: 'Hero' },
  { value: 'LIFESTYLE', label: 'Lifestyle' },
  { value: 'PRODUCT_PHOTO', label: 'Product' },
  { value: 'TEAM_PHOTO', label: 'Team' },
  { value: 'EVENT_PHOTO', label: 'Event' },
  { value: 'PHOTOGRAPHY', label: 'Photography' },
  { value: 'ILLUSTRATION', label: 'Illustration' },
  { value: 'INFOGRAPHIC', label: 'Infographic' },
];

interface LibraryAssetPickerProps {
  deliverableId: string;
  onCancel?: () => void;
  /** Called after a successful pick — used by Step 2 to dismiss the picker. */
  onPicked?: () => void;
  /**
   * LP/web-page-flow: surface de eerst-gekozen asset zodat de host hem in
   * puckData/structuredVariant.hero kan vouwen (mirror van upload/url/stock via
   * handleImageSelected). Zonder dit landde een library-pick alleen in de
   * hero-image-DeliverableComponent + store, die de Puck-renderer NIET leest →
   * beeld verscheen niet in de LP. Wanneer gezet, persisteert de host de
   * hero-image zelf (geen dubbele persistHeroImage hier).
   */
  onHeroSelected?: (selection: InsertImageSelection) => void | Promise<void>;
}

const MAX_PICKS = 3;

/**
 * Inline picker for selecting 1-3 existing MediaAssets as the
 * deliverable's image variants. Wired to Visual Brief source = 'library'
 * — replaces the AI generation flow with a curated selection from the
 * workspace media library.
 *
 * Filters scoped to mediaType = IMAGE (videos / audio aren't image
 * variants); user can narrow further via the search input. Selection
 * order is preserved — the first picked asset becomes the default
 * (and gets promoted to hero image, mirroring the generate flow).
 */
export function LibraryAssetPicker({ deliverableId, onCancel, onPicked, onHeroSelected }: LibraryAssetPickerProps) {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState<MediaCategory | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Assets waarvan het bestand 404't (orphan DB-record — bv. lokaal
  // weggeschreven in een inmiddels-verwijderde worktree, of een ontbrekend
  // R2-object in productie). Die tiles tonen "Bestand ontbreekt" en mogen
  // niet selecteerbaar zijn — anders landt een kapotte URL in de deliverable.
  const [brokenIds, setBrokenIds] = useState<Set<string>>(() => new Set());

  const setImageVariants = useCanvasStore((s) => s.setImageVariants);
  const setHeroImage = useCanvasStore((s) => s.setHeroImage);

  // 300ms debounce so the user can type freely without firing a request
  // per keystroke. Felt-instant for fast typists, no request storm for
  // the backend.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Always image-type — videos / audio aren't valid image variants.
  // Cap at 60 results in the picker; if user needs more they should
  // narrow via search/category.
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

  // Een asset met ontbrekend bestand kan nooit een geldige variant zijn.
  const markBroken = (assetId: string) => {
    setBrokenIds((prev) => {
      if (prev.has(assetId)) return prev;
      const next = new Set(prev);
      next.add(assetId);
      return next;
    });
    setPicked((prev) => (prev.includes(assetId) ? prev.filter((id) => id !== assetId) : prev));
  };

  const togglePick = (assetId: string) => {
    if (brokenIds.has(assetId)) return;
    setPicked((prev) => {
      if (prev.includes(assetId)) {
        return prev.filter((id) => id !== assetId);
      }
      if (prev.length >= MAX_PICKS) {
        // Replace the oldest pick when over the cap — keeps selection
        // stable without needing a "max reached" toast.
        return [...prev.slice(1), assetId];
      }
      return [...prev, assetId];
    });
  };

  const handleConfirm = async () => {
    if (picked.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await selectCanvasVisualFromLibrary(deliverableId, picked);
      const mapped: CanvasImageVariant[] = result.variants.map((v, i) => ({
        index: i,
        url: v.url,
        prompt: v.prompt,
        isSelected: i === 0,
      }));
      setImageVariants(mapped);
      // Auto-promote the first pick to hero image so Step 3 (Medium)
      // shows it immediately — same pattern as the generate flow.
      const firstAsset = assets.find((a) => a.id === picked[0]);
      if (firstAsset) {
        setHeroImage({
          url: firstAsset.fileUrl,
          mediaAssetId: firstAsset.id,
          alt: firstAsset.name,
        });
        if (onHeroSelected) {
          // LP/web-page-flow: de host vouwt de URL in puckData/structuredVariant.hero
          // (via handleImageSelected) zodat de Puck-renderer 'm toont, én persisteert
          // de hero-image zelf — geen dubbele persistHeroImage.
          await onHeroSelected({
            url: firstAsset.fileUrl,
            mediaAssetId: firstAsset.id,
            alt: firstAsset.aiDescription ?? firstAsset.name ?? undefined,
          });
        } else {
          // Niet-LP context (hero-image-component): persist zoals voorheen.
          persistHeroImage(deliverableId, {
            imageUrl: firstAsset.fileUrl,
            imageSource: 'library',
            mediaAssetId: firstAsset.id,
            alt: firstAsset.aiDescription ?? firstAsset.name ?? null,
          }).catch((err) => {
            console.error('[Library] hero image persist failed', err);
          });
        }
      }
      onPicked?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to select assets';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Search with clear-X */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name, tag, AI description..."
          className="w-full pl-9 pr-9 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-400"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => setSearchInput('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Category chips + favorites toggle */}
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
          All categories
        </button>
        {CATEGORY_CHIPS.map((chip) => {
          const active = category === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => setCategory(active ? null : chip.value)}
              className={
                active
                  ? 'inline-flex items-center px-2 py-0.5 text-[11px] rounded-full bg-teal-50 text-teal-700 border border-teal-300'
                  : 'inline-flex items-center px-2 py-0.5 text-[11px] rounded-full bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
              }
            >
              {chip.label}
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
          Favorites
        </button>
      </div>

      {/* Result count */}
      {!isLoading && (
        <p className="text-[11px] text-gray-400">
          {total === 0
            ? 'No matches'
            : total === 1
              ? '1 image'
              : `${total} images${assets.length < total ? ` — showing first ${assets.length}` : ''}`}
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
              Clear filters
            </button>
          )}
          {isFetching && <span className="ml-2 text-gray-400">refreshing…</span>}
        </p>
      )}

      {/* Empty / loading / grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading library...
        </div>
      ) : assets.length === 0 ? (
        <EmptyState hasFilters={hasFilters} search={debouncedSearch} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-96 overflow-y-auto pr-1">
          {assets.map((asset) => {
            const idx = picked.indexOf(asset.id);
            const isPicked = idx >= 0;
            return (
              <AssetTile
                key={asset.id}
                asset={asset}
                isPicked={isPicked}
                pickIndex={idx}
                isBroken={brokenIds.has(asset.id)}
                onBroken={markBroken}
                onClick={() => togglePick(asset.id)}
              />
            );
          })}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-3 text-xs text-red-800">
          <X className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          {picked.length === 0
            ? `Pick up to ${MAX_PICKS} images`
            : `${picked.length} of ${MAX_PICKS} selected`}
        </p>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={picked.length === 0 || submitting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-white text-xs font-medium bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                Use {picked.length || ''} selected
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
  isBroken,
  onBroken,
  onClick,
}: {
  asset: MediaAssetWithMeta;
  isPicked: boolean;
  pickIndex: number;
  isBroken: boolean;
  onBroken: (assetId: string) => void;
  onClick: () => void;
}) {
  const thumbUrl = asset.thumbnailUrl ?? asset.fileUrl;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isBroken}
      aria-disabled={isBroken}
      title={isBroken ? 'File missing — not selectable' : undefined}
      className={`relative rounded-md overflow-hidden border-2 transition-all aspect-square bg-gray-50 ${isBroken ? 'cursor-not-allowed' : ''}`}
      style={{ borderColor: isPicked ? '#0d9488' : '#e5e7eb' }}
    >
      <img
        src={thumbUrl}
        alt={asset.name}
        className="w-full h-full object-cover"
        onError={(e) => {
          // Asset file ontbreekt op disk (orphan DB-record). Toon placeholder
          // i.p.v. broken-image icon én meld het aan de parent zodat de tile
          // niet-selecteerbaar wordt — voorkomt dat een kapotte URL in de
          // deliverable landt. Graceful degradation voor élk merk.
          onBroken(asset.id);
          const img = e.currentTarget;
          img.style.display = 'none';
          const parent = img.parentElement;
          if (parent && !parent.querySelector('.lp-img-fallback')) {
            const fb = document.createElement('div');
            fb.className = 'lp-img-fallback flex items-center justify-center w-full h-full bg-gray-100 text-gray-400 text-xs px-2 text-center';
            fb.textContent = 'File missing';
            parent.appendChild(fb);
          }
        }}
      />
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
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
      <div className="rounded-full bg-gray-100 p-3">
        <ImageIcon className="h-5 w-5 text-gray-400" />
      </div>
      <p className="text-sm text-gray-600 font-medium">No images found</p>
      <p className="text-xs text-gray-500 max-w-xs">
        {hasFilters
          ? search
            ? `No assets match "${search}" with the current filters. Try widening the search or clear filters.`
            : 'No assets match the current filters. Try clearing them.'
          : 'Your media library is empty. Upload images via the Media Library section, then return here to pick them.'}
      </p>
    </div>
  );
}
