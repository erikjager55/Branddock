"use client";

import React from "react";
import { X, Shield } from "lucide-react";
import { Button } from "@/components/shared";
import { PricingSummary } from "./PricingSummary";

// ─── Types ───────────────────────────────────────────────────

interface SelectedAsset {
  id: string;
  name: string;
  icon?: string | null;
}

interface SelectedMethod {
  type: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface ValidationPlanSidebarProps {
  selectedAssets: SelectedAsset[];
  selectedMethods: SelectedMethod[];
  totalPrice: number;
  hasPaidMethods: boolean;
  onRemoveAsset: (id: string) => void;
  onRemoveMethod: (type: string) => void;
  onPurchase: () => void;
  onStartFree: () => void;
}

// ─── Component ───────────────────────────────────────────────

export function ValidationPlanSidebar({
  selectedAssets,
  selectedMethods,
  totalPrice,
  hasPaidMethods,
  onRemoveAsset,
  onRemoveMethod,
  onPurchase,
  onStartFree,
}: ValidationPlanSidebarProps) {
  const activeMethods = selectedMethods.filter((m) => m.quantity > 0);
  const hasSelection = selectedAssets.length > 0 && activeMethods.length > 0;

  return (
    <div data-testid="validation-sidebar" className="sticky top-6 bg-white rounded-lg border p-5 w-80">
      {/* Header */}
      <h3 className="font-semibold text-lg text-gray-900 mb-4">
        Your Validation Plan
      </h3>

      {/* Assets section */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-700">Assets</span>
          <span className="bg-green-100 text-green-700 text-xs px-2 rounded-full">
            {selectedAssets.length}
          </span>
        </div>
        {selectedAssets.length === 0 ? (
          <p className="text-sm text-gray-400">No assets selected</p>
        ) : (
          <div className="space-y-1.5">
            {selectedAssets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-700 truncate">{asset.name}</span>
                <button
                  type="button"
                  onClick={() => onRemoveAsset(asset.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 ml-2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Methods section */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-700">Methods</span>
          <span className="bg-green-100 text-green-700 text-xs px-2 rounded-full">
            {activeMethods.length}
          </span>
        </div>
        {activeMethods.length === 0 ? (
          <p className="text-sm text-gray-400">No methods selected</p>
        ) : (
          <div className="space-y-1.5">
            {activeMethods.map((method) => (
              <div
                key={method.type}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-700 truncate">
                  {method.name}{" "}
                  <span className="text-gray-400">
                    {method.quantity} x ${method.unitPrice}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveMethod(method.type)}
                  className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 ml-2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t my-4" />

      {/* Pricing summary */}
      <PricingSummary methods={selectedMethods} />

      {/* CTA button */}
      <div className="mt-4">
        {hasPaidMethods ? (
          <Button
            data-testid="sidebar-purchase-button"
            variant="primary"
            className="bg-green-600 hover:bg-green-700"
            fullWidth
            disabled={!hasSelection}
            onClick={onPurchase}
          >
            Purchase Plan &rarr;
          </Button>
        ) : (
          <Button
            data-testid="sidebar-purchase-button"
            variant="primary"
            className="bg-green-600 hover:bg-green-700"
            fullWidth
            disabled={!hasSelection}
            onClick={onStartFree}
          >
            Start Validation &rarr;
          </Button>
        )}
      </div>

      {/* Note */}
      <p className="text-xs text-gray-400 mt-2">
        Free methods start immediately. Paid methods require payment.
      </p>

      {/* Trust */}
      <div className="flex items-center gap-1 text-xs text-gray-400 mt-3">
        <Shield className="w-3 h-3" />
        100% Satisfaction Guarantee
      </div>
    </div>
  );
}
