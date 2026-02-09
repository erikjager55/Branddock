"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Check, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ContentTypeItem {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  formats: string[];
}

export interface ContentTypeTab {
  label: string;
  value: string;
  items: ContentTypeItem[];
}

interface ContentTypeSelectorProps {
  tabs: ContentTypeTab[];
  mode: "single" | "multi";
  selectedType?: string;
  selectedTypes?: Record<string, number>;
  onSelectSingle?: (typeId: string) => void;
  onSelectMulti?: (types: Record<string, number>) => void;
}

export function ContentTypeSelector({
  tabs,
  mode,
  selectedType,
  selectedTypes = {},
  onSelectSingle,
  onSelectMulti,
}: ContentTypeSelectorProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.value || "");

  const currentTab = tabs.find((t) => t.value === activeTab);

  const toggleMulti = (id: string) => {
    if (!onSelectMulti) return;
    const current = { ...selectedTypes };
    if (current[id]) {
      delete current[id];
    } else {
      current[id] = 1;
    }
    onSelectMulti(current);
  };

  const updateQuantity = (id: string, delta: number) => {
    if (!onSelectMulti) return;
    const current = { ...selectedTypes };
    const newVal = (current[id] || 0) + delta;
    if (newVal <= 0) {
      delete current[id];
    } else {
      current[id] = Math.min(newVal, 10);
    }
    onSelectMulti(current);
  };

  const totalSelected = Object.values(selectedTypes).reduce(
    (sum, n) => sum + n,
    0
  );

  return (
    <div className="space-y-4">
      <Tabs
        tabs={tabs.map((t) => ({ label: t.label, value: t.value }))}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="pills"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {currentTab?.items.map((item) => {
          const isSelected =
            mode === "single"
              ? selectedType === item.id
              : !!selectedTypes[item.id];
          const quantity = selectedTypes[item.id] || 0;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (mode === "single") {
                  onSelectSingle?.(item.id);
                } else {
                  toggleMulti(item.id);
                }
              }}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border-dark hover:border-border-dark/80 hover:bg-surface-dark/50"
              )}
            >
              <span className="text-lg flex-shrink-0 mt-0.5">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-dark">
                  {item.name}
                </p>
                <p className="text-xs text-text-dark/40 line-clamp-1 mt-0.5">
                  {item.description}
                </p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {item.formats.map((f) => (
                    <Badge key={f} variant="default" size="sm">
                      {f}
                    </Badge>
                  ))}
                </div>
              </div>
              {mode === "single" && isSelected && (
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              )}
              {mode === "multi" && isSelected && (
                <div
                  className="flex items-center gap-1.5 flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-6 h-6 rounded bg-surface-dark border border-border-dark flex items-center justify-center text-text-dark/60 hover:text-text-dark transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-sm font-semibold text-text-dark w-4 text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-6 h-6 rounded bg-surface-dark border border-border-dark flex items-center justify-center text-text-dark/60 hover:text-text-dark transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {mode === "multi" && (
        <div className="flex items-center justify-between px-1 pt-2 border-t border-border-dark">
          <p className="text-sm text-text-dark/60">
            <span className="font-semibold text-text-dark">{totalSelected}</span>{" "}
            deliverables selected
          </p>
        </div>
      )}
    </div>
  );
}
