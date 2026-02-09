"use client";

import { useState, useRef, useEffect } from "react";
import { use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  User,
  Send,
  ChevronDown,
  Download,
  Check,
  FileText,
  Clock,
  BarChart3,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/utils";

// ── Types ──

interface ChatMessage {
  id: string;
  role: "ai" | "user";
  text: string;
}

// ── Placeholder Data ──

const AI_QUESTIONS = [
  "Let's start with the basics. What is the core purpose of your brand? Why does your brand exist beyond making money?",
  "Great. Now tell me about your target audience. Who are the ideal customers for your brand, and what problems do they face?",
  "What makes your brand unique compared to competitors? What is your key differentiator or unique value proposition?",
  "How would you describe the biggest challenge your customers face that your brand solves?",
  "Finally, how do you see your brand positioned in the market? What space do you want to own in your customers' minds?",
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "ai-1",
    role: "ai",
    text: "Welcome to the AI Brand Analysis. I'll ask you a series of questions to understand your brand deeply and generate a comprehensive analysis report. Let's begin!",
  },
  {
    id: "ai-2",
    role: "ai",
    text: AI_QUESTIONS[0],
  },
];

const COMPLETED_MESSAGES: ChatMessage[] = [
  { id: "ai-1", role: "ai", text: "Welcome to the AI Brand Analysis. I'll ask you a series of questions to understand your brand deeply and generate a comprehensive analysis report. Let's begin!" },
  { id: "ai-2", role: "ai", text: AI_QUESTIONS[0] },
  { id: "u-1", role: "user", text: "Our brand exists to democratize brand management. We believe every company, regardless of size, deserves access to enterprise-level brand strategy tools powered by AI." },
  { id: "ai-3", role: "ai", text: AI_QUESTIONS[1] },
  { id: "u-2", role: "user", text: "Our target audience is mid-size marketing teams (50-500 employees) who struggle with brand consistency across channels. They lack dedicated brand strategists but need to maintain professional, cohesive branding." },
  { id: "ai-4", role: "ai", text: AI_QUESTIONS[2] },
  { id: "u-3", role: "user", text: "Our unique differentiator is the AI-powered strategy-to-content pipeline. No competitor offers an integrated workflow from brand knowledge through validated strategy to AI-generated, on-brand content." },
  { id: "ai-5", role: "ai", text: AI_QUESTIONS[3] },
  { id: "u-4", role: "user", text: "The biggest challenge is brand drift — as teams grow and campaigns multiply, maintaining a consistent brand voice and visual identity becomes nearly impossible without dedicated systems." },
  { id: "ai-6", role: "ai", text: AI_QUESTIONS[4] },
  { id: "u-5", role: "user", text: "We want to be the intelligent brand platform — the single source of truth that bridges strategy and execution. We aim to own the space between brand consultancy and content creation tools." },
];

const KEY_FINDINGS = [
  { num: 1, title: "Brand Purpose", text: "Strong mission-driven foundation centered on democratizing brand management through AI technology." },
  { num: 2, title: "Audience Alignment", text: "Well-defined target segment (mid-size marketing teams) with clear pain points around brand consistency." },
  { num: 3, title: "Unique Value", text: "Distinctive strategy-to-content pipeline differentiator that competitors have not yet replicated." },
  { num: 4, title: "Customer Challenge", text: "Brand drift identified as the core problem — a universal and growing issue as companies scale." },
  { num: 5, title: "Market Position", text: "Aspirational positioning between consultancy and tooling creates a defensible market niche." },
];

const RECOMMENDATIONS = [
  "Double down on the strategy-to-content pipeline narrative in all marketing materials",
  "Build case studies demonstrating measurable brand consistency improvements",
  "Develop a brand drift assessment tool as a lead generation magnet",
  "Create thought leadership content around the cost of brand inconsistency",
];

// ── Component ──

export default function AIBrandAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const progress = Math.round(((questionIndex) / AI_QUESTIONS.length) * 100);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text: input };
    const nextQ = questionIndex + 1;
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setQuestionIndex(nextQ);

    if (nextQ >= AI_QUESTIONS.length) {
      setTimeout(() => {
        setIsComplete(true);
        setMessages(COMPLETED_MESSAGES);
      }, 800);
    } else {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: `ai-${Date.now()}`, role: "ai", text: AI_QUESTIONS[nextQ] },
        ]);
      }, 600);
    }
  };

  const showCompleted = () => {
    setIsComplete(true);
    setMessages(COMPLETED_MESSAGES);
    setQuestionIndex(AI_QUESTIONS.length);
  };

  const breadcrumbItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Brand Foundation", href: "/knowledge/brand-foundation" },
    { label: "AI Brand Analysis" },
  ];

  if (isComplete) {
    return (
      <div className="max-w-[900px] mx-auto">
        <div className="mb-6">
          <Breadcrumb items={breadcrumbItems} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-text-dark">AI Brand Analysis</h1>
              <p className="text-xs text-text-dark/40">Answer questions to analyze your brand</p>
            </div>
          </div>
          <Badge variant="success" size="md" dot>AI Analysis Complete</Badge>
        </div>

        {/* Success Banner */}
        <div className="mb-6 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Check className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-emerald-300">AI Analysis Complete</h2>
          </div>
          <p className="text-sm text-emerald-300/60 mb-4">
            Report generated based on 247 data points
          </p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-text-dark/60">
              <BarChart3 className="w-4 h-4" /> 247 Data points
            </div>
            <div className="flex items-center gap-2 text-sm text-text-dark/60">
              <Clock className="w-4 h-4" /> 8 min duration
            </div>
          </div>
        </div>

        {/* AI Report */}
        <Card padding="lg" className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="text-base font-semibold text-text-dark">Executive Summary</h3>
          </div>
          <p className="text-sm text-text-dark/70 leading-relaxed">
            Branddock demonstrates a strong brand foundation with clear purpose alignment and well-defined market positioning. The brand&apos;s core strength lies in its unique strategy-to-content pipeline, which addresses the growing challenge of brand consistency at scale. The target audience of mid-size marketing teams is well-chosen, as this segment experiences the most acute pain around brand drift. With continued investment in thought leadership and case study development, Branddock is well-positioned to capture significant market share in the AI-powered brand management space.
          </p>
        </Card>

        <Card padding="lg" className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">💡</span>
            <h3 className="text-base font-semibold text-text-dark">Key Findings</h3>
          </div>
          <div className="space-y-4">
            {KEY_FINDINGS.map((f) => (
              <div key={f.num} className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {f.num}
                </span>
                <div>
                  <p className="text-sm font-semibold text-text-dark">{f.title}</p>
                  <p className="text-sm text-text-dark/60 mt-0.5">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg" className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🚀</span>
            <h3 className="text-base font-semibold text-text-dark">Strategic Recommendations</h3>
          </div>
          <div className="space-y-3">
            {RECOMMENDATIONS.map((r, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                <p className="text-sm text-text-dark/70">{r}</p>
              </div>
            ))}
          </div>
        </Card>

        <Button variant="secondary" leftIcon={<Download className="w-4 h-4" />} className="mb-8">
          Export PDF
        </Button>

        <div className="flex items-center justify-between pt-4 border-t border-border-dark">
          <Link
            href={`/knowledge/brand-foundation/${id}`}
            className="text-sm text-text-dark/50 hover:text-text-dark flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Asset
          </Link>
          <Button variant="primary" leftIcon={<Check className="w-4 h-4" />}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="mb-6">
        <Breadcrumb items={breadcrumbItems} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-dark">AI Brand Analysis</h1>
            <p className="text-xs text-text-dark/40">Answer questions to analyze your brand</p>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setStatusOpen(!statusOpen)}
            className="flex items-center gap-1.5 text-sm"
          >
            <Badge variant="info" size="md" dot>In Progress</Badge>
            <ChevronDown className="w-3.5 h-3.5 text-text-dark/40" />
          </button>
          {statusOpen && (
            <div className="absolute right-0 mt-1 w-48 rounded-md border border-border-dark bg-surface-dark shadow-lg p-1 z-10">
              <button
                onClick={() => { showCompleted(); setStatusOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm text-text-dark hover:bg-background-dark rounded transition-colors"
              >
                AI Analysis Complete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chat */}
      <Card padding="none" className="mb-4">
        <div className="h-[400px] overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3",
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                msg.role === "ai" ? "bg-purple-500/10" : "bg-primary/10"
              )}>
                {msg.role === "ai" ? (
                  <Bot className="w-4 h-4 text-purple-400" />
                ) : (
                  <User className="w-4 h-4 text-primary" />
                )}
              </div>
              <div className={cn(
                "max-w-[70%] rounded-lg px-4 py-2.5 text-sm leading-relaxed",
                msg.role === "ai"
                  ? "bg-surface-dark text-text-dark/80 border border-border-dark"
                  : "bg-primary/10 text-text-dark"
              )}>
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </Card>

      {/* Progress */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-text-dark/40">Progress</span>
        <span className="text-xs font-semibold text-text-dark">{progress}%</span>
      </div>
      <ProgressBar value={Math.min(progress, 100)} size="sm" className="mb-4" />

      {/* Input */}
      <div className="space-y-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your answer here..."
          rows={3}
          className="w-full rounded-md border border-border-dark bg-surface-dark px-4 py-3 text-sm text-text-dark placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-background-dark resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
        />
        <div className="flex items-center justify-between">
          <button className="text-xs text-text-dark/40 hover:text-text-dark transition-colors">
            Previous
          </button>
          <Button
            variant="primary"
            disabled={!input.trim()}
            onClick={handleSend}
            rightIcon={progress >= 100 ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          >
            {progress >= 100 ? "Complete Analysis" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
