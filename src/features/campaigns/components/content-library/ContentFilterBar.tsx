"use client";

import React from "react";
import { SearchInput, Select } from "@/components/shared";
import { useContentLibraryStore } from "../../stores/useContentLibraryStore";
import { ContentGroupToggle } from "./ContentGroupToggle";
import { ContentViewToggle } from "./ContentViewToggle";
import { FavoritesToggle } from "./FavoritesToggle";

// ─── Filter options ───────────────────────────────────────

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "blog-post", label: "Blog Post" },
  { value: "linkedin-post", label: "LinkedIn Post" },
  { value: "newsletter", label: "Newsletter" },
  { value: "article", label: "Article" },
  { value: "whitepaper", label: "Whitepaper" },
  { value: "case-study", label: "Case Study" },
  { value: "twitter-thread", label: "Twitter Thread" },
  { value: "instagram-post", label: "Instagram Post" },
  { value: "facebook-post", label: "Facebook Post" },
  { value: "welcome-email", label: "Welcome Email" },
  { value: "promotional-email", label: "Promotional Email" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "NOT_STARTED", label: "Not Started" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
];

const CAMPAIGN_TYPE_OPTIONS = [
  { value: "", label: "All Campaigns" },
  { value: "STRATEGIC", label: "Strategic" },
  { value: "QUICK", label: "Quick" },
];

const SORT_OPTIONS = [
  { value: "updatedAt", label: "Latest Updated" },
  { value: "qualityScore", label: "Quality Score" },
  { value: "title", label: "Title A-Z" },
];

// ─── Component ────────────────────────────────────────────

export function ContentFilterBar() {
  const search = useContentLibraryStore((s) => s.search);
  const setSearch = useContentLibraryStore((s) => s.setSearch);
  const typeFilter = useContentLibraryStore((s) => s.typeFilter);
  const setTypeFilter = useContentLibraryStore((s) => s.setTypeFilter);
  const campaignFilter = useContentLibraryStore((s) => s.campaignFilter);
  const setCampaignFilter = useContentLibraryStore((s) => s.setCampaignFilter);
  const statusFilter = useContentLibraryStore((s) => s.statusFilter);
  const setStatusFilter = useContentLibraryStore((s) => s.setStatusFilter);
  const sort = useContentLibraryStore((s) => s.sort);
  const setSort = useContentLibraryStore((s) => s.setSort);

  return (
    <div className="space-y-3">
      {/* Row 1: Search + view controls */}
      <div className="flex items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search content..."
          className="flex-1 max-w-sm"
        />

        <div className="flex items-center gap-2 ml-auto">
          <ContentGroupToggle />
          <FavoritesToggle />
          <ContentViewToggle />
        </div>
      </div>

      {/* Row 2: Dropdown filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          value={typeFilter}
          onChange={setTypeFilter}
          options={TYPE_OPTIONS}
          placeholder="All Types"
          className="w-40"
        />
        <Select
          value={campaignFilter}
          onChange={setCampaignFilter}
          options={CAMPAIGN_TYPE_OPTIONS}
          placeholder="All Campaigns"
          className="w-40"
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_OPTIONS}
          placeholder="All Status"
          className="w-40"
        />
        <Select
          value={sort || "updatedAt"}
          onChange={(v) => setSort(v || "updatedAt")}
          options={SORT_OPTIONS}
          placeholder="Sort by"
          className="w-40 ml-auto"
        />
      </div>
    </div>
  );
}

export default ContentFilterBar;
