"use client";

import { useState, useEffect, useCallback } from "react";
import { use } from "react";
import Link from "next/link";
import {
  Plus,
  Lock,
  Unlock,
  Pencil,
  Copy,
  Trash2,
  MoreVertical,
  Calendar,
  Clock,
  Check,
  Save,
  ArrowLeft,
  ArrowRight,
  Upload,
  Eye,
  Tag,
  Mail,
  Phone,
  BookOpen,
  CheckCircle,
  Download,
  ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Dropdown } from "@/components/ui/Dropdown";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { WizardStepper } from "@/components/strategy/WizardStepper";
import { AddQuestionModal, type InterviewQuestion } from "@/features/knowledge/brand-foundation/interviews/AddQuestionModal";
import { QuestionTemplatesPanel } from "@/features/knowledge/brand-foundation/interviews/QuestionTemplatesPanel";
import { useInterviewStore } from "@/stores/interviewStore";
import {
  useAssetInterviews,
  useCreateInterview,
  useUpdateInterview,
  useDeleteInterview,
  useLockInterview,
  useUnlockInterview,
  useDuplicateInterview,
  type Interview,
} from "@/hooks/api/useInterviews";
import {
  INTERVIEW_ASSET_OPTIONS,
  DURATION_OPTIONS,
  type QuestionTemplate,
} from "@/lib/constants/interview-templates";
import { cn } from "@/lib/utils";

// ── Types & Constants ──

const WIZARD_STEPS = ["Contact", "Schedule", "Questions", "Conduct", "Review"];

type StatusKey = "TO_SCHEDULE" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "IN_REVIEW" | "APPROVED";

const STATUS_CONFIG: Record<StatusKey, { label: string; variant: "default" | "info" | "success" | "warning"; dotColor: string }> = {
  TO_SCHEDULE: { label: "To Schedule", variant: "default", dotColor: "bg-text-dark/40" },
  SCHEDULED: { label: "Scheduled", variant: "info", dotColor: "bg-blue-400" },
  IN_PROGRESS: { label: "In Progress", variant: "warning", dotColor: "bg-amber-400" },
  COMPLETED: { label: "Interview Held", variant: "success", dotColor: "bg-emerald-400" },
  IN_REVIEW: { label: "In Review", variant: "warning", dotColor: "bg-purple-400" },
  APPROVED: { label: "Approved", variant: "success", dotColor: "bg-emerald-400" },
};

// ── Page Component ──

export default function InterviewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: assetId } = use(params);
  const store = useInterviewStore();

  // API hooks
  const { data: rawData } = useAssetInterviews({ assetId });
  const createInterview = useCreateInterview();
  const updateInterview = useUpdateInterview();
  const deleteInterview = useDeleteInterview();
  const lockInterview = useLockInterview();
  const unlockInterview = useUnlockInterview();
  const duplicateInterview = useDuplicateInterview();

  // Normalize API response
  const interviews: Interview[] = Array.isArray(rawData)
    ? rawData
    : (rawData as unknown as { data?: Interview[] })?.data ?? [];

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [completeConfirmId, setCompleteConfirmId] = useState<string | null>(null);

  // ── Per-interview local form state (for the expanded wizard) ──
  const [contactForm, setContactForm] = useState({ name: "", position: "", email: "", phone: "", company: "" });
  const [scheduleForm, setScheduleForm] = useState({ date: "", time: "", duration: "60" });
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [generalNotes, setGeneralNotes] = useState("");

  // Sync form state when expanding an interview
  const syncFormFromInterview = useCallback((interview: Interview) => {
    setContactForm({
      name: interview.contactName ?? "",
      position: interview.contactPosition ?? "",
      email: interview.contactEmail ?? "",
      phone: interview.contactPhone ?? "",
      company: interview.contactCompany ?? "",
    });
    setScheduleForm({
      date: interview.scheduledDate ? interview.scheduledDate.split("T")[0] : "",
      time: interview.scheduledTime ?? "",
      duration: String(interview.duration),
    });
    setSelectedAssets((interview.selectedAssets as string[]) ?? []);
    setQuestions(
      ((interview.questions as InterviewQuestion[]) ?? [])
    );
    setAnswers((interview.answers as Record<string, string>) ?? {});
    setGeneralNotes(interview.generalNotes ?? "");
    store.setActiveStep(Math.max(0, (interview.currentStep ?? 1) - 1));
  }, [store]);

  // Status counts
  const statusCounts = {
    TO_SCHEDULE: interviews.filter((i) => i.status === "TO_SCHEDULE").length,
    SCHEDULED: interviews.filter((i) => i.status === "SCHEDULED").length,
    COMPLETED: interviews.filter((i) => ["COMPLETED", "IN_REVIEW", "APPROVED"].includes(i.status)).length,
    IN_REVIEW: interviews.filter((i) => i.status === "IN_REVIEW").length,
  };

  // Currently expanded interview
  const expandedInterview = interviews.find((i) => i.id === store.expandedInterviewId);

  const handleAddInterview = () => {
    createInterview.mutate(
      { assetId, title: `Interview #${interviews.length + 1}`, duration: 60 },
      {
        onSuccess: (newInterview) => {
          const created = (newInterview as { id?: string })?.id ?? (newInterview as Interview)?.id;
          if (created) {
            store.setExpandedInterview(created);
            setContactForm({ name: "", position: "", email: "", phone: "", company: "" });
            setScheduleForm({ date: "", time: "", duration: "60" });
            setSelectedAssets([]);
            setQuestions([]);
            setAnswers({});
            setGeneralNotes("");
            store.setActiveStep(0);
          }
        },
      }
    );
  };

  const handleToggleExpand = (interview: Interview) => {
    if (store.expandedInterviewId === interview.id) {
      store.setExpandedInterview(null);
    } else {
      store.setExpandedInterview(interview.id);
      syncFormFromInterview(interview);
    }
  };

  // ── Save helpers ──

  const saveContact = () => {
    if (!expandedInterview) return;
    updateInterview.mutate({
      interviewId: expandedInterview.id,
      contactName: contactForm.name || undefined,
      contactPosition: contactForm.position || undefined,
      contactEmail: contactForm.email || undefined,
      contactPhone: contactForm.phone || undefined,
      contactCompany: contactForm.company || undefined,
      currentStep: 2,
    });
    store.setActiveStep(1);
  };

  const saveSchedule = () => {
    if (!expandedInterview) return;
    updateInterview.mutate({
      interviewId: expandedInterview.id,
      scheduledDate: scheduleForm.date ? new Date(scheduleForm.date).toISOString() : undefined,
      scheduledTime: scheduleForm.time || undefined,
      duration: parseInt(scheduleForm.duration),
      status: scheduleForm.date && scheduleForm.time ? "SCHEDULED" : undefined,
      currentStep: 3,
    });
    store.setActiveStep(2);
  };

  const saveQuestions = () => {
    if (!expandedInterview) return;
    updateInterview.mutate({
      interviewId: expandedInterview.id,
      selectedAssets: selectedAssets,
      questions: questions as unknown[],
      currentStep: 4,
    });
    store.setActiveStep(3);
  };

  const saveProgress = () => {
    if (!expandedInterview) return;
    const answeredCount = questions.filter((q) => answers[q.id]?.trim()).length;
    const completionRate = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
    updateInterview.mutate({
      interviewId: expandedInterview.id,
      answers: answers as Record<string, unknown>,
      generalNotes,
      completionRate,
      status: "IN_PROGRESS",
    });
  };

  const completeInterview = () => {
    if (!expandedInterview) return;
    const answeredCount = questions.filter((q) => answers[q.id]?.trim()).length;
    const completionRate = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
    updateInterview.mutate({
      interviewId: expandedInterview.id,
      answers: answers as Record<string, unknown>,
      generalNotes,
      completionRate,
      status: "COMPLETED",
      currentStep: 5,
    });
    store.setActiveStep(4);
    setCompleteConfirmId(null);
  };

  const approveAndLock = () => {
    if (!expandedInterview) return;
    lockInterview.mutate(expandedInterview.id);
    store.setExpandedInterview(null);
  };

  // Question management
  const addQuestion = (q: InterviewQuestion) => {
    setQuestions((prev) => [...prev, q]);
  };

  const addFromTemplate = (template: QuestionTemplate) => {
    const newQ: InterviewQuestion = {
      id: `q-${Date.now()}`,
      questionText: template.questionText,
      questionType: template.questionType,
      assetLink: template.category.toLowerCase().replace(/\s+/g, "-"),
      options: template.options,
      source: "TEMPLATE",
      savedToLibrary: false,
    };
    setQuestions((prev) => [...prev, newQ]);
    store.closeTemplatesPanel();
  };

  const assetSelectOptions = INTERVIEW_ASSET_OPTIONS.map((a) => ({
    value: a.key,
    label: a.name,
  }));

  const answeredCount = questions.filter((q) => answers[q.id]?.trim()).length;
  const completionRate = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  return (
    <div className="max-w-[900px] mx-auto">
      {/* Back Link */}
      <Link
        href={`/knowledge/brand-foundation/${assetId}`}
        className="inline-flex items-center gap-1.5 text-sm text-text-dark/50 hover:text-text-dark transition-colors mb-5"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Asset
      </Link>

      {/* ── Header Card ── */}
      <Card padding="lg" className="mb-6">
        {/* Title row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-surface-dark/50 flex items-center justify-center text-2xl">
              👥
            </div>
            <div>
              <h1 className="text-xl font-semibold text-text-dark">Interviews</h1>
              <p className="text-sm text-text-dark/50">
                Conduct structured interviews with stakeholders
              </p>
            </div>
          </div>
          <Badge variant="default" size="sm">Draft</Badge>
        </div>

        {/* Stats + Add button row */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-text-dark mb-1">
              {interviews.length} Interview{interviews.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-4 text-sm text-text-dark/50">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-text-dark/40" />
                {statusCounts.TO_SCHEDULE} To Schedule
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                {statusCounts.SCHEDULED} Scheduled
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                {statusCounts.COMPLETED} Completed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                {statusCounts.IN_REVIEW} In Review
              </span>
            </div>
          </div>
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleAddInterview}
            loading={createInterview.isPending}
          >
            Add Interview
          </Button>
        </div>
      </Card>

      {/* ── Interview Cards ── */}
      <div className="space-y-3">
        {interviews.map((interview) => {
          const cfg = STATUS_CONFIG[interview.status] ?? STATUS_CONFIG.TO_SCHEDULE;
          const isExpanded = store.expandedInterviewId === interview.id;

          return (
            <Card key={interview.id} padding="none" className="overflow-hidden">
              {/* Card Header */}
              <div
                className={cn(
                  "px-6 py-4 cursor-pointer hover:bg-background-dark/30 transition-colors",
                  isExpanded && "border-b border-border-dark"
                )}
                onClick={() => handleToggleExpand(interview)}
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-text-dark">
                        {interview.title ?? "Untitled Interview"}
                      </h3>
                      {interview.isLocked && (
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
                      {interview.isLocked && (
                        <Badge variant="warning" size="sm">Locked</Badge>
                      )}
                    </div>
                    {/* Contact */}
                    {interview.contactName && (
                      <p className="text-sm text-text-dark/60 mb-1">
                        {interview.contactName}
                        {interview.contactPosition && ` - ${interview.contactPosition}`}
                        {interview.contactCompany && ` at ${interview.contactCompany}`}
                      </p>
                    )}
                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-text-dark/40">
                      {interview.scheduledDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(interview.scheduledDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {interview.scheduledTime && ` \u00B7 ${interview.scheduledTime}`}
                          {` \u00B7 ${interview.duration} min`}
                        </span>
                      )}
                      {interview.selectedAssets && (interview.selectedAssets as string[]).length > 0 && (
                        <span className="flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5" />
                          {(interview.selectedAssets as string[]).length} assets
                        </span>
                      )}
                      {interview.contactEmail && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          {interview.contactEmail}
                        </span>
                      )}
                      {interview.contactPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {interview.contactPhone}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleToggleExpand(interview)}
                      className="p-2 rounded-md text-text-dark/40 hover:text-text-dark hover:bg-surface-dark transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <Dropdown
                      trigger={
                        <button className="p-2 rounded-md text-text-dark/40 hover:text-text-dark hover:bg-surface-dark transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      }
                      items={[
                        ...(interview.isLocked
                          ? [{ label: "Unlock Interview", icon: <Unlock className="w-4 h-4" />, onClick: () => unlockInterview.mutate(interview.id) }]
                          : [{ label: "Lock Interview", icon: <Lock className="w-4 h-4" />, onClick: () => lockInterview.mutate(interview.id) }]),
                        { label: "Edit Details", icon: <Pencil className="w-4 h-4" />, onClick: () => { store.setExpandedInterview(interview.id); syncFormFromInterview(interview); store.setActiveStep(0); } },
                        { label: "Duplicate Interview", icon: <Copy className="w-4 h-4" />, onClick: () => duplicateInterview.mutate(interview.id) },
                        { label: "Export Notes", icon: <BookOpen className="w-4 h-4" />, onClick: () => {} },
                        "separator" as const,
                        { label: "Delete", icon: <Trash2 className="w-4 h-4" />, onClick: () => setDeleteConfirmId(interview.id), danger: true },
                      ]}
                      align="right"
                    />
                  </div>
                </div>
              </div>

              {/* ── Inline Wizard (expanded) ── */}
              {isExpanded && (
                <div className="px-6 py-5">
                  {/* Stepper */}
                  <div className="mb-6">
                    <WizardStepper steps={WIZARD_STEPS} currentStep={store.activeStep} />
                  </div>

                  {/* ═══ Step 1: Contact ═══ */}
                  {store.activeStep === 0 && (
                    <div>
                      <h2 className="text-lg font-semibold text-text-dark mb-1">Contact Information</h2>
                      <p className="text-sm text-text-dark/50 mb-5">Enter interviewee details</p>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <Input
                          label="Interviewee Name"
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                          placeholder="e.g., Sarah Johnson"
                        />
                        <Input
                          label="Position"
                          value={contactForm.position}
                          onChange={(e) => setContactForm({ ...contactForm, position: e.target.value })}
                          placeholder="e.g., CMO"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <Input
                          label="Email"
                          type="email"
                          value={contactForm.email}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                          placeholder="e.g., sarah@company.com"
                        />
                        <Input
                          label="Phone (optional)"
                          value={contactForm.phone}
                          onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                          placeholder="e.g., +1 (555) 234-5678"
                        />
                      </div>
                      <Input
                        label="Company"
                        value={contactForm.company}
                        onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                        placeholder="e.g., TechCorp Inc."
                        className="mb-6"
                      />
                      <div className="flex justify-end">
                        <Button variant="primary" onClick={saveContact} loading={updateInterview.isPending}>
                          Save Contact
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ═══ Step 2: Schedule ═══ */}
                  {store.activeStep === 1 && (
                    <div>
                      <h2 className="text-lg font-semibold text-text-dark mb-1">Interview Schedule</h2>
                      <p className="text-sm text-text-dark/50 mb-5">Set date, time, and duration</p>
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <Input
                          label="Date"
                          type="date"
                          value={scheduleForm.date}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                        />
                        <Input
                          label="Time"
                          type="time"
                          value={scheduleForm.time}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                        />
                        <Select
                          label="Duration (min)"
                          options={[...DURATION_OPTIONS]}
                          value={scheduleForm.duration}
                          onChange={(val) => setScheduleForm({ ...scheduleForm, duration: val })}
                        />
                      </div>
                      <div className="flex justify-between">
                        <Button variant="ghost" onClick={() => store.setActiveStep(0)}>Back</Button>
                        <Button variant="primary" onClick={saveSchedule} loading={updateInterview.isPending}>
                          Save Schedule
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ═══ Step 3: Questions ═══ */}
                  {store.activeStep === 2 && (
                    <div>
                      {/* Asset Selection */}
                      <h2 className="text-lg font-semibold text-text-dark mb-1">Brand Assets to Discuss</h2>
                      <p className="text-sm text-text-dark/50 mb-4">Select which brand assets to cover in this interview</p>
                      <div className="space-y-2 mb-6">
                        {INTERVIEW_ASSET_OPTIONS.map((asset) => {
                          const isSelected = selectedAssets.includes(asset.key);
                          const qCount = questions.filter((q) => q.assetLink === asset.key).length;
                          return (
                            <button
                              key={asset.key}
                              onClick={() => {
                                setSelectedAssets((prev) =>
                                  isSelected ? prev.filter((a) => a !== asset.key) : [...prev, asset.key]
                                );
                              }}
                              className={cn(
                                "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                                isSelected
                                  ? "border-primary bg-primary/5"
                                  : "border-border-dark hover:bg-background-dark/30"
                              )}
                            >
                              <div
                                className={cn(
                                  "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                                  isSelected ? "bg-primary border-primary" : "border-border-dark"
                                )}
                              >
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-text-dark">{asset.name}</span>
                                <span className="text-xs text-text-dark/40 ml-2">{asset.category}</span>
                              </div>
                              <span className="text-xs text-text-dark/40">{qCount} questions</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Questions List */}
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h2 className="text-lg font-semibold text-text-dark">Interview Questions</h2>
                          <p className="text-sm text-text-dark/50">Configure questions for each selected asset</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<Plus className="w-3.5 h-3.5" />}
                            onClick={() => store.openAddQuestionModal()}
                          >
                            Add Question
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<BookOpen className="w-3.5 h-3.5" />}
                            onClick={() => store.openTemplatesPanel()}
                          >
                            Import from Templates
                          </Button>
                        </div>
                      </div>

                      {questions.length === 0 ? (
                        <p className="text-sm text-text-dark/40 italic py-6 text-center">
                          No questions added yet. Add custom questions or import from templates.
                        </p>
                      ) : (
                        <div className="space-y-2 mb-6">
                          {questions.map((q, i) => (
                            <div key={q.id} className="flex items-start gap-3 p-3 rounded-lg border border-border-dark">
                              <span className="text-xs font-medium text-text-dark/40 mt-0.5">Q{i + 1}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-text-dark">{q.questionText}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="default" size="sm">{q.questionType.toLowerCase().replace("_", "-")}</Badge>
                                  <Badge variant={q.source === "TEMPLATE" ? "info" : "default"} size="sm">
                                    {q.source === "TEMPLATE" ? "Template" : "Custom"}
                                  </Badge>
                                </div>
                              </div>
                              <button
                                onClick={() => setQuestions(questions.filter((_, j) => j !== i))}
                                className="p-1 text-text-dark/30 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-between">
                        <Button variant="ghost" onClick={() => store.setActiveStep(1)}>Back</Button>
                        <Button variant="primary" onClick={saveQuestions} loading={updateInterview.isPending}>
                          Continue
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ═══ Step 4: Conduct ═══ */}
                  {store.activeStep === 3 && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h2 className="text-lg font-semibold text-text-dark">Conduct Interview</h2>
                        <span className="text-sm text-text-dark/50">
                          {answeredCount} of {questions.length} questions answered &middot; {completionRate}% complete
                        </span>
                      </div>
                      <p className="text-sm text-text-dark/50 mb-5">Document answers during or after the interview</p>

                      {questions.length === 0 ? (
                        <p className="text-sm text-text-dark/40 italic py-6 text-center">
                          No questions to answer. Go back to add questions first.
                        </p>
                      ) : (
                        <>
                          {/* Question Navigation */}
                          <div className="flex items-center justify-between mb-4">
                            <button
                              onClick={() => store.setCurrentQuestionIndex(Math.max(0, store.currentQuestionIndex - 1))}
                              disabled={store.currentQuestionIndex === 0}
                              className={cn(
                                "text-sm transition-colors",
                                store.currentQuestionIndex === 0
                                  ? "text-text-dark/20 cursor-not-allowed"
                                  : "text-text-dark/50 hover:text-text-dark"
                              )}
                            >
                              Previous Question
                            </button>
                            <span className="text-sm text-text-dark/40">
                              Question {store.currentQuestionIndex + 1} / {questions.length}
                            </span>
                            <button
                              onClick={() => store.setCurrentQuestionIndex(Math.min(questions.length - 1, store.currentQuestionIndex + 1))}
                              disabled={store.currentQuestionIndex >= questions.length - 1}
                              className={cn(
                                "text-sm transition-colors",
                                store.currentQuestionIndex >= questions.length - 1
                                  ? "text-text-dark/20 cursor-not-allowed"
                                  : "text-text-dark/50 hover:text-text-dark"
                              )}
                            >
                              Next Question
                            </button>
                          </div>

                          {/* Current Question */}
                          {questions[store.currentQuestionIndex] && (
                            <div className="p-5 rounded-lg border border-border-dark mb-4">
                              <p className="text-xs text-text-dark/30 uppercase tracking-wider mb-2">
                                {questions[store.currentQuestionIndex].questionType.toLowerCase().replace("_", "-")}
                              </p>
                              <p className="text-base font-medium text-text-dark mb-3">
                                Q{store.currentQuestionIndex + 1}. {questions[store.currentQuestionIndex].questionText}
                              </p>

                              {/* Answer input by type */}
                              {questions[store.currentQuestionIndex].questionType === "RATING_SCALE" ? (
                                <div className="flex gap-2">
                                  {[1, 2, 3, 4, 5].map((n) => (
                                    <button
                                      key={n}
                                      onClick={() => setAnswers({ ...answers, [questions[store.currentQuestionIndex].id]: String(n) })}
                                      className={cn(
                                        "w-10 h-10 rounded-lg border text-sm font-medium transition-all",
                                        answers[questions[store.currentQuestionIndex].id] === String(n)
                                          ? "bg-primary border-primary text-white"
                                          : "border-border-dark text-text-dark/50 hover:border-primary"
                                      )}
                                    >
                                      {n}
                                    </button>
                                  ))}
                                </div>
                              ) : ["MULTIPLE_CHOICE", "MULTI_SELECT"].includes(questions[store.currentQuestionIndex].questionType) && questions[store.currentQuestionIndex].options ? (
                                <div className="space-y-2">
                                  {questions[store.currentQuestionIndex].options!.map((opt, oi) => {
                                    const qId = questions[store.currentQuestionIndex].id;
                                    const currentAns = answers[qId] ?? "";
                                    const isMulti = questions[store.currentQuestionIndex].questionType === "MULTI_SELECT";
                                    const selected = isMulti ? currentAns.split(",").includes(opt) : currentAns === opt;
                                    return (
                                      <button
                                        key={oi}
                                        onClick={() => {
                                          if (isMulti) {
                                            const parts = currentAns ? currentAns.split(",") : [];
                                            const next = selected ? parts.filter((p) => p !== opt) : [...parts, opt];
                                            setAnswers({ ...answers, [qId]: next.join(",") });
                                          } else {
                                            setAnswers({ ...answers, [qId]: opt });
                                          }
                                        }}
                                        className={cn(
                                          "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left text-sm transition-all",
                                          selected ? "border-primary bg-primary/5 text-text-dark" : "border-border-dark text-text-dark/60"
                                        )}
                                      >
                                        <div className={cn(
                                          "w-4 h-4 flex-shrink-0 flex items-center justify-center border-2",
                                          isMulti ? "rounded" : "rounded-full",
                                          selected ? "border-primary bg-primary" : "border-border-dark"
                                        )}>
                                          {selected && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        {opt}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <textarea
                                  value={answers[questions[store.currentQuestionIndex].id] ?? ""}
                                  onChange={(e) => setAnswers({ ...answers, [questions[store.currentQuestionIndex].id]: e.target.value })}
                                  placeholder="Enter response..."
                                  rows={4}
                                  className="w-full rounded-lg border border-border-dark bg-surface-dark px-4 py-3 text-sm text-text-dark placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                                />
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {/* General Notes */}
                      <div className="mb-5">
                        <label className="block text-base font-medium text-text-dark mb-2">General Notes</label>
                        <textarea
                          value={generalNotes}
                          onChange={(e) => setGeneralNotes(e.target.value)}
                          placeholder="Additional observations..."
                          rows={3}
                          className="w-full rounded-lg border border-border-dark bg-surface-dark px-4 py-3 text-sm text-text-dark placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex justify-between">
                        <Button variant="secondary" leftIcon={<Save className="w-4 h-4" />} onClick={saveProgress} loading={updateInterview.isPending}>
                          Save Progress
                        </Button>
                        <Button
                          variant="destructive"
                          leftIcon={<CheckCircle className="w-4 h-4" />}
                          onClick={() => setCompleteConfirmId(expandedInterview?.id ?? null)}
                        >
                          Complete Interview
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ═══ Step 5: Review ═══ */}
                  {store.activeStep === 4 && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h2 className="text-lg font-semibold text-text-dark">Review Results</h2>
                        <Badge variant="default" size="sm">Ready for approval</Badge>
                      </div>
                      <p className="text-sm text-text-dark/50 mb-5">Review and finalize interview outcomes</p>

                      {/* Stats Row */}
                      <div className="grid grid-cols-4 gap-0 rounded-xl bg-surface-dark/50 border border-border-dark p-6 mb-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-emerald-400">{answeredCount}/{questions.length}</p>
                          <p className="text-sm text-text-dark/40">Questions Answered</p>
                        </div>
                        <div className="text-center border-l border-border-dark">
                          <p className="text-2xl font-bold text-blue-400">{expandedInterview?.duration ?? 60} min</p>
                          <p className="text-sm text-text-dark/40">Duration</p>
                        </div>
                        <div className="text-center border-l border-border-dark">
                          <p className="text-2xl font-bold text-purple-400">{selectedAssets.length}</p>
                          <p className="text-sm text-text-dark/40">Assets Covered</p>
                        </div>
                        <div className="text-center border-l border-border-dark">
                          <p className="text-2xl font-bold text-amber-400">{completionRate}%</p>
                          <p className="text-sm text-text-dark/40">Completion</p>
                        </div>
                      </div>

                      {/* Grouped Questions Review */}
                      <div className="space-y-3 mb-6">
                        {questions.map((q, i) => (
                          <div key={q.id} className="p-4 rounded-lg border border-border-dark">
                            <p className="text-sm font-medium text-text-dark mb-1">
                              Q{i + 1}. {q.questionText}
                            </p>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="default" size="sm">{q.questionType.toLowerCase().replace("_", "-")}</Badge>
                              <Badge variant={q.source === "TEMPLATE" ? "info" : "default"} size="sm">
                                {q.source === "TEMPLATE" ? "Template" : "Custom"}
                              </Badge>
                            </div>
                            <p className="text-sm text-text-dark/60">
                              {answers[q.id] || "No answer recorded"}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Interview Notes */}
                      {generalNotes && (
                        <div className="mb-6">
                          <h3 className="text-base font-medium text-text-dark mb-2">Interview Notes</h3>
                          <div className="rounded-lg bg-surface-dark/50 border border-border-dark px-4 py-3">
                            <p className="text-sm text-text-dark/70 whitespace-pre-wrap">{generalNotes}</p>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<Pencil className="w-3.5 h-3.5" />}
                            onClick={() => store.setActiveStep(3)}
                          >
                            Edit Responses
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<Download className="w-3.5 h-3.5" />}
                          >
                            Export PDF
                          </Button>
                        </div>
                        <Button
                          variant="primary"
                          leftIcon={<ShieldCheck className="w-4 h-4" />}
                          onClick={approveAndLock}
                          loading={lockInterview.isPending}
                        >
                          Approve &amp; Lock
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}

        {interviews.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-text-dark/40 mb-3">No interviews yet</p>
            <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={handleAddInterview}>
              Add Your First Interview
            </Button>
          </div>
        )}
      </div>

      {/* ── Modals & Panels ── */}
      <AddQuestionModal
        assetOptions={assetSelectOptions}
        onAdd={addQuestion}
      />
      <QuestionTemplatesPanel onAddTemplate={addFromTemplate} />

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Interview"
        size="sm"
      >
        <p className="text-sm text-text-dark/60 mb-4">
          Are you sure you want to delete this interview? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (deleteConfirmId) {
                deleteInterview.mutate(deleteConfirmId);
                if (store.expandedInterviewId === deleteConfirmId) {
                  store.setExpandedInterview(null);
                }
              }
              setDeleteConfirmId(null);
            }}
            loading={deleteInterview.isPending}
          >
            Delete
          </Button>
        </div>
      </Modal>

      {/* Complete Confirmation */}
      <Modal
        open={!!completeConfirmId}
        onClose={() => setCompleteConfirmId(null)}
        title="Complete Interview"
        size="sm"
      >
        <p className="text-sm text-text-dark/60 mb-4">
          Are you sure you want to mark this interview as complete? You can still review and edit responses in the Review step.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setCompleteConfirmId(null)}>Cancel</Button>
          <Button variant="primary" onClick={completeInterview}>
            Complete Interview
          </Button>
        </div>
      </Modal>
    </div>
  );
}
