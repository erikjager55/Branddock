"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  CheckCircle,
  Clock,
  Star,
  Search,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Pencil,
  Copy,
  Trash2,
  Heart,
  Megaphone,
  Zap,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { Dropdown } from "@/components/ui/Dropdown";
import { cn } from "@/lib/utils";

// ────────────────────────────── Types ──────────────────────────────

interface ContentItem {
  id: string;
  title: string;
  description: string;
  type: string;
  typeBadgeColor: string;
  campaign: string;
  campaignType: "strategic" | "quick";
  status: "Complete" | "In Progress" | "Draft";
  quality: number;
  wordCount: number;
  updatedAt: string;
  favorite: boolean;
}

// ────────────────────────────── Placeholder Data ──────────────────────────────

const CONTENT_ITEMS: ContentItem[] = [
  {
    id: "cl-1",
    title: "AI Trends in Marketing 2026",
    description: "Comprehensive analysis of how AI is reshaping digital marketing strategies for forward-thinking brands.",
    type: "Blog Post",
    typeBadgeColor: "bg-blue-500/10 text-blue-400",
    campaign: "Q1 Product Launch",
    campaignType: "strategic",
    status: "Complete",
    quality: 92,
    wordCount: 2450,
    updatedAt: "Feb 8, 2026",
    favorite: true,
  },
  {
    id: "cl-2",
    title: "5 Ways to Improve Your Brand",
    description: "Practical tips for enhancing brand consistency across all customer touchpoints.",
    type: "Blog Post",
    typeBadgeColor: "bg-blue-500/10 text-blue-400",
    campaign: "Blog Post - Jan 20",
    campaignType: "quick",
    status: "Complete",
    quality: 85,
    wordCount: 1820,
    updatedAt: "Jan 20, 2026",
    favorite: false,
  },
  {
    id: "cl-3",
    title: "LinkedIn Post Series - Week 1",
    description: "Professional thought leadership content for LinkedIn audience engagement.",
    type: "LinkedIn Post",
    typeBadgeColor: "bg-sky-500/10 text-sky-400",
    campaign: "LinkedIn Post Series",
    campaignType: "quick",
    status: "In Progress",
    quality: 78,
    wordCount: 650,
    updatedAt: "Feb 7, 2026",
    favorite: false,
  },
  {
    id: "cl-4",
    title: "Welcome Email Sequence - Part 1",
    description: "Onboarding email introducing new users to the platform and key features.",
    type: "Welcome Email",
    typeBadgeColor: "bg-purple-500/10 text-purple-400",
    campaign: "Q1 Product Launch",
    campaignType: "strategic",
    status: "Complete",
    quality: 88,
    wordCount: 420,
    updatedAt: "Feb 5, 2026",
    favorite: true,
  },
  {
    id: "cl-5",
    title: "Facebook Ad Copy - New Product",
    description: "Compelling ad copy variants for the new product feature announcement campaign.",
    type: "Facebook Post",
    typeBadgeColor: "bg-indigo-500/10 text-indigo-400",
    campaign: "Q1 Product Launch",
    campaignType: "strategic",
    status: "Draft",
    quality: 65,
    wordCount: 180,
    updatedAt: "Feb 3, 2026",
    favorite: false,
  },
  {
    id: "cl-6",
    title: "Landing Page: Product Features",
    description: "Feature-focused landing page copy highlighting AI-powered brand management capabilities.",
    type: "Article",
    typeBadgeColor: "bg-emerald-500/10 text-emerald-400",
    campaign: "Q1 Product Launch",
    campaignType: "strategic",
    status: "In Progress",
    quality: 82,
    wordCount: 1100,
    updatedAt: "Feb 6, 2026",
    favorite: false,
  },
];

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "Blog Post", label: "Blog Post" },
  { value: "LinkedIn Post", label: "LinkedIn Post" },
  { value: "Twitter Post", label: "Twitter Post" },
  { value: "Welcome Email", label: "Welcome Email" },
  { value: "Facebook Post", label: "Facebook Post" },
  { value: "Article", label: "Article" },
];

const CAMPAIGN_OPTIONS = [
  { value: "all", label: "All Campaigns" },
  { value: "strategic", label: "Strategic" },
  { value: "quick", label: "Quick" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "Complete", label: "Complete" },
  { value: "In Progress", label: "In Progress" },
  { value: "Draft", label: "Draft" },
];

const SORT_OPTIONS = [
  { value: "recent", label: "Recent" },
  { value: "oldest", label: "Oldest" },
  { value: "a-z", label: "A-Z" },
  { value: "z-a", label: "Z-A" },
  { value: "quality-high", label: "Quality High-Low" },
  { value: "quality-low", label: "Quality Low-High" },
];

const statusConfig: Record<string, { variant: "success" | "warning" | "default"; label: string }> = {
  Complete: { variant: "success", label: "Complete" },
  "In Progress": { variant: "warning", label: "In Progress" },
  Draft: { variant: "default", label: "Draft" },
};

function qualityColor(score: number): string {
  if (score >= 85) return "text-emerald-400";
  if (score >= 65) return "text-amber-400";
  return "text-red-400";
}

function qualityBg(score: number): string {
  if (score >= 85) return "bg-emerald-400";
  if (score >= 65) return "bg-amber-400";
  return "bg-red-400";
}

// ────────────────────────────── Component ──────────────────────────────

export default function ContentLibraryPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [groupByCampaign, setGroupByCampaign] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(
    new Set(CONTENT_ITEMS.filter((i) => i.favorite).map((i) => i.id))
  );

  // Filter + sort
  const filtered = useMemo(() => {
    let items = [...CONTENT_ITEMS];

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)
      );
    }
    if (typeFilter !== "all") items = items.filter((i) => i.type === typeFilter);
    if (campaignFilter !== "all") items = items.filter((i) => i.campaignType === campaignFilter);
    if (statusFilter !== "all") items = items.filter((i) => i.status === statusFilter);
    if (favoritesOnly) items = items.filter((i) => favorites.has(i.id));

    items.sort((a, b) => {
      switch (sort) {
        case "oldest": return a.updatedAt.localeCompare(b.updatedAt);
        case "a-z": return a.title.localeCompare(b.title);
        case "z-a": return b.title.localeCompare(a.title);
        case "quality-high": return b.quality - a.quality;
        case "quality-low": return a.quality - b.quality;
        default: return b.updatedAt.localeCompare(a.updatedAt);
      }
    });

    return items;
  }, [search, typeFilter, campaignFilter, statusFilter, sort, favoritesOnly, favorites]);

  // Stats
  const totalContent = CONTENT_ITEMS.length;
  const completeCount = CONTENT_ITEMS.filter((i) => i.status === "Complete").length;
  const inProgressCount = CONTENT_ITEMS.filter((i) => i.status === "In Progress").length;
  const avgQuality = Math.round(CONTENT_ITEMS.reduce((s, i) => s + i.quality, 0) / totalContent);

  // Group by campaign
  const grouped = useMemo(() => {
    if (!groupByCampaign) return null;
    const map = new Map<string, { type: "strategic" | "quick"; items: ContentItem[] }>();
    for (const item of filtered) {
      if (!map.has(item.campaign)) {
        map.set(item.campaign, { type: item.campaignType, items: [] });
      }
      map.get(item.campaign)!.items.push(item);
    }
    return map;
  }, [filtered, groupByCampaign]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroup = (campaign: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(campaign)) next.delete(campaign);
      else next.add(campaign);
      return next;
    });
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getDropdownItems = (item: ContentItem) => [
    { label: "Edit", icon: <Pencil className="w-4 h-4" />, onClick: () => {} },
    { label: "Duplicate", icon: <Copy className="w-4 h-4" />, onClick: () => {} },
    { label: favorites.has(item.id) ? "Unfavorite" : "Favorite", icon: <Heart className="w-4 h-4" />, onClick: () => toggleFavorite(item.id) },
    "separator" as const,
    { label: "Delete", icon: <Trash2 className="w-4 h-4" />, onClick: () => {}, danger: true },
  ];

  // ────────────── Render helpers ──────────────

  function renderGridCard(item: ContentItem) {
    const config = statusConfig[item.status];
    return (
      <Card key={item.id} padding="none" className="group relative">
        <div className="p-4 space-y-3">
          {/* Top row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="checkbox"
                checked={selectedIds.has(item.id)}
                onChange={() => toggleSelect(item.id)}
                className="w-4 h-4 rounded border-border-dark bg-surface-dark text-primary focus:ring-primary accent-primary"
              />
              <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", item.typeBadgeColor)}>
                {item.type}
              </span>
              <Badge variant={config.variant} size="sm" dot>{config.label}</Badge>
            </div>
            <Dropdown
              trigger={
                <button className="p-1 rounded-md text-text-dark/40 hover:text-text-dark hover:bg-surface-dark transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              }
              items={getDropdownItems(item)}
              align="right"
            />
          </div>

          {/* Title + description */}
          <div>
            <h3 className="text-sm font-semibold text-text-dark line-clamp-1">{item.title}</h3>
            <p className="text-xs text-text-dark/40 line-clamp-2 mt-0.5">{item.description}</p>
          </div>

          {/* Campaign source */}
          <div className="flex items-center gap-1.5 text-xs text-text-dark/50">
            {item.campaignType === "strategic" ? (
              <Megaphone className="w-3.5 h-3.5" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            {item.campaign}
          </div>

          {/* Meta */}
          <div className="flex items-center gap-3 text-xs text-text-dark/40">
            <span>{item.wordCount.toLocaleString()} words</span>
            <span className="w-1 h-1 rounded-full bg-text-dark/20" />
            <span className={cn("font-medium", qualityColor(item.quality))}>
              <Sparkles className="w-3 h-3 inline -mt-0.5 mr-0.5" />
              {item.quality}/100
            </span>
            <span className="w-1 h-1 rounded-full bg-text-dark/20" />
            <span>{item.updatedAt}</span>
          </div>

          {/* Open in Studio */}
          <Link href={`/strategy/content-studio/${item.id}`}>
            <Button variant="secondary" fullWidth size="sm" leftIcon={<Pencil className="w-3.5 h-3.5" />}>
              Open in Studio
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  function renderListRow(item: ContentItem) {
    const config = statusConfig[item.status];
    return (
      <tr key={item.id} className="border-b border-border-dark hover:bg-surface-dark/30 transition-colors">
        <td className="px-4 py-3">
          <input
            type="checkbox"
            checked={selectedIds.has(item.id)}
            onChange={() => toggleSelect(item.id)}
            className="w-4 h-4 rounded border-border-dark bg-surface-dark text-primary focus:ring-primary accent-primary"
          />
        </td>
        <td className="px-4 py-3">
          <div>
            <p className="text-sm font-medium text-text-dark">{item.title}</p>
            <p className="text-xs text-text-dark/40 line-clamp-1">{item.description}</p>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap", item.typeBadgeColor)}>
            {item.type}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs text-text-dark/50 whitespace-nowrap">
            {item.campaignType === "strategic" ? (
              <Megaphone className="w-3.5 h-3.5 flex-shrink-0" />
            ) : (
              <Zap className="w-3.5 h-3.5 flex-shrink-0" />
            )}
            {item.campaign}
          </div>
        </td>
        <td className="px-4 py-3">
          <Badge variant={config.variant} size="sm" dot>{config.label}</Badge>
        </td>
        <td className="px-4 py-3">
          <span className={cn("text-sm font-semibold", qualityColor(item.quality))}>
            {item.quality}
          </span>
        </td>
        <td className="px-4 py-3 text-xs text-text-dark/40 whitespace-nowrap">{item.updatedAt}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <Link href={`/strategy/content-studio/${item.id}`}>
              <Button variant="ghost" size="sm"><Pencil className="w-3.5 h-3.5" /></Button>
            </Link>
            <Dropdown
              trigger={
                <button className="p-1.5 rounded-md text-text-dark/40 hover:text-text-dark hover:bg-surface-dark transition-colors">
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              }
              items={getDropdownItems(item)}
              align="right"
            />
          </div>
        </td>
      </tr>
    );
  }

  function renderGroupHeader(campaign: string, type: "strategic" | "quick", count: number) {
    const isCollapsed = collapsedGroups.has(campaign);
    return (
      <button
        onClick={() => toggleGroup(campaign)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-surface-dark/50 rounded-lg text-left hover:bg-surface-dark transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-text-dark/40" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-dark/40" />
        )}
        {type === "strategic" ? (
          <Megaphone className="w-4 h-4 text-primary" />
        ) : (
          <Zap className="w-4 h-4 text-amber-400" />
        )}
        <span className="text-sm font-semibold text-text-dark">{campaign}</span>
        <Badge variant={type === "strategic" ? "info" : "warning"} size="sm">
          {type === "strategic" ? "Strategic" : "Quick"}
        </Badge>
        <span className="text-xs text-text-dark/40 ml-auto">{count} items</span>
      </button>
    );
  }

  return (
    <div className="max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold text-text-dark">Content Library</h1>
        </div>
        <p className="text-sm text-text-dark/40">
          Browse, manage, and organize all your content in one place
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-dark">{totalContent}</p>
              <p className="text-xs text-text-dark/40">Total Content</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-dark">{completeCount}</p>
              <p className="text-xs text-text-dark/40">Complete</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-dark">{inProgressCount}</p>
              <p className="text-xs text-text-dark/40">In Progress</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Star className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-dark">{avgQuality}%</p>
              <p className="text-xs text-text-dark/40">Avg Quality</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="space-y-3 mb-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dark/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search content..."
            className="h-10 w-full rounded-md border border-border-dark bg-surface-dark pl-10 pr-4 text-sm text-text-dark placeholder:text-text-dark/40 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-background-dark"
          />
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-2">
          <Select
            options={TYPE_OPTIONS}
            value={typeFilter}
            onChange={setTypeFilter}
            className="w-36"
          />
          <Select
            options={CAMPAIGN_OPTIONS}
            value={campaignFilter}
            onChange={setCampaignFilter}
            className="w-36"
          />
          <Select
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={setStatusFilter}
            className="w-36"
          />
          <Select
            options={SORT_OPTIONS}
            value={sort}
            onChange={setSort}
            className="w-40"
          />

          <div className="flex-1" />

          {/* View controls */}
          <Toggle
            checked={groupByCampaign}
            onChange={setGroupByCampaign}
            label="Group by Campaign"
            size="sm"
          />
          <div className="flex items-center rounded-md border border-border-dark overflow-hidden">
            <button
              onClick={() => setView("grid")}
              className={cn(
                "p-2 transition-colors",
                view === "grid" ? "bg-primary/10 text-primary" : "text-text-dark/40 hover:text-text-dark hover:bg-surface-dark"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "p-2 transition-colors",
                view === "list" ? "bg-primary/10 text-primary" : "text-text-dark/40 hover:text-text-dark hover:bg-surface-dark"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className={cn(
              "p-2 rounded-md border transition-colors",
              favoritesOnly
                ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                : "border-border-dark text-text-dark/40 hover:text-text-dark hover:bg-surface-dark"
            )}
          >
            <Star className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bulk selection info */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
          <span className="text-sm text-text-dark">
            <span className="font-semibold">{selectedIds.size}</span> items selected
          </span>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Content */}
      {grouped ? (
        /* Grouped view */
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([campaign, { type, items }]) => (
            <div key={campaign}>
              {renderGroupHeader(campaign, type, items.length)}
              {!collapsedGroups.has(campaign) && (
                view === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-3">
                    {items.map(renderGridCard)}
                  </div>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-border-dark">
                          <th className="px-4 py-2 text-xs font-medium text-text-dark/40 w-10" />
                          <th className="px-4 py-2 text-xs font-medium text-text-dark/40 uppercase tracking-wide">Content</th>
                          <th className="px-4 py-2 text-xs font-medium text-text-dark/40 uppercase tracking-wide">Type</th>
                          <th className="px-4 py-2 text-xs font-medium text-text-dark/40 uppercase tracking-wide">Campaign</th>
                          <th className="px-4 py-2 text-xs font-medium text-text-dark/40 uppercase tracking-wide">Status</th>
                          <th className="px-4 py-2 text-xs font-medium text-text-dark/40 uppercase tracking-wide">Quality</th>
                          <th className="px-4 py-2 text-xs font-medium text-text-dark/40 uppercase tracking-wide">Updated</th>
                          <th className="px-4 py-2 text-xs font-medium text-text-dark/40 uppercase tracking-wide w-20">Actions</th>
                        </tr>
                      </thead>
                      <tbody>{items.map(renderListRow)}</tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      ) : view === "grid" ? (
        /* Flat grid view */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(renderGridCard)}
        </div>
      ) : (
        /* Flat list view */
        <div className="overflow-x-auto border border-border-dark rounded-lg">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-dark bg-surface-dark/50">
                <th className="px-4 py-3 text-xs font-medium text-text-dark/40 w-10" />
                <th className="px-4 py-3 text-xs font-medium text-text-dark/40 uppercase tracking-wide">Content</th>
                <th className="px-4 py-3 text-xs font-medium text-text-dark/40 uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-xs font-medium text-text-dark/40 uppercase tracking-wide">Campaign</th>
                <th className="px-4 py-3 text-xs font-medium text-text-dark/40 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-text-dark/40 uppercase tracking-wide">Quality</th>
                <th className="px-4 py-3 text-xs font-medium text-text-dark/40 uppercase tracking-wide">Updated</th>
                <th className="px-4 py-3 text-xs font-medium text-text-dark/40 uppercase tracking-wide w-20">Actions</th>
              </tr>
            </thead>
            <tbody>{filtered.map(renderListRow)}</tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-text-dark/20 mx-auto mb-3" />
          <p className="text-sm font-medium text-text-dark/60">No content found</p>
          <p className="text-xs text-text-dark/40 mt-1">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}
