'use client';

import { PageShell, PageHeader } from '@/components/ui/layout';
import { BrandModelsTab } from '../brand-models/BrandModelsTab';

/** Standalone page wrapper for Brand Models within the Media section. */
export function BrandModelsPage() {
  return (
    <PageShell>
      <PageHeader moduleKey="brand-models" title="Brand Models" subtitle="Manage consistent AI models trained on your brand" />
      <div className="px-8 pb-8">
        <BrandModelsTab />
      </div>
    </PageShell>
  );
}
