"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import {
  CheckCircle,
  Download,
  Database,
  Unlock,
  ArrowLeft,
  ChevronLeft,
  Bot,
  Sparkles,
  ClipboardCheck,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { formatDate } from "@/lib/utils/date";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AnalysisSession {
  id: string;
  status: string;
  progress: number;
  dataPoints: number;
  executiveSummary: string | null;
  keyFindings: unknown;
  recommendations: unknown;
  messages: unknown;
  createdAt: string;
  updatedAt: string;
}

interface Finding {
  icon: string;
  title: string;
  description: string;
  color: string;
  iconBg: string;
}

interface Recommendation {
  number: number;
  title: string;
  description: string;
}

export default function AnalysisReportPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id: assetId, sessionId } = use(params);
  const router = useRouter();
  const [session, setSession] = useState<AnalysisSession | null>(null);
  const [asset, setAsset] = useState<{ name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [assetId, sessionId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch asset name
      const assetRes = await fetch(`/api/brand-assets/${assetId}`);
      if (assetRes.ok) {
        const assetData = await assetRes.json();
        setAsset(assetData);
      }

      // Fetch analysis session
      const analysisRes = await fetch(
        `/api/brand-assets/${assetId}/analysis`
      );
      const analysisJson = await analysisRes.json();
      if (analysisJson.data) {
        setSession(analysisJson.data);
      }
    } catch (error) {
      console.error("Error loading report:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDone = async () => {
    router.push(`/knowledge/brand-foundation/${assetId}`);
  };

  const handleExportPdf = () => {
    alert("PDF export coming soon");
  };

  const handleExportRawData = () => {
    if (!session) return;
    const blob = new Blob([JSON.stringify(session, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analysis-${sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="max-w-[800px] mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-surface-dark rounded w-1/3"></div>
          <div className="h-32 bg-surface-dark rounded"></div>
          <div className="h-64 bg-surface-dark rounded"></div>
        </div>
      </div>
    );
  }

  if (!session || session.status !== "COMPLETED") {
    return (
      <div className="max-w-[800px] mx-auto text-center py-12">
        <h2 className="text-xl font-semibold text-text-dark mb-2">
          Report not available
        </h2>
        <p className="text-text-dark/60 mb-4">
          This analysis hasn&apos;t been completed yet.
        </p>
        <Button
          variant="primary"
          onClick={() =>
            router.push(`/knowledge/brand-foundation/${assetId}/analysis`)
          }
        >
          Return to Analysis
        </Button>
      </div>
    );
  }

  const findings = (session.keyFindings as Finding[]) || [];
  const recommendations = (session.recommendations as Recommendation[]) || [];

  // Count answered questions from messages
  const messagesArr = Array.isArray(session.messages) ? session.messages : [];
  const answeredCount = (
    messagesArr as { type: string }[]
  ).filter((m) => m.type === "user-answer").length;

  return (
    <div className="max-w-[800px] mx-auto">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Brand Assets", href: "/knowledge/brand-foundation" },
          { label: asset?.name ?? "Asset", href: `/knowledge/brand-foundation/${assetId}` },
          { label: "Report" },
        ]}
        className="mb-2"
      />

      {/* Back link */}
      <Link
        href={`/knowledge/brand-foundation/${assetId}`}
        className="inline-flex items-center gap-1.5 text-sm text-text-dark/60 hover:text-text-dark mb-4 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to {asset?.name ?? "Asset"}
      </Link>

      {/* Success Banner */}
      <Card padding="lg" className="mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-text-dark">
              AI Brand Analysis Complete
            </h2>
            <p className="text-sm text-text-dark/60 mt-1">
              Generated from {session.dataPoints} data points across 4 sources.
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs text-text-dark/40">
              <Calendar className="w-3.5 h-3.5" />
              <span>Started: {formatDate(session.createdAt)}</span>
              <span>&bull;</span>
              <Calendar className="w-3.5 h-3.5" />
              <span>Completed: {formatDate(session.updatedAt)}</span>
            </div>
            {/* Action pills */}
            <div className="flex items-center gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Unlock className="w-3.5 h-3.5" />}
                className="rounded-full"
              >
                Unlocked
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={handleExportPdf}
                className="rounded-full"
              >
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Database className="w-3.5 h-3.5" />}
                onClick={handleExportRawData}
                className="rounded-full"
              >
                Raw data
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Report Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-text-dark">
            AI Generated Report
          </h2>
          <p className="text-sm text-text-dark/50">
            Based on {answeredCount} answered questions
          </p>
        </div>
      </div>

      {/* Executive Summary */}
      {session.executiveSummary && (
        <div className="mb-8">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-text-dark mb-3">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Executive Summary
          </h3>
          <Card padding="lg">
            <p className="text-sm text-text-dark/80 leading-relaxed">
              {session.executiveSummary}
            </p>
          </Card>
        </div>
      )}

      {/* Key Findings */}
      {findings.length > 0 && (
        <div className="mb-8">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-text-dark mb-3">
            <ClipboardCheck className="w-5 h-5 text-emerald-400" />
            Key Findings
          </h3>
          <Card padding="none">
            <div className="divide-y divide-border-dark">
              {findings.map((finding, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-4"
                  style={{ borderLeft: `4px solid ${finding.color || "#6B7280"}` }}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${finding.iconBg || "bg-gray-500/15 text-gray-500"}`}
                  >
                    <span className="text-base">{finding.icon}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-text-dark">
                      {finding.title}
                    </h4>
                    <p className="text-sm text-text-dark/60 mt-1">
                      {finding.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Strategic Recommendations */}
      {recommendations.length > 0 && (
        <div className="mb-8">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-text-dark mb-3">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            Strategic Recommendations
          </h3>
          <Card padding="none">
            <div className="divide-y divide-border-dark">
              {recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-3 p-4">
                  <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-white">
                      {rec.number}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-text-dark">
                      {rec.title}
                    </h4>
                    <p className="text-sm text-text-dark/60 mt-1">
                      {rec.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between py-6 border-t border-border-dark">
        <Link
          href={`/knowledge/brand-foundation/${assetId}/analysis`}
          className="text-sm text-text-dark/60 hover:text-text-dark flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Analysis
        </Link>
        <Button variant="primary" onClick={handleDone}>
          <CheckCircle className="w-4 h-4 mr-2" />
          Done
        </Button>
      </div>
    </div>
  );
}
