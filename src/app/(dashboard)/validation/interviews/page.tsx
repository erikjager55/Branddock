"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  MessageCircle,
  Calendar,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { Avatar } from "@/components/ui/Avatar";

const tabs = [
  { label: "All", value: "all" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Completed", value: "completed" },
];

const statusConfig: Record<string, { label: string; variant: "success" | "info" | "default" }> = {
  scheduled: { label: "Scheduled", variant: "info" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "default" },
};

const interviews = [
  {
    id: "1",
    name: "Sarah Johnson",
    role: "Marketing Director at TechCorp",
    date: "Mar 10, 2025",
    time: "2:00 PM",
    status: "scheduled",
    insightCount: 0,
    topics: ["Brand Perception", "Competitor Analysis"],
  },
  {
    id: "2",
    name: "Michael Chen",
    role: "Product Manager at InnovateCo",
    date: "Mar 5, 2025",
    time: "10:00 AM",
    status: "scheduled",
    insightCount: 0,
    topics: ["Product Positioning", "User Experience"],
  },
  {
    id: "3",
    name: "Emma Williams",
    role: "Brand Strategist at CreativeHub",
    date: "Feb 20, 2025",
    time: "3:00 PM",
    status: "completed",
    insightCount: 8,
    topics: ["Brand Voice", "Content Strategy"],
  },
  {
    id: "4",
    name: "David Rodriguez",
    role: "CEO at StartupXYZ",
    date: "Feb 12, 2025",
    time: "11:00 AM",
    status: "completed",
    insightCount: 12,
    topics: ["Market Fit", "Value Proposition"],
  },
];

export default function InterviewsPage() {
  const [activeTab, setActiveTab] = useState("all");

  const filtered = useMemo(() => {
    if (activeTab === "all") return interviews;
    return interviews.filter((i) => i.status === activeTab);
  }, [activeTab]);

  return (
    <div className="max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold text-text-dark">Interviews</h1>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
            Schedule Interview
          </Button>
        </div>
        <p className="text-sm text-text-dark/40">
          Conduct and manage stakeholder and customer interviews
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="pills"
        className="mb-6"
      />

      {/* Interview Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-text-dark/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-dark mb-1">
              No {activeTab} interviews
            </h3>
            <p className="text-sm text-text-dark/40">
              Schedule an interview to get started
            </p>
          </div>
        ) : (
          filtered.map((interview) => {
            const status = statusConfig[interview.status];
            return (
              <Card key={interview.id} hoverable padding="lg">
                <div className="flex items-start gap-4">
                  <Avatar name={interview.name} size="lg" />
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-text-dark">
                          {interview.name}
                        </h3>
                        <p className="text-xs text-text-dark/40 mt-0.5">
                          {interview.role}
                        </p>
                      </div>
                      <Badge variant={status.variant} size="sm" dot>
                        {status.label}
                      </Badge>
                    </div>

                    {/* Topics */}
                    <div className="flex flex-wrap gap-1.5">
                      {interview.topics.map((topic) => (
                        <Badge key={topic} variant="default" size="sm">
                          {topic}
                        </Badge>
                      ))}
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-xs text-text-dark/40">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {interview.date} at {interview.time}
                      </span>
                      {interview.insightCount > 0 && (
                        <span className="flex items-center gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                          {interview.insightCount} insights
                        </span>
                      )}
                    </div>
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
