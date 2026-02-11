"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BrandAssetWithRelations } from "@/types/brand-asset";
import {
  getBrandAssetTypeInfo,
  getValidationColor,
} from "@/lib/constants/brand-assets";
import { formatDistanceToNow } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import { Brain, Users, MessageSquare, ClipboardList, ChevronDown } from "lucide-react";
import { useState } from "react";
import { AssetStatusBadge } from "./AssetStatusBadge";

type AssetWithCounts = BrandAssetWithRelations & {
  _count?: {
    newAiAnalyses: number;
    workshops: number;
    interviews: number;
    questionnaires: number;
  };
};

interface AssetCardProps {
  asset: AssetWithCounts;
}

export function AssetCard({ asset }: AssetCardProps) {
  const [methodsOpen, setMethodsOpen] = useState(false);
  const typeInfo = getBrandAssetTypeInfo(asset);

  const counts = asset._count ?? {
    newAiAnalyses: 0,
    workshops: 0,
    interviews: 0,
    questionnaires: 0,
  };

  const completedMethods =
    (counts.newAiAnalyses > 0 ? 1 : 0) +
    (counts.workshops > 0 ? 1 : 0) +
    (counts.interviews > 0 ? 1 : 0) +
    (counts.questionnaires > 0 ? 1 : 0);
  const validationPct = Math.round((completedMethods / 4) * 100);
  const colorClass = getValidationColor(validationPct);

  const methods = [
    { key: "ai", label: "AI Exploration", icon: Brain, done: counts.newAiAnalyses > 0 },
    { key: "workshop", label: "Workshop", icon: Users, done: counts.workshops > 0 },
    { key: "interview", label: "Interview", icon: MessageSquare, done: counts.interviews > 0 },
    { key: "questionnaire", label: "Questionnaire", icon: ClipboardList, done: counts.questionnaires > 0 },
  ];

  return (
    <Link href={`/knowledge/brand-foundation/${asset.id}`} className="group block">
      <Card hoverable padding="none" className="overflow-hidden h-full">
        <div className="p-5">
          {/* Top row: icon + name + validation badge */}
          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl flex-shrink-0">
              {typeInfo?.icon ?? "📄"}
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-text-dark line-clamp-1">
                {asset.name}
              </h3>
              <p className="text-xs text-text-dark/50 line-clamp-2 mt-0.5">
                {typeInfo?.description ?? asset.description ?? "No description"}
              </p>
            </div>
            <span
              className={cn(
                "flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full",
                colorClass
              )}
            >
              {validationPct}%
            </span>
          </div>

          {/* Category + status */}
          <div className="flex items-center gap-2 mb-3">
            {typeInfo && (
              <Badge variant="default" size="sm">
                {typeInfo.uiCategory}
              </Badge>
            )}
            <AssetStatusBadge status={asset.status} />
            <span className="ml-auto text-xs text-text-dark/40">
              Validated: {completedMethods}/4
            </span>
          </div>

          {/* Validation methods (collapsible) */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMethodsOpen(!methodsOpen);
            }}
            className="flex items-center gap-1.5 text-xs text-text-dark/50 hover:text-text-dark/70 transition-colors w-full"
          >
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 transition-transform",
                methodsOpen && "rotate-180"
              )}
            />
            Validation Methods {completedMethods}/4
          </button>

          {methodsOpen && (
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {methods.map((m) => (
                <div
                  key={m.key}
                  className={cn(
                    "flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-md",
                    m.done
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-surface-dark text-text-dark/40"
                  )}
                >
                  <m.icon className="w-3.5 h-3.5" />
                  {m.label}
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="mt-3 pt-3 border-t border-border-dark text-xs text-text-dark/40">
            Last updated: {formatDistanceToNow(asset.updatedAt)}
          </div>
        </div>
      </Card>
    </Link>
  );
}
