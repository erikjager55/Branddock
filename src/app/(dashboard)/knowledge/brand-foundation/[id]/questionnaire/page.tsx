"use client";

import { useState } from "react";
import { use } from "react";
import {
  Plus,
  Send,
  Link as LinkIcon,
  Copy,
  Upload,
  BarChart3,
  Trash2,
  GripVertical,
  ArrowLeft,
  ArrowRight,
  Check,
  Lock,
  Sparkles,
  RefreshCw,
  ChevronDown,
  AlertTriangle,
  MessageSquare,
  Users,
  Mail,
  Download,
  Share2,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/Toggle";
import { Tabs } from "@/components/ui/Tabs";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { WizardStepper } from "@/components/strategy/WizardStepper";
import { cn } from "@/lib/utils";

// ── Data ──

interface Questionnaire {
  id: string;
  title: string;
  status: "Draft" | "Collecting" | "Analyzed";
  questions: number;
  responses: number;
  responseRate: number;
}

const QUESTIONNAIRES: Questionnaire[] = [
  { id: "qs-1", title: "Brand Perception Survey Q1", status: "Analyzed", questions: 15, responses: 42, responseRate: 84 },
  { id: "qs-2", title: "Customer Value Assessment", status: "Collecting", questions: 10, responses: 18, responseRate: 45 },
  { id: "qs-3", title: "Employee Brand Alignment", status: "Draft", questions: 8, responses: 0, responseRate: 0 },
];

const DESIGN_QUESTIONS = [
  { id: "dq-1", type: "Open", text: "How would you describe our brand in three words?", asset: "Brand Positioning", required: true },
  { id: "dq-2", type: "Rating", text: "Rate our brand's trustworthiness (1-10)", asset: "Core Values", required: true },
  { id: "dq-3", type: "MC", text: "Which of these values best represents our brand?", asset: "Core Values", required: false },
  { id: "dq-4", type: "Open", text: "What is the biggest challenge our brand helps you solve?", asset: "Brand Positioning", required: true },
];

const AI_INSIGHTS = [
  "Strong brand awareness among existing customers (87% positive recall)",
  "Value proposition clarity needs improvement — 34% of respondents couldn't articulate key benefits",
  "Brand personality perceived as 'innovative' and 'reliable' — aligns with strategic goals",
  "Gap identified between intended and perceived brand positioning in the mid-market segment",
];

const WIZARD_STEPS = ["Design", "Distribution", "Recipients", "Collect", "Analyze"];

const STATUS_CONFIG: Record<string, { variant: "default" | "info" | "success"; label: string }> = {
  Draft: { variant: "default", label: "Draft" },
  Collecting: { variant: "info", label: "Collecting" },
  Analyzed: { variant: "success", label: "Analyzed" },
};

// ── Component ──

export default function QuestionnairePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [view, setView] = useState<"overview" | "wizard">("overview");
  const [wizardStep, setWizardStep] = useState(0);
  const [distMethod, setDistMethod] = useState<"email" | "link">("email");
  const [anonymous, setAnonymous] = useState(false);
  const [multipleResponses, setMultipleResponses] = useState(false);
  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [showValidate, setShowValidate] = useState(false);
  const [analyzeTab, setAnalyzeTab] = useState("all");
  const [expandedQ, setExpandedQ] = useState<string | null>(null);

  const totalQuestions = QUESTIONNAIRES.reduce((s, q) => s + q.questions, 0);
  const totalRecipients = 50;
  const totalResponses = QUESTIONNAIRES.reduce((s, q) => s + q.responses, 0);
  const avgRate = Math.round(QUESTIONNAIRES.filter((q) => q.responseRate > 0).reduce((s, q) => s + q.responseRate, 0) / QUESTIONNAIRES.filter((q) => q.responseRate > 0).length);

  if (view === "wizard") {
    return (
      <div className="max-w-[800px] mx-auto">
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => setView("overview")} className="mb-4">Back</Button>
        <WizardStepper steps={WIZARD_STEPS} currentStep={wizardStep} />

        <div className="mt-6">
          {/* Step 1: Design */}
          {wizardStep === 0 && (
            <Card padding="lg">
              <h2 className="text-base font-semibold text-text-dark mb-4">Design Questionnaire</h2>
              <div className="space-y-4 mb-6">
                <Input label="Name *" placeholder="Questionnaire name" />
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1">Description</label>
                  <textarea rows={2} placeholder="Brief description..." className="w-full rounded-md border border-border-dark bg-surface-dark px-3 py-2 text-sm text-text-dark placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
                </div>
              </div>
              <div className="space-y-2 mb-4">
                {DESIGN_QUESTIONS.map((q) => (
                  <div key={q.id} className="flex items-center gap-3 p-3 rounded-lg border border-border-dark">
                    <GripVertical className="w-4 h-4 text-text-dark/20 flex-shrink-0 cursor-grab" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-dark truncate">{q.text}</p>
                    </div>
                    <Badge variant="info" size="sm">{q.type}</Badge>
                    {q.required && <Badge variant="warning" size="sm">Required</Badge>}
                    <button className="text-text-dark/30 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
              <div className="flex justify-between">
                <Button variant="ghost" size="sm">Save Draft</Button>
                <Button variant="primary" onClick={() => setWizardStep(1)} rightIcon={<ArrowRight className="w-4 h-4" />}>Continue</Button>
              </div>
            </Card>
          )}

          {/* Step 2: Distribution */}
          {wizardStep === 1 && (
            <Card padding="lg">
              <h2 className="text-base font-semibold text-text-dark mb-4">Distribution Method</h2>
              <div className="flex gap-3 mb-6">
                <button onClick={() => setDistMethod("email")} className={cn("flex-1 p-4 rounded-lg border text-center transition-colors", distMethod === "email" ? "border-primary bg-primary/5" : "border-border-dark hover:bg-surface-dark/50")}>
                  <Mail className="w-5 h-5 mx-auto mb-1 text-text-dark/60" />
                  <p className="text-sm font-medium text-text-dark">Email</p>
                </button>
                <button onClick={() => setDistMethod("link")} className={cn("flex-1 p-4 rounded-lg border text-center transition-colors", distMethod === "link" ? "border-primary bg-primary/5" : "border-border-dark hover:bg-surface-dark/50")}>
                  <LinkIcon className="w-5 h-5 mx-auto mb-1 text-text-dark/60" />
                  <p className="text-sm font-medium text-text-dark">Shareable Link</p>
                </button>
              </div>
              {distMethod === "email" ? (
                <div className="space-y-4 mb-4">
                  <Input label="Subject" defaultValue="We'd love your feedback on our brand" />
                  <div>
                    <label className="block text-sm font-medium text-text-dark mb-1">Email Body</label>
                    <textarea rows={4} defaultValue={`Hi {recipient_name},\n\nWe're conducting {questionnaire_name} and would value your input.\n\nPlease complete the survey here: {questionnaire_link}\n\nThank you!`} className="w-full rounded-md border border-border-dark bg-surface-dark px-3 py-2 text-sm text-text-dark font-mono focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4 mb-4">
                  <div className="flex gap-2">
                    <Input value="https://branddock.com/survey/abc123" readOnly className="flex-1" />
                    <Button variant="secondary" leftIcon={<Copy className="w-4 h-4" />}>Copy</Button>
                  </div>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-200/60">This is a public link. Anyone with the URL can submit a response.</p>
                  </div>
                </div>
              )}
              <div className="space-y-3 mb-4">
                <Toggle checked={anonymous} onChange={setAnonymous} label="Anonymous responses" size="sm" />
                <Toggle checked={multipleResponses} onChange={setMultipleResponses} label="Allow multiple responses" size="sm" />
              </div>
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setWizardStep(0)} leftIcon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
                <Button variant="primary" onClick={() => setWizardStep(2)} rightIcon={<ArrowRight className="w-4 h-4" />}>Continue</Button>
              </div>
            </Card>
          )}

          {/* Step 3: Recipients */}
          {wizardStep === 2 && (
            <Card padding="lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-text-dark">Recipients</h2>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" leftIcon={<Upload className="w-3.5 h-3.5" />}>Import CSV</Button>
                  <Button variant="secondary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAddRecipient(true)}>Add Recipient</Button>
                </div>
              </div>
              <div className="text-center py-12">
                <Users className="w-10 h-10 text-text-dark/20 mx-auto mb-2" />
                <p className="text-sm text-text-dark/40">No recipients added yet</p>
                <p className="text-xs text-text-dark/30 mt-1">Add recipients or import from CSV</p>
              </div>
              <div className="flex justify-between mt-4">
                <Button variant="ghost" onClick={() => setWizardStep(1)} leftIcon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
                <Button variant="primary" onClick={() => setWizardStep(3)} rightIcon={<ArrowRight className="w-4 h-4" />}>Continue</Button>
              </div>
            </Card>
          )}

          {/* Step 4: Collect */}
          {wizardStep === 3 && (
            <Card padding="lg">
              <div className="text-center py-8 mb-6">
                <Send className="w-12 h-12 text-primary mx-auto mb-3" />
                <h2 className="text-base font-semibold text-text-dark mb-1">Ready to Send</h2>
                <p className="text-sm text-text-dark/40">Review the checklist below before sending</p>
              </div>
              <div className="space-y-2 mb-6">
                {["Questions configured", "Distribution method set", "Recipients added"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-text-dark/60">
                    <Check className="w-4 h-4 text-emerald-400" /> {item}
                  </div>
                ))}
              </div>
              <Button variant="primary" fullWidth leftIcon={<Copy className="w-4 h-4" />}>
                Copy Shareable Link
              </Button>
              <div className="flex justify-between mt-4">
                <Button variant="ghost" onClick={() => setWizardStep(2)} leftIcon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
                <Button variant="primary" onClick={() => setWizardStep(4)} rightIcon={<ArrowRight className="w-4 h-4" />}>View Results</Button>
              </div>
            </Card>
          )}

          {/* Step 5: Analyze */}
          {wizardStep === 4 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: "Responses", value: "42" },
                  { label: "Rate", value: "84%" },
                  { label: "Completion", value: "91%" },
                  { label: "Avg Time", value: "4.2 min" },
                  { label: "Assets", value: "3" },
                ].map((s) => (
                  <div key={s.label} className="text-center p-3 rounded-lg border border-border-dark">
                    <p className="text-lg font-bold text-text-dark">{s.value}</p>
                    <p className="text-xs text-text-dark/40">{s.label}</p>
                  </div>
                ))}
              </div>

              <Card padding="lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-text-dark">AI Generated Key Insights</h3>
                  </div>
                  <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>Regenerate</Button>
                </div>
                <div className="space-y-2">
                  {AI_INSIGHTS.map((insight, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                      <p className="text-sm text-text-dark/70">{insight}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Tabs
                tabs={[{ label: "All Questions", value: "all" }, { label: "Brand Positioning", value: "positioning" }, { label: "Core Values", value: "values" }]}
                activeTab={analyzeTab}
                onChange={setAnalyzeTab}
                variant="pills"
              />

              <div className="space-y-2">
                {DESIGN_QUESTIONS.map((q) => (
                  <button key={q.id} onClick={() => setExpandedQ(expandedQ === q.id ? null : q.id)} className="w-full text-left p-4 rounded-lg border border-border-dark hover:bg-surface-dark/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-dark/40">Q{DESIGN_QUESTIONS.indexOf(q) + 1}</span>
                        <p className="text-sm text-text-dark">{q.text}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="info" size="sm">{q.type}</Badge>
                        <span className="text-xs text-text-dark/40">42 responses</span>
                        <ChevronDown className={cn("w-4 h-4 text-text-dark/30 transition-transform", expandedQ === q.id && "rotate-180")} />
                      </div>
                    </div>
                    {expandedQ === q.id && (
                      <div className="mt-3 pt-3 border-t border-border-dark">
                        <p className="text-xs text-text-dark/40">Response summary will appear here when connected to real data.</p>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" leftIcon={<FileText className="w-3.5 h-3.5" />}>PDF</Button>
                <Button variant="secondary" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />}>CSV</Button>
                <Button variant="secondary" size="sm" leftIcon={<ImageIcon className="w-3.5 h-3.5" />}>Charts PNG</Button>
                <Button variant="secondary" size="sm" leftIcon={<Share2 className="w-3.5 h-3.5" />}>Share</Button>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" leftIcon={<Lock className="w-4 h-4" />}>Unlock</Button>
                <Button variant="primary" leftIcon={<Check className="w-4 h-4" />} onClick={() => setShowValidate(true)}>Mark as Validated</Button>
              </div>
            </div>
          )}
        </div>

        {/* Add Recipient Modal */}
        <Modal open={showAddRecipient} onClose={() => setShowAddRecipient(false)} title="Add Recipient">
          <div className="space-y-4">
            <Input label="Name *" placeholder="Full name" />
            <Input label="Email *" placeholder="email@example.com" />
            <Input label="Group" placeholder="e.g. Marketing Team" />
            <Input label="Role" placeholder="e.g. Brand Manager" />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowAddRecipient(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setShowAddRecipient(false)}>Add</Button>
            </div>
          </div>
        </Modal>

        {/* Validate Modal */}
        <Modal open={showValidate} onClose={() => setShowValidate(false)} title="Validate Questionnaire">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-surface-dark/50"><p className="text-lg font-bold text-text-dark">42</p><p className="text-xs text-text-dark/40">Responses</p></div>
              <div className="p-3 rounded-lg bg-surface-dark/50"><p className="text-lg font-bold text-text-dark">84%</p><p className="text-xs text-text-dark/40">Rate</p></div>
              <div className="p-3 rounded-lg bg-surface-dark/50"><p className="text-lg font-bold text-text-dark">91%</p><p className="text-xs text-text-dark/40">Completion</p></div>
            </div>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <p className="text-sm text-emerald-300/80">This questionnaire meets the minimum threshold for validation. Once validated, the results will be locked.</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowValidate(false)}>Cancel</Button>
              <Button variant="primary" leftIcon={<Check className="w-4 h-4" />} onClick={() => setShowValidate(false)}>Validate &amp; Lock</Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // Overview
  return (
    <div className="max-w-[900px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-text-dark">Questionnaires</h1>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => { setView("wizard"); setWizardStep(0); }}>Create Questionnaire</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="text-center p-3 rounded-lg border border-border-dark">
          <p className="text-lg font-bold text-text-dark">{totalQuestions}</p>
          <p className="text-xs text-text-dark/40">Questions</p>
        </div>
        <div className="text-center p-3 rounded-lg border border-border-dark">
          <p className="text-lg font-bold text-text-dark">{totalRecipients}</p>
          <p className="text-xs text-text-dark/40">Recipients</p>
        </div>
        <div className="text-center p-3 rounded-lg border border-border-dark">
          <p className="text-lg font-bold text-text-dark">{totalResponses}</p>
          <p className="text-xs text-text-dark/40">Responses</p>
        </div>
        <div className="text-center p-3 rounded-lg border border-border-dark">
          <p className="text-lg font-bold text-text-dark">{avgRate}%</p>
          <p className="text-xs text-text-dark/40">Response Rate</p>
        </div>
      </div>

      <div className="space-y-3">
        {QUESTIONNAIRES.map((qs) => {
          const cfg = STATUS_CONFIG[qs.status];
          return (
            <Card key={qs.id} hoverable padding="md" clickable onClick={() => { setView("wizard"); setWizardStep(4); }}>
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-text-dark">{qs.title}</h3>
                    <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-dark/40">
                    <span>{qs.questions} questions</span>
                    <span>{qs.responses} responses</span>
                  </div>
                </div>
                <div className="relative w-12 h-12">
                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" className="text-border-dark/30" />
                    <circle cx="24" cy="24" r="20" fill="none" strokeWidth="3" className="text-primary" stroke="currentColor" strokeDasharray={`${(qs.responseRate / 100) * 126} 126`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-text-dark">{qs.responseRate}%</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
