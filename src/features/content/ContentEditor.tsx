"use client";

import { useState, useMemo } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link,
  Image,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sparkles,
  Wand2,
  Shrink,
  Expand,
  Shield,
  Eye,
  Save,
  Send,
  Clock,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { cn } from "@/lib/utils";
import {
  ContentType,
  ContentStatus,
  contentTypeLabels,
  contentStatusLabels,
} from "@/types/content";

const contentTypeOptions = Object.values(ContentType).map((value) => ({
  value,
  label: contentTypeLabels[value],
}));

const contentStatusOptions = Object.values(ContentStatus).map((value) => ({
  value,
  label: contentStatusLabels[value],
}));

const formatButtons = [
  { icon: Bold, label: "Bold" },
  { icon: Italic, label: "Italic" },
  { icon: Underline, label: "Underline" },
  { divider: true },
  { icon: List, label: "Bullet List" },
  { icon: ListOrdered, label: "Numbered List" },
  { divider: true },
  { icon: AlignLeft, label: "Align Left" },
  { icon: AlignCenter, label: "Align Center" },
  { icon: AlignRight, label: "Align Right" },
  { divider: true },
  { icon: Link, label: "Link" },
  { icon: Image, label: "Image" },
] as const;

interface ContentEditorProps {
  initialTitle?: string;
  initialBody?: string;
  initialContentType?: ContentType;
  initialStatus?: ContentStatus;
  initialTags?: string[];
  initialOnBrand?: boolean;
  campaignId?: string;
  campaignOptions?: { value: string; label: string }[];
  showPreview?: boolean;
  analysisScores?: {
    tone: string;
    readability: number;
    brandAlignment: number;
  };
  versionHistory?: { version: string; date: string; author: string }[];
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

function readingTime(wordCount: number): string {
  const minutes = Math.max(1, Math.ceil(wordCount / 200));
  return `${minutes} min read`;
}

export function ContentEditor({
  initialTitle = "",
  initialBody = "",
  initialContentType = ContentType.BlogPost,
  initialStatus = ContentStatus.Draft,
  initialTags = [],
  initialOnBrand = true,
  campaignId,
  campaignOptions,
  showPreview: initialShowPreview = false,
  analysisScores,
  versionHistory,
}: ContentEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [contentType, setContentType] = useState<string>(initialContentType);
  const [status, setStatus] = useState<string>(initialStatus);
  const [selectedCampaign, setSelectedCampaign] = useState(campaignId || "");
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [onBrand, setOnBrand] = useState(initialOnBrand);
  const [isPreview, setIsPreview] = useState(initialShowPreview);

  const wordCount = useMemo(() => countWords(body), [body]);
  const readTime = useMemo(() => readingTime(wordCount), [wordCount]);

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  return (
    <div className="flex gap-6">
      {/* Main Editor */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Content title..."
          className="w-full text-2xl font-semibold text-text-dark bg-transparent border-none outline-none placeholder:text-text-dark/30"
        />

        {/* Formatting Toolbar */}
        <Card padding="none">
          <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border-dark">
            {formatButtons.map((btn, i) =>
              "divider" in btn ? (
                <div
                  key={`d-${i}`}
                  className="w-px h-5 bg-border-dark mx-1"
                />
              ) : (
                <button
                  key={btn.label}
                  title={btn.label}
                  className="p-1.5 rounded hover:bg-surface-dark text-text-dark/50 hover:text-text-dark transition-colors"
                >
                  <btn.icon className="w-4 h-4" />
                </button>
              )
            )}
          </div>

          {/* Editor / Preview area */}
          {isPreview ? (
            <div className="p-6 min-h-[400px] prose prose-invert prose-sm max-w-none">
              <h1>{title || "Untitled"}</h1>
              <div className="whitespace-pre-wrap text-sm text-text-dark/80">
                {body || "No content yet."}
              </div>
            </div>
          ) : (
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Start writing your content..."
              className="w-full min-h-[400px] p-6 bg-transparent text-sm text-text-dark placeholder:text-text-dark/30 resize-y outline-none"
            />
          )}

          {/* Footer stats */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-border-dark text-xs text-text-dark/40">
            <div className="flex items-center gap-4">
              <span>{wordCount} words</span>
              <span>{readTime}</span>
            </div>
            <button
              onClick={() => setIsPreview(!isPreview)}
              className="flex items-center gap-1.5 text-text-dark/50 hover:text-text-dark transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              {isPreview ? "Edit" : "Preview"}
            </button>
          </div>
        </Card>

        {/* AI Assist */}
        <Card padding="md">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-text-dark/60">
              AI Assist
            </span>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" leftIcon={<Wand2 className="w-3.5 h-3.5" />}>
              Generate
            </Button>
            <Button variant="ghost" size="sm" leftIcon={<Sparkles className="w-3.5 h-3.5" />}>
              Improve
            </Button>
            <Button variant="ghost" size="sm" leftIcon={<Shrink className="w-3.5 h-3.5" />}>
              Shorten
            </Button>
            <Button variant="ghost" size="sm" leftIcon={<Expand className="w-3.5 h-3.5" />}>
              Expand
            </Button>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Draft
          </Button>
          <Button
            variant="primary"
            leftIcon={<Send className="w-4 h-4" />}
          >
            Publish
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 space-y-4">
        {/* Content Settings */}
        <Card padding="lg">
          <h3 className="text-sm font-semibold text-text-dark mb-4">
            Settings
          </h3>
          <div className="space-y-4">
            <Select
              label="Content Type"
              options={contentTypeOptions}
              value={contentType}
              onChange={setContentType}
            />
            {campaignOptions && (
              <Select
                label="Campaign"
                options={campaignOptions}
                value={selectedCampaign}
                onChange={setSelectedCampaign}
                placeholder="Select campaign..."
              />
            )}
            <Select
              label="Status"
              options={contentStatusOptions}
              value={status}
              onChange={setStatus}
            />
          </div>
        </Card>

        {/* On Brand Toggle */}
        <Card padding="lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield
                className={cn(
                  "w-4 h-4",
                  onBrand ? "text-emerald-400" : "text-text-dark/40"
                )}
              />
              <span className="text-sm font-medium text-text-dark">
                ON BRAND
              </span>
            </div>
            <Toggle checked={onBrand} onChange={setOnBrand} size="sm" />
          </div>
          <p className="text-xs text-text-dark/40 mt-2">
            {onBrand
              ? "Content aligns with brand guidelines"
              : "Content may deviate from brand guidelines"}
          </p>
        </Card>

        {/* Tags */}
        <Card padding="lg">
          <h3 className="text-sm font-semibold text-text-dark mb-3">Tags</h3>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="default"
                size="sm"
                removable
                onRemove={() => setTags(tags.filter((t) => t !== tag))}
              >
                {tag}
              </Badge>
            ))}
            {tags.length === 0 && (
              <p className="text-xs text-text-dark/30">No tags added</p>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              placeholder="Add tag..."
              className="h-8 flex-1 rounded-md border border-border-dark bg-surface-dark px-2 text-xs text-text-dark placeholder:text-text-dark/40 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button variant="ghost" size="sm" onClick={addTag}>
              <Tag className="w-3.5 h-3.5" />
            </Button>
          </div>
        </Card>

        {/* AI Analysis (if provided) */}
        {analysisScores && (
          <Card padding="lg">
            <h3 className="text-sm font-semibold text-text-dark mb-4">
              AI Analysis
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-dark/60">Tone</span>
                <Badge variant="info" size="sm">
                  {analysisScores.tone}
                </Badge>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-text-dark/60">Readability</span>
                  <span className="text-xs font-medium text-text-dark">
                    {analysisScores.readability}/100
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-border-dark/30 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-400"
                    style={{ width: `${analysisScores.readability}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-text-dark/60">
                    Brand Alignment
                  </span>
                  <span className="text-xs font-medium text-text-dark">
                    {analysisScores.brandAlignment}/100
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-border-dark/30 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-400"
                    style={{ width: `${analysisScores.brandAlignment}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Version History (if provided) */}
        {versionHistory && versionHistory.length > 0 && (
          <Card padding="lg">
            <h3 className="text-sm font-semibold text-text-dark mb-3">
              Version History
            </h3>
            <div className="space-y-2">
              {versionHistory.map((v, i) => (
                <button
                  key={v.version}
                  className={cn(
                    "w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors",
                    i === 0
                      ? "bg-primary/10 text-primary"
                      : "text-text-dark/60 hover:bg-surface-dark"
                  )}
                >
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{v.version}</p>
                    <p className="text-[10px] text-text-dark/40">
                      {v.date} &middot; {v.author}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}
      </aside>
    </div>
  );
}
