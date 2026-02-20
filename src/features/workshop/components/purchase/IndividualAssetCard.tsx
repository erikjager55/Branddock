"use client";

import { Check } from "lucide-react";
import { Badge, Card } from "@/components/shared";

interface IndividualAssetCardProps {
  assetId: string;
  name: string;
  category: string;
  isSelected: boolean;
  onToggle: () => void;
}

export function IndividualAssetCard({
  name,
  category,
  isSelected,
  onToggle,
}: IndividualAssetCardProps) {
  return (
    <Card
      padding="sm"
      className={`cursor-pointer transition-all ${
        isSelected
          ? "ring-2 ring-emerald-500 border-emerald-500"
          : "hover:border-gray-300"
      }`}
      onClick={onToggle}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
            isSelected
              ? "bg-emerald-500 border-emerald-500"
              : "border-gray-300"
          }`}
        >
          {isSelected && <Check className="w-3 h-3 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
          <Badge variant="default" size="sm">
            {category}
          </Badge>
        </div>
      </div>
    </Card>
  );
}
