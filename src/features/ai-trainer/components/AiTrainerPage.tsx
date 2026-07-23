'use client';

import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageShell, PageHeader } from '@/components/ui/layout';
import { Button } from '@/components/shared';
import { ConsistentModelsContent } from '@/features/consistent-models/components/ConsistentModelsPage';
import { useConsistentModelStore } from '@/features/consistent-models/stores/useConsistentModelStore';

interface AiTrainerPageProps {
  onNavigateToModelDetail: (id: string, status?: string) => void;
}

/** Stijlstudio page — capture brand styles from reference images */
export function AiTrainerPage({ onNavigateToModelDetail }: AiTrainerPageProps) {
  const { t } = useTranslation('consistent-models');
  const { openCreateModal } = useConsistentModelStore();

  return (
    <PageShell>
      <PageHeader
        moduleKey="ai-trainer"
        title={t('page.title')}
        subtitle={t('page.subtitle')}
        actions={
          <Button onClick={() => openCreateModal()} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('page.createModel')}
          </Button>
        }
      />

      <div className="space-y-6 px-8 pb-8">
        <ConsistentModelsContent onNavigateToDetail={onNavigateToModelDetail} />
      </div>
    </PageShell>
  );
}
