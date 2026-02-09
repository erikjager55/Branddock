"use client";

import { useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Sparkles,
  Save,
  Eye,
  Download,
  MoreVertical,
  ChevronDown,
  Check,
  Clock,
  FileText,
  ImageIcon,
  Film,
  Columns3,
  Copy,
  Share2,
  Trash2,
  Lightbulb,
  ArrowRight,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Dropdown } from "@/components/ui/Dropdown";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

// ────────────────────────────── Types ──────────────────────────────

type ContentTab = "text" | "images" | "video" | "carousel";

interface ResearchInsight {
  id: string;
  text: string;
  source: string;
}

interface VersionEntry {
  id: string;
  label: string;
  timestamp: string;
  isCurrent: boolean;
}

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

interface QualityMetric {
  label: string;
  score: number;
  maxScore: number;
}

interface ImproveSuggestion {
  id: string;
  metric: string;
  current: string;
  suggested: string;
  impact: number;
}

// ────────────────────────────── Placeholder Data ──────────────────────────────

const CONTENT_DATA: Record<string, {
  title: string;
  type: string;
  campaign: string;
  campaignId: string;
  body: string;
}> = {
  "cl-1": {
    title: "AI Trends in Marketing 2026",
    type: "Blog Post",
    campaign: "Q1 Product Launch",
    campaignId: "campaign-launch-2025",
    body: `The marketing landscape is undergoing a seismic shift. Artificial intelligence is no longer a futuristic concept — it's the driving force behind the most successful brand strategies of 2026.\n\nFrom predictive analytics to automated content generation, AI tools are empowering marketing teams to work smarter, not harder. Here's what every brand manager needs to know.\n\n## 1. Hyper-Personalization at Scale\n\nAI algorithms now analyze thousands of data points per customer interaction, enabling brands to deliver truly personalized experiences across every touchpoint. Gone are the days of one-size-fits-all messaging.\n\n## 2. Predictive Brand Health Monitoring\n\nReal-time brand sentiment analysis powered by NLP models can now predict PR crises before they happen, giving teams crucial hours to prepare responses.\n\n## 3. Automated Content Quality Scoring\n\nNew AI models can evaluate content against brand guidelines, readability standards, and audience preferences before publication — ensuring consistent quality at scale.\n\n## 4. AI-Driven Campaign Optimization\n\nMachine learning algorithms continuously optimize campaign performance across channels, reallocating budget in real-time based on conversion signals.\n\n## 5. Intelligent Brand Consistency\n\nAI-powered tools now monitor every piece of content across all channels, flagging inconsistencies and suggesting corrections to maintain brand integrity.`,
  },
  "cl-3": {
    title: "LinkedIn Post Series - Week 1",
    type: "LinkedIn Post",
    campaign: "LinkedIn Post Series",
    campaignId: "campaign-brand-awareness",
    body: "The brands that will win in 2026 aren't the ones with the biggest budgets.\n\nThey're the ones with the most consistent message.\n\nHere's what we've learned after analyzing 500+ enterprise brands:\n\n1. Consistency beats creativity (3x higher recall)\n2. AI-powered quality checks reduce brand drift by 60%\n3. Campaign-driven content outperforms ad hoc by 4:1\n\nThe question isn't whether to invest in brand consistency — it's whether you can afford not to.\n\nWhat's your brand's biggest consistency challenge? Drop it in the comments.",
  },
};

const DEFAULT_CONTENT = {
  title: "Untitled Content",
  type: "Blog Post",
  campaign: "Campaign",
  campaignId: "campaign-launch-2025",
  body: "Start writing your content here...",
};

const KNOWLEDGE_ASSETS = [
  { id: "ka-1", name: "Brand Positioning", selected: true },
  { id: "ka-2", name: "Core Values", selected: true },
  { id: "ka-3", name: "Marketing Mary Persona", selected: true },
  { id: "ka-4", name: "Product: Branddock Platform", selected: false },
];

const RESEARCH_INSIGHTS: ResearchInsight[] = [
  { id: "ri-1", text: "87% of marketers say AI will be essential for brand consistency by 2027", source: "Marketing AI Report 2026" },
  { id: "ri-2", text: "Brands with consistent messaging see 3.5x higher customer retention", source: "Brand Consistency Study" },
  { id: "ri-3", text: "AI-powered content achieves 23% higher engagement than manual content", source: "Content Performance Benchmark" },
];

const QUALITY_METRICS: QualityMetric[] = [
  { label: "Brand Alignment", score: 88, maxScore: 100 },
  { label: "Audience Fit", score: 82, maxScore: 100 },
  { label: "Research Backed", score: 75, maxScore: 100 },
  { label: "Readability", score: 84, maxScore: 100 },
];

const CHECKLIST: ChecklistItem[] = [
  { id: "ck-1", label: "Brand voice consistent", checked: true },
  { id: "ck-2", label: "Target audience addressed", checked: true },
  { id: "ck-3", label: "Call to action present", checked: true },
  { id: "ck-4", label: "Research backed claims", checked: false },
  { id: "ck-5", label: "Formatting complete", checked: false },
];

const VERSIONS: VersionEntry[] = [
  { id: "v-1", label: "Current version", timestamp: "2 min ago", isCurrent: true },
  { id: "v-2", label: "AI revision", timestamp: "15 min ago", isCurrent: false },
  { id: "v-3", label: "First draft", timestamp: "1 hour ago", isCurrent: false },
];

const IMPROVE_SUGGESTIONS: ImproveSuggestion[] = [
  { id: "is-1", metric: "Research Backed", current: "Generic claim about AI adoption", suggested: "Include specific statistic: 87% of marketers say AI will be essential by 2027", impact: 8 },
  { id: "is-2", metric: "Audience Fit", current: "Technical jargon in paragraph 3", suggested: "Simplify language: Replace 'NLP models' with 'language analysis tools'", impact: 5 },
  { id: "is-3", metric: "Brand Alignment", current: "Missing brand sign-off phrase", suggested: "Add closing line: 'Building brands that resonate — powered by intelligence.'", impact: 4 },
];

const PROMPT_CHIPS = [
  "Make it more professional",
  "Add data points",
  "Shorten to 500 words",
  "Add a call to action",
];

// ────────────────────────────── Component ──────────────────────────────

export default function ContentStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const content = CONTENT_DATA[id] || DEFAULT_CONTENT;

  const [activeTab, setActiveTab] = useState<ContentTab>("text");
  const [body, setBody] = useState(content.body);
  const [prompt, setPrompt] = useState("");
  const [showImprovePanel, setShowImprovePanel] = useState(false);
  const [checklist, setChecklist] = useState(CHECKLIST);
  const [knowledgeAssets, setKnowledgeAssets] = useState(KNOWLEDGE_ASSETS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(1);
  const totalSlides = 5;

  // Settings per tab
  const [textModel, setTextModel] = useState("gpt4");
  const [textTone, setTextTone] = useState("professional");
  const [textLength, setTextLength] = useState("medium");
  const [textAudience, setTextAudience] = useState("marketers");
  const [imageAspect, setImageAspect] = useState("landscape");
  const [imageStyle, setImageStyle] = useState("photorealistic");
  const [videoDuration, setVideoDuration] = useState("30");
  const [videoStyle, setVideoStyle] = useState("motion-graphics");
  const [videoMusic, setVideoMusic] = useState(false);
  const [carouselModel, setCarouselModel] = useState("gpt4");
  const [carouselSlides, setCarouselSlides] = useState(5);
  const [carouselAspect, setCarouselAspect] = useState("square");

  const overallQuality = Math.round(
    QUALITY_METRICS.reduce((s, m) => s + m.score, 0) / QUALITY_METRICS.length
  );
  const checklistDone = checklist.filter((c) => c.checked).length;
  const selectedAssets = knowledgeAssets.filter((a) => a.selected).length;
  const confidencePercent = Math.round((selectedAssets / knowledgeAssets.length) * 100);

  const hasGenerated = body !== DEFAULT_CONTENT.body && body.length > 50;

  const tabConfig: { value: ContentTab; label: string; icon: React.ReactNode }[] = [
    { value: "text", label: "Text", icon: <FileText className="w-4 h-4" /> },
    { value: "images", label: "Images", icon: <ImageIcon className="w-4 h-4" /> },
    { value: "video", label: "Video", icon: <Film className="w-4 h-4" /> },
    { value: "carousel", label: "Carousel", icon: <Columns3 className="w-4 h-4" /> },
  ];

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 2000);
  };

  const toggleChecklistItem = (itemId: string) => {
    setChecklist((prev) =>
      prev.map((c) => (c.id === itemId ? { ...c, checked: !c.checked } : c))
    );
  };

  const toggleAsset = (assetId: string) => {
    setKnowledgeAssets((prev) =>
      prev.map((a) => (a.id === assetId ? { ...a, selected: !a.selected } : a))
    );
  };

  const breadcrumbItems = [
    { label: "Campaigns", href: "/strategy/campaigns" },
    { label: content.campaign, href: `/strategy/campaigns/${content.campaignId}` },
    { label: content.title },
  ];

  function qualityColor(score: number): string {
    if (score >= 85) return "text-emerald-400";
    if (score >= 65) return "text-amber-400";
    return "text-red-400";
  }

  function qualityBarColor(score: number): string {
    if (score >= 85) return "bg-emerald-400";
    if (score >= 65) return "bg-amber-400";
    return "bg-red-400";
  }

  // ────────────── Radio helper ──────────────

  function RadioGroup({
    label,
    options,
    value,
    onChange,
  }: {
    label: string;
    options: { value: string; label: string }[];
    value: string;
    onChange: (v: string) => void;
  }) {
    return (
      <div>
        <p className="text-xs font-medium text-text-dark/40 uppercase tracking-wide mb-2">{label}</p>
        <div className="space-y-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={cn(
                "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors text-left",
                value === opt.value
                  ? "bg-primary/10 text-primary"
                  : "text-text-dark/60 hover:bg-surface-dark/50"
              )}
            >
              <div className={cn(
                "w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                value === opt.value ? "border-primary" : "border-border-dark"
              )}>
                {value === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
              </div>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ────────────── Render ──────────────

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] -mt-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-4 border-b border-border-dark flex-shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <div className="min-w-0">
            <Breadcrumb items={breadcrumbItems} />
            <div className="flex items-center gap-2 mt-1">
              <h1 className="text-lg font-semibold text-text-dark truncate">{content.title}</h1>
              <Badge variant="default" size="sm">{content.type}</Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-text-dark/40 hidden sm:block">
            <Clock className="w-3 h-3 inline -mt-0.5 mr-1" />
            Auto-saved 2m ago
          </span>
          <Button variant="ghost" size="sm" leftIcon={<Eye className="w-4 h-4" />}>
            Preview
          </Button>
          <Dropdown
            trigger={
              <Button variant="ghost" size="sm" rightIcon={<ChevronDown className="w-3.5 h-3.5" />}>
                <Download className="w-4 h-4" />
              </Button>
            }
            items={[
              { label: "Export as Markdown", onClick: () => {} },
              { label: "Export as HTML", onClick: () => {} },
              { label: "Export as PDF", onClick: () => {} },
              { label: "Copy to Clipboard", icon: <Copy className="w-4 h-4" />, onClick: () => {} },
            ]}
            align="right"
          />
          <Button variant="primary" size="sm" leftIcon={<Save className="w-4 h-4" />}>
            Save
          </Button>
          <Dropdown
            trigger={
              <button className="p-2 rounded-md text-text-dark/40 hover:text-text-dark hover:bg-surface-dark transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            }
            items={[
              { label: "Duplicate", icon: <Copy className="w-4 h-4" />, onClick: () => {} },
              { label: "Share with team", icon: <Share2 className="w-4 h-4" />, onClick: () => {} },
              "separator",
              { label: "Delete", icon: <Trash2 className="w-4 h-4" />, onClick: () => {}, danger: true },
            ]}
            align="right"
          />
        </div>
      </div>

      {/* Main 3-column layout */}
      <div className="flex flex-1 overflow-hidden mt-4 gap-4">
        {/* Left Panel */}
        <aside className="w-[300px] flex-shrink-0 overflow-y-auto space-y-4 pr-2">
          {/* Prompt */}
          <div>
            <p className="text-xs font-medium text-text-dark/40 uppercase tracking-wide mb-2">Prompt</p>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
                placeholder="Describe what you want to create..."
                rows={3}
                className="w-full rounded-md border border-border-dark bg-surface-dark px-3 py-2 text-sm text-text-dark placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-background-dark resize-none"
              />
              <span className="absolute bottom-2 right-3 text-[10px] text-text-dark/30">{prompt.length}/500</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PROMPT_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => setPrompt(chip)}
                  className="text-[10px] px-2 py-1 rounded-full border border-border-dark text-text-dark/50 hover:text-text-dark hover:bg-surface-dark transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Tab-specific settings */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-text-dark/40 uppercase tracking-wide">Settings</p>

            {activeTab === "text" && (
              <>
                <RadioGroup
                  label="AI Model"
                  options={[
                    { value: "gpt4", label: "GPT-4" },
                    { value: "claude", label: "Claude" },
                    { value: "gemini", label: "Gemini" },
                  ]}
                  value={textModel}
                  onChange={setTextModel}
                />
                <RadioGroup
                  label="Tone of Voice"
                  options={[
                    { value: "professional", label: "Professional" },
                    { value: "casual", label: "Casual" },
                    { value: "bold", label: "Bold" },
                    { value: "friendly", label: "Friendly" },
                  ]}
                  value={textTone}
                  onChange={setTextTone}
                />
                <RadioGroup
                  label="Target Length"
                  options={[
                    { value: "short", label: "Short (~500 words)" },
                    { value: "medium", label: "Medium (~1000 words)" },
                    { value: "long", label: "Long (~1500+ words)" },
                  ]}
                  value={textLength}
                  onChange={setTextLength}
                />
              </>
            )}

            {activeTab === "images" && (
              <>
                <div>
                  <p className="text-xs font-medium text-text-dark/40 uppercase tracking-wide mb-2">AI Model</p>
                  <div className="px-2.5 py-1.5 rounded-md bg-surface-dark/50 text-xs text-text-dark/60">
                    Gemini (Image Generation)
                  </div>
                </div>
                <RadioGroup
                  label="Aspect Ratio"
                  options={[
                    { value: "square", label: "Square (1:1)" },
                    { value: "landscape", label: "Landscape (16:9)" },
                    { value: "portrait", label: "Portrait (9:16)" },
                  ]}
                  value={imageAspect}
                  onChange={setImageAspect}
                />
                <RadioGroup
                  label="Visual Style"
                  options={[
                    { value: "photorealistic", label: "Photorealistic" },
                    { value: "illustrated", label: "Illustrated" },
                    { value: "abstract", label: "Abstract" },
                    { value: "minimalist", label: "Minimalist" },
                  ]}
                  value={imageStyle}
                  onChange={setImageStyle}
                />
              </>
            )}

            {activeTab === "video" && (
              <>
                <div>
                  <p className="text-xs font-medium text-text-dark/40 uppercase tracking-wide mb-2">AI Model</p>
                  <div className="px-2.5 py-1.5 rounded-md bg-surface-dark/50 text-xs text-text-dark/60">
                    Veo (Video Generation)
                  </div>
                </div>
                <RadioGroup
                  label="Duration"
                  options={[
                    { value: "15", label: "15 seconds" },
                    { value: "30", label: "30 seconds" },
                    { value: "45", label: "45 seconds" },
                    { value: "60", label: "60 seconds" },
                  ]}
                  value={videoDuration}
                  onChange={setVideoDuration}
                />
                <RadioGroup
                  label="Video Style"
                  options={[
                    { value: "motion-graphics", label: "Motion Graphics" },
                    { value: "live-action", label: "Live Action" },
                    { value: "animation", label: "Animation" },
                    { value: "cinematic", label: "Cinematic" },
                  ]}
                  value={videoStyle}
                  onChange={setVideoStyle}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-dark/60">Background Music</span>
                  <button
                    onClick={() => setVideoMusic(!videoMusic)}
                    className={cn(
                      "w-8 h-5 rounded-full transition-colors relative",
                      videoMusic ? "bg-primary" : "bg-border-dark"
                    )}
                  >
                    <div className={cn(
                      "w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform",
                      videoMusic ? "translate-x-3.5" : "translate-x-0.5"
                    )} />
                  </button>
                </div>
              </>
            )}

            {activeTab === "carousel" && (
              <>
                <RadioGroup
                  label="AI Model"
                  options={[
                    { value: "gpt4", label: "GPT-4" },
                    { value: "claude", label: "Claude" },
                    { value: "gemini", label: "Gemini" },
                  ]}
                  value={carouselModel}
                  onChange={setCarouselModel}
                />
                <div>
                  <p className="text-xs font-medium text-text-dark/40 uppercase tracking-wide mb-2">Slide Count</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCarouselSlides(Math.max(3, carouselSlides - 1))}
                      className="w-7 h-7 rounded border border-border-dark flex items-center justify-center text-text-dark/60 hover:text-text-dark transition-colors"
                    >
                      -
                    </button>
                    <span className="text-sm font-semibold text-text-dark w-6 text-center">{carouselSlides}</span>
                    <button
                      onClick={() => setCarouselSlides(Math.min(10, carouselSlides + 1))}
                      className="w-7 h-7 rounded border border-border-dark flex items-center justify-center text-text-dark/60 hover:text-text-dark transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
                <RadioGroup
                  label="Aspect Ratio"
                  options={[
                    { value: "square", label: "Square (1:1)" },
                    { value: "story", label: "Story (9:16)" },
                    { value: "landscape", label: "Landscape (16:9)" },
                  ]}
                  value={carouselAspect}
                  onChange={setCarouselAspect}
                />
              </>
            )}
          </div>

          {/* Knowledge Context */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-text-dark/40 uppercase tracking-wide">Knowledge Context</p>
              <Badge variant="info" size="sm">
                <Sparkles className="w-3 h-3" />
                {confidencePercent}% Confidence
              </Badge>
            </div>
            <div className="space-y-1">
              {knowledgeAssets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => toggleAsset(asset.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-dark/50 transition-colors"
                >
                  <div className={cn(
                    "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                    asset.selected ? "bg-primary border-primary" : "border-border-dark"
                  )}>
                    {asset.selected && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className="text-xs text-text-dark">{asset.name}</span>
                </button>
              ))}
            </div>
            <button className="text-xs text-primary hover:text-primary/80 mt-2 transition-colors">
              Edit Context
            </button>
          </div>

          {/* Generate button */}
          <Button
            variant="primary"
            fullWidth
            leftIcon={<Sparkles className="w-4 h-4" />}
            onClick={handleGenerate}
            loading={isGenerating}
          >
            Generate {activeTab === "text" ? "Text" : activeTab === "images" ? "Image" : activeTab === "video" ? "Video" : "Carousel"}
          </Button>
          <p className="text-[10px] text-text-dark/30 text-center">
            Estimated cost: ~$0.02
          </p>
        </aside>

        {/* Center Panel (Canvas/Editor) */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Content Type Tabs */}
          <div className="flex items-center gap-1 mb-3 flex-shrink-0">
            {tabConfig.map((tab) => {
              const isDisabled = hasGenerated && tab.value !== activeTab && tab.value !== "text";
              return (
                <Tooltip
                  key={tab.value}
                  content={isDisabled ? "Locked — content already generated" : tab.label}
                  side="bottom"
                >
                  <button
                    onClick={() => !isDisabled && setActiveTab(tab.value)}
                    disabled={isDisabled}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      activeTab === tab.value
                        ? "bg-primary/10 text-primary"
                        : isDisabled
                          ? "text-text-dark/20 cursor-not-allowed"
                          : "text-text-dark/60 hover:text-text-dark hover:bg-surface-dark"
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                </Tooltip>
              );
            })}
          </div>

          {/* Editor Area */}
          <div className="flex-1 rounded-lg border border-border-dark overflow-hidden flex flex-col">
            {activeTab === "text" && (
              <>
                {/* Formatting toolbar */}
                <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-border-dark bg-surface-dark/30 flex-shrink-0">
                  {[
                    { icon: Bold, label: "Bold" },
                    { icon: Italic, label: "Italic" },
                    { icon: Underline, label: "Underline" },
                    null,
                    { icon: Heading1, label: "Heading 1" },
                    { icon: Heading2, label: "Heading 2" },
                    null,
                    { icon: List, label: "Bullet List" },
                    { icon: ListOrdered, label: "Numbered List" },
                    null,
                    { icon: AlignLeft, label: "Align Left" },
                    { icon: AlignCenter, label: "Align Center" },
                    { icon: AlignRight, label: "Align Right" },
                    null,
                    { icon: LinkIcon, label: "Link" },
                    { icon: Image, label: "Image" },
                  ].map((btn, i) =>
                    !btn ? (
                      <div key={`d-${i}`} className="w-px h-5 bg-border-dark mx-1" />
                    ) : (
                      <button
                        key={btn.label}
                        title={btn.label}
                        className="p-1.5 rounded hover:bg-surface-dark text-text-dark/40 hover:text-text-dark transition-colors"
                      >
                        <btn.icon className="w-4 h-4" />
                      </button>
                    )
                  )}
                </div>
                {/* Text editor */}
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="flex-1 w-full p-6 bg-transparent text-sm text-text-dark placeholder:text-text-dark/30 resize-none outline-none leading-relaxed"
                  placeholder="Start writing your content..."
                />
              </>
            )}

            {activeTab === "images" && (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="w-full max-w-lg aspect-video rounded-lg border-2 border-dashed border-border-dark flex items-center justify-center bg-surface-dark/30">
                  <div className="text-center">
                    <ImageIcon className="w-12 h-12 text-text-dark/20 mx-auto mb-3" />
                    <p className="text-sm text-text-dark/40">Generated image will appear here</p>
                    <p className="text-xs text-text-dark/30 mt-1">Click &quot;Generate Image&quot; to create</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <button className="p-2 rounded-md border border-border-dark text-text-dark/40 hover:text-text-dark transition-colors">
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-text-dark/40 w-12 text-center">100%</span>
                  <button className="p-2 rounded-md border border-border-dark text-text-dark/40 hover:text-text-dark transition-colors">
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {activeTab === "video" && (
              <div className="flex-1 flex flex-col">
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="w-full max-w-lg aspect-video rounded-lg bg-black/50 flex items-center justify-center">
                    <button className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                      <Play className="w-8 h-8 text-white ml-1" />
                    </button>
                  </div>
                </div>
                {/* Timeline */}
                <div className="border-t border-border-dark px-4 py-3 flex items-center gap-3 flex-shrink-0">
                  <button className="text-text-dark/40 hover:text-text-dark transition-colors">
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <button className="text-text-dark/40 hover:text-text-dark transition-colors">
                    <Play className="w-4 h-4" />
                  </button>
                  <button className="text-text-dark/40 hover:text-text-dark transition-colors">
                    <SkipForward className="w-4 h-4" />
                  </button>
                  <div className="flex-1 h-1 rounded-full bg-border-dark/50">
                    <div className="w-0 h-full rounded-full bg-primary" />
                  </div>
                  <span className="text-xs text-text-dark/40">0:00 / 0:{videoDuration}</span>
                </div>
              </div>
            )}

            {activeTab === "carousel" && (
              <div className="flex-1 flex flex-col">
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="w-full max-w-sm aspect-square rounded-lg border-2 border-dashed border-border-dark flex items-center justify-center bg-surface-dark/30">
                    <div className="text-center">
                      <Columns3 className="w-12 h-12 text-text-dark/20 mx-auto mb-3" />
                      <p className="text-sm text-text-dark/40">Slide {currentSlide} of {totalSlides}</p>
                      <p className="text-xs text-text-dark/30 mt-1">Generate carousel to see slides</p>
                    </div>
                  </div>
                </div>
                {/* Slide navigation */}
                <div className="border-t border-border-dark px-4 py-3 flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => setCurrentSlide(Math.max(1, currentSlide - 1))}
                    className="text-text-dark/40 hover:text-text-dark transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-1.5 flex-1 overflow-x-auto">
                    {Array.from({ length: totalSlides }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentSlide(i + 1)}
                        className={cn(
                          "w-12 h-9 rounded border flex-shrink-0 flex items-center justify-center text-[10px] transition-colors",
                          currentSlide === i + 1
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border-dark text-text-dark/40 hover:bg-surface-dark"
                        )}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentSlide(Math.min(totalSlides, currentSlide + 1))}
                    className="text-text-dark/40 hover:text-text-dark transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <aside className={cn(
          "flex-shrink-0 overflow-y-auto space-y-4 pl-2 transition-all",
          showImprovePanel ? "w-[340px]" : "w-[280px]"
        )}>
          {showImprovePanel ? (
            /* Improve Score Panel */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-dark">Improve Score</h3>
                <button
                  onClick={() => setShowImprovePanel(false)}
                  className="p-1 rounded-md text-text-dark/40 hover:text-text-dark hover:bg-surface-dark transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Score summary */}
              <div className="flex items-center gap-4 p-3 rounded-lg bg-surface-dark/50">
                <div className="text-center">
                  <p className="text-xs text-text-dark/40">Current</p>
                  <p className={cn("text-2xl font-bold", qualityColor(overallQuality))}>{overallQuality}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-text-dark/20" />
                <div className="text-center">
                  <p className="text-xs text-text-dark/40">Target</p>
                  <p className="text-2xl font-bold text-text-dark/30">95+</p>
                </div>
                <ArrowRight className="w-4 h-4 text-text-dark/20" />
                <div className="text-center">
                  <p className="text-xs text-text-dark/40">Potential</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {Math.min(100, overallQuality + IMPROVE_SUGGESTIONS.reduce((s, i) => s + i.impact, 0))}
                  </p>
                </div>
              </div>

              {/* Score breakdown */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-text-dark/40 uppercase tracking-wide">Score Breakdown</p>
                {QUALITY_METRICS.map((m) => {
                  const suggestion = IMPROVE_SUGGESTIONS.find((s) => s.metric === m.label);
                  return (
                    <div key={m.label} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-dark/60">{m.label}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium text-text-dark">{m.score}</span>
                          {suggestion && (
                            <span className="text-[10px] text-emerald-400">+{suggestion.impact} pts</span>
                          )}
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-border-dark/30 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", qualityBarColor(m.score))}
                          style={{ width: `${m.score}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Suggestions */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-text-dark/40 uppercase tracking-wide">Suggestions</p>
                {IMPROVE_SUGGESTIONS.map((suggestion) => (
                  <div key={suggestion.id} className="p-3 rounded-lg border border-border-dark space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="info" size="sm">{suggestion.metric}</Badge>
                      <span className="text-[10px] text-emerald-400 font-medium">+{suggestion.impact} pts</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-red-400/80 line-through">{suggestion.current}</p>
                      <p className="text-xs text-emerald-400/80">{suggestion.suggested}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button variant="ghost" size="sm">Preview</Button>
                      <Button variant="primary" size="sm">Apply</Button>
                      <Button variant="ghost" size="sm">Dismiss</Button>
                    </div>
                  </div>
                ))}
              </div>

              <Button variant="primary" fullWidth leftIcon={<Sparkles className="w-4 h-4" />}>
                Apply All Suggestions ({IMPROVE_SUGGESTIONS.length} changes)
              </Button>
            </div>
          ) : (
            /* Normal right panel */
            <>
              {/* Quality Score */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-text-dark">Content Quality</h3>
                </div>
                <div className="flex items-center gap-4 mb-3">
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-border-dark/30" />
                      <circle
                        cx="32" cy="32" r="28" fill="none" strokeWidth="4"
                        className={qualityColor(overallQuality)}
                        stroke="currentColor"
                        strokeDasharray={`${(overallQuality / 100) * 176} 176`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className={cn("absolute inset-0 flex items-center justify-center text-lg font-bold", qualityColor(overallQuality))}>
                      {overallQuality}
                    </span>
                  </div>
                  <div className="flex-1 space-y-2">
                    {QUALITY_METRICS.map((m) => (
                      <div key={m.label} className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-text-dark/50">{m.label}</span>
                          <span className="text-[10px] font-medium text-text-dark">{m.score}</span>
                        </div>
                        <div className="h-1 rounded-full bg-border-dark/30 overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", qualityBarColor(m.score))}
                            style={{ width: `${m.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  variant="secondary"
                  fullWidth
                  size="sm"
                  leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                  onClick={() => setShowImprovePanel(true)}
                >
                  Improve Score
                </Button>
              </div>

              {/* Research Insights */}
              <div>
                <h3 className="text-sm font-semibold text-text-dark mb-2">Research Insights</h3>
                <div className="space-y-2">
                  {RESEARCH_INSIGHTS.map((insight) => (
                    <div key={insight.id} className="p-2.5 rounded-lg bg-surface-dark/50 space-y-1.5">
                      <p className="text-xs text-text-dark/70 leading-relaxed">{insight.text}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-text-dark/30">{insight.source}</span>
                        <button className="text-[10px] text-primary hover:text-primary/80 font-medium transition-colors">
                          Insert
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Content Checklist */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-text-dark">Content Checklist</h3>
                  <span className="text-xs text-text-dark/40">{checklistDone}/{checklist.length}</span>
                </div>
                <div className="space-y-1">
                  {checklist.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => toggleChecklistItem(item.id)}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-surface-dark/50 transition-colors"
                    >
                      <div className={cn(
                        "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                        item.checked ? "bg-primary border-primary" : "border-border-dark"
                      )}>
                        {item.checked && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className={cn(
                        "text-xs transition-colors",
                        item.checked ? "text-text-dark/40 line-through" : "text-text-dark"
                      )}>
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Version History */}
              <div>
                <h3 className="text-sm font-semibold text-text-dark mb-2">Version History</h3>
                <div className="space-y-1">
                  {VERSIONS.map((v) => (
                    <div
                      key={v.id}
                      className={cn(
                        "flex items-center justify-between px-2 py-1.5 rounded-md",
                        v.isCurrent ? "bg-primary/10" : "hover:bg-surface-dark/50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-text-dark/30 flex-shrink-0" />
                        <div>
                          <p className={cn("text-xs font-medium", v.isCurrent ? "text-primary" : "text-text-dark/60")}>{v.label}</p>
                          <p className="text-[10px] text-text-dark/30">{v.timestamp}</p>
                        </div>
                      </div>
                      {!v.isCurrent && (
                        <button className="text-[10px] text-primary hover:text-primary/80 font-medium transition-colors">
                          Restore
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
