"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  Bot,
  Lock,
  Unlock,
  RefreshCw,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/utils";
import { usePersona } from "@/hooks/api/usePersonas";
import { toStringArray } from "@/lib/json-render";

export default function PersonaDetailPage({
  params,
}: {
  params: Promise<{ personaId: string }>;
}) {
  const { personaId } = use(params);
  const router = useRouter();
  const { data: persona, isLoading, isError } = usePersona(personaId);

  if (isLoading) {
    return (
      <div className="max-w-[900px] mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-surface-dark rounded w-1/4" />
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-full bg-surface-dark" />
            <div className="flex-1 space-y-3">
              <div className="h-6 bg-surface-dark rounded w-1/3" />
              <div className="h-4 bg-surface-dark rounded w-1/2" />
            </div>
          </div>
          <div className="h-64 bg-surface-dark rounded" />
          <div className="h-48 bg-surface-dark rounded" />
        </div>
      </div>
    );
  }

  if (isError || !persona) {
    return (
      <div className="max-w-[900px] mx-auto">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-text-dark mb-2">
            Persona not found
          </h2>
          <p className="text-text-dark/60 mb-4">
            The persona you&apos;re looking for doesn&apos;t exist or has been
            deleted.
          </p>
          <Button
            variant="primary"
            onClick={() => router.push("/knowledge/personas")}
          >
            Back to Personas
          </Button>
        </div>
      </div>
    );
  }

  const demographics = [
    { label: "Age", value: persona.age },
    { label: "Location", value: persona.location },
    { label: "Occupation", value: persona.occupation || persona.role },
    { label: "Income", value: persona.income },
    { label: "Family", value: persona.familyStatus },
    { label: "Education", value: persona.education },
  ].filter((d) => d.value);

  const goals = toStringArray(persona.goals);
  const motivations = toStringArray(persona.motivations);
  const frustrations = toStringArray(persona.frustrations);
  const behaviors = toStringArray(persona.behaviors);
  const coreValues = toStringArray(persona.coreValues);
  const interests = toStringArray(persona.interests);
  const confidence = persona.researchConfidence ?? 0;
  const methods = persona.methodsCompleted ?? 0;

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
          {persona.imageUrl ? (
            <img
              src={persona.imageUrl}
              alt={persona.name}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <ImageIcon className="w-8 h-8 text-purple-400/40" />
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-text-dark">
            {persona.name}
          </h1>
          <p className="text-sm text-text-dark/50 mb-2">
            {persona.tagline || persona.description || persona.role}
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-dark/40">
                Research Confidence
              </span>
              <ProgressBar value={confidence} size="sm" className="w-20" />
              <Badge
                variant={confidence >= 50 ? "success" : "warning"}
                size="sm"
              >
                {confidence}%{" "}
                {confidence >= 75
                  ? "High"
                  : confidence >= 50
                    ? "Medium"
                    : "Low"}
              </Badge>
            </div>
            <span className="text-xs text-text-dark/40">
              Methods {methods}/4
            </span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Edit className="w-3.5 h-3.5" />}
        >
          Edit
        </Button>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Bot className="w-3.5 h-3.5" />}
        >
          Regenerate with AI
        </Button>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={
            persona.isLocked ? (
              <Unlock className="w-3.5 h-3.5" />
            ) : (
              <Lock className="w-3.5 h-3.5" />
            )
          }
        >
          {persona.isLocked ? "Unlock" : "Lock"}
        </Button>
      </div>

      {/* Demographics */}
      {demographics.length > 0 && (
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
              {demographics.map((d) => (
                <div key={d.label}>
                  <p className="text-xs text-text-dark/40">{d.label}</p>
                  <p className="text-sm text-text-dark">{d.value}</p>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      )}

      {/* Psychographics */}
      {(persona.personalityType ||
        coreValues.length > 0 ||
        interests.length > 0) && (
        <SectionCard title="Psychographics" impact="medium">
          <div className="space-y-4">
            {persona.personalityType && (
              <div>
                <p className="text-xs text-text-dark/40 mb-1">
                  Personality Type
                </p>
                <p className="text-sm text-text-dark">
                  {persona.personalityType}
                </p>
              </div>
            )}
            {coreValues.length > 0 && (
              <div>
                <p className="text-xs text-text-dark/40 mb-2">Core Values</p>
                <div className="flex flex-wrap gap-1.5">
                  {coreValues.map((v, i) => (
                    <Badge key={i} variant="success" size="sm">
                      {v}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {interests.length > 0 && (
              <div>
                <p className="text-xs text-text-dark/40 mb-2">Interests</p>
                <div className="flex flex-wrap gap-1.5">
                  {interests.map((v, i) => (
                    <Badge key={i} variant="default" size="sm">
                      {v}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* Goals / Motivations / Frustrations */}
      {(goals.length > 0 ||
        motivations.length > 0 ||
        frustrations.length > 0) && (
        <div className="grid grid-cols-3 gap-4 mb-4">
          {goals.length > 0 && (
            <BulletCard title="Goals" impact="high" items={goals} />
          )}
          {motivations.length > 0 && (
            <BulletCard
              title="Motivations"
              impact="high"
              items={motivations}
            />
          )}
          {frustrations.length > 0 && (
            <BulletCard
              title="Frustrations"
              impact="medium"
              items={frustrations}
            />
          )}
        </div>
      )}

      {/* Behaviors */}
      {behaviors.length > 0 && (
        <SectionCard title="Behaviors" impact="medium">
          <div className="space-y-2">
            {behaviors.map((b, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-sm text-text-dark/70"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                {b}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Strategic Implications */}
      <SectionCard title="Strategic Implications" impact="high">
        {persona.strategicImplications ? (
          <div className="space-y-2">
            {toStringArray(persona.strategicImplications).map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-sm text-text-dark/70"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                {item}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-text-dark/40 mb-3">
              No strategic implications generated yet
            </p>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Generate with AI
            </Button>
          </div>
        )}
      </SectionCard>

      {/* Research & Validation */}
      <Card padding="lg" className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-dark">
            Research &amp; Validation
          </h3>
          <span className="text-xs text-text-dark/40">{methods}/4 methods</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              name: "AI Analysis",
              status: methods >= 1 ? "completed" : "pending",
            },
            {
              name: "Interviews",
              status: methods >= 2 ? "completed" : "pending",
            },
            {
              name: "Questionnaire",
              status: methods >= 3 ? "completed" : "pending",
            },
            {
              name: "Workshop",
              status: methods >= 4 ? "completed" : "pending",
            },
          ].map((m) => (
            <div
              key={m.name}
              className={cn(
                "rounded-lg border p-3",
                m.status === "completed"
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : "border-border-dark"
              )}
            >
              <p className="text-xs font-medium text-text-dark mb-1">
                {m.name}
              </p>
              <Badge
                variant={m.status === "completed" ? "success" : "default"}
                size="sm"
              >
                {m.status === "completed" ? "Completed" : "Not started"}
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
  return (
    <Card padding="lg" className="mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-dark">{title}</h3>
        <Badge
          variant={
            impact === "high"
              ? "success"
              : impact === "medium"
                ? "warning"
                : "default"
          }
          size="sm"
        >
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
        <Badge
          variant={
            impact === "high"
              ? "success"
              : impact === "medium"
                ? "warning"
                : "default"
          }
          size="sm"
        >
          {impact}
        </Badge>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-2 text-xs text-text-dark/70"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1" />
            {item}
          </div>
        ))}
      </div>
    </Card>
  );
}
