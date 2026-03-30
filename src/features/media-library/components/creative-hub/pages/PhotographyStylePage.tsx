'use client';

import { PageShell, PageHeader } from '@/components/ui/layout';
import { PhotographyStyleTab } from '../photography-style/PhotographyStyleTab';

/** Standalone page wrapper for Photography Styles within the Media section. */
export function PhotographyStylePage() {
  return (
    <PageShell>
      <PageHeader moduleKey="photography-styles" title="Photography" subtitle="Define your brand photography style guidelines" />
      <div className="px-8 pb-8">
        <PhotographyStyleTab />
      </div>
    </PageShell>
  );
}
