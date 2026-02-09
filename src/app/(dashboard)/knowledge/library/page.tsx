"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  FileText,
  Link as LinkIcon,
  Search,
  LayoutGrid,
  List,
  Calendar,
  HardDrive,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "All", value: "all" },
  { label: "PDF", value: "pdf" },
  { label: "Document", value: "doc" },
  { label: "URL", value: "url" },
];

const typeIcons: Record<string, typeof FileText> = {
  pdf: FileText,
  doc: FileText,
  url: LinkIcon,
};

const documents = [
  {
    id: "1",
    name: "Brand Guidelines v3.2",
    type: "pdf",
    uploadedDate: "Feb 1, 2025",
    size: "4.2 MB",
    tags: ["Brand", "Guidelines", "Official"],
  },
  {
    id: "2",
    name: "Q4 2024 Market Analysis Report",
    type: "pdf",
    uploadedDate: "Jan 15, 2025",
    size: "8.7 MB",
    tags: ["Market", "Analysis", "Q4"],
  },
  {
    id: "3",
    name: "Competitor Landscape Overview",
    type: "doc",
    uploadedDate: "Jan 10, 2025",
    size: "2.1 MB",
    tags: ["Competitor", "Strategy"],
  },
  {
    id: "4",
    name: "Industry Trends 2025",
    type: "url",
    uploadedDate: "Jan 5, 2025",
    size: "—",
    tags: ["Industry", "Trends"],
  },
  {
    id: "5",
    name: "Customer Feedback Summary H2 2024",
    type: "doc",
    uploadedDate: "Dec 20, 2024",
    size: "1.8 MB",
    tags: ["Customer", "Feedback"],
  },
];

export default function KnowledgeLibraryPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    let result = documents;
    if (activeTab !== "all") {
      result = result.filter((d) => d.type === activeTab);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [activeTab, searchQuery]);

  return (
    <div className="max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold text-text-dark">
            Knowledge Library
          </h1>
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Upload Document
          </Button>
        </div>
        <p className="text-sm text-text-dark/40">
          Store and organize your brand knowledge documents
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="pills"
        className="mb-6"
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dark/40" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-md border border-border-dark bg-surface-dark pl-10 pr-3 text-sm text-text-dark placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-background-dark"
          />
        </div>
        <div className="flex items-center gap-1 bg-surface-dark border border-border-dark rounded-xl p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              viewMode === "grid"
                ? "bg-primary text-white"
                : "text-text-dark/40 hover:text-text-dark"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              viewMode === "list"
                ? "bg-primary text-white"
                : "text-text-dark/40 hover:text-text-dark"
            )}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Documents */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-text-dark/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-dark mb-1">
            No documents found
          </h3>
          <p className="text-sm text-text-dark/40">
            Upload documents to build your knowledge library
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc) => {
            const TypeIcon = typeIcons[doc.type] || FileText;
            return (
              <Card key={doc.id} hoverable padding="lg">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <TypeIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-text-dark truncate">
                        {doc.name}
                      </h3>
                      <p className="text-xs text-text-dark/40 uppercase mt-0.5">
                        {doc.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-text-dark/40">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {doc.uploadedDate}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5" />
                      {doc.size}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-3 border-t border-border-dark">
                    {doc.tags.map((tag) => (
                      <Badge key={tag} variant="default" size="sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => {
            const TypeIcon = typeIcons[doc.type] || FileText;
            return (
              <Card key={doc.id} hoverable padding="md">
                <div className="flex items-center gap-4">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <TypeIcon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-text-dark truncate">
                      {doc.name}
                    </h3>
                  </div>
                  <Badge variant="default" size="sm">
                    {doc.type.toUpperCase()}
                  </Badge>
                  <span className="text-xs text-text-dark/40 w-24 text-right">
                    {doc.uploadedDate}
                  </span>
                  <span className="text-xs text-text-dark/40 w-16 text-right">
                    {doc.size}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
