'use client';

import { PageShell, PageHeader } from '@/components/ui/layout';
import { HelpHeader } from './HelpHeader';
import { HelpSearchInput } from './HelpSearchInput';
import { QuickTags } from './QuickTags';
import { QuickActionCards } from './QuickActionCards';
import { BrowseByTopic } from './BrowseByTopic';
import { VideoTutorials } from './VideoTutorials';
import { FaqAccordion } from './FaqAccordion';
import { ContactSupport } from './ContactSupport';
import { SystemStatus } from './SystemStatus';
import { FeatureRequests } from './FeatureRequests';
import { PlatformRating } from './PlatformRating';
import { ResourceLinks } from './ResourceLinks';

export function HelpPage() {
  return (
    <PageShell maxWidth="5xl">
      <PageHeader
        moduleKey="help"
        title="Help & Support"
        subtitle="Find answers, tutorials, and get in touch"
      />
      <div className="space-y-10">
        <HelpHeader />
        <HelpSearchInput />
        <QuickTags />
        <QuickActionCards />
        <BrowseByTopic />
        <VideoTutorials />
        <FaqAccordion />
        <ContactSupport />
        <SystemStatus />
        <FeatureRequests />
        <PlatformRating />
        <ResourceLinks />
      </div>
    </PageShell>
  );
}
