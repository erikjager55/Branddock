'use client';

import React, { useState, useMemo } from 'react';
import { Plus, FolderOpen } from 'lucide-react';
import { Button, SearchInput, EmptyState, Skeleton } from '@/components/shared';
import { useMediaCollections } from '../../hooks/index';
import { useMediaLibraryStore } from '../../stores/useMediaLibraryStore';
import { CollectionCard } from './CollectionCard';

// ─── Skeleton ─────────────────────────────────────────────

function CollectionCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <Skeleton className="h-36 w-full rounded-none" />
      <div className="p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="rounded" width="60%" height={14} />
          <Skeleton className="rounded-full" width={52} height={18} />
        </div>
        <Skeleton className="rounded" width="80%" height={10} />
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────

/** Panel that displays all media collections with search and create. */
export function CollectionsPanel() {
  const { data: collections, isLoading } = useMediaCollections();
  const setCreateCollectionModalOpen = useMediaLibraryStore(
    (s) => s.setCreateCollectionModalOpen,
  );
  const setCollectionFilter = useMediaLibraryStore((s) => s.setCollectionFilter);
  const setActiveTab = useMediaLibraryStore((s) => s.setActiveTab);

  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    if (!collections) return [];
    if (!searchQuery.trim()) return collections;
    const q = searchQuery.toLowerCase();
    return collections.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q),
    );
  }, [collections, searchQuery]);

  const handleCardClick = (collectionId: string) => {
    setCollectionFilter(collectionId);
    setActiveTab('library');
  };

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="rounded-lg flex-1" height={38} />
          <Skeleton className="rounded-lg" width={140} height={38} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CollectionCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search collections..."
          className="flex-1"
        />
        <Button
          variant="primary"
          size="md"
          icon={Plus}
          onClick={() => setCreateCollectionModalOpen(true)}
        >
          New Collection
        </Button>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No collections found"
          description={
            searchQuery
              ? 'Try adjusting your search query.'
              : 'Create your first collection to organize your media assets.'
          }
          action={
            !searchQuery
              ? {
                  label: 'Create Collection',
                  onClick: () => setCreateCollectionModalOpen(true),
                }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              onClick={handleCardClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
