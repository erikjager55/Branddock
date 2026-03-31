'use client';

import { Plus } from 'lucide-react';
import { PageShell, PageHeader } from '@/components/ui/layout';
import { Button } from '@/components/shared';
import { ConsistentModelsContent } from '@/features/consistent-models/components/ConsistentModelsPage';
import { useConsistentModelStore } from '@/features/consistent-models/stores/useConsistentModelStore';

interface AiTrainerPageProps {
  onNavigateToModelDetail: (id: string) => void;
}

/** AI Trainer page — train models and define brand styles */
export function AiTrainerPage({ onNavigateToModelDetail }: AiTrainerPageProps) {
  const { openCreateModal } = useConsistentModelStore();

  return (
    <PageShell>
      <PageHeader
        moduleKey="ai-trainer"
        title="AI Trainer"
        subtitle="Train models and define brand styles"
        actions={
          <Button onClick={() => openCreateModal()} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Model
          </Button>
        }
      />

      <div className="space-y-6 px-8 pb-8">
        <ConsistentModelsContent onNavigateToDetail={onNavigateToModelDetail} />
      </div>
    </PageShell>
  );
}
