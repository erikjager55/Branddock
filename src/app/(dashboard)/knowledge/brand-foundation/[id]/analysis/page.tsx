"use client";

import { useState, useEffect, useRef, use } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import {
  ArrowLeft,
  ArrowRight,
  Send,
  Sparkles,
  Building2,
  ChevronLeft,
  CheckCircle2,
  PenLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getQuestionsForAsset } from "@/lib/constants/ai-analysis-questions";
import { generateMockReport } from "@/lib/utils/mock-report";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ChatMessage {
  type: "ai-question" | "ai-feedback" | "user-answer";
  content: string;
  questionIndex?: number;
}

interface AnalysisData {
  id: string;
  status: string;
  progress: number;
  messages: ChatMessage[];
}

export default function AIAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: assetId } = use(params);
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [asset, setAsset] = useState<{
    id: string;
    name: string;
    content: Record<string, unknown> | null;
  } | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const questions = asset ? getQuestionsForAsset(asset) : [];
  const totalQuestions = questions.length;
  const progressPct =
    totalQuestions > 0
      ? Math.round((currentQuestion / totalQuestions) * 100)
      : 0;

  // Load asset and analysis on mount
  useEffect(() => {
    loadData();
  }, [assetId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [userInput]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch asset
      const assetRes = await fetch(`/api/brand-assets/${assetId}`);
      if (!assetRes.ok) return;
      const assetData = await assetRes.json();
      setAsset(assetData);

      // Fetch or create analysis
      const analysisRes = await fetch(
        `/api/brand-assets/${assetId}/analysis`
      );
      const analysisJson = await analysisRes.json();

      if (analysisJson.data) {
        const a = analysisJson.data;
        setAnalysis(a);
        const savedMessages = (a.messages as ChatMessage[]) || [];
        setMessages(savedMessages);

        // Figure out current question from messages
        const userAnswers = savedMessages.filter(
          (m: ChatMessage) => m.type === "user-answer"
        );
        setCurrentQuestion(userAnswers.length);

        // If no messages yet, add the first question
        if (savedMessages.length === 0) {
          const assetQuestions = getQuestionsForAsset(assetData);
          if (assetQuestions.length > 0) {
            const firstMsg: ChatMessage = {
              type: "ai-question",
              content: assetQuestions[0],
              questionIndex: 0,
            };
            setMessages([firstMsg]);
            // Save it
            await saveMessage(a.id, firstMsg);
          }
        }
      } else {
        // Create new analysis
        const createRes = await fetch(
          `/api/brand-assets/${assetId}/analysis`,
          { method: "POST" }
        );
        const createJson = await createRes.json();
        if (createJson.data) {
          const a = createJson.data;
          setAnalysis(a);

          const assetQuestions = getQuestionsForAsset(assetData);
          if (assetQuestions.length > 0) {
            const firstMsg: ChatMessage = {
              type: "ai-question",
              content: assetQuestions[0],
              questionIndex: 0,
            };
            setMessages([firstMsg]);
            await saveMessage(a.id, firstMsg);
          }
        }
      }
    } catch (error) {
      console.error("Error loading analysis data:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveMessage = async (
    analysisId: string,
    message: ChatMessage,
    progress?: number
  ) => {
    await fetch(`/api/brand-assets/${assetId}/analysis`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysisId, message, progress }),
    });
  };

  const handleSend = async () => {
    if (!userInput.trim() || !analysis) return;

    const answer: ChatMessage = {
      type: "user-answer",
      content: userInput.trim(),
      questionIndex: currentQuestion,
    };

    // Add user answer
    const newMessages = [...messages, answer];
    setMessages(newMessages);
    setUserInput("");

    // Save
    await saveMessage(analysis.id, answer, progressPct);

    // Add AI feedback
    const feedback: ChatMessage = {
      type: "ai-feedback",
      content: generateFeedback(userInput.trim(), currentQuestion),
    };
    const withFeedback = [...newMessages, feedback];
    setMessages(withFeedback);
    await saveMessage(analysis.id, feedback);

    // Move to next question
    const nextQ = currentQuestion + 1;
    setCurrentQuestion(nextQ);

    if (nextQ < totalQuestions) {
      // Add next question
      const nextQuestion: ChatMessage = {
        type: "ai-question",
        content: questions[nextQ],
        questionIndex: nextQ,
      };
      setMessages([...withFeedback, nextQuestion]);
      await saveMessage(
        analysis.id,
        nextQuestion,
        Math.round((nextQ / totalQuestions) * 100)
      );
    }
  };

  const handleGenerateReport = async () => {
    if (!analysis || !asset) return;
    setGenerating(true);

    try {
      const report = generateMockReport(asset.name, totalQuestions);

      await fetch(`/api/brand-assets/${assetId}/analysis`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: analysis.id,
          complete: true,
          insights: report,
        }),
      });

      router.push(
        `/knowledge/brand-foundation/${assetId}/analysis/${analysis.id}`
      );
    } catch (error) {
      console.error("Error generating report:", error);
    } finally {
      setGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Get last user answer for preview snippet
  const lastUserAnswer = [...messages]
    .reverse()
    .find((m) => m.type === "user-answer");

  if (loading) {
    return (
      <div className="max-w-[800px] mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-surface-dark rounded w-1/3"></div>
          <div className="h-12 bg-surface-dark rounded w-2/3"></div>
          <div className="h-96 bg-surface-dark rounded"></div>
        </div>
      </div>
    );
  }

  const allAnswered = currentQuestion >= totalQuestions;

  return (
    <div className="max-w-[800px] mx-auto flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex-shrink-0 mb-6">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Brand Assets", href: "/knowledge/brand-foundation" },
            { label: asset?.name ?? "Asset" },
          ]}
          className="mb-2"
        />

        <Link
          href={`/knowledge/brand-foundation/${assetId}`}
          className="inline-flex items-center gap-1.5 text-sm text-text-dark/60 hover:text-text-dark mb-3 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to {asset?.name ?? "Asset"}
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-dark">
              AI Brand Analysis
            </h1>
            <p className="text-sm text-text-dark/60">
              Answer questions to generate your brand framework
            </p>
          </div>
          <Badge variant="warning" className="ml-auto">
            In Progress
          </Badge>
        </div>

        {/* Gradient progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-text-dark/50 mb-1.5">
            <span>
              Question {Math.min(currentQuestion + 1, totalQuestions)} of{" "}
              {totalQuestions}
            </span>
            <span className="font-medium">{progressPct}%</span>
          </div>
          <div className="relative h-2 bg-surface-dark rounded-full overflow-hidden border border-border-dark">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(progressPct, 100)}%`,
                background: "linear-gradient(90deg, #6366F1, #10B981)",
              }}
            />
            {progressPct >= 100 && (
              <div
                className="absolute inset-0 rounded-full animate-pulse"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(99,102,241,0.3), rgba(16,185,129,0.3))",
                }}
              />
            )}
          </div>
        </div>

        {/* Last answer preview */}
        {lastUserAnswer && (
          <p className="mt-2 text-xs text-text-dark/40 truncate">
            Last answer: &ldquo;{lastUserAnswer.content}&rdquo;
          </p>
        )}
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {messages.map((msg, i) => (
          <ChatBubble key={i} message={msg} />
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-border-dark pt-4">
        {!allAnswered ? (
          <div className="flex gap-3">
            <textarea
              ref={textareaRef}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer..."
              rows={1}
              className="flex-1 resize-none bg-surface-dark border border-border-dark rounded-lg px-4 py-3 text-sm text-text-dark placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button
              variant="primary"
              onClick={handleSend}
              disabled={!userInput.trim()}
              className="self-end"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          /* Completion state */
          <div className="flex flex-col items-center py-6 gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <p className="text-sm font-medium text-text-dark">
              All questions answered!
            </p>
            <button
              onClick={handleGenerateReport}
              disabled={generating}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium text-sm transition-all disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
              }}
            >
              {generating ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Generate Brand Report
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-3">
          <button
            onClick={() => {
              if (currentQuestion > 0) {
                setCurrentQuestion(currentQuestion - 1);
              }
            }}
            disabled={currentQuestion === 0}
            className="flex items-center gap-1 text-xs text-text-dark/40 hover:text-text-dark/60 disabled:opacity-30 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> Previous
          </button>
          <span className="text-xs text-text-dark/40">
            Question {Math.min(currentQuestion + 1, totalQuestions)} of{" "}
            {totalQuestions}
          </span>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (currentQuestion < totalQuestions - 1) {
                setCurrentQuestion(currentQuestion + 1);
              }
            }}
            disabled={currentQuestion >= totalQuestions - 1}
            rightIcon={<ArrowRight className="w-3 h-3" />}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  if (message.type === "user-answer") {
    return (
      <div className="flex justify-end items-start gap-2">
        <div
          className="max-w-[75%] text-white rounded-2xl rounded-tr-md px-4 py-3 text-sm"
          style={{
            background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
          }}
        >
          {message.content}
        </div>
        <PenLine className="w-4 h-4 text-text-dark/30 flex-shrink-0 mt-3" />
      </div>
    );
  }

  if (message.type === "ai-feedback") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[75%] flex items-start gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl rounded-tl-md px-4 py-3 text-sm text-text-dark">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  // AI question
  return (
    <div className="flex justify-start">
      <div className="max-w-[75%] flex items-start gap-2">
        <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <div className="bg-surface-dark border border-border-dark rounded-2xl rounded-tl-md px-4 py-3 text-sm text-text-dark">
          {message.content}
        </div>
      </div>
    </div>
  );
}

function generateFeedback(answer: string, questionIndex: number): string {
  const feedbackTemplates = [
    "Great insight! This gives us a clear picture of your brand's core direction. Let's explore further.",
    "Excellent response. This aligns well with strong brand positioning. Let me ask you something deeper.",
    "That's a thoughtful perspective. This kind of clarity will strengthen your brand framework significantly.",
    "Very helpful! I can see strong themes emerging. Let's continue building on this foundation.",
    "Thank you for the detailed answer. This will be valuable for generating your comprehensive analysis.",
  ];
  return feedbackTemplates[questionIndex % feedbackTemplates.length];
}
