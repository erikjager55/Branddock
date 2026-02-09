"use client";

import { useState } from "react";
import { use } from "react";
import {
  Plus,
  Lock,
  Unlock,
  Pencil,
  Copy,
  BarChart3,
  Trash2,
  MoreVertical,
  User,
  Calendar,
  Clock,
  Check,
  Save,
  ArrowLeft,
  Upload,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Dropdown } from "@/components/ui/Dropdown";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/utils";
import { WizardStepper } from "@/components/strategy/WizardStepper";

// ── Data ──

type InterviewStatus = "to-schedule" | "scheduled" | "completed" | "in-review";

interface Interview {
  id: string;
  title: string;
  status: InterviewStatus;
  locked: boolean;
  person: string;
  role: string;
  date?: string;
}

const INTERVIEWS: Interview[] = [
  { id: "int-1", title: "Brand Manager Interview", status: "completed", locked: true, person: "Sarah Mitchell", role: "Brand Manager", date: "Feb 3, 2026" },
  { id: "int-2", title: "Customer Insight Session", status: "completed", locked: false, person: "David Chen", role: "Marketing Director", date: "Feb 5, 2026" },
  { id: "int-3", title: "Design Lead Perspective", status: "scheduled", locked: false, person: "Lisa Park", role: "Design Lead", date: "Feb 12, 2026" },
  { id: "int-4", title: "Sales Team Feedback", status: "to-schedule", locked: false, person: "James Brown", role: "Sales Lead" },
  { id: "int-5", title: "CEO Vision Interview", status: "in-review", locked: false, person: "Maya Singh", role: "CEO", date: "Feb 1, 2026" },
];

const STATUS_CONFIG: Record<InterviewStatus, { label: string; variant: "default" | "info" | "success" | "warning" }> = {
  "to-schedule": { label: "To Schedule", variant: "default" },
  scheduled: { label: "Scheduled", variant: "info" },
  completed: { label: "Completed", variant: "success" },
  "in-review": { label: "In Review", variant: "warning" },
};

const ASSET_QUESTIONS = [
  { asset: "Golden Circle", count: 5, checked: true },
  { asset: "Core Values", count: 4, checked: true },
  { asset: "Brand Positioning", count: 3, checked: false },
  { asset: "Brand Personality", count: 6, checked: false },
];

const CONDUCT_QUESTIONS = [
  { id: "q1", type: "Open", text: "How would you describe our brand's core purpose in your own words?", answered: true },
  { id: "q2", type: "Open", text: "What do you think makes our brand unique compared to competitors?", answered: true },
  { id: "q3", type: "MC", text: "On a scale of 1-5, how well does our brand communicate its values?", answered: false },
  { id: "q4", type: "Open", text: "What is the biggest challenge our brand faces in the market?", answered: false },
  { id: "q5", type: "Rating", text: "Rate the consistency of our brand across different channels.", answered: false },
];

const WIZARD_STEPS = ["Contact", "Schedule", "Questions", "Conduct", "Review"];

const QUESTION_TYPES = [
  { value: "open", label: "Open Question" },
  { value: "mc", label: "Multiple Choice" },
  { value: "multi", label: "Multi-Select" },
  { value: "rating", label: "Rating" },
  { value: "ranking", label: "Ranking" },
];

// ── Component ──

export default function InterviewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [view, setView] = useState<"overview" | "wizard">("overview");
  const [wizardStep, setWizardStep] = useState(0);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactPosition, setContactPosition] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactCompany, setContactCompany] = useState("");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const statusCounts = {
    "to-schedule": INTERVIEWS.filter((i) => i.status === "to-schedule").length,
    scheduled: INTERVIEWS.filter((i) => i.status === "scheduled").length,
    completed: INTERVIEWS.filter((i) => i.status === "completed").length,
    "in-review": INTERVIEWS.filter((i) => i.status === "in-review").length,
  };

  const answeredCount = CONDUCT_QUESTIONS.filter((q) => q.answered || answers[q.id]).length;

  if (view === "wizard") {
    return (
      <div className="max-w-[800px] mx-auto">
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => setView("overview")} className="mb-4">
          Back to Interviews
        </Button>

        <WizardStepper steps={WIZARD_STEPS} currentStep={wizardStep} />

        <div className="mt-6">
          {/* Step 1: Contact */}
          {wizardStep === 0 && (
            <Card padding="lg">
              <h2 className="text-base font-semibold text-text-dark mb-4">Contact Information</h2>
              <div className="space-y-4">
                <Input label="Name *" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Full name" />
                <Input label="Position" value={contactPosition} onChange={(e) => setContactPosition(e.target.value)} placeholder="Job title" />
                <Input label="Email *" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="email@company.com" />
                <Input label="Phone (optional)" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+31 6..." />
                <Input label="Company" value={contactCompany} onChange={(e) => setContactCompany(e.target.value)} placeholder="Company name" />
              </div>
              <div className="flex justify-end mt-6">
                <Button variant="primary" onClick={() => setWizardStep(1)}>Save Contact</Button>
              </div>
            </Card>
          )}

          {/* Step 2: Schedule */}
          {wizardStep === 1 && (
            <Card padding="lg">
              <h2 className="text-base font-semibold text-text-dark mb-4">Schedule Interview</h2>
              <div className="space-y-4">
                <Input label="Date" type="date" />
                <Input label="Time" type="time" />
                <Select label="Duration" options={[{ value: "30", label: "30 minutes" }, { value: "60", label: "60 minutes" }, { value: "90", label: "90 minutes" }]} value="60" />
              </div>
              <div className="flex justify-between mt-6">
                <Button variant="ghost" onClick={() => setWizardStep(0)}>Back</Button>
                <Button variant="primary" onClick={() => setWizardStep(2)}>Save Schedule</Button>
              </div>
            </Card>
          )}

          {/* Step 3: Questions */}
          {wizardStep === 2 && (
            <Card padding="lg">
              <h2 className="text-base font-semibold text-text-dark mb-4">Interview Questions</h2>
              <div className="space-y-3 mb-4">
                {ASSET_QUESTIONS.map((aq) => (
                  <div key={aq.asset} className="flex items-center justify-between p-3 rounded-lg border border-border-dark">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" defaultChecked={aq.checked} className="w-4 h-4 rounded accent-primary" />
                      <span className="text-sm text-text-dark">{aq.asset}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-text-dark/40">{aq.count} questions</span>
                      <button className="text-xs text-primary hover:text-primary/80 transition-colors">View</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mb-4">
                <Button variant="secondary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAddQuestion(true)}>
                  Add Question
                </Button>
                <Button variant="ghost" size="sm" leftIcon={<Upload className="w-3.5 h-3.5" />}>
                  Import from Templates
                </Button>
              </div>
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setWizardStep(1)}>Back</Button>
                <Button variant="primary" onClick={() => setWizardStep(3)}>Continue</Button>
              </div>
            </Card>
          )}

          {/* Step 4: Conduct */}
          {wizardStep === 3 && (
            <Card padding="lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-text-dark">Conduct Interview</h2>
                <span className="text-xs text-text-dark/40">{answeredCount} of {CONDUCT_QUESTIONS.length} answered &middot; {Math.round((answeredCount / CONDUCT_QUESTIONS.length) * 100)}% complete</span>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} className="text-xs text-text-dark/40 hover:text-text-dark transition-colors">Previous</button>
                <span className="text-xs text-text-dark/50">{currentQ + 1}/{CONDUCT_QUESTIONS.length}</span>
                <button onClick={() => setCurrentQ(Math.min(CONDUCT_QUESTIONS.length - 1, currentQ + 1))} className="text-xs text-text-dark/40 hover:text-text-dark transition-colors">Next</button>
              </div>
              <div className="p-4 rounded-lg border border-border-dark mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="info" size="sm">{CONDUCT_QUESTIONS[currentQ].type}</Badge>
                  <span className="text-xs text-text-dark/40">Q{currentQ + 1}</span>
                </div>
                <p className="text-sm text-text-dark mb-3">{CONDUCT_QUESTIONS[currentQ].text}</p>
                <textarea
                  value={answers[CONDUCT_QUESTIONS[currentQ].id] || ""}
                  onChange={(e) => setAnswers({ ...answers, [CONDUCT_QUESTIONS[currentQ].id]: e.target.value })}
                  placeholder="Enter response..."
                  rows={3}
                  className="w-full rounded-md border border-border-dark bg-surface-dark px-3 py-2 text-sm text-text-dark placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              <div className="mb-4">
                <label className="text-xs font-medium text-text-dark/40 uppercase tracking-wide mb-1 block">General Notes</label>
                <textarea rows={2} placeholder="Additional observations..." className="w-full rounded-md border border-border-dark bg-surface-dark px-3 py-2 text-sm text-text-dark placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
              </div>
              <div className="flex justify-between">
                <Button variant="ghost" leftIcon={<Save className="w-4 h-4" />}>Save Progress</Button>
                <Button variant="primary" leftIcon={<Check className="w-4 h-4" />} onClick={() => setWizardStep(4)}>Complete Interview</Button>
              </div>
            </Card>
          )}

          {/* Step 5: Review */}
          {wizardStep === 4 && (
            <Card padding="lg">
              <h2 className="text-base font-semibold text-text-dark mb-4">Review Interview</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="text-center p-3 rounded-lg bg-surface-dark/50"><p className="text-lg font-bold text-text-dark">{answeredCount}</p><p className="text-xs text-text-dark/40">Answered</p></div>
                <div className="text-center p-3 rounded-lg bg-surface-dark/50"><p className="text-lg font-bold text-text-dark">45 min</p><p className="text-xs text-text-dark/40">Duration</p></div>
                <div className="text-center p-3 rounded-lg bg-surface-dark/50"><p className="text-lg font-bold text-text-dark">2</p><p className="text-xs text-text-dark/40">Assets</p></div>
                <div className="text-center p-3 rounded-lg bg-surface-dark/50"><p className="text-lg font-bold text-text-dark">{Math.round((answeredCount / CONDUCT_QUESTIONS.length) * 100)}%</p><p className="text-xs text-text-dark/40">Complete</p></div>
              </div>
              <div className="space-y-3 mb-6">
                {CONDUCT_QUESTIONS.map((q, i) => (
                  <div key={q.id} className="p-3 rounded-lg border border-border-dark">
                    <p className="text-sm font-medium text-text-dark mb-1">Q{i + 1}: {q.text}</p>
                    <p className="text-sm text-text-dark/60">{answers[q.id] || (q.answered ? "Previously recorded response" : "No answer")}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" leftIcon={<Pencil className="w-3.5 h-3.5" />}>Edit Responses</Button>
                <Button variant="secondary" size="sm" leftIcon={<BarChart3 className="w-3.5 h-3.5" />}>Export PDF</Button>
                <Button variant="primary" size="sm" leftIcon={<Lock className="w-3.5 h-3.5" />}>Approve &amp; Lock</Button>
              </div>
            </Card>
          )}
        </div>

        {/* Add Question Modal */}
        <Modal open={showAddQuestion} onClose={() => setShowAddQuestion(false)} title="Add Question" size="lg">
          <div className="space-y-4">
            <Select label="Asset Link" options={ASSET_QUESTIONS.map((a) => ({ value: a.asset, label: a.asset }))} placeholder="Link to asset..." />
            <Select label="Question Type" options={QUESTION_TYPES} placeholder="Select type..." />
            <div>
              <label className="block text-sm font-medium text-text-dark mb-1">Question</label>
              <textarea rows={3} placeholder="Enter your question..." className="w-full rounded-md border border-border-dark bg-surface-dark px-3 py-2 text-sm text-text-dark placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowAddQuestion(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setShowAddQuestion(false)}>Add Question</Button>
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
        <div>
          <h1 className="text-xl font-semibold text-text-dark">Interviews</h1>
          <p className="text-sm text-text-dark/40">{INTERVIEWS.length} Interviews</p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => { setView("wizard"); setWizardStep(0); }}>
          Add Interview
        </Button>
      </div>

      {/* Status Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {(["to-schedule", "scheduled", "completed", "in-review"] as InterviewStatus[]).map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <div key={s} className="text-center p-3 rounded-lg border border-border-dark">
              <p className="text-lg font-bold text-text-dark">{statusCounts[s]}</p>
              <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
            </div>
          );
        })}
      </div>

      {/* Interview Cards */}
      <div className="space-y-3">
        {INTERVIEWS.map((interview) => {
          const cfg = STATUS_CONFIG[interview.status];
          return (
            <Card key={interview.id} padding="md">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-text-dark">{interview.title}</h3>
                    {interview.locked && <Lock className="w-3.5 h-3.5 text-text-dark/30" />}
                    <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-dark/40">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{interview.person} &middot; {interview.role}</span>
                    {interview.date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{interview.date}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => { setView("wizard"); setWizardStep(3); }}>View</Button>
                  <Dropdown
                    trigger={<button className="p-1.5 rounded-md text-text-dark/40 hover:text-text-dark hover:bg-surface-dark transition-colors"><MoreVertical className="w-4 h-4" /></button>}
                    items={[
                      { label: interview.locked ? "Unlock" : "Lock", icon: interview.locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />, onClick: () => {} },
                      { label: "Edit", icon: <Pencil className="w-4 h-4" />, onClick: () => {} },
                      { label: "Duplicate", icon: <Copy className="w-4 h-4" />, onClick: () => {} },
                      { label: "Export", icon: <BarChart3 className="w-4 h-4" />, onClick: () => {} },
                      "separator",
                      { label: "Delete", icon: <Trash2 className="w-4 h-4" />, onClick: () => {}, danger: true },
                    ]}
                    align="right"
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
