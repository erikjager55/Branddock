"use client";

import { useState, useMemo } from "react";
import { Plus, FlaskConical, Calendar, Users, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { ProgressBar } from "@/components/ui/ProgressBar";

const tabs = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Draft", value: "draft" },
];

const typeConfig: Record<string, { label: string; variant: "info" | "warning" | "success" }> = {
  survey: { label: "Survey", variant: "info" },
  interview: { label: "Interview", variant: "warning" },
  analysis: { label: "Analysis", variant: "success" },
};

const statusConfig: Record<string, { label: string; variant: "success" | "info" | "default" }> = {
  active: { label: "Active", variant: "info" },
  completed: { label: "Completed", variant: "success" },
  draft: { label: "Draft", variant: "default" },
};

const projects = [
  {
    id: "1",
    title: "Brand Perception Survey Q1",
    type: "survey",
    status: "active",
    progress: 65,
    startDate: "Jan 15, 2025",
    endDate: "Mar 15, 2025",
    participants: 234,
  },
  {
    id: "2",
    title: "Customer Journey Interview Series",
    type: "interview",
    status: "active",
    progress: 40,
    startDate: "Feb 1, 2025",
    endDate: "Apr 30, 2025",
    participants: 12,
  },
  {
    id: "3",
    title: "Competitor Positioning Analysis",
    type: "analysis",
    status: "completed",
    progress: 100,
    startDate: "Nov 1, 2024",
    endDate: "Dec 20, 2024",
    participants: 0,
  },
  {
    id: "4",
    title: "New Market Segment Validation",
    type: "survey",
    status: "draft",
    progress: 0,
    startDate: "Mar 1, 2025",
    endDate: "May 15, 2025",
    participants: 0,
  },
];

const stats = [
  { label: "Active Research", value: "2", icon: FlaskConical },
  { label: "Completed", value: "1", icon: Lightbulb },
  { label: "Insights Found", value: "47", icon: Lightbulb },
];

export default function ResearchHubPage() {
  const [activeTab, setActiveTab] = useState("all");

  const filtered = useMemo(() => {
    if (activeTab === "all") return projects;
    return projects.filter((p) => p.status === activeTab);
  }, [activeTab]);

  return (
    <div className="max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold text-text-dark">
            Research Hub
          </h1>
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
          >
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
                  <p className="text-2xl font-semibold text-text-dark">
                    {stat.value}
                  </p>
                  <p className="text-xs text-text-dark/40">{stat.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="pills"
        className="mb-6"
      />

      {/* Project Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <FlaskConical className="w-12 h-12 text-text-dark/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-dark mb-1">
              No {activeTab} research projects
            </h3>
            <p className="text-sm text-text-dark/40">
              Create a new research project to get started
            </p>
          </div>
        ) : (
          filtered.map((project) => {
            const type = typeConfig[project.type];
            const status = statusConfig[project.status];
            return (
              <Card key={project.id} hoverable padding="lg">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FlaskConical className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-text-dark">
                          {project.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={type.variant} size="sm">
                            {type.label}
                          </Badge>
                          <Badge variant={status.variant} size="sm" dot>
                            {status.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-text-dark/40">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {project.startDate} — {project.endDate}
                      </span>
                      {project.participants > 0 && (
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          {project.participants} participants
                        </span>
                      )}
                    </div>
                    {project.progress > 0 && (
                      <div className="flex items-center gap-3">
                        <ProgressBar
                          value={project.progress}
                          size="sm"
                          className="flex-1"
                        />
                        <span className="text-xs font-medium text-text-dark/60 w-8 text-right">
                          {project.progress}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
