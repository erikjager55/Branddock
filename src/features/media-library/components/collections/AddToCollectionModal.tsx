'use client';

import React, { useState } from 'react';
import { FolderOpen, Check, Plus } from 'lucide-react';
import { Modal, Button, SearchInput, EmptyState, Skeleton } from '@/components/shared';
import { useMediaCollections, useAddAssetToCollection } from '../../hooks/index';
import { useMediaLibraryStore } from '../../stores/useMediaLibraryStore';

// ─── Component ────────────────────────────────────────────

/** Modal for adding an asset to one or more existing collections. */
export function AddToCollectionModal() {
  const isOpen = useMediaLibraryStore((s) => s.isAddToCollectionModalOpen);
  const assetId = useMediaLibraryStore((s) => s.addToCollectionAssetId);
  const closeModal = useMediaLibraryStore((s) => s.closeAddToCollection);
  const openCreate = useMediaLibraryStore((s) => s.setCreateCollectionModalOpen);

  const { data: collections, isLoading } = useMediaCollections();
  const addAsset = useAddAssetToCollection();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const handleClose = () => {
    closeModal();
    setSelectedIds(new Set());
    setSearchQuery('');
  };

  const toggleCollection = (collectionId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(collectionId)) {
        next.delete(collectionId);
      } else {
        next.add(collectionId);
      }
      return next;
    });
  };

  const handleAddToSelected = () => {
    if (!assetId || selectedIds.size === 0) return;

    const promises = Array.from(selectedIds).map((collectionId) =>
      addAsset.mutateAsync({ collectionId, assetId }),
    );

    Promise.all(promises).then(() => {
      handleClose();
    });
  };

  const filtered = React.useMemo(() => {
    if (!collections) return [];
    if (!searchQuery.trim()) return collections;
    const q = searchQuery.toLowerCase();
    return collections.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q),
    );
  }, [collections, searchQuery]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add to Collection"
      subtitle="Select one or more collections for this asset."
      size="sm"
      footer={
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            icon={Plus}
            onClick={() => {
              openCreate(true);
            }}
          >
            New Collection
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="md" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={Check}
              onClick={handleAddToSelected}
              disabled={selectedIds.size === 0 || addAsset.isPending}
              isLoading={addAsset.isPending}
            >
              Add to Selected ({selectedIds.size})
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        {/* Search */}
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search collections..."
        />

        {/* Collection list */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="rounded" width={20} height={20} />
                <div className="flex-1 space-y-1">
                  <Skeleton className="rounded" width="60%" height={14} />
                  <Skeleton className="rounded" width="40%" height={10} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No collections"
            description={
              searchQuery
                ? 'No collections match your search.'
                : 'Create a collection first to organize assets.'
            }
          />
        ) : (
          <div className="max-h-72 overflow-y-auto -mx-1 px-1">
            {filtered.map((collection) => {
              const isSelected = selectedIds.has(collection.id);

              return (
                <button
                  key={collection.id}
                  type="button"
                  onClick={() => toggleCollection(collection.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                    isSelected
                      ? 'bg-primary/5 border border-primary/20'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  {/* Checkbox */}
                  <div
                    className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-primary border-primary'
                        : 'border-gray-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>

                  {/* Color dot + info */}
                  <div
                    className="flex-shrink-0 w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: collection.color ?? '#6B7280',
                    }}
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {collection.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {collection._count.assets} asset{collection._count.assets !== 1 ? 's' : ''}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
