"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Bookmark,
  ChevronDown,
  Lightbulb,
  ArrowLeft,
  ArrowRight,
  Clock,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/utils";

// ── Data ──

const STEPS = [
  { title: "Introduction", description: "Welcome to the Canvas Workshop. This session will guide you through defining your brand's core elements using the Golden Circle framework.", tip: "Start by creating a comfortable environment. Encourage open discussion and remind participants there are no wrong answers." },
  { title: "Define Core Purpose", description: "Explore the fundamental 'Why' behind your brand. What drives your organization beyond profit?", tip: "Ask participants to think about what would be lost if your company disappeared tomorrow. This helps identify true purpose." },
  { title: "Identify Unique Value", description: "Discover what makes your brand uniquely valuable. How do you deliver on your purpose differently from competitors?", tip: "Use comparative analysis — list 3 competitors and identify what you do that they can't or won't." },
  { title: "Map Customer Journey", description: "Understand how customers experience your brand from first awareness through loyalty.", tip: "Create a simple timeline: Awareness → Consideration → Purchase → Onboarding → Retention → Advocacy." },
  { title: "Synthesize Insights", description: "Bring together the insights from previous steps into actionable brand guidelines.", tip: "Look for patterns across the previous exercises. What themes keep recurring? These are your brand truths." },
  { title: "Synthesis & Action Planning", description: "Create a concrete action plan to implement your brand insights across the organization.", tip: "Assign specific owners to each action item. Set 30/60/90-day milestones for accountability." },
];

// ── Component ──

export default function WorkshopSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<string[]>(STEPS.map(() => ""));
  const [showTip, setShowTip] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? `${h.toString().padStart(2, "0")}:` : ""}${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const step = STEPS[currentStep];
  const progress = Math.round(((currentStep + 1) / STEPS.length) * 100);

  const goNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      setShowTip(false);
    } else {
      router.push(`/knowledge/brand-foundation/${id}/workshop/complete`);
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setShowTip(false);
    }
  };

  return (
    <div className="max-w-[800px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-text-dark">Canvas Workshop</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-text-dark/60">
            <Clock className="w-4 h-4" />
            {formatTime(seconds)}
          </div>
          <button className="p-2 rounded-md text-text-dark/40 hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
            <Bookmark className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Step Header */}
      <Card padding="lg" className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="info" size="sm">Step {currentStep + 1} of {STEPS.length}</Badge>
          <h2 className="text-base font-semibold text-text-dark">{step.title}</h2>
        </div>
        <p className="text-sm text-text-dark/60">{step.description}</p>
      </Card>

      {/* Video/Presentation Placeholder */}
      <div className="aspect-video rounded-lg bg-surface-dark border border-border-dark flex items-center justify-center mb-4">
        <div className="text-center">
          <button className="w-16 h-16 rounded-full bg-white/5 border border-border-dark flex items-center justify-center hover:bg-white/10 transition-colors mb-2 mx-auto">
            <Play className="w-6 h-6 text-text-dark/40 ml-1" />
          </button>
          <p className="text-xs text-text-dark/30">Presentation / Video</p>
        </div>
      </div>

      {/* Timer */}
      <div className="flex items-center gap-2 mb-4 text-sm text-text-dark/50">
        <Clock className="w-4 h-4" />
        {formatTime(seconds)}
      </div>

      {/* Response Textarea */}
      <textarea
        value={responses[currentStep]}
        onChange={(e) => {
          const updated = [...responses];
          updated[currentStep] = e.target.value;
          setResponses(updated);
        }}
        placeholder="Capture your thoughts and responses here..."
        rows={6}
        className="w-full rounded-md border border-border-dark bg-surface-dark px-4 py-3 text-sm text-text-dark placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-background-dark resize-none mb-4"
      />

      {/* Facilitator Tips */}
      <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 overflow-hidden">
        <button
          onClick={() => setShowTip(!showTip)}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-amber-300">
            <Lightbulb className="w-4 h-4" />
            Facilitator Tips
          </div>
          <ChevronDown className={cn("w-4 h-4 text-amber-300/50 transition-transform", showTip && "rotate-180")} />
        </button>
        {showTip && (
          <div className="px-4 pb-3">
            <p className="text-sm text-amber-200/60">{step.tip}</p>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs text-text-dark/40">Step {currentStep + 1} of {STEPS.length}</span>
        <ProgressBar value={progress} size="sm" className="flex-1" />
        <span className="text-xs font-medium text-text-dark">{progress}%</span>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={goPrev}
          disabled={currentStep === 0}
        >
          Previous Step
        </Button>
        <Button
          variant="primary"
          rightIcon={<ArrowRight className="w-4 h-4" />}
          onClick={goNext}
        >
          {currentStep === STEPS.length - 1 ? "Complete Workshop" : "Next Step"}
        </Button>
      </div>
    </div>
  );
}
