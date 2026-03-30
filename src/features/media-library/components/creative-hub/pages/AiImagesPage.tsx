'use client';

import { PageShell, PageHeader } from '@/components/ui/layout';
import { AiImagesTab } from '../ai-images/AiImagesTab';

/** Standalone page wrapper for AI Images within the Media section. */
export function AiImagesPage() {
  return (
    <PageShell>
      <PageHeader moduleKey="ai-images" title="AI Images" subtitle="Generate and manage AI-created images for your brand" />
      <div className="px-8 pb-8">
        <AiImagesTab />
      </div>
    </PageShell>
  );
}
