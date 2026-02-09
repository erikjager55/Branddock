"use client";

import { use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Bot,
  Lock,
  RefreshCw,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/utils";

// ── Data ──

const PERSONA = {
  name: "Sarah the Startup Founder",
  tagline: "First-time founder building a DTC brand from scratch",
  confidence: 25,
  confidenceLabel: "Low",
  methods: "1/4",
};

const DEMOGRAPHICS = [
  { label: "Age", value: "28-38" },
  { label: "Location", value: "San Francisco, CA" },
  { label: "Occupation", value: "Founder & CEO" },
  { label: "Income", value: "$80,000 - $150,000" },
  { label: "Family", value: "Single / No children" },
  { label: "Education", value: "Bachelor's in Business" },
];

const PSYCHOGRAPHICS = {
  personality: "Ambitious, resourceful, fast-paced decision maker",
  coreValues: ["Innovation", "Authenticity", "Speed", "Independence"],
  interests: ["Startups", "Branding", "Growth Hacking", "Design", "AI Tools"],
};

const GOALS = [
  "Build a professional brand identity quickly",
  "Create consistent brand content without agency costs",
  "Establish market positioning before competitors",
];

const MOTIVATIONS = [
  "Desire to prove her vision and build something meaningful",
  "Need to attract investors with professional branding",
  "Passion for solving real customer problems",
];

const FRUSTRATIONS = [
  "Traditional brand agencies are too expensive and slow",
  "Scattered tools with no unified brand management",
  "Difficulty maintaining consistency as the team grows",
];

const BEHAVIORS = [
  "Researches solutions independently before buying",
  "Active on LinkedIn and Twitter for industry insights",
  "Prefers self-serve tools over consultations",
  "Makes fast purchasing decisions when value is clear",
  "Values peer recommendations and case studies",
];

const RESEARCH_METHODS = [
  { name: "AI Analysis", status: "completed", label: "Completed" },
  { name: "Interviews", status: "pending", label: "Not started" },
  { name: "Questionnaire", status: "pending", label: "Not started" },
  { name: "Workshop", status: "pending", label: "Not started" },
];

// ── Component ──

export default function PersonaDetailPage({
  params,
}: {
  params: Promise<{ personaId: string }>;
}) {
  const { personaId } = use(params);

  return (
    <div className="max-w-[900px] mx-auto">
      {/* Back */}
      <Link
        href="/knowledge/personas"
        className="text-sm text-text-dark/50 hover:text-text-dark flex items-center gap-1 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Personas
      </Link>

      {/* Header */}
      <div className="flex items-start gap-5 mb-6">
        <div className="w-20 h-20 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
          <ImageIcon className="w-8 h-8 text-purple-400/40" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-text-dark">{PERSONA.name}</h1>
          <p className="text-sm text-text-dark/50 mb-2">{PERSONA.tagline}</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-dark/40">Research Confidence</span>
              <ProgressBar value={PERSONA.confidence} size="sm" className="w-20" />
              <Badge variant="warning" size="sm">{PERSONA.confidence}% {PERSONA.confidenceLabel}</Badge>
            </div>
            <span className="text-xs text-text-dark/40">Methods {PERSONA.methods}</span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-2 mb-6">
        <Button variant="secondary" size="sm" leftIcon={<Edit className="w-3.5 h-3.5" />}>Edit</Button>
        <Button variant="secondary" size="sm" leftIcon={<Bot className="w-3.5 h-3.5" />}>Regenerate with AI</Button>
        <Button variant="secondary" size="sm" leftIcon={<Lock className="w-3.5 h-3.5" />}>Lock</Button>
      </div>

      {/* Demographics */}
      <SectionCard title="Demographics" impact="high" impactLabel="Profile">
        <div className="flex items-start gap-5">
          <div className="flex-shrink-0">
            <div className="w-24 h-24 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-2">
              <ImageIcon className="w-8 h-8 text-purple-400/30" />
            </div>
            <button className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
              <RefreshCw className="w-3 h-3" /> Regenerate
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 flex-1">
            {DEMOGRAPHICS.map((d) => (
              <div key={d.label}>
                <p className="text-xs text-text-dark/40">{d.label}</p>
                <p className="text-sm text-text-dark">{d.value}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Psychographics */}
      <SectionCard title="Psychographics" impact="medium">
        <div className="space-y-4">
          <div>
            <p className="text-xs text-text-dark/40 mb-1">Personality Type</p>
            <p className="text-sm text-text-dark">{PSYCHOGRAPHICS.personality}</p>
          </div>
          <div>
            <p className="text-xs text-text-dark/40 mb-2">Core Values</p>
            <div className="flex flex-wrap gap-1.5">
              {PSYCHOGRAPHICS.coreValues.map((v) => (
                <Badge key={v} variant="success" size="sm">{v}</Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-text-dark/40 mb-2">Interests</p>
            <div className="flex flex-wrap gap-1.5">
              {PSYCHOGRAPHICS.interests.map((v) => (
                <Badge key={v} variant="default" size="sm">{v}</Badge>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Goals / Motivations / Frustrations */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <BulletCard title="Goals" impact="high" items={GOALS} />
        <BulletCard title="Motivations" impact="high" items={MOTIVATIONS} />
        <BulletCard title="Frustrations" impact="medium" items={FRUSTRATIONS} />
      </div>

      {/* Behaviors */}
      <SectionCard title="Behaviors" impact="medium">
        <div className="space-y-2">
          {BEHAVIORS.map((b) => (
            <div key={b} className="flex items-start gap-2 text-sm text-text-dark/70">
              <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
              {b}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Strategic Implications */}
      <SectionCard title="Strategic Implications" impact="high">
        <div className="text-center py-6">
          <p className="text-sm text-text-dark/40 mb-3">No strategic implications generated yet</p>
          <Button variant="secondary" size="sm" leftIcon={<Sparkles className="w-3.5 h-3.5" />}>
            Generate with AI
          </Button>
        </div>
      </SectionCard>

      {/* Research & Validation */}
      <Card padding="lg" className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-dark">Research &amp; Validation</h3>
          <span className="text-xs text-text-dark/40">{PERSONA.methods} methods</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {RESEARCH_METHODS.map((m) => (
            <div
              key={m.name}
              className={cn(
                "rounded-lg border p-3",
                m.status === "completed"
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : "border-border-dark"
              )}
            >
              <p className="text-xs font-medium text-text-dark mb-1">{m.name}</p>
              <Badge
                variant={m.status === "completed" ? "success" : "default"}
                size="sm"
              >
                {m.label}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Sub-components ──

function SectionCard({
  title,
  impact,
  impactLabel,
  children,
}: {
  title: string;
  impact: "high" | "medium" | "low";
  impactLabel?: string;
  children: React.ReactNode;
}) {
  const impactColors = {
    high: "bg-emerald-500/10 text-emerald-400",
    medium: "bg-amber-500/10 text-amber-400",
    low: "bg-text-dark/10 text-text-dark/40",
  };

  return (
    <Card padding="lg" className="mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-dark">{title}</h3>
        <Badge variant={impact === "high" ? "success" : impact === "medium" ? "warning" : "default"} size="sm">
          {impactLabel || `${impact} impact`}
        </Badge>
      </div>
      {children}
    </Card>
  );
}

function BulletCard({
  title,
  impact,
  items,
}: {
  title: string;
  impact: "high" | "medium" | "low";
  items: string[];
}) {
  return (
    <Card padding="lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-dark">{title}</h3>
        <Badge variant={impact === "high" ? "success" : impact === "medium" ? "warning" : "default"} size="sm">
          {impact}
        </Badge>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-2 text-xs text-text-dark/70">
            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1" />
            {item}
          </div>
        ))}
      </div>
    </Card>
  );
}
