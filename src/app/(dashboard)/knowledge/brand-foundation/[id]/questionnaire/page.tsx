"use client";

import { useState, useCallback } from "react";
import { use } from "react";
import Link from "next/link";
import {
  Plus,
  Send,
  Link as LinkIcon,
  Copy,
  Upload,
  Trash2,
  GripVertical,
  ArrowLeft,
  ArrowRight,
  Check,
  Lock,
  Unlock,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Users,
  Mail,
  Download,
  Share2,
  FileText,
  BarChart3,
  MoreVertical,
  Pencil,
  Eye,
  EyeOff,
  Globe,
  HelpCircle,
  TrendingUp,
  MessageSquare,
  CheckSquare,
  Target,
  Heart,
  Save,
  CheckCircle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/Toggle";
import { Dropdown } from "@/components/ui/Dropdown";
import { WizardStepper } from "@/components/strategy/WizardStepper";
import { useQuestionnaireStore } from "@/stores/questionnaireStore";
import {
  useAssetQuestionnaires,
  useCreateQuestionnaire,
  useUpdateQuestionnaire,
  useDeleteQuestionnaire,
  useValidateQuestionnaire,
  useUnlockQuestionnaire,
  useDuplicateQuestionnaire,
  useSendQuestionnaire,
  type Questionnaire,
} from "@/hooks/api/useQuestionnaires";
import {
  QUESTION_TYPE_OPTIONS,
  RECIPIENT_GROUP_OPTIONS,
  WIZARD_STEPS,
  REMINDER_DAY_OPTIONS,
  DEFAULT_EMAIL_SUBJECT,
  DEFAULT_EMAIL_BODY,
  MOCK_AI_INSIGHTS,
  MOCK_ANALYZE_STATS,
  type QuestionnaireQuestionItem,
  type QuestionnaireRecipientItem,
  type QuestionnaireInsight,
} from "@/lib/constants/questionnaire";
import { cn } from "@/lib/utils";

// ── Types & Constants ──

type QStatusKey = "DRAFT" | "COLLECTING" | "ANALYZED" | "VALIDATED";

const STATUS_CONFIG: Record<
  QStatusKey,
  { label: string; variant: "default" | "info" | "success" | "warning"; icon: string }
> = {
  DRAFT: { label: "Draft", variant: "default", icon: "📋" },
  COLLECTING: { label: "Collecting", variant: "info", icon: "📦" },
  ANALYZED: { label: "Analyzed", variant: "success", icon: "✓" },
  VALIDATED: { label: "Validated", variant: "success", icon: "✓" },
};

const ASSET_TAB_ICONS: Record<string, React.ReactNode> = {
  "Brand Archetype": <Users className="w-3.5 h-3.5" />,
  "Vision & Mission": <Target className="w-3.5 h-3.5" />,
  "Brand Positioning": <TrendingUp className="w-3.5 h-3.5" />,
  "Core Values": <Heart className="w-3.5 h-3.5" />,
};

// ── Page Component ──

export default function QuestionnairePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: assetId } = use(params);
  const store = useQuestionnaireStore();

  // API hooks
  const { data: rawData } = useAssetQuestionnaires({ assetId });
  const createQuestionnaire = useCreateQuestionnaire();
  const updateQuestionnaire = useUpdateQuestionnaire();
  const deleteQuestionnaire = useDeleteQuestionnaire();
  const validateQuestionnaire = useValidateQuestionnaire();
  const unlockQuestionnaire = useUnlockQuestionnaire();
  const duplicateQuestionnaire = useDuplicateQuestionnaire();
  const sendQuestionnaire = useSendQuestionnaire();

  // Normalize API response
  const questionnaires: Questionnaire[] = Array.isArray(rawData)
    ? rawData
    : (rawData as unknown as { data?: Questionnaire[] })?.data ?? [];

  // Local form state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [nameForm, setNameForm] = useState({ name: "", description: "" });
  const [questions, setQuestions] = useState<QuestionnaireQuestionItem[]>([]);
  const [distMethod, setDistMethod] = useState<"email" | "link">("email");
  const [emailSubject, setEmailSubject] = useState(DEFAULT_EMAIL_SUBJECT);
  const [emailBody, setEmailBody] = useState(DEFAULT_EMAIL_BODY);
  const [anonymous, setAnonymous] = useState(false);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [sendReminders, setSendReminders] = useState(true);
  const [reminderDays, setReminderDays] = useState(3);
  const [recipients, setRecipients] = useState<QuestionnaireRecipientItem[]>([]);
  const [copied, setCopied] = useState(false);

  // Add question inline form state
  const [newQText, setNewQText] = useState("");
  const [newQType, setNewQType] = useState("SHORT_TEXT");
  const [newQAsset, setNewQAsset] = useState("");
  const [newQRequired, setNewQRequired] = useState(false);
  const [newQOptions, setNewQOptions] = useState<string[]>(["", ""]);

  // Add recipient form state
  const [recipientForm, setRecipientForm] = useState({
    name: "",
    email: "",
    group: "STAKEHOLDER",
    role: "",
  });

  // Expanded questionnaire
  const expandedQuestionnaire = questionnaires.find(
    (q) => q.id === store.expandedQuestionnaireId
  );

  // Sync form state when expanding
  const syncFormFromQuestionnaire = useCallback(
    (q: Questionnaire) => {
      setNameForm({ name: q.name, description: q.description ?? "" });
      const qQuestions = (q.questions as QuestionnaireQuestionItem[]) ?? [];
      setQuestions(qQuestions);
      setDistMethod(q.distributionMethod === "link" ? "link" : "email");
      setEmailSubject(q.emailSubject ?? DEFAULT_EMAIL_SUBJECT);
      setEmailBody(q.emailBody ?? DEFAULT_EMAIL_BODY);
      setAnonymous(q.isAnonymous);
      setAllowMultiple(q.allowMultiple);
      setReminderDays(q.reminderDays ?? 3);
      const qRecipients = (q.recipients as QuestionnaireRecipientItem[]) ?? [];
      setRecipients(qRecipients);
      store.setActiveStep(Math.max(0, (q.currentStep ?? 1) - 1));
    },
    [store]
  );

  const handleToggleExpand = (q: Questionnaire) => {
    if (store.expandedQuestionnaireId === q.id) {
      store.setExpandedQuestionnaire(null);
    } else {
      store.setExpandedQuestionnaire(q.id);
      syncFormFromQuestionnaire(q);
    }
  };

  const handleCreate = () => {
    createQuestionnaire.mutate(
      { assetId, name: `Questionnaire #${questionnaires.length + 1}`, distributionMethod: "email" as const, isAnonymous: false, allowMultiple: false },
      {
        onSuccess: (newQ) => {
          const created =
            (newQ as { id?: string })?.id ?? (newQ as Questionnaire)?.id;
          if (created) {
            store.setExpandedQuestionnaire(created);
            setNameForm({
              name: `Questionnaire #${questionnaires.length + 1}`,
              description: "",
            });
            setQuestions([]);
            setDistMethod("email");
            setEmailSubject(DEFAULT_EMAIL_SUBJECT);
            setEmailBody(DEFAULT_EMAIL_BODY);
            setAnonymous(false);
            setAllowMultiple(false);
            setRecipients([]);
            store.setActiveStep(0);
          }
        },
      }
    );
  };

  // ── Save helpers ──

  const saveDesign = () => {
    if (!expandedQuestionnaire) return;
    updateQuestionnaire.mutate({
      questionnaireId: expandedQuestionnaire.id,
      name: nameForm.name || undefined,
      description: nameForm.description || undefined,
      questions: questions.map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type === "SHORT_TEXT" ? "text" : q.type === "TEXTAREA" ? "text" : q.type === "MULTIPLE_CHOICE" ? "multiple_choice" : q.type === "RATING" ? "rating" : "scale",
        required: q.required,
        options: q.options,
      })),
      currentStep: Math.max(store.activeStep + 1, expandedQuestionnaire.currentStep),
    });
  };

  const saveDistribution = () => {
    if (!expandedQuestionnaire) return;
    updateQuestionnaire.mutate({
      questionnaireId: expandedQuestionnaire.id,
      distributionMethod: distMethod === "link" ? "link" : "email",
      emailSubject: distMethod === "email" ? emailSubject : undefined,
      emailBody: distMethod === "email" ? emailBody : undefined,
      isAnonymous: anonymous,
      allowMultiple,
      reminderDays: sendReminders ? reminderDays : undefined,
      currentStep: Math.max(store.activeStep + 1, expandedQuestionnaire.currentStep),
    });
  };

  const saveRecipients = () => {
    if (!expandedQuestionnaire) return;
    updateQuestionnaire.mutate({
      questionnaireId: expandedQuestionnaire.id,
      recipients: recipients.map((r) => ({ email: r.email, name: r.name })),
      currentStep: Math.max(store.activeStep + 1, expandedQuestionnaire.currentStep),
    });
  };

  const handleAddQuestion = () => {
    if (!newQText.trim()) return;
    const needsOptions = ["MULTIPLE_CHOICE", "RANKING"].includes(newQType);
    setQuestions((prev) => [
      ...prev,
      {
        id: `q-${Date.now()}`,
        text: newQText.trim(),
        type: newQType as QuestionnaireQuestionItem["type"],
        required: newQRequired,
        assetLink: newQAsset || undefined,
        options: needsOptions ? newQOptions.filter((o) => o.trim()) : undefined,
      },
    ]);
    setNewQText("");
    setNewQType("SHORT_TEXT");
    setNewQAsset("");
    setNewQRequired(false);
    setNewQOptions(["", ""]);
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleAddRecipient = () => {
    if (!recipientForm.name.trim() || !recipientForm.email.trim()) return;
    setRecipients((prev) => [
      ...prev,
      {
        id: `r-${Date.now()}`,
        name: recipientForm.name.trim(),
        email: recipientForm.email.trim(),
        group: recipientForm.group,
        role: recipientForm.role || undefined,
        status: "PENDING" as const,
      },
    ]);
    setRecipientForm({ name: "", email: "", group: "STAKEHOLDER", role: "" });
    store.closeAddRecipientModal();
  };

  const handleCopyLink = () => {
    const link =
      expandedQuestionnaire?.shareableLink ??
      `https://branddock.app/survey/${expandedQuestionnaire?.id?.slice(0, 8)}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendQuestionnaire = () => {
    if (!expandedQuestionnaire) return;
    sendQuestionnaire.mutate({ questionnaireId: expandedQuestionnaire.id });
  };

  const handleValidate = () => {
    if (!expandedQuestionnaire) return;
    validateQuestionnaire.mutate(expandedQuestionnaire.id, {
      onSuccess: () => store.closeValidateModal(),
    });
  };

  // ── Stats ──
  const totalQuestions = questionnaires.reduce(
    (s, q) => s + ((q.questions as unknown[])?.length ?? 0),
    0
  );
  const totalRecipients = questionnaires.reduce(
    (s, q) => s + ((q.recipients as unknown[])?.length ?? 0),
    0
  );
  const totalResponses = questionnaires.reduce(
    (s, q) => s + q.totalResponses,
    0
  );
  const respondingQs = questionnaires.filter((q) => q.responseRate > 0);
  const avgRate =
    respondingQs.length > 0
      ? Math.round(
          respondingQs.reduce((s, q) => s + q.responseRate, 0) /
            respondingQs.length
        )
      : 0;

  // Analyze data for expanded questionnaire
  const analyzeQuestions = (expandedQuestionnaire?.questions as QuestionnaireQuestionItem[]) ?? questions;
  const analyzeInsights = (expandedQuestionnaire?.aiInsights as unknown as QuestionnaireInsight[]) ?? MOCK_AI_INSIGHTS;
  const analyzeStats = {
    totalResponses: expandedQuestionnaire?.totalResponses ?? MOCK_ANALYZE_STATS.totalResponses,
    responseRate: expandedQuestionnaire?.responseRate ?? MOCK_ANALYZE_STATS.responseRate,
    completionRate: expandedQuestionnaire?.completionRate ?? MOCK_ANALYZE_STATS.completionRate,
    avgTime: expandedQuestionnaire?.avgTime ?? MOCK_ANALYZE_STATS.avgTime,
    assetsCovered: new Set(analyzeQuestions.map((q) => q.assetLink).filter(Boolean)).size || MOCK_ANALYZE_STATS.assetsCovered,
  };

  // Asset tabs for Analyze step
  const assetGroups = analyzeQuestions.reduce<Record<string, QuestionnaireQuestionItem[]>>((acc, q) => {
    const key = q.assetLink || "General";
    if (!acc[key]) acc[key] = [];
    acc[key].push(q);
    return acc;
  }, {});

  return (
    <div className="max-w-[900px] mx-auto">
      {/* Back to Asset */}
      <Link
        href={`/knowledge/brand-foundation/${assetId}`}
        className="inline-flex items-center gap-1.5 text-sm text-text-dark/50 hover:text-text-dark mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Asset
      </Link>

      {/* Page Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Questionnaire</h1>
          <p className="text-sm text-text-dark/50 mt-0.5">
            Collect brand insights through structured surveys
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={handleCreate}
          disabled={createQuestionnaire.isPending}
        >
          Create Questionnaire
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 mb-6 text-sm text-text-dark/60">
        <span className="flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-text-dark/40" />
          {totalQuestions} Questions
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="w-4 h-4 text-text-dark/40" />
          {totalRecipients} Recipients
        </span>
        <span className="flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-text-dark/40" />
          {totalResponses} Responses
        </span>
        <span className="flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-text-dark/40" />
          {avgRate}% Response Rate
        </span>
      </div>

      {/* Questionnaire Cards */}
      <div className="space-y-3">
        {questionnaires.length === 0 && (
          <Card padding="lg">
            <div className="text-center py-8">
              <MessageSquare className="w-10 h-10 text-text-dark/20 mx-auto mb-2" />
              <p className="text-sm text-text-dark/40">
                No questionnaires yet
              </p>
              <p className="text-xs text-text-dark/30 mt-1">
                Create your first questionnaire to start collecting insights
              </p>
            </div>
          </Card>
        )}

        {questionnaires.map((qs) => {
          const isExpanded = store.expandedQuestionnaireId === qs.id;
          const cfg = STATUS_CONFIG[(qs.status as QStatusKey) ?? "DRAFT"];
          const qCount = (qs.questions as unknown[])?.length ?? 0;
          const rCount = (qs.recipients as unknown[])?.length ?? 0;

          return (
            <Card key={qs.id} padding="none">
              <div className="px-5 py-4">
                {/* Card Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-text-dark truncate">
                      {qs.name}
                    </h3>
                    <Badge variant={cfg.variant} size="sm">
                      {cfg.label}
                    </Badge>
                    {qs.isLocked && (
                      <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Progress Ring */}
                    {qs.responseRate > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="relative w-10 h-10">
                          <svg
                            className="w-10 h-10 -rotate-90"
                            viewBox="0 0 40 40"
                          >
                            <circle
                              cx="20"
                              cy="20"
                              r="16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              className="text-border-dark/30"
                            />
                            <circle
                              cx="20"
                              cy="20"
                              r="16"
                              fill="none"
                              strokeWidth="3"
                              className="text-primary"
                              stroke="currentColor"
                              strokeDasharray={`${(qs.responseRate / 100) * 100.5} 100.5`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-text-dark">
                            {qs.responseRate}%
                          </span>
                        </div>
                        <span className="text-xs text-text-dark/40">
                          {qs.totalResponses}/{rCount}
                        </span>
                      </div>
                    )}

                    {/* Overflow Menu */}
                    <Dropdown
                      align="right"
                      trigger={
                        <button className="p-1.5 rounded-md text-text-dark/40 hover:text-text-dark hover:bg-surface-dark transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      }
                      items={[
                        {
                          label: "Edit",
                          icon: <Pencil className="w-4 h-4" />,
                          onClick: () => handleToggleExpand(qs),
                        },
                        {
                          label: "Duplicate",
                          icon: <Copy className="w-4 h-4" />,
                          onClick: () =>
                            duplicateQuestionnaire.mutate(qs.id),
                        },
                        "separator",
                        {
                          label: "Delete",
                          icon: <Trash2 className="w-4 h-4" />,
                          danger: true,
                          onClick: () => setDeleteConfirmId(qs.id),
                        },
                      ]}
                    />
                  </div>
                </div>

                {/* Card Metadata */}
                <div className="flex items-center gap-3 text-xs text-text-dark/40 mt-1.5">
                  <span>{qCount} questions</span>
                  <span>•</span>
                  <span>{rCount} recipients</span>
                  <span>•</span>
                  <span>
                    Created{" "}
                    {new Date(qs.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* View Details Toggle */}
              <button
                onClick={() => handleToggleExpand(qs)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 border-t border-border-dark text-sm text-text-dark/50 hover:text-text-dark hover:bg-surface-dark/30 transition-colors"
              >
                {isExpanded ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    Hide Details
                    <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    View Details
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-border-dark px-5 py-5">
                  {/* Locked Banner */}
                  {qs.isLocked && (
                    <div className="flex items-center justify-between rounded-lg bg-amber-500/5 border border-amber-500/20 px-4 py-3 mb-5">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-amber-400" />
                        <span className="text-sm text-amber-300">
                          This questionnaire is locked. Unlock to make changes.
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          unlockQuestionnaire.mutate(qs.id)
                        }
                        className="text-sm text-primary hover:underline font-medium"
                      >
                        Unlock Questionnaire
                      </button>
                    </div>
                  )}

                  {/* Wizard Stepper */}
                  <div className="mb-6">
                    <WizardStepper
                      steps={[...WIZARD_STEPS]}
                      currentStep={store.activeStep}
                    />
                  </div>

                  {/* ═══════════════ STEP 1: DESIGN ═══════════════ */}
                  {store.activeStep === 0 && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-lg font-semibold text-text-dark">
                          Design Questionnaire
                        </h2>
                        <p className="text-sm text-text-dark/50 mt-0.5">
                          Build questions and link to brand assets
                        </p>
                      </div>

                      {/* Basic Information */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-text-dark">
                          Basic Information
                        </h3>
                        <Input
                          label="Questionnaire Name"
                          value={nameForm.name}
                          onChange={(e) =>
                            setNameForm((p) => ({
                              ...p,
                              name: e.target.value,
                            }))
                          }
                          placeholder="Customer Experience Survey"
                        />
                        <div>
                          <label className="block text-sm font-medium text-text-dark mb-1">
                            Description (Optional)
                          </label>
                          <textarea
                            value={nameForm.description}
                            onChange={(e) =>
                              setNameForm((p) => ({
                                ...p,
                                description: e.target.value,
                              }))
                            }
                            placeholder="Gathering insights on customer satisfaction and experience"
                            rows={2}
                            className="w-full rounded-md border border-border-dark bg-surface-dark px-3 py-2 text-sm text-text-dark placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                          />
                        </div>
                      </div>

                      {/* Questions List */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-medium text-text-dark">
                            Questions ({questions.length})
                          </h3>
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<Upload className="w-3.5 h-3.5" />}
                          >
                            Import Template
                          </Button>
                        </div>
                        <div className="space-y-2 mb-4">
                          {questions.map((q, idx) => (
                            <div
                              key={q.id}
                              className="flex items-center gap-3 p-3 rounded-lg border border-border-dark"
                            >
                              <GripVertical className="w-4 h-4 text-text-dark/20 flex-shrink-0 cursor-grab" />
                              <span className="text-xs font-medium text-text-dark/40 flex-shrink-0">
                                Q{idx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-text-dark truncate">
                                  {q.text}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-text-dark/40 flex items-center gap-1">
                                    <CheckSquare className="w-3 h-3" />
                                    {QUESTION_TYPE_OPTIONS.find(
                                      (o) => o.value === q.type
                                    )?.label ?? q.type}
                                  </span>
                                  {q.required && (
                                    <Badge variant="warning" size="sm">
                                      Required
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveQuestion(q.id)}
                                className="p-1 text-text-dark/30 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Inline Add Question Form */}
                        <div className="rounded-lg border border-border-dark bg-surface-dark/30 p-5 space-y-4">
                          <h4 className="text-sm font-medium text-text-dark">
                            Add Question
                          </h4>
                          <Input
                            label="Question Text"
                            value={newQText}
                            onChange={(e) => setNewQText(e.target.value)}
                            placeholder="How would you describe our brand?"
                          />
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-text-dark mb-1">
                                Question Type
                              </label>
                              <select
                                value={newQType}
                                onChange={(e) => setNewQType(e.target.value)}
                                className="h-10 w-full rounded-md border border-border-dark bg-surface-dark px-3 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                              >
                                {QUESTION_TYPE_OPTIONS.map((o) => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-text-dark mb-1">
                                Link to Asset (Optional)
                              </label>
                              <select
                                value={newQAsset}
                                onChange={(e) => setNewQAsset(e.target.value)}
                                className="h-10 w-full rounded-md border border-border-dark bg-surface-dark px-3 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                              >
                                <option value="">None</option>
                                <option value="Brand Archetype">
                                  Brand Archetype
                                </option>
                                <option value="Vision & Mission">
                                  Vision &amp; Mission
                                </option>
                                <option value="Brand Positioning">
                                  Brand Positioning
                                </option>
                                <option value="Core Values">Core Values</option>
                                <option value="Brand Personality">
                                  Brand Personality
                                </option>
                              </select>
                            </div>
                          </div>

                          {/* Options for MC/Ranking */}
                          {["MULTIPLE_CHOICE", "RANKING"].includes(newQType) && (
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-text-dark">
                                Answer Options
                              </label>
                              {newQOptions.map((opt, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2"
                                >
                                  <input
                                    value={opt}
                                    onChange={(e) => {
                                      const updated = [...newQOptions];
                                      updated[i] = e.target.value;
                                      setNewQOptions(updated);
                                    }}
                                    placeholder={`Option ${i + 1}`}
                                    className="flex-1 h-9 rounded-md border border-border-dark bg-surface-dark px-3 text-sm text-text-dark placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary"
                                  />
                                  {newQOptions.length > 2 && (
                                    <button
                                      onClick={() =>
                                        setNewQOptions(
                                          newQOptions.filter(
                                            (_, j) => j !== i
                                          )
                                        )
                                      }
                                      className="p-1 text-text-dark/30 hover:text-red-400"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              ))}
                              <button
                                onClick={() =>
                                  setNewQOptions([...newQOptions, ""])
                                }
                                className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Add Option
                              </button>
                            </div>
                          )}

                          {/* Required checkbox */}
                          <label className="flex items-center gap-2 cursor-pointer">
                            <div
                              className={cn(
                                "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                newQRequired
                                  ? "bg-primary border-primary"
                                  : "border-border-dark"
                              )}
                              onClick={() => setNewQRequired(!newQRequired)}
                            >
                              {newQRequired && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <span className="text-sm text-text-dark/70">
                              Required question
                            </span>
                          </label>

                          <Button
                            variant="primary"
                            fullWidth
                            leftIcon={<Plus className="w-4 h-4" />}
                            onClick={handleAddQuestion}
                            disabled={!newQText.trim()}
                          >
                            Add Question
                          </Button>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-border-dark">
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Save className="w-3.5 h-3.5" />}
                          onClick={saveDesign}
                        >
                          Save Draft
                        </Button>
                        <Button
                          variant="primary"
                          rightIcon={<ArrowRight className="w-4 h-4" />}
                          onClick={() => {
                            saveDesign();
                            store.setActiveStep(1);
                          }}
                        >
                          Continue to Distribution
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ═══════════════ STEP 2: DISTRIBUTION ═══════════════ */}
                  {store.activeStep === 1 && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-lg font-semibold text-text-dark">
                          Distribution Settings
                        </h2>
                        <p className="text-sm text-text-dark/50 mt-0.5">
                          Configure how to send the questionnaire
                        </p>
                      </div>

                      {/* Distribution Method */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium text-text-dark">
                          Distribution Method
                        </h3>
                        <div className="space-y-2">
                          <button
                            onClick={() => setDistMethod("email")}
                            className={cn(
                              "w-full flex items-center gap-3 p-4 rounded-lg border transition-colors text-left",
                              distMethod === "email"
                                ? "border-primary bg-primary/5"
                                : "border-border-dark hover:bg-surface-dark/50"
                            )}
                          >
                            <div
                              className={cn(
                                "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                                distMethod === "email"
                                  ? "border-primary"
                                  : "border-border-dark"
                              )}
                            >
                              {distMethod === "email" && (
                                <div className="w-2 h-2 rounded-full bg-primary" />
                              )}
                            </div>
                            <Mail className="w-5 h-5 text-text-dark/50 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-text-dark">
                                Email Distribution
                              </p>
                              <p className="text-xs text-text-dark/40">
                                Send personalized email invitations to
                                recipients with unique links
                              </p>
                            </div>
                          </button>
                          <button
                            onClick={() => setDistMethod("link")}
                            className={cn(
                              "w-full flex items-center gap-3 p-4 rounded-lg border transition-colors text-left",
                              distMethod === "link"
                                ? "border-primary bg-primary/5"
                                : "border-border-dark hover:bg-surface-dark/50"
                            )}
                          >
                            <div
                              className={cn(
                                "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                                distMethod === "link"
                                  ? "border-primary"
                                  : "border-border-dark"
                              )}
                            >
                              {distMethod === "link" && (
                                <div className="w-2 h-2 rounded-full bg-primary" />
                              )}
                            </div>
                            <LinkIcon className="w-5 h-5 text-text-dark/50 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-text-dark">
                                Shareable Link
                              </p>
                              <p className="text-xs text-text-dark/40">
                                Generate a single link you can share anywhere
                                (social media, website, etc.)
                              </p>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Email Configuration (conditional) */}
                      {distMethod === "email" && (
                        <div className="space-y-4">
                          <h3 className="text-sm font-medium text-text-dark">
                            Email Configuration
                          </h3>
                          <div>
                            <label className="block text-sm font-medium text-text-dark mb-1">
                              Email Subject
                            </label>
                            <input
                              value={emailSubject}
                              onChange={(e) => setEmailSubject(e.target.value)}
                              className="h-10 w-full rounded-md border border-border-dark bg-surface-dark px-3 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <p className="text-xs text-text-dark/30 mt-1">
                              Use {"{questionnaire_name}"} for dynamic name
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-text-dark mb-1">
                              Email Body
                            </label>
                            <textarea
                              value={emailBody}
                              onChange={(e) => setEmailBody(e.target.value)}
                              rows={8}
                              className="w-full rounded-md border border-border-dark bg-surface-dark px-3 py-2 text-sm text-text-dark font-mono focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                            />
                            <p className="text-xs text-text-dark/30 mt-1">
                              Available placeholders: {"{recipient_name}"},{" "}
                              {"{questionnaire_name}"},{" "}
                              {"{questionnaire_link}"}
                            </p>
                          </div>

                          {/* Email Preview */}
                          <div className="rounded-lg border border-border-dark bg-surface-dark/30 p-4">
                            <div className="flex items-center gap-1.5 mb-3">
                              <Eye className="w-4 h-4 text-text-dark/40" />
                              <span className="text-sm font-semibold text-text-dark">
                                Preview
                              </span>
                            </div>
                            <div className="text-sm text-text-dark/70 space-y-1">
                              <p>
                                <span className="font-medium text-text-dark">
                                  Subject:
                                </span>{" "}
                                {emailSubject.replace(
                                  "{questionnaire_name}",
                                  nameForm.name || "Survey"
                                )}
                              </p>
                              <div className="pt-2 whitespace-pre-line">
                                {emailBody
                                  .replace("{recipient_name}", "John Doe")
                                  .replace(
                                    "{questionnaire_name}",
                                    nameForm.name || "Survey"
                                  )
                                  .replace(
                                    "{questionnaire_link}",
                                    `https://branddock.app/survey/${qs.id.slice(0, 8)}`
                                  )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Shareable Link (conditional) */}
                      {distMethod === "link" && (
                        <div className="space-y-4">
                          <h3 className="text-sm font-medium text-text-dark">
                            Shareable Link
                          </h3>
                          <div>
                            <label className="block text-sm font-medium text-text-dark mb-1">
                              Questionnaire Link
                            </label>
                            <div className="flex gap-2">
                              <input
                                readOnly
                                value={
                                  qs.shareableLink ??
                                  `https://branddock.app/survey/${qs.id.slice(0, 8)}`
                                }
                                className="flex-1 h-10 rounded-md border border-border-dark bg-surface-dark/50 px-3 text-sm text-text-dark/60 font-mono focus:outline-none"
                              />
                              <Button
                                variant="secondary"
                                leftIcon={
                                  copied ? (
                                    <Check className="w-4 h-4" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )
                                }
                                onClick={handleCopyLink}
                              >
                                {copied ? "Copied!" : "Copy"}
                              </Button>
                            </div>
                            <p className="text-xs text-text-dark/30 mt-1">
                              Share this link via email, social media, or
                              embed it on your website
                            </p>
                          </div>

                          {/* Public Link Warning */}
                          <div className="flex items-start gap-3 rounded-lg bg-amber-500/5 border border-amber-500/20 p-4">
                            <Globe className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-amber-300">
                                Public Link
                              </p>
                              <p className="text-xs text-amber-300/60 mt-0.5">
                                Anyone with this link can access the
                                questionnaire. Response tracking will be
                                anonymous unless you collect identifying
                                information in the questions.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Response Settings */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium text-text-dark">
                          Response Settings
                        </h3>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-4 rounded-lg border border-border-dark">
                            <div>
                              <p className="text-sm font-medium text-text-dark">
                                Anonymous Responses
                              </p>
                              <p className="text-xs text-text-dark/40">
                                Respondent names and emails will not be stored
                                with their answers
                              </p>
                            </div>
                            <Toggle
                              checked={anonymous}
                              onChange={setAnonymous}
                              size="sm"
                            />
                          </div>
                          <div className="flex items-center justify-between p-4 rounded-lg border border-border-dark">
                            <div>
                              <p className="text-sm font-medium text-text-dark">
                                Allow Multiple Responses
                              </p>
                              <p className="text-xs text-text-dark/40">
                                Recipients can submit the questionnaire more
                                than once
                              </p>
                            </div>
                            <Toggle
                              checked={allowMultiple}
                              onChange={setAllowMultiple}
                              size="sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Reminder Settings (email only) */}
                      {distMethod === "email" && (
                        <div className="space-y-3">
                          <h3 className="text-sm font-medium text-text-dark">
                            Reminder Settings
                          </h3>
                          <div className="p-4 rounded-lg border border-border-dark space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-text-dark">
                                  Send Automatic Reminders
                                </p>
                                <p className="text-xs text-text-dark/40">
                                  Automatically remind recipients who haven't
                                  responded
                                </p>
                              </div>
                              <Toggle
                                checked={sendReminders}
                                onChange={setSendReminders}
                                size="sm"
                              />
                            </div>
                            {sendReminders && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-text-dark/60">
                                  Send reminder after
                                </span>
                                <select
                                  value={reminderDays}
                                  onChange={(e) =>
                                    setReminderDays(Number(e.target.value))
                                  }
                                  className="h-9 rounded-md border border-border-dark bg-surface-dark px-3 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                  {REMINDER_DAY_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                                <span className="text-sm text-text-dark/60">
                                  of no response
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Distribution Summary */}
                      <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm font-semibold text-emerald-300">
                            Distribution Summary
                          </span>
                        </div>
                        <ul className="space-y-1 text-xs text-emerald-300/70">
                          <li>
                            • Method:{" "}
                            {distMethod === "email"
                              ? "Email Distribution"
                              : "Shareable Link"}
                          </li>
                          <li>
                            • Anonymous: {anonymous ? "Yes" : "No"}
                          </li>
                          <li>
                            • Multiple responses:{" "}
                            {allowMultiple ? "Allowed" : "Not allowed"}
                          </li>
                          {distMethod === "email" && sendReminders && (
                            <li>• Reminders: After {reminderDays} days</li>
                          )}
                        </ul>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-border-dark">
                        <Button
                          variant="ghost"
                          leftIcon={<ArrowLeft className="w-4 h-4" />}
                          onClick={() => store.setActiveStep(0)}
                        >
                          Back
                        </Button>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<Save className="w-3.5 h-3.5" />}
                            onClick={saveDistribution}
                          >
                            Save Draft
                          </Button>
                          <Button
                            variant="primary"
                            rightIcon={<ArrowRight className="w-4 h-4" />}
                            onClick={() => {
                              saveDistribution();
                              store.setActiveStep(2);
                            }}
                          >
                            Continue to Recipients
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ═══════════════ STEP 3: RECIPIENTS ═══════════════ */}
                  {store.activeStep === 2 && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-lg font-semibold text-text-dark">
                          Add Recipients
                        </h2>
                        <p className="text-sm text-text-dark/50 mt-0.5">
                          Track recipients who will access via the shareable
                          link (optional)
                        </p>
                      </div>

                      {/* Recipients Header */}
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-text-dark">
                          Recipients ({recipients.length})
                        </h3>
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<Upload className="w-3.5 h-3.5" />}
                          >
                            Import CSV
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<Plus className="w-3.5 h-3.5" />}
                            onClick={store.openAddRecipientModal}
                          >
                            Add Recipient
                          </Button>
                        </div>
                      </div>

                      {/* Empty State or List */}
                      {recipients.length === 0 ? (
                        <div className="border-2 border-dashed border-border-dark rounded-xl bg-surface-dark/20 py-12 text-center">
                          <Users className="w-12 h-12 text-text-dark/20 mx-auto mb-3" />
                          <p className="text-sm font-medium text-text-dark/40">
                            No recipients added yet
                          </p>
                          <p className="text-xs text-text-dark/30 mt-1 mb-4">
                            Add recipients to track responses (optional for
                            link distribution)
                          </p>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              leftIcon={<Upload className="w-3.5 h-3.5" />}
                            >
                              Import CSV
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              leftIcon={<Plus className="w-3.5 h-3.5" />}
                              onClick={store.openAddRecipientModal}
                            >
                              Add Recipient
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {recipients.map((r) => (
                            <div
                              key={r.id}
                              className="flex items-center justify-between p-3 rounded-lg border border-border-dark"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                                  {r.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()
                                    .slice(0, 2)}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-text-dark">
                                    {r.name}
                                  </p>
                                  <p className="text-xs text-text-dark/40">
                                    {r.email}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="default" size="sm">
                                  {RECIPIENT_GROUP_OPTIONS.find(
                                    (g) => g.value === r.group
                                  )?.label ?? r.group}
                                </Badge>
                                {r.role && (
                                  <span className="text-xs text-text-dark/40">
                                    {r.role}
                                  </span>
                                )}
                                <button
                                  onClick={() =>
                                    setRecipients((prev) =>
                                      prev.filter((x) => x.id !== r.id)
                                    )
                                  }
                                  className="p-1 text-text-dark/30 hover:text-red-400 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-border-dark">
                        <Button
                          variant="ghost"
                          leftIcon={<ArrowLeft className="w-4 h-4" />}
                          onClick={() => store.setActiveStep(1)}
                        >
                          Back
                        </Button>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<Save className="w-3.5 h-3.5" />}
                            onClick={saveRecipients}
                          >
                            Save Draft
                          </Button>
                          <Button
                            variant="primary"
                            rightIcon={<ArrowRight className="w-4 h-4" />}
                            onClick={() => {
                              saveRecipients();
                              store.setActiveStep(3);
                            }}
                          >
                            Continue to Collect
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ═══════════════ STEP 4: COLLECT ═══════════════ */}
                  {store.activeStep === 3 && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-lg font-semibold text-text-dark">
                          Collect Responses
                        </h2>
                        <p className="text-sm text-text-dark/50 mt-0.5">
                          Send questionnaire to start collecting
                        </p>
                      </div>

                      <div className="rounded-xl border border-border-dark bg-surface-dark/30 py-8 px-8 text-center">
                        <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                          <Send className="w-7 h-7 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold text-text-dark mb-1">
                          Ready to Send
                        </h3>
                        <p className="text-sm text-text-dark/40 mb-6">
                          Generate and share your questionnaire link
                        </p>

                        {/* Checklist */}
                        <div className="space-y-2 mb-6 text-left max-w-xs mx-auto">
                          {[
                            `${questions.length} questions configured`,
                            `${recipients.length} recipients added`,
                            "Distribution settings configured",
                          ].map((item) => (
                            <div
                              key={item}
                              className="flex items-center gap-2 text-sm text-text-dark/60"
                            >
                              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                              {item}
                            </div>
                          ))}
                        </div>

                        <Button
                          variant="primary"
                          leftIcon={
                            copied ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )
                          }
                          onClick={() => {
                            handleSendQuestionnaire();
                            handleCopyLink();
                          }}
                        >
                          {copied ? "Copied!" : "Copy Shareable Link"}
                        </Button>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-border-dark">
                        <Button
                          variant="ghost"
                          leftIcon={<ArrowLeft className="w-4 h-4" />}
                          onClick={() => store.setActiveStep(2)}
                        >
                          Back
                        </Button>
                        <Button
                          variant="primary"
                          rightIcon={<ArrowRight className="w-4 h-4" />}
                          onClick={() => store.setActiveStep(4)}
                        >
                          View Results
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ═══════════════ STEP 5: ANALYZE ═══════════════ */}
                  {store.activeStep === 4 && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-lg font-semibold text-text-dark">
                          Analyze Results
                        </h2>
                        <p className="text-sm text-text-dark/50 mt-0.5">
                          Review insights and export findings
                        </p>
                      </div>

                      {/* Stats Row */}
                      <div className="grid grid-cols-5 gap-3 text-center">
                        {[
                          {
                            label: "Total Responses",
                            value: String(analyzeStats.totalResponses),
                          },
                          {
                            label: "Response Rate",
                            value: `${analyzeStats.responseRate}%`,
                          },
                          {
                            label: "Completion Rate",
                            value: `${analyzeStats.completionRate}%`,
                          },
                          {
                            label: "Avg. Time",
                            value: `${analyzeStats.avgTime} min`,
                          },
                          {
                            label: "Assets Covered",
                            value: String(analyzeStats.assetsCovered),
                          },
                        ].map((s) => (
                          <div
                            key={s.label}
                            className="p-3 rounded-lg border border-border-dark"
                          >
                            <p className="text-xs text-text-dark/40 mb-1">
                              {s.label}
                            </p>
                            <p className="text-xl font-bold text-text-dark">
                              {s.value}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* AI Insights */}
                      <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="success" size="sm">
                              <Sparkles className="w-3 h-3 mr-1" />
                              AI Generated
                            </Badge>
                            <span className="text-sm font-semibold text-text-dark">
                              Key Insights
                            </span>
                          </div>
                          <button className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors">
                            <RefreshCw className="w-3.5 h-3.5" />
                            Regenerate
                          </button>
                        </div>
                        <div className="space-y-3">
                          {(Array.isArray(analyzeInsights)
                            ? analyzeInsights
                            : MOCK_AI_INSIGHTS
                          ).map((insight, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 mt-2" />
                              <p className="text-sm text-text-dark/70">
                                <span className="font-semibold text-text-dark">
                                  {insight.title}:
                                </span>{" "}
                                {insight.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Results Tab Navigation */}
                      <div>
                        <div className="flex items-center gap-6 border-b border-border-dark mb-4 overflow-x-auto">
                          <button
                            onClick={() =>
                              store.setActiveAnalyzeTab("all")
                            }
                            className={cn(
                              "pb-2 text-sm whitespace-nowrap transition-colors border-b-2",
                              store.activeAnalyzeTab === "all"
                                ? "text-primary border-primary font-medium"
                                : "text-text-dark/40 border-transparent hover:text-text-dark/60"
                            )}
                          >
                            All Questions ({analyzeQuestions.length})
                          </button>
                          {Object.entries(assetGroups).map(
                            ([asset, qs]) => (
                              <button
                                key={asset}
                                onClick={() =>
                                  store.setActiveAnalyzeTab(asset)
                                }
                                className={cn(
                                  "pb-2 text-sm whitespace-nowrap transition-colors border-b-2 flex items-center gap-1.5",
                                  store.activeAnalyzeTab === asset
                                    ? "text-primary border-primary font-medium"
                                    : "text-text-dark/40 border-transparent hover:text-text-dark/60"
                                )}
                              >
                                {ASSET_TAB_ICONS[asset] ?? null}
                                {asset} ({qs.length})
                              </button>
                            )
                          )}
                        </div>

                        {/* Results by Question */}
                        <h3 className="text-base font-semibold text-text-dark mb-3">
                          {store.activeAnalyzeTab === "all"
                            ? "Results by Question"
                            : "Results by Asset"}
                        </h3>
                        <div className="space-y-2">
                          {(store.activeAnalyzeTab === "all"
                            ? analyzeQuestions
                            : assetGroups[store.activeAnalyzeTab] ?? []
                          ).map((q, idx) => (
                            <div
                              key={q.id}
                              className="p-4 rounded-lg border border-border-dark"
                            >
                              <p className="text-sm font-medium text-text-dark">
                                Q{idx + 1}: {q.text}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-text-dark/40 flex items-center gap-1">
                                  <CheckSquare className="w-3 h-3" />
                                  {QUESTION_TYPE_OPTIONS.find(
                                    (o) => o.value === q.type
                                  )?.label ?? q.type}
                                </span>
                                {q.assetLink && (
                                  <Badge variant="success" size="sm">
                                    {q.assetLink}
                                  </Badge>
                                )}
                                <Badge variant="success" size="sm">
                                  {analyzeStats.totalResponses} responses
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Export Options */}
                      <div>
                        <h3 className="text-sm font-medium text-text-dark mb-3">
                          Export Options
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<FileText className="w-3.5 h-3.5" />}
                          >
                            Export PDF Report
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<Download className="w-3.5 h-3.5" />}
                          >
                            Export Raw Data (CSV)
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<BarChart3 className="w-3.5 h-3.5" />}
                          >
                            Export Charts (PNG)
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<Share2 className="w-3.5 h-3.5" />}
                          >
                            Share Results
                          </Button>
                        </div>
                      </div>

                      {/* Footer actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-border-dark">
                        <Button
                          variant="secondary"
                          leftIcon={<Unlock className="w-4 h-4" />}
                          onClick={() =>
                            unlockQuestionnaire.mutate(qs.id)
                          }
                        >
                          Unlock for Editing
                        </Button>
                        <Button
                          variant="primary"
                          leftIcon={<Check className="w-4 h-4" />}
                          onClick={store.openValidateModal}
                        >
                          Mark as Validated
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* ═══════════════ ADD RECIPIENT MODAL ═══════════════ */}
      <Modal
        open={store.isAddRecipientModalOpen}
        onClose={store.closeAddRecipientModal}
        title="Add Recipient"
        description="Add a new recipient to the questionnaire"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={recipientForm.name}
            onChange={(e) =>
              setRecipientForm((p) => ({ ...p, name: e.target.value }))
            }
            placeholder="John Doe"
          />
          <Input
            label="Email"
            value={recipientForm.email}
            onChange={(e) =>
              setRecipientForm((p) => ({ ...p, email: e.target.value }))
            }
            placeholder="john.doe@company.com"
          />
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">
              Group
            </label>
            <select
              value={recipientForm.group}
              onChange={(e) =>
                setRecipientForm((p) => ({ ...p, group: e.target.value }))
              }
              className="h-10 w-full rounded-md border border-border-dark bg-surface-dark px-3 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {RECIPIENT_GROUP_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Role (Optional)"
            value={recipientForm.role}
            onChange={(e) =>
              setRecipientForm((p) => ({ ...p, role: e.target.value }))
            }
            placeholder="Marketing Manager"
          />
          <div className="flex justify-end gap-3 pt-2 border-t border-border-dark">
            <Button variant="ghost" onClick={store.closeAddRecipientModal}>
              Cancel
            </Button>
            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={handleAddRecipient}
              disabled={
                !recipientForm.name.trim() || !recipientForm.email.trim()
              }
            >
              Add Recipient
            </Button>
          </div>
        </div>
      </Modal>

      {/* ═══════════════ VALIDATE MODAL ═══════════════ */}
      <Modal
        open={store.isValidateModalOpen}
        onClose={store.closeValidateModal}
        title="Validate Questionnaire Results?"
        description="This will lock the questionnaire and update asset validation percentages"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            {[
              { label: "Total responses:", value: String(analyzeStats.totalResponses) },
              { label: "Response rate:", value: `${analyzeStats.responseRate}%` },
              { label: "Assets covered:", value: String(analyzeStats.assetsCovered) },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-text-dark/60">{row.label}</span>
                <span className="font-bold text-text-dark">{row.value}</span>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-4">
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <Check className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-300">
                Asset validation will be updated
              </p>
              <p className="text-xs text-emerald-300/60 mt-0.5">
                Brand assets linked to this questionnaire will have their
                validation percentages increased
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border-dark">
            <Button variant="ghost" onClick={store.closeValidateModal}>
              Cancel
            </Button>
            <Button
              variant="primary"
              leftIcon={<CheckCircle className="w-4 h-4" />}
              onClick={handleValidate}
              disabled={validateQuestionnaire.isPending}
            >
              Validate &amp; Lock
            </Button>
          </div>
        </div>
      </Modal>

      {/* ═══════════════ DELETE CONFIRM MODAL ═══════════════ */}
      <Modal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Questionnaire"
        description="Are you sure you want to delete this questionnaire? This action cannot be undone."
      >
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="!bg-red-500 hover:!bg-red-600"
            onClick={() => {
              if (deleteConfirmId) {
                deleteQuestionnaire.mutate(deleteConfirmId, {
                  onSuccess: () => {
                    setDeleteConfirmId(null);
                    if (
                      store.expandedQuestionnaireId === deleteConfirmId
                    ) {
                      store.setExpandedQuestionnaire(null);
                    }
                  },
                });
              }
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
