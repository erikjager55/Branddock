"use client";

import { Swords, Plus, Target, ArrowRightLeft, BarChart3 } from "lucide-react";
import { EmptyState, SkeletonCard, StatCard, Button } from "@/components/shared";
import { PageShell, PageHeader } from "@/components/ui/layout";
import { useCompetitors } from "../hooks";
import { CompetitorCard } from "./CompetitorCard";

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

  const stats = data?.stats;

  return (
    <PageShell>
      <div className="space-y-6">
        <PageHeader
          moduleKey="competitors"
          title="Competitor Analysis"
          subtitle="Track and analyze your competitive landscape"
          actions={
            <Button onClick={onNavigateToAnalyzer} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Competitor
            </Button>
          }
        />

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
            description="Add your first competitor to start analyzing your competitive landscape."
            action={{
              label: "Add your first competitor",
              onClick: onNavigateToAnalyzer,
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
