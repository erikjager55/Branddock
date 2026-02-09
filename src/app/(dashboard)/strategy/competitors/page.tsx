"use client";

import { Plus, Swords, Globe, Check, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const competitors = [
  {
    id: "1",
    name: "BrandKit Pro",
    website: "brandkitpro.com",
    description: "Enterprise brand management platform focused on large teams with advanced asset management.",
    strengths: ["Enterprise features", "Asset management", "Team collaboration", "API integrations"],
    weaknesses: ["Expensive pricing", "Complex onboarding", "No AI features", "Poor mobile experience"],
  },
  {
    id: "2",
    name: "StrategyHub",
    website: "strategyhub.io",
    description: "Strategy-first brand platform with campaign planning and analytics dashboards.",
    strengths: ["Analytics dashboard", "Campaign planning", "Affordable pricing", "Clean UI"],
    weaknesses: ["Limited brand assets", "No content creation", "Basic reporting", "No validation tools"],
  },
  {
    id: "3",
    name: "ContentForge",
    website: "contentforge.ai",
    description: "AI-powered content creation tool with basic brand consistency features.",
    strengths: ["AI content generation", "Fast output", "Multiple languages", "Template library"],
    weaknesses: ["No brand strategy", "Generic content", "Limited customization", "No research tools"],
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
  return (
    <div className="max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold text-text-dark">
            Competitors
          </h1>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
            Add Competitor
          </Button>
        </div>
        <p className="text-sm text-text-dark/40">
          Analyze your competitive landscape and identify opportunities
        </p>
      </div>

      {/* Competitor Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {competitors.map((competitor) => (
          <Card key={competitor.id} hoverable padding="lg">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-surface-dark border border-border-dark flex items-center justify-center flex-shrink-0">
                  <Swords className="w-5 h-5 text-text-dark/40" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-text-dark">
                    {competitor.name}
                  </h3>
                  <p className="text-xs text-text-dark/40 flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    {competitor.website}
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-text-dark/60 line-clamp-2">
                {competitor.description}
              </p>

              {/* Strengths */}
              <div>
                <p className="text-xs font-medium text-text-dark/40 uppercase tracking-wide mb-2">
                  Strengths
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {competitor.strengths.map((s) => (
                    <Badge key={s} variant="success" size="sm">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Weaknesses */}
              <div>
                <p className="text-xs font-medium text-text-dark/40 uppercase tracking-wide mb-2">
                  Weaknesses
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {competitor.weaknesses.map((w) => (
                    <Badge key={w} variant="error" size="sm">
                      {w}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Comparison Table */}
      <h2 className="text-lg font-semibold text-text-dark mb-4">
        Feature Comparison
      </h2>
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-dark">
                <th className="text-left text-xs font-medium text-text-dark/40 uppercase tracking-wider py-3 px-4">
                  Feature
                </th>
                <th className="text-center text-xs font-semibold text-primary uppercase tracking-wider py-3 px-4">
                  Branddock
                </th>
                {competitors.map((c) => (
                  <th
                    key={c.id}
                    className="text-center text-xs font-medium text-text-dark/40 uppercase tracking-wider py-3 px-4"
                  >
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonFeatures.map((row, i) => (
                <tr
                  key={row.feature}
                  className={
                    i < comparisonFeatures.length - 1
                      ? "border-b border-border-dark/50"
                      : ""
                  }
                >
                  <td className="py-3 px-4 text-sm text-text-dark">
                    {row.feature}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {row.us ? (
                      <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                    ) : (
                      <XIcon className="w-4 h-4 text-text-dark/20 mx-auto" />
                    )}
                  </td>
                  {row.competitors.map((has, ci) => (
                    <td key={ci} className="py-3 px-4 text-center">
                      {has ? (
                        <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <XIcon className="w-4 h-4 text-text-dark/20 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
