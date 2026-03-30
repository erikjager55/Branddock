'use client';

import { PageShell, PageHeader } from '@/components/ui/layout';
import { BrandVoiceTab } from '../brand-voice/BrandVoiceTab';

/** Standalone page wrapper for Brand Voices within the Media section. */
export function BrandVoicePage() {
  return (
    <PageShell>
      <PageHeader moduleKey="brand-voices" title="Brand Voices" subtitle="Define and manage your brand voice profiles" />
      <div className="px-8 pb-8">
        <BrandVoiceTab />
      </div>
    </PageShell>
  );
}
