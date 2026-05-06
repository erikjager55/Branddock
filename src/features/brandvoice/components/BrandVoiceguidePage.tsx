"use client";

import { Skeleton } from "@/components/shared";
import { PageShell } from "@/components/ui/layout";
import { useVoiceguide } from "../hooks";
import { useVoiceguideStore } from "../stores/useVoiceguideStore";
import { VoiceguideHeader } from "./VoiceguideHeader";
import { VoiceguideTabNav } from "./VoiceguideTabNav";
import { EmptyVoiceguideState } from "./EmptyVoiceguideState";
import { PersonalityCompanionCard } from "./PersonalityCompanionCard";
import { VoiceDnaSection } from "./sections/VoiceDnaSection";
import { VocabularySection } from "./sections/VocabularySection";
import { ChannelTonesSection } from "./sections/ChannelTonesSection";
import { ReferencesSection } from "./sections/ReferencesSection";

interface BrandVoiceguidePageProps {
  onNavigateToAnalyzer: () => void;
  /** Cross-module navigator (e.g. setActiveSection). Used by Voice DNA tab
   * to surface a "style guidelines live in Brandstyle" cross-link. */
  onNavigate?: (section: string) => void;
}

export function BrandVoiceguidePage({ onNavigateToAnalyzer, onNavigate }: BrandVoiceguidePageProps) {
  const { data, isLoading, isError } = useVoiceguide();
  const activeTab = useVoiceguideStore((s) => s.activeTab);
  const setActiveTab = useVoiceguideStore((s) => s.setActiveTab);

  if (isLoading) {
    return (
      <PageShell maxWidth="7xl">
        <div className="space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageShell>
    );
  }

  if (isError) {
    return (
      <PageShell maxWidth="7xl">
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-6 text-rose-700 text-sm">
          Could not load Brand Voice. Try refreshing the page.
        </div>
      </PageShell>
    );
  }

  const voiceguide = data?.voiceguide ?? null;

  // Empty state — show migration / analyzer / scratch options
  if (!voiceguide) {
    return (
      <PageShell maxWidth="7xl">
        <EmptyVoiceguideState onAnalyze={onNavigateToAnalyzer} />
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="7xl">
      <VoiceguideHeader voiceguide={voiceguide} onAnalyze={onNavigateToAnalyzer} />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-9">
          <VoiceguideTabNav activeTab={activeTab} onTabChange={setActiveTab} />

          {activeTab === "voice-dna" && <VoiceDnaSection voiceguide={voiceguide} onNavigate={onNavigate} />}
          {activeTab === "vocabulary" && <VocabularySection voiceguide={voiceguide} />}
          {activeTab === "channel-tones" && <ChannelTonesSection voiceguide={voiceguide} />}
          {activeTab === "references" && <ReferencesSection voiceguide={voiceguide} />}
        </div>

        <aside className="col-span-12 lg:col-span-3 space-y-4">
          <PersonalityCompanionCard />
        </aside>
      </div>
    </PageShell>
  );
}
