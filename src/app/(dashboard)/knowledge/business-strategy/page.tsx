"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { Plus, Target, Mountain, MapPin, TrendingUp, Briefcase } from "lucide-react";
import { useStrategies, BusinessStrategy } from "@/hooks/api/useStrategies";

const placeholderStrategies: BusinessStrategy[] = [
  {
    id: "target-audience",
    type: "target-audience",
    title: "Target Audience",
    description:
      "Mid-size to enterprise marketing teams (50-500 employees) looking to scale brand consistency across channels and campaigns.",
    status: "active",
    content: null,
    isLocked: false,
    workspaceId: "mock",
    createdById: "mock",
    createdAt: "2025-01-15T00:00:00.000Z",
    updatedAt: "2025-02-05T00:00:00.000Z",
  },
  {
    id: "competitive-landscape",
    type: "competitive-landscape",
    title: "Competitive Landscape",
    description:
      "Analysis of key competitors including Frontify, Bynder, and Brandfolder. Our differentiator: AI-powered strategy-to-content pipeline.",
    status: "active",
    content: null,
    isLocked: false,
    workspaceId: "mock",
    createdById: "mock",
    createdAt: "2025-01-15T00:00:00.000Z",
    updatedAt: "2025-01-28T00:00:00.000Z",
  },
  {
    id: "market-position",
    type: "market-position",
    title: "Market Position",
    description:
      "Positioned as the intelligent brand platform that bridges the gap between strategy and execution for modern marketing teams.",
    status: "draft",
    content: null,
    isLocked: false,
    workspaceId: "mock",
    createdById: "mock",
    createdAt: "2025-01-15T00:00:00.000Z",
    updatedAt: "2025-02-03T00:00:00.000Z",
  },
  {
    id: "growth-strategy",
    type: "growth-strategy",
    title: "Growth Strategy",
    description:
      "Product-led growth with freemium model. Focus on organic acquisition through content marketing and strategic partnerships.",
    status: "draft",
    content: null,
    isLocked: false,
    workspaceId: "mock",
    createdById: "mock",
    createdAt: "2025-01-15T00:00:00.000Z",
    updatedAt: "2025-01-20T00:00:00.000Z",
  },
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "target-audience": Target,
  "competitive-landscape": Mountain,
  "market-position": MapPin,
  "growth-strategy": TrendingUp,
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BusinessStrategyPage() {
  const workspaceId = "mock-workspace-id";

  const { data: apiData, isLoading, isError } = useStrategies({ workspaceId });

  const hasApiData = !isError && apiData?.data && apiData.data.length > 0;
  const strategies = hasApiData ? apiData!.data : placeholderStrategies;
  const isDemo = !isLoading && !hasApiData;

  return (
    <div className="max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold text-text-dark">
            Business Strategy
          </h1>
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Strategy
          </Button>
        </div>
        <p className="text-sm text-text-dark/40">
          Define your business strategy, target audience, and competitive
          positioning
        </p>
      </div>

      {/* Demo Banner */}
      {isDemo && <DemoBanner />}

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="card" height={200} />
          ))}
        </div>
      ) : strategies.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="w-8 h-8" />}
          title="No strategies yet"
          description="Add your first business strategy to get started"
          action={
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
              Add Strategy
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {strategies.map((strategy) => {
            const Icon = iconMap[strategy.type] || TrendingUp;
            const isActive = strategy.status.toLowerCase() === "active";
            return (
              <Link key={strategy.id} href={`/knowledge/business-strategy/${strategy.id}`}>
                <Card hoverable padding="lg">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <Badge variant={isActive ? "success" : "default"}>
                        {isActive ? "Active" : "Draft"}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text-dark mb-1">
                        {strategy.title}
                      </h3>
                      <p className="text-xs text-text-dark/40 line-clamp-3">
                        {strategy.description}
                      </p>
                    </div>
                    <div className="pt-3 border-t border-border-dark">
                      <span className="text-xs text-text-dark/40">
                        Updated {formatDate(strategy.updatedAt)}
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
