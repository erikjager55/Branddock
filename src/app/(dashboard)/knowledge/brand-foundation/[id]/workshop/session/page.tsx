"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  CheckCircle,
  ChevronRight,
  Clock,
  Camera,
  Lightbulb,
  Maximize2,
  ArrowLeft,
  ArrowRight,
  Check,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  useAssetWorkshops,
  useWorkshop,
  useUpdateWorkshop,
  useCompleteWorkshop,
} from "@/hooks/api/useWorkshops";
import { WORKSHOP_STEPS, FACILITATOR_TIPS } from "@/lib/constants/workshop";
import { cn } from "@/lib/utils";

export default function WorkshopSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  // ── API hooks ──
  const { data: workshops } = useAssetWorkshops(id);
  const activeWorkshop = Array.isArray(workshops)
    ? workshops.find((w) => w.status === "IN_PROGRESS" || w.status === "PURCHASED")
    : undefined;
  const { data: workshopDetail } = useWorkshop(activeWorkshop?.id ?? "");
  const updateWorkshop = useUpdateWorkshop();
  const completeWorkshop = useCompleteWorkshop();

  // ── Local state ──
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<string[]>(WORKSHOP_STEPS.map(() => ""));
  const [seconds, setSeconds] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Sync from API data
  useEffect(() => {
    if (workshopDetail) {
      if (workshopDetail.currentStep > 0) {
        setCurrentStep(workshopDetail.currentStep);
      }
      if (workshopDetail.stepResponses) {
        const sr = workshopDetail.stepResponses as Record<string, string>;
        const loaded = WORKSHOP_STEPS.map((_, i) => sr[String(i)] ?? "");
        setResponses(loaded);
        const done = new Set<number>();
        loaded.forEach((r, i) => {
          if (r.trim().length > 0) done.add(i);
        });
        setCompletedSteps(done);
      }
    }
  }, [workshopDetail]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const step = WORKSHOP_STEPS[currentStep];
  const stepsCompleted = completedSteps.size;
  const progress = Math.round((stepsCompleted / WORKSHOP_STEPS.length) * 100);
  const isLastStep = currentStep === WORKSHOP_STEPS.length - 1;

  const saveAndNavigate = (nextStep: number) => {
    // Mark current step as completed if there's a response
    if (responses[currentStep].trim()) {
      setCompletedSteps((prev) => new Set(prev).add(currentStep));
    }

    // Save to API
    if (activeWorkshop?.id) {
      const stepResponses: Record<string, string> = {};
      responses.forEach((r, i) => {
        if (r.trim()) stepResponses[String(i)] = r;
      });
      updateWorkshop.mutate({
        workshopId: activeWorkshop.id,
        currentStep: nextStep,
        stepResponses,
        status: "IN_PROGRESS",
      });
    }

    setCurrentStep(nextStep);
  };

  const goNext = () => {
    if (!isLastStep) {
      saveAndNavigate(currentStep + 1);
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      saveAndNavigate(currentStep - 1);
    }
  };

  const handleFinish = () => {
    if (activeWorkshop?.id) {
      const stepResponses: Record<string, string> = {};
      responses.forEach((r, i) => {
        if (r.trim()) stepResponses[String(i)] = r;
      });
      updateWorkshop.mutate({
        workshopId: activeWorkshop.id,
        currentStep: WORKSHOP_STEPS.length - 1,
        stepResponses,
      });
      completeWorkshop.mutate(activeWorkshop.id, {
        onSuccess: () => {
          router.push(`/knowledge/brand-foundation/${id}/workshop/complete`);
        },
      });
    } else {
      router.push(`/knowledge/brand-foundation/${id}/workshop/complete`);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-border-dark">
        <h1 className="text-lg font-semibold text-text-dark">Canvas Workshop</h1>
        <div className="flex items-center gap-3">
          <Badge variant="info" size="sm" className="bg-teal-500/10 text-teal-400 border-teal-500/20">
            Video Guide
          </Badge>
          <Badge variant="default" size="sm" className="border-teal-500/20 text-teal-400">
            Facilitator
          </Badge>
          <div className="flex items-center gap-1.5 text-sm text-teal-400">
            <Clock className="w-4 h-4" />
            {formatTime(seconds)}
          </div>
          <button className="p-2 rounded-md text-text-dark/40 hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
            <Bookmark className="w-4 h-4" />
          </button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleFinish}
            loading={completeWorkshop.isPending}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Complete
          </Button>
        </div>
      </div>

      {/* ── Step Navigation Pills ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-text-dark/50">Workshop Steps</span>
          <span className="text-xs text-text-dark/40">
            {stepsCompleted} of {WORKSHOP_STEPS.length} steps completed
          </span>
        </div>
        <div className="flex items-center gap-1">
          {WORKSHOP_STEPS.map((s, i) => {
            const isActive = i === currentStep;
            const isDone = completedSteps.has(i);
            return (
              <div key={i} className="flex items-center">
                <button
                  onClick={() => saveAndNavigate(i)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    isActive
                      ? "bg-primary text-white"
                      : isDone
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-surface-dark text-text-dark/50 border border-border-dark hover:text-text-dark"
                  )}
                >
                  {isDone && !isActive ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <span
                      className={cn(
                        "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold",
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-border-dark/50 text-text-dark/40"
                      )}
                    >
                      {i + 1}
                    </span>
                  )}
                  <span className="hidden sm:inline max-w-[80px] truncate">
                    {s.title}
                  </span>
                </button>
                {i < WORKSHOP_STEPS.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-text-dark/20 mx-0.5 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Two-Column Layout ── */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column (60%) */}
        <div className="flex-1 lg:basis-3/5 space-y-4">
          {/* Step Badge + Duration */}
          <div className="flex items-center gap-2">
            <Badge variant="info" size="sm">
              Step {currentStep + 1} of {WORKSHOP_STEPS.length}
            </Badge>
            <Badge variant="default" size="sm">
              <Clock className="w-3 h-3" />
              {step.duration}
            </Badge>
          </div>

          {/* Step Title & Description */}
          <h2 className="text-lg font-semibold text-text-dark">{step.title}</h2>
          <p className="text-sm text-text-dark/60 leading-relaxed">{step.description}</p>

          {/* Presentation Area */}
          <div className="aspect-video rounded-xl bg-surface-dark border border-border-dark flex items-center justify-center relative">
            <div className="text-center">
              <Camera className="w-8 h-8 text-text-dark/20 mx-auto mb-2" />
              <p className="text-xs text-text-dark/30">Presentation / Video</p>
            </div>
            {isLastStep && (
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <span className="text-xs text-text-dark/40">Presentation Workspace</span>
                <button className="p-1.5 rounded-md bg-surface-dark border border-border-dark text-text-dark/40 hover:text-text-dark transition-colors">
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Facilitator Tips (last step only) */}
          {isLastStep && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-amber-300">
                  Facilitator Tips
                </span>
              </div>
              <ol className="space-y-2">
                {FACILITATOR_TIPS.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-sm text-amber-200/60">
                    <span className="text-amber-400 font-semibold flex-shrink-0">
                      {i + 1}.
                    </span>
                    {tip}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Right Column (40%) */}
        <div className="lg:basis-2/5 space-y-4">
          {/* Your Response Card */}
          <Card padding="lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-teal-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-dark">
                  {step.responseTitle ?? "Your Response"}
                </p>
                <p className="text-xs text-text-dark/40">
                  {step.responseSubtitle ?? "Capture your insights"}
                </p>
              </div>
            </div>

            <p className="text-sm text-text-dark/60 mb-3">{step.responsePrompt}</p>

            <textarea
              value={responses[currentStep]}
              onChange={(e) => {
                const updated = [...responses];
                updated[currentStep] = e.target.value;
                setResponses(updated);
              }}
              placeholder="Type your response here..."
              rows={8}
              className="w-full rounded-lg border border-border-dark bg-background-dark px-4 py-3 text-sm text-text-dark placeholder:text-text-dark/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-surface-dark resize-none mb-4"
            />

            {/* Navigation inside card */}
            <div className="flex items-center justify-between pt-3 border-t border-border-dark">
              <button
                onClick={goPrev}
                disabled={currentStep === 0}
                className={cn(
                  "flex items-center gap-1 text-sm transition-colors",
                  currentStep === 0
                    ? "text-text-dark/20 cursor-not-allowed"
                    : "text-text-dark/50 hover:text-text-dark"
                )}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              {isLastStep ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleFinish}
                  loading={completeWorkshop.isPending}
                >
                  Finish
                  <CheckCircle className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={goNext}>
                  Next Step
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </Card>

          {/* Progress Bar */}
          <div className="px-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-dark/40">Overall Progress</span>
              <span className="text-xs font-medium text-text-dark">{progress}% Complete</span>
            </div>
            <ProgressBar value={progress} size="sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
