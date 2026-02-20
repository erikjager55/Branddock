'use client';

import { AlertTriangle, BookOpen, Upload } from 'lucide-react';
import { Button } from '@/components/shared';
import { PageShell, PageHeader } from '@/components/ui/layout';
import { useKnowledgeLibraryStore } from '@/stores/useKnowledgeLibraryStore';
import { useFeaturedResources, useResources, useToggleFavorite, useToggleArchive, useDeleteResource } from '../hooks';
import { FeaturedResourcesCarousel } from './FeaturedResourcesCarousel';
import { ResourceSearchFilter } from './ResourceSearchFilter';
import { ResourceCardGrid } from './ResourceCardGrid';
import { ResourceCardList } from './ResourceCardList';
import { AddResourceModal } from './add/AddResourceModal';

interface KnowledgeLibraryPageProps {
  onNavigate?: (route: string) => void;
}

export function KnowledgeLibraryPage({ onNavigate }: KnowledgeLibraryPageProps) {
  const store = useKnowledgeLibraryStore();

  const { data: featuredData } = useFeaturedResources();
  const { data: resourcesData, isLoading, isError } = useResources({
    search: store.searchQuery || undefined,
    type: store.typeFilter || undefined,
    category: store.categoryFilter || undefined,
  });

  const toggleFavorite = useToggleFavorite();
  const toggleArchive = useToggleArchive();
  const deleteRes = useDeleteResource();

  const resources = resourcesData?.resources ?? [];
  const featured = featuredData?.resources ?? [];

  const handleFavorite = (id: string) => {
    toggleFavorite.mutate(id);
  };

  const handleArchive = (id: string) => {
    toggleArchive.mutate(id);
  };

  const handleDelete = (id: string) => {
    deleteRes.mutate(id);
  };

  return (
    <PageShell>
      <div data-testid="knowledge-library-page">
      <PageHeader
        moduleKey="knowledge"
        title="Knowledge Library"
        subtitle="Your research and knowledge base"
        actions={
          <Button onClick={() => store.setAddModalOpen(true)} className="gap-2" data-testid="add-resource-button">
            <Upload className="h-4 w-4" />
            Upload
          </Button>
        }
      />

      <div className="space-y-6">
      {/* Featured Carousel */}
      {featured.length > 0 && (
        <FeaturedResourcesCarousel resources={featured} />
      )}

      {/* Search & Filter */}
      <ResourceSearchFilter />

      {/* Resource Grid / List */}
      {isError ? (
        <div data-testid="error-message" className="text-center py-16">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-foreground mb-1">Something went wrong</h3>
          <p className="text-xs text-muted-foreground">
            Failed to load resources. Please try again later.
          </p>
        </div>
      ) : isLoading ? (
        <div data-testid="skeleton-loader" className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : resources.length === 0 ? (
        <div data-testid="empty-state" className="text-center py-16">
          <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-foreground mb-1">No resources found</h3>
          <p className="text-xs text-muted-foreground">
            Try adjusting your filters or add a new resource.
          </p>
        </div>
      ) : store.viewMode === 'grid' ? (
        <ResourceCardGrid
          resources={resources}
          onFavorite={handleFavorite}
          onArchive={handleArchive}
          onDelete={handleDelete}
        />
      ) : (
        <ResourceCardList
          resources={resources}
          onFavorite={handleFavorite}
          onArchive={handleArchive}
          onDelete={handleDelete}
        />
      )}

      {/* Add Resource Modal */}
      <AddResourceModal />
      </div>
      </div>
    </PageShell>
  );
}
