"use client";

import { useState } from "react";
import { use } from "react";
import Link from "next/link";
import {
  Bot,
  User,
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  FileText,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/utils";

// ── Data ──

const QUESTIONS = [
  "Let's start by analyzing the demographics and characteristics of this persona. Can you describe the typical age range, location, education level, and professional background?",
  "Now let's explore their goals and motivations. What are the primary objectives this persona is trying to achieve, and what drives their decision-making?",
  "Tell me about the challenges and frustrations this persona faces. What obstacles prevent them from reaching their goals?",
  "Finally, let's define the value proposition. How does your product or service uniquely address this persona's needs compared to alternatives?",
];

const SAMPLE_ANSWERS = [
  "Sarah is typically 28-38 years old, based in major tech hubs like San Francisco or Austin. She has a Bachelor's in Business or related field, and is a first-time founder building a DTC brand. She's tech-savvy but not a designer.",
  "Her primary goal is to build a professional brand identity quickly without agency costs. She's motivated by the desire to prove her vision and attract investors with polished branding. Speed and independence are key drivers.",
  "Traditional agencies are too expensive ($15K+) and too slow (6-8 weeks). She's frustrated by scattered tools — Canva for design, Notion for strategy, Google Docs for content — with no unified brand management system.",
  "Branddock offers an all-in-one AI-powered platform that combines strategy, style, and content in one workflow. Unlike agencies, it's instant and affordable. Unlike tools like Canva, it provides strategic guidance, not just design capabilities.",
];

const KEY_FINDINGS = [
  { num: 1, title: "Demographic Profile", text: "Tech-savvy founders aged 28-38 in major metro areas with business education backgrounds." },
  { num: 2, title: "Goal Alignment", text: "Speed and independence are primary drivers — they want professional results without professional costs." },
  { num: 3, title: "Pain Point Clarity", text: "Tool fragmentation and agency costs are the two biggest barriers to effective brand building." },
  { num: 4, title: "Value Proposition Fit", text: "The integrated strategy-to-content pipeline directly addresses the fragmentation pain point." },
];

const RECOMMENDATIONS = [
  "Emphasize speed-to-value in messaging — highlight time from signup to first brand asset",
  "Create comparison content showing cost savings vs. traditional agency approach",
  "Build onboarding flow that demonstrates AI capabilities within first 5 minutes",
  "Develop case studies featuring similar founder profiles to build social proof",
];

// ── Component ──

export default function AIPersonaAnalysisPage({
  params,
}: {
  params: Promise<{ personaId: string }>;
}) {
  const { personaId } = use(params);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<string[]>(QUESTIONS.map(() => ""));
  const [isComplete, setIsComplete] = useState(false);

  const progress = Math.round(((currentQ + 1) / QUESTIONS.length) * 100);

  const goNext = () => {
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      setIsComplete(true);
    }
  };

  const goPrev = () => {
    if (currentQ > 0) setCurrentQ(currentQ - 1);
  };

  // Pre-fill with sample answers for demo
  const messages: { role: "ai" | "user"; text: string }[] = [];
  for (let i = 0; i <= currentQ; i++) {
    messages.push({ role: "ai", text: QUESTIONS[i] });
    if (answers[i] || i < currentQ) {
      messages.push({ role: "user", text: answers[i] || SAMPLE_ANSWERS[i] });
    }
  }

  if (isComplete) {
    return (
      <div className="max-w-[900px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-dark">AI Persona Analysis</h1>
            <Badge variant="success" size="sm" dot className="mt-0.5">Complete</Badge>
          </div>
        </div>

        {/* Success Banner */}
        <div className="mb-6 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Check className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-emerald-300">AI Persona Analysis Complete</h2>
          </div>
          <p className="text-sm text-emerald-300/60 mb-3">Generated based on 4 strategic dimensions</p>
          <div className="flex items-center gap-4 text-sm text-text-dark/50">
            <span>4 Dimensions analyzed</span>
            <span>+35% research confidence</span>
          </div>
        </div>

        {/* Executive Summary */}
        <Card padding="lg" className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="text-base font-semibold text-text-dark">Executive Summary</h3>
          </div>
          <p className="text-sm text-text-dark/70 leading-relaxed">
            The AI analysis of this persona reveals a clear profile of a tech-savvy, budget-conscious founder who values speed and independence. The persona represents a strong product-market fit for Branddock&apos;s AI-powered platform, with pain points directly addressed by the integrated strategy-to-content pipeline. Key growth opportunities lie in emphasizing time-to-value and cost savings messaging.
          </p>
        </Card>

        {/* Key Findings */}
        <Card padding="lg" className="mb-4">
          <h3 className="text-base font-semibold text-text-dark mb-4">Key Findings</h3>
          <div className="space-y-3">
            {KEY_FINDINGS.map((f) => (
              <div key={f.num} className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {f.num}
                </span>
                <div>
                  <p className="text-sm font-medium text-text-dark">{f.title}</p>
                  <p className="text-sm text-text-dark/60">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recommendations */}
        <Card padding="lg" className="mb-6">
          <h3 className="text-base font-semibold text-text-dark mb-4">Strategic Recommendations</h3>
          <div className="space-y-2">
            {RECOMMENDATIONS.map((r, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                <p className="text-sm text-text-dark/70">{r}</p>
              </div>
            ))}
          </div>
        </Card>

        <Button variant="secondary" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />} className="mb-6">
          Export PDF
        </Button>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border-dark">
          <Link
            href={`/knowledge/personas/${personaId}`}
            className="text-sm text-text-dark/50 hover:text-text-dark flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Persona
          </Link>
          <Button variant="primary" leftIcon={<Check className="w-4 h-4" />}>Done</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-dark">AI Persona Analysis</h1>
            <p className="text-xs text-text-dark/40">Answer questions to analyze this persona</p>
          </div>
        </div>
        <Badge variant="info" size="sm">In Progress</Badge>
      </div>

      {/* Chat Messages */}
      <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn("flex gap-3", msg.role === "user" && "justify-end")}
          >
            {msg.role === "ai" && (
              <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-purple-400" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[70%] rounded-lg px-4 py-3 text-sm",
                msg.role === "ai"
                  ? "bg-surface-dark border border-border-dark text-text-dark/80"
                  : "bg-primary/10 text-text-dark/80"
              )}
            >
              {msg.text}
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-emerald-400" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-dark/40">Progress</span>
        <span className="text-xs font-medium text-text-dark">{progress}%</span>
      </div>
      <ProgressBar value={progress} size="sm" className="mb-4" />

      {/* Input */}
      <textarea
        value={answers[currentQ]}
        onChange={(e) => {
          const updated = [...answers];
          updated[currentQ] = e.target.value;
          setAnswers(updated);
        }}
        placeholder="Type your answer here..."
        rows={4}
        className="w-full rounded-md border border-border-dark bg-surface-dark px-4 py-3 text-sm text-text-dark placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-background-dark resize-none mb-4"
      />

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={goPrev}
          disabled={currentQ === 0}
          className="text-sm text-text-dark/50 hover:text-text-dark disabled:opacity-30 flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Previous
        </button>
        <Button
          variant="primary"
          rightIcon={<ArrowRight className="w-4 h-4" />}
          onClick={goNext}
          disabled={!answers[currentQ]}
        >
          {currentQ === QUESTIONS.length - 1 ? "Complete Analysis" : "Next"}
        </Button>
      </div>
    </div>
  );
}
