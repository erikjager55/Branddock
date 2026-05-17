'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Search, Loader2, AlertCircle, ExternalLink, Library, Image as ImageIcon } from 'lucide-react';
import { useImportStockPhoto } from '@/features/media-library/hooks';
import type { InsertImageTabProps } from './types';

/**
 * Pattern G3 image-quality-chain — Smart-search unified tab.
 *
 * Eén zoekbalk + één grid combinerend workspace library (pgvector semantic
 * search) + Pexels stock. Vervangt voor pre-launch de tab-separated UX
 * waar gebruiker tussen Library / Stock moest switchen vóór hij zocht.
 *
 * Per result:
 *  - source-badge (Library / Pexels)
 *  - similarity-percentage (alleen voor library, Pexels heeft geen score)
 *  - license-info attribution (Pexels: photographer link)
 *
 * Library-results: directe selection via MediaAsset.id (geen import).
 * Pexels-results: import-flow naar workspace library, dan selection.
 */

interface UnifiedSearchResult {
  id: string;
  source: 'library' | 'pexels';
  url: string;
  thumbnailUrl: string;
  alt: string | null;
  similarity: number | null;
  license: string;
  sourceId: string;
  attribution: { name: string; url: string } | null;
}

const SOURCE_LABEL: Record<UnifiedSearchResult['source'], string> = {
  library: 'Library',
  pexels: 'Pexels',
};

const SOURCE_ACCENT: Record<UnifiedSearchResult['source'], string> = {
  library: 'bg-emerald-600',
  pexels: 'bg-indigo-600',
};

export function SmartSearchTab({ onSelected, initialQuery }: InsertImageTabProps) {
  const [searchInput, setSearchInput] = useState(initialQuery ?? '');
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery ?? '');
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const importStockPhoto = useImportStockPhoto();

  // Debounce input zoals StockPhotosTab patroon
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  // Fetch results
  useEffect(() => {
    if (debouncedQuery.length < 3) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetch(
      `/api/media/unified-search?q=${encodeURIComponent(debouncedQuery)}&limit=12`,
    )
      .then((res) =>
        res.ok ? res.json() : { results: [], error: `Search failed (${res.status})` },
      )
      .then((data: { results?: UnifiedSearchResult[]; error?: string }) => {
        if (cancelled) return;
        setResults(Array.isArray(data.results) ? data.results : []);
        if (data.error) setError(data.error);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  async function handleResultClick(result: UnifiedSearchResult) {
    setError(null);
    // Library: direct selection, geen import
    if (result.source === 'library') {
      onSelected({
        url: result.url,
        mediaAssetId: result.sourceId,
        alt: result.alt ?? undefined,
      });
      return;
    }
    // Pexels: import-flow naar workspace library
    if (result.source === 'pexels') {
      setImportingId(result.id);
      try {
        const asset = await importStockPhoto.mutateAsync({
          photoUrl: result.url,
          photographer: result.attribution?.name ?? 'Unknown',
          photographerUrl: result.attribution?.url ?? '',
          pexelsUrl: result.attribution?.url ?? '',
          // Pexels-API geeft geen dimensions terug in unified-search result-shape v1;
          // import-route persisteert dan zonder width/height (geen kritisch veld).
          width: 0,
          height: 0,
          alt: result.alt ?? undefined,
        });
        onSelected({
          url: asset.fileUrl,
          mediaAssetId: asset.id,
          alt: result.alt ?? undefined,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Pexels import failed');
      } finally {
        setImportingId(null);
      }
    }
  }

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Zoek beelden in library + Pexels…"
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Results grid */}
      {debouncedQuery.length < 3 ? (
        <p className="text-xs text-gray-400 italic px-1">
          Tik 3+ karakters in om te zoeken. Library-resultaten verschijnen eerst
          (semantic match op aiDescription), daarna Pexels stock.
        </p>
      ) : loading ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <p className="text-xs text-gray-400 italic px-1">
          Geen resultaten gevonden voor &ldquo;{debouncedQuery}&rdquo;.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {results.map((r) => {
            const isImporting = importingId === r.id;
            const SourceIcon = r.source === 'library' ? Library : ImageIcon;
            return (
              <div key={r.id} className="relative group">
                <button
                  type="button"
                  onClick={() => handleResultClick(r)}
                  disabled={isImporting}
                  className="w-full aspect-square rounded-md overflow-hidden border-2 border-gray-200 hover:border-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  title={r.alt ?? r.license}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r.thumbnailUrl}
                    alt={r.alt ?? r.source}
                    className="w-full h-full object-cover"
                  />
                  {isImporting && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                </button>
                {/* Source badge top-left */}
                <span
                  className={`absolute top-1 left-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium text-white ${SOURCE_ACCENT[r.source]}`}
                >
                  <SourceIcon className="w-2.5 h-2.5" />
                  {SOURCE_LABEL[r.source]}
                </span>
                {/* Similarity (library only) top-right */}
                {r.similarity !== null && (
                  <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-white/90 text-emerald-700">
                    {Math.round(r.similarity * 100)}%
                  </span>
                )}
                {/* Attribution footer (Pexels) */}
                {r.attribution && (
                  <a
                    href={r.attribution.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-0 inset-x-0 bg-gray-900/75 text-white text-[9px] px-1.5 py-0.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title={`${r.license} — © ${r.attribution.name}`}
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                    {r.attribution.name}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
