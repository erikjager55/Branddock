'use client';

import { Upload, AlertTriangle, Image } from 'lucide-react';
import { Button } from '@/components/shared';
import { PageShell, PageHeader } from '@/components/ui/layout';
import { useMediaLibraryStore } from '../stores/useMediaLibraryStore';
import {
  useMediaAssets,
  useFeaturedMedia,
  useMediaStats,
  useToggleFavorite,
  useDeleteMediaAsset,
} from '../hooks/index';
import type { MediaListParams } from '../types/media.types';
import { MediaStatsCards } from './MediaStatsCards';
import { FeaturedMediaCarousel } from './FeaturedMediaCarousel';
import { MediaSearchFilter } from './MediaSearchFilter';
import { MediaCardGrid } from './MediaCardGrid';
import { MediaCardList } from './MediaCardList';
import { MediaDetailPanel } from './MediaDetailPanel';
import { UploadModal } from './upload/UploadModal';
import { CollectionsPanel } from './collections/CollectionsPanel';
import { CreateCollectionModal } from './collections/CreateCollectionModal';
import { AddToCollectionModal } from './collections/AddToCollectionModal';
import { TagFilterPills } from './tags/TagFilterPills';
import { TagManagerModal } from './tags/TagManagerModal';
const TABS = [
  { key: 'library', label: 'Library' },
  { key: 'collections', label: 'Collections' },
  { key: 'tags', label: 'Tags' },
] as const;

/** Main orchestrator component for the Media Library feature. */
export function MediaLibraryPage() {
  const store = useMediaLibraryStore();

  const filterParams: MediaListParams = {
    search: store.searchQuery || undefined,
    mediaType: store.mediaTypeFilter || undefined,
    category: store.categoryFilter || undefined,
    source: store.sourceFilter || undefined,
    tagId: store.tagFilter || undefined,
    collectionId: store.collectionFilter || undefined,
    isFavorite: store.isFavoriteFilter ?? undefined,
    sortBy: store.sortBy as MediaListParams['sortBy'],
    sortOrder: store.sortOrder,
    page: store.page,
    limit: store.limit,
  };

  const { data: assetsData, isLoading, isError } = useMediaAssets(filterParams);
  const { data: featuredData } = useFeaturedMedia();
  const { data: statsData } = useMediaStats();

  const toggleFavorite = useToggleFavorite();
  const deleteAsset = useDeleteMediaAsset();

  const assets = assetsData?.assets ?? [];
  const featured = featuredData ?? [];

  const handleFavorite = (id: string) => {
    toggleFavorite.mutate(id);
  };

  const handleDelete = (id: string) => {
    deleteAsset.mutate(id);
  };

  return (
    <PageShell>
      <div data-testid="media-library-page">
        <PageHeader
          moduleKey="media-library"
          title="Media Library"
          subtitle="Your central media asset hub"
          actions={
            <Button
              onClick={() => store.setUploadModalOpen(true)}
              className="gap-2"
              data-testid="upload-media-button"
            >
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          }
        />

        {/* Tab Bar */}
        <div className="px-8 pt-4 pb-2">
          <div className="flex gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => store.setActiveTab(tab.key)}
                className={`
                  rounded-full px-4 py-1.5 text-sm font-medium transition-colors
                  ${store.activeTab === tab.key
                    ? 'text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
                style={store.activeTab === tab.key ? { backgroundColor: '#0D9488' } : undefined}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6 px-8 pb-8">
          {store.activeTab === 'library' ? (
            <>
              {/* Stats Cards */}
              {statsData && (
                <MediaStatsCards
                  stats={{
                    totalAssets: statsData.total,
                    totalImages: statsData.images,
                    totalVideos: statsData.videos,
                    totalDocuments: statsData.documents,
                    totalAudio: statsData.audio,
                  }}
                />
              )}

              {/* Featured Carousel */}
              {featured.length > 0 && (
                <FeaturedMediaCarousel assets={featured} />
              )}

              {/* Search & Filter */}
              <MediaSearchFilter />

              {/* Asset Grid / List */}
              {isError ? (
                <div data-testid="error-message" className="text-center py-16">
                  <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
                  <h3 className="text-sm font-medium text-foreground mb-1">
                    Something went wrong
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Failed to load media assets. Please try again later.
                  </p>
                </div>
              ) : isLoading ? (
                <div data-testid="skeleton-loader" className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-64 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : assets.length === 0 ? (
                <div data-testid="empty-state" className="text-center py-16">
                  <Image className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <h3 className="text-sm font-medium text-foreground mb-1">
                    No media assets found
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Try adjusting your filters or upload a new asset.
                  </p>
                </div>
              ) : store.viewMode === 'grid' ? (
                <MediaCardGrid
                  assets={assets}
                  onSelect={(id) => store.setSelectedAssetId(id)}
                  onFavorite={handleFavorite}
                  onDelete={handleDelete}
                />
              ) : (
                <MediaCardList
                  assets={assets}
                  onSelect={(id) => store.setSelectedAssetId(id)}
                  onFavorite={handleFavorite}
                  onDelete={handleDelete}
                />
              )}

              {/* Detail Panel (slide-out) */}
              {store.selectedAssetId && (
                <MediaDetailPanel
                  assetId={store.selectedAssetId}
                  onClose={() => store.setSelectedAssetId(null)}
                  onFavorite={handleFavorite}
                  onDelete={handleDelete}
                />
              )}
            </>
          ) : store.activeTab === 'collections' ? (
            <div data-testid="collections-tab">
              <CollectionsPanel />
              <CreateCollectionModal />
              <AddToCollectionModal />
            </div>
          ) : store.activeTab === 'tags' ? (
            <div data-testid="tags-tab" className="space-y-6">
              <TagFilterPills />
              <TagManagerModal />
            </div>
          ) : null}
        </div>

        {/* Upload Modal */}
        {store.isUploadModalOpen && <UploadModal />}
      </div>
    </PageShell>
  );
}
