"use client";

import { useState, useMemo } from "react";
import { Plus, FlaskConical, Calendar, Users, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useResearch, useCreateResearch, ResearchProject } from "@/hooks/api/useResearch";
import { useToast } from "@/hooks/useToast";
import { DemoBanner } from "@/components/ui/DemoBanner";

const tabs = [
  { label: "All", value: "all" },
  { label: "Active", value: "ACTIVE" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Draft", value: "DRAFT" },
];

const typeConfig: Record<string, { label: string; variant: "info" | "warning" | "success" }> = {
  SURVEY: { label: "Survey", variant: "info" },
  INTERVIEW: { label: "Interview", variant: "warning" },
  ANALYSIS: { label: "Analysis", variant: "success" },
  AI_EXPLORATION: { label: "AI Exploration", variant: "info" },
};

const statusConfig: Record<string, { label: string; variant: "success" | "info" | "default" }> = {
  ACTIVE: { label: "Active", variant: "info" },
  COMPLETED: { label: "Completed", variant: "success" },
  DRAFT: { label: "Draft", variant: "default" },
};

const placeholderProjects: ResearchProject[] = [
  {
    id: "1", name: "Brand Perception Survey Q1", type: "SURVEY", status: "ACTIVE",
    description: null, findings: null, participantCount: 234,
    startDate: "2025-01-15T00:00:00.000Z", endDate: "2025-03-15T00:00:00.000Z",
    workspaceId: "mock", createdById: "mock",
    createdAt: "2025-01-15T00:00:00.000Z", updatedAt: "2025-01-15T00:00:00.000Z",
    createdBy: { id: "mock", name: "Brand Manager", email: "manager@example.com" },
  },
  {
    id: "2", name: "Customer Journey Interview Series", type: "INTERVIEW", status: "ACTIVE",
    description: null, findings: null, participantCount: 12,
    startDate: "2025-02-01T00:00:00.000Z", endDate: "2025-04-30T00:00:00.000Z",
    workspaceId: "mock", createdById: "mock",
    createdAt: "2025-02-01T00:00:00.000Z", updatedAt: "2025-02-01T00:00:00.000Z",
    createdBy: { id: "mock", name: "Brand Manager", email: "manager@example.com" },
  },
  {
    id: "3", name: "Competitor Positioning Analysis", type: "ANALYSIS", status: "COMPLETED",
    description: null, findings: null, participantCount: 0,
    startDate: "2024-11-01T00:00:00.000Z", endDate: "2024-12-20T00:00:00.000Z",
    workspaceId: "mock", createdById: "mock",
    createdAt: "2024-11-01T00:00:00.000Z", updatedAt: "2024-12-20T00:00:00.000Z",
    createdBy: { id: "mock", name: "Brand Manager", email: "manager@example.com" },
  },
  {
    id: "4", name: "New Market Segment Validation", type: "SURVEY", status: "DRAFT",
    description: null, findings: null, participantCount: 0,
    startDate: "2025-03-01T00:00:00.000Z", endDate: "2025-05-15T00:00:00.000Z",
    workspaceId: "mock", createdById: "mock",
    createdAt: "2025-03-01T00:00:00.000Z", updatedAt: "2025-03-01T00:00:00.000Z",
    createdBy: { id: "mock", name: "Brand Manager", email: "manager@example.com" },
  },
];

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ResearchHubPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"SURVEY" | "INTERVIEW" | "ANALYSIS" | "AI_EXPLORATION">("SURVEY");

  const workspaceId = "mock-workspace-id";

  const { data: apiData, isLoading, isError } = useResearch({
    workspaceId,
    status: activeTab !== "all" ? activeTab : undefined,
  });

  const createResearch = useCreateResearch();
  const toast = useToast();

  const hasApiData = !isError && apiData?.data && apiData.data.length > 0;
  const projects = useMemo(() => {
    if (hasApiData) return apiData!.data;
    if (activeTab === "all") return placeholderProjects;
    return placeholderProjects.filter((p) => p.status === activeTab);
  }, [hasApiData, apiData, activeTab]);
  const isDemo = !isLoading && !hasApiData;

  const activeCount = useMemo(() => {
    const source = apiData?.data ?? placeholderProjects;
    return source.filter((p) => p.status === "ACTIVE").length;
  }, [apiData]);

  const completedCount = useMemo(() => {
    const source = apiData?.data ?? placeholderProjects;
    return source.filter((p) => p.status === "COMPLETED").length;
  }, [apiData]);

  const stats = [
    { label: "Active Research", value: String(activeCount), icon: FlaskConical },
    { label: "Completed", value: String(completedCount), icon: Lightbulb },
    { label: "Total Projects", value: String(apiData?.total ?? placeholderProjects.length), icon: Lightbulb },
  ];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createResearch.mutate(
      { name: formName, type: formType, status: "DRAFT" as const, participantCount: 0, workspaceId },
      {
        onSuccess: () => {
          toast.success("Research created", "Your research project has been created.");
          setFormName("");
          setFormType("SURVEY");
          setIsModalOpen(false);
        },
        onError: () => {
          toast.error("Failed to create research", "Please try again.");
        },
      }
    );
  };

  return (
    <div className="max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold text-text-dark">Research Hub</h1>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
            New Research
          </Button>
        </div>
        <p className="text-sm text-text-dark/40">
          Plan, execute, and analyze your brand research projects
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} padding="lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-text-dark">{isLoading ? "-" : stat.value}</p>
                  <p className="text-xs text-text-dark/40">{stat.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="pills" className="mb-6" />

      {/* Demo Banner */}
      {isDemo && <DemoBanner />}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="card" height={120} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FlaskConical className="w-8 h-8" />}
          title="No research projects"
          description="Create a new research project to get started"
          action={
            <Button variant="primary" onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
              New Research
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {projects.map((project) => {
            const type = typeConfig[project.type] || typeConfig.SURVEY;
            const status = statusConfig[project.status] || statusConfig.DRAFT;
            const progress = project.status === "COMPLETED" ? 100 : project.status === "ACTIVE" ? 50 : 0;
            return (
              <Card key={project.id} hoverable padding="lg">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FlaskConical className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-text-dark">{project.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={type.variant} size="sm">{type.label}</Badge>
                          <Badge variant={status.variant} size="sm" dot>{status.label}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-text-dark/40">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(project.startDate)} — {formatDate(project.endDate)}
                      </span>
                      {(project.participantCount ?? 0) > 0 && (
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          {project.participantCount} participants
                        </span>
                      )}
                    </div>
                    {progress > 0 && (
                      <div className="flex items-center gap-3">
                        <ProgressBar value={progress} size="sm" className="flex-1" />
                        <span className="text-xs font-medium text-text-dark/60 w-8 text-right">{progress}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Research Modal */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Research Project">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">Name *</label>
            <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Enter research name" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">Type *</label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value as typeof formType)}
              className="w-full px-3 py-2 bg-surface-dark border border-border-dark rounded-lg text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="SURVEY">Survey</option>
              <option value="INTERVIEW">Interview</option>
              <option value="ANALYSIS">Analysis</option>
              <option value="AI_EXPLORATION">AI Exploration</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={createResearch.isPending}>
              {createResearch.isPending ? "Creating..." : "Create Research"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
