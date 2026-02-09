"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { usePersonas, useCreatePersona, Persona } from "@/hooks/api/usePersonas";
import { useToast } from "@/hooks/useToast";
import { DemoBanner } from "@/components/ui/DemoBanner";

const placeholderPersonas: Persona[] = [
  {
    id: "marketing-mary",
    name: "Marketing Mary",
    role: "Marketing Director",
    description:
      "Leads a team of 8-12 marketers at a mid-size B2B SaaS company. Responsible for brand consistency across all channels. Frustrated by scattered brand assets and lack of strategic alignment.",
    avatar: null,
    demographics: { age: "35-45" },
    goals: ["Maintain brand consistency at scale", "Reduce time from strategy to content"],
    painPoints: [],
    tags: ["B2B", "SaaS", "Mid-size", "Decision Maker"],
    workspaceId: "mock",
    createdById: "mock",
    createdAt: "2025-01-15T00:00:00.000Z",
    updatedAt: "2025-01-15T00:00:00.000Z",
    createdBy: { id: "mock", name: "Brand Manager", email: "manager@example.com" },
  },
  {
    id: "developer-dave",
    name: "Developer Dave",
    role: "Frontend Developer",
    description:
      "Works closely with the marketing team to implement brand guidelines in digital products. Needs clear, accessible design tokens and component specs.",
    avatar: null,
    demographics: { age: "25-35" },
    goals: ["Access design tokens programmatically", "Consistent UI implementation"],
    painPoints: [],
    tags: ["Technical", "Implementation", "Design Systems"],
    workspaceId: "mock",
    createdById: "mock",
    createdAt: "2025-01-15T00:00:00.000Z",
    updatedAt: "2025-01-15T00:00:00.000Z",
    createdBy: { id: "mock", name: "Brand Manager", email: "manager@example.com" },
  },
  {
    id: "startup-sarah",
    name: "Startup Sarah",
    role: "Founder & CEO",
    description:
      "First-time founder building a DTC brand. Needs to create a professional brand identity quickly without agency costs. Values speed and simplicity.",
    avatar: null,
    demographics: { age: "28-38" },
    goals: ["Build professional brand fast", "AI-assisted brand strategy"],
    painPoints: [],
    tags: ["DTC", "Startup", "Budget-conscious", "Solo"],
    workspaceId: "mock",
    createdById: "mock",
    createdAt: "2025-01-15T00:00:00.000Z",
    updatedAt: "2025-01-15T00:00:00.000Z",
    createdBy: { id: "mock", name: "Brand Manager", email: "manager@example.com" },
  },
  {
    id: "agency-alex",
    name: "Agency Alex",
    role: "Brand Strategist",
    description:
      "Works at a creative agency managing 10+ client brands simultaneously. Needs efficient workflows for brand audits, strategy development, and asset management.",
    avatar: null,
    demographics: { age: "30-40" },
    goals: ["Manage multiple brands efficiently", "Deliver client brand audits faster"],
    painPoints: [],
    tags: ["Agency", "Multi-brand", "Strategy", "Power User"],
    workspaceId: "mock",
    createdById: "mock",
    createdAt: "2025-01-15T00:00:00.000Z",
    updatedAt: "2025-01-15T00:00:00.000Z",
    createdBy: { id: "mock", name: "Brand Manager", email: "manager@example.com" },
  },
];

export default function PersonasPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const workspaceId = "mock-workspace-id";

  const { data: apiData, isLoading, isError } = usePersonas({ workspaceId });
  const createPersona = useCreatePersona();
  const toast = useToast();

  const hasApiData = !isError && apiData?.data && apiData.data.length > 0;
  const personas = hasApiData ? apiData!.data : placeholderPersonas;
  const isDemo = !isLoading && !hasApiData;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createPersona.mutate(
      { name: formName, role: formRole, description: formDescription, tags: [], workspaceId },
      {
        onSuccess: () => {
          toast.success("Persona created", "Your persona has been created.");
          setFormName("");
          setFormRole("");
          setFormDescription("");
          setIsModalOpen(false);
        },
        onError: () => {
          toast.error("Failed to create persona", "Please try again.");
        },
      }
    );
  };

  return (
    <div className="max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold text-text-dark">Personas</h1>
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            Create Persona
          </Button>
        </div>
        <p className="text-sm text-text-dark/40">
          Understand your target audience through detailed persona profiles
        </p>
      </div>

      {/* Demo Banner */}
      {isDemo && <DemoBanner />}

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="card" height={280} />
          ))}
        </div>
      ) : personas.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="No personas yet"
          description="Create your first persona to understand your target audience"
          action={
            <Button variant="primary" onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
              Create Persona
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {personas.map((persona) => {
            const age = (persona.demographics as Record<string, string>)?.age;
            return (
              <Link key={persona.id} href={`/knowledge/personas/${persona.id}`}>
              <Card hoverable padding="lg">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={persona.name} size="lg" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-text-dark">
                        {persona.name}
                      </h3>
                      <p className="text-xs text-text-dark/40">
                        {persona.role}{age ? ` \u00B7 Age ${age}` : ""}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-text-dark/60 line-clamp-3">
                    {persona.description}
                  </p>
                  {persona.goals.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-text-dark/40 uppercase tracking-wide mb-2">
                        Goals
                      </p>
                      <ul className="space-y-1">
                        {persona.goals.map((goal) => (
                          <li key={goal} className="text-xs text-text-dark/60 flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                            {goal}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {persona.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-3 border-t border-border-dark">
                      {persona.tags.map((tag) => (
                        <Badge key={tag} variant="default" size="sm">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* New Persona Modal */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Persona">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">Name *</label>
            <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Marketing Mary" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">Role</label>
            <Input value={formRole} onChange={(e) => setFormRole(e.target.value)} placeholder="e.g. Marketing Director" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">Description</label>
            <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Describe this persona" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={createPersona.isPending}>
              {createPersona.isPending ? "Creating..." : "Create Persona"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
