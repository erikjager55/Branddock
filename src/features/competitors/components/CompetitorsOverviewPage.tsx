"use client";

import { Swords, Plus } from "lucide-react";
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
          <StatCard
            label="Direct"
            value={stats.direct}
            icon={Swords}
          />
          <StatCard
            label="Indirect"
            value={stats.indirect}
            icon={Swords}
          />
          <StatCard
            label="Avg Score"
            value={stats.avgScore}
            icon={Swords}
          />
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {data.competitors.map((competitor) => (
            <CompetitorCard
              key={competitor.id}
              competitor={competitor}
              onClick={() => onNavigateToDetail(competitor.id)}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}
