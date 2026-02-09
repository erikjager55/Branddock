"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Megaphone,
  Target,
  FileText,
  Users,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Pencil,
  Rocket,
  Lightbulb,
  Check,
  Layers,
  TrendingUp,
  Package,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { WizardStepper } from "@/components/strategy/WizardStepper";
import { KnowledgeSelector, type KnowledgeCategory } from "@/components/strategy/KnowledgeSelector";
import { ContentTypeSelector, type ContentTypeTab } from "@/components/strategy/ContentTypeSelector";
import { cn } from "@/lib/utils";

// ────────────────────────────── Placeholder Data ──────────────────────────────

const CAMPAIGN_TYPES = [
  { id: "brand", icon: <Megaphone className="w-6 h-6" />, label: "Brand Campaign", description: "Build awareness and establish brand positioning" },
  { id: "product", icon: <Target className="w-6 h-6" />, label: "Product Campaign", description: "Promote specific products or services" },
  { id: "content", icon: <FileText className="w-6 h-6" />, label: "Content Campaign", description: "Create thought leadership and educational content" },
  { id: "engagement", icon: <Users className="w-6 h-6" />, label: "Engagement Campaign", description: "Drive audience interaction and community building" },
];

const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
  {
    id: "assets",
    label: "Brand Assets",
    icon: <Layers className="w-4 h-4" />,
    items: [
      { id: "ka-1", name: "Mission Statement", badge: { label: "Active", variant: "success" } },
      { id: "ka-2", name: "Brand Vision", badge: { label: "Active", variant: "success" } },
      { id: "ka-3", name: "Core Values", badge: { label: "Draft", variant: "default" } },
      { id: "ka-4", name: "Brand Positioning", badge: { label: "Active", variant: "success" } },
      { id: "ka-5", name: "Brand Promise", badge: { label: "Draft", variant: "default" } },
      { id: "ka-6", name: "Brand Story", badge: { label: "Locked", variant: "warning" } },
    ],
  },
  {
    id: "personas",
    label: "Personas",
    icon: <Users className="w-4 h-4" />,
    items: [
      { id: "kp-1", name: "Marketing Mary", description: "Marketing Director", badge: { label: "87%", variant: "success" } },
      { id: "kp-2", name: "Developer Dave", description: "Frontend Developer", badge: { label: "72%", variant: "info" } },
      { id: "kp-3", name: "Startup Sarah", description: "Founder & CEO", badge: { label: "65%", variant: "info" } },
      { id: "kp-4", name: "Agency Alex", description: "Brand Strategist", badge: { label: "91%", variant: "success" } },
    ],
  },
  {
    id: "products",
    label: "Products & Services",
    icon: <Package className="w-4 h-4" />,
    items: [
      { id: "kpr-1", name: "Branddock Platform", badge: { label: "SaaS", variant: "info" } },
      { id: "kpr-2", name: "Enterprise Plan", badge: { label: "Subscription", variant: "info" } },
      { id: "kpr-3", name: "AI Analysis Engine", badge: { label: "Feature", variant: "default" } },
    ],
  },
  {
    id: "insights",
    label: "Market Insights",
    icon: <TrendingUp className="w-4 h-4" />,
    items: [
      { id: "ki-1", name: "Sustainability Branding Trend", badge: { label: "High", variant: "warning" } },
      { id: "ki-2", name: "Competitor X Premium Tier", badge: { label: "High", variant: "warning" } },
      { id: "ki-3", name: "AI Personalization Trend", badge: { label: "Medium", variant: "info" } },
      { id: "ki-4", name: "Gen Z Loyalty Patterns", badge: { label: "Medium", variant: "info" } },
    ],
  },
];

const MOCK_STRATEGY = {
  confidence: 87,
  approach: "Based on your brand positioning and target personas, we recommend a multi-channel approach that leads with thought leadership content to establish credibility, followed by targeted product messaging to drive conversions. The strategy leverages your strong brand story and validated personas to create deeply resonant content across LinkedIn, email, and blog channels.\n\nKey differentiator: Your AI-powered platform positioning combined with validated persona insights gives you a unique angle in the market that competitors haven't addressed.",
  keyMessages: [
    "AI-powered brand management that turns strategy into action",
    "Built for modern marketing teams who need consistency at scale",
    "From brand foundation to content creation in one platform",
    "Validated by research, powered by intelligence",
  ],
  audienceInsights: "Your primary target (Marketing Mary, CMO-level) shows strongest engagement with thought leadership content on LinkedIn, with peak activity on Tuesday-Thursday mornings. Secondary persona (Startup Sarah) prefers practical, how-to content delivered via email nurture sequences.",
  channels: ["LinkedIn", "Blog", "Email", "Twitter/X", "Webinars"],
};

const DELIVERABLE_TABS: ContentTypeTab[] = [
  {
    label: "Written",
    value: "written",
    items: [
      { id: "d-blog", name: "Blog Post", description: "Long-form articles for your blog", icon: <FileText className="w-4 h-4" />, formats: ["Text"] },
      { id: "d-case", name: "Case Study", description: "Customer success stories", icon: <FileText className="w-4 h-4" />, formats: ["Text"] },
      { id: "d-whitepaper", name: "Whitepaper", description: "In-depth research papers", icon: <FileText className="w-4 h-4" />, formats: ["Text"] },
      { id: "d-press", name: "Press Release", description: "News and announcements", icon: <FileText className="w-4 h-4" />, formats: ["Text"] },
    ],
  },
  {
    label: "Social Media",
    value: "social",
    items: [
      { id: "d-linkedin", name: "LinkedIn Post", description: "Professional network content", icon: <FileText className="w-4 h-4" />, formats: ["Text", "Image"] },
      { id: "d-twitter", name: "Twitter/X Thread", description: "Short-form thread content", icon: <FileText className="w-4 h-4" />, formats: ["Text"] },
      { id: "d-instagram", name: "Instagram Caption", description: "Visual-first social content", icon: <FileText className="w-4 h-4" />, formats: ["Text", "Image"] },
      { id: "d-carousel", name: "Social Carousel", description: "Multi-slide social content", icon: <FileText className="w-4 h-4" />, formats: ["Carousel"] },
    ],
  },
  {
    label: "Visual Assets",
    value: "visual",
    items: [
      { id: "d-infographic", name: "Infographic", description: "Data-driven visual content", icon: <FileText className="w-4 h-4" />, formats: ["Image"] },
      { id: "d-graphics", name: "Social Graphics", description: "Branded social images", icon: <FileText className="w-4 h-4" />, formats: ["Image"] },
      { id: "d-presentation", name: "Presentation", description: "Slide decks and pitches", icon: <FileText className="w-4 h-4" />, formats: ["Carousel"] },
      { id: "d-banner", name: "Banner Ads", description: "Display advertising assets", icon: <FileText className="w-4 h-4" />, formats: ["Image"] },
    ],
  },
  {
    label: "Email",
    value: "email",
    items: [
      { id: "d-newsletter", name: "Newsletter", description: "Regular subscriber updates", icon: <FileText className="w-4 h-4" />, formats: ["Text"] },
      { id: "d-drip", name: "Drip Campaign", description: "Automated email sequences", icon: <FileText className="w-4 h-4" />, formats: ["Text"] },
      { id: "d-promo", name: "Promotional Email", description: "Product and offer emails", icon: <FileText className="w-4 h-4" />, formats: ["Text"] },
      { id: "d-welcome", name: "Welcome Series", description: "Onboarding email sequences", icon: <FileText className="w-4 h-4" />, formats: ["Text"] },
    ],
  },
];

const WIZARD_STEPS = ["Setup", "Knowledge", "Strategy", "Deliverables", "Review"];

// ────────────────────────────── Page Component ──────────────────────────────

export default function NewCampaignWizardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1: Setup
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [campaignType, setCampaignType] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Step 2: Knowledge
  const [selectedKnowledge, setSelectedKnowledge] = useState<string[]>([]);

  // Step 3: Strategy
  const [strategyGenerated, setStrategyGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [strategyApproach, setStrategyApproach] = useState(MOCK_STRATEGY.approach);
  const [approachExpanded, setApproachExpanded] = useState(false);

  // Step 4: Deliverables
  const [selectedDeliverables, setSelectedDeliverables] = useState<Record<string, number>>({});

  // Step 5: Review
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  // Success modal
  const [showSuccess, setShowSuccess] = useState(false);

  const canContinue = useMemo(() => {
    switch (currentStep) {
      case 0:
        return name.trim() !== "" && description.trim() !== "" && campaignType !== null && startDate !== "" && endDate !== "";
      case 1:
        return selectedKnowledge.length > 0;
      case 2:
        return strategyGenerated;
      case 3:
        return Object.keys(selectedDeliverables).length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  }, [currentStep, name, description, campaignType, startDate, endDate, selectedKnowledge, strategyGenerated, selectedDeliverables]);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setStrategyGenerated(true);
      setStrategyApproach(MOCK_STRATEGY.approach);
    }, 2000);
  };

  const handleLaunch = () => {
    setShowSuccess(true);
  };

  const totalDeliverables = Object.values(selectedDeliverables).reduce((s, n) => s + n, 0);

  const getDeliverableName = (id: string) => {
    for (const tab of DELIVERABLE_TABS) {
      const item = tab.items.find((i) => i.id === id);
      if (item) return item.name;
    }
    return id;
  };

  const breadcrumbItems = [
    { label: "Strategy", href: "/strategy" },
    { label: "Campaigns", href: "/strategy/campaigns" },
    { label: "New Campaign" },
  ];

  return (
    <div className="max-w-[900px] mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Breadcrumb items={breadcrumbItems} />
      </div>

      {/* Stepper */}
      <div className="mb-8">
        <WizardStepper steps={WIZARD_STEPS} currentStep={currentStep} />
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {/* ──── Step 1: Setup ──── */}
        {currentStep === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-text-dark mb-1">Campaign Setup</h2>
              <p className="text-sm text-text-dark/40">Define the basics of your campaign</p>
            </div>
            <Input label="Campaign Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Q1 Product Launch" required />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-dark">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your campaign goals and objectives..."
                rows={3}
                className="w-full rounded-md border border-border-dark bg-surface-dark px-3 py-2 text-sm text-text-dark placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-background-dark"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-dark mb-3">Campaign Type</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CAMPAIGN_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setCampaignType(type.id)}
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-lg border text-left transition-all",
                      campaignType === type.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border-dark hover:border-border-dark/80 hover:bg-surface-dark/50"
                    )}
                  >
                    <span className="text-primary mt-0.5">{type.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-text-dark">{type.label}</p>
                      <p className="text-xs text-text-dark/40 mt-0.5">{type.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              <Input label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </div>
          </div>
        )}

        {/* ──── Step 2: Knowledge ──── */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-text-dark mb-1">Select Knowledge</h2>
              <p className="text-sm text-text-dark/40">Choose the validated knowledge that will inform your campaign strategy</p>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
              <Lightbulb className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-200/80">
                The more validated knowledge you select, the more accurate your AI-generated strategy will be.
              </p>
            </div>

            <KnowledgeSelector
              categories={KNOWLEDGE_CATEGORIES}
              selectedIds={selectedKnowledge}
              onSelect={setSelectedKnowledge}
            />

            {selectedKnowledge.length === 0 && (
              <p className="text-sm text-amber-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Select at least 1 knowledge item to continue
              </p>
            )}
          </div>
        )}

        {/* ──── Step 3: Strategy ──── */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-text-dark mb-1">AI Strategy</h2>
              <p className="text-sm text-text-dark/40">Generate a campaign strategy powered by your selected knowledge</p>
            </div>

            {!strategyGenerated ? (
              <Card padding="lg">
                <div className="text-center py-8 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <Sparkles className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-text-dark">Ready to Generate Your Strategy</p>
                    <p className="text-sm text-text-dark/40 mt-1">
                      Based on {selectedKnowledge.length} selected knowledge items
                    </p>
                  </div>
                  <Button variant="primary" onClick={handleGenerate} loading={isGenerating} leftIcon={<Sparkles className="w-4 h-4" />}>
                    Generate Strategy
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Confidence */}
                <Card padding="lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-text-dark">Strategy Confidence</p>
                    <span className="text-sm font-semibold text-primary">{MOCK_STRATEGY.confidence}%</span>
                  </div>
                  <ProgressBar value={MOCK_STRATEGY.confidence} variant="success" size="md" />
                </Card>

                {/* Approach */}
                <Card padding="lg">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-text-dark">Strategic Approach</p>
                    <button onClick={() => setApproachExpanded(!approachExpanded)} className="text-xs text-primary hover:text-primary/80">
                      {approachExpanded ? "Collapse" : "Expand"}
                    </button>
                  </div>
                  {isEditing ? (
                    <textarea
                      value={strategyApproach}
                      onChange={(e) => setStrategyApproach(e.target.value)}
                      rows={8}
                      className="w-full rounded-md border border-border-dark bg-background-dark px-3 py-2 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  ) : (
                    <p className={cn("text-sm text-text-dark/70 whitespace-pre-line", !approachExpanded && "line-clamp-4")}>
                      {strategyApproach}
                    </p>
                  )}
                </Card>

                {/* Key Messages */}
                <Card padding="lg">
                  <p className="text-sm font-semibold text-text-dark mb-3">Key Messages</p>
                  <ul className="space-y-2">
                    {MOCK_STRATEGY.keyMessages.map((msg, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-text-dark/70">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        {msg}
                      </li>
                    ))}
                  </ul>
                </Card>

                {/* Audience Insights */}
                <Card padding="lg">
                  <p className="text-sm font-semibold text-text-dark mb-2">Target Audience Insights</p>
                  <p className="text-sm text-text-dark/70">{MOCK_STRATEGY.audienceInsights}</p>
                </Card>

                {/* Channels */}
                <Card padding="lg">
                  <p className="text-sm font-semibold text-text-dark mb-3">Recommended Channels</p>
                  <div className="flex flex-wrap gap-2">
                    {MOCK_STRATEGY.channels.map((ch) => (
                      <Badge key={ch} variant="info" size="md">{ch}</Badge>
                    ))}
                  </div>
                </Card>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={handleGenerate} loading={isGenerating}>
                    Regenerate
                  </Button>
                  <Button variant="outline" size="sm" leftIcon={<Pencil className="w-4 h-4" />} onClick={() => setIsEditing(!isEditing)}>
                    {isEditing ? "Done Editing" : "Edit Strategy"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ──── Step 4: Deliverables ──── */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-text-dark mb-1">Campaign Deliverables</h2>
              <p className="text-sm text-text-dark/40">Select the content types and quantities for this campaign</p>
            </div>

            <ContentTypeSelector
              tabs={DELIVERABLE_TABS}
              mode="multi"
              selectedTypes={selectedDeliverables}
              onSelectMulti={setSelectedDeliverables}
            />
          </div>
        )}

        {/* ──── Step 5: Review ──── */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-text-dark mb-1">Review & Launch</h2>
              <p className="text-sm text-text-dark/40">Review your campaign before launching</p>
            </div>

            {/* Campaign Details */}
            <Card padding="lg">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-text-dark">Campaign Details</p>
                <button onClick={() => setCurrentStep(0)} className="text-xs text-primary hover:text-primary/80">Edit</button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-text-dark/40">Name</span><span className="text-text-dark">{name}</span></div>
                <div className="flex justify-between"><span className="text-text-dark/40">Type</span><span className="text-text-dark capitalize">{campaignType} Campaign</span></div>
                <div className="flex justify-between"><span className="text-text-dark/40">Timeline</span><span className="text-text-dark">{startDate} — {endDate}</span></div>
              </div>
            </Card>

            {/* Knowledge */}
            <Card padding="lg">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-text-dark">Selected Knowledge</p>
                <button onClick={() => setCurrentStep(1)} className="text-xs text-primary hover:text-primary/80">Edit</button>
              </div>
              <p className="text-sm text-text-dark/60">{selectedKnowledge.length} knowledge items selected</p>
            </Card>

            {/* Strategy */}
            <Card padding="lg">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-text-dark">AI Strategy</p>
                <button onClick={() => setCurrentStep(2)} className="text-xs text-primary hover:text-primary/80">Edit</button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-text-dark/60">Confidence:</span>
                <ProgressBar value={MOCK_STRATEGY.confidence} size="sm" variant="success" className="flex-1 max-w-[200px]" />
                <span className="text-sm font-semibold text-primary">{MOCK_STRATEGY.confidence}%</span>
              </div>
            </Card>

            {/* Deliverables */}
            <Card padding="lg">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-text-dark">Deliverables</p>
                <button onClick={() => setCurrentStep(3)} className="text-xs text-primary hover:text-primary/80">Edit</button>
              </div>
              <div className="space-y-1.5">
                {Object.entries(selectedDeliverables).map(([id, qty]) => (
                  <div key={id} className="flex items-center justify-between text-sm">
                    <span className="text-text-dark/60">{getDeliverableName(id)}</span>
                    <Badge variant="default" size="sm">{qty}x</Badge>
                  </div>
                ))}
              </div>
              <p className="text-xs text-text-dark/40 mt-3 pt-3 border-t border-border-dark">
                {totalDeliverables} total deliverables
              </p>
            </Card>

            {/* Estimated Timeline */}
            <Card padding="lg">
              <p className="text-sm font-semibold text-text-dark mb-2">Estimated Timeline</p>
              <p className="text-sm text-text-dark/60">Based on {totalDeliverables} deliverables, estimated completion in 2-4 weeks</p>
            </Card>

            {/* Save as template */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                  saveAsTemplate ? "bg-primary border-primary" : "border-border-dark"
                )}
                onClick={() => setSaveAsTemplate(!saveAsTemplate)}
              >
                {saveAsTemplate && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="text-sm text-text-dark">Save as template for future campaigns</span>
            </label>

            {/* Launch */}
            <Button variant="primary" fullWidth onClick={handleLaunch} leftIcon={<Rocket className="w-4 h-4" />} size="lg">
              Launch Campaign
            </Button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border-dark">
        <Button
          variant="ghost"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => {
            if (currentStep === 0) router.push("/strategy/campaigns");
            else setCurrentStep(currentStep - 1);
          }}
        >
          {currentStep === 0 ? "Cancel" : "Back"}
        </Button>
        {currentStep < 4 && (
          <Button
            variant="primary"
            rightIcon={<ArrowRight className="w-4 h-4" />}
            onClick={() => setCurrentStep(currentStep + 1)}
            disabled={!canContinue}
          >
            Continue
          </Button>
        )}
      </div>

      {/* Success Modal */}
      <Modal open={showSuccess} onClose={() => setShowSuccess(false)} title="Campaign Launched!" size="sm">
        <div className="text-center space-y-4 py-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <p className="text-lg font-semibold text-text-dark">Campaign Launched!</p>
            <p className="text-sm text-text-dark/40 mt-1">"{name}" is ready to go.</p>
          </div>
          <div className="space-y-2 pt-2">
            <Button variant="primary" fullWidth onClick={() => router.push("/strategy/campaigns/campaign-launch-2025")}>
              View Campaign
            </Button>
            <Button variant="secondary" fullWidth onClick={() => router.push("/strategy/campaigns/campaign-launch-2025/content/new")}>
              Create First Content
            </Button>
            <button onClick={() => router.push("/strategy/campaigns")} className="text-sm text-text-dark/40 hover:text-text-dark transition-colors">
              Back to Campaigns
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
