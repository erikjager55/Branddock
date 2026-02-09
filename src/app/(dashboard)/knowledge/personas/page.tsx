"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Plus } from "lucide-react";

const personas = [
  {
    id: "marketing-mary",
    name: "Marketing Mary",
    role: "Marketing Director",
    age: "35-45",
    description:
      "Leads a team of 8-12 marketers at a mid-size B2B SaaS company. Responsible for brand consistency across all channels. Frustrated by scattered brand assets and lack of strategic alignment.",
    tags: ["B2B", "SaaS", "Mid-size", "Decision Maker"],
    goals: [
      "Maintain brand consistency at scale",
      "Reduce time from strategy to content",
    ],
  },
  {
    id: "developer-dave",
    name: "Developer Dave",
    role: "Frontend Developer",
    age: "25-35",
    description:
      "Works closely with the marketing team to implement brand guidelines in digital products. Needs clear, accessible design tokens and component specs.",
    tags: ["Technical", "Implementation", "Design Systems"],
    goals: [
      "Access design tokens programmatically",
      "Consistent UI implementation",
    ],
  },
  {
    id: "startup-sarah",
    name: "Startup Sarah",
    role: "Founder & CEO",
    age: "28-38",
    description:
      "First-time founder building a DTC brand. Needs to create a professional brand identity quickly without agency costs. Values speed and simplicity.",
    tags: ["DTC", "Startup", "Budget-conscious", "Solo"],
    goals: [
      "Build professional brand fast",
      "AI-assisted brand strategy",
    ],
  },
  {
    id: "agency-alex",
    name: "Agency Alex",
    role: "Brand Strategist",
    age: "30-40",
    description:
      "Works at a creative agency managing 10+ client brands simultaneously. Needs efficient workflows for brand audits, strategy development, and asset management.",
    tags: ["Agency", "Multi-brand", "Strategy", "Power User"],
    goals: [
      "Manage multiple brands efficiently",
      "Deliver client brand audits faster",
    ],
  },
];

export default function PersonasPage() {
  return (
    <div className="max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold text-text-dark">Personas</h1>
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create Persona
          </Button>
        </div>
        <p className="text-sm text-text-dark/40">
          Understand your target audience through detailed persona profiles
        </p>
      </div>

      {/* Persona Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {personas.map((persona) => (
          <Card key={persona.id} hoverable padding="lg">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                <Avatar name={persona.name} size="lg" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-text-dark">
                    {persona.name}
                  </h3>
                  <p className="text-xs text-text-dark/40">
                    {persona.role} &middot; Age {persona.age}
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-text-dark/60 line-clamp-3">
                {persona.description}
              </p>

              {/* Goals */}
              <div>
                <p className="text-xs font-medium text-text-dark/40 uppercase tracking-wide mb-2">
                  Goals
                </p>
                <ul className="space-y-1">
                  {persona.goals.map((goal) => (
                    <li
                      key={goal}
                      className="text-xs text-text-dark/60 flex items-center gap-2"
                    >
                      <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                      {goal}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-border-dark">
                {persona.tags.map((tag) => (
                  <Badge key={tag} variant="default" size="sm">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
