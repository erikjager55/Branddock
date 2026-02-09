"use client";

import { useState } from "react";
import { Plus, Swords, Globe, Check, X as XIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useCompetitors, useCreateCompetitor, Competitor } from "@/hooks/api/useCompetitors";
import { useToast } from "@/hooks/useToast";

const placeholderCompetitors: Competitor[] = [
  {
    id: "1", name: "BrandKit Pro", website: "brandkitpro.com",
    description: "Enterprise brand management platform focused on large teams with advanced asset management.",
    strengths: ["Enterprise features", "Asset management", "Team collaboration", "API integrations"],
    weaknesses: ["Expensive pricing", "Complex onboarding", "No AI features", "Poor mobile experience"],
    workspaceId: "mock", createdById: "mock",
    createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z",
    createdBy: { id: "mock", name: "Brand Manager", email: "manager@example.com" },
  },
  {
    id: "2", name: "StrategyHub", website: "strategyhub.io",
    description: "Strategy-first brand platform with campaign planning and analytics dashboards.",
    strengths: ["Analytics dashboard", "Campaign planning", "Affordable pricing", "Clean UI"],
    weaknesses: ["Limited brand assets", "No content creation", "Basic reporting", "No validation tools"],
    workspaceId: "mock", createdById: "mock",
    createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z",
    createdBy: { id: "mock", name: "Brand Manager", email: "manager@example.com" },
  },
  {
    id: "3", name: "ContentForge", website: "contentforge.ai",
    description: "AI-powered content creation tool with basic brand consistency features.",
    strengths: ["AI content generation", "Fast output", "Multiple languages", "Template library"],
    weaknesses: ["No brand strategy", "Generic content", "Limited customization", "No research tools"],
    workspaceId: "mock", createdById: "mock",
    createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z",
    createdBy: { id: "mock", name: "Brand Manager", email: "manager@example.com" },
  },
];

const comparisonFeatures = [
  { feature: "Brand Foundation", us: true, competitors: [true, false, false] },
  { feature: "AI Content Creation", us: true, competitors: [false, false, true] },
  { feature: "Campaign Management", us: true, competitors: [true, true, false] },
  { feature: "Brand Validation", us: true, competitors: [false, false, false] },
  { feature: "Content Calendar", us: true, competitors: [true, true, false] },
  { feature: "Research Tools", us: true, competitors: [false, false, false] },
  { feature: "Team Collaboration", us: true, competitors: [true, true, true] },
  { feature: "Analytics", us: true, competitors: [true, true, false] },
];

export default function CompetitorsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const workspaceId = "mock-workspace-id";

  const { data: apiData, isLoading, isError, refetch } = useCompetitors({ workspaceId });
  const createCompetitor = useCreateCompetitor();
  const toast = useToast();

  const competitors = apiData?.data && apiData.data.length > 0 ? apiData.data : placeholderCompetitors;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createCompetitor.mutate(
      { name: formName, website: formWebsite || undefined, description: formDescription, workspaceId },
      {
        onSuccess: () => {
          toast.success("Competitor added", "The competitor has been added.");
          setFormName("");
          setFormWebsite("");
          setFormDescription("");
          setIsModalOpen(false);
        },
        onError: () => {
          toast.error("Failed to add competitor", "Please try again.");
        },
      }
    );
  };

  return (
    <div className="max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold text-text-dark">Competitors</h1>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
            Add Competitor
          </Button>
        </div>
        <p className="text-sm text-text-dark/40">
          Analyze your competitive landscape and identify opportunities
        </p>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="card" height={300} />
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-text-dark/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-dark mb-1">Failed to load competitors</h3>
          <p className="text-sm text-text-dark/40 mb-4">Something went wrong.</p>
          <Button variant="outline" onClick={() => refetch()}>Try Again</Button>
        </div>
      ) : competitors.length === 0 ? (
        <EmptyState
          icon={<Swords className="w-8 h-8" />}
          title="No competitors yet"
          description="Add competitors to analyze your competitive landscape"
          action={
            <Button variant="primary" onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
              Add Competitor
            </Button>
          }
        />
      ) : (
        <>
          {/* Competitor Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            {competitors.map((competitor) => (
              <Card key={competitor.id} hoverable padding="lg">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-surface-dark border border-border-dark flex items-center justify-center flex-shrink-0">
                      <Swords className="w-5 h-5 text-text-dark/40" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-text-dark">{competitor.name}</h3>
                      {competitor.website && (
                        <p className="text-xs text-text-dark/40 flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {competitor.website}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-text-dark/60 line-clamp-2">{competitor.description}</p>
                  {competitor.strengths.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-text-dark/40 uppercase tracking-wide mb-2">Strengths</p>
                      <div className="flex flex-wrap gap-1.5">
                        {competitor.strengths.map((s) => (
                          <Badge key={s} variant="success" size="sm">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {competitor.weaknesses.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-text-dark/40 uppercase tracking-wide mb-2">Weaknesses</p>
                      <div className="flex flex-wrap gap-1.5">
                        {competitor.weaknesses.map((w) => (
                          <Badge key={w} variant="error" size="sm">{w}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Comparison Table */}
          <h2 className="text-lg font-semibold text-text-dark mb-4">Feature Comparison</h2>
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-dark">
                    <th className="text-left text-xs font-medium text-text-dark/40 uppercase tracking-wider py-3 px-4">Feature</th>
                    <th className="text-center text-xs font-semibold text-primary uppercase tracking-wider py-3 px-4">Branddock</th>
                    {competitors.map((c) => (
                      <th key={c.id} className="text-center text-xs font-medium text-text-dark/40 uppercase tracking-wider py-3 px-4">{c.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((row, i) => (
                    <tr key={row.feature} className={i < comparisonFeatures.length - 1 ? "border-b border-border-dark/50" : ""}>
                      <td className="py-3 px-4 text-sm text-text-dark">{row.feature}</td>
                      <td className="py-3 px-4 text-center">
                        {row.us ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <XIcon className="w-4 h-4 text-text-dark/20 mx-auto" />}
                      </td>
                      {row.competitors.map((has, ci) => (
                        <td key={ci} className="py-3 px-4 text-center">
                          {has ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <XIcon className="w-4 h-4 text-text-dark/20 mx-auto" />}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Add Competitor Modal */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Competitor">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">Name *</label>
            <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. BrandKit Pro" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">Website</label>
            <Input value={formWebsite} onChange={(e) => setFormWebsite(e.target.value)} placeholder="e.g. https://competitor.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">Description</label>
            <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Describe this competitor" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={createCompetitor.isPending}>
              {createCompetitor.isPending ? "Adding..." : "Add Competitor"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
