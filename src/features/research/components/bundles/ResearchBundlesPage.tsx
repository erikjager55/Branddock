"use client";

import React, { useState } from "react";
import { SkeletonCard } from "@/components/shared";
import { PageShell, PageHeader } from "@/components/ui/layout";
import { useBundles } from "../../hooks";
import type { ResearchBundleSummary } from "../../types/research.types";
import { BundleFilterTabs } from "./BundleFilterTabs";
import { FoundationPlansSection } from "./FoundationPlansSection";
import { SpecializedPlansSection } from "./SpecializedPlansSection";

// ─── Types ───────────────────────────────────────────────────

interface ResearchBundlesPageProps {
  onNavigate: (section: string) => void;
  onNavigateToDetail: (bundleId: string) => void;
}

// ─── Component ───────────────────────────────────────────────

export function ResearchBundlesPage({
  onNavigate,
  onNavigateToDetail,
}: ResearchBundlesPageProps) {
  const { data, isLoading } = useBundles();
  const [filter, setFilter] = useState<"all" | "recommended">("all");
  const [search, setSearch] = useState("");

  // Filter logic
  const filterBundles = (bundles: ResearchBundleSummary[]) => {
    if (!bundles) return [];
    let filtered = [...bundles];
    if (filter === "recommended") {
      filtered = filtered.filter((b) => b.isRecommended);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          (b.description && b.description.toLowerCase().includes(q))
      );
    }
    return filtered;
  };

  const foundationBundles = data ? filterBundles(data.foundation) : [];
  const specializedBundles = data ? filterBundles(data.specialized) : [];

  function handleSelect(bundleId: string) {
    onNavigateToDetail(bundleId);
  }

  function handleLearnMore(bundleId: string) {
    onNavigateToDetail(bundleId);
  }

  return (
    <PageShell>
      <div data-testid="research-bundles-page">
      <PageHeader
        moduleKey="research"
        title="Research Bundles"
        subtitle="Pre-built research packages"
      />

      {/* Filters */}
      <BundleFilterTabs
        filter={filter}
        search={search}
        onFilterChange={setFilter}
        onSearchChange={setSearch}
      />

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Foundation Plans */}
      {!isLoading && (
        <FoundationPlansSection
          bundles={foundationBundles}
          onSelect={handleSelect}
          onLearnMore={handleLearnMore}
        />
      )}

      {/* Specialized Plans */}
      {!isLoading && (
        <SpecializedPlansSection
          bundles={specializedBundles}
          onSelect={handleSelect}
          onLearnMore={handleLearnMore}
        />
      )}
      </div>
    </PageShell>
  );
}
