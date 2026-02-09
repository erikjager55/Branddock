"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Plus, Target, Mountain, MapPin, TrendingUp } from "lucide-react";

const strategies = [
  {
    id: "target-audience",
    title: "Target Audience",
    description:
      "Mid-size to enterprise marketing teams (50-500 employees) looking to scale brand consistency across channels and campaigns.",
    status: "ACTIVE" as const,
    updatedAt: "Feb 5, 2025",
    icon: Target,
  },
  {
    id: "competitive-landscape",
    title: "Competitive Landscape",
    description:
      "Analysis of key competitors including Frontify, Bynder, and Brandfolder. Our differentiator: AI-powered strategy-to-content pipeline.",
    status: "ACTIVE" as const,
    updatedAt: "Jan 28, 2025",
    icon: Mountain,
  },
  {
    id: "market-position",
    title: "Market Position",
    description:
      "Positioned as the intelligent brand platform that bridges the gap between strategy and execution for modern marketing teams.",
    status: "DRAFT" as const,
    updatedAt: "Feb 3, 2025",
    icon: MapPin,
  },
  {
    id: "growth-strategy",
    title: "Growth Strategy",
    description:
      "Product-led growth with freemium model. Focus on organic acquisition through content marketing and strategic partnerships.",
    status: "DRAFT" as const,
    updatedAt: "Jan 20, 2025",
    icon: TrendingUp,
  },
];

const statusConfig = {
  ACTIVE: { variant: "success" as const, label: "Active" },
  DRAFT: { variant: "default" as const, label: "Draft" },
};

export default function BusinessStrategyPage() {
  return (
    <div className="max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold text-text-dark">
            Business Strategy
          </h1>
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Strategy
          </Button>
        </div>
        <p className="text-sm text-text-dark/40">
          Define your business strategy, target audience, and competitive
          positioning
        </p>
      </div>

      {/* Strategy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {strategies.map((strategy) => {
          const Icon = strategy.icon;
          const config = statusConfig[strategy.status];
          return (
            <Card key={strategy.id} hoverable padding="lg">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <Badge variant={config.variant}>{config.label}</Badge>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-dark mb-1">
                    {strategy.title}
                  </h3>
                  <p className="text-xs text-text-dark/40 line-clamp-3">
                    {strategy.description}
                  </p>
                </div>
                <div className="pt-3 border-t border-border-dark">
                  <span className="text-xs text-text-dark/40">
                    Updated {strategy.updatedAt}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
