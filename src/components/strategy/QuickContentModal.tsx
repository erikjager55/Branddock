"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ChevronDown, Check, FileText } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { cn } from "@/lib/utils";

// ────────────────────────────── Content Types ──────────────────────────────

interface QuickContentType {
  id: string;
  name: string;
  description: string;
  formats: string[];
}

interface QuickContentTab {
  label: string;
  value: string;
  items: QuickContentType[];
}

const CONTENT_TABS: QuickContentTab[] = [
  {
    label: "Written",
    value: "written",
    items: [
      { id: "qc-blog", name: "Blog Post", description: "Long-form articles for your blog", formats: ["Text"] },
      { id: "qc-case", name: "Case Study", description: "Customer success stories", formats: ["Text"] },
      { id: "qc-whitepaper", name: "Whitepaper", description: "In-depth research papers", formats: ["Text"] },
      { id: "qc-press", name: "Press Release", description: "News and announcements", formats: ["Text"] },
      { id: "qc-article", name: "Article", description: "General-purpose articles", formats: ["Text"] },
    ],
  },
  {
    label: "Social",
    value: "social",
    items: [
      { id: "qc-linkedin", name: "LinkedIn", description: "Professional network content", formats: ["Text", "Image"] },
      { id: "qc-twitter", name: "Twitter/X", description: "Short-form thread content", formats: ["Text"] },
      { id: "qc-instagram", name: "Instagram", description: "Visual-first social content", formats: ["Image", "Carousel"] },
      { id: "qc-carousel", name: "Carousel", description: "Multi-slide social content", formats: ["Carousel"] },
      { id: "qc-facebook", name: "Facebook", description: "Community-focused content", formats: ["Text", "Image"] },
    ],
  },
  {
    label: "Visual",
    value: "visual",
    items: [
      { id: "qc-graphic", name: "Social Graphic", description: "Branded social images", formats: ["Image"] },
      { id: "qc-infographic", name: "Infographic", description: "Data-driven visual content", formats: ["Image"] },
      { id: "qc-banner", name: "Banner Ad", description: "Display advertising assets", formats: ["Image"] },
      { id: "qc-presentation", name: "Presentation", description: "Slide decks and pitches", formats: ["Carousel"] },
      { id: "qc-thumbnail", name: "Thumbnail", description: "Video and post thumbnails", formats: ["Image"] },
    ],
  },
  {
    label: "Video",
    value: "video",
    items: [
      { id: "qc-short-video", name: "Short Video", description: "Under 60 seconds", formats: ["Video"] },
      { id: "qc-promo", name: "Promo Video", description: "Product or brand promotions", formats: ["Video"] },
      { id: "qc-explainer", name: "Explainer Video", description: "Educational how-to videos", formats: ["Video"] },
      { id: "qc-video-ad", name: "Video Ad", description: "Paid video advertising", formats: ["Video"] },
    ],
  },
  {
    label: "Email",
    value: "email",
    items: [
      { id: "qc-newsletter", name: "Newsletter", description: "Regular subscriber updates", formats: ["Text"] },
      { id: "qc-email-campaign", name: "Email Campaign", description: "Multi-touch email sequences", formats: ["Text"] },
      { id: "qc-promo-email", name: "Promotional Email", description: "Product and offer emails", formats: ["Text"] },
      { id: "qc-welcome-email", name: "Welcome Email", description: "Onboarding emails", formats: ["Text"] },
    ],
  },
];

const PROMPT_SUGGESTIONS = [
  "Write about our latest product launch",
  "Share industry insights for Q1",
  "Announce our upcoming event",
  "Highlight customer success story",
];

const AUTO_ASSETS = [
  { id: "auto-1", name: "Brand Positioning", selected: true },
  { id: "auto-2", name: "Core Values", selected: true },
  { id: "auto-3", name: "Marketing Mary Persona", selected: true },
  { id: "auto-4", name: "Brand Story", selected: false },
];

// ────────────────────────────── Component ──────────────────────────────

interface QuickContentModalProps {
  open: boolean;
  onClose: () => void;
}

export function QuickContentModal({ open, onClose }: QuickContentModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("written");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [contextAssets, setContextAssets] = useState(AUTO_ASSETS.map((a) => ({ ...a })));
  const [isCreating, setIsCreating] = useState(false);

  const currentTab = CONTENT_TABS.find((t) => t.value === activeTab);

  const handleCreate = () => {
    setIsCreating(true);
    setTimeout(() => {
      setIsCreating(false);
      onClose();
      router.push("/strategy/campaigns/quick/qc-1");
    }, 1500);
  };

  const toggleAsset = (id: string) => {
    setContextAssets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, selected: !a.selected } : a))
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Quick Content" description="Create a single piece of content quickly. We'll set up a mini-campaign automatically." size="xl">
      <div className="space-y-6">
        {/* Content Type Selection */}
        <div>
          <p className="text-sm font-medium text-text-dark mb-3">Content Type</p>
          <Tabs
            tabs={CONTENT_TABS.map((t) => ({ label: t.label, value: t.value }))}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="pills"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            {currentTab?.items.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedType(item.id)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                  selectedType === item.id
                    ? "border-primary bg-primary/5"
                    : "border-border-dark hover:bg-surface-dark/50"
                )}
              >
                <FileText className="w-4 h-4 text-text-dark/40 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-dark">{item.name}</p>
                  <p className="text-xs text-text-dark/40 truncate">{item.description}</p>
                </div>
                <div className="flex gap-1">
                  {item.formats.map((f) => (
                    <Badge key={f} variant="default" size="sm">{f}</Badge>
                  ))}
                </div>
                {selectedType === item.id && (
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Prompt */}
        <div>
          <p className="text-sm font-medium text-text-dark mb-2">What's it about?</p>
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
              placeholder="Describe the content you want to create..."
              rows={3}
              className="w-full rounded-md border border-border-dark bg-surface-dark px-3 py-2 text-sm text-text-dark placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-background-dark"
            />
            <span className="absolute bottom-2 right-3 text-xs text-text-dark/30">
              {prompt.length}/500
            </span>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {PROMPT_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setPrompt(suggestion)}
                className="text-xs px-3 py-1.5 rounded-full border border-border-dark text-text-dark/60 hover:text-text-dark hover:bg-surface-dark transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Knowledge Context */}
        <div className="border border-border-dark rounded-lg overflow-hidden">
          <button
            onClick={() => setShowContext(!showContext)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-dark/50 transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-text-dark text-left">Knowledge Context</p>
              <p className="text-xs text-text-dark/40 text-left">Auto-selected based on your brand assets</p>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-text-dark/40 transition-transform", showContext && "rotate-180")} />
          </button>
          {showContext && (
            <div className="border-t border-border-dark px-4 py-3 space-y-2">
              {contextAssets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => toggleAsset(asset.id)}
                  className="w-full flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-surface-dark/50 transition-colors"
                >
                  <div className={cn(
                    "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                    asset.selected ? "bg-primary border-primary" : "border-border-dark"
                  )}>
                    {asset.selected && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className="text-sm text-text-dark">{asset.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer note */}
        <p className="text-xs text-text-dark/40 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Content will be saved to a new Quick Campaign
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-border-dark">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          leftIcon={<Sparkles className="w-4 h-4" />}
          onClick={handleCreate}
          loading={isCreating}
          disabled={!selectedType || prompt.trim() === ""}
        >
          Create Content
        </Button>
      </div>
    </Modal>
  );
}
