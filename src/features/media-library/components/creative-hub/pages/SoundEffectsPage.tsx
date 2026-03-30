'use client';

import { PageShell, PageHeader } from '@/components/ui/layout';
import { SoundEffectsTab } from '../sound-effects/SoundEffectsTab';

/** Standalone page wrapper for Sound Effects within the Media section. */
export function SoundEffectsPage() {
  return (
    <PageShell>
      <PageHeader moduleKey="sound-effects" title="Sound Effects" subtitle="Manage sound effects and audio assets for your brand" />
      <div className="px-8 pb-8">
        <SoundEffectsTab />
      </div>
    </PageShell>
  );
}
