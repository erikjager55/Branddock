'use client';

import { PageShell, PageHeader } from '@/components/ui/layout';
import { AnimationStyleTab } from '../animation-style/AnimationStyleTab';

/** Standalone page wrapper for Animation Styles within the Media section. */
export function AnimationStylePage() {
  return (
    <PageShell>
      <PageHeader moduleKey="animation-styles" title="Animation" subtitle="Define your brand animation style guidelines" />
      <div className="px-8 pb-8">
        <AnimationStyleTab />
      </div>
    </PageShell>
  );
}
