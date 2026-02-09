"use client";

import {
  Plus,
  Package,
  FlaskConical,
  MessageCircle,
  FileQuestion,
  Users,
  Sparkles,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const methodIcons: Record<string, typeof FlaskConical> = {
  surveys: FileQuestion,
  interviews: MessageCircle,
  workshops: Users,
  ai: Sparkles,
  analysis: FlaskConical,
};

const bundles = [
  {
    id: "1",
    name: "Starter",
    tier: "Free",
    tierVariant: "default" as const,
    status: "active",
    description:
      "Perfect for getting started with brand validation. Includes basic survey tools and AI-powered exploration.",
    methods: ["surveys", "ai"],
    features: [
      "Up to 3 active surveys",
      "AI brand exploration (5/month)",
      "Basic analytics dashboard",
      "Email support",
    ],
  },
  {
    id: "2",
    name: "Professional",
    tier: "Pro",
    tierVariant: "info" as const,
    status: "active",
    description:
      "Comprehensive validation toolkit for growing brands. Includes interviews, workshops, and advanced analytics.",
    methods: ["surveys", "interviews", "workshops", "ai"],
    features: [
      "Unlimited surveys",
      "Up to 20 interview sessions",
      "Workshop facilitation tools",
      "AI exploration (unlimited)",
      "Advanced analytics & reports",
      "Priority support",
    ],
  },
  {
    id: "3",
    name: "Enterprise",
    tier: "Enterprise",
    tierVariant: "warning" as const,
    status: "coming-soon",
    description:
      "Full-scale research operations with dedicated support, custom methodologies, and white-label reporting.",
    methods: ["surveys", "interviews", "workshops", "ai", "analysis"],
    features: [
      "Everything in Professional",
      "Custom research methodologies",
      "Dedicated research consultant",
      "White-label reports",
      "API access",
      "SSO & advanced security",
    ],
  },
];

export default function ResearchBundlesPage() {
  return (
    <div className="max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold text-text-dark">
            Research Bundles
          </h1>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
            Create Bundle
          </Button>
        </div>
        <p className="text-sm text-text-dark/40">
          Pre-configured research packages for every stage of brand validation
        </p>
      </div>

      {/* Bundle Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {bundles.map((bundle) => (
          <Card key={bundle.id} padding="lg" className="flex flex-col">
            <div className="flex-1 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-dark">
                      {bundle.name}
                    </h3>
                  </div>
                </div>
                <Badge variant={bundle.tierVariant} size="sm">
                  {bundle.tier}
                </Badge>
              </div>

              {/* Description */}
              <p className="text-xs text-text-dark/60">{bundle.description}</p>

              {/* Included Methods */}
              <div>
                <p className="text-xs font-medium text-text-dark/40 uppercase tracking-wide mb-2">
                  Included Methods
                </p>
                <div className="flex gap-2">
                  {bundle.methods.map((method) => {
                    const Icon = methodIcons[method];
                    return (
                      <div
                        key={method}
                        className="h-8 w-8 rounded-lg bg-surface-dark border border-border-dark flex items-center justify-center"
                        title={method.charAt(0).toUpperCase() + method.slice(1)}
                      >
                        <Icon className="w-4 h-4 text-text-dark/60" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Features */}
              <div>
                <p className="text-xs font-medium text-text-dark/40 uppercase tracking-wide mb-2">
                  Features
                </p>
                <ul className="space-y-1.5">
                  {bundle.features.map((feature) => (
                    <li
                      key={feature}
                      className="text-xs text-text-dark/60 flex items-center gap-2"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Action */}
            <div className="mt-6 pt-4 border-t border-border-dark">
              {bundle.status === "coming-soon" ? (
                <Button variant="outline" fullWidth disabled>
                  Coming Soon
                </Button>
              ) : (
                <Button variant="primary" fullWidth>
                  Select Bundle
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
