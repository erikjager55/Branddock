'use client';

import { PageShell, PageHeader } from '@/components/ui/layout';
import { AiVideosTab } from '../ai-videos/AiVideosTab';

/** Standalone page wrapper for AI Videos within the Media section. */
export function AiVideosPage() {
  return (
    <PageShell>
      <PageHeader moduleKey="ai-videos" title="AI Videos" subtitle="Generate and manage AI-created videos for your brand" />
      <div className="px-8 pb-8">
        <AiVideosTab />
      </div>
    </PageShell>
  );
}
