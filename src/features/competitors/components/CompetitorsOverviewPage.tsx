"use client";

import { useState } from "react";
import { Swords, Plus, Target, ArrowRightLeft, BarChart3, Sparkles, Loader2, ExternalLink } from "lucide-react";
import { EmptyState, SkeletonCard, StatCard, Button, Badge, Card } from "@/components/shared";
import { PageShell, PageHeader } from "@/components/ui/layout";
import { useCompetitors, useDiscoverCompetitors, useCreateCompetitor } from "../hooks";
import { CompetitorCard } from "./CompetitorCard";
import type { DiscoveredCompetitor } from "../api/competitors.api";

interface CompetitorsOverviewPageProps {
  onNavigateToAnalyzer: () => void;
  onNavigateToDetail: (id: string) => void;
}

/** Competitors overview page with stats + grid */
export function CompetitorsOverviewPage({
  onNavigateToAnalyzer,
  onNavigateToDetail,
}: CompetitorsOverviewPageProps) {
  const { data, isLoading } = useCompetitors();
  const discover = useDiscoverCompetitors();
  const createCompetitor = useCreateCompetitor();
  const [discoveries, setDiscoveries] = useState<DiscoveredCompetitor[] | null>(null);
  const [addingUrl, setAddingUrl] = useState<string | null>(null);

  const stats = data?.stats;

  const handleDiscover = () => {
    discover.mutate(undefined, {
      onSuccess: (result) => setDiscoveries(result.competitors),
    });
  };

  const handleAddDiscovered = async (c: DiscoveredCompetitor) => {
    setAddingUrl(c.websiteUrl);
    try {
      await createCompetitor.mutateAsync({
        name: c.name,
        websiteUrl: c.websiteUrl,
        description: c.description,
        tier: c.tier,
      });
    } catch {
      // Silently fail — error visible via mutation state
    }
    setAddingUrl(null);
    setDiscoveries((prev) => prev?.filter((d) => d.websiteUrl !== c.websiteUrl) ?? null);
  };

  const TIER_COLORS: Record<string, string> = {
    DIRECT: 'bg-red-100 text-red-700',
    INDIRECT: 'bg-amber-100 text-amber-700',
    ASPIRATIONAL: 'bg-blue-100 text-blue-700',
  };

  return (
    <PageShell>
      <div className="space-y-6">
        <PageHeader
          moduleKey="competitors"
          title="Competitor Analysis"
          subtitle="Track and analyze your competitive landscape"
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={handleDiscover}
                disabled={discover.isPending}
                className="gap-2"
              >
                {discover.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {discover.isPending ? "Discovering..." : "Discover Competitors"}
              </Button>
              <Button onClick={onNavigateToAnalyzer} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Competitor
              </Button>
            </div>
          }
        />

        {/* Discovery Results */}
        {discoveries && discoveries.length > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-teal-600" />
                <h3 className="text-sm font-semibold text-gray-900">Discovered Competitors</h3>
                <Badge variant="teal">{discoveries.length} found</Badge>
              </div>
              <button
                type="button"
                onClick={() => setDiscoveries(null)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Dismiss
              </button>
            </div>
            <div className="space-y-3">
              {discoveries.map((c) => (
                <div key={c.websiteUrl} className="flex items-start gap-4 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-gray-900">{c.name}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${TIER_COLORS[c.tier] ?? 'bg-gray-100 text-gray-600'}`}>
                        {c.tier}
                      </span>
                      <span className="text-[10px] font-mono text-gray-400">{c.relevanceScore}/100</span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">{c.description}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{c.relevanceReason}</p>
                    <a
                      href={c.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-1"
                    >
                      {c.websiteUrl} <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAddDiscovered(c)}
                    disabled={addingUrl === c.websiteUrl}
                  >
                    {addingUrl === c.websiteUrl ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Discovery error */}
        {discover.isError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {discover.error instanceof Error ? discover.error.message : 'Failed to discover competitors'}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Total" value={stats.total} icon={Swords} />
            <StatCard label="Direct" value={stats.direct} icon={Target} />
            <StatCard label="Indirect" value={stats.indirect} icon={ArrowRightLeft} />
            <StatCard label="Avg Score" value={stats.avgScore} icon={BarChart3} />
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : !data?.competitors?.length ? (
          <EmptyState
            icon={Swords}
            title="No competitors yet"
            description="Add your first competitor or use AI to discover relevant competitors in your market."
            action={{
              label: "Discover with AI",
              onClick: handleDiscover,
            }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.competitors.map((competitor) => (
              <CompetitorCard
                key={competitor.id}
                competitor={competitor}
                onClick={() => onNavigateToDetail(competitor.id)}
              />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
