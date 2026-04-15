'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, AlertCircle, Download, User, ImageIcon, Settings } from 'lucide-react';
import { useStockSearch, useImportStockPhoto } from '../../hooks';
import { StockSearchError } from '../../api/media.api';
import type { StockPhotoResult, ImportStockBody } from '../../types/media.types';

type StockSize = 'small' | 'medium' | 'large' | 'original';

const SIZE_OPTIONS: { value: StockSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'original', label: 'Original' },
];

/**
 * Stock photo search interface using Pexels.
 * Search with debounce, grid results, size selection, and import.
 */
export function StockPhotoTab() {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedPhoto, setSelectedPhoto] = useState<StockPhotoResult | null>(null);
  const [selectedSize, setSelectedSize] = useState<StockSize>('medium');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const importStockPhoto = useImportStockPhoto();

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
      setPage(1);
      setSelectedPhoto(null);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchInput]);

  const {
    data: searchResults,
    isLoading,
    isError,
    error: searchError,
  } = useStockSearch(debouncedQuery, page, debouncedQuery.length > 0);

  // Service unavailable (PEXELS_API_KEY missing) → show config-aware empty state.
  const isServiceUnconfigured =
    searchError instanceof StockSearchError && searchError.status === 503;

  const photos = searchResults?.photos ?? [];
  const totalResults = searchResults?.total_results ?? 0;
  const hasNextPage = !!searchResults?.next_page;

  const getSrcForSize = useCallback(
    (photo: StockPhotoResult, size: StockSize): string => {
      switch (size) {
        case 'small':
          return photo.src.small;
        case 'medium':
          return photo.src.medium;
        case 'large':
          return photo.src.large;
        case 'original':
          return photo.src.original;
        default:
          return photo.src.medium;
      }
    },
    []
  );

  const handleImport = useCallback(() => {
    if (!selectedPhoto) return;

    const body: ImportStockBody = {
      photoUrl: getSrcForSize(selectedPhoto, selectedSize),
      photographer: selectedPhoto.photographer,
      photographerUrl: selectedPhoto.photographer_url,
      pexelsUrl: selectedPhoto.url,
      width: selectedPhoto.width,
      height: selectedPhoto.height,
      alt: selectedPhoto.alt || undefined,
    };

    importStockPhoto.mutate(body, {
      onSuccess: () => {
        setSelectedPhoto(null);
      },
    });
  }, [selectedPhoto, selectedSize, getSrcForSize, importStockPhoto]);

  const handlePhotoClick = useCallback(
    (photo: StockPhotoResult) => {
      if (selectedPhoto?.id === photo.id) {
        setSelectedPhoto(null);
      } else {
        setSelectedPhoto(photo);
        setSelectedSize('medium');
      }
    },
    [selectedPhoto]
  );

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search Pexels stock photos..."
          className="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-colors"
        />
      </div>

      {/* Empty state - no query */}
      {!debouncedQuery && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ImageIcon className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            Search for free stock photos from Pexels
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Enter a search term above to get started
          </p>
        </div>
      )}

      {/* Loading state */}
      {debouncedQuery && isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
          <span className="ml-2 text-sm text-gray-500">Searching...</span>
        </div>
      )}

      {/* Service not configured (503) — gentle config hint */}
      {isError && isServiceUnconfigured && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
            <Settings className="h-6 w-6 text-amber-600" />
          </div>
          <p className="mt-3 text-sm font-medium text-gray-900">
            Stock photo service is not configured
          </p>
          <p className="mt-1 max-w-sm text-xs text-gray-500">
            Add a <code className="rounded bg-gray-100 px-1 py-0.5 text-[11px] font-mono text-gray-700">PEXELS_API_KEY</code>{' '}
            to your environment variables to enable Pexels stock photo search.
            Get a free key at{' '}
            <a
              href="https://www.pexels.com/api/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 hover:underline"
            >
              pexels.com/api
            </a>
            .
          </p>
        </div>
      )}

      {/* Generic error state (timeout / 500 / network) */}
      {isError && !isServiceUnconfigured && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
          <p className="text-sm text-red-700">
            {searchError instanceof Error
              ? searchError.message
              : 'Failed to search stock photos. Please try again.'}
          </p>
        </div>
      )}

      {/* Results */}
      {debouncedQuery && !isLoading && !isError && (
        <>
          {photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ImageIcon className="h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">
                No photos found for "{debouncedQuery}"
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Try a different search term
              </p>
            </div>
          ) : (
            <>
              {/* Results count */}
              <p className="text-xs text-gray-500">
                {totalResults.toLocaleString()} results
              </p>

              {/* Photo grid — rows of 3 with inline import panel after selected row */}
              <div className="space-y-2">
                {Array.from({ length: Math.ceil(photos.length / 3) }, (_, rowIdx) => {
                  const rowPhotos = photos.slice(rowIdx * 3, rowIdx * 3 + 3);
                  const selectedInRow = rowPhotos.find((p) => selectedPhoto?.id === p.id);
                  return (
                    <div key={rowIdx} className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        {rowPhotos.map((photo) => {
                          const isSelected = selectedPhoto?.id === photo.id;
                          return (
                            <button
                              key={photo.id}
                              type="button"
                              onClick={() => handlePhotoClick(photo)}
                              className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                                isSelected
                                  ? 'border-teal-500 ring-2 ring-teal-500/30'
                                  : 'border-transparent hover:border-gray-300'
                              }`}
                            >
                              <img
                                src={photo.src.medium}
                                alt={photo.alt || `Photo by ${photo.photographer}`}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <p className="flex items-center gap-1 text-xs text-white truncate">
                                  <User className="h-3 w-3 flex-shrink-0" />
                                  {photo.photographer}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Import panel — full width, directly below the row containing the selected photo */}
                      {selectedInRow && (
                        <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-3 space-y-2.5">
                          <div className="flex items-center gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {selectedInRow.alt || 'Untitled'}
                              </p>
                              <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {selectedInRow.photographer}
                                </span>
                                <span>{selectedInRow.width} x {selectedInRow.height}px</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-700">Size:</span>
                            {SIZE_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setSelectedSize(option.value)}
                                className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors border"
                                style={
                                  selectedSize === option.value
                                    ? { backgroundColor: '#0d9488', color: '#fff', borderColor: '#0d9488' }
                                    : { backgroundColor: '#fff', color: '#374151', borderColor: '#d1d5db' }
                                }
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={handleImport}
                            disabled={importStockPhoto.isPending}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            style={{ backgroundColor: '#0d9488' }}
                          >
                            {importStockPhoto.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Importing...
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4" />
                                Import Photo
                              </>
                            )}
                          </button>

                          {importStockPhoto.isError && (
                            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2" role="alert">
                              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-500" />
                              <p className="text-xs text-red-700">
                                {importStockPhoto.error instanceof Error
                                  ? importStockPhoto.error.message
                                  : 'Failed to import photo. Please try again.'}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-xs text-gray-500">Page {page}</span>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasNextPage}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* Pexels attribution */}
      {debouncedQuery && (
        <p className="text-center text-xs text-gray-400">
          Photos provided by{' '}
          <a
            href="https://www.pexels.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 hover:underline"
          >
            Pexels
          </a>
        </p>
      )}
    </div>
  );
}

export default StockPhotoTab;
